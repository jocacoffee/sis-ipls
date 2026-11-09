import React, { useState, useEffect } from 'react';
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
  Plus,
  Trash2
} from 'lucide-react';
import { Indicator, IndicatorMeasurement, IndicatorTarget, IndicatorCalculationResult, PLSTheme, TargetType } from '../types';
import { baselineFor, describeTarget, percentTargetValue } from '../services/targets';
import { StatusPill } from './Charts';
import { OFFICIAL_NORMATIVE_INCONSISTENCIES } from '../data/normativeInconsistencies';
import { getSelectableYears, getPlsCycleForYear } from '../utils/yearUtils';

interface TargetsViewProps {
  indicators: Indicator[];
  /** Medições do órgão selecionado (linha de base das metas percentuais). */
  measurements?: IndicatorMeasurement[];
  targets: IndicatorTarget[];
  themes: PLSTheme[];
  performances: { indicator: Indicator; target?: IndicatorTarget; result: IndicatorCalculationResult }[];
  selectedYear: number;
  onSelectIndicator: (indicator: Indicator) => void;
  onOpenChatWithQuery: (q: string) => void;
  onSaveTarget?: (target: Partial<IndicatorTarget>, reason?: string) => void;
  onDeleteTarget?: (targetId: string, indicatorId: string, year: number, reason?: string) => void;
  initialEditingTarget?: { indicatorId: string; target?: IndicatorTarget } | null;
  onClearInitialEditingTarget?: () => void;
}

interface TargetEditFormState {
  indicatorId: string;
  targetId?: string;
  year: number;
  targetValue: number;
  baselineValue: number;
  baselineYear: number;
  targetUnit: string;
  targetType: TargetType;
  reductionPercentage?: number;
  targetMode: 'NUMERICA' | 'PERCENTUAL';
  limitKind: 'TETO' | 'PISO';
  /** Variação sobre a base, com sinal (negativo = redução). */
  percentChange?: number;
  notes: string;
  reason: string;
  isNew?: boolean;
}

/** Regras de meta percentual: sentido (teto/piso) e sinal da variação. */
const PERCENT_RULES = [
  { key: 'TETO:-', limit: 'TETO' as const, sign: -1, label: 'Reduzir em', hint: 'teto = base − X%' },
  { key: 'TETO:+', limit: 'TETO' as const, sign: 1, label: 'Limitar o aumento a', hint: 'teto = base + X%' },
  { key: 'PISO:+', limit: 'PISO' as const, sign: 1, label: 'Aumentar em pelo menos', hint: 'piso = base + X%' },
  { key: 'PISO:-', limit: 'PISO' as const, sign: -1, label: 'Limitar a redução a', hint: 'piso = base − X%' }
];
const ruleKey = (limit: 'TETO' | 'PISO', pct?: number) => `${limit}:${(pct ?? -1) < 0 ? '-' : '+'}`;

