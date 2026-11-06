import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UserPlus, Trash2, Loader2, Users, ShieldCheck, Info } from 'lucide-react';
import { Organization } from '../types';
import { AuthUser, ROLE_LABEL } from '../services/authClient';

interface PermissionRow {
  username: string;
  role: 'ADMIN' | 'MASTER' | 'PREENCHEDOR';
  organizationId: string | null;
  displayName?: string;
  expiresAt?: string;
  grantedBy: string;
  grantedAt: string;
  lastLoginAt?: string;
  active: boolean;
}

interface PermissionsViewProps {
  authUser: AuthUser;
  organizations: Organization[];
}

const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');

/**
 * Gestão delegada de acesso:
 * - Administrador regional: nomeia masters (e outros administradores) de qualquer órgão.
 * - Master: concede e revoga preenchedores do próprio órgão.
 */
export const PermissionsView: React.FC<PermissionsViewProps> = ({ authUser, organizations }) => {
  const isAdmin = authUser.role === 'ADMIN';
  const assignableOrgs = useMemo(
    () => organizations.filter(o => !o.isConsolidated && o.active !== false),
    [organizations]
  );
  const orgName = (id: string | null) => organizations.find(o => o.id === id)?.acronym || '—';

  const [rows, setRows] = useState<PermissionRow[]>([]);
  const [bootstrapAdmins, setBootstrapAdmins] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterOrg, setFilterOrg] = useState<string>(isAdmin ? 'ALL' : authUser.organizationId || 'ALL');

  const [form, setForm] = useState({
    username: '',
    role: (isAdmin ? 'MASTER' : 'PREENCHEDOR') as PermissionRow['role'],
    organizationId: authUser.organizationId || assignableOrgs[0]?.id || '',
    expiresAt: ''
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/permissions', { credentials: 'same-origin' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setRows(data.permissions || []);
      setBootstrapAdmins(data.bootstrapAdmins || []);
    } catch (e: any) {
      setError(e.message || 'Falha ao carregar as permissões.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          username: form.username,
          role: form.role,
          organizationId: form.role === 'ADMIN' ? null : isAdmin ? form.organizationId : authUser.organizationId,
          expiresAt: form.expiresAt || undefined
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setForm(f => ({ ...f, username: '', expiresAt: '' }));
      await load();
    } catch (e: any) {
      setError(e.message || 'Falha ao gravar a permissão.');
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (row: PermissionRow) => {
    if (!window.confirm(`Revogar o acesso de ${row.displayName || row.username} (${ROLE_LABEL[row.role]})?`)) return;
    setError(null);
    const res = await fetch(`/api/permissions/${encodeURIComponent(row.username)}`, {
      method: 'DELETE',
      credentials: 'same-origin'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error || `HTTP ${res.status}`);
    await load();
  };

  const canRevoke = (row: PermissionRow) =>
    row.username !== authUser.username &&
    (isAdmin || (row.role === 'PREENCHEDOR' && row.organizationId === authUser.organizationId));

  const visible = rows
    .filter(r => filterOrg === 'ALL' || r.organizationId === filterOrg || (filterOrg === 'ADMINS' && r.role === 'ADMIN'))
    .sort((a, b) => (a.organizationId || '').localeCompare(b.organizationId || '') || a.role.localeCompare(b.role) || a.username.localeCompare(b.username));

  return (
    <div className="space-y-5 pb-10">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-600" />
          Usuários e permissões
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          {isAdmin
            ? 'Como administrador regional, você nomeia o master de cada órgão e pode ajustar qualquer permissão.'
            : `Como master da ${orgName(authUser.organizationId)}, você concede e revoga o acesso dos preenchedores do seu órgão.`}
        </p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-600">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-2"><strong>Master</strong>: lança dados, metas e plano de ação do órgão; gerencia preenchedores.</div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-2"><strong>Preenchedor</strong>: lança e corrige medições e documentos do órgão.</div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-2"><strong>Sem permissão</strong>: qualquer servidor logado apenas consulta.</div>
        </div>
      </div>

      <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-emerald-600" />
          Conceder acesso
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="text-xs font-semibold text-slate-700 md:col-span-2">
            Login de rede
            <input
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="usuario@ba.trf1.gov.br ou JFBA\usuario"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Papel
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value as PermissionRow['role'] }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              disabled={!isAdmin}
            >
              {isAdmin && <option value="MASTER">Master do órgão</option>}
              <option value="PREENCHEDOR">Preenchedor</option>
              {isAdmin && <option value="ADMIN">Administrador regional</option>}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Órgão
            <select
              value={form.role === 'ADMIN' ? '' : isAdmin ? form.organizationId : authUser.organizationId || ''}
              onChange={e => setForm(f => ({ ...f, organizationId: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              disabled={!isAdmin || form.role === 'ADMIN'}
            >
              {form.role === 'ADMIN' && <option value="">Todos</option>}
              {assignableOrgs.map(o => (
                <option key={o.id} value={o.id}>{o.acronym} — {o.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Válido até (opcional)
            <input
              type="date"
              value={form.expiresAt}
              onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <p className="text-[11px] text-slate-500 flex items-start gap-1">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          A pessoa entra com a própria senha de rede. Se o login já tiver permissão, ela é substituída. O nome completo aparece no primeiro acesso.
        </p>
        <button
          type="submit"
          disabled={saving || !form.username}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          Conceder
        </button>
      </form>

      {error && <div role="alert" className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2">{error}</div>}

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-bold text-slate-800">Acessos concedidos</h3>
          {isAdmin && (
            <select value={filterOrg} onChange={e => setFilterOrg(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1 text-xs">
              <option value="ALL">Todos os órgãos</option>
              <option value="ADMINS">Administradores</option>
              {assignableOrgs.map(o => <option key={o.id} value={o.id}>{o.acronym}</option>)}
            </select>
          )}
        </div>
        {isAdmin && bootstrapAdmins.length > 0 && (
          <p className="text-[11px] text-slate-500 mb-2">
            Administradores definidos na configuração do servidor (não revogáveis pela tela): {bootstrapAdmins.join(', ')}
          </p>
        )}
        {loading ? (
          <div className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carregando…</div>
        ) : visible.length === 0 ? (
          <div className="text-sm text-slate-500">Nenhum acesso concedido.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-3">Usuário</th>
                  <th className="py-2 pr-3">Papel</th>
                  <th className="py-2 pr-3">Órgão</th>
                  <th className="py-2 pr-3">Validade</th>
                  <th className="py-2 pr-3">Concedido por</th>
                  <th className="py-2 pr-3">Último acesso</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {visible.map(r => (
                  <tr key={r.username} className={`border-b border-slate-100 ${r.active ? '' : 'opacity-60'}`}>
                    <td className="py-2 pr-3">
                      <div className="font-medium text-slate-900">{r.displayName || r.username}</div>
                      {r.displayName && <div className="text-[11px] text-slate-500">{r.username}</div>}
                    </td>
                    <td className="py-2 pr-3">{ROLE_LABEL[r.role]}</td>
                    <td className="py-2 pr-3">{r.role === 'ADMIN' ? 'Todos' : orgName(r.organizationId)}</td>
                    <td className="py-2 pr-3">{r.expiresAt ? `${fmtDate(r.expiresAt + 'T12:00:00')}${r.active ? '' : ' (vencida)'}` : 'Sem prazo'}</td>
                    <td className="py-2 pr-3 text-xs text-slate-600">{r.grantedBy}<br />{fmtDate(r.grantedAt)}</td>
                    <td className="py-2 pr-3 text-xs text-slate-600">{fmtDate(r.lastLoginAt)}</td>
                    <td className="py-2 text-right">
                      {canRevoke(r) && (
                        <button
                          type="button"
                          onClick={() => revoke(r)}
                          className="inline-flex items-center gap-1 rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50 px-2 py-1 text-xs"
                          aria-label={`Revogar acesso de ${r.username}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Revogar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
