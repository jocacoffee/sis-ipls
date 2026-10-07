import React, { useState } from 'react';
import {
  BarChart2,
  TrendingDown,
  TrendingUp,
  Target,
  Layers,
  Table as TableIcon,
  Calendar,
  Sparkles,
  Zap,
  Droplet,
  Fuel,
  Navigation,
  FileText,
  Printer,
  Trash2,
  Coffee,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  GripVertical,
  HelpCircle,
  Award,
  GlassWater,
  Package,
  Filter
} from 'lucide-react';
import { Indicator, IndicatorMeasurement, IndicatorTarget } from '../types';

interface SexenniumBarComparisonCardProps {
  measurements: IndicatorMeasurement[];
  targets: IndicatorTarget[];
  indicators: Indicator[];
  selectedYear: number;
  onSelectYear?: (year: number) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  cardNumber?: number;
  totalCards?: number;
  initialRange?: [number, number];
  onSelectRange?: (range: [number, number]) => void;
}

export interface SexenniumIndicatorConfig {
  id: string;
  code: string;
  name: string;
  unit: string;
  category: 'MATERIAIS' | 'UTILIDADES' | 'FROTA' | 'RESIDUOS';
  icon: React.ReactNode;
  themeColor: {
    barGradientStart: string;
    barGradientEnd: string;
    barSolid: string;
    targetLine: string;
    badgeBg: string;
    badgeText: string;
  };
  invertGoodDirection: boolean; // true = lower is better (consumption)
  sexenniumTarget: number;
  aliases: string[];
}

const SEXENNIUM_YEARS = [2021, 2022, 2023, 2024, 2025, 2026];

