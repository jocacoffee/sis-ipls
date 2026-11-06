import React, { useState } from 'react';
import {
  X,
  Zap,
  Target,
  FileText,
  ListTodo,
  AlertTriangle,
  MessageSquare,
  Building,
  Calendar,
  CheckCircle,
  HelpCircle,
  TrendingDown,
  TrendingUp,
  FileCheck,
  Layers,
  ChevronRight,
  Database,
  Sliders,
  Edit3,
  CalendarDays,
  Sparkles
} from 'lucide-react';
import {
  Indicator,
  IndicatorMeasurement,
  IndicatorTarget,
  PLSDocument,
  ActionPlan,
  IndicatorCalculationResult
} from '../types';
import { StatusPill, TrendLineChart } from './Charts';
import { MONTH_NAMES } from '../services/calculationEngine';

interface IndicatorDetailModalProps {
  indicator: Indicator;
  target?: IndicatorTarget;
  result: IndicatorCalculationResult;
  measurements: IndicatorMeasurement[];
  documents: PLSDocument[];
  actionPlans: ActionPlan[];
  onClose: () => void;
  onOpenDataIngestion: (indicatorId: string, month?: number) => void;
  onOpenChatWithQuery: (q: string) => void;
  onEditIndicator?: (indicator: Indicator) => void;
  onOpenEditTarget?: (indicator: Indicator, target?: IndicatorTarget) => void;
}

