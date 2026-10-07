import React, { useState } from 'react';
import {
  Target,
  Search,
  Filter,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Clock,
  ArrowRight,
  Sparkles,
  BookOpen,
  Scale,
  FileCheck,
  Check,
  ShieldCheck,
  Info,
  Edit2,
  X,
  Save,
  Plus
} from 'lucide-react';
import { Indicator, IndicatorTarget, IndicatorCalculationResult, PLSTheme, TargetType } from '../types';
import { StatusPill } from './Charts';
import { OFFICIAL_NORMATIVE_INCONSISTENCIES } from '../data/normativeInconsistencies';

interface TargetsViewProps {
  indicators: Indicator[];
  targets: IndicatorTarget[];
  themes: PLSTheme[];
  performances: { indicator: Indicator; target?: IndicatorTarget; result: IndicatorCalculationResult }[];
  selectedYear: number;
  onSelectIndicator: (indicator: Indicator) => void;
  onOpenChatWithQuery: (q: string) => void;
  onSaveTarget?: (target: Partial<IndicatorTarget>, reason?: string) => void;
}

interface TargetEditFormState {
  indicator: Indicator;
  targetId?: string;
  year: number;
  targetValue: number;
  baselineValue: number;
  baselineYear: number;
  targetUnit: string;
  targetType: TargetType;
  reductionPercentage?: number;
  notes: string;
  reason: string;
}

