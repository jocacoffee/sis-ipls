/** Tipos e chamadas de sessão/permissão usados pela interface. */
export type AuthRole = 'ADMIN' | 'MASTER' | 'PREENCHEDOR' | 'LEITOR';

export interface AuthUser {
  username: string;
  displayName: string;
  email?: string;
  domain: string;
  organizationId: string | null;
  role: AuthRole;
  bootstrapAdmin?: boolean;
  /** Perfil de desenvolvimento: vê os módulos em construção. */
  dev?: boolean;
  expiresAt?: string;
}

export const ROLE_LABEL: Record<AuthRole, string> = {
  ADMIN: 'Administrador regional',
  MASTER: 'Master do órgão',
  PREENCHEDOR: 'Preenchedor',
  LEITOR: 'Consulta'
};

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user ?? null;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => undefined);
}

/** Pode lançar/corrigir medições e documentos do órgão selecionado? */
export function canEnterData(user: AuthUser | null, orgId: string, isConsolidated: boolean): boolean {
  if (!user || isConsolidated) return false;
  if (user.role === 'ADMIN') return true;
  return (user.role === 'MASTER' || user.role === 'PREENCHEDOR') && user.organizationId === orgId;
}

/** Pode alterar metas e plano de ação do órgão selecionado (master ou administrador)? */
export function canManageTargets(user: AuthUser | null, orgId: string, isConsolidated: boolean): boolean {
  if (!user || isConsolidated) return false;
  if (user.role === 'ADMIN') return true;
  return user.role === 'MASTER' && user.organizationId === orgId;
}

/** Pode abrir a gestão de usuários? */
/** Perfil de desenvolvimento (IPLS_DEVS no servidor). */
export const isDevUser = (user: AuthUser | null) => !!user?.dev;

export const canManageUsers = (user: AuthUser | null) => !!user && (user.role === 'ADMIN' || user.role === 'MASTER');
