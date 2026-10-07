import React, { useState } from 'react';
import {
  Network,
  RefreshCw,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  Send,
  Database,
  ArrowRight,
  FileText
} from 'lucide-react';
import { PLSJudMapping, SEIConnector, Indicator } from '../types';

interface IntegrationsViewProps {
  seiConnectors: SEIConnector[];
  plsJudMappings: PLSJudMapping[];
  indicators: Indicator[];
  onSyncSEI?: (id: string) => void;
  onTransmitPLSJud?: (id: string) => void;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({
  seiConnectors,
  plsJudMappings,
  indicators,
  onSyncSEI,
  onTransmitPLSJud
}) => {
  const [activeTab, setActiveTab] = useState<'SEI' | 'PLS_JUD'>('SEI');
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleSimulateSync = (id: string) => {
    setSyncingId(id);
    setTimeout(() => {
      setSyncingId(null);
      if (onSyncSEI) onSyncSEI(id);
    }, 1200);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-colors dark:border-slate-800/80 dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Network className="w-3.5 h-3.5" />
            <span>Conectores Institucionais & Interoperabilidade</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            Integrações com SEI e PLS-Jud (CNJ)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Arquitetura desacoplada para sincronização de processos e transmissão ao CNJ
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('SEI')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'SEI'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Processos SEI ({seiConnectors.length})
          </button>
          <button
            onClick={() => setActiveTab('PLS_JUD')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'PLS_JUD'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Transmissão CNJ ({plsJudMappings.length})
          </button>
        </div>
      </div>

      {activeTab === 'SEI' ? (
        /* SEI Connectors List */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {seiConnectors.map(c => {
              const ind = indicators.find(i => i.id === c.indicatorId);
              const isSyncing = syncingId === c.id;

              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between transition-colors dark:border-slate-800/80 dark:bg-slate-900"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 dark:bg-slate-800 dark:text-slate-200 px-2 py-0.5 rounded">
                        {c.processNumber}
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          c.status === 'SINCRONIZADO'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 dark:text-white text-sm mt-1">{c.description}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Processo: <strong className="text-slate-700 dark:text-slate-300 font-mono">{c.processNumber}</strong>
                    </p>

                    <div className="mt-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Indicador Vinculado:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{ind?.code} — {ind?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Documento Mapeado:</span>
                        <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">{c.expectedDocumentType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Última Sincronização:</span>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {c.lastSyncDate ? new Date(c.lastSyncDate).toLocaleDateString('pt-BR') : 'Pendente'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">Webhook SEI Ativo</span>
                    <button
                      onClick={() => handleSimulateSync(c.id)}
                      disabled={isSyncing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
                      <span>{isSyncing ? 'Consultando...' : 'Sincronizar'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* PLS-Jud Transmission Panel */
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Mapeamento de Indicadores iPLS → Dicionário PLS-Jud (CNJ)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Conformidade garantida conforme Anexo Único da Resolução CNJ nº 400/2021.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden transition-colors dark:border-slate-800/80 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Indicador iPLS</th>
                  <th className="py-3 px-3">Código CNJ</th>
                  <th className="py-3 px-3">Campo no PLS-Jud</th>
                  <th className="py-3 px-3">Última Transmissão</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                {plsJudMappings.map(m => {
                  const ind = indicators.find(i => i.id === m.indicatorId);

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-white">{ind?.code} — {ind?.name}</span>
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {m.cnjCode}
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                        {m.cnjFieldName}
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400">
                        {m.lastTransmissionDate || 'Pendente de envio'}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          {m.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onTransmitPLSJud && onTransmitPLSJud(m.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-xs"
                        >
                          Transmitir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