export const TargetsView: React.FC<TargetsViewProps> = ({
  indicators,
  targets,
  themes,
  performances,
  selectedYear,
  onSelectIndicator,
  onOpenChatWithQuery,
  onSaveTarget
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'METAS' | 'INCONSISTENCIAS'>('METAS');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingTarget, setEditingTarget] = useState<TargetEditFormState | null>(null);

  const filteredPerformances = performances.filter(item => {
    if (selectedStatus !== 'ALL' && item.result.status !== selectedStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.indicator.name.toLowerCase().includes(q) ||
        item.indicator.code.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenEdit = (ind: Indicator, target?: IndicatorTarget, res?: IndicatorCalculationResult) => {
    setEditingTarget({
      indicator: ind,
      targetId: target?.id,
      year: selectedYear,
      targetValue: target?.targetValue ?? res?.targetValue ?? 0,
      baselineValue: target?.baselineValue ?? res?.baselineValue ?? 0,
      baselineYear: target?.baselineYear ?? 2025,
      targetUnit: target?.targetUnit || ind.unit,
      targetType: target?.targetType || ind.targetType || 'REDUCAO_PERCENTUAL',
      reductionPercentage: target?.reductionPercentage,
      notes: target?.notes || '',
      reason: ''
    });
  };

  const handleSaveTargetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTarget || !onSaveTarget) return;

    onSaveTarget(
      {
        id: editingTarget.targetId,
        indicatorId: editingTarget.indicator.id,
        year: editingTarget.year,
        targetValue: Number(editingTarget.targetValue),
        baselineValue: Number(editingTarget.baselineValue),
        baselineYear: Number(editingTarget.baselineYear),
        targetUnit: editingTarget.targetUnit,
        targetType: editingTarget.targetType,
        reductionPercentage: editingTarget.reductionPercentage !== undefined ? Number(editingTarget.reductionPercentage) : undefined,
        notes: editingTarget.notes
      },
      editingTarget.reason || 'Alteração de meta via painel de Metas do PLS.'
    );

    setEditingTarget(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-colors">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <Target className="w-3.5 h-3.5" />
            <span>PLS Seção Judiciária de Roraima (SJRR · TRF1) · Ciclo 2021–2026</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Metas do PLS-SJRR & Conformidade Normativa
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhamento das metas quinquenais da SJRR, adaptadas às Resoluções CNJ nº 400/2021, 550/2024, 594/2024 e Nova Lei nº 14.133/2021
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('METAS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'METAS'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Metas do Ciclo ({targets.length})
          </button>
          <button
            onClick={() => setActiveSubTab('INCONSISTENCIAS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'INCONSISTENCIAS'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-emerald-600" />
            <span>Auditoria Normativa ({OFFICIAL_NORMATIVE_INCONSISTENCIES.length})</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'INCONSISTENCIAS' ? (
        /* Diagnóstico e Reconciliação Normativa */
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/50 p-5 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 mt-0.5">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-950">
                  Diagnóstico de Inconsistências Normativas do PLS-SJRR (2021) frente à Norma Vigente (2024–2026)
                </h3>
                <p className="text-xs text-emerald-900 mt-1 leading-relaxed">
                  O Plano de Logística Sustentável original da Seção Judiciária de Roraima foi editado em 2021. Desde então, sobrevieram marcos normativos de cumprimento compulsório no Poder Judiciário, em especial a <strong>Resolução CNJ nº 594/2024 (Justiça Carbono Zero)</strong>, a <strong>Resolução CNJ nº 550/2024 (atualização metodológica do PLS-Jud)</strong>, a <strong>Resolução CNJ nº 641/2025 (Inovação e Redução de Custeio - RDC)</strong> e a <strong>Nova Lei de Licitações (Lei nº 14.133/2021)</strong>. O quadro abaixo detalha cada inconsistência identificada e a adaptação implementada no sistema.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3.5">
            {OFFICIAL_NORMATIVE_INCONSISTENCIES.map((inc, idx) => (
              <div
                key={inc.id}
                className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200">
                      Item {idx + 1}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{inc.theme}</span>
                    {inc.indicatorCode && (
                      <span className="text-xs font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Indicadores: {inc.indicatorCode}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      inc.severity === 'CRITICA'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : inc.severity === 'ALTA'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      Severidade: {inc.severity}
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      {inc.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-xs">
                  {/* Previsão Original no PLS */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-700 block mb-1">
                      1. Previsão no PLS-SJRR 2021–2026 Original
                    </span>
                    <p className="text-slate-600 leading-relaxed">{inc.originalTextPLS}</p>
                  </div>

                  {/* Conflito com a Norma Vigente */}
                  <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/80">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-amber-900">2. Conflito com a Norma Vigente</span>
                    </div>
                    <p className="text-amber-800 leading-relaxed">{inc.normativeConflict}</p>
                    <div className="mt-2 pt-2 border-t border-amber-200/60 font-semibold text-[11px] text-amber-900">
                      Norma: {inc.lawOrResolution}
                    </div>
                  </div>

                  {/* Adaptação e Atualização no Sistema */}
                  <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200/80">
                    <span className="font-bold text-emerald-950 block mb-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      3. Adaptação Realizada no iPLS
                    </span>
                    <p className="text-emerald-900 leading-relaxed">{inc.systemAdjustment}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Metas do Ciclo Quinquenal */
        <>
          {/* Resumo Rápido de Metas em Cards Claros */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Metas Monitoradas</span>
                <Target className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold text-slate-900">{targets.length}</span>
                <span className="text-xs text-slate-500">indicadores oficiais</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Ciclo sexenal SJRR 2021–2026</p>
            </div>

            <div className="rounded-2xl border border-emerald-200/90 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
                <span>Metas Cumpridas</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold text-emerald-700">
                  {performances.filter(p => p.result.status === 'EM_CONFORMIDADE' || p.result.status === 'META_ATINGIDA').length}
                </span>
                <span className="text-xs text-emerald-600 font-medium">no alvo</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Ritmo de consumo controlado</p>
            </div>

            <div className="rounded-2xl border border-amber-200/90 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-amber-700 font-medium">
                <span>Sob Atenção</span>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold text-amber-700">
                  {performances.filter(p => p.result.status === 'ATENCAO').length}
                </span>
                <span className="text-xs text-amber-600 font-medium">ajuste de ritmo</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Necessita monitoramento fino</p>
            </div>

            <div className="rounded-2xl border border-rose-200/90 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-rose-700 font-medium">
                <span>Risco de Não Cumprir</span>
                <Clock className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold text-rose-700">
                  {performances.filter(p => p.result.status === 'RISCO').length}
                </span>
                <span className="text-xs text-rose-600 font-medium">acima do teto</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Exige contenção operacional</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por código ou nome do indicador..."
                className="w-full rounded-xl bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">Todos os Status ({filteredPerformances.length})</option>
                <option value="EM_CONFORMIDADE">Em Conformidade</option>
                <option value="ATENCAO">Atenção</option>
                <option value="RISCO">Em Risco</option>
                <option value="META_ATINGIDA">Meta Atingida</option>
              </select>
            </div>
          </div>

          {/* Detailed Targets Cards */}
          <div className="space-y-4">
            {filteredPerformances.map(item => {
              const ind = item.indicator;
              const res = item.result;
              const target = item.target;
              const isOverBudget = ind.targetDirection === 'MENOR_MELHOR' && res.annualProjection > res.targetValue;

              return (
                <div
                  key={ind.id}
                  className={`rounded-2xl border bg-white p-5 shadow-xs transition-all duration-200 hover:shadow-sm ${
                    res.status === 'RISCO'
                      ? 'border-rose-200/90 hover:border-rose-300'
                      : res.status === 'ATENCAO'
                      ? 'border-amber-200/90 hover:border-amber-300'
                      : 'border-slate-200/90 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded-lg">
                          {ind.code}
                        </span>
                        {ind.acronym && (
                          <span className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            {ind.acronym}
                          </span>
                        )}
                        <span className="text-sm font-bold text-slate-900">{ind.name}</span>
                        <StatusPill status={res.status} />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{res.statusReason}</p>

                      {target?.notes && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 w-fit">
                          <Info className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{target.notes}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(ind, target, res)}
                        className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                        title="Alterar parâmetros da meta"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Editar Meta</span>
                      </button>
                      <button
                        onClick={() => onSelectIndicator(ind)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors shadow-2xs"
                      >
                        Ver Detalhes
                      </button>
                      <button
                        onClick={() => onOpenChatWithQuery(`Quanto precisamos economizar para alcançar a meta de ${ind.name}?`)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Simular com IA</span>
                      </button>
                    </div>
                  </div>

                  {/* Grid of Key Calculations */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 shadow-2xs">
                      <span className="text-slate-500 text-[11px] block">Linha de Base 2025</span>
                      <span className="font-mono font-bold text-slate-700 text-sm mt-0.5 block tabular-nums">
                        {res.baselineValue.toLocaleString('pt-BR')} {ind.unit}
                      </span>
                    </div>

                    <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-100 shadow-2xs">
                      <span className="text-emerald-700 text-[11px] block font-medium">Meta {selectedYear}</span>
                      <span className="font-mono font-bold text-emerald-700 text-sm mt-0.5 block tabular-nums">
                        {res.targetValue.toLocaleString('pt-BR')} {ind.unit}
                      </span>
                    </div>

                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 shadow-2xs">
                      <span className="text-slate-500 text-[11px] block">Realizado</span>
                      <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block tabular-nums">
                        {res.accumulatedValue.toLocaleString('pt-BR')} {ind.unit}
                      </span>
                    </div>

                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 shadow-2xs">
                      <span className="text-slate-500 text-[11px] block">Projeção Anual</span>
                      <span
                        className={`font-mono font-bold text-sm mt-0.5 block tabular-nums ${
                          isOverBudget ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {res.annualProjection.toLocaleString('pt-BR')} {ind.unit}
                      </span>
                    </div>

                    <div className="bg-purple-50/40 p-3 rounded-xl border border-purple-100 shadow-2xs">
                      <span className="text-purple-700 text-[11px] block font-medium">Ritmo Restante</span>
                      <span className="font-mono font-bold text-purple-700 text-sm mt-0.5 block tabular-nums">
                        {ind.periodicity === 'ANUAL'
                          ? `Meta Anual Consolidada`
                          : `≤ ${Math.round(res.requiredMonthlyRunRate).toLocaleString('pt-BR')} ${ind.unit}/mês`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Target Editor Modal */}
      {editingTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl p-6 animate-in fade-in duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                  Gestão Estratégica do PLS-SJRR
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Alterar Meta de {editingTarget.indicator.name} ({editingTarget.indicator.code})
                </h3>
              </div>
              <button
                onClick={() => setEditingTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTargetSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Meta para o Exercício {editingTarget.year} *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      required
                      value={editingTarget.targetValue}
                      onChange={e => setEditingTarget({ ...editingTarget, targetValue: Number(e.target.value) })}
                      className="w-full rounded-xl bg-slate-50 border border-slate-300 p-2.5 font-mono text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-sans">
                      {editingTarget.targetUnit}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Valor numérico objetivo para {editingTarget.year}
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Linha de Base ({editingTarget.baselineYear}) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      required
                      value={editingTarget.baselineValue}
                      onChange={e => setEditingTarget({ ...editingTarget, baselineValue: Number(e.target.value) })}
                      className="w-full rounded-xl bg-slate-50 border border-slate-300 p-2.5 font-mono text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-sans">
                      {editingTarget.targetUnit}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Valor de referência histórica para cálculo
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tipo de Meta
                  </label>
                  <select
                    value={editingTarget.targetType}
                    onChange={e => setEditingTarget({ ...editingTarget, targetType: e.target.value as TargetType })}
                    className="w-full rounded-xl bg-slate-50 border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="REDUCAO_PERCENTUAL">Redução Percentual (Ex: -5%)</option>
                    <option value="AUMENTO_PERCENTUAL">Aumento Percentual (Ex: +15%)</option>
                    <option value="LIMITE_MAXIMO">Limite Máximo / Teto Absoluto</option>
                    <option value="LIMITE_MINIMO">Limite Mínimo (Ex: 100%)</option>
                    <option value="ABSOLUTA">Meta Absoluta</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Variação Esperada (%)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editingTarget.reductionPercentage ?? ''}
                    onChange={e => setEditingTarget({ ...editingTarget, reductionPercentage: e.target.value !== '' ? Number(e.target.value) : undefined })}
                    placeholder="Ex: 5.0 ou -15.0"
                    className="w-full rounded-xl bg-slate-50 border border-slate-300 p-2.5 font-mono text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Percentual comparado à linha de base
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Memória de Cálculo & Fundamento Normativo
                </label>
                <textarea
                  rows={2}
                  value={editingTarget.notes}
                  onChange={e => setEditingTarget({ ...editingTarget, notes: e.target.value })}
                  placeholder="Ex: Resolução CNJ nº 400/2021: redução viabilizada pelo retrofit e automação predial."
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Justificativa da Alteração (para Registro de Auditoria) *
                </label>
                <input
                  type="text"
                  required
                  value={editingTarget.reason}
                  onChange={e => setEditingTarget({ ...editingTarget, reason: e.target.value })}
                  placeholder="Ex: Repactuação anual de meta aprovada pela Comissão Gestora do PLS."
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Ficará gravado de forma imutável na trilha de auditoria do órgão.
                </span>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingTarget(null)}
                  className="rounded-xl px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Meta</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

