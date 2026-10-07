import React, { useState } from 'react';
import {
  BarChart3,
  Search,
  Filter,
  Plus,
  Eye,
  FileSpreadsheet,
  Zap,
  Droplet,
  Coffee,
  Fuel,
  PhoneCall,
  Printer,
  Trash2,
  Leaf,
  HeartPulse,
  Code,
  LayoutGrid,
  List,
  Layers,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { Indicator, PLSTheme, IndicatorCalculationResult, IndicatorTarget } from '../types';
import { StatusPill } from './Charts';

interface IndicatorsViewProps {
  indicators: Indicator[];
  themes: PLSTheme[];
  targets: IndicatorTarget[];
  performances: { indicator: Indicator; target?: IndicatorTarget; result: IndicatorCalculationResult }[];
  selectedYear: number;
  onSelectIndicator: (indicator: Indicator) => void;
  onOpenDataIngestion: (indicatorId: string) => void;
  onOpenChatWithQuery: (q: string) => void;
}

export const IndicatorsView: React.FC<IndicatorsViewProps> = ({
  indicators,
  themes,
  targets,
  performances,
  selectedYear,
  onSelectIndicator,
  onOpenDataIngestion,
  onOpenChatWithQuery
}) => {
  const [selectedTheme, setSelectedTheme] = useState<string>('ALL');
  const [selectedPeriodicity, setSelectedPeriodicity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'themes' | 'list'>('themes');

  const getThemeIcon = (themeCode: string) => {
    switch (themeCode) {
      case 'THEME-6':
        return Zap;
      case 'THEME-7':
        return Droplet;
      case 'THEME-8':
        return Trash2;
      case 'THEME-2':
        return Printer;
      case 'THEME-3':
      case 'THEME-4':
        return Coffee;
      case 'THEME-10':
        return Fuel;
      case 'THEME-12':
        return PhoneCall;
      case 'THEME-13':
        return HeartPulse;
      default:
        return Leaf;
    }
  };

  const filteredIndicators = indicators.filter(ind => {
    if (selectedTheme !== 'ALL' && ind.themeId !== selectedTheme) return false;
    if (selectedPeriodicity !== 'ALL' && ind.periodicity !== selectedPeriodicity) return false;

    const perf = performances.find(p => p.indicator.id === ind.id);
    if (selectedStatus !== 'ALL') {
      if (selectedStatus === 'CONFORME' && perf?.result.status !== 'EM_CONFORMIDADE' && perf?.result.status !== 'META_ATINGIDA') {
        return false;
      }
      if (selectedStatus === 'ATENCAO' && perf?.result.status !== 'ATENCAO') return false;
      if (selectedStatus === 'RISCO' && perf?.result.status !== 'RISCO') return false;
      if (selectedStatus === 'SEM_DADOS' && perf?.result.status !== 'SEM_DADOS') return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        ind.name.toLowerCase().includes(q) ||
        ind.code.toLowerCase().includes(q) ||
        (ind.acronym && ind.acronym.toLowerCase().includes(q)) ||
        (ind.cnjIndicatorCode && ind.cnjIndicatorCode.toLowerCase().includes(q)) ||
        (ind.responsibleUnit && ind.responsibleUnit.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* 15. Header da Tela de Indicadores */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-colors">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Resolução CNJ nº 400/2021 & PLS-Jud</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Indicadores do PLS
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoramento de consumo, gastos, índices de eficiência e conformidade normativa
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Alternância Lista ↔ Temas */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80">
            <button
              onClick={() => setViewMode('themes')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === 'themes'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Por Temas</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Lista Geral</span>
            </button>
          </div>

          <button
            onClick={() => onOpenChatWithQuery('Apresente um resumo geral da situação dos indicadores do PLS da SJRR em 2026.')}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Análise Global</span>
          </button>
        </div>
      </div>

      {/* Resumo Rápido em Cards Claros */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total Monitorados</span>
            <span className="flex h-2 w-2 rounded-full bg-slate-400"></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-slate-900">{indicators.length}</span>
            <span className="text-xs text-slate-500">indicadores</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Distribuição nos {themes.length} temas CNJ</p>
        </div>

        <div className="rounded-2xl border border-emerald-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
            <span>Em Conformidade</span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-emerald-700">
              {performances.filter(p => p.result.status === 'EM_CONFORMIDADE' || p.result.status === 'META_ATINGIDA').length}
            </span>
            <span className="text-xs text-emerald-600 font-medium">metas no alvo</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Consumo dentro do planejado</p>
        </div>

        <div className="rounded-2xl border border-amber-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-700 font-medium">
            <span>Em Atenção</span>
            <span className="flex h-2 w-2 rounded-full bg-amber-500"></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-amber-700">
              {performances.filter(p => p.result.status === 'ATENCAO').length}
            </span>
            <span className="text-xs text-amber-600 font-medium">alerta de ritmo</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Exige acompanhamento setorial</p>
        </div>

        <div className="rounded-2xl border border-rose-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-rose-700 font-medium">
            <span>Em Risco</span>
            <span className="flex h-2 w-2 rounded-full bg-rose-500"></span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-rose-700">
              {performances.filter(p => p.result.status === 'RISCO').length}
            </span>
            <span className="text-xs text-rose-600 font-medium">acima do limite</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Demanda plano de contenção</p>
        </div>
      </div>

      {/* Barra de Filtros Modernos */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="relative w-full lg:w-80">
          <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por código, nome ou sigla..."
            className="w-full rounded-xl bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Tema */}
          <select
            value={selectedTheme}
            onChange={e => setSelectedTheme(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Todos os Temas ({themes.length})</option>
            {themes.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Periodicidade */}
          <select
            value={selectedPeriodicity}
            onChange={e => setSelectedPeriodicity(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Periodicidade: Todas</option>
            <option value="MENSAL">Mensal</option>
            <option value="ANUAL">Anual</option>
          </select>

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Status: Todos</option>
            <option value="CONFORME">Em Conformidade</option>
            <option value="ATENCAO">Em Atenção</option>
            <option value="RISCO">Em Risco</option>
            <option value="SEM_DADOS">Sem Dados</option>
          </select>
        </div>
      </div>

      {/* 16. Visualização por Temas */}
      {viewMode === 'themes' && (
        <div className="space-y-6">
          {themes.map(theme => {
            const themeIndicators = filteredIndicators.filter(i => i.themeId === theme.id);
            if (themeIndicators.length === 0 && selectedTheme !== 'ALL') return null;
            if (themeIndicators.length === 0) return null;

            const ThemeIcon = getThemeIcon(theme.code);

            return (
              <div
                key={theme.id}
                className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden transition-colors"
              >
                {/* Theme Header Bar */}
                <div className="border-b border-slate-200/80 bg-white p-4 sm:p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                      <ThemeIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                          {theme.code}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900">
                          {theme.name}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {theme.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-mono font-semibold text-slate-700 border border-slate-200">
                      {themeIndicators.length} indicador{themeIndicators.length > 1 ? 'es' : ''}
                    </span>
                  </div>
                </div>

                {/* Theme Indicators Grid */}
                <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/40">
                  {themeIndicators.map(ind => {
                    const perf = performances.find(p => p.indicator.id === ind.id);
                    const res = perf?.result;

                    return (
                      <div
                        key={ind.id}
                        onClick={() => onSelectIndicator(ind)}
                        className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-xs hover:border-emerald-400/80 hover:shadow-md transition-all duration-150 cursor-pointer"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">
                                {ind.code}
                              </span>
                              {ind.acronym && (
                                <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.5 rounded-md">
                                  {ind.acronym}
                                </span>
                              )}
                              <span className="text-[10px] font-semibold text-slate-400">
                                {ind.periodicity}
                              </span>
                            </div>

                            {res && <StatusPill status={res.status} />}
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 line-clamp-2 group-hover:text-emerald-700 transition-colors">
                            {ind.name}
                          </h4>

                          {/* Data strip */}
                          <div className="mt-3.5 rounded-xl bg-slate-50/80 p-3 text-xs space-y-1.5 border border-slate-100">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">Realizado:</span>
                              <span className="font-mono font-bold text-slate-900 tabular-nums">
                                {res ? `${res.accumulatedValue.toLocaleString('pt-BR')} ${ind.unit}` : '—'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">Meta {selectedYear}:</span>
                              <span className="font-mono font-bold text-emerald-700 tabular-nums">
                                {res ? `${res.targetValue.toLocaleString('pt-BR')} ${ind.unit}` : '—'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div
                          className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs"
                          onClick={e => e.stopPropagation()}
                        >
                          <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                            {ind.responsibleUnit}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onOpenDataIngestion(ind.id)}
                              className="rounded-lg bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                            >
                              + Dado
                            </button>
                            <button
                              onClick={() => onSelectIndicator(ind)}
                              className="rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                            >
                              Ver
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Visualização em Lista Geral / Tabela */}
      {viewMode === 'list' && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-3">Indicador</th>
                  <th className="py-3 px-3">Tema</th>
                  <th className="py-3 px-3">Periodicidade</th>
                  <th className="py-3 px-3 text-right">Realizado</th>
                  <th className="py-3 px-3 text-right">Meta ({selectedYear})</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIndicators.map(ind => {
                  const perf = performances.find(p => p.indicator.id === ind.id);
                  const res = perf?.result;
                  const theme = themes.find(t => t.id === ind.themeId);

                  return (
                    <tr
                      key={ind.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => onSelectIndicator(ind)}
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {ind.code}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          {ind.name}
                          {ind.acronym && (
                            <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1 rounded">
                              {ind.acronym}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">{ind.description}</div>
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        {theme?.name || 'Geral'}
                      </td>

                      <td className="py-3 px-3 text-slate-500 font-medium">
                        {ind.periodicity}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {res ? `${res.accumulatedValue.toLocaleString('pt-BR')} ${ind.unit}` : '—'}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700 tabular-nums">
                        {res ? `${res.targetValue.toLocaleString('pt-BR')} ${ind.unit}` : '—'}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {res && <StatusPill status={res.status} />}
                      </td>

                      <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onSelectIndicator(ind)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold"
                          >
                            Ver
                          </button>
                          <button
                            onClick={() => onOpenDataIngestion(ind.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold"
                          >
                            + Dado
                          </button>
                        </div>
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
