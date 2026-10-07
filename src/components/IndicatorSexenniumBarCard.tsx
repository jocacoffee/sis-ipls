import React, { useState } from 'react';
import {
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  GripVertical
} from 'lucide-react';

export interface YearBarItem {
  year: number;
  value: number;
  isPartial?: boolean;
  target?: number;
}

interface IndicatorSexenniumBarCardProps {
  title: string;
  code: string;
  unit: string;
  icon: React.ReactNode;
  data: YearBarItem[];
  sexenniumTarget?: number;
  invertGoodDirection?: boolean; // true = lower is better (default for consumption)
  themeColor?: 'emerald' | 'amber' | 'blue' | 'purple' | 'orange' | 'cyan' | 'rose' | 'sky';
  selectedYear?: number;
  onSelectYear?: (year: number) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  cardNumber?: number;
  totalCards?: number;
  height?: number;
}

const COLOR_MAP: Record<string, {
  barGradientStart: string;
  barGradientEnd: string;
  barSolid: string;
  targetLine: string;
  badgeBg: string;
  badgeText: string;
  activeBorder: string;
}> = {
  emerald: {
    barGradientStart: '#10b981',
    barGradientEnd: '#059669',
    barSolid: '#10b981',
    targetLine: '#047857',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    activeBorder: 'border-emerald-500'
  },
  amber: {
    barGradientStart: '#f59e0b',
    barGradientEnd: '#d97706',
    barSolid: '#f59e0b',
    targetLine: '#b45309',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    activeBorder: 'border-amber-500'
  },
  blue: {
    barGradientStart: '#3b82f6',
    barGradientEnd: '#2563eb',
    barSolid: '#3b82f6',
    targetLine: '#1d4ed8',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-800',
    activeBorder: 'border-blue-500'
  },
  purple: {
    barGradientStart: '#a855f7',
    barGradientEnd: '#9333ea',
    barSolid: '#a855f7',
    targetLine: '#7e22ce',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-800',
    activeBorder: 'border-purple-500'
  },
  orange: {
    barGradientStart: '#f97316',
    barGradientEnd: '#ea580c',
    barSolid: '#f97316',
    targetLine: '#c2410c',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-800',
    activeBorder: 'border-orange-500'
  },
  cyan: {
    barGradientStart: '#06b6d4',
    barGradientEnd: '#0891b2',
    barSolid: '#06b6d4',
    targetLine: '#0e7490',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-cyan-800',
    activeBorder: 'border-cyan-500'
  },
  rose: {
    barGradientStart: '#f43f5e',
    barGradientEnd: '#e11d48',
    barSolid: '#f43f5e',
    targetLine: '#be123c',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-800',
    activeBorder: 'border-rose-500'
  },
  sky: {
    barGradientStart: '#0284c7',
    barGradientEnd: '#0369a1',
    barSolid: '#0284c7',
    targetLine: '#075985',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-800',
    activeBorder: 'border-sky-500'
  }
};

