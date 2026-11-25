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
import { PLSJudMapping, Indicator, Organization } from '../types';
import { SeiCollectionPanel } from './SeiCollectionPanel';

interface IntegrationsViewProps {
  organizations: Organization[];
  selectedOrgId: string;
  /** Pode gerenciar a coleta do SEI no órgão ('*' = todos os órgãos)? */
  canManageSei: (orgId: string) => boolean;
  plsJudMappings: PLSJudMapping[];
  indicators: Indicator[];
  onTransmitPLSJud?: (id: string) => void;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({
  organizations,
  selectedOrgId,
  canManageSei,
  plsJudMappings,
  indicators,
  onTransmitPLSJud
}) => {
  const [activeTab, setActiveTab] = useState<'SEI' | 'PLS_JUD'>('SEI');
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
            Coleta do SEI
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
        <SeiCollectionPanel organizations={organizations} selectedOrgId={selectedOrgId} canManage={canManageSei} />
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
