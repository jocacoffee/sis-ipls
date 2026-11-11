/**
 * Autenticação e permissões do iPLS.
 *
 * - O AD da floresta trf1.gov.br apenas AUTENTICA: a senha é validada por LDAPS
 *   com as credenciais do próprio usuário (JFBA\usuario). Não há grupos no AD.
 * - As PERMISSÕES ficam no iPLS (tabela user_permissions), por delegação:
 *     ADMIN       → administrador regional (área de PLS do TRF1); nomeia masters;
 *     MASTER      → responsável do órgão; lança dados, metas e plano de ação do
 *                   próprio órgão e concede/revoga preenchedores dele;
 *     PREENCHEDOR → lança e corrige medições e documentos do próprio órgão;
 *     LEITOR      → autenticado sem permissão (consulta e chat).
 *   Visitantes (sem login) apenas consultam.
 * - Os primeiros administradores vêm de IPLS_ADMINS (lista de logins).
 * - A sessão guarda só a identidade; o papel é lido a cada requisição, então
 *   concessões e revogações valem imediatamente.
 */
import crypto from 'crypto';
import fs from 'fs';
import { AsyncLocalStorage } from 'async_hooks';
import express, { NextFunction, Request, Response } from 'express';
import { Client } from 'ldapts';
import { storage } from './storage';
import type { AuditLog, PermissionRole, UserPermission } from '../types';

export type AuthRole = PermissionRole | 'LEITOR';

/** Identidade guardada no cookie de sessão. */
interface Identity {
  username: string;       // usuario@dominio
  displayName: string;
  email?: string;
  domain: string;
}

export interface AuthUser extends Identity {
  role: AuthRole;
  /** Órgão em que pode atuar (ou o órgão do domínio, para LEITOR). */
  organizationId: string | null;
  /** Permissão vinda de IPLS_ADMINS (não pode ser revogada pela tela). */
  bootstrapAdmin?: boolean;
  /** Perfil de desenvolvimento (IPLS_DEVS): vê os módulos em construção (Documentos & OCR, Integrações). */
  dev?: boolean;
  expiresAt?: string;
}

// ------------------------------------------------------------------ configuração
const env = process.env;
const isProd = env.NODE_ENV === 'production';
const AUTH_MODE = (env.AUTH_MODE || 'ldap').toLowerCase() as 'ldap' | 'dev';
const DOMAIN_SUFFIX = (env.AUTH_DOMAIN_SUFFIX || 'trf1.gov.br').toLowerCase();
const DEFAULT_DOMAIN = (env.AUTH_DEFAULT_DOMAIN || `rr.${DOMAIN_SUFFIX}`).toLowerCase();
const SESSION_HOURS = Number(env.SESSION_HOURS || 8);
const COOKIE_NAME = 'ipls_session';

const SECTION_ORGS: Record<string, string> = {
  ac: 'org-sjac', am: 'org-sjam', ap: 'org-sjap', ba: 'org-sjba', df: 'org-sjdf',
  go: 'org-sjgo', ma: 'org-sjma', mt: 'org-sjmt', pa: 'org-sjpa', pi: 'org-sjpi',
  ro: 'org-sjro', rr: 'org-sjrr', to: 'org-sjto'
};

/** Órgão do iPLS correspondente ao domínio do AD (null = fora da 1ª Região). */
export function organizationForDomain(domain: string): string | null {
  const d = domain.toLowerCase();
  if (d === DOMAIN_SUFFIX) return 'org-trf1-2g';
  const sub = d.endsWith(`.${DOMAIN_SUFFIX}`) ? d.slice(0, -(DOMAIN_SUFFIX.length + 1)) : '';
  return SECTION_ORGS[sub] ?? null;
}

/** Nome NetBIOS do domínio (trf1.gov.br → TRF1; ba.trf1.gov.br → JFBA). */
const netbiosFor = (domain: string) =>
  domain === DOMAIN_SUFFIX
    ? DOMAIN_SUFFIX.split('.')[0].toUpperCase()
    : `JF${domain.split('.')[0].toUpperCase()}`;

