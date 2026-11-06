/** Tipos e chamadas de sessão usados pela interface. */
export type AuthRole = 'ADMIN' | 'GESTOR' | 'LEITOR';

export interface AuthUser {
  username: string;
  displayName: string;
  email?: string;
  domain: string;
  organizationId: string | null;
  role: AuthRole;
}

export const ROLE_LABEL: Record<AuthRole, string> = {
  ADMIN: 'Administrador (todos os órgãos)',
  GESTOR: 'Gestor do PLS',
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

/** Pode lançar/editar dados do órgão selecionado? */
export function canEditOrganization(user: AuthUser | null, orgId: string, isConsolidated: boolean): boolean {
  if (!user || isConsolidated) return false;
  if (user.role === 'ADMIN') return true;
  return user.role === 'GESTOR' && user.organizationId === orgId;
}
