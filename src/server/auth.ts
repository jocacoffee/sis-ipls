/**
 * Autenticação do iPLS no Active Directory da floresta trf1.gov.br.
 *
 * - Visitantes (sem login) apenas consultam: todas as rotas GET são públicas.
 * - Login com o usuário de rede (usuario@ba.trf1.gov.br, JFBA\usuario ou usuario).
 *   A senha é validada por LDAPS (bind do próprio usuário); a conta de serviço
 *   só localiza o usuário e verifica os grupos.
 * - Órgão do usuário = domínio do AD (ba.trf1.gov.br → SJBA; trf1.gov.br → TRF1 2º grau).
 * - Perfil: ADMIN (grupo admin; edita qualquer órgão), GESTOR (grupo de gestores;
 *   edita o próprio órgão) ou LEITOR (autenticado, somente leitura).
 * - Sessão em cookie HttpOnly assinado (HMAC-SHA256), sem estado no servidor.
 *
 * Configuração por variáveis de ambiente: ver .env.example (seção AUTENTICAÇÃO).
 */
import crypto from 'crypto';
import fs from 'fs';
import { AsyncLocalStorage } from 'async_hooks';
import express, { NextFunction, Request, Response } from 'express';
import { Client } from 'ldapts';

export type AuthRole = 'ADMIN' | 'GESTOR' | 'LEITOR';

export interface AuthUser {
  username: string;       // ex.: <usuario>@<secao>.trf1.gov.br
  displayName: string;
  email?: string;
  domain: string;         // ex.: rr.trf1.gov.br
  organizationId: string | null; // órgão do iPLS (null = domínio fora da 1ª Região)
  role: AuthRole;
}

// ------------------------------------------------------------------ configuração
const env = process.env;
const isProd = env.NODE_ENV === 'production';
const AUTH_MODE = (env.AUTH_MODE || 'ldap').toLowerCase() as 'ldap' | 'dev';
const DOMAIN_SUFFIX = (env.AUTH_DOMAIN_SUFFIX || 'trf1.gov.br').toLowerCase();
const DEFAULT_DOMAIN = (env.AUTH_DEFAULT_DOMAIN || `rr.${DOMAIN_SUFFIX}`).toLowerCase();
const SESSION_HOURS = Number(env.SESSION_HOURS || 8);
const COOKIE_NAME = 'ipls_session';

/** Seções da 1ª Região (subdomínios do AD) → órgão no iPLS. */
const SECTION_ORGS: Record<string, string> = {
  ac: 'org-sjac', am: 'org-sjam', ap: 'org-sjap', ba: 'org-sjba', df: 'org-sjdf',
  go: 'org-sjgo', ma: 'org-sjma', mt: 'org-sjmt', pa: 'org-sjpa', pi: 'org-sjpi',
  ro: 'org-sjro', rr: 'org-sjrr', to: 'org-sjto'
};

export function organizationForDomain(domain: string): string | null {
  const d = domain.toLowerCase();
  if (d === DOMAIN_SUFFIX) return 'org-trf1-2g';
  const sub = d.endsWith(`.${DOMAIN_SUFFIX}`) ? d.slice(0, -(DOMAIN_SUFFIX.length + 1)) : '';
  return SECTION_ORGS[sub] ?? null; // mg e domínios desconhecidos: sem órgão (somente leitura)
}

let sessionSecret = env.SESSION_SECRET || '';
if (!sessionSecret) {
  if (isProd) {
    throw new Error('SESSION_SECRET é obrigatório em produção (string aleatória longa).');
  }
  sessionSecret = crypto.randomBytes(32).toString('hex');
  console.warn('[Auth] SESSION_SECRET não definido: usando segredo temporário (sessões caem ao reiniciar).');
}

if (AUTH_MODE === 'dev') {
  if (!env.AUTH_DEV_PASSWORD) throw new Error('AUTH_MODE=dev exige AUTH_DEV_PASSWORD.');
  if (isProd && env.AUTH_ALLOW_DEV_IN_PRODUCTION !== 'true') {
    throw new Error('AUTH_MODE=dev não é permitido em produção (defina AUTH_ALLOW_DEV_IN_PRODUCTION=true só para testes locais).');
  }
  console.warn('[Auth] MODO DE TESTE: login sem AD, com senha única de desenvolvimento.');
}