let sessionSecret = env.SESSION_SECRET || '';
if (!sessionSecret) {
  if (isProd) throw new Error('SESSION_SECRET é obrigatório em produção (string aleatória longa).');
  sessionSecret = crypto.randomBytes(32).toString('hex');
  console.warn('[Auth] SESSION_SECRET não definido: usando segredo temporário (sessões caem ao reiniciar).');
}

if (AUTH_MODE === 'dev') {
  if (!env.AUTH_DEV_PASSWORD) throw new Error('AUTH_MODE=dev exige AUTH_DEV_PASSWORD.');
  if (isProd && env.AUTH_ALLOW_DEV_IN_PRODUCTION !== 'true') {
    throw new Error('AUTH_MODE=dev não é permitido em produção (use AUTH_ALLOW_DEV_IN_PRODUCTION=true só em testes locais).');
  }
  console.warn('[Auth] MODO DE TESTE: login sem AD, com senha única de desenvolvimento.');
}

// ------------------------------------------------------------------ logins
const SAM_RE = /^[A-Za-z0-9._-]{1,64}$/;
const DOMAIN_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)*$/;

/** Aceita usuario@dominio, NETBIOS\usuario ou usuario (domínio padrão). */
export function parseLogin(input: string): { sam: string; domain: string } | null {
  const raw = (input || '').trim();
  let sam = raw;
  let domain = DEFAULT_DOMAIN;
  if (raw.includes('@')) {
    [sam, domain] = raw.split('@', 2);
  } else if (raw.includes('\\')) {
    const [nb, user] = raw.split('\\', 2);
    sam = user;
    const n = nb.toLowerCase();
    domain = n === DOMAIN_SUFFIX.split('.')[0] ? DOMAIN_SUFFIX : n.startsWith('jf') ? `${n.slice(2)}.${DOMAIN_SUFFIX}` : `${n}.${DOMAIN_SUFFIX}`;
  }
  domain = domain.toLowerCase();
  if (!SAM_RE.test(sam) || !DOMAIN_RE.test(domain)) return null;
  if (domain !== DOMAIN_SUFFIX && !domain.endsWith(`.${DOMAIN_SUFFIX}`)) return null;
  return { sam: sam.toLowerCase(), domain };
}

/** Login normalizado (usuario@dominio) ou null se inválido. */
export const normalizeLogin = (input: string) => {
  const p = parseLogin(input);
  return p ? `${p.sam}@${p.domain}` : null;
};

const domainToDn = (domain: string) => domain.split('.').map(p => `DC=${p}`).join(',');
const escapeFilter = (v: string) =>
  v.replace(/[\\*()\0]/g, c => '\\' + c.charCodeAt(0).toString(16).padStart(2, '0'));

// ------------------------------------------------------------------ AD
class AuthError extends Error {}

function ldapClient(): Client {
  if (!env.LDAP_URL) throw new Error('LDAP_URL não configurado.');
  const tlsOptions: Record<string, unknown> = { rejectUnauthorized: env.LDAP_TLS_REJECT_UNAUTHORIZED !== 'false' };
  if (env.LDAP_TLS_CA_FILE) tlsOptions.ca = [fs.readFileSync(env.LDAP_TLS_CA_FILE)];
  return new Client({ url: env.LDAP_URL, tlsOptions, timeout: 10000, connectTimeout: 5000 });
}

async function readOwnEntry(client: Client, sam: string, domain: string) {
  const { searchEntries } = await client.search(domainToDn(domain), {
    scope: 'sub',
    filter: `(&(objectCategory=person)(objectClass=user)(sAMAccountName=${escapeFilter(sam)}))`,
    attributes: ['displayName', 'mail', 'userAccountControl'],
    sizeLimit: 2
  });
  return searchEntries.length === 1 ? searchEntries[0] : null;
}

