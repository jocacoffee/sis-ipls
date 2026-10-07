import React, { useState } from 'react';
import { MONTH_SHORT_NAMES, MONTH_NAMES } from '../services/calculationEngine';
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Gauge,
  Zap,
  Fuel,
  Navigation,
  LineChart,
  Table as TableIcon,
  Droplet,
  FileText,
  Sparkles,
  ArrowUp,
  ArrowDown,
  GripVertical
} from 'lucide-react';

// =========================================================================
// 1. Gráfico de Consumo Mês a Mês com Sombra & Gradiente Degradê Sob a Linha
// =========================================================================

interface MonthlyConsumptionChartProps {
  title: string;
  code?: string;
  unit: string;
  data2025: (number | null)[];
  data2026: (number | null)[];
  currentYear?: number;
  previousYear?: number;
  monthlyTarget?: number;
  annualTarget?: number;
  height?: number;
  icon?: React.ReactNode;
  primaryColor?: 'emerald' | 'amber' | 'blue' | 'purple' | 'orange' | 'cyan';
  invertGoodDirection?: boolean; // true = lower is better (default for consumption)
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  cardNumber?: number;
  totalCards?: number;
  onMoveToTop?: () => void;
  onMoveToBottom?: () => void;
}

export const MonthlyConsumptionLineChart: React.FC<MonthlyConsumptionChartProps> = ({
  title,
  code,
  unit,
  data2025,
  data2026,
  currentYear = 2026,
  previousYear = 2025,
  monthlyTarget,
  annualTarget,
  height = 285,
  icon,
  primaryColor = 'emerald',
  invertGoodDirection = true,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
  cardNumber,
  totalCards,
  onMoveToTop,
  onMoveToBottom
}) => {
  const [viewMode, setViewMode] = useState<'LINES' | 'TABLE'>('LINES');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [show2025, setShow2025] = useState<boolean>(true);

  // Generate deterministic ID for SVG gradients/filters
  const safeId = code ? code.replace(/[^a-zA-Z0-9]/g, '-') : 'ind';
  const gradientId = `grad-${safeId}`;

  // Identify reported months
  const valid2026 = data2026.filter((v): v is number => v !== null);
  const reportedCount = valid2026.length; // e.g. 8 for 2026, or 12 for 2021-2025
  const currentMonthIdx = reportedCount > 0 ? reportedCount - 1 : 0;
  const acc2026 = valid2026.reduce((a, b) => a + b, 0);

  // Monthly average of reported months to drive the projected line
  const recentMonthlyPace = reportedCount > 0 ? acc2026 / reportedCount : 0;

  // Build projected series for remaining months if year is not complete
  const projectedValues: (number | null)[] = Array(12).fill(null);
  if (reportedCount > 0 && reportedCount < 12) {
    projectedValues[currentMonthIdx] = data2026[currentMonthIdx];
    for (let i = reportedCount; i < 12; i++) {
      projectedValues[i] = Math.round(recentMonthlyPace);
    }
  }

  // 2025 comparisons
  const valid2025SamePeriod = data2025.slice(0, reportedCount).filter((v): v is number => v !== null);
  const acc2025SamePeriod = valid2025SamePeriod.reduce((a, b) => a + b, 0);

  const deltaPercent = acc2025SamePeriod > 0
    ? ((acc2026 - acc2025SamePeriod) / acc2025SamePeriod) * 100
    : 0;

  const isFavorable = invertGoodDirection ? deltaPercent <= 0 : deltaPercent >= 0;

  // Maximum value for SVG scaling
  const allValues = [
    ...(show2025 ? data2025.filter((v): v is number => v !== null) : []),
    ...valid2026,
    ...projectedValues.filter((v): v is number => v !== null),
    monthlyTarget || 0
  ];
  const maxVal = Math.max(...allValues, 10) * 1.18;

  const width = 640;
  const paddingX = 48;
  const paddingY = 32;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  const getX = (idx: number) => paddingX + (idx / 11) * chartW;
  const getY = (val: number) => height - paddingY - (val / maxVal) * chartH;

  // Path 1: 2025 (Ano Anterior)
  const points2025 = data2025
    .map((v, i) => (v !== null ? `${getX(i)},${getY(v)}` : null))
    .filter(Boolean);
  const path2025 = points2025.length > 0 ? `M ${points2025.join(' L ')}` : '';

  // Path 2: Linha Contínua até o mês atual (Jan-Ago)
  const pointsActual = data2026
    .map((v, i) => (v !== null ? `${getX(i)},${getY(v)}` : null))
    .filter(Boolean);
  const pathActual = pointsActual.length > 0 ? `M ${pointsActual.join(' L ')}` : '';

  // SOMBRA / GRADIENTE DEGRADÊ SOB A LINHA CONTÍNUA
  const areaActualPath = pointsActual.length > 0
    ? `M ${getX(0)},${height - paddingY} L ${pointsActual.join(' L ')} L ${getX(currentMonthIdx)},${height - paddingY} Z`
    : '';

  // Path 3: Linha Pontilhada de Projeção (Ago-Dez)
  const pointsProjected: string[] = [];
  for (let i = currentMonthIdx; i < 12; i++) {
    const val = projectedValues[i];
    if (val !== null) {
      pointsProjected.push(`${getX(i)},${getY(val)}`);
    }
  }
  const pathProjected = pointsProjected.length > 0 ? `M ${pointsProjected.join(' L ')}` : '';

  // SOMBRA / GRADIENTE DEGRADÊ SOB A LINHA PONTILHADA
  const areaProjectedPath = pointsProjected.length > 0
    ? `M ${getX(currentMonthIdx)},${height - paddingY} L ${pointsProjected.join(' L ')} L ${getX(11)},${height - paddingY} Z`
    : '';

  // Theme styling colors
  const colorMap = {
    emerald: {
      line: '#059669',
      proj: '#10b981',
      point: '#059669',
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200'
    },
    amber: {
      line: '#d97706',
      proj: '#f59e0b',
      point: '#d97706',
      badge: 'bg-amber-50 text-amber-800 border-amber-200'
    },
    blue: {
      line: '#2563eb',
      proj: '#60a5fa',
      point: '#2563eb',
      badge: 'bg-blue-50 text-blue-800 border-blue-200'
    },
    purple: {
      line: '#7c3aed',
      proj: '#a78bfa',
      point: '#7c3aed',
      badge: 'bg-purple-50 text-purple-800 border-purple-200'
    },
    orange: {
      line: '#ea580c',
      proj: '#fb923c',
      point: '#ea580c',
      badge: 'bg-orange-50 text-orange-800 border-orange-200'
    },
    cyan: {
      line: '#0891b2',
      proj: '#38bdf8',
      point: '#0891b2',
      badge: 'bg-cyan-50 text-cyan-800 border-cyan-200'
    }
  };

  const themeColors = colorMap[primaryColor] || colorMap.emerald;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
      <div>
        {/* Header with Title, Code & Action Controls */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            {icon && (
              <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 flex-shrink-0">
                {icon}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                {code && (
                  <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                    {code}
                  </span>
                )}
                <h4 className="text-base font-bold text-slate-900">{title}</h4>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Consumo Mês a Mês • Unidade: <strong className="text-slate-700">{unit}</strong>
              </div>
            </div>
          </div>

          {/* Controls: Delta badge, Year toggle, View switcher */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Delta vs previous year */}
            <div
              className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md ${
                isFavorable ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
              }`}
            >
              {isFavorable ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
              <span>{deltaPercent > 0 ? `+${deltaPercent.toFixed(1)}%` : `${deltaPercent.toFixed(1)}%`} vs {previousYear}</span>
            </div>

            {/* Toggle Previous Year */}
            <button
              onClick={() => setShow2025(!show2025)}
              className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                show2025
                  ? 'bg-slate-100 border-slate-300 text-slate-800 font-semibold'
                  : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
              }`}
              title={`Exibir ou ocultar linha de referência de ${previousYear}`}
            >
              {show2025 ? `${previousYear} Ativo` : `+ Ver ${previousYear}`}
            </button>

            {/* View Mode: Lines vs Table */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('LINES')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'LINES' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Gráfico de Linha"
              >
                <LineChart className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('TABLE')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'TABLE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tabela de Dados Mês a Mês"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Clean Metric Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 px-3.5 py-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
          <div>
            <span className="text-[11px] text-slate-500 block">
              {reportedCount === 12
                ? `Total Consolidado (${currentYear})`
                : `Realizado Jan–${MONTH_SHORT_NAMES[currentMonthIdx]} (${currentYear})`}
            </span>
            <span className="font-mono text-sm font-bold text-slate-900">
              {Math.round(acc2026).toLocaleString('pt-BR')} <span className="text-[11px] font-normal text-slate-500">{unit}</span>
            </span>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div>
            <span className="text-[11px] text-slate-500 block">Média Mensal</span>
            <span className="font-mono text-sm font-semibold text-slate-700">
              {Math.round(recentMonthlyPace).toLocaleString('pt-BR')} <span className="text-[11px] font-normal text-slate-400">{unit}/mês</span>
            </span>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div>
            <span className="text-[11px] text-slate-500 block">Meta Mensal</span>
            <span className="font-mono text-sm font-semibold text-emerald-700">
              {monthlyTarget ? monthlyTarget.toLocaleString('pt-BR') : '—'} <span className="text-[11px] font-normal text-slate-400">{unit}</span>
            </span>
          </div>

          {reportedCount < 12 && (
            <>
              <div className="h-6 w-px bg-slate-200 hidden md:block" />
              <div className="hidden md:block">
                <span className="text-[11px] text-slate-500 block">Projeção Anual</span>
                <span className="font-mono text-sm font-bold text-indigo-700">
                  {Math.round(acc2026 + recentMonthlyPace * (12 - reportedCount)).toLocaleString('pt-BR')}{' '}
                  <span className="text-[11px] font-normal text-slate-400">{unit}</span>
                </span>
              </div>
            </>
          )}
        </div>

        {/* MODE 1: CONTINUOUS LINE + GRADIENT SHADOW + DOTTED PROJECTION */}
        {viewMode === 'LINES' && (
          <div className="relative overflow-hidden">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
              <defs>
                {/* 1. Sombra / Gradiente Degradê sob a Linha Contínua (Enriquecido para não ficar vazio) */}
                <linearGradient id={`grad-actual-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={themeColors.line} stopOpacity="0.45" />
                  <stop offset="30%" stopColor={themeColors.line} stopOpacity="0.25" />
                  <stop offset="70%" stopColor={themeColors.line} stopOpacity="0.08" />
                  <stop offset="100%" stopColor={themeColors.line} stopOpacity="0.01" />
                </linearGradient>

                {/* 2. Sombra / Gradiente Degradê Suave sob a Projeção */}
                <linearGradient id={`grad-proj-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={themeColors.proj} stopOpacity="0.25" />
                  <stop offset="45%" stopColor={themeColors.proj} stopOpacity="0.10" />
                  <stop offset="85%" stopColor={themeColors.proj} stopOpacity="0.03" />
                  <stop offset="100%" stopColor={themeColors.proj} stopOpacity="0.00" />
                </linearGradient>

                {/* 3. Filtro de Sombra Suave (Drop Shadow) para a Linha */}
                <filter id={`shadow-${gradientId}`} x="-5%" y="-20%" width="110%" height="150%">
                  <feDropShadow dx="0" dy="5" stdDeviation="4.5" floodColor={themeColors.line} floodOpacity="0.42" />
                </filter>
              </defs>

              {/* Grid horizontal lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const y = height - paddingY - ratio * chartH;
                const val = Math.round(ratio * maxVal);
                return (
                  <g key={i}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={width - paddingX}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingX - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="text-[10px] fill-slate-400 font-mono"
                    >
                      {val.toLocaleString('pt-BR')}
                    </text>
                  </g>
                );
              })}

              {/* SOMBRA / PREENCHIMENTO DEGRADÊ SOB A LINHA CONTÍNUA */}
              {areaActualPath && (
                <path
                  d={areaActualPath}
                  fill={`url(#grad-actual-${gradientId})`}
                  className="transition-all duration-500"
                />
              )}

              {/* SOMBRA / PREENCHIMENTO SOB A LINHA DE PROJEÇÃO */}
              {areaProjectedPath && (
                <path
                  d={areaProjectedPath}
                  fill={`url(#grad-proj-${gradientId})`}
                  className="transition-all duration-500"
                />
              )}

              {/* Monthly Target horizontal dashed line */}
              {monthlyTarget && (
                <g>
                  <line
                    x1={paddingX}
                    y1={getY(monthlyTarget)}
                    x2={width - paddingX}
                    y2={getY(monthlyTarget)}
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={width - paddingX - 4}
                    y={getY(monthlyTarget) - 4}
                    textAnchor="end"
                    className="text-[9px] fill-amber-700 font-bold"
                  >
                    Meta Mensal: {monthlyTarget.toLocaleString('pt-BR')} {unit}
                  </text>
                </g>
              )}

              {/* 2025 Line (Ano Anterior) */}
              {show2025 && path2025 && (
                <path
                  d={path2025}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="2"
                  strokeDasharray="3 3"
                />
              )}

              {/* 1. LINHA CONTÍNUA ATÉ O MÊS ATUAL (Janeiro a Agosto) COM SOMBRA */}
              {pathActual && (
                <path
                  d={pathActual}
                  fill="none"
                  stroke={themeColors.line}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter={`url(#shadow-${gradientId})`}
                />
              )}

              {/* 2. LINHA PONTILHADA DE PROJEÇÃO (Agosto a Dezembro) */}
              {pathProjected && (
                <path
                  d={pathProjected}
                  fill="none"
                  stroke={themeColors.proj}
                  strokeWidth="2.75"
                  strokeDasharray="5 5"
                  strokeLinecap="round"
                />
              )}

              {/* Points for 2025 if hovered */}
              {show2025 && hoveredIdx !== null && data2025[hoveredIdx] !== null && (
                <circle
                  cx={getX(hoveredIdx)}
                  cy={getY(data2025[hoveredIdx]!)}
                  r={4}
                  fill="#94a3b8"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              )}

              {/* Solid Points for Realized Months (Jan to Ago) */}
              {data2026.map((val, idx) => {
                if (val === null) return null;
                const x = getX(idx);
                const y = getY(val);
                const isHovered = hoveredIdx === idx;
                const isCurrentMonth = idx === currentMonthIdx;
                const isAnomaly = monthlyTarget && val > monthlyTarget * 1.25;

                return (
                  <g
                    key={`actual-${idx}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? 6.5 : isCurrentMonth ? 5.5 : 4.5}
                      fill={isAnomaly ? '#ef4444' : themeColors.point}
                      stroke="#ffffff"
                      strokeWidth="2.5"
                    />

                    {isCurrentMonth && !isHovered && (
                      <circle cx={x} cy={y} r={9} fill="none" stroke={themeColors.point} strokeWidth="1.5" opacity="0.6" />
                    )}

                    {isAnomaly && !isHovered && (
                      <circle cx={x} cy={y} r={9} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2 2" />
                    )}
                  </g>
                );
              })}

              {/* Hollow / Dotted Points for Projected Months (Set to Dez) */}
              {projectedValues.map((val, idx) => {
                if (val === null || idx <= currentMonthIdx) return null;
                const x = getX(idx);
                const y = getY(val);
                const isHovered = hoveredIdx === idx;

                return (
                  <g
                    key={`proj-${idx}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? 6 : 4}
                      fill="#ffffff"
                      stroke={themeColors.proj}
                      strokeWidth="2"
                      strokeDasharray="2 2"
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={2}
                      fill={themeColors.proj}
                    />
                  </g>
                );
              })}

              {/* Hover Tooltip Overlay */}
              {hoveredIdx !== null && (
                <g pointerEvents="none">
                  {(() => {
                    const idx = hoveredIdx;
                    const isPast = idx <= currentMonthIdx;
                    const v26 = isPast ? data2026[idx] : projectedValues[idx];
                    const v25 = data2025[idx];
                    const tooltipX = Math.min(Math.max(getX(idx), 85), width - 85);
                    const mDelta = isPast && v26 !== null && v25 !== null && v25 > 0 ? ((v26 - v25) / v25) * 100 : null;

                    return (
                      <g>
                        <rect
                          x={tooltipX - 80}
                          y={paddingY - 26}
                          width="160"
                          height="52"
                          rx="8"
                          fill="#0f172a"
                          opacity="0.96"
                        />
                        <text
                          x={tooltipX}
                          y={paddingY - 9}
                          textAnchor="middle"
                          fill="#ffffff"
                          className="text-[11px] font-bold font-mono"
                        >
                          {MONTH_NAMES[idx]}: {v26 !== null ? `${v26.toLocaleString('pt-BR')} ${unit}` : 'Pendente'}
                        </text>
                        <text
                          x={tooltipX}
                          y={paddingY + 6}
                          textAnchor="middle"
                          fill={isPast ? '#94a3b8' : '#38bdf8'}
                          className="text-[10px] font-mono"
                        >
                          {isPast
                            ? `${previousYear}: ${v25 !== null ? `${v25.toLocaleString('pt-BR')} ${unit}` : 'N/D'}${mDelta !== null ? ` (${mDelta > 0 ? `+${mDelta.toFixed(1)}%` : `${mDelta.toFixed(1)}%`})` : ''}`
                            : `Projeção Estimada`}
                        </text>
                        <text
                          x={tooltipX}
                          y={paddingY + 18}
                          textAnchor="middle"
                          fill="#f59e0b"
                          className="text-[9px] font-mono"
                        >
                          Meta: {monthlyTarget ? `${monthlyTarget.toLocaleString('pt-BR')} ${unit}` : 'N/D'}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}

              {/* X axis labels (Months) */}
              {MONTH_SHORT_NAMES.map((m, idx) => {
                const isPast = idx <= currentMonthIdx;
                return (
                  <text
                    key={m}
                    x={getX(idx)}
                    y={height - 10}
                    textAnchor="middle"
                    className={`text-[10px] ${
                      isPast
                        ? 'fill-slate-900 font-bold'
                        : 'fill-slate-400 font-medium'
                    }`}
                  >
                    {m}
                  </text>
                );
              })}
            </svg>
          </div>
        )}

        {/* MODE 2: TABLE MÊS A MÊS */}
        {viewMode === 'TABLE' && (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Mês</th>
                  <th className="py-2.5 px-3 text-right">{previousYear} (Consolidado)</th>
                  <th className="py-2.5 px-3 text-right">{currentYear} (Realizado / Projeção)</th>
                  <th className="py-2.5 px-3 text-right">Meta Mensal</th>
                  <th className="py-2.5 px-3 text-right">Variação vs {previousYear}</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {MONTH_NAMES.map((name, idx) => {
                  const isPast = idx <= currentMonthIdx;
                  const v25 = data2025[idx];
                  const v26 = isPast ? data2026[idx] : projectedValues[idx];
                  const delta = isPast && v26 !== null && v25 !== null && v25 > 0 ? ((v26 - v25) / v25) * 100 : null;

                  return (
                    <tr key={name} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 font-semibold text-slate-800">{name}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">
                        {v25 !== null ? `${v25.toLocaleString('pt-BR')} ${unit}` : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {v26 !== null ? `${v26.toLocaleString('pt-BR')} ${unit}` : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-amber-700">
                        {monthlyTarget ? `${monthlyTarget.toLocaleString('pt-BR')} ${unit}` : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">
                        {delta !== null ? (
                          <span className={delta <= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                            {delta > 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {isPast ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                            Realizado (Atestado)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                            🔮 Projeção Estimada
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-600 pt-3 border-t border-slate-100 mt-2">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-1 rounded-full shadow-xs" style={{ backgroundColor: themeColors.line }}></span>
            <span className="font-bold text-slate-900">
              Linha Contínua + Sombra: Realizado {reportedCount === 12 ? 'Jan–Dez (Consolidado)' : `até ${MONTH_NAMES[currentMonthIdx]}`}
            </span>
          </div>

          {reportedCount < 12 && (
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 border-t-2 border-dashed" style={{ borderColor: themeColors.proj }}></span>
              <span className="font-semibold text-indigo-700">
                Linha Pontilhada: Projeção ({reportedCount < 11 ? `${MONTH_SHORT_NAMES[reportedCount]}–Dez` : 'Dez'})
              </span>
            </div>
          )}

          {show2025 && (
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-t border-dashed border-slate-400"></span>
              <span className="text-slate-500">{previousYear} (Ano Anterior)</span>
            </div>
          )}

          {monthlyTarget && (
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-amber-500"></span>
              <span className="text-amber-700 font-medium">Meta Mensal</span>
            </div>
          )}
        </div>

        <div className="text-slate-400 font-mono text-[10px]">
          {reportedCount} meses consolidados{reportedCount < 12 ? ` • ${12 - reportedCount} meses projetados` : ' • Exercício integral'}
        </div>
      </div>
    </div>
  );
};

// Aliases for compatibility
export const MonthlyConsumptionBarChart = MonthlyConsumptionLineChart;
export const TrendLineChart = MonthlyConsumptionLineChart;

// =========================================================================
// 2. Trajetória de Alcance (Burn-up / Forecast vs Meta Anual)
// =========================================================================

interface TrajectoryForecastProps {
  title: string;
  indicatorCode: string;
  unit: string;
  monthlyActual2026: (number | null)[];
  annualTarget: number;
  height?: number;
}

export const TrajectoryForecastChart: React.FC<TrajectoryForecastProps> = ({
  title,
  indicatorCode,
  unit,
  monthlyActual2026,
  annualTarget,
  height = 270
}) => {
  const reportedMonths = monthlyActual2026.filter((v): v is number => v !== null);
  const reportedCount = reportedMonths.length;
  const remainingMonths = 12 - reportedCount;

  let accumulatedSum = 0;
  const accumulatedSeries: (number | null)[] = [];
  monthlyActual2026.forEach(val => {
    if (val !== null) {
      accumulatedSum += val;
      accumulatedSeries.push(accumulatedSum);
    } else {
      accumulatedSeries.push(null);
    }
  });

  const currentAccumulated = accumulatedSum;
  const recentMonthlyAvg = reportedCount > 0 ? accumulatedSum / reportedCount : 0;
  const annualProjection = recentMonthlyAvg * 12;

  const remainingBudget = Math.max(0, annualTarget - currentAccumulated);
  const maxAllowedRunRate = remainingMonths > 0 ? remainingBudget / remainingMonths : 0;
  const cutRequired = Math.max(0, recentMonthlyAvg - maxAllowedRunRate);
  const cutPercentage = recentMonthlyAvg > 0 ? (cutRequired / recentMonthlyAvg) * 100 : 0;

  const forecastSeries: (number | null)[] = Array(12).fill(null);
  let forecastAcc = currentAccumulated;
  forecastSeries[reportedCount - 1] = currentAccumulated;
  for (let i = reportedCount; i < 12; i++) {
    forecastAcc += recentMonthlyAvg;
    forecastSeries[i] = Math.round(forecastAcc);
  }

  const requiredRunwaySeries: (number | null)[] = Array(12).fill(null);
  let targetRunwayAcc = currentAccumulated;
  requiredRunwaySeries[reportedCount - 1] = currentAccumulated;
  for (let i = reportedCount; i < 12; i++) {
    targetRunwayAcc += maxAllowedRunRate;
    requiredRunwaySeries[i] = Math.round(targetRunwayAcc);
  }

  const maxScale = Math.max(annualTarget, annualProjection, currentAccumulated) * 1.15;
  const width = 640;
  const paddingX = 50;
  const paddingY = 32;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  const getX = (idx: number) => paddingX + (idx / 11) * chartW;
  const getY = (val: number) => height - paddingY - (val / maxScale) * chartH;

  const actualPoints = accumulatedSeries
    .map((v, i) => (v !== null ? `${getX(i)},${getY(v)}` : null))
    .filter(Boolean);
  const actualPath = actualPoints.length > 0 ? `M ${actualPoints.join(' L ')}` : '';
  const actualAreaPath = actualPoints.length > 0
    ? `M ${getX(0)},${height - paddingY} L ${actualPoints.join(' L ')} L ${getX(reportedCount - 1)},${height - paddingY} Z`
    : '';

  const forecastPoints = forecastSeries
    .map((v, i) => (v !== null ? `${getX(i)},${getY(v)}` : null))
    .filter(Boolean);
  const forecastPath = forecastPoints.length > 0 ? `M ${forecastPoints.join(' L ')}` : '';

  const runwayPoints = requiredRunwaySeries
    .map((v, i) => (v !== null ? `${getX(i)},${getY(v)}` : null))
    .filter(Boolean);
  const runwayPath = runwayPoints.length > 0 ? `M ${runwayPoints.join(' L ')}` : '';

  const isAtRisk = annualProjection > annualTarget;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
              {indicatorCode}
            </span>
            <h4 className="text-base font-bold text-slate-900">{title}</h4>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Acumulado Jan-Ago vs Meta Homologada e Projeção até o Encerramento de 2026.
          </p>
        </div>

        <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto ${
          isAtRisk
            ? 'bg-rose-50 text-rose-700 border border-rose-200'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        }`}>
          {isAtRisk ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          <span>{isAtRisk ? 'Tendência de Exceder a Meta' : 'Em Trajetória de Cumprimento'}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
        <div>
          <span className="text-[11px] text-slate-500 block">Acumulado Jan-Ago</span>
          <span className="font-mono text-base font-bold text-slate-900">
            {currentAccumulated.toLocaleString('pt-BR')} <span className="text-[11px] font-normal text-slate-500">{unit}</span>
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {Math.round((currentAccumulated / annualTarget) * 100)}% da meta consumida
          </span>
        </div>

        <div>
          <span className="text-[11px] text-slate-500 block">Meta Anual (Teto)</span>
          <span className="font-mono text-base font-bold text-indigo-700">
            {annualTarget.toLocaleString('pt-BR')} <span className="text-[11px] font-normal text-indigo-500">{unit}</span>
          </span>
          <span className="text-[10px] text-indigo-600 block mt-0.5">
            Saldo: {remainingBudget.toLocaleString('pt-BR')} {unit}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-slate-500 block">Projeção Linear Anual</span>
          <span className={`font-mono text-base font-bold ${isAtRisk ? 'text-rose-600' : 'text-emerald-700'}`}>
            {Math.round(annualProjection).toLocaleString('pt-BR')} <span className="text-[11px] font-normal text-slate-500">{unit}</span>
          </span>
          <span className={`text-[10px] block mt-0.5 font-semibold ${isAtRisk ? 'text-rose-600' : 'text-emerald-600'}`}>
            {isAtRisk
              ? `+${Math.round(annualProjection - annualTarget).toLocaleString('pt-BR')} ${unit} (+${Math.round(((annualProjection - annualTarget) / annualTarget) * 100)}%)`
              : 'Dentro da margem segura'}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-slate-500 block">Teto Mensal Set–Dez</span>
          <span className="font-mono text-base font-bold text-amber-700">
            {Math.round(maxAllowedRunRate).toLocaleString('pt-BR')} <span className="text-[11px] font-normal text-amber-600">{unit}/mês</span>
          </span>
          <span className="text-[10px] text-amber-800 block mt-0.5">
            {isAtRisk ? `Exige corte de ${Math.round(cutPercentage)}% no ritmo` : 'Ritmo atual sustentável'}
          </span>
        </div>
      </div>

      <div className="relative overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          <defs>
            <linearGradient id="grad-trajectory-actual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.32" />
              <stop offset="50%" stopColor="#4f46e5" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.01" />
            </linearGradient>
            <filter id="shadow-trajectory" x="-5%" y="-20%" width="110%" height="150%">
              <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.30" />
            </filter>
          </defs>

          {/* Sombra / Gradiente sob a Curva Realizada */}
          {actualAreaPath && (
            <path d={actualAreaPath} fill="url(#grad-trajectory-actual)" />
          )}

          {/* Target line */}
          <line
            x1={paddingX}
            y1={getY(annualTarget)}
            x2={width - paddingX}
            y2={getY(annualTarget)}
            stroke="#6366f1"
            strokeWidth="2"
            strokeDasharray="5 5"
          />
          <text
            x={width - paddingX - 4}
            y={getY(annualTarget) - 6}
            textAnchor="end"
            className="text-[10px] fill-indigo-700 font-bold font-mono"
          >
            Meta Anual: {annualTarget.toLocaleString('pt-BR')} {unit}
          </text>

          {/* Grid lines */}
          {[0, 0.33, 0.66, 1].map((ratio, i) => {
            const y = height - paddingY - ratio * chartH;
            return (
              <line
                key={i}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
            );
          })}

          {/* Actual line */}
          {actualPath && (
            <path
              d={actualPath}
              fill="none"
              stroke="#0f172a"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}

          {/* Forecast Line */}
          {forecastPath && isAtRisk && (
            <path
              d={forecastPath}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeDasharray="4 4"
            />
          )}

          {/* Runway Line */}
          {runwayPath && (
            <path
              d={runwayPath}
              fill="none"
              stroke="#059669"
              strokeWidth="2"
              strokeDasharray="3 3"
            />
          )}

          {/* Points */}
          {accumulatedSeries.map((val, idx) => {
            if (val === null) return null;
            return (
              <circle
                key={idx}
                cx={getX(idx)}
                cy={getY(val)}
                r={idx === reportedCount - 1 ? 5 : 3.5}
                fill={idx === reportedCount - 1 ? '#4f46e5' : '#0f172a'}
                stroke="#ffffff"
                strokeWidth="2"
              />
            );
          })}

          {/* X axis */}
          {MONTH_SHORT_NAMES.map((m, idx) => (
            <text
              key={m}
              x={getX(idx)}
              y={height - 10}
              textAnchor="middle"
              className={`text-[10px] ${
                idx < reportedCount ? 'fill-slate-900 font-bold' : 'fill-slate-400 font-medium'
              }`}
            >
              {m}
            </text>
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-3 border-t border-slate-100 mt-2">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-slate-900 rounded-full"></span>
            <span className="font-semibold text-slate-800">Acumulado Realizado (Jan-Ago)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-indigo-600"></span>
            <span className="text-indigo-700 font-medium">Meta CNJ</span>
          </div>
          {isAtRisk && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-rose-500"></span>
              <span className="text-rose-600 font-medium">Tendência Atual (Risco)</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-emerald-600"></span>
            <span className="text-emerald-700 font-medium">Trajetória Alvo Necessária</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 3. Índice Geral de Sustentabilidade do PLS (ISP)
// =========================================================================

interface SustainabilityIndexProps {
  score: number;
  previousYearScore: number;
  currentYear?: number;
  previousYear?: number;
  dimensions: {
    name: string;
    score: number;
    weight: number;
    status: 'EXCELENTE' | 'BOM' | 'ATENCAO' | 'CRITICO';
  }[];
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  cardNumber?: number;
  totalCards?: number;
}

export const SustainabilityIndexCard: React.FC<SustainabilityIndexProps> = ({
  score,
  previousYearScore,
  currentYear = 2026,
  previousYear = 2025,
  dimensions,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  cardNumber,
  totalCards
}) => {
  const delta = score - previousYearScore;
  const isUp = delta >= 0;

  const radius = 64;
  const strokeWidth = 12;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getStatusText = (s: number) => {
    if (s >= 90) return { label: 'Excelente Desempenho', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
    if (s >= 80) return { label: 'Bom / Em Conformidade', color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' };
    if (s >= 65) return { label: 'Atenção / Margem Crítica', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
    return { label: 'Risco Regulatório', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' };
  };

  const status = getStatusText(score);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
            <Gauge className="w-4 h-4 text-emerald-600" />
            Índice de Sustentabilidade do Judiciário
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-0.5">
            ISP Consolidado — Exercício {currentYear}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <div className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${status.bg} ${status.color}`}>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{status.label}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Gauge Center */}
        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50/60 border border-slate-100">
          <div className="relative w-40 h-24 flex items-end justify-center overflow-hidden">
            <svg viewBox="0 0 160 90" className="w-40 h-24">
              <path
                d="M 16 80 A 64 64 0 0 1 144 80"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
              <path
                d="M 16 80 A 64 64 0 0 1 144 80"
                fill="none"
                stroke={score >= 80 ? '#059669' : score >= 65 ? '#f59e0b' : '#ef4444'}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute bottom-0 flex flex-col items-center">
              <span className="font-mono text-3xl font-extrabold text-slate-900">
                {score.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Meta CNJ: ≥ 80%</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold">
            {isUp ? (
              <span className="text-emerald-700 flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
                +{delta.toFixed(1)} pts
              </span>
            ) : (
              <span className="text-rose-700 flex items-center gap-0.5">
                <TrendingDown className="w-3.5 h-3.5" />
                {delta.toFixed(1)} pts
              </span>
            )}
            <span className="text-slate-400 font-normal">em relação a {previousYear} ({previousYearScore.toFixed(1)}%)</span>
          </div>
        </div>

        {/* Breakdown by Dimensions */}
        <div className="md:col-span-2 space-y-2.5">
          <div className="text-xs font-semibold text-slate-700 mb-1 flex justify-between">
            <span>Desempenho por Eixo Temático do CNJ (Resolução 400/2021)</span>
            <span className="text-slate-400 font-mono">Peso & Atingimento</span>
          </div>

          {dimensions.map((dim, i) => {
            const barColor =
              dim.score >= 90
                ? 'bg-emerald-600'
                : dim.score >= 80
                ? 'bg-teal-600'
                : dim.score >= 65
                ? 'bg-amber-500'
                : 'bg-rose-500';

            return (
              <div key={i} className="text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-slate-800">{dim.name}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-[10px] text-slate-400">Peso {dim.weight}%</span>
                    <span className="font-bold text-slate-900">{dim.score}%</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                    style={{ width: `${Math.min(100, dim.score)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 4. Eficiência Energética da Frota (Km / Litro) com Sombra & Gradiente Degradê
// =========================================================================

interface FleetEfficiencyProps {
  fuel2025: (number | null)[];
  fuel2026: (number | null)[];
  km2025: (number | null)[];
  km2026: (number | null)[];
  currentYear?: number;
  previousYear?: number;
  height?: number;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  cardNumber?: number;
  totalCards?: number;
}

export const FleetEfficiencyChart: React.FC<FleetEfficiencyProps> = ({
  fuel2025,
  fuel2026,
  km2025,
  km2026,
  currentYear = 2026,
  previousYear = 2025,
  height = 285,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
  cardNumber,
  totalCards
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const eff2025 = km2025.map((k, i) => {
    const f = fuel2025[i];
    return k && f && f > 0 ? Number((k / f).toFixed(2)) : null;
  });

  const eff2026 = km2026.map((k, i) => {
    const f = fuel2026[i];
    return k && f && f > 0 ? Number((k / f).toFixed(2)) : null;
  });

  const valid2026 = eff2026.filter((v): v is number => v !== null);
  const reportedCount = valid2026.length; // 8
  const currentMonthIdx = reportedCount - 1;
  const avg2026 = valid2026.length > 0 ? valid2026.reduce((a, b) => a + b, 0) / valid2026.length : 0;

  const valid2025 = eff2025.slice(0, valid2026.length).filter((v): v is number => v !== null);
  const avg2025 = valid2025.length > 0 ? valid2025.reduce((a, b) => a + b, 0) / valid2025.length : 0;

  const projectedEff: (number | null)[] = Array(12).fill(null);
  if (reportedCount > 0) {
    projectedEff[currentMonthIdx] = eff2026[currentMonthIdx];
    for (let i = reportedCount; i < 12; i++) {
      projectedEff[i] = Number(avg2026.toFixed(2));
    }
  }

  const width = 640;
  const paddingX = 48;
  const paddingY = 32;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  const allEffValues = [
    ...eff2025.filter((v): v is number => v !== null),
    ...valid2026,
    ...projectedEff.filter((v): v is number => v !== null),
    8.0
  ];
  const maxEff = allEffValues.length > 0 ? Math.max(...allEffValues) : 10.5;
  const minEff = allEffValues.length > 0 ? Math.min(...allEffValues) : 6.0;
  const maxVal = Math.max(10.5, Math.ceil(maxEff * 1.15));
  const minVal = Math.max(0, Math.min(6.0, Math.floor(minEff * 0.85)));
  const range = maxVal - minVal > 0 ? maxVal - minVal : 1;

  const getX = (idx: number) => paddingX + (idx / 11) * chartW;
  const getY = (val: number) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return height - paddingY - ((clamped - minVal) / range) * chartH;
  };

  const points2025 = eff2025
    .map((v, i) => (v !== null ? `${getX(i)},${getY(v)}` : null))
    .filter(Boolean);
  const path2025 = points2025.length > 0 ? `M ${points2025.join(' L ')}` : '';

  const pointsActual = eff2026
    .map((v, i) => (v !== null ? `${getX(i)},${getY(v)}` : null))
    .filter(Boolean);
  const pathActual = pointsActual.length > 0 ? `M ${pointsActual.join(' L ')}` : '';

  // SOMBRA / GRADIENTE SOB A EFICIÊNCIA
  const areaActualPath = pointsActual.length > 0
    ? `M ${getX(0)},${height - paddingY} L ${pointsActual.join(' L ')} L ${getX(currentMonthIdx)},${height - paddingY} Z`
    : '';

  const pointsProj: string[] = [];
  for (let i = currentMonthIdx; i < 12; i++) {
    const val = projectedEff[i];
    if (val !== null) pointsProj.push(`${getX(i)},${getY(val)}`);
  }
  const pathProj = pointsProj.length > 0 ? `M ${pointsProj.join(' L ')}` : '';

  const areaProjPath = pointsProj.length > 0
    ? `M ${getX(currentMonthIdx)},${height - paddingY} L ${pointsProj.join(' L ')} L ${getX(11)},${height - paddingY} Z`
    : '';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Rendimento Médio da Frota Mês a Mês</h4>
              <span className="text-xs text-slate-500">Quilômetros Rodados por Litro (Km/L)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              <span>Média {currentYear}: {avg2026.toFixed(2)} Km/L</span>
            </div>
            <div className="text-slate-500 font-medium hidden sm:block">
              ({previousYear}: {avg2025.toFixed(2)} Km/L)
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            <defs>
              <linearGradient id="grad-actual-eff" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d97706" stopOpacity="0.45" />
                <stop offset="35%" stopColor="#d97706" stopOpacity="0.22" />
                <stop offset="70%" stopColor="#d97706" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0.01" />
              </linearGradient>

              <linearGradient id="grad-proj-eff" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                <stop offset="45%" stopColor="#f59e0b" stopOpacity="0.10" />
                <stop offset="85%" stopColor="#f59e0b" stopOpacity="0.03" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.00" />
              </linearGradient>

              <filter id="shadow-eff" x="-5%" y="-20%" width="110%" height="150%">
                <feDropShadow dx="0" dy="5" stdDeviation="4.5" floodColor="#d97706" floodOpacity="0.42" />
              </filter>
            </defs>

            {/* Target line: 8.0 km/l */}
            <line
              x1={paddingX}
              y1={getY(8.0)}
              x2={width - paddingX}
              y2={getY(8.0)}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={width - paddingX - 4}
              y={getY(8.0) - 4}
              textAnchor="end"
              className="text-[9px] fill-slate-500 font-mono"
            >
              Referência: 8.0 Km/L
            </text>

            {/* Grid */}
            {[6.5, 7.5, 8.5, 9.5].map(v => (
              <g key={v}>
                <line
                  x1={paddingX}
                  y1={getY(v)}
                  x2={width - paddingX}
                  y2={getY(v)}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                <text x={paddingX - 6} y={getY(v) + 3} textAnchor="end" className="text-[10px] fill-slate-400 font-mono">
                  {v.toFixed(1)}
                </text>
              </g>
            ))}

            {/* SOMBRA SOB A EFICIÊNCIA */}
            {areaActualPath && (
              <path d={areaActualPath} fill="url(#grad-actual-eff)" />
            )}

            {areaProjPath && (
              <path d={areaProjPath} fill="url(#grad-proj-eff)" />
            )}

            {/* 2025 Line */}
            {path2025 && (
              <path d={path2025} fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3 3" />
            )}

            {/* Linha Contínua até Agosto com Sombra */}
            {pathActual && (
              <path
                d={pathActual}
                fill="none"
                stroke="#d97706"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#shadow-eff)"
              />
            )}

            {/* Linha Pontilhada de Projeção */}
            {pathProj && (
              <path d={pathProj} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="5 5" strokeLinecap="round" />
            )}

            {/* Points 2026 Realized */}
            {eff2026.map((val, idx) => {
              if (val === null) return null;
              const x = getX(idx);
              const y = getY(val);
              const isHovered = hoveredIdx === idx;
              const isCurrent = idx === currentMonthIdx;

              return (
                <g key={`act-${idx}`}>
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 6 : isCurrent ? 5.5 : 4.5}
                    fill="#d97706"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                  {isCurrent && !isHovered && (
                    <circle cx={x} cy={y} r={9} fill="none" stroke="#d97706" strokeWidth="1.5" opacity="0.6" />
                  )}
                </g>
              );
            })}

            {/* Points Projected (Set-Dez) */}
            {projectedEff.map((val, idx) => {
              if (val === null || idx <= currentMonthIdx) return null;
              const x = getX(idx);
              const y = getY(val);
              const isHovered = hoveredIdx === idx;

              return (
                <circle
                  key={`proj-${idx}`}
                  cx={x}
                  cy={y}
                  r={isHovered ? 6 : 4}
                  fill="#ffffff"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="2 2"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}

            {/* Tooltip */}
            {hoveredIdx !== null && (
              <g pointerEvents="none">
                {(() => {
                  const idx = hoveredIdx;
                  const isPast = idx <= currentMonthIdx;
                  const v = isPast ? eff2026[idx] : projectedEff[idx];
                  const v25 = eff2025[idx];
                  const x = Math.min(Math.max(getX(idx), 80), width - 80);

                  return (
                    <g>
                      <rect x={x - 70} y={paddingY - 26} width="140" height="42" rx="6" fill="#0f172a" opacity="0.96" />
                      <text x={x} y={paddingY - 9} textAnchor="middle" fill="#ffffff" className="text-[11px] font-bold font-mono">
                        {MONTH_NAMES[idx]}: {v !== null ? `${v.toFixed(2)} Km/L` : 'N/D'}
                      </text>
                      <text x={x} y={paddingY + 6} textAnchor="middle" fill={isPast ? '#94a3b8' : '#fbbf24'} className="text-[10px] font-mono">
                        {isPast ? (v25 !== null ? `${previousYear}: ${v25.toFixed(2)} Km/L` : '—') : 'Projeção estimada'}
                      </text>
                    </g>
                  );
                })()}
              </g>
            )}

            {/* X axis */}
            {MONTH_SHORT_NAMES.map((m, idx) => (
              <text
                key={m}
                x={getX(idx)}
                y={height - 10}
                textAnchor="middle"
                className={`text-[10px] ${idx <= currentMonthIdx ? 'fill-slate-900 font-bold' : 'fill-slate-400 font-medium'}`}
              >
                {m}
              </text>
            ))}
          </svg>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-600 pt-3 border-t border-slate-100 mt-2">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-1 bg-amber-600 rounded-full shadow-xs"></span>
            <span className="font-bold text-slate-800">Linha Contínua: Realizado ({currentYear})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-0.5 border-t-2 border-dashed border-amber-400"></span>
            <span className="font-semibold text-amber-700">Linha Pontilhada: Projeção</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-t border-dashed border-slate-400"></span>
            <span className="text-slate-500">{previousYear} (Ano Anterior)</span>
          </div>
        </div>

        <div className="text-slate-400 text-[10px]">
          Eficiência baseada em abastecimentos oficiais
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// Status Pill
// =========================================================================

export const StatusPill: React.FC<{ status: string; showIcon?: boolean }> = ({ status, showIcon = true }) => {
  switch (status) {
    case 'META_ATINGIDA':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          {showIcon && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>}
          Meta Atingida
        </span>
      );
    case 'EM_CONFORMIDADE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
          {showIcon && <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>}
          Em Conformidade
        </span>
      );
    case 'ATENCAO':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          {showIcon && <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>}
          Atenção
        </span>
      );
    case 'RISCO':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
          {showIcon && <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>}
          Risco de Não Atingir
        </span>
      );
    case 'EM_VALIDACAO':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
          {showIcon && <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>}
          Dados em Validação
        </span>
      );
    case 'SEM_DADOS':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          {showIcon && <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>}
          Sem Dados
        </span>
      );
  }
};