export const IndicatorDetailModal: React.FC<IndicatorDetailModalProps> = ({
  indicator,
  target,
  result,
  measurements,
  documents,
  actionPlans,
  onClose,
  onOpenDataIngestion,
  onOpenChatWithQuery,
  onEditIndicator,
  onOpenEditTarget
}) => {
  const [activeTab, setActiveTab] = useState<'evolucao' | 'medicoes' | 'evidencias' | 'metodologia'>('evolucao');

  // Monthly series
  const year2025Data = Array(12).fill(null);
  const year2026Data = Array(12).fill(null);

  const indMeasurements2026 = measurements
    .filter(m => m.indicatorId === indicator.id && m.year === 2026)
    .sort((a, b) => a.month - b.month);

  measurements
    .filter(m => m.indicatorId === indicator.id && m.year === 2025)
    .forEach(m => {
      year2025Data[m.month - 1] = m.value;
    });

  indMeasurements2026.forEach(m => {
    year2026Data[m.month - 1] = m.value;
  });

  const relatedDocs = documents.filter(d => d.indicatorId === indicator.id);
  const relatedActions = actionPlans.filter(a => a.relatedIndicatorIds.includes(indicator.id));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in duration-150">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200/80 bg-slate-50/70 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-0.5 rounded-lg">
                {indicator.code}
              </span>
              {indicator.acronym && (
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md font-mono">
                  {indicator.acronym}
                </span>
              )}
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md uppercase">
                {indicator.periodicity}
              </span>
              <StatusPill status={result.status} />
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              {indicator.name}
            </h2>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              {indicator.description}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onEditIndicator && (
              <button
                onClick={() => onEditIndicator(indicator)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                title="Editar definição textual e periodicidade (anual/mensal)"
              >
                <Sliders className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden sm:inline">Editar Definição / Periodicidade</span>
                <span className="sm:hidden">Editar</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 sm:px-6 bg-slate-50/40 border-b border-slate-200/80">
          <div className="rounded-2xl bg-white p-3.5 border border-slate-200/80 shadow-xs">
            <div className="text-[11px] font-medium text-slate-400">Linha de Base (2025)</div>
            <div className="text-lg font-bold font-mono text-slate-800 mt-1 tabular-nums">
              {result.baselineValue.toLocaleString('pt-BR')} <span className="text-xs font-sans font-normal text-slate-500">{indicator.unit}</span>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-3.5 border border-emerald-200/80 bg-emerald-50/20 shadow-xs relative group">
            <div className="flex items-center justify-between text-[11px] font-medium text-emerald-700">
              <span>Meta Fixada (2026)</span>
              {onOpenEditTarget && (
                <button
                  onClick={() => onOpenEditTarget(indicator, target)}
                  className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-0.5 cursor-pointer"
                  title="Editar valor ou parâmetros da meta"
                >
                  <Target className="w-3 h-3" />
                  <span>Editar Meta</span>
                </button>
              )}
            </div>
            <div className="text-lg font-bold font-mono text-emerald-600 mt-1 tabular-nums">
              {result.targetValue.toLocaleString('pt-BR')} <span className="text-xs font-sans font-normal text-slate-500">{indicator.unit}</span>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-3.5 border border-slate-200/80 shadow-xs">
            <div className="text-[11px] font-medium text-slate-400">
              {indicator.periodicity === 'ANUAL' ? 'Realizado (Consolidado)' : 'Realizado (Jan–Ago)'}
            </div>
            <div className="text-lg font-bold font-mono text-slate-900 mt-1 tabular-nums">
              {result.accumulatedValue.toLocaleString('pt-BR')} <span className="text-xs font-sans font-normal text-slate-500">{indicator.unit}</span>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-3.5 border border-indigo-200/80 bg-indigo-50/20 shadow-xs">
            <div className="text-[11px] font-medium text-indigo-700">Projeção Anual</div>
            <div className="text-lg font-bold font-mono text-indigo-600 mt-1 tabular-nums">
              {result.annualProjection.toLocaleString('pt-BR')} <span className="text-xs font-sans font-normal text-slate-500">{indicator.unit}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-5 sm:px-6 bg-white gap-4 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('evolucao')}
            className={`py-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'evolucao'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Evolução & Tendência
          </button>
          <button
            onClick={() => setActiveTab('medicoes')}
            className={`py-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'medicoes'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {indicator.periodicity === 'ANUAL'
              ? 'Lançamentos & Histórico Anual'
              : `Medições Mensais (${indMeasurements2026.length})`}
          </button>
          <button
            onClick={() => setActiveTab('evidencias')}
            className={`py-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'evidencias'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Documentos & Evidências ({relatedDocs.length})
          </button>
          <button
            onClick={() => setActiveTab('metodologia')}
            className={`py-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'metodologia'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Metodologia & Definição
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-white">
          {/* Diagnostic Note */}
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-950">
                <span className="font-bold">Diagnóstico Técnico iPLS:</span> {result.statusReason}
              </div>
            </div>
          </div>

          {/* Tab 1: Evolução */}
          {activeTab === 'evolucao' && (
            <div className="space-y-4">
              <TrendLineChart
                title={indicator.name}
                unit={indicator.unit}
                data2025={year2025Data}
                data2026={year2026Data}
                monthlyTarget={indicator.defaultMonthlyTarget}
                height={220}
              />

              {/* Related Action Plans */}
              {relatedActions.length > 0 && (
                <div className="rounded-2xl border border-slate-200/80 p-4 bg-white">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                    <ListTodo className="h-4 w-4 text-purple-600" />
                    Iniciativas no Plano de Ação Vinculadas
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {relatedActions.map(act => (
                      <div key={act.id} className="rounded-xl bg-slate-50 p-3 border border-slate-200/80 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">{act.title}</span>
                          <span className="font-mono font-bold text-[10px] text-purple-600">{act.percentageComplete}%</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          {act.responsibleUnit} · Prazo: {act.endDate}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Medições / Histórico */}
          {activeTab === 'medicoes' && (
            <div className="space-y-4">
              {indicator.periodicity === 'ANUAL' ? (
                /* VISÃO DE VARIÁVEIS ANUAIS */
                <div className="space-y-3">
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-700 text-white font-mono font-bold text-[10px]">
                          PERIODICIDADE ANUAL
                        </span>
                        <span className="font-bold text-xs text-emerald-950">
                          Apuração Única por Exercício Consolidado
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800 leading-relaxed">
                        Esta variável não possui medições mensais fracionadas. O valor é homologado para o ano inteiro, servindo de base para as métricas per capita e índices do CNJ.
                      </p>
                    </div>

                    <button
                      onClick={() => onOpenDataIngestion(indicator.id, 12)}
                      className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>+ Atualizar Valor Anual</span>
                    </button>
                  </div>

                  {/* Tabela Histórica de 5 Anos para Variáveis Anuais */}
                  <div className="rounded-2xl border border-slate-200/80 overflow-hidden bg-white shadow-xs">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Exercício</th>
                          <th className="py-2.5 px-3 text-right">Valor Consolidado</th>
                          <th className="py-2.5 px-3">Origem</th>
                          <th className="py-2.5 px-3">Referência / SEI</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {[2026, 2025, 2024, 2023, 2022].map(yr => {
                          const yrMeasurements = measurements.filter(m => m.indicatorId === indicator.id && m.year === yr);
                          const lastM = yrMeasurements[yrMeasurements.length - 1];
                          const hasData = yrMeasurements.length > 0;

                          return (
                            <tr key={yr} className={`hover:bg-slate-50/60 ${yr === 2026 ? 'bg-emerald-50/30' : ''}`}>
                              <td className="py-2.5 px-3 font-sans font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{yr}</span>
                                {yr === 2026 && (
                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                                    Vigente
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                                {hasData ? `${lastM.value.toLocaleString('pt-BR')} ${indicator.unit}` : '—'}
                              </td>
                              <td className="py-2.5 px-3 font-sans text-slate-500 capitalize text-[11px]">
                                {hasData ? lastM.sourceType : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-[11px] text-slate-500 font-sans truncate max-w-[140px]">
                                {hasData ? (lastM.sourceReference || lastM.processNumber || 'SIESPJ') : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-center font-sans">
                                {hasData ? (
                                  <span className="rounded bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                                    {lastM.validationStatus}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">Sem Dado</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-sans">
                                <button
                                  onClick={() => onOpenDataIngestion(indicator.id, 12)}
                                  className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                                >
                                  {hasData ? 'Editar' : 'Lançar'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* VISÃO DE VARIÁVEIS/INDICADORES MENSAIS */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Valores mensais homologados na base estruturada para o exercício de 2026
                    </span>
                    <button
                      onClick={() => onOpenDataIngestion(indicator.id)}
                      className="rounded-xl bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                    >
                      + Lançar Medição
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 overflow-hidden bg-white">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Competência</th>
                          <th className="py-2.5 px-3 text-right">Valor Medido</th>
                          <th className="py-2.5 px-3">Origem</th>
                          <th className="py-2.5 px-3">Processo SEI</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(monthNum => {
                          const m = indMeasurements2026.find(item => item.month === monthNum);
                          const monthName = MONTH_NAMES[monthNum - 1];

                          return (
                            <tr key={monthNum} className="hover:bg-slate-50/60">
                              <td className="py-2 px-3 font-sans font-medium text-slate-900">
                                {monthName}/2026
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums">
                                {m ? `${m.value.toLocaleString('pt-BR')} ${indicator.unit}` : '—'}
                              </td>
                              <td className="py-2 px-3 font-sans text-slate-500 capitalize text-[11px]">
                                {m ? `${m.sourceType}` : '—'}
                              </td>
                              <td className="py-2 px-3 text-[11px] text-slate-500 font-sans truncate max-w-[130px]">
                                {m?.processNumber || '—'}
                              </td>
                              <td className="py-2 px-3 text-center font-sans">
                                {m ? (
                                  <span className="rounded bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                                    {m.validationStatus}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">Pendente</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-sans">
                                <button
                                  onClick={() => onOpenDataIngestion(indicator.id, monthNum)}
                                  className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                                >
                                  {m ? 'Editar' : 'Lançar'}
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
          )}

          {/* Tab 3: Evidências */}
          {activeTab === 'evidencias' && (
            <div className="space-y-3">
              {relatedDocs.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  Nenhum documento ou fatura vinculado a este indicador no momento.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {relatedDocs.map(doc => (
                    <div
                      key={doc.id}
                      className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 line-clamp-1">{doc.title}</span>
                        <span className="rounded bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          OCR {doc.extractionConfidence}%
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{doc.fileName}</div>
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                        <span className="font-semibold text-slate-700">{doc.supplier}</span>
                        <span className="font-mono font-bold text-slate-900">
                          {doc.consumption ? `${doc.consumption.toLocaleString('pt-BR')} ${doc.unit}` : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Metodologia & Definição (Requisito Específico do Usuário) */}
          {activeTab === 'metodologia' && (
            <div className="space-y-4 text-xs">
              {/* Card de Texto de Definição */}
              <div className="rounded-2xl border border-slate-200/80 p-5 bg-white space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-700" />
                    <h4 className="font-bold text-slate-900 text-sm">
                      Texto de Definição / Metodologia do Indicador
                    </h4>
                  </div>
                  {onEditIndicator && (
                    <button
                      onClick={() => onEditIndicator(indicator)}
                      className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold text-xs cursor-pointer hover:underline"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Alterar Definição</span>
                    </button>
                  )}
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3.5 text-slate-800 leading-relaxed font-sans text-xs">
                  {indicator.description}
                </div>

                <p className="text-[11px] text-slate-400">
                  Definição oficial constante nas portarias institucionais, relatórios em PDF e auditoria do CNJ.
                </p>
              </div>

              {/* Card de Periodicidade */}
              <div className="rounded-2xl border border-slate-200/80 p-5 bg-white space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-emerald-700" />
                    <h4 className="font-bold text-slate-900 text-sm">
                      Periodicidade de Apuração
                    </h4>
                  </div>
                  {onEditIndicator && (
                    <button
                      onClick={() => onEditIndicator(indicator)}
                      className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold text-xs cursor-pointer hover:underline"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Alterar Periodicidade</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1.5 rounded-xl font-bold font-mono text-xs border ${
                    indicator.periodicity === 'ANUAL'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-blue-50 text-blue-800 border-blue-300'
                  }`}>
                    {indicator.periodicity === 'ANUAL'
                      ? 'ANUAL (Consolidação por Exercício)'
                      : 'MENSAL (Competências de Jan a Dez)'}
                  </div>
                  {indicator.themeId === 'theme-1' && (
                    <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-1 rounded-lg border border-slate-200 font-semibold">
                      Variável Geral (Tema 1 CNJ)
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {indicator.periodicity === 'ANUAL'
                    ? 'Por determinação regulatória do CNJ e diretrizes institucionais, as Variáveis Gerais possuem periodicidade anual, refletindo os quantitativos globais do exercício (força de trabalho total, área predial total, etc.) utilizados no cálculo dos indicadores derivados per capita e por metro quadrado.'
                    : 'Apurado mês a mês (12 competências no exercício) para monitoramento do consumo e controle das despesas correntes.'}
                </p>
              </div>

              {/* Normativo e Regra */}
              <div className="rounded-2xl border border-slate-200/80 p-5 bg-white space-y-3 shadow-xs">
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">
                    Enquadramento Normativo
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    {indicator.normativeReference || 'Resolução CNJ nº 400/2021 (Anexo de Indicadores do PLS)'}
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-1">
                    Fórmula / Regra de Apuração
                  </h4>
                  <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 font-mono text-emerald-700 font-bold">
                    {indicator.formula || 'Entrada direta via faturas homologadas e atestos'}
                  </div>
                  {indicator.formulaDescription && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      {indicator.formulaDescription}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <span className="text-slate-400">Tipo de Dado:</span>
                    <div className="font-semibold text-slate-800 mt-0.5">{indicator.dataType}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Direção da Meta:</span>
                    <div className="font-semibold text-slate-800 mt-0.5">
                      {indicator.targetDirection === 'MENOR_MELHOR' ? 'Menor é melhor (Redução)' : 'Maior é melhor (Expansão)'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:px-6 border-t border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
          <button
            onClick={() => onOpenChatWithQuery(`Faça uma análise profunda do indicador ${indicator.name} (${indicator.code}) da SJRR para o ano ${2026} e sugira medidas práticas para cumprir a meta.`)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Consultar IA do PLS</span>
          </button>

          <button
            onClick={onClose}
            className="rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