/** Valida a senha com as credenciais do próprio usuário (sem conta de serviço). */
async function authenticateLdap(sam: string, domain: string, password: string): Promise<Identity> {
  const client = ldapClient();
  try {
    try {
      await client.bind(`${netbiosFor(domain)}\\${sam}`, password);
    } catch {
      throw new AuthError('Usuário ou senha inválidos.');
    }
    const entry = await readOwnEntry(client, sam, domain).catch(() => null);
    if (entry && Number(entry.userAccountControl) & 2) throw new AuthError('Conta desativada no AD.');
    return {
      username: `${sam}@${domain}`,
      displayName: entry?.displayName ? String(entry.displayName) : sam,
      email: entry?.mail ? String(entry.mail) : undefined,
      domain
    };
  } finally {
    await client.unbind().catch(() => undefined);
  }
}

function authenticateDev(sam: string, domain: string, password: string): Identity {
  const expected = Buffer.from(env.AUTH_DEV_PASSWORD || '');
  const given = Buffer.from(password);
  if (expected.length === 0 || expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    throw new AuthError('Usuário ou senha inválidos.');
  }
  return { username: `${sam}@${domain}`, displayName: `${sam} (teste)`, domain };
}

export async function authenticate(login: string, password: string): Promise<Identity> {
  const parsed = parseLogin(login);
  // Senha vazia nunca é aceita (no LDAP equivaleria a bind anônimo)
  if (!parsed || !password) throw new AuthError('Usuário ou senha inválidos.');
  return AUTH_MODE === 'dev'
    ? authenticateDev(parsed.sam, parsed.domain, password)
    : authenticateLdap(parsed.sam, parsed.domain, password);
}

/**
 * Consulta opcional do nome no AD ao conceder permissão (requer conta de serviço
 * LDAP_BIND_DN/LDAP_BIND_PASSWORD). Sem ela, o nome é preenchido no 1º login.
 */
export async function lookupDisplayName(username: string): Promise<string | undefined> {
  if (AUTH_MODE !== 'ldap' || !env.LDAP_BIND_DN || !env.LDAP_BIND_PASSWORD) return undefined;
  const parsed = parseLogin(username);
  if (!parsed) return undefined;
  const client = ldapClient();
  try {
    await client.bind(env.LDAP_BIND_DN, env.LDAP_BIND_PASSWORD);
    const entry = await readOwnEntry(client, parsed.sam, parsed.domain);
    return entry?.displayName ? String(entry.displayName) : undefined;
  } catch {
    return undefined;
  } finally {
    await client.unbind().catch(() => undefined);
  }
}

// ------------------------------------------------------------------ papéis
const bootstrapAdmins = new Set(
  (env.IPLS_ADMINS || '').split(/[,;\s]+/).map(s => normalizeLogin(s)).filter((s): s is string => !!s)
);

const today = () => new Date().toISOString().slice(0, 10);
export const isPermissionActive = (p: UserPermission) => !p.expiresAt || p.expiresAt >= today();

/** Papel e órgão atuais do usuário (lidos a cada requisição). */
/** Logins com perfil de desenvolvimento (IPLS_DEVS), independente do papel. */
const devUsers = new Set(
  (env.IPLS_DEVS || '').split(/[,;\s]+/).map(s => normalizeLogin(s)).filter((s): s is string => !!s)
);

export function resolveUser(identity: Identity): AuthUser {
  const user = resolveRole(identity);
  return devUsers.has(identity.username) ? { ...user, dev: true } : user;
}

function resolveRole(identity: Identity): AuthUser {
  const domainOrg = organizationForDomain(identity.domain);
  if (bootstrapAdmins.has(identity.username)) {
    return { ...identity, role: 'ADMIN', organizationId: domainOrg, bootstrapAdmin: true };
  }
  const perm = (storage.getDatabase().userPermissions || []).find(p => p.username === identity.username);
  if (perm && isPermissionActive(perm)) {
    return { ...identity, role: perm.role, organizationId: perm.organizationId ?? domainOrg, expiresAt: perm.expiresAt };
  }
  return { ...identity, role: 'LEITOR', organizationId: domainOrg };
}