// ------------------------------------------------------------------ usuário/domínio
const SAM_RE = /^[A-Za-z0-9._-]{1,64}$/;
const DOMAIN_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)*$/;

/** Aceita usuario@dominio, NETBIOS\usuario ou usuario (domínio padrão). */
export function parseLogin(input: string): { sam: string; domain: string } | null {
  const raw = input.trim();
  let sam = raw;
  let domain = DEFAULT_DOMAIN;
  if (raw.includes('@')) {
    [sam, domain] = raw.split('@', 2);
  } else if (raw.includes('\\')) {
    const [nb, user] = raw.split('\\', 2);
    sam = user;
    const n = nb.toLowerCase();
    domain = n === 'trf1' ? DOMAIN_SUFFIX : n.startsWith('jf') ? `${n.slice(2)}.${DOMAIN_SUFFIX}` : `${n}.${DOMAIN_SUFFIX}`;
  }
  domain = domain.toLowerCase();
  if (!SAM_RE.test(sam) || !DOMAIN_RE.test(domain)) return null;
  if (domain !== DOMAIN_SUFFIX && !domain.endsWith(`.${DOMAIN_SUFFIX}`)) return null;
  return { sam: sam.toLowerCase(), domain };
}

const domainToDn = (domain: string) => domain.split('.').map(p => `DC=${p}`).join(',');

/** Escapa valores para filtros LDAP (RFC 4515). */
const escapeFilter = (v: string) =>
  v.replace(/[\\*()\0]/g, c => '\\' + c.charCodeAt(0).toString(16).padStart(2, '0'));

// ------------------------------------------------------------------ autenticação
class AuthError extends Error {}

async function authenticateLdap(sam: string, domain: string, password: string): Promise<AuthUser> {
  const url = env.LDAP_URL;
  if (!url || !env.LDAP_BIND_DN || !env.LDAP_BIND_PASSWORD) {
    throw new Error('LDAP não configurado (LDAP_URL, LDAP_BIND_DN, LDAP_BIND_PASSWORD).');
  }
  const tlsOptions: Record<string, unknown> = {
    rejectUnauthorized: env.LDAP_TLS_REJECT_UNAUTHORIZED !== 'false'
  };
  if (env.LDAP_TLS_CA_FILE) tlsOptions.ca = [fs.readFileSync(env.LDAP_TLS_CA_FILE)];
  const newClient = () => new Client({ url, tlsOptions, timeout: 10000, connectTimeout: 5000 });

  // 1. Conta de serviço localiza o usuário no domínio informado (Catálogo Global)
  const svc = newClient();
  let dn: string;
  let displayName = sam;
  let email: string | undefined;
  let role: AuthRole = 'LEITOR';
  try {
    await svc.bind(env.LDAP_BIND_DN, env.LDAP_BIND_PASSWORD);
    const { searchEntries } = await svc.search(domainToDn(domain), {
      scope: 'sub',
      filter: `(&(objectCategory=person)(objectClass=user)(sAMAccountName=${escapeFilter(sam)}))`,
      attributes: ['displayName', 'mail', 'userAccountControl'],
      sizeLimit: 2
    });
    if (searchEntries.length !== 1) throw new AuthError('Usuário ou senha inválidos.');
    const entry = searchEntries[0];
    dn = entry.dn;
    if (Number(entry.userAccountControl) & 2) throw new AuthError('Conta desativada no AD.');
    displayName = String(entry.displayName || sam);
    email = entry.mail ? String(entry.mail) : undefined;

    // 2. Perfil pelos grupos (inclui grupos aninhados: LDAP_MATCHING_RULE_IN_CHAIN)
    const inGroup = async (groupDn?: string) => {
      if (!groupDn) return false;
      const r = await svc.search(dn, {
        scope: 'base',
        filter: `(memberOf:1.2.840.113556.1.4.1941:=${escapeFilter(groupDn)})`,
        attributes: ['distinguishedName']
      });
      return r.searchEntries.length > 0;
    };
    if (await inGroup(env.LDAP_GROUP_ADMIN_DN)) role = 'ADMIN';
    else if (await inGroup(env.LDAP_GROUP_GESTORES_DN)) role = 'GESTOR';
  } finally {
    await svc.unbind().catch(() => undefined);
  }

  // 3. Valida a senha com o próprio usuário
  const userClient = newClient();
  try {
    await userClient.bind(dn, password);
  } catch {
    throw new AuthError('Usuário ou senha inválidos.');
  } finally {
    await userClient.unbind().catch(() => undefined);
  }

  return { username: `${sam}@${domain}`, displayName, email, domain, organizationId: organizationForDomain(domain), role };
}

