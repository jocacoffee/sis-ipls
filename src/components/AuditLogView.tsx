import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  User,
  History,
  CheckCircle2,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { AuditLog, InconsistencyAlert, Indicator, IndicatorMeasurement } from '../types';

interface AuditLogViewProps {
  auditLogs: AuditLog[];
  alerts: InconsistencyAlert[];
  indicators: Indicator[];
  measurements: IndicatorMeasurement[];
  onOpenDataIngestion: (indicatorId: string) => void;
  onOpenDocuments: () => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  auditLogs,
  alerts,
  indicators,
  measurements,
  onOpenDataIngestion,
  onOpenDocuments
}) => {
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'QUALITY'>('AUDIT');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  // Filter audit logs
  const filteredLogs = auditLogs.filter(log => {
    if (filterAction !== 'ALL' && log.action !== filterAction) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.userName.toLowerCase().includes(q) ||
        (log.indicatorCode && log.indicatorCode.toLowerCase().includes(q)) ||
        (log.reason && log.reason.toLowerCase().includes(q)) ||
        log.source.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Data Quality Metrics
  const pendingValidationCount = measurements.filter(m => m.validationStatus === 'PENDENTE').length;
  const activeAlerts = alerts.filter(a => !a.resolved);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-colors dark:border-slate-800/80 dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Governança & Trilha de Auditoria</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            Auditoria & Qualidade dos Dados
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Rastreabilidade imutável de alterações, justificativas e diagnóstico de consistência
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'AUDIT'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Trilha de Auditoria ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('QUALITY')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'QUALITY'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Qualidade & Alertas ({activeAlerts.length})
          </button>
        </div>
      </div>

      {activeTab === 'AUDIT' ? (
        /* Audit Trail Table */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por usuário, motivo ou código..."
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterAction}
                onChange={e => setFilterAction(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">Todas as Ações</option>
                <option value="CRIACAO">Criação</option>
                <option value="ALTERACAO">Alteração / Retificação</option>
                <option value="VALIDACAO">Validação de Atesto</option>
                <option value="EXTRAÇÃO_OCR">Extração OCR</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden transition-colors dark:border-slate-800/80 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-3">Usuário</th>
                  <th className="py-3 px-3">Ação</th>
                  <th className="py-3 px-3">Entidade</th>
                  <th className="py-3 px-3">Valor / Registro</th>
                  <th className="py-3 px-4">Justificativa</th>
                  <th className="py-3 px-3">Origem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </td>

                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <User className="w-3 h-3 text-slate-400" />
                      {log.userName}
                    </td>

                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          log.action === 'VALIDACAO'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : log.action === 'ALTERACAO'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : log.action === 'EXTRAÇÃO_OCR'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                      {log.indicatorCode || log.entityType}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 max-w-[160px] truncate" title={log.newValue}>
                      {log.newValue || log.previousValue || '—'}
                    </td>

                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 max-w-[220px] truncate" title={log.reason}>
                      {log.reason || 'Sem justificativa informada'}
                    </td>

                    <td className="py-2.5 px-3 text-slate-400 text-[10px] truncate max-w-[120px]">
                      {log.source}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Data Quality & Anomaly Dashboard */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span>Alertas Ativos</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
                {activeAlerts.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Variações anômalas</div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span>Faturas Aguardando Atesto</span>
                <Clock className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
                {pendingValidationCount}
              </div>
              <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">Exigem homologação</div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span>Integridade Geral da Base</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                94.8%
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">Auditado CNJ 400</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs p-5 space-y-4 dark:border-slate-800/80 dark:bg-slate-900">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Diagnóstico de Inconsistências & Alertas
            </h3>

            <div className="space-y-3">
              {activeAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
                    alert.severity === 'CRITICA'
                      ? 'bg-rose-50/40 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/60'
                      : 'bg-amber-50/40 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/60'
                  }`}
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          alert.severity === 'CRITICA'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {alert.type}
                      </span>
                      <strong className="text-slate-900 dark:text-white">{alert.indicatorName}</strong>
                    </div>

                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{alert.message}</p>

                    <div className="text-[11px] text-slate-400 pt-1">
                      <strong>Ação Recomendada:</strong> {alert.suggestedAction}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (alert.type === 'UNVALIDATED_DOC') {
                        onOpenDocuments();
                      } else {
                        onOpenDataIngestion(alert.indicatorId);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold whitespace-nowrap shadow-2xs"
                  >
                    Verificar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