/** Lançar/corrigir medições e documentos do órgão. */
export const canWriteOrg = (user: AuthUser | null, orgId: string) =>
  !!user && (user.role === 'ADMIN' || ((user.role === 'MASTER' || user.role === 'PREENCHEDOR') && user.organizationId === orgId));

/** Metas e plano de ação do órgão (somente master e administrador). */
export const canManageOrg = (user: AuthUser | null, orgId: string) =>
  !!user && (user.role === 'ADMIN' || (user.role === 'MASTER' && user.organizationId === orgId));

// ------------------------------------------------------------------ sessão
const b64url = (b: Buffer) => b.toString('base64url');
const sign = (payload: string) => b64url(crypto.createHmac('sha256', sessionSecret).update(payload).digest());

function createSessionToken(identity: Identity): string {
  const { username, displayName, email, domain } = identity;
  const payload = b64url(Buffer.from(JSON.stringify({ username, displayName, email, domain, exp: Date.now() + SESSION_HOURS * 3600_000 })));
  return `${payload}.${sign(payload)}`;
}

function readSessionToken(token: string | undefined): Identity | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (typeof data.exp !== 'number' || data.exp < Date.now() || typeof data.username !== 'string') return null;
    return { username: data.username, displayName: data.displayName, email: data.email, domain: data.domain };
  } catch {
    return null;
  }
}

const parseCookies = (header?: string) =>
  Object.fromEntries(
    (header || '').split(';').map(p => p.trim()).filter(Boolean).map(p => {
      const i = p.indexOf('=');
      return [p.slice(0, i), decodeURIComponent(p.slice(i + 1))];
    })
  );

function setSessionCookie(req: Request, res: Response, token: string | null) {
  const parts = [
    `${COOKIE_NAME}=${token ? encodeURIComponent(token) : ''}`,
    'Path=/', 'HttpOnly', 'SameSite=Lax',
    `Max-Age=${token ? SESSION_HOURS * 3600 : 0}`
  ];
  if (env.COOKIE_SECURE === 'true' || req.secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

// ------------------------------------------------------------------ middleware
const requestContext = new AsyncLocalStorage<{ user: AuthUser | null }>();
export const currentUser = (): AuthUser | null => requestContext.getStore()?.user ?? null;

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const identity = readSessionToken(parseCookies(req.headers.cookie)[COOKIE_NAME]);
  const user = identity ? resolveUser(identity) : null;
  res.locals.user = user;

  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    const origin = req.headers.origin;
    if (origin) {
      let host = '';
      try { host = new URL(origin).host; } catch { /* inválida */ }
      if (host !== req.headers.host) {
        res.status(403).json({ error: 'Origem da requisição não permitida.' });
        return;
      }
    }
    if (req.body && typeof req.body === 'object') {
      req.body.userId = user?.username;
      req.body.userName = user?.displayName;
    }
  }
  requestContext.run({ user }, () => next());
}

export function requireLogin(_req: Request, res: Response, next: NextFunction) {
  if (!res.locals.user) {
    res.status(401).json({ error: 'Entre com seu usuário de rede para usar esta função.' });
    return;
  }
  next();
}

export const requireRole = (...roles: AuthRole[]) =>
  (_req: Request, res: Response, next: NextFunction) => {
    const user: AuthUser | null = res.locals.user;
    if (!user) {
      res.status(401).json({ error: 'Entre com seu usuário de rede para alterar dados.' });
      return;
    }
    if (!roles.includes(user.role)) {
      res.status(403).json({ error: 'Seu perfil não permite esta alteração.' });
      return;
    }
    next();
  };

// ------------------------------------------------------------------ rotas
const failures = new Map<string, { count: number; until: number }>();
const MAX_FAILURES = 8;
const LOCK_MS = 15 * 60_000;