function authenticateDev(sam: string, domain: string, password: string): AuthUser {
  const expected = Buffer.from(env.AUTH_DEV_PASSWORD || '');
  const given = Buffer.from(password);
  if (expected.length === 0 || expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    throw new AuthError('Usuário ou senha inválidos.');
  }
  const role: AuthRole = sam.startsWith('admin') ? 'ADMIN' : sam.startsWith('leitor') ? 'LEITOR' : 'GESTOR';
  return {
    username: `${sam}@${domain}`,
    displayName: `${sam} (teste)`,
    domain,
    organizationId: organizationForDomain(domain),
    role
  };
}

export async function authenticate(login: string, password: string): Promise<AuthUser> {
  const parsed = parseLogin(login);
  // Senha vazia nunca é aceita (bind anônimo do LDAP "teria sucesso")
  if (!parsed || !password) throw new AuthError('Usuário ou senha inválidos.');
  return AUTH_MODE === 'dev'
    ? authenticateDev(parsed.sam, parsed.domain, password)
    : authenticateLdap(parsed.sam, parsed.domain, password);
}

// ------------------------------------------------------------------ sessão
const b64url = (b: Buffer) => b.toString('base64url');
const sign = (payload: string) => b64url(crypto.createHmac('sha256', sessionSecret).update(payload).digest());

export function createSessionToken(user: AuthUser): string {
  const payload = b64url(Buffer.from(JSON.stringify({ ...user, exp: Date.now() + SESSION_HOURS * 3600_000 })));
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string | undefined): AuthUser | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    const { exp: _exp, ...user } = data;
    return user as AuthUser;
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

const cookieSecure = (req: Request) => env.COOKIE_SECURE === 'true' || req.secure;

function setSessionCookie(req: Request, res: Response, token: string | null) {
  const parts = [
    `${COOKIE_NAME}=${token ? encodeURIComponent(token) : ''}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${token ? SESSION_HOURS * 3600 : 0}`
  ];
  if (cookieSecure(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

// ------------------------------------------------------------------ contexto da requisição
const requestContext = new AsyncLocalStorage<{ user: AuthUser | null }>();

/** Usuário da requisição em andamento (para auditoria). */
export const currentUser = (): AuthUser | null => requestContext.getStore()?.user ?? null;

/** Lê a sessão, bloqueia escrita entre origens e disponibiliza o usuário. */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = readSessionToken(parseCookies(req.headers.cookie)[COOKIE_NAME]);
  res.locals.user = user;

  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    // Proteção CSRF: requisições de escrita só da própria origem
    const origin = req.headers.origin;
    if (origin) {
      let host = '';
      try { host = new URL(origin).host; } catch { /* origem inválida */ }
      if (host !== req.headers.host) {
        res.status(403).json({ error: 'Origem da requisição não permitida.' });
        return;
      }
    }
    // Identidade nas rotas vem da sessão, nunca do corpo enviado pelo navegador
    if (req.body && typeof req.body === 'object') {
      req.body.userId = user?.username;
      req.body.userName = user?.displayName;
    }
  }
  requestContext.run({ user }, () => next());
}

export function requireLogin(req: Request, res: Response, next: NextFunction) {
  if (!res.locals.user) {
    res.status(401).json({ error: 'Entre com seu usuário de rede para usar esta função.' });
    return;
  }
  next();
}

export const requireRole = (...roles: AuthRole[]) =>
  (req: Request, res: Response, next: NextFunction) => {
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

/** Admin altera qualquer órgão; gestor, apenas o próprio. */
export const canWriteOrg = (user: AuthUser | null, orgId: string) =>
  !!user && (user.role === 'ADMIN' || (user.role === 'GESTOR' && user.organizationId === orgId));

// ------------------------------------------------------------------ rotas /api/auth
const failures = new Map<string, { count: number; until: number }>();
const MAX_FAILURES = 8;
const LOCK_MS = 15 * 60_000;

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
      const user = await authenticate(username, password);
      failures.delete(key);
      setSessionCookie(req, res, createSessionToken(user));
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

  return router;
}