export const IndicatorSexenniumBarCard: React.FC<IndicatorSexenniumBarCardProps> = ({
  title,
  code,
  unit,
  icon,
  data,
  sexenniumTarget,
  invertGoodDirection = true,
  themeColor = 'emerald',
  selectedYear,
  onSelectYear,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
  cardNumber,
  totalCards,
  height = 250
}) => {
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);

  const colors = COLOR_MAP[themeColor] || COLOR_MAP.emerald;
  const safeId = code.replace(/[^a-zA-Z0-9]/g, '-');
  const gradientId = `grad-sex-bar-${safeId}`;

  // Baseline 2021 vs Current 2026 calculation
  const base2021 = data[0]?.value || 1;
  const curr2026 = data[data.length - 1]?.value || 0;
  const isZeroElimination = sexenniumTarget === 0 && curr2026 === 0;

  const totalDelta = base2021 > 0 ? ((curr2026 - base2021) / base2021) * 100 : 0;
  const isFavorable = invertGoodDirection ? totalDelta <= 0 : totalDelta >= 0;

  // Max value for SVG Bar Scaling
  const maxVal = Math.max(...data.map(d => d.value), sexenniumTarget ?? 0, 10);
  const chartMaxY = maxVal * 1.28;

  // Dimensions
  const svgWidth = 600;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 32;
  const padBottom = 42;
  const chartAreaWidth = svgWidth - padLeft - padRight;
  const chartAreaHeight = height - padTop - padBottom;

  const slotWidth = chartAreaWidth / data.length;
  const barWidth = slotWidth * 0.68;

  const getBarX = (index: number) => padLeft + index * slotWidth + slotWidth * 0.16;
  const getY = (val: number) => padTop + chartAreaHeight - (val / chartMaxY) * chartAreaHeight;

  // 4 horizontal grid ticks
  const gridTicks = [0, 0.33, 0.66, 1].map(r => Math.round(chartMaxY * r));

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 flex-shrink-0">
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                  {code}
                </span>
                <h4 className="text-base font-bold text-slate-900 leading-snug">{title}</h4>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Evolução 2021 a 2026 • Unidade: <strong className="text-slate-700">{unit}</strong>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Card Position Badge */}
            {cardNumber && totalCards && (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[11px] font-bold"
                title={`Card ${cardNumber} de ${totalCards}`}
              >
                <GripVertical className="w-3 h-3 text-slate-400" />
                <span>#{cardNumber}</span>
              </div>
            )}

            {/* Reorder Arrows */}
            {(onMoveUp || onMoveDown) && (
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                {onMoveUp && (
                  <button
                    onClick={onMoveUp}
                    disabled={isFirst}
                    className={`p-1 rounded-md transition-colors ${
                      isFirst ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                    title="Mover para cima"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                )}
                {onMoveDown && (
                  <button
                    onClick={onMoveDown}
                    disabled={isLast}
                    className={`p-1 rounded-md transition-colors ${
                      isLast ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                    title="Mover para baixo"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Total Sexennium Delta Badge */}
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                isZeroElimination
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : isFavorable
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {isZeroElimination ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Descarte Zero Atingido! (0)</span>
                </>
              ) : (
                <>
                  {isFavorable ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                  <span>{totalDelta > 0 ? `+${totalDelta.toFixed(1)}%` : `${totalDelta.toFixed(1)}%`} no sexênio</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* SVG 6-Bar Chart */}
        <div className="relative overflow-hidden bg-slate-50/50 rounded-xl p-1.5 border border-slate-100">
          <svg viewBox={`0 0 ${svgWidth} ${height}`} className="w-full h-auto select-none" style={{ minHeight: height }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.barGradientStart} stopOpacity="0.95" />
                <stop offset="100%" stopColor={colors.barGradientEnd} stopOpacity="0.75" />
              </linearGradient>

              <linearGradient id={`${gradientId}-selected`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#059669" stopOpacity="1" />
                <stop offset="100%" stopColor="#047857" stopOpacity="0.85" />
              </linearGradient>

              <pattern id={`stripe-${safeId}`} width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="6" stroke={colors.barGradientStart} strokeWidth="2.5" opacity="0.4" />
              </pattern>
            </defs>

            {/* Grid lines */}
            {gridTicks.map((val, idx) => {
              const y = getY(val);
              return (
                <g key={idx}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={svgWidth - padRight}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray={idx === 0 ? undefined : '3 3'}
                  />
                  <text
                    x={padLeft - 6}
                    y={y + 3.5}
                    textAnchor="end"
                    className="text-[9px] fill-slate-400 font-mono"
                  >
                    {val >= 1000 ? `${Math.round(val / 1000)}k` : val}
                  </text>
                </g>
              );
            })}

            {/* Target line if set */}
            {sexenniumTarget !== undefined && sexenniumTarget > 0 && (
              <g>
                <line
                  x1={padLeft}
                  y1={getY(sexenniumTarget)}
                  x2={svgWidth - padRight}
                  y2={getY(sexenniumTarget)}
                  stroke="#dc2626"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
                <rect
                  x={svgWidth - padRight - 110}
                  y={getY(sexenniumTarget) - 15}
                  width="110"
                  height="14"
                  rx="3"
                  fill="#dc2626"
                  opacity="0.9"
                />
                <text
                  x={svgWidth - padRight - 55}
                  y={getY(sexenniumTarget) - 5}
                  textAnchor="middle"
                  className="text-[8.5px] fill-white font-bold font-mono"
                >
                  Meta: {sexenniumTarget.toLocaleString('pt-BR')} {unit}
                </text>
              </g>
            )}

            {/* Comparison Bars (2021 to 2026) */}
            {data.map((item, idx) => {
              const x = getBarX(idx);
              const isHovered = hoveredYear === item.year;
              const isSelected = selectedYear === item.year;
              const yVal = item.value;
              const barTopY = getY(yVal);
              const barH = Math.max(chartAreaHeight - (barTopY - padTop), yVal === 0 ? 3 : 5);

              // YoY delta vs previous year
              const prevVal = idx > 0 ? data[idx - 1].value : null;
              const yoyDelta = prevVal && prevVal > 0 ? ((item.value - prevVal) / prevVal) * 100 : null;

              return (
                <g
                  key={item.year}
                  className="cursor-pointer transition-all duration-150"
                  onMouseEnter={() => setHoveredYear(item.year)}
                  onMouseLeave={() => setHoveredYear(null)}
                  onClick={() => onSelectYear && onSelectYear(item.year)}
                >
                  {/* Selected Year highlight rect */}
                  {isSelected && (
                    <rect
                      x={x - 3}
                      y={padTop - 4}
                      width={barWidth + 6}
                      height={chartAreaHeight + 28}
                      rx="6"
                      fill="#ecfdf5"
                      opacity="0.8"
                    />
                  )}

                  {/* Main Bar */}
                  <rect
                    x={x}
                    y={yVal === 0 ? padTop + chartAreaHeight - 3 : barTopY}
                    width={barWidth}
                    height={barH}
                    rx="5"
                    fill={isSelected ? `url(#${gradientId}-selected)` : `url(#${gradientId})`}
                    opacity={isHovered ? 1 : 0.9}
                  />

                  {/* Partial 2026 cap */}
                  {item.isPartial && yVal > 0 && (
                    <rect
                      x={x}
                      y={barTopY}
                      width={barWidth}
                      height={barH * (4 / 12)}
                      rx="5"
                      fill={`url(#stripe-${safeId})`}
                    />
                  )}

                  {/* Value on top of bar */}
                  <text
                    x={x + barWidth / 2}
                    y={barTopY - 6}
                    textAnchor="middle"
                    className={`font-mono text-[9.5px] font-bold ${
                      isSelected ? 'fill-emerald-800 font-extrabold' : 'fill-slate-800'
                    }`}
                  >
                    {item.value >= 1000 ? item.value.toLocaleString('pt-BR') : item.value}
                  </text>

                  {/* YoY Delta pill */}
                  {yoyDelta !== null && yVal > 0 && (
                    <g>
                      <rect
                        x={x + barWidth / 2 - 17}
                        y={barTopY - 20}
                        width="34"
                        height="11"
                        rx="3"
                        fill={(invertGoodDirection ? yoyDelta <= 0 : yoyDelta >= 0) ? '#ecfdf5' : '#fff1f2'}
                        stroke={(invertGoodDirection ? yoyDelta <= 0 : yoyDelta >= 0) ? '#a7f3d0' : '#fecdd3'}
                        strokeWidth="0.8"
                      />
                      <text
                        x={x + barWidth / 2}
                        y={barTopY - 12}
                        textAnchor="middle"
                        className={`font-mono text-[7.5px] font-bold ${
                          (invertGoodDirection ? yoyDelta <= 0 : yoyDelta >= 0) ? 'fill-emerald-700' : 'fill-rose-700'
                        }`}
                      >
                        {yoyDelta > 0 ? `+${yoyDelta.toFixed(0)}%` : `${yoyDelta.toFixed(0)}%`}
                      </text>
                    </g>
                  )}

                  {/* X-axis year badge */}
                  <g>
                    <rect
                      x={x + barWidth / 2 - 18}
                      y={padTop + chartAreaHeight + 6}
                      width="36"
                      height="18"
                      rx="5"
                      fill={isSelected ? '#059669' : isHovered ? '#0f172a' : '#f1f5f9'}
                    />
                    <text
                      x={x + barWidth / 2}
                      y={padTop + chartAreaHeight + 18.5}
                      textAnchor="middle"
                      className={`font-mono text-[10px] font-bold ${
                        isSelected || isHovered ? 'fill-white' : 'fill-slate-700'
                      }`}
                    >
                      {item.year}
                    </text>
                  </g>

                  {/* Sub-label under year */}
                  <text
                    x={x + barWidth / 2}
                    y={padTop + chartAreaHeight + 35}
                    textAnchor="middle"
                    className="text-[8px] fill-slate-400 font-medium"
                  >
                    {item.year === 2021 ? 'Base' : item.year === 2026 ? 'Proj.' : 'Real.'}
                  </text>
                </g>
              );
            })}

            {/* Hover tooltip */}
            {hoveredYear !== null && (() => {
              const idx = data.findIndex(d => d.year === hoveredYear);
              if (idx === -1) return null;
              const item = data[idx];
              const x = getBarX(idx);
              const tipX = Math.min(Math.max(x + barWidth / 2, 75), svgWidth - 75);
              const deltaBase = base2021 > 0 ? ((item.value - base2021) / base2021) * 100 : 0;

              return (
                <g pointerEvents="none">
                  <rect
                    x={tipX - 70}
                    y={padTop - 24}
                    width="140"
                    height="42"
                    rx="6"
                    fill="#0f172a"
                    opacity="0.96"
                  />
                  <text
                    x={tipX}
                    y={padTop - 10}
                    textAnchor="middle"
                    className="text-[10px] font-bold fill-white font-mono"
                  >
                    {item.year}: {item.value.toLocaleString('pt-BR')} {unit}
                  </text>
                  <text
                    x={tipX}
                    y={padTop + 4}
                    textAnchor="middle"
                    className="text-[8.5px] fill-emerald-400 font-mono"
                  >
                    vs 2021: {deltaBase > 0 ? `+${deltaBase.toFixed(1)}%` : `${deltaBase.toFixed(1)}%`}
                  </text>
                  <text
                    x={tipX}
                    y={padTop + 14}
                    textAnchor="middle"
                    className="text-[7.5px] fill-slate-300"
                  >
                    {item.isPartial ? '🔮 Projeção Anual (8m)' : '✓ Consolidado'}
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>
      </div>

      {/* Bottom KPI Highlights */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-3 border-t border-slate-100 mt-2 font-mono">
        <div>
          <span>2021: </span>
          <strong className="text-slate-700">{base2021.toLocaleString('pt-BR')}</strong>
        </div>
        <div>
          <span>2026: </span>
          <strong className="text-emerald-700">{curr2026.toLocaleString('pt-BR')} {unit}</strong>
        </div>
        {sexenniumTarget !== undefined && (
          <div className="hidden sm:block">
            <span>Meta: </span>
            <strong className="text-slate-800">{sexenniumTarget.toLocaleString('pt-BR')}</strong>
          </div>
        )}
      </div>
    </div>
  );
};
