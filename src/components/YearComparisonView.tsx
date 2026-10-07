import React, { useState } from 'react';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Calendar,
  Layers,
  Search
} from 'lucide-react';
import { Indicator, IndicatorMeasurement, PLSTheme } from '../types';

interface YearComparisonViewProps {
  indicators: Indicator[];
  measurements: IndicatorMeasurement[];
  themes: PLSTheme[];
}

export const YearComparisonView: React.FC<YearComparisonViewProps> = ({
  indicators,
  measurements,
  themes
}) => {
  const availableYears = [2026, 2025, 2024, 2023, 2022, 2021];
  const [baseYear, setBaseYear] = useState<number>(2024);
  const [targetYear, setTargetYear] = useState<number>(2025);
  const [selectedTheme, setSelectedTheme] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [periodMode, setPeriodMode] = useState<'SAME_PERIOD' | 'FULL_YEAR'>('SAME_PERIOD');

  // Months to compare (e.g. 1 to 8 if comparing Jan-Aug with 2026, or 1 to 12 for completed years)
  const compareMonths = periodMode === 'FULL_YEAR' && targetYear !== 2026 && baseYear !== 2026
    ? 12
    : (targetYear === 2026 || baseYear === 2026 ? 8 : 12);

  const filteredIndicators = indicators.filter(ind => {
    if (selectedTheme !== 'ALL' && ind.themeId !== selectedTheme) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return ind.name.toLowerCase().includes(q) || ind.code.toLowerCase().includes(q);
    }
    return true;
  });

  const getAccumulatedForYear = (indicatorId: string, year: number, maxMonth: number) => {
    return measurements
      .filter(m => m.indicatorId === indicatorId && m.year === year && m.month <= maxMonth)
      .reduce((sum, item) => sum + item.value, 0);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Análise Histórica & Séries Temporais
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">
            Comparativo Interanual de Indicadores (YoY)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Avaliação comparativa mês a mês e acumulada entre ciclos e exercícios ({baseYear} vs {targetYear}).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setPeriodMode('SAME_PERIOD')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                periodMode === 'SAME_PERIOD' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600'
              }`}
            >
              Mesmo Período ({compareMonths}m)
            </button>
            <button
              onClick={() => setPeriodMode('FULL_YEAR')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                periodMode === 'FULL_YEAR' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600'
              }`}
            >
              Ano Completo (12m)
            </button>
          </div>

          {/* Years Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium">
            <span className="text-slate-500 pl-2">Exercício:</span>
            <select
              value={targetYear}
              onChange={e => setTargetYear(Number(e.target.value))}
              className="bg-white px-2.5 py-1 rounded-md text-xs font-bold text-slate-800 border border-slate-200 focus:outline-none"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>
                  {y} {y === 2026 ? '(Jan–Ago)' : '(Consolidado)'}
                </option>
              ))}
            </select>
            <span className="text-slate-400">vs</span>
            <select
              value={baseYear}
              onChange={e => setBaseYear(Number(e.target.value))}
              className="bg-white px-2.5 py-1 rounded-md text-xs font-bold text-slate-800 border border-slate-200 focus:outline-none"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>
                  {y} {y === 2026 ? '(Jan–Ago)' : '(Consolidado)'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por código ou nome..."
            className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedTheme}
            onChange={e => setSelectedTheme(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium"
          >
            <option value="ALL">Todos os Temas</option>
            {themes.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparison Grid Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <span className="font-bold text-slate-900 text-xs">
            Período Comparado: Janeiro a Agosto ({compareMonths} meses)
          </span>
          <span className="text-xs text-slate-500">
            {filteredIndicators.length} indicadores comparados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Indicador</th>
                <th className="py-3 px-3">Unidade</th>
                <th className="py-3 px-3 text-right">Acumulado {baseYear}</th>
                <th className="py-3 px-3 text-right">Acumulado {targetYear}</th>
                <th className="py-3 px-3 text-right">Variação Absoluta</th>
                <th className="py-3 px-4 text-center">Variação (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredIndicators.map(ind => {
                const valBase = getAccumulatedForYear(ind.id, baseYear, compareMonths);
                const valTarget = getAccumulatedForYear(ind.id, targetYear, compareMonths);
                const absDiff = valTarget - valBase;
                const pctDiff = valBase > 0 ? ((absDiff / valBase) * 100) : 0;

                // Better/Worse determination based on targetDirection
                const isReduction = ind.targetDirection === 'MENOR_MELHOR';
                const isFavorable = isReduction ? absDiff <= 0 : absDiff >= 0;

                return (
                  <tr key={ind.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-sans">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                          {ind.code}
                        </span>
                        <span className="font-semibold text-slate-900">{ind.name}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-500">{ind.unit}</td>

                    <td className="py-3 px-3 text-right text-slate-600 font-semibold">
                      {valBase.toLocaleString('pt-BR')}
                    </td>

                    <td className="py-3 px-3 text-right text-slate-900 font-bold">
                      {valTarget.toLocaleString('pt-BR')}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <span className={absDiff > 0 ? 'text-slate-800' : 'text-slate-600'}>
                        {absDiff > 0 ? `+${absDiff.toLocaleString('pt-BR')}` : absDiff.toLocaleString('pt-BR')}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          isFavorable
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {pctDiff > 0 ? `+${pctDiff.toFixed(1)}%` : `${pctDiff.toFixed(1)}%`}
                        {isFavorable ? (
                          <ArrowDownRight className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3 text-rose-600" />
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
