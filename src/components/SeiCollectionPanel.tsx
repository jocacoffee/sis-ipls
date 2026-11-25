import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Plus, Trash2, Power, AlertCircle, CheckCircle2, Clock, FileText, Bot } from 'lucide-react';
import type { Organization, SeiMonitoredProcess, SeiSyncedDocument, SeiSyncRun } from '../types';

interface SeiStatus {
  mode: 'soap' | 'simulado' | 'desligado';
  ready: boolean;
  message: string;
  running: boolean;
  scheduleHour: string | null;
}

interface Props {
  organizations: Organization[];
  selectedOrgId: string;
  /** Pode cadastrar/alterar processos e sincronizar no órgão informado? */
  canManage: (orgId: string) => boolean;
}

const STATUS_STYLE: Record<SeiSyncedDocument['status'], string> = {
  LANCADO: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  PENDENTE: 'bg-amber-50 text-amber-800 border-amber-200',
  IGNORADO: 'bg-slate-100 text-slate-600 border-slate-200',
  ERRO: 'bg-rose-50 text-rose-800 border-rose-200'
};

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body as T;
}

/** Coleta automática do SEI (Fase 3): processos monitorados, execução manual e histórico. */
export const SeiCollectionPanel: React.FC<Props> = ({ organizations, selectedOrgId, canManage }) => {
  const [status, setStatus] = useState<SeiStatus | null>(null);
  const [processes, setProcesses] = useState<SeiMonitoredProcess[]>([]);
  const [runs, setRuns] = useState<SeiSyncRun[]>([]);
  const [docs, setDocs] = useState<SeiSyncedDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ processNumber: '', description: '', documentTypes: 'Fatura, Nota Fiscal' });
  const [openRun, setOpenRun] = useState<string | null>(null);

  const selected = organizations.find(o => o.id === selectedOrgId);
  const isConsolidated = !!selected?.isConsolidated;
  const orgAcr = (id: string) => organizations.find(o => o.id === id)?.acronym || id;

  const load = useCallback(async () => {
    try {
      const [st, procs, hist] = await Promise.all([
        api<SeiStatus>('/api/sei/status'),
        api<SeiMonitoredProcess[]>(`/api/sei/processes?orgId=${encodeURIComponent(selectedOrgId)}`),
        api<{ running: boolean; runs: SeiSyncRun[]; documents: SeiSyncedDocument[] }>(`/api/sei/runs?orgId=${encodeURIComponent(selectedOrgId)}`)
      ]);
      setStatus(st);
      setProcesses(procs);
      setRuns(hist.runs);
      setDocs(hist.documents);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [selectedOrgId]);

  useEffect(() => {
    load();
  }, [load]);

  // Enquanto houver coleta em andamento, atualiza a cada 3 s
  useEffect(() => {
    if (!status?.running) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [status?.running, load]);

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const addProcess = () =>
    act(async () => {
      await api('/api/sei/processes', {
        method: 'POST',
        body: JSON.stringify({ organizationId: selectedOrgId, ...form })
      });
      setForm(f => ({ ...f, processNumber: '', description: '' }));
    });

  const sync = (processId?: string) =>
    act(() => api('/api/sei/sync', { method: 'POST', body: JSON.stringify({ organizationId: selectedOrgId, processId }) }));

  const canAdd = !isConsolidated && canManage(selectedOrgId);
  const canSyncAll = isConsolidated ? canManage('*') : canManage(selectedOrgId);

  return (
    <div className="space-y-4">
      {/* Situação da conexão */}
      <div className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${status?.ready ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
        <div className="flex items-start gap-3">
          <Bot className={`w-5 h-5 mt-0.5 ${status?.ready ? 'text-emerald-700' : 'text-amber-700'}`} />
          <div className="text-xs">
            <div className="font-bold text-slate-900">
              Agente de coleta do SEI · {status ? (status.mode === 'soap' ? 'web service do SEI' : status.mode === 'simulado' ? 'SEI simulado (testes)' : 'desligado') : '…'}
            </div>
            <div className="text-slate-600 mt-0.5">{status?.message}</div>
            <div className="text-slate-500 mt-0.5">
              {status?.scheduleHour ? `Execução diária às ${status.scheduleHour}h.` : 'Sem execução diária agendada (SEI_SYNC_HOUR).'} Lê as faturas novas,
              confere e só lança CEE/GEE quando tudo bate; o resto fica pendente em Documentos.
            </div>
          </div>
        </div>
        {canSyncAll && (
          <button
            onClick={() => sync()}
            disabled={!status?.ready || status?.running || processes.filter(p => p.active).length === 0}
            className="shrink-0 flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${status?.running ? 'animate-spin' : ''}`} />
            {status?.running ? 'Coletando…' : 'Sincronizar agora'}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Processos monitorados */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900">Processos monitorados</h3>
        <p className="text-xs text-slate-500 mt-0.5">Processos SEI do contrato de energia de cada órgão. O agente lê os documentos dos tipos indicados.</p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-slate-500 border-b border-slate-200">
              <tr>
                <th className="text-left py-2 pr-3">Processo</th>
                {isConsolidated && <th className="text-left py-2 pr-3">Órgão</th>}
                <th className="text-left py-2 pr-3">Tipos de documento</th>
                <th className="text-left py-2 pr-3">Última coleta</th>
                <th className="text-right py-2">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processes.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-slate-400">Nenhum processo cadastrado.</td></tr>
              )}
              {processes.map(p => {
                const manage = canManage(p.organizationId);
                return (
                  <tr key={p.id} className={p.active ? '' : 'opacity-50'}>
                    <td className="py-2 pr-3">
                      <div className="font-mono font-bold text-slate-900">{p.processNumber}</div>
                      {p.description && <div className="text-slate-500">{p.description}</div>}
                    </td>
                    {isConsolidated && <td className="py-2 pr-3 font-semibold">{orgAcr(p.organizationId)}</td>}
                    <td className="py-2 pr-3 text-slate-600">{p.documentTypes.join(', ') || 'todos'}</td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-1">
                        {p.lastSyncStatus === 'ERRO' ? <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> : p.lastSyncAt ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{fmt(p.lastSyncAt)}</span>
                      </div>
                      {p.lastSyncMessage && <div className="text-[11px] text-slate-500 max-w-[260px] truncate" title={p.lastSyncMessage}>{p.lastSyncMessage}</div>}
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      {manage && (
                        <div className="inline-flex gap-1">
                          <button onClick={() => sync(p.id)} disabled={!status?.ready || status?.running || !p.active} title="Sincronizar este processo" className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer">
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => act(() => api(`/api/sei/processes/${p.id}`, { method: 'PUT', body: JSON.stringify({ active: !p.active }) }))}
                            title={p.active ? 'Desativar' : 'Ativar'}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 cursor-pointer"
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => window.confirm(`Remover o processo ${p.processNumber} do monitoramento?`) && act(() => api(`/api/sei/processes/${p.id}`, { method: 'DELETE' }))}
                            title="Remover"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {canAdd && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-[1.2fr_1.2fr_1fr_auto] gap-2 items-end">
            <label className="text-xs">
              <span className="font-semibold text-slate-700">Número do processo SEI</span>
              <input value={form.processNumber} onChange={e => setForm({ ...form, processNumber: e.target.value })} placeholder="0000000-00.0000.4.01.0000" className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 font-mono" />
            </label>
            <label className="text-xs">
              <span className="font-semibold text-slate-700">Descrição</span>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Contrato de energia — sede" className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5" />
            </label>
            <label className="text-xs">
              <span className="font-semibold text-slate-700">Tipos de documento</span>
              <input value={form.documentTypes} onChange={e => setForm({ ...form, documentTypes: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5" />
            </label>
            <button onClick={addProcess} disabled={!form.processNumber.trim()} className="flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-40 cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Monitorar
            </button>
          </div>
        )}
        {isConsolidated && <p className="mt-3 text-[11px] text-slate-500">Para cadastrar processos, selecione o órgão dono do processo.</p>}
      </div>

      {/* Documentos vistos */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><FileText className="w-4 h-4 text-slate-500" /> Documentos lidos do SEI</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-slate-500 border-b border-slate-200">
              <tr>
                <th className="text-left py-2 pr-3">Documento</th>
                <th className="text-left py-2 pr-3">Órgão</th>
                <th className="text-left py-2 pr-3">Resultado</th>
                <th className="text-left py-2">Detalhe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docs.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-slate-400">Nenhum documento lido ainda.</td></tr>}
              {docs.map(d => (
                <tr key={d.id}>
                  <td className="py-2 pr-3"><span className="font-mono">{d.seiDocumentNumber || d.seiDocumentId}</span> <span className="text-slate-500">· {d.documentType}</span><div className="text-[11px] text-slate-400">{fmt(d.syncedAt)}</div></td>
                  <td className="py-2 pr-3">{orgAcr(d.organizationId)}</td>
                  <td className="py-2 pr-3"><span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${STATUS_STYLE[d.status]}`}>{d.status}</span></td>
                  <td className="py-2 text-slate-600">{d.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Histórico de execuções */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900">Execuções da coleta</h3>
        <div className="mt-3 space-y-2">
          {runs.length === 0 && <div className="text-xs text-slate-400">Nenhuma execução.</div>}
          {runs.map(r => (
            <div key={r.id} className="rounded-xl border border-slate-200 text-xs">
              <button onClick={() => setOpenRun(openRun === r.id ? null : r.id)} className="w-full flex flex-wrap items-center gap-x-3 gap-y-1 p-2.5 text-left cursor-pointer">
                <span className="font-semibold">{fmt(r.startedAt)}</span>
                <span className="text-slate-500">{r.trigger === 'MANUAL' ? `manual (${r.triggeredBy})` : 'agendada'} · {r.clientMode}</span>
                <span className={`rounded-md px-1.5 py-0.5 font-bold ${r.status === 'OK' ? 'bg-emerald-50 text-emerald-800' : r.status === 'EM_ANDAMENTO' ? 'bg-sky-50 text-sky-800' : 'bg-amber-50 text-amber-800'}`}>{r.status}</span>
                <span className="text-slate-600">{r.launched} lançado(s) · {r.pending} pendente(s) · {r.ignored} ignorado(s) · {r.errors} erro(s)</span>
              </button>
              {openRun === r.id && (
                <pre className="border-t border-slate-100 bg-slate-50 p-2.5 text-[11px] whitespace-pre-wrap font-mono text-slate-700">{r.log.join('\n')}</pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