export const TargetsView: React.FC<TargetsViewProps> = ({
  indicators,
  measurements = [],
  targets,
  themes,
  performances,
  selectedYear,
  onSelectIndicator,
  onOpenChatWithQuery,
  onSaveTarget,
  onDeleteTarget,
  initialEditingTarget,
  onClearInitialEditingTarget
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'METAS' | 'INCONSISTENCIAS'>('METAS');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedThemeFilter, setSelectedThemeFilter] = useState<string>('ALL');
  const [targetScopeFilter, setTargetScopeFilter] = useState<'WITH_TARGET' | 'ALL' | 'WITHOUT_TARGET'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingTarget, setEditingTarget] = useState<TargetEditFormState | null>(null);
  const [targetToDelete, setTargetToDelete] = useState<{
    id?: string;
    indicatorId: string;
    indicatorName: string;
    year: number;
    targetValue: number;
    targetUnit: string;
  } | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('');

  useEffect(() => {
    if (initialEditingTarget) {
      const ind = indicators.find(i => i.id === initialEditingTarget.indicatorId);
      if (ind) {
        handleOpenEdit(ind, initialEditingTarget.target);
      }
      onClearInitialEditingTarget?.();
    }
  }, [initialEditingTarget]);

  const filteredPerformances = performances.filter(item => {
    const hasTarget = Boolean(
      item.target ||
      (item.indicator.targetValue2026 !== undefined && item.indicator.targetValue2026 !== null && item.indicator.targetValue2026 > 0) ||
      (item.result.targetValue !== undefined && item.result.targetValue !== null && item.result.targetValue > 0)
    );

    if (targetScopeFilter === 'WITH_TARGET' && !hasTarget) return false;
    if (targetScopeFilter === 'WITHOUT_TARGET' && hasTarget) return false;
    if (selectedStatus !== 'ALL' && item.result.status !== selectedStatus) return false;
    if (selectedThemeFilter !== 'ALL' && item.indicator.themeId !== selectedThemeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.indicator.name.toLowerCase().includes(q) ||
        item.indicator.code.toLowerCase().includes(q) ||
        (item.indicator.acronym && item.indicator.acronym.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleOpenEdit = (ind: Indicator, target?: IndicatorTarget, res?: IndicatorCalculationResult) => {
    const hasTargetAlready = Boolean(
      target ||
      (ind.targetValue2026 !== undefined && ind.targetValue2026 !== null && ind.targetValue2026 > 0) ||
      (res && res.targetValue > 0)
    );
    const effTargetVal = target?.targetValue ?? res?.targetValue ?? ind.targetValue2026 ?? 0;
    setEditingTarget({
      indicatorId: ind.id,
      targetId: target?.id,
      year: target?.year ?? selectedYear,
      targetValue: effTargetVal,
      baselineValue: target?.baselineValue ?? res?.baselineValue ?? ind.baselineValue ?? 0,
      baselineYear: target?.baselineYear ?? ind.baselineYear ?? 2025,
      targetUnit: target?.targetUnit || ind.unit,
      targetType: target?.targetType || ind.targetType || 'REDUCAO_PERCENTUAL',
      reductionPercentage: target?.reductionPercentage,
      targetMode: target?.targetMode || 'NUMERICA',
      limitKind: target?.limitKind || (ind.targetDirection === 'MAIOR_MELHOR' ? 'PISO' : 'TETO'),
      percentChange: target?.percentChange,
      notes: target?.notes || '',
      reason: '',
      isNew: !hasTargetAlready
    });
  };

  const handleOpenNewTarget = (preselectedIndicatorId?: string) => {
    // Variáveis gerais (tema 1) não recebem meta
    const targetable = indicators.filter(i => i.themeId !== 'theme-1');
    const defaultInd = preselectedIndicatorId
      ? targetable.find(i => i.id === preselectedIndicatorId) || targetable[0]
      : targetable[0];

    const existingTarget = defaultInd
      ? targets.find(t => t.indicatorId === defaultInd.id && t.year === selectedYear)
      : undefined;

    setEditingTarget({
      indicatorId: defaultInd?.id || '',
      targetId: existingTarget?.id,
      year: selectedYear,
      targetValue: existingTarget?.targetValue ?? defaultInd?.targetValue2026 ?? 0,
      baselineValue: existingTarget?.baselineValue ?? defaultInd?.baselineValue ?? 0,
      baselineYear: existingTarget?.baselineYear ?? defaultInd?.baselineYear ?? 2025,
      targetUnit: existingTarget?.targetUnit || defaultInd?.unit || 'unidades',
      targetType: existingTarget?.targetType || defaultInd?.targetType || 'REDUCAO_PERCENTUAL',
      reductionPercentage: existingTarget?.reductionPercentage,
      targetMode: existingTarget?.targetMode || 'NUMERICA',
      limitKind: existingTarget?.limitKind || (defaultInd?.targetDirection === 'MAIOR_MELHOR' ? 'PISO' : 'TETO'),
      percentChange: existingTarget?.percentChange,
      notes: existingTarget?.notes || '',
      reason: existingTarget ? 'Ajuste de meta do indicador' : 'Definição de nova meta vinculada a indicador do PLS',
      isNew: !existingTarget
    });
  };

  const handleIndicatorChangeInModal = (newIndicatorId: string) => {
    const newInd = indicators.find(i => i.id === newIndicatorId);
    if (!newInd || !editingTarget) return;

    const existingTargetForThisInd = targets.find(
      t => t.indicatorId === newInd.id && t.year === editingTarget.year
    );

    setEditingTarget(prev => {
      if (!prev) return null;
      return {
        ...prev,
        indicatorId: newInd.id,
        targetId: existingTargetForThisInd?.id,
        targetUnit: existingTargetForThisInd?.targetUnit || newInd.unit,
        targetType: existingTargetForThisInd?.targetType || newInd.targetType || 'REDUCAO_PERCENTUAL',
        targetValue: existingTargetForThisInd?.targetValue ?? newInd.targetValue2026 ?? 0,
        baselineValue: existingTargetForThisInd?.baselineValue ?? newInd.baselineValue ?? 0,
        baselineYear: existingTargetForThisInd?.baselineYear ?? newInd.baselineYear ?? 2025,
        reductionPercentage: existingTargetForThisInd?.reductionPercentage,
        targetMode: existingTargetForThisInd?.targetMode || 'NUMERICA',
        limitKind: existingTargetForThisInd?.limitKind || (newInd.targetDirection === 'MAIOR_MELHOR' ? 'PISO' : 'TETO'),
        percentChange: existingTargetForThisInd?.percentChange,
        notes: existingTargetForThisInd?.notes || '',
        isNew: !existingTargetForThisInd
      };
    });
  };

  const handleSaveTargetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTarget || !onSaveTarget) return;
    if (editingTarget.targetMode === 'PERCENTUAL') {
      const ind = indicators.find(i => i.id === editingTarget.indicatorId);
      if (!ind || !baselineFor(ind, measurements, editingTarget.baselineYear)) {
        window.alert(`Não há dado do indicador em ${editingTarget.baselineYear} para servir de base. Escolha outro ano-base ou use valor numérico.`);
        return;
      }
      if (editingTarget.percentChange === undefined || isNaN(Number(editingTarget.percentChange))) {
        window.alert('Informe o percentual da meta.');
        return;
      }
    }

    onSaveTarget(
      {
        id: editingTarget.targetId,
        indicatorId: editingTarget.indicatorId,
        year: editingTarget.year,
        targetValue: Number(editingTarget.targetValue),
        baselineValue: Number(editingTarget.baselineValue),
        baselineYear: Number(editingTarget.baselineYear),
        targetUnit: editingTarget.targetUnit,
        targetType: editingTarget.targetType,
        targetMode: editingTarget.targetMode,
        limitKind: editingTarget.limitKind,
        percentChange: editingTarget.targetMode === 'PERCENTUAL' ? Number(editingTarget.percentChange) : undefined,
        notes: editingTarget.notes
      },
      editingTarget.reason || (editingTarget.isNew
        ? 'Definição e vinculação de meta a indicador do PLS.'
        : 'Alteração e repactuação de meta via painel de Metas do PLS.')
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
            <span>PLS Seção Judiciária de Roraima (SJRR · TRF1) · {getPlsCycleForYear(selectedYear).cycleNumber}º Ciclo ({getPlsCycleForYear(selectedYear).cycle})</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Metas do PLS-SJRR & Conformidade Normativa
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhamento das metas quinquenais da SJRR, adaptadas às Resoluções CNJ nº 400/2021, 550/2024, 594/2024 e Nova Lei nº 14.133/2021
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onSaveTarget && (
            <button
              onClick={() => handleOpenNewTarget()}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Meta / Vincular</span>
            </button>
          )}
          <button
            onClick={() => setActiveSubTab('METAS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'METAS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Metas do Ciclo ({targets.length})
          </button>
          <button
            onClick={() => setActiveSubTab('INCONSISTENCIAS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeSubTab === 'INCONSISTENCIAS'
                ? 'bg-emerald-700 text-white shadow-xs'
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
              <p className="mt-1 text-[11px] text-slate-400">Ciclo sexenal SJRR {getPlsCycleForYear(selectedYear).cycle}</p>
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
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="relative w-full lg:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por código, nome ou sigla..."
                className="w-full rounded-xl bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <select
                value={targetScopeFilter}
                onChange={e => setTargetScopeFilter(e.target.value as any)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">Todas as Linhas ({performances.length})</option>
                <option value="WITH_TARGET">Apenas com Meta Fixada ({performances.filter(p => Boolean(p.target || (p.indicator.targetValue2026 ?? 0) > 0 || p.result.targetValue > 0)).length})</option>
                <option value="WITHOUT_TARGET">Sem Meta Fixada ({performances.filter(p => !Boolean(p.target || (p.indicator.targetValue2026 ?? 0) > 0 || p.result.targetValue > 0)).length})</option>
              </select>

              <select
                value={selectedThemeFilter}
                onChange={e => setSelectedThemeFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">Todos os Temas ({themes.length})</option>
                {themes.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.code} — {t.name}
                  </option>
                ))}
              </select>

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

              {onSaveTarget && (
                <button
                  onClick={() => handleOpenNewTarget()}
                  className="rounded-xl px-3 py-2 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar Meta</span>
                </button>
              )}
            </div>
          </div>

          {/* Detailed Targets Cards */}
          <div className="space-y-4">
            {filteredPerformances.map(item => {
              const ind = item.indicator;
              const res = item.result;
              const target = item.target;
              const hasTarget = Boolean(
                target ||
                (ind.targetValue2026 !== undefined && ind.targetValue2026 !== null && ind.targetValue2026 > 0) ||
                (res.targetValue !== undefined && res.targetValue !== null && res.targetValue > 0)
              );
              const effTargetVal = target?.targetValue ?? ind.targetValue2026 ?? res.targetValue ?? 0;
              const isOverBudget = ind.targetDirection === 'MENOR_MELHOR' && res.annualProjection > res.targetValue;

              return (
                <div
                  key={ind.id}
                  className={`rounded-2xl border bg-white p-5 shadow-xs transition-all duration-200 hover:shadow-sm ${
                    !hasTarget
                      ? 'border-slate-200/80 bg-slate-50/30'
                      : res.status === 'RISCO'
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
                        {hasTarget ? (
                          <StatusPill status={res.status} />
                        ) : (
                          <span className="font-semibold text-[10px] bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-md">
                            Sem Meta Fixada
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {hasTarget ? res.statusReason : 'Nenhuma meta do ciclo 2026 vinculada a este indicador.'}
                      </p>

                      {target?.notes && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 w-fit">
                          <Info className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{target.notes}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {hasTarget ? (
                        <>
                          <button
                            onClick={() => handleOpenEdit(ind, target, res)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                            title="Alterar parâmetros da meta ou vincular a outro indicador"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Editar Meta</span>
                          </button>
                          <button
                            onClick={() => {
                              setTargetToDelete({
                                id: target?.id,
                                indicatorId: ind.id,
                                indicatorName: `${ind.code} — ${ind.name}`,
                                year: target?.year || selectedYear,
                                targetValue: effTargetVal,
                                targetUnit: target?.targetUnit || ind.unit
                              });
                              setDeleteReason('');
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                            title="Excluir meta do indicador"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span className="hidden sm:inline">Excluir</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleOpenNewTarget(ind.id)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                          title="Definir e vincular uma meta a este indicador"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Definir Meta</span>
                        </button>
                      )}
                      <button
                        onClick={() => onSelectIndicator(ind)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                      >
                        Ver Detalhes
                      </button>
                      <button
                        onClick={() => onOpenChatWithQuery(`Quanto precisamos economizar para alcançar a meta de ${ind.name}?`)}
                        className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-slate-500" />
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
                        {target ? `${res.targetValue.toLocaleString('pt-BR')} ${ind.unit}` : <span className="font-sans font-normal text-slate-400 text-xs">sem meta definida</span>}
                      </span>
                      {target && (
                        <span className="text-[10px] text-emerald-800/80 block mt-0.5">
                          {describeTarget(target)}
                          {target.targetMode === 'PERCENTUAL' && ` (base ${target.baselineValue.toLocaleString('pt-BR')} ${ind.unit})`}
                        </span>
                      )}
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

      {/* Target Editor Modal com Vínculo de Indicador */}
      {editingTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl p-6 animate-in fade-in duration-150 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 mb-4 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg uppercase tracking-wide">
                    {editingTarget.isNew ? 'Definição de Nova Meta' : 'Repactuação / Edição de Meta'}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Exercício {editingTarget.year}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {editingTarget.isNew
                    ? 'Cadastrar e Vincular Meta a um Indicador'
                    : 'Editar Parâmetros e Vínculo da Meta'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vincule a meta ao indicador correspondente da Resolução CNJ nº 400/2021 e defina valores de base e alvo.
                </p>
              </div>
              <button
                onClick={() => setEditingTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTargetSubmit} className="space-y-4 text-xs">
              {/* SELEÇÃO DO INDICADOR VINCULADO (Requisito Explícito do Usuário) */}
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200/90 space-y-2">
                <label className="block font-bold text-emerald-950 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-emerald-700" />
                    <span>Indicador Específico do PLS Vinculado à Meta *</span>
                  </span>
                  <span className="text-[11px] text-emerald-700 font-normal">
                    {indicators.length} indicadores disponíveis
                  </span>
                </label>

                <select
                  value={editingTarget.indicatorId}
                  onChange={e => handleIndicatorChangeInModal(e.target.value)}
                  className="w-full rounded-xl bg-white border border-emerald-300 p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                  required
                >
                  {themes.map(th => {
                    const thIndicators = th.id === 'theme-1' ? [] : indicators.filter(i => i.themeId === th.id);
                    if (thIndicators.length === 0) return null;
                    return (
                      <optgroup key={th.id} label={`${th.code} — ${th.name}`}>
                        {thIndicators.map(i => (
                          <option key={i.id} value={i.id}>
                            {i.code} — {i.name} {i.acronym ? `(${i.acronym})` : ''} [{i.unit}]
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>

                {(() => {
                  const currentInd = indicators.find(i => i.id === editingTarget.indicatorId);
                  if (!currentInd) return null;
                  const currentTheme = themes.find(t => t.id === currentInd.themeId);

                  return (
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-900">
                      <span className="font-semibold">{currentTheme?.name || 'Tema PLS'}</span>
                      <span>·</span>
                      <span>Unidade: <strong className="font-mono">{currentInd.unit}</strong></span>
                      <span>·</span>
                      <span>Periodicidade: <strong>{currentInd.periodicity}</strong></span>
                      <span>·</span>
                      <span>Direção: {currentInd.targetDirection === 'MENOR_MELHOR' ? 'Redução (Menor é melhor)' : 'Expansão (Maior é melhor)'}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Ano e Valores */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Exercício da Meta *
                  </label>
                  <select
                    value={editingTarget.year}
                    onChange={e => {
                      const newYr = Number(e.target.value);
                      const currentInd = indicators.find(i => i.id === editingTarget.indicatorId);
                      const existingTargetForYr = targets.find(t => t.indicatorId === editingTarget.indicatorId && t.year === newYr);
                      setEditingTarget({
                        ...editingTarget,
                        year: newYr,
                        targetId: existingTargetForYr?.id,
                        targetValue: existingTargetForYr?.targetValue ?? editingTarget.targetValue,
                        baselineValue: existingTargetForYr?.baselineValue ?? editingTarget.baselineValue,
                        isNew: !existingTargetForYr
                      });
                    }}
                    className="w-full rounded-xl bg-slate-50 border border-slate-300 p-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {getSelectableYears([], targets, editingTarget.year).map(y => {
                      const cyc = getPlsCycleForYear(y);
                      return (
                        <option key={y} value={y}>
                          {y} — Ciclo {cyc.cycle} ({cyc.status})
                        </option>
                      );
                    })}
                  </select>
                </div>

              </div>

              {/* Forma da meta: numérica ou percentual sobre o ano-base */}
              {(() => {
                const currentInd = indicators.find(i => i.id === editingTarget.indicatorId);
                const unit = currentInd?.unit || editingTarget.targetUnit;
                const base = currentInd ? baselineFor(currentInd, measurements, editingTarget.baselineYear) : null;
                const pct = editingTarget.percentChange;
                const preview = editingTarget.targetMode === 'PERCENTUAL' && base && pct !== undefined && !isNaN(pct)
                  ? percentTargetValue(base.value, pct)
                  : null;
                const fmt = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
                const rule = PERCENT_RULES.find(r => r.key === ruleKey(editingTarget.limitKind, pct)) || PERCENT_RULES[0];
                const set = (patch: Partial<TargetEditFormState>) => setEditingTarget({ ...editingTarget, ...patch });
                return (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
                    <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Forma da meta">
                      <span className="font-semibold text-slate-700 mr-1">Meta definida por:</span>
                      {(['NUMERICA', 'PERCENTUAL'] as const).map(m => (
                        <button
                          key={m}
                          type="button"
                          role="radio"
                          aria-checked={editingTarget.targetMode === m}
                          onClick={() => set({
                            targetMode: m,
                            percentChange: m === 'PERCENTUAL' ? (pct ?? (editingTarget.limitKind === 'PISO' ? 10 : -10)) : pct
                          })}
                          className={`rounded-lg border px-3 py-1.5 font-semibold ${
                            editingTarget.targetMode === m ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {m === 'NUMERICA' ? 'Valor numérico' : 'Percentual sobre o ano-base'}
                        </button>
                      ))}
                    </div>

                    {editingTarget.targetMode === 'NUMERICA' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block">
                          <span className="block font-semibold text-slate-700 mb-1">Meta para {editingTarget.year} *</span>
                          <span className="relative block">
                            <input
                              type="number"
                              step="any"
                              required
                              value={editingTarget.targetValue}
                              onChange={e => set({ targetValue: Number(e.target.value) })}
                              className="w-full rounded-xl bg-white border border-slate-300 p-2.5 pr-20 font-mono text-xs text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-slate-500">{unit}</span>
                          </span>
                        </label>
                        <label className="block">
                          <span className="block font-semibold text-slate-700 mb-1">A meta é um</span>
                          <select
                            value={editingTarget.limitKind}
                            onChange={e => set({ limitKind: e.target.value as 'TETO' | 'PISO' })}
                            className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="TETO">Teto — o resultado não deve ultrapassar</option>
                            <option value="PISO">Piso — o resultado deve alcançar no mínimo</option>
                          </select>
                        </label>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <label className="block">
                            <span className="block font-semibold text-slate-700 mb-1">Regra</span>
                            <select
                              value={rule.key}
                              onChange={e => {
                                const r = PERCENT_RULES.find(x => x.key === e.target.value)!;
                                set({ limitKind: r.limit, percentChange: r.sign * Math.abs(pct ?? 10) });
                              }}
                              className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                              {PERCENT_RULES.map(r => (
                                <option key={r.key} value={r.key}>{r.label} X% ({r.hint})</option>
                              ))}
                            </select>
                          </label>
                          <label className="block">
                            <span className="block font-semibold text-slate-700 mb-1">Percentual (X) *</span>
                            <span className="relative block">
                              <input
                                type="number"
                                step="any"
                                min={0}
                                max={rule.sign < 0 ? 99.99 : 1000}
                                required
                                value={pct === undefined ? '' : Math.abs(pct)}
                                onChange={e => set({ percentChange: e.target.value === '' ? undefined : rule.sign * Math.abs(Number(e.target.value)) })}
                                className="w-full rounded-xl bg-white border border-slate-300 p-2.5 pr-8 font-mono text-xs text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                              <span className="absolute right-3 top-2.5 text-xs text-slate-500">%</span>
                            </span>
                          </label>
                          <label className="block">
                            <span className="block font-semibold text-slate-700 mb-1">Ano-base</span>
                            <select
                              value={editingTarget.baselineYear}
                              onChange={e => set({ baselineYear: Number(e.target.value) })}
                              className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                              {Array.from({ length: 8 }, (_, i) => editingTarget.year - 1 - i).filter(y => y >= 2021).map(y => (
                                <option key={y} value={y}>{y}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className={`rounded-lg border px-3 py-2 ${base ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`} aria-live="polite">
                          {!base ? (
                            <>Não há dado deste indicador em {editingTarget.baselineYear} para o órgão. Escolha outro ano-base ou use valor numérico.</>
                          ) : (
                            <>
                              Realizado em {editingTarget.baselineYear}: <strong>{fmt(base.value)} {unit}</strong>
                              {currentInd?.periodicity === 'MENSAL' && base.monthsReported < 12 && <span> ({base.monthsReported}/12 meses informados)</span>}
                              {preview !== null && (
                                <> → {editingTarget.limitKind === 'TETO' ? 'teto' : 'piso'} para {editingTarget.year}: <strong>{fmt(preview)} {unit}</strong></>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Memória de Cálculo & Fundamento Normativo
                </label>
                <textarea
                  rows={2}
                  value={editingTarget.notes}
                  onChange={e => setEditingTarget({ ...editingTarget, notes: e.target.value })}
                  placeholder="Ex: Resolução CNJ nº 400/2021: meta fixada pela comissão considerando medidas de eficiência energética e retrofit predial."
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Justificativa da Alteração (para Registro de Auditoria) *</span>
                  <span className="text-[10px] text-slate-400 font-normal">Obrigatório</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingTarget.reason}
                  onChange={e => setEditingTarget({ ...editingTarget, reason: e.target.value })}
                  placeholder="Ex: Repactuação de meta aprovada pela Comissão Gestora do PLS-SJRR em ata formal."
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Ficará gravado de forma rastreável na trilha de auditoria do órgão com usuário, data e hora.
                </span>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-200">
                <div>
                  {(!editingTarget.isNew || editingTarget.targetValue > 0 || targets.some(t => t.indicatorId === editingTarget.indicatorId && t.year === editingTarget.year)) && (
                    <button
                      type="button"
                      onClick={() => {
                        const ind = indicators.find(i => i.id === editingTarget.indicatorId);
                        setTargetToDelete({
                          id: editingTarget.targetId,
                          indicatorId: editingTarget.indicatorId,
                          indicatorName: `${ind?.code || ''} — ${ind?.name || ''}`,
                          year: editingTarget.year,
                          targetValue: editingTarget.targetValue,
                          targetUnit: editingTarget.targetUnit
                        });
                        setDeleteReason('');
                      }}
                      className="rounded-xl px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Excluir Meta</span>
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTarget(null)}
                    className="rounded-xl px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingTarget.isNew ? 'Gravar e Vincular Meta' : 'Salvar Alterações da Meta'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Target Confirmation Modal */}
      {targetToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-rose-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Excluir Meta do Ciclo</h3>
                  <p className="text-xs text-rose-700">Ação irreversível com registro na trilha de auditoria</p>
                </div>
              </div>
              <button
                onClick={() => { setTargetToDelete(null); setDeleteReason(''); }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Indicador</div>
                <div className="font-bold text-slate-900 text-sm">{targetToDelete.indicatorName}</div>
                <div className="flex gap-4 pt-1 text-slate-600 font-medium">
                  <span>Exercício: <strong className="text-slate-900 font-mono">{targetToDelete.year}</strong></span>
                  <span>Meta Atual: <strong className="text-slate-900 font-mono">{targetToDelete.targetValue} {targetToDelete.targetUnit}</strong></span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Justificativa da Exclusão <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  placeholder="Informe o motivo da exclusão desta meta (ex.: exclusão de exigência legal, cancelamento de meta pelo comitê, lançamento indevido)..."
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  A justificativa será arquivada de forma permanente na trilha de auditoria do PLS.
                </span>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setTargetToDelete(null); setDeleteReason(''); }}
                  className="rounded-xl px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!deleteReason.trim()}
                  onClick={() => {
                    if (!deleteReason.trim()) return;
                    onDeleteTarget?.(
                      targetToDelete.id || '',
                      targetToDelete.indicatorId,
                      targetToDelete.year,
                      deleteReason.trim()
                    );
                    setTargetToDelete(null);
                    setDeleteReason('');
                    setEditingTarget(null);
                  }}
                  className={`rounded-xl px-5 py-2 font-bold shadow-xs flex items-center gap-1.5 ${
                    deleteReason.trim()
                      ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                      : 'bg-rose-200 text-rose-400 cursor-not-allowed'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirmar Exclusão</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