const SEXENNIUM_INDICATORS: SexenniumIndicatorConfig[] = [
  {
    id: 'indicator-2-1',
    code: '2.1',
    name: 'Consumo de Papel A4 (CPP)',
    unit: 'resmas',
    category: 'MATERIAIS',
    icon: <FileText className="w-4 h-4 text-emerald-600" />,
    themeColor: {
      barGradientStart: '#10b981',
      barGradientEnd: '#059669',
      barSolid: '#10b981',
      targetLine: '#047857',
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-800'
    },
    invertGoodDirection: true,
    sexenniumTarget: 600,
    aliases: ['ind-papel-resmas', '2.1', 'CPP', 'indicator-2-1']
  },
  {
    id: 'indicator-7-1',
    code: '7.1',
    name: 'Consumo de Água Potável (CA)',
    unit: 'm³',
    category: 'UTILIDADES',
    icon: <Droplet className="w-4 h-4 text-cyan-600" />,
    themeColor: {
      barGradientStart: '#06b6d4',
      barGradientEnd: '#0891b2',
      barSolid: '#06b6d4',
      targetLine: '#0e7490',
      badgeBg: 'bg-cyan-50',
      badgeText: 'text-cyan-800'
    },
    invertGoodDirection: true,
    sexenniumTarget: 2160,
    aliases: ['ind-agua-m3', '7.1', 'CA', 'indicator-7-1']
  },
  {
    id: 'indicator-3-1',
    code: '3.1',
    name: 'Copos Plásticos Descartáveis (CD)',
    unit: 'centenas',
    category: 'MATERIAIS',
    icon: <Coffee className="w-4 h-4 text-rose-600" />,
    themeColor: {
      barGradientStart: '#f43f5e',
      barGradientEnd: '#e11d48',
      barSolid: '#f43f5e',
      targetLine: '#be123c',
      badgeBg: 'bg-rose-50',
      badgeText: 'text-rose-800'
    },
    invertGoodDirection: true,
    sexenniumTarget: 0,
    aliases: ['ind-copos-centenas', '3.1', 'CD', 'indicator-3-1']
  },
  {
    id: 'indicator-4-1',
    code: '4.1',
    name: 'Garrafas Plásticas Descartáveis (GDA)',
    unit: 'embalagens',
    category: 'MATERIAIS',
    icon: <GlassWater className="w-4 h-4 text-sky-600" />,
    themeColor: {
      barGradientStart: '#0ea5e9',
      barGradientEnd: '#0284c7',
      barSolid: '#0ea5e9',
      targetLine: '#0369a1',
      badgeBg: 'bg-sky-50',
      badgeText: 'text-sky-800'
    },
    invertGoodDirection: true,
    sexenniumTarget: 0,
    aliases: ['ind-garrafas-descartaveis', '4.1', 'GDA', 'indicator-4-1']
  },
  {
    id: 'indicator-4-2',
    code: '4.2',
    name: 'Garrafões Retornáveis 20L (GAR)',
    unit: 'garrafões',
    category: 'MATERIAIS',
    icon: <Package className="w-4 h-4 text-blue-600" />,
    themeColor: {
      barGradientStart: '#3b82f6',
      barGradientEnd: '#1d4ed8',
      barSolid: '#3b82f6',
      targetLine: '#1e40af',
      badgeBg: 'bg-blue-50',
      badgeText: 'text-blue-800'
    },
    invertGoodDirection: true,
    sexenniumTarget: 1800,
    aliases: ['ind-garrafoes-20l', '4.2', 'GAR', 'indicator-4-2']
  },
  {
    id: 'indicator-5-1',
    code: '5.1',
    name: 'Impressão de Documentos (QI)',
    unit: 'páginas',
    category: 'MATERIAIS',
    icon: <Printer className="w-4 h-4 text-purple-600" />,
    themeColor: {
      barGradientStart: '#a855f7',
      barGradientEnd: '#9333ea',
      barSolid: '#a855f7',
      targetLine: '#7e22ce',
      badgeBg: 'bg-purple-50',
      badgeText: 'text-purple-800'
    },
    invertGoodDirection: true,
    sexenniumTarget: 216000,
    aliases: ['ind-impressao-paginas', '5.1', 'QI', 'indicator-5-1']
  },
  {
    id: 'indicator-6-1',
    code: '6.1',
    name: 'Consumo de Energia Elétrica (CEE)',
    unit: 'kWh',
    category: 'UTILIDADES',
    icon: <Zap className="w-4 h-4 text-amber-600" />,
    themeColor: {
      barGradientStart: '#f59e0b',
      barGradientEnd: '#d97706',
      barSolid: '#f59e0b',
      targetLine: '#b45309',
      badgeBg: 'bg-amber-50',
      badgeText: 'text-amber-800'
    },
    invertGoodDirection: true,
    sexenniumTarget: 174000,
    aliases: ['ind-energia-kwh', '6.1', 'CEE', 'indicator-6-1']
  },
  {
    id: 'indicator-14-1',
    code: '14.1',
    name: 'Consumo de Combustível (CG)',
    unit: 'litros',
    category: 'FROTA',
    icon: <Fuel className="w-4 h-4 text-orange-600" />,
    themeColor: {
      barGradientStart: '#f97316',
      barGradientEnd: '#ea580c',
      barSolid: '#f97316',
      targetLine: '#c2410c',
      badgeBg: 'bg-orange-50',
      badgeText: 'text-orange-800'
    },
    invertGoodDirection: true,
    sexenniumTarget: 8160,
    aliases: ['ind-combustivel-litros', '14.1', 'CG', 'indicator-14-1']
  },
  {
    id: 'indicator-13-1',
    code: '13.1',
    name: 'Quilômetros Rodados da Frota (Km)',
    unit: 'km',
    category: 'FROTA',
    icon: <Navigation className="w-4 h-4 text-blue-600" />,
    themeColor: {
      barGradientStart: '#3b82f6',
      barGradientEnd: '#2563eb',
      barSolid: '#3b82f6',
      targetLine: '#1d4ed8',
      badgeBg: 'bg-blue-50',
      badgeText: 'text-blue-800'
    },
    invertGoodDirection: true,
    sexenniumTarget: 68000,
    aliases: ['ind-frota-km', '13.1', 'indicator-13-1']
  },
  {
    id: 'indicator-8-1',
    code: '8.1',
    name: 'Destinação de Resíduos Recicláveis (TMR)',
    unit: 'kg',
    category: 'RESIDUOS',
    icon: <Trash2 className="w-4 h-4 text-teal-600" />,
    themeColor: {
      barGradientStart: '#14b8a6',
      barGradientEnd: '#0d9488',
      barSolid: '#14b8a6',
      targetLine: '#0f766e',
      badgeBg: 'bg-teal-50',
      badgeText: 'text-teal-800'
    },
    invertGoodDirection: false, // higher is better
    sexenniumTarget: 4560,
    aliases: ['ind-residuos-kg', '8.1', '8.6', 'TMR', 'indicator-8-1']
  }
];