function audit(user: AuthUser, entityId: string, previousValue: string | undefined, newValue: string | undefined, reason: string, action: AuditLog['action']) {
  const db = storage.getDatabase();
  db.auditLogs.unshift({
    id: `audit-perm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    organizationId: user.organizationId || 'org-trf1',
    userId: user.username,
    userName: user.displayName,
    action,
    timestamp: new Date().toISOString(),
    entityType: 'PERMISSION',
    entityId,
    previousValue,
    newValue,
    reason,
    source: 'Gestão de Usuários e Permissões'
  } as AuditLog);
}

const describe = (p?: Pick<UserPermission, 'role' | 'organizationId' | 'expiresAt'>) =>
  p ? `${p.role}${p.organizationId ? ` · ${p.organizationId}` : ''}${p.expiresAt ? ` · até ${p.expiresAt}` : ''}` : undefined;

/** Regras de delegação: quem pode conceder/revogar o quê. */
function delegationError(
  actor: AuthUser,
  target: { username: string; role: PermissionRole; organizationId: string | null },
  existing?: UserPermission
): string | null {
  if (actor.role === 'ADMIN') return null;
  if (actor.role === 'MASTER') {
    if (target.role !== 'PREENCHEDOR') return 'Master só concede o papel de preenchedor.';
    if (target.organizationId !== actor.organizationId) return 'Master só concede acesso ao próprio órgão.';
    // Master só delega para usuários do próprio domínio (exceções: administrador regional)
    if (organizationForDomain(target.username.split('@')[1] || '') !== actor.organizationId) {
      return 'Master só concede acesso a usuários do domínio do próprio órgão. Para outros casos, peça ao administrador regional.';
    }
    if (existing && (existing.role !== 'PREENCHEDOR' || existing.organizationId !== actor.organizationId)) {
      return 'Este usuário tem permissão que só o administrador pode alterar.';
    }
    return null;
  }
  return 'Seu perfil não permite gerenciar permissões.';
}

export function createAuthRouter() {
  const router = express.Router();

  router.get('/auth/config', (_req, res) => {
    res.json({ mode: AUTH_MODE, defaultDomain: DEFAULT_DOMAIN, domainSuffix: DOMAIN_SUFFIX });
  });

  router.get('/auth/me', (_req, res) => {
    res.json({ user: res.locals.user ?? null });
  });

  router.post('/auth/login', async (req: Request, res: Response) => {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Informe usuário e senha.' });
    }
    const key = `${req.ip}|${username.trim().toLowerCase()}`;
    const f = failures.get(key);
    if (f && f.count >= MAX_FAILURES && f.until > Date.now()) {
      return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em alguns minutos.' });
    }
    try {
      const identity = await authenticate(username, password);
      failures.delete(key);
      // Atualiza nome e último acesso na permissão, se houver
      const perm = storage.getDatabase().userPermissions.find(p => p.username === identity.username);
      if (perm) {
        perm.displayName = identity.displayName;
        perm.lastLoginAt = new Date().toISOString();
        storage.scheduleSave();
      }
      setSessionCookie(req, res, createSessionToken(identity));
      const user = resolveUser(identity);
      console.log(`[Auth] Login: ${user.username} (${user.role}, ${user.organizationId ?? 'sem órgão'})`);
      return res.json({ user });
    } catch (err) {
      const cur = failures.get(key);
      failures.set(key, { count: (cur && cur.until > Date.now() ? cur.count : 0) + 1, until: Date.now() + LOCK_MS });
      if (err instanceof AuthError) return res.status(401).json({ error: err.message });
      console.error('[Auth] Falha ao consultar o AD:', err);
      return res.status(503).json({ error: 'Não foi possível validar o login no AD. Tente novamente mais tarde.' });
    }
  });

  router.post('/auth/logout', (req, res) => {
    setSessionCookie(req, res, null);
    res.json({ success: true });
  });

  // ---------------- Gestão de permissões (delegada)
  router.get('/permissions', requireRole('ADMIN', 'MASTER'), (_req, res) => {
    const user: AuthUser = res.locals.user;
    const all = storage.getDatabase().userPermissions || [];
    const visible = user.role === 'ADMIN' ? all : all.filter(p => p.organizationId === user.organizationId);
    res.json({
      permissions: visible.map(p => ({ ...p, active: isPermissionActive(p) })),
      bootstrapAdmins: user.role === 'ADMIN' ? [...bootstrapAdmins] : []
    });
  });

  router.post('/permissions', requireRole('ADMIN', 'MASTER'), async (req: Request, res: Response) => {
    const actor: AuthUser = res.locals.user;
    const db = storage.getDatabase();
    const username = normalizeLogin(String(req.body?.username || ''));
    const role = req.body?.role as PermissionRole;
    const expiresAt = req.body?.expiresAt ? String(req.body.expiresAt) : undefined;
    if (!username) return res.status(400).json({ error: 'Login inválido. Use usuario@xx.trf1.gov.br ou JFXX\\usuario.' });
    if (!['ADMIN', 'MASTER', 'PREENCHEDOR'].includes(role)) return res.status(400).json({ error: 'Papel inválido.' });
    if (expiresAt && (!/^\d{4}-\d{2}-\d{2}$/.test(expiresAt) || expiresAt < today())) {
      return res.status(400).json({ error: 'Validade inválida (use uma data futura).' });
    }
    if (username === actor.username) return res.status(400).json({ error: 'Você não pode alterar a própria permissão.' });
    if (bootstrapAdmins.has(username)) return res.status(400).json({ error: 'Este usuário é administrador definido na configuração do servidor.' });

    const domain = username.split('@')[1];
    let organizationId: string | null = null;
    if (role !== 'ADMIN') {
      organizationId = req.body?.organizationId ? String(req.body.organizationId) : organizationForDomain(domain);
      const org = db.organizations.find(o => o.id === organizationId);
      if (!org || org.isConsolidated || org.active === false) {
        return res.status(400).json({ error: 'Órgão inválido para este papel.' });
      }
    }
    const existing = db.userPermissions.find(p => p.username === username);
    const err = delegationError(actor, { username, role, organizationId }, existing);
    if (err) return res.status(403).json({ error: err });

    const now = new Date().toISOString();
    const displayName = existing?.displayName || (await lookupDisplayName(username));
    const next: UserPermission = {
      username, role, organizationId, expiresAt, displayName,
      grantedBy: actor.username, grantedAt: now, lastLoginAt: existing?.lastLoginAt
    };
    if (existing) Object.assign(existing, next);
    else db.userPermissions.push(next);
    audit(actor, username, describe(existing), describe(next), `${existing ? 'Alteração' : 'Concessão'} de permissão por ${actor.username}`, existing ? 'ALTERACAO' : 'CRIACAO');
    try {
      await storage.saveNow();
    } catch {
      return res.status(500).json({ error: 'Falha ao gravar a permissão.' });
    }
    res.json({ permission: next });
  });

  router.delete('/permissions/:username', requireRole('ADMIN', 'MASTER'), async (req: Request, res: Response) => {
    const actor: AuthUser = res.locals.user;
    const db = storage.getDatabase();
    const username = normalizeLogin(String(req.params.username || ''));
    const idx = username ? db.userPermissions.findIndex(p => p.username === username) : -1;
    if (idx < 0) return res.status(404).json({ error: 'Permissão não encontrada.' });
    if (username === actor.username) return res.status(400).json({ error: 'Você não pode revogar a própria permissão.' });
    const existing = db.userPermissions[idx];
    const err = delegationError(actor, { username: existing.username, role: existing.role, organizationId: existing.organizationId }, existing);
    if (err) return res.status(403).json({ error: err });
    db.userPermissions.splice(idx, 1);
    audit(actor, existing.username, describe(existing), undefined, `Revogação de permissão por ${actor.username}`, 'EXCLUSAO');
    try {
      await storage.saveNow();
    } catch {
      return res.status(500).json({ error: 'Falha ao gravar a revogação.' });
    }
    res.json({ success: true });
  });

  return router;
}
