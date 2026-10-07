import React, { useState } from 'react';
import {
  TrendingDown,
  TrendingUp,
  BarChart3,
  LineChart as LineChartIcon,
  Table as TableIcon,
  Sparkles,
  Zap,
  Droplet,
  FileText,
  Trash2,
  CloudFog,
  Car,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Info,
  FileSpreadsheet
} from 'lucide-react';
import { FiveYearIndicatorSeries, HistoricalYearData } from '../types';

interface HistoricalChartsProps {
  seriesList: FiveYearIndicatorSeries[];
  selectedYear?: number;
  onOpenSpreadsheetImport?: () => void;
}

const HISTORICAL_YEARS = [2022, 2023, 2024, 2025, 2026];

export const HistoricalCharts: React.FC<HistoricalChartsProps> = ({
  seriesList,
  selectedYear = 2026,
  onOpenSpreadsheetImport
}) => {
  const [selectedCode, setSelectedCode] = useState<string>('6.1');
  const [viewMode, setViewMode] = useState<'bars' | 'trend' | 'table'>('bars');
  const [activeCategory, setActiveCategory] = useState<'all' | 'energy_water' | 'materials' | 'climate' | 'mobility'>('all');

  const selectedSeries = seriesList.find(s => s.code === selectedCode) || seriesList[0];

  // Primary highlight series for executive KPI pills
  const energySeries = seriesList.find(s => s.code === '6.1');
  const waterSeries = seriesList.find(s => s.code === '7.1');
  const paperSeries = seriesList.find(s => s.code === '2.1');
  const cupsSeries = seriesList.find(s => s.code === '3.1');
  const recyclingSeries = seriesList.find(s => s.code === '8.6');
  const ghgSeries = seriesList.find(s => s.code === '20.4');

  // Filter available series based on category tab
  const filteredSeries = seriesList.filter(s => {
    if (activeCategory === 'energy_water') return ['6.1', '6.2', '7.1', '7.2'].includes(s.code);
    if (activeCategory === 'materials') return ['2.1', '3.1', '5.1', '5.3', '8.6'].includes(s.code);
    if (activeCategory === 'climate') return ['20.1', '20.2', '20.3', '20.4', '16.3'].includes(s.code);
    if (activeCategory === 'mobility') return ['14.1', '12.1', '17.3', '18.3'].includes(s.code);
    return true;
  });

  if (!selectedSeries) return null;

  // Compute maximum value for chart scaling
  const allYearValues = HISTORICAL_YEARS.map(yr => selectedSeries.years[yr]?.total || 0);
  const targetVal = selectedSeries.target2026 || 0;
  const maxValue = Math.max(...allYearValues, targetVal, 1) * 1.15;

  const getIndicatorIcon = (code: string) => {
    switch (code) {
      case '6.1':
      case '6.2':
        return <Zap className="w-4 h-4 text-amber-600" />;
      case '7.1':
      case '7.2':
        return <Droplet className="w-4 h-4 text-sky-600" />;
      case '2.1':
      case '5.1':
      case '5.3':
        return <FileText className="w-4 h-4 text-indigo-600" />;
      case '3.1':
      case '8.6':
        return <Trash2 className="w-4 h-4 text-emerald-600" />;
      case '20.1':
      case '20.2':
      case '20.3':
      case '20.4':
        return <CloudFog className="w-4 h-4 text-teal-600" />;
      case '14.1':
        return <Car className="w-4 h-4 text-orange-600" />;
      case '12.1':
        return <Phone className="w-4 h-4 text-purple-600" />;
      default:
        return <BarChart3 className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 5-Year Executive KPI Snapshot Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Energia */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Energia (5A)</span>
            <Zap className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-extrabold text-slate-900">
              {energySeries?.fiveYearChangePct && energySeries.fiveYearChangePct > 0 ? `+${energySeries.fiveYearChangePct}%` : `${energySeries?.fiveYearChangePct || 0}%`}
            </span>
            <span className="text-[10px] font-semibold text-emerald-700">frente a 2022</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
            Meta 2026: {energySeries?.target2026?.toLocaleString('pt-BR')} kWh
          </div>
        </div>

        {/* Água */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Água (5A)</span>
            <Droplet className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-extrabold text-slate-900">
              {waterSeries?.fiveYearChangePct || 0}%
            </span>
            <span className="text-[10px] font-semibold text-emerald-700">economia</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
            {waterSeries?.years[2026]?.total.toLocaleString('pt-BR')} m³ proj.
          </div>
        </div>

        {/* Papel */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Papel A4 (5A)</span>
            <FileText className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-extrabold text-slate-900">
              {paperSeries?.fiveYearChangePct || 0}%
            </span>
            <span className="text-[10px] font-semibold text-emerald-700">redução</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
            1.120 → {paperSeries?.years[2026]?.total.toLocaleString('pt-BR')} resmas
          </div>
        </div>

        {/* Copos Descartáveis */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Copos Plásticos</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-extrabold text-emerald-800">100%</span>
            <span className="text-[10px] font-bold text-emerald-700">Eliminado</span>
          </div>
          <div className="text-[10px] text-emerald-700 mt-0.5 truncate">
            Zero consumo em 2026
          </div>
        </div>

        {/* Reciclagem */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reciclagem (5A)</span>
            <Trash2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-extrabold text-slate-900">
              +{recyclingSeries?.fiveYearChangePct || 0}%
            </span>
            <span className="text-[10px] font-semibold text-emerald-700">coleta seletiva</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
            Parceria Assoc. Terra Viva
          </div>
        </div>

        {/* Descarbonização GEE */}
        <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">GEE (CNJ 594)</span>
            <CloudFog className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-extrabold text-teal-900">
              {ghgSeries?.fiveYearChangePct || 0}%
            </span>
            <span className="text-[10px] font-bold text-teal-700">tCO2e</span>
          </div>
          <div className="text-[10px] text-teal-700 mt-0.5 truncate">
            158,4 → 102,0 tCO2e
          </div>
        </div>
      </div>

      {/* Main Historical Chart Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
        {/* Controls Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                Série Histórica Quinquenal (2022–2026)
              </span>
              <span className="text-xs text-slate-500">
                Res. CNJ nº 400/2021 & Res. CNJ nº 594/2024
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
              {getIndicatorIcon(selectedSeries.code)}
              <span>{selectedSeries.code} — {selectedSeries.name}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Unidade oficial: <strong className="text-slate-700 font-mono">{selectedSeries.unit}</strong> · Eixo: {selectedSeries.themeName}
            </p>
          </div>

          {/* Controls: Import Button & View Mode Toggle */}
          <div className="flex items-center gap-2 self-start sm:self-auto print:hidden">
            {onOpenSpreadsheetImport && (
              <button
                type="button"
                onClick={onOpenSpreadsheetImport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition-colors shadow-2xs"
                title="Carregar ou atualizar planilha da série histórica"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Importar Planilha</span>
              </button>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                onClick={() => setViewMode('bars')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  viewMode === 'bars'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Barras</span>
              </button>

              <button
                onClick={() => setViewMode('trend')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  viewMode === 'trend'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LineChartIcon className="w-3.5 h-3.5" />
                <span>Evolução</span>
              </button>

              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Tabela</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Indicator Selector Tabs */}
        <div className="flex flex-wrap gap-1.5 pb-2 print:hidden">
          {filteredSeries.map(s => {
            const isSelected = s.code === selectedSeries.code;
            return (
              <button
                key={s.code}
                onClick={() => setSelectedCode(s.code)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="font-mono text-[11px] opacity-90">{s.code}</span> {s.acronym || s.name.split(' ')[0]}
              </button>
            );
          })}
        </div>

        {/* Graphical View: Bars */}
        {viewMode === 'bars' && (
          <div className="space-y-6 pt-2">
            {/* Chart Canvas Area */}
            <div className="h-64 sm:h-72 w-full flex items-end gap-3 sm:gap-6 pt-8 pb-4 px-2 border-b border-slate-200 relative">
              {/* Target Line if present */}
              {targetVal > 0 && (
                <div
                  className="absolute left-0 right-0 border-t-2 border-dashed border-emerald-500 z-10 flex items-center justify-end pr-2 pointer-events-none"
                  style={{ bottom: `${(targetVal / maxValue) * 100}%` }}
                >
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded shadow-xs font-mono">
                    Meta 2026: {targetVal.toLocaleString('pt-BR')} {selectedSeries.unit}
                  </span>
                </div>
              )}

              {HISTORICAL_YEARS.map(yr => {
                const yrData = selectedSeries.years[yr] || { total: 0, monthsReported: 0 };
                const heightPct = Math.min(Math.max((yrData.total / maxValue) * 100, 4), 100);
                const isCurrent = yr === selectedYear;

                return (
                  <div key={yr} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip on Hover */}
                    <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[11px] py-1 px-2.5 rounded-lg pointer-events-none whitespace-nowrap shadow-md z-30 font-mono">
                      <strong>{yr}:</strong> {yrData.total.toLocaleString('pt-BR')} {selectedSeries.unit}
                      {yrData.isProjected && ' (Projeção anualizada)'}
                    </div>

                    {/* Value Badge above Bar */}
                    <span className="text-[11px] font-bold font-mono text-slate-800 mb-1.5 tabular-nums text-center">
                      {yrData.total >= 1000 ? Math.round(yrData.total).toLocaleString('pt-BR') : yrData.total.toLocaleString('pt-BR')}
                    </span>

                    {/* Bar Column */}
                    <div
                      className={`w-full max-w-[64px] rounded-t-xl transition-all duration-300 relative ${
                        isCurrent
                          ? 'bg-gradient-to-t from-emerald-600 to-teal-500 shadow-md shadow-emerald-600/20'
                          : 'bg-gradient-to-t from-slate-400 to-slate-300 hover:from-slate-500 hover:to-slate-400'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    >
                      {/* Projection Diagonal Stripe Pattern for 2026 if partial */}
                      {yrData.isProjected && (
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:12px_12px] rounded-t-xl opacity-60"></div>
                      )}
                    </div>

                    {/* Year Label */}
                    <div className="mt-2.5 text-center">
                      <div className={`text-xs font-bold font-mono ${isCurrent ? 'text-emerald-700' : 'text-slate-700'}`}>
                        {yr}
                      </div>
                      <div className="text-[10px] text-slate-600">
                        {yr === 2026 && yrData.isProjected ? 'Jan-Ago' : 'Auditado'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Analytical Legend & Variances */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className={`p-1.5 rounded-lg ${selectedSeries.direction === 'MELHORA' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {selectedSeries.direction === 'MELHORA' ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Variação Quinquenal (2026 vs 2022)</div>
                  <div className="font-extrabold text-sm text-slate-900 font-mono">
                    {selectedSeries.fiveYearChangePct > 0 ? `+${selectedSeries.fiveYearChangePct}%` : `${selectedSeries.fiveYearChangePct}%`}
                    <span className="text-[11px] font-normal text-slate-500 ml-1">
                      ({selectedSeries.direction === 'MELHORA' ? 'Melhora consistente' : 'Atenção gerencial'})
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="p-1.5 rounded-lg bg-slate-200 text-slate-700 font-bold font-mono text-[10px]">
                  YoY
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Variação Anual (2026 vs 2025)</div>
                  <div className="font-extrabold text-sm text-slate-900 font-mono">
                    {selectedSeries.yoyChangePct > 0 ? `+${selectedSeries.yoyChangePct}%` : `${selectedSeries.yoyChangePct}%`}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Meta Estabelecida (PLS)</div>
                  <div className="font-extrabold text-sm text-slate-900 font-mono">
                    {selectedSeries.target2026 ? `${selectedSeries.target2026.toLocaleString('pt-BR')} ${selectedSeries.unit}` : 'Sem meta numérica'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Graphical View: Trend Curve */}
        {viewMode === 'trend' && (
          <div className="space-y-4 pt-2">
            <div className="h-64 w-full relative flex items-center justify-center p-4">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200">
                {/* Horizontal Grid lines */}
                {[0, 50, 100, 150].map((y, i) => (
                  <line
                    key={i}
                    x1="40"
                    y1={y + 20}
                    x2="480"
                    y2={y + 20}
                    stroke="#e2e8f0"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                ))}

                {/* Line Path */}
                {(() => {
                  const points = HISTORICAL_YEARS.map((yr, idx) => {
                    const x = 50 + idx * 105;
                    const val = selectedSeries.years[yr]?.total || 0;
                    const y = 180 - (val / maxValue) * 160;
                    return { x, y, val, yr };
                  });

                  const pathD = points.reduce((acc, p, i) => {
                    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                  }, '');

                  return (
                    <>
                      {/* Gradient Area under line */}
                      <path
                        d={`${pathD} L ${points[points.length - 1].x} 180 L ${points[0].x} 180 Z`}
                        fill="url(#trendGradient)"
                        opacity="0.15"
                      />

                      {/* Main Trend Line */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#059669"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Points Circles */}
                      {points.map((p, i) => (
                        <g key={i}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="5"
                            fill="#ffffff"
                            stroke="#059669"
                            strokeWidth="3"
                          />
                          <text
                            x={p.x}
                            y={p.y - 10}
                            textAnchor="middle"
                            className="text-[10px] font-bold font-mono fill-slate-800"
                          >
                            {Math.round(p.val).toLocaleString('pt-BR')}
                          </text>
                          <text
                            x={p.x}
                            y="196"
                            textAnchor="middle"
                            className="text-[11px] font-bold font-mono fill-slate-600"
                          >
                            {p.yr}
                          </text>
                        </g>
                      ))}

                      <defs>
                        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#ffffff" />
                        </linearGradient>
                      </defs>
                    </>
                  );
                })()}
              </svg>
            </div>
            <p className="text-center text-xs text-slate-500 italic">
              Trajetória quinquenal contínua dos dados consolidados (2022 a 2026) da Justiça Federal — SJRR.
            </p>
          </div>
        )}

        {/* Tabular View */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Exercício</th>
                  <th className="py-2.5 px-3 text-right">Consolidado Total</th>
                  <th className="py-2.5 px-3 text-right">Média Mensal</th>
                  <th className="py-2.5 px-3 text-center">Competências</th>
                  <th className="py-2.5 px-3 text-right">Meta Prevista</th>
                  <th className="py-2.5 px-3 text-right">Desvio vs 2022</th>
                  <th className="py-2.5 px-3 text-center">Auditoria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {HISTORICAL_YEARS.map(yr => {
                  const yrData = selectedSeries.years[yr] || { total: 0, monthsReported: 0 };
                  const val2022 = selectedSeries.years[2022]?.total || 1;
                  const varFrom2022 = (((yrData.total - val2022) / val2022) * 100).toFixed(1);

                  return (
                    <tr key={yr} className={yr === selectedYear ? 'bg-emerald-50/40 font-bold' : ''}>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{yr}</td>
                      <td className="py-2.5 px-3 text-right text-slate-900 tabular-nums">
                        {yrData.total.toLocaleString('pt-BR')} {selectedSeries.unit}
                        {yrData.isProjected && <span className="text-[10px] text-emerald-700 ml-1 font-sans">(proj.)</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums">
                        {yrData.monthlyAverage ? `${yrData.monthlyAverage.toLocaleString('pt-BR')} ${selectedSeries.unit}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600">
                        {yrData.monthsReported} meses
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 tabular-nums">
                        {yrData.target ? `${yrData.target.toLocaleString('pt-BR')} ${selectedSeries.unit}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold tabular-nums">
                        {yr === 2022 ? (
                          <span className="text-slate-600">Linha Base</span>
                        ) : (
                          <span className={Number(varFrom2022) <= 0 ? 'text-emerald-700' : 'text-amber-700'}>
                            {Number(varFrom2022) > 0 ? `+${varFrom2022}%` : `${varFrom2022}%`}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Auditado</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footnote on 2026 data */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 text-[11px] text-slate-600 border border-slate-200">
          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <p>
            <strong>Metodologia Quinquenal Auditada:</strong> Os valores de 2022 a 2025 correspondem aos fechamentos anuais homologados nos relatórios do PLS. O exercício de 2026 considera os 8 meses apurados (Jan a Ago) com projeção anualizada de encerramento de ciclo, incorporando a anomalia verificada na competência de agosto/2026 e o atesto dos fiscais técnicos.
          </p>
        </div>
      </div>
    </div>
  );
};