export const SexenniumBarComparisonCard: React.FC<SexenniumBarComparisonCardProps> = ({
  measurements,
  targets,
  indicators,
  selectedYear,
  onSelectYear,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
  cardNumber,
  totalCards,
  initialRange,
  onSelectRange
}) => {
  const [selectedIndId, setSelectedIndId] = useState<string>('indicator-2-1');
  const [viewMode, setViewMode] = useState<'BARS' | 'GRID' | 'TABLE'>('BARS');
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const [startYear, setStartYear] = useState<number>(initialRange ? initialRange[0] : 2021);
  const [endYear, setEndYear] = useState<number>(initialRange ? initialRange[1] : 2026);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'MATERIAIS' | 'UTILIDADES' | 'FROTA' | 'RESIDUOS'>('ALL');

  // Filter indicators by category
  const filteredIndicators = SEXENNIUM_INDICATORS.filter(ind => {
    if (selectedCategory === 'ALL') return true;
    return ind.category === selectedCategory;
  });

  // Active indicator configuration
  const currentIndConfig = filteredIndicators.find(i => i.id === selectedIndId) || filteredIndicators[0] || SEXENNIUM_INDICATORS[0];

  // Active years for the bar chart
  const activeYears = SEXENNIUM_YEARS.filter(y => y >= startYear && y <= endYear);

  const handleSetRange = (start: number, end: number) => {
    setStartYear(start);
    setEndYear(end);
    if (onSelectRange) onSelectRange([start, end]);
  };

  // Helper to calculate total annual value for each year of the sexennium
  const getSexenniumDataForIndicator = (config: SexenniumIndicatorConfig, yearsToUse = activeYears) => {
    return yearsToUse.map(year => {
      // Find all measurements matching this indicator and year
      const yearMeasurements = measurements.filter(m => {
        const matchesId = m.indicatorId === config.id || config.aliases.includes(m.indicatorId);
        return matchesId && m.year === year;
      });

      // Sum monthly values
      const validMonthly = yearMeasurements.filter(m => m.month >= 1 && m.month <= 12 && m.value !== null && m.value !== undefined);
      const monthsReported = validMonthly.length;
      const realizedSum = validMonthly.reduce((acc, curr) => acc + curr.value, 0);

      // Handle 2026 partial year vs completed years
      let totalAnnual = realizedSum;
      let projectedAnnual = realizedSum;
      const isPartial = year === 2026 && monthsReported > 0 && monthsReported < 12;

      if (isPartial) {
        projectedAnnual = Math.round((realizedSum / monthsReported) * 12);
        totalAnnual = projectedAnnual;
      }

      // Target for this year if exists in targets prop, or default to sexennium target
      const targetObj = targets.find(t => (t.indicatorId === config.id || config.aliases.includes(t.indicatorId)) && t.year === year);
      const yearTarget = targetObj?.targetValue ?? config.sexenniumTarget;

      return {
        year,
        realizedSum,
        projectedAnnual,
        totalAnnual,
        monthsReported,
        isPartial,
        target: yearTarget
      };
    });
  };

  const sexenniumSeries = getSexenniumDataForIndicator(currentIndConfig, activeYears);

  // Calculate year-over-year variations and baseline 2021 comparison
  const base2021 = sexenniumSeries[0]?.totalAnnual || 1;
  const currEnd = sexenniumSeries[sexenniumSeries.length - 1]?.totalAnnual || 0;
  const sexenniumTotalDelta = base2021 > 0 ? ((currEnd - base2021) / base2021) * 100 : 0;
  const isSexenniumFavorable = currentIndConfig.invertGoodDirection
    ? sexenniumTotalDelta <= 0
    : sexenniumTotalDelta >= 0;

  // Max value for SVG Bar Scaling
  const maxSeriesVal = Math.max(...sexenniumSeries.map(s => s.totalAnnual), currentIndConfig.sexenniumTarget, 10);
  const chartMaxY = maxSeriesVal * 1.25;

  // SVG Dimensions
  const svgWidth = 660;
  const svgHeight = 290;
  const padLeft = 60;
  const padRight = 30;
  const padTop = 38;
  const padBottom = 48;
  const chartAreaWidth = svgWidth - padLeft - padRight;
  const chartAreaHeight = svgHeight - padTop - padBottom;

  const numSlots = Math.max(activeYears.length, 1);
  const getBarX = (index: number) => {
    const slotWidth = chartAreaWidth / numSlots;
    return padLeft + index * slotWidth + slotWidth * 0.15;
  };
  const barWidth = (chartAreaWidth / numSlots) * 0.70;

  const getY = (val: number) => {
    return padTop + chartAreaHeight - (val / chartMaxY) * chartAreaHeight;
  };

  // Horizontal Grid Lines
  const gridTicks = [0, 0.25, 0.5, 0.75, 1].map(ratio => Math.round(chartMaxY * ratio));

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
      <div>
        {/* Card Header & Global Controls */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex-shrink-0 shadow-xs">
              <BarChart2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                  Ciclo 2021–2026
                </span>
                <span className="text-slate-300">·</span>
                <h4 className="text-base font-bold text-slate-900">
                  Evolução do Sexênio em Barras
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Desempenho ano a ano de papel, água, copos, garrafas, impressões, energia e frota.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto text-xs">
            {/* Overall Sexennium Delta */}
            <div
              className={`flex items-center gap-1 font-semibold ${
                isSexenniumFavorable ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {isSexenniumFavorable ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
              <span>
                {sexenniumTotalDelta > 0 ? `+${sexenniumTotalDelta.toFixed(1)}%` : `${sexenniumTotalDelta.toFixed(1)}%`} no sexênio
              </span>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('BARS')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'BARS' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Barras
              </button>
              <button
                onClick={() => setViewMode('GRID')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'GRID' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Grade Geral
              </button>
              <button
                onClick={() => setViewMode('TABLE')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'TABLE' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tabela
              </button>
            </div>
          </div>
        </div>

        {/* Year Range Selector Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 mb-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-600 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Período:
            </span>
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => handleSetRange(2021, 2026)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  startYear === 2021 && endYear === 2026
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                2021 a 2026 (Sexênio)
              </button>
              <button
                onClick={() => handleSetRange(2021, 2023)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  startYear === 2021 && endYear === 2023
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                1º Triênio (2021–2023)
              </button>
              <button
                onClick={() => handleSetRange(2024, 2026)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  startYear === 2024 && endYear === 2026
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                2º Triênio (2024–2026)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-slate-600 text-xs">
            <span>De:</span>
            <select
              value={startYear}
              onChange={e => {
                const val = Number(e.target.value);
                if (val <= endYear) handleSetRange(val, endYear);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-800"
            >
              {SEXENNIUM_YEARS.map(y => (
                <option key={y} value={y} disabled={y > endYear}>{y}</option>
              ))}
            </select>
            <span>Até:</span>
            <select
              value={endYear}
              onChange={e => {
                const val = Number(e.target.value);
                if (val >= startYear) handleSetRange(startYear, val);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-800"
            >
              {SEXENNIUM_YEARS.map(y => (
                <option key={y} value={y} disabled={y < startYear}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Filter & Indicator Tabs */}
        <div className="space-y-2 mb-4">
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span className="text-slate-400 text-[11px] font-medium mr-1">
              Eixo:
            </span>
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors ${
                selectedCategory === 'ALL'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedCategory('MATERIAIS')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors ${
                selectedCategory === 'MATERIAIS'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Papel, Copos, Garrafas & Impressões
            </button>
            <button
              onClick={() => setSelectedCategory('UTILIDADES')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors ${
                selectedCategory === 'UTILIDADES'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Água & Energia
            </button>
            <button
              onClick={() => setSelectedCategory('FROTA')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors ${
                selectedCategory === 'FROTA'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Frota & Combustível
            </button>
            <button
              onClick={() => setSelectedCategory('RESIDUOS')}
              className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors ${
                selectedCategory === 'RESIDUOS'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Resíduos
            </button>
          </div>

          {/* Indicator Selection Tabs (Horizontal Scrollable Strip) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {filteredIndicators.map(ind => {
              const isSelected = ind.id === currentIndConfig.id;
              return (
                <button
                  key={ind.id}
                  onClick={() => setSelectedIndId(ind.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs scale-100'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <span className="flex-shrink-0">{ind.icon}</span>
                  <span>{ind.code} {ind.name.replace(/\s*\(.*/, '')}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: BARS MODE (Interactive SVG Multi-Year Bar Chart)                  */}
        {/* ========================================================================= */}
        {viewMode === 'BARS' && (
          <div className="space-y-4">
            {/* SVG Canvas */}
            <div className="relative overflow-hidden bg-slate-50/50 rounded-xl p-2 border border-slate-100">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto select-none">
                <defs>
                  {/* Linear Gradient for Bars */}
                  <linearGradient id="sexennium-bar-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={currentIndConfig.themeColor.barGradientStart} stopOpacity="0.95" />
                    <stop offset="100%" stopColor={currentIndConfig.themeColor.barGradientEnd} stopOpacity="0.75" />
                  </linearGradient>

                  {/* Gradient for Selected Year Bar */}
                  <linearGradient id="sexennium-bar-gradient-selected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity="1" />
                    <stop offset="100%" stopColor="#047857" stopOpacity="0.85" />
                  </linearGradient>

                  {/* Striped Pattern for 2026 Projection cap */}
                  <pattern id="diagonal-stripe" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="0" y2="8" stroke={currentIndConfig.themeColor.barGradientStart} strokeWidth="3" opacity="0.45" />
                  </pattern>

                  {/* Drop Shadow for Bars */}
                  <filter id="bar-shadow" x="-10%" y="-10%" width="120%" height="130%">
                    <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.12" />
                  </filter>
                </defs>

                {/* Grid Lines and Y-Axis Labels */}
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
                        x={padLeft - 8}
                        y={y + 3.5}
                        textAnchor="end"
                        className="text-[9.5px] fill-slate-400 font-mono"
                      >
                        {val >= 1000 ? `${Math.round(val / 1000)}k` : val}
                      </text>
                    </g>
                  );
                })}

                {/* Target Line Across the Sexennium */}
                {currentIndConfig.sexenniumTarget > 0 && (
                  <g>
                    <line
                      x1={padLeft}
                      y1={getY(currentIndConfig.sexenniumTarget)}
                      x2={svgWidth - padRight}
                      y2={getY(currentIndConfig.sexenniumTarget)}
                      stroke="#dc2626"
                      strokeWidth="2"
                      strokeDasharray="5 4"
                    />
                    <rect
                      x={svgWidth - padRight - 150}
                      y={getY(currentIndConfig.sexenniumTarget) - 17}
                      width="150"
                      height="16"
                      rx="4"
                      fill="#dc2626"
                      opacity="0.9"
                    />
                    <text
                      x={svgWidth - padRight - 75}
                      y={getY(currentIndConfig.sexenniumTarget) - 6}
                      textAnchor="middle"
                      className="text-[9.5px] fill-white font-bold font-mono"
                    >
                      Meta: {currentIndConfig.sexenniumTarget.toLocaleString('pt-BR')} {currentIndConfig.unit}
                    </text>
                  </g>
                )}

                {/* Render Bars for each of the 6 Years */}
                {sexenniumSeries.map((item, idx) => {
                  const x = getBarX(idx);
                  const isHovered = hoveredYear === item.year;
                  const isSelected = selectedYear === item.year;
                  const yVal = item.totalAnnual;
                  const barTopY = getY(yVal);
                  const barHeight = Math.max(chartAreaHeight - (barTopY - padTop), 4);

                  // Calculate YoY variation vs previous year
                  const prevVal = idx > 0 ? sexenniumSeries[idx - 1].totalAnnual : null;
                  const yoyDelta = prevVal && prevVal > 0 ? ((item.totalAnnual - prevVal) / prevVal) * 100 : null;

                  return (
                    <g
                      key={item.year}
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredYear(item.year)}
                      onMouseLeave={() => setHoveredYear(null)}
                      onClick={() => onSelectYear && onSelectYear(item.year)}
                    >
                      {/* Active Year Glow Background */}
                      {isSelected && (
                        <rect
                          x={x - 4}
                          y={padTop}
                          width={barWidth + 8}
                          height={chartAreaHeight + 25}
                          rx="8"
                          fill="#ecfdf5"
                          opacity="0.75"
                        />
                      )}

                      {/* Main Bar (with gradient and rounded cap) */}
                      <rect
                        x={x}
                        y={barTopY}
                        width={barWidth}
                        height={barHeight}
                        rx="6"
                        fill={isSelected ? 'url(#sexennium-bar-gradient-selected)' : 'url(#sexennium-bar-gradient)'}
                        filter={isHovered ? 'url(#bar-shadow)' : undefined}
                        opacity={isHovered ? 1 : 0.9}
                      />

                      {/* Pattern for 2026 Projection Cap (if partial year) */}
                      {item.isPartial && (
                        <rect
                          x={x}
                          y={barTopY}
                          width={barWidth}
                          height={barHeight * (4 / 12)}
                          rx="6"
                          fill="url(#diagonal-stripe)"
                        />
                      )}

                      {/* Top Label: Annual Value */}
                      <text
                        x={x + barWidth / 2}
                        y={barTopY - 8}
                        textAnchor="middle"
                        className={`font-mono text-[10px] font-bold ${
                          isSelected ? 'fill-emerald-800 font-extrabold' : 'fill-slate-800'
                        }`}
                      >
                        {item.totalAnnual >= 1000
                          ? item.totalAnnual.toLocaleString('pt-BR')
                          : item.totalAnnual.toFixed(1)}
                      </text>

                      {/* YoY Delta Badge above the bar */}
                      {yoyDelta !== null && (
                        <g>
                          <rect
                            x={x + barWidth / 2 - 20}
                            y={barTopY - 24}
                            width="40"
                            height="13"
                            rx="3.5"
                            fill={
                              (currentIndConfig.invertGoodDirection ? yoyDelta <= 0 : yoyDelta >= 0)
                                ? '#ecfdf5'
                                : '#fff1f2'
                            }
                            stroke={
                              (currentIndConfig.invertGoodDirection ? yoyDelta <= 0 : yoyDelta >= 0)
                                ? '#a7f3d0'
                                : '#fecdd3'
                            }
                            strokeWidth="1"
                          />
                          <text
                            x={x + barWidth / 2}
                            y={barTopY - 14.5}
                            textAnchor="middle"
                            className={`font-mono text-[8.5px] font-bold ${
                              (currentIndConfig.invertGoodDirection ? yoyDelta <= 0 : yoyDelta >= 0)
                                ? 'fill-emerald-700'
                                : 'fill-rose-700'
                            }`}
                          >
                            {yoyDelta > 0 ? `+${yoyDelta.toFixed(0)}%` : `${yoyDelta.toFixed(0)}%`}
                          </text>
                        </g>
                      )}

                      {/* X-Axis Year Label */}
                      <g>
                        <rect
                          x={x + barWidth / 2 - 22}
                          y={padTop + chartAreaHeight + 8}
                          width="44"
                          height="20"
                          rx="6"
                          fill={isSelected ? '#059669' : isHovered ? '#0f172a' : '#f1f5f9'}
                        />
                        <text
                          x={x + barWidth / 2}
                          y={padTop + chartAreaHeight + 22}
                          textAnchor="middle"
                          className={`font-mono text-[11px] font-bold ${
                            isSelected || isHovered ? 'fill-white' : 'fill-slate-700'
                          }`}
                        >
                          {item.year}
                        </text>
                      </g>

                      {/* Sub-label under year */}
                      <text
                        x={x + barWidth / 2}
                        y={padTop + chartAreaHeight + 40}
                        textAnchor="middle"
                        className="text-[8.5px] fill-slate-400 font-medium"
                      >
                        {item.year === 2021
                          ? 'Linha de Base'
                          : item.year === 2026
                          ? 'Jan-Ago (Proj)'
                          : 'Consolidado'}
                      </text>
                    </g>
                  );
                })}

                {/* Hover Tooltip Overlay */}
                {hoveredYear !== null && (() => {
                  const idx = activeYears.indexOf(hoveredYear);
                  if (idx === -1) return null;
                  const item = sexenniumSeries[idx];
                  if (!item) return null;
                  const x = getBarX(idx);
                  const tooltipX = Math.min(Math.max(x + barWidth / 2, 90), svgWidth - 90);
                  const deltaVsBase = base2021 > 0 ? ((item.totalAnnual - base2021) / base2021) * 100 : 0;

                  return (
                    <g pointerEvents="none">
                      <rect
                        x={tooltipX - 85}
                        y={padTop - 25}
                        width="170"
                        height="52"
                        rx="8"
                        fill="#0f172a"
                        opacity="0.96"
                        stroke="#334155"
                        strokeWidth="1"
                      />
                      <text
                        x={tooltipX}
                        y={padTop - 8}
                        textAnchor="middle"
                        className="text-[11px] font-bold fill-white font-mono"
                      >
                        Exercício {item.year}: {item.totalAnnual.toLocaleString('pt-BR')} {currentIndConfig.unit}
                      </text>
                      <text
                        x={tooltipX}
                        y={padTop + 6}
                        textAnchor="middle"
                        className="text-[9.5px] fill-emerald-400 font-mono font-medium"
                      >
                        vs Linha de Base ({activeYears[0]}): {deltaVsBase > 0 ? `+${deltaVsBase.toFixed(1)}%` : `${deltaVsBase.toFixed(1)}%`}
                      </text>
                      <text
                        x={tooltipX}
                        y={padTop + 19}
                        textAnchor="middle"
                        className="text-[8.5px] fill-slate-300"
                      >
                        {item.isPartial ? '🔮 Projeção baseada nos 8 meses de 2026' : '✓ 12 meses consolidados na base'}
                      </text>
                    </g>
                  );
                })()}
              </svg>
            </div>

            {/* Sexennium Key Milestones Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-[10.5px] text-slate-500 block font-medium">Linha de Base ({activeYears[0] || 2021})</span>
                <span className="font-mono text-sm font-bold text-slate-800">
                  {base2021.toLocaleString('pt-BR')} <span className="text-[10px] text-slate-400 font-normal">{currentIndConfig.unit}</span>
                </span>
              </div>

              <div>
                <span className="text-[10.5px] text-slate-500 block font-medium">Exercício Final ({activeYears[activeYears.length - 1] || 2026}{activeYears[activeYears.length - 1] === 2026 ? ' Proj.' : ''})</span>
                <span className="font-mono text-sm font-bold text-emerald-700">
                  {currEnd.toLocaleString('pt-BR')} <span className="text-[10px] text-emerald-600 font-normal">{currentIndConfig.unit}</span>
                </span>
              </div>

              <div>
                <span className="text-[10.5px] text-slate-500 block font-medium">Meta do Sexênio</span>
                <span className="font-mono text-sm font-bold text-slate-900">
                  {currentIndConfig.sexenniumTarget.toLocaleString('pt-BR')} <span className="text-[10px] text-slate-400 font-normal">{currentIndConfig.unit}</span>
                </span>
              </div>

              <div>
                <span className="text-[10.5px] text-slate-500 block font-medium">Cumprimento da Meta</span>
                <span className={`inline-flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                  (currentIndConfig.invertGoodDirection ? currEnd <= currentIndConfig.sexenniumTarget : currEnd >= currentIndConfig.sexenniumTarget)
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  <CheckCircle2 className="w-3 h-3" />
                  {(currentIndConfig.invertGoodDirection ? currEnd <= currentIndConfig.sexenniumTarget : currEnd >= currentIndConfig.sexenniumTarget)
                    ? (currentIndConfig.sexenniumTarget === 0 && currEnd === 0 ? 'Descarte Zero (0)!' : 'Meta Atingida')
                    : 'Em Acompanhamento'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: MULTIDIMENSIONAL GRID (Full Side-by-side Bar Cards)               */}
        {/* ========================================================================= */}
        {viewMode === 'GRID' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredIndicators.map(config => {
              const series = getSexenniumDataForIndicator(config, activeYears);
              const bStart = series[0]?.totalAnnual || 1;
              const cEnd = series[series.length - 1]?.totalAnnual || 0;
              const delta = bStart > 0 ? ((cEnd - bStart) / bStart) * 100 : 0;
              const isFav = config.invertGoodDirection ? delta <= 0 : delta >= 0;
              const isZeroMet = config.sexenniumTarget === 0 && cEnd === 0;
              const maxVal = Math.max(...series.map(s => s.totalAnnual), config.sexenniumTarget, 10);
              const gridChartMaxY = maxVal * 1.30;

              // Mini SVG settings for each card
              const cardSvgWidth = 520;
              const cardSvgHeight = 160;
              const cardPadLeft = 45;
              const cardPadRight = 20;
              const cardPadTop = 24;
              const cardPadBottom = 32;
              const cardAreaWidth = cardSvgWidth - cardPadLeft - cardPadRight;
              const cardAreaHeight = cardSvgHeight - cardPadTop - cardPadBottom;

              const cardSlotWidth = cardAreaWidth / Math.max(activeYears.length, 1);
              const cardBarW = cardSlotWidth * 0.65;
              const getCardBarX = (i: number) => cardPadLeft + i * cardSlotWidth + cardSlotWidth * 0.17;
              const getCardY = (v: number) => cardPadTop + cardAreaHeight - (v / gridChartMaxY) * cardAreaHeight;

              return (
                <div
                  key={config.id}
                  onClick={() => {
                    setSelectedIndId(config.id);
                    setViewMode('BARS');
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer bg-white hover:shadow-md ${
                    config.id === selectedIndId
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-slate-100 text-slate-800">{config.icon}</div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {config.code}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 font-mono">
                            {config.unit}
                          </span>
                        </div>
                        <h5 className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5">
                          {config.name}
                        </h5>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {isZeroMet ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Zero (0)
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                            isFav ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {isFav ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                          {delta > 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* SVG Bar Chart for this indicator across activeYears */}
                  <div className="bg-slate-50/70 rounded-lg p-1.5 border border-slate-100 my-2">
                    <svg viewBox={`0 0 ${cardSvgWidth} ${cardSvgHeight}`} className="w-full h-auto select-none">
                      {/* Grid tick line */}
                      <line
                        x1={cardPadLeft}
                        y1={cardPadTop + cardAreaHeight}
                        x2={cardSvgWidth - cardPadRight}
                        y2={cardPadTop + cardAreaHeight}
                        stroke="#cbd5e1"
                        strokeWidth="1"
                      />

                      {/* Target line if applicable */}
                      {config.sexenniumTarget > 0 && (
                        <g>
                          <line
                            x1={cardPadLeft}
                            y1={getCardY(config.sexenniumTarget)}
                            x2={cardSvgWidth - cardPadRight}
                            y2={getCardY(config.sexenniumTarget)}
                            stroke="#dc2626"
                            strokeWidth="1"
                            strokeDasharray="3 2"
                          />
                          <text
                            x={cardSvgWidth - cardPadRight - 2}
                            y={getCardY(config.sexenniumTarget) - 3}
                            textAnchor="end"
                            className="text-[8px] fill-rose-600 font-mono font-bold"
                          >
                            Meta: {config.sexenniumTarget >= 1000 ? `${Math.round(config.sexenniumTarget / 1000)}k` : config.sexenniumTarget}
                          </text>
                        </g>
                      )}

                      {/* Bars */}
                      {series.map((s, idx) => {
                        const bx = getCardBarX(idx);
                        const by = getCardY(s.totalAnnual);
                        const bh = Math.max(cardAreaHeight - (by - cardPadTop), s.totalAnnual === 0 ? 2 : 4);
                        const isCurr = s.year === selectedYear;

                        // YoY delta
                        const prevVal = idx > 0 ? series[idx - 1].totalAnnual : null;
                        const yoy = prevVal && prevVal > 0 ? ((s.totalAnnual - prevVal) / prevVal) * 100 : null;

                        return (
                          <g key={s.year}>
                            {/* Bar rect */}
                            <rect
                              x={bx}
                              y={s.totalAnnual === 0 ? cardPadTop + cardAreaHeight - 2 : by}
                              width={cardBarW}
                              height={bh}
                              rx="3"
                              fill={isCurr ? '#059669' : config.themeColor.barSolid}
                              opacity={isCurr ? 1 : 0.85}
                            />

                            {/* Top value */}
                            <text
                              x={bx + cardBarW / 2}
                              y={by - 4}
                              textAnchor="middle"
                              className={`font-mono text-[8.5px] font-bold ${isCurr ? 'fill-emerald-800' : 'fill-slate-700'}`}
                            >
                              {s.totalAnnual >= 1000
                                ? `${(s.totalAnnual / 1000).toFixed(s.totalAnnual >= 10000 ? 0 : 1)}k`
                                : s.totalAnnual.toLocaleString('pt-BR')}
                            </text>

                            {/* YoY badge above */}
                            {yoy !== null && (
                              <text
                                x={bx + cardBarW / 2}
                                y={by - 13}
                                textAnchor="middle"
                                className={`font-mono text-[7px] font-bold ${
                                  (config.invertGoodDirection ? yoy <= 0 : yoy >= 0) ? 'fill-emerald-600' : 'fill-rose-600'
                                }`}
                              >
                                {yoy > 0 ? `+${Math.round(yoy)}%` : `${Math.round(yoy)}%`}
                              </text>
                            )}

                            {/* Year label below */}
                            <text
                              x={bx + cardBarW / 2}
                              y={cardPadTop + cardAreaHeight + 14}
                              textAnchor="middle"
                              className={`font-mono text-[9px] font-bold ${isCurr ? 'fill-emerald-800' : 'fill-slate-600'}`}
                            >
                              {s.year}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono border-t border-slate-100">
                    <span>
                      {activeYears[0]}: <strong>{bStart.toLocaleString('pt-BR')}</strong>
                    </span>
                    <span className="text-emerald-700 font-bold">
                      {activeYears[activeYears.length - 1]}: {cEnd.toLocaleString('pt-BR')} {config.unit}
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      Clique para expandir →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: FULL SEXENNIUM TABLE (Consolidated Annual Matrix)                 */}
        {/* ========================================================================= */}
        {viewMode === 'TABLE' && (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Indicador PLS</th>
                  {activeYears.map(y => (
                    <th key={y} className="py-2.5 px-3 text-right">
                      {y} {y === 2021 ? '(Base)' : y === 2026 ? '(Proj.)' : ''}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-right">Meta Sexênio</th>
                  <th className="py-2.5 px-3 text-center">Variação no Período</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredIndicators.map(config => {
                  const series = getSexenniumDataForIndicator(config, activeYears);
                  const bStart = series[0]?.totalAnnual || 1;
                  const cEnd = series[series.length - 1]?.totalAnnual || 0;
                  const delta = bStart > 0 ? ((cEnd - bStart) / bStart) * 100 : 0;
                  const isFav = config.invertGoodDirection ? delta <= 0 : delta >= 0;

                  return (
                    <tr
                      key={config.id}
                      onClick={() => {
                        setSelectedIndId(config.id);
                        setViewMode('BARS');
                      }}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-2 px-3 font-bold text-emerald-800">{config.code}</td>
                      <td className="py-2 px-3 font-sans text-slate-900 font-semibold">
                        {config.name} ({config.unit})
                      </td>
                      {series.map(s => (
                        <td
                          key={s.year}
                          className={`py-2 px-3 text-right ${
                            s.year === selectedYear ? 'font-bold text-emerald-800 bg-emerald-50/50' : 'text-slate-700'
                          }`}
                        >
                          {s.totalAnnual.toLocaleString('pt-BR')}
                        </td>
                      ))}
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        {config.sexenniumTarget.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            isFav ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isFav ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                          {delta > 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Info Ribbon */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-3 border-t border-slate-100 mt-3">
        <div className="flex items-center gap-2">
          <Award className="w-3.5 h-3.5 text-emerald-600" />
          <span>
            Ciclo Institucional PLS (Portaria SJRR/DIREF e Resoluções CNJ nº 400/2021 & 594/2024).
          </span>
        </div>
        <div className="font-mono text-[10px] text-slate-400">
          {activeYears.length} exercícios comparados ({startYear} a {endYear}) • Clique em qualquer card para ver detalhes
        </div>
      </div>
    </div>
  );
};
