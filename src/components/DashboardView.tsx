import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PlusCircle,
  UploadCloud,
  FileSpreadsheet,
  MessageSquare,
  Zap,
  Droplet,
  Fuel,
  Navigation,
  Gauge,
  Search,
  Filter,
  BarChart3,
  Calendar,
  Sparkles,
  FileText,
  Printer,
  ChevronDown,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  LayoutGrid,
  Columns,
  Eye,
  EyeOff,
  Check,
  GripVertical,
  ChevronsUp,
  ChevronsDown,
  GlassWater,
  Package,
  Coffee,
  Trash2,
  X
} from 'lucide-react';
import {
  Indicator,
  IndicatorMeasurement,
  IndicatorTarget,
  ActionPlan,
  PLSTheme,
  InconsistencyAlert,
  IndicatorCalculationResult
} from '../types';
import {
  MonthlyConsumptionLineChart,
  TrajectoryForecastChart,
  SustainabilityIndexCard,
  FleetEfficiencyChart,
  StatusPill
} from './Charts';
import { SexenniumBarComparisonCard } from './SexenniumBarComparisonCard';
import { IndicatorSexenniumBarCard } from './IndicatorSexenniumBarCard';

interface DashboardViewProps {
  indicators: Indicator[];
  measurements: IndicatorMeasurement[];
  targets: IndicatorTarget[];
  themes: PLSTheme[];
  actionPlans: ActionPlan[];
  alerts: InconsistencyAlert[];
  performances: { indicator: Indicator; target?: IndicatorTarget; result: IndicatorCalculationResult }[];
  selectedYear: number;
  setSelectedYear: (y: number) => void;
  onOpenDataIngestion: (indicatorId?: string) => void;
  onOpenSpreadsheetImport: () => void;
  onOpenDocumentUpload: () => void;
  onOpenChatWithQuery: (q: string) => void;
  onSelectIndicator: (indicator: Indicator) => void;
}

const DEFAULT_CARD_ORDER = [
  'energy',
  'water',
  'fuel',
  'mileage',
  'efficiency',
  'paper'
];

const CARD_METADATA: Record<string, { title: string; category: string; icon: string }> = {
  energy: { title: 'Consumo de Energia Elétrica (CEE)', category: 'Utilidades', icon: 'Zap' },
  water: { title: 'Consumo de Água Potável (CA)', category: 'Utilidades', icon: 'Droplet' },
  fuel: { title: 'Consumo de Combustível (CG)', category: 'Frota Oficial', icon: 'Fuel' },
  mileage: { title: 'Quilômetros Rodados (Km)', category: 'Frota Oficial', icon: 'Navigation' },
  efficiency: { title: 'Rendimento Médio da Frota (Km/L)', category: 'Eficiência', icon: 'Fuel' },
  paper: { title: 'Consumo de Papel A4 (CPP)', category: 'Desmaterialização', icon: 'FileText' }
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  indicators,
  measurements,
  targets,
  themes,
  actionPlans,
  alerts,
  performances,
  selectedYear,
  setSelectedYear,
  onOpenDataIngestion,
  onOpenSpreadsheetImport,
  onOpenDocumentUpload,
  onOpenChatWithQuery,
  onSelectIndicator
}) => {
  const [selectedThemeFilter, setSelectedThemeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTabSection, setActiveTabSection] = useState<'CONSUMO_MENSAL' | 'SEXENNIUM' | 'ISP' | 'TRAJETORIA' | 'TODOS'>('CONSUMO_MENSAL');
  const [sexenniumGalleryCategory, setSexenniumGalleryCategory] = useState<'ALL' | 'MATERIAIS' | 'UTILIDADES' | 'FROTA'>('ALL');

  // Card Reordering & Organization State (Persisted in localStorage)
  const [cardOrder, setCardOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sispls_dashboard_card_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter(id => id !== 'sexennium' && id !== 'isp');
          if (filtered.length > 0) return filtered;
        }
      }
    } catch (e) {}
    return DEFAULT_CARD_ORDER;
  });

  // Card Visibility State (Persisted in localStorage)
  const [hiddenCards, setHiddenCards] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sispls_dashboard_hidden_cards');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [layoutColumns, setLayoutColumns] = useState<'2_COL' | '1_COL'>(() => {
    try {
      const saved = localStorage.getItem('sispls_dashboard_layout_cols');
      if (saved === '1_COL' || saved === '2_COL') return saved;
    } catch (e) {}
    return '2_COL';
  });

  const [isReorderModalOpen, setIsReorderModalOpen] = useState<boolean>(false);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);

  const toggleLayoutColumns = (cols: '2_COL' | '1_COL') => {
    setLayoutColumns(cols);
    try {
      localStorage.setItem('sispls_dashboard_layout_cols', cols);
    } catch (e) {}
  };

  const toggleCardVisibility = (id: string) => {
    setHiddenCards(prev => {
      const updated = prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id];
      try {
        localStorage.setItem('sispls_dashboard_hidden_cards', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const showAllCards = () => {
    setHiddenCards([]);
    try {
      localStorage.removeItem('sispls_dashboard_hidden_cards');
    } catch (e) {}
  };

  const handleDragStart = (id: string) => {
    setDraggedCardId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!draggedCardId || draggedCardId === targetId) return;
    setCardOrder(prev => {
      const oldIdx = prev.indexOf(draggedCardId);
      const newIdx = prev.indexOf(targetId);
      if (oldIdx === -1 || newIdx === -1) return prev;
      const copy = [...prev];
      copy.splice(oldIdx, 1);
      copy.splice(newIdx, 0, draggedCardId);
      try {
        localStorage.setItem('sispls_dashboard_card_order', JSON.stringify(copy));
      } catch (e) {}
      return copy;
    });
    setDraggedCardId(null);
  };

  // Reordering functions
  const moveCard = (id: string, dir: 'up' | 'down') => {
    setCardOrder(prev => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      try {
        localStorage.setItem('sispls_dashboard_card_order', JSON.stringify(copy));
      } catch (e) {}
      return copy;
    });
  };

  const moveToTop = (id: string) => {
    setCardOrder(prev => {
      const filtered = prev.filter(c => c !== id);
      const updated = [id, ...filtered];
      try {
        localStorage.setItem('sispls_dashboard_card_order', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const moveToBottom = (id: string) => {
    setCardOrder(prev => {
      const filtered = prev.filter(c => c !== id);
      const updated = [...filtered, id];
      try {
        localStorage.setItem('sispls_dashboard_card_order', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const applyPreset = (preset: 'DEFAULT' | 'FLEET_FIRST' | 'ENERGY_FIRST' | 'METAS_FIRST') => {
    let newOrder = [...DEFAULT_CARD_ORDER];
    if (preset === 'FLEET_FIRST') {
      newOrder = ['fuel', 'mileage', 'efficiency', 'energy', 'water', 'paper'];
    } else if (preset === 'ENERGY_FIRST') {
      newOrder = ['energy', 'water', 'paper', 'fuel', 'mileage', 'efficiency'];
    } else if (preset === 'METAS_FIRST') {
      newOrder = ['energy', 'water', 'fuel', 'mileage', 'paper', 'efficiency'];
    }
    setCardOrder(newOrder);
    setHiddenCards([]);
    try {
      localStorage.setItem('sispls_dashboard_card_order', JSON.stringify(newOrder));
      localStorage.removeItem('sispls_dashboard_hidden_cards');
    } catch (e) {}
  };

  const resetOrder = () => {
    setCardOrder(DEFAULT_CARD_ORDER);
    setHiddenCards([]);
    try {
      localStorage.removeItem('sispls_dashboard_card_order');
      localStorage.removeItem('sispls_dashboard_hidden_cards');
    } catch (e) {}
  };

  const visibleCards = cardOrder.filter(id => !hiddenCards.includes(id));

  // Key KPI Counts
  const totalMonitored = performances.length;
  const inCompliance = performances.filter(p => p.result.status === 'EM_CONFORMIDADE' || p.result.status === 'META_ATINGIDA').length;
  const inAttention = performances.filter(p => p.result.status === 'ATENCAO').length;
  const inRisk = performances.filter(p => p.result.status === 'RISCO').length;

  // Active critical alerts (filtered for the currently selected year)
  const activeAlerts = alerts.filter(a => !a.resolved && a.year === selectedYear);
  const [isAlertDismissed, setIsAlertDismissed] = useState<boolean>(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState<boolean>(false);

  // Dynamic current and previous year based on selectedYear (Cycle 2021-2026)
  const currYear = selectedYear;
  const prevYear = selectedYear > 2021 ? selectedYear - 1 : 2021;

  // Helper to extract monthly data for current and comparison year
  const getSeries = (indicatorId: string) => {
    const dataPrev = Array(12).fill(null);
    const dataCurr = Array(12).fill(null);

    measurements
      .filter(m => (m.indicatorId === indicatorId || 
                   (indicatorId === 'indicator-6-1' && m.indicatorId === 'ind-energia-kwh') ||
                   (indicatorId === 'indicator-7-1' && m.indicatorId === 'ind-agua-m3') ||
                   (indicatorId === 'indicator-2-1' && m.indicatorId === 'ind-papel-resmas') ||
                   (indicatorId === 'indicator-12-1' && m.indicatorId === 'ind-telefonia-reais') ||
                   (indicatorId === 'indicator-14-1' && m.indicatorId === 'ind-combustivel-litros') ||
                   (indicatorId === 'indicator-13-1' && m.indicatorId === 'ind-frota-km')) && m.year === prevYear)
      .forEach(m => {
        dataPrev[m.month - 1] = m.value;
      });

    measurements
      .filter(m => (m.indicatorId === indicatorId || 
                   (indicatorId === 'indicator-6-1' && m.indicatorId === 'ind-energia-kwh') ||
                   (indicatorId === 'indicator-7-1' && m.indicatorId === 'ind-agua-m3') ||
                   (indicatorId === 'indicator-2-1' && m.indicatorId === 'ind-papel-resmas') ||
                   (indicatorId === 'indicator-12-1' && m.indicatorId === 'ind-telefonia-reais') ||
                   (indicatorId === 'indicator-14-1' && m.indicatorId === 'ind-combustivel-litros') ||
                   (indicatorId === 'indicator-13-1' && m.indicatorId === 'ind-frota-km')) && m.year === currYear)
      .forEach(m => {
        dataCurr[m.month - 1] = m.value;
      });

    return {
      dataPrev,
      dataCurr,
      data2025: dataPrev, // alias for backwards compatibility
      data2026: dataCurr
    };
  };

  // Series
  const energySeries = getSeries('indicator-6-1');
  const fuelSeries = getSeries('indicator-14-1');
  const mileageSeries = getSeries('indicator-13-1');
  const waterSeries = getSeries('indicator-7-1');
  const paperSeries = getSeries('indicator-2-1');

  // Targets with historical annual progression towards 2026 CNJ goals
  const annualTargetByYear: Record<string, Record<number, number>> = {
    'indicator-6-1': { 2021: 246500, 2022: 234200, 2023: 219800, 2024: 208400, 2025: 198200, 2026: 174000 },
    'indicator-14-1': { 2021: 10450, 2022: 9800, 2023: 9250, 2024: 8640, 2025: 8210, 2026: 8160 },
    'indicator-13-1': { 2021: 88200, 2022: 82500, 2023: 78900, 2024: 74200, 2025: 71500, 2026: 68000 },
    'indicator-7-1': { 2021: 2480, 2022: 2360, 2023: 2210, 2024: 2095, 2025: 1980, 2026: 2160 },
    'indicator-2-1': { 2021: 740, 2022: 660, 2023: 590, 2024: 535, 2025: 485, 2026: 600 }
  };

  const getTargetForIndicator = (indicatorId: string, year: number, fallback: number) => {
    const fromProps = targets.find(t => t.indicatorId === indicatorId && t.year === year)?.targetValue;
    if (fromProps) return fromProps;
    return annualTargetByYear[indicatorId]?.[year] || fallback;
  };

  const energyTarget = getTargetForIndicator('indicator-6-1', selectedYear, 174000);
  const fuelTarget = getTargetForIndicator('indicator-14-1', selectedYear, 8160);
  const mileageTarget = getTargetForIndicator('indicator-13-1', selectedYear, 68000);
  const waterTarget = getTargetForIndicator('indicator-7-1', selectedYear, 2160);
  const paperTarget = getTargetForIndicator('indicator-2-1', selectedYear, 600);

  const energyMonthlyTarget = Math.round(energyTarget / 12);
  const fuelMonthlyTarget = Math.round(fuelTarget / 12);
  const mileageMonthlyTarget = Math.round(mileageTarget / 12);
  const waterMonthlyTarget = Math.round(waterTarget / 12);
  const paperMonthlyTarget = Math.round(paperTarget / 12);

  // Comparison period sums (Jan-Ago if 2026, or Jan-Dez if completed year)
  const maxEvalMonth = currYear === 2026 ? 8 : 12;
  const sumEvalPeriod = (series: (number | null)[]) =>
    series.slice(0, maxEvalMonth).filter((v): v is number => v !== null).reduce((a, b) => a + b, 0);

  const energy26 = sumEvalPeriod(energySeries.dataCurr);
  const energy25 = sumEvalPeriod(energySeries.dataPrev);
  const energyDelta = energy25 > 0 ? ((energy26 - energy25) / energy25) * 100 : 0;

  const fuel26 = sumEvalPeriod(fuelSeries.dataCurr);
  const fuel25 = sumEvalPeriod(fuelSeries.dataPrev);
  const fuelDelta = fuel25 > 0 ? ((fuel26 - fuel25) / fuel25) * 100 : 0;

  const km26 = sumEvalPeriod(mileageSeries.dataCurr);
  const km25 = sumEvalPeriod(mileageSeries.dataPrev);
  const kmDelta = km25 > 0 ? ((km26 - km25) / km25) * 100 : 0;

  // Sustainability Index Dimensions
  const ispDimensions = [
    { name: 'Energia Elétrica (CEE / CRE)', score: 79, weight: 20, status: 'ATENCAO' as const },
    { name: 'Água e Efluentes (CA / CRA)', score: 95, weight: 15, status: 'EXCELENTE' as const },
    { name: 'Combustível e Eficiência da Frota (CG / Km)', score: 92, weight: 15, status: 'EXCELENTE' as const },
    { name: 'Eliminação de Copos Plásticos (Descarte Zero)', score: 100, weight: 10, status: 'EXCELENTE' as const },
    { name: 'Papel A4 e Impressões (CPP / QI)', score: 91, weight: 15, status: 'EXCELENTE' as const },
    { name: 'Destinação de Resíduos Recicláveis (TMR)', score: 94, weight: 10, status: 'EXCELENTE' as const },
    { name: 'Telefonia e Telecomunicações (GTF)', score: 72, weight: 15, status: 'ATENCAO' as const }
  ];

  const currentIspScore = Number(
    ispDimensions.reduce((acc, d) => acc + (d.score * d.weight) / 100, 0).toFixed(1)
  );
  const previousYearIsp = 81.2;

  // Filtered indicators for the bottom table
  const filteredPerformances = performances.filter(item => {
    if (selectedThemeFilter !== 'ALL' && item.indicator.themeId !== selectedThemeFilter) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.indicator.name.toLowerCase().includes(q) ||
        item.indicator.code.toLowerCase().includes(q) ||
        (item.indicator.acronym && item.indicator.acronym.toLowerCase().includes(q)) ||
        (item.indicator.cnjIndicatorCode && item.indicator.cnjIndicatorCode.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Helper to extract 6-year bar series (2021-2026) for each indicator
  const getSexenniumBarsForIndicator = (indicatorId: string, aliases: string[] = [], defaultTarget?: number) => {
    return [2021, 2022, 2023, 2024, 2025, 2026].map(y => {
      const yearMeas = measurements.filter(m => (m.indicatorId === indicatorId || aliases.includes(m.indicatorId)) && m.year === y);
      const validMonthly = yearMeas.filter(m => m.month >= 1 && m.month <= 12 && m.value !== null && m.value !== undefined);
      const reported = validMonthly.length;
      const sumVal = validMonthly.reduce((acc, curr) => acc + curr.value, 0);

      let val = sumVal;
      const isPartial = y === 2026 && reported > 0 && reported < 12;
      if (isPartial) {
        val = Math.round((sumVal / reported) * 12);
      }
      return {
        year: y,
        value: val,
        isPartial,
        target: defaultTarget
      };
    });
  };

  const paperBars = getSexenniumBarsForIndicator('indicator-2-1', ['ind-papel-resmas', '2.1', 'CPP'], 600);
  const waterBars = getSexenniumBarsForIndicator('indicator-7-1', ['ind-agua-m3', '7.1', 'CA'], 2160);
  const cupsBars = getSexenniumBarsForIndicator('indicator-3-1', ['ind-copos-centenas', '3.1', 'CD'], 0);
  const bottlesBars = getSexenniumBarsForIndicator('indicator-4-1', ['ind-garrafas-descartaveis', '4.1', 'GDA'], 0);
  const carboysBars = getSexenniumBarsForIndicator('indicator-4-2', ['ind-garrafoes-20l', '4.2', 'GAR'], 1800);
  const printBars = getSexenniumBarsForIndicator('indicator-5-1', ['ind-impressao-paginas', '5.1', 'QI'], 216000);
  const energyBars = getSexenniumBarsForIndicator('indicator-6-1', ['ind-energia-kwh', '6.1', 'CEE'], 174000);
  const fuelBars = getSexenniumBarsForIndicator('indicator-14-1', ['ind-combustivel-litros', '14.1', 'CG'], 8160);
  const mileageBars = getSexenniumBarsForIndicator('indicator-13-1', ['ind-frota-km', '13.1'], 68000);
  const recycleBars = getSexenniumBarsForIndicator('indicator-8-1', ['ind-residuos-kg', '8.1', '8.6', 'TMR'], 4560);

  // Render individual card by ID
  const renderCardById = (cardId: string) => {
    switch (cardId) {
      case 'energy':
        return (
          <MonthlyConsumptionLineChart
            key="energy"
            title="Consumo de Energia Elétrica Mês a Mês (CEE)"
            code="6.1"
            unit="kWh"
            data2025={energySeries.dataPrev}
            data2026={energySeries.dataCurr}
            currentYear={currYear}
            previousYear={prevYear}
            monthlyTarget={energyMonthlyTarget}
            annualTarget={energyTarget}
            icon={<Zap className="w-5 h-5 text-amber-600" />}
            primaryColor="amber"
            invertGoodDirection={true}
          />
        );

      case 'water':
        return (
          <MonthlyConsumptionLineChart
            key="water"
            title="Consumo de Água Potável Mês a Mês (CA)"
            code="7.1"
            unit="m³"
            data2025={waterSeries.dataPrev}
            data2026={waterSeries.dataCurr}
            currentYear={currYear}
            previousYear={prevYear}
            monthlyTarget={waterMonthlyTarget}
            annualTarget={waterTarget}
            icon={<Droplet className="w-5 h-5 text-cyan-600" />}
            primaryColor="cyan"
            invertGoodDirection={true}
          />
        );

      case 'fuel':
        return (
          <MonthlyConsumptionLineChart
            key="fuel"
            title="Consumo de Combustível Mês a Mês (CG)"
            code="14.1"
            unit="litros"
            data2025={fuelSeries.dataPrev}
            data2026={fuelSeries.dataCurr}
            currentYear={currYear}
            previousYear={prevYear}
            monthlyTarget={fuelMonthlyTarget}
            annualTarget={fuelTarget}
            icon={<Fuel className="w-5 h-5 text-orange-600" />}
            primaryColor="orange"
            invertGoodDirection={true}
          />
        );

      case 'mileage':
        return (
          <MonthlyConsumptionLineChart
            key="mileage"
            title="Quilômetros Rodados Mês a Mês (Km)"
            code="13.1"
            unit="km"
            data2025={mileageSeries.dataPrev}
            data2026={mileageSeries.dataCurr}
            currentYear={currYear}
            previousYear={prevYear}
            monthlyTarget={mileageMonthlyTarget}
            annualTarget={mileageTarget}
            icon={<Navigation className="w-5 h-5 text-blue-600" />}
            primaryColor="blue"
            invertGoodDirection={true}
          />
        );

      case 'efficiency':
        return (
          <FleetEfficiencyChart
            key="efficiency"
            fuel2025={fuelSeries.dataPrev}
            fuel2026={fuelSeries.dataCurr}
            km2025={mileageSeries.dataPrev}
            km2026={mileageSeries.dataCurr}
            currentYear={currYear}
            previousYear={prevYear}
          />
        );

      case 'paper':
        return (
          <MonthlyConsumptionLineChart
            key="paper"
            title="Consumo de Papel Próprio A4 Mês a Mês (CPP)"
            code="2.1"
            unit="resmas"
            data2025={paperSeries.dataPrev}
            data2026={paperSeries.dataCurr}
            currentYear={currYear}
            previousYear={prevYear}
            monthlyTarget={paperMonthlyTarget}
            annualTarget={paperTarget}
            icon={<FileText className="w-5 h-5 text-emerald-600" />}
            primaryColor="emerald"
            invertGoodDirection={true}
          />
        );

      case 'sexennium':
        return (
          <div key="sexennium" className={layoutColumns === '2_COL' ? 'lg:col-span-2' : ''}>
            <SexenniumBarComparisonCard
              measurements={measurements}
              targets={targets}
              indicators={indicators}
              selectedYear={selectedYear}
              onSelectYear={setSelectedYear}
            />
          </div>
        );

      case 'isp':
        return (
          <div key="isp" className={layoutColumns === '2_COL' ? 'lg:col-span-2' : ''}>
            <SustainabilityIndexCard
              score={currentIspScore}
              previousYearScore={previousYearIsp}
              currentYear={currYear}
              previousYear={prevYear}
              dimensions={ispDimensions}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Clean Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="text-xs font-semibold text-emerald-800 tracking-wider uppercase">
            Plano de Logística Sustentável · SJRR / TRF1
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
            {activeTabSection === 'SEXENNIUM'
              ? 'Evolução do Sexênio (2021 a 2026)'
              : `Acompanhamento Executivo (${selectedYear})`}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeTabSection === 'SEXENNIUM'
              ? 'Análise comparativa das metas de papel, água, copos, garrafas, impressões, energia e frota.'
              : 'Desempenho mensal em relação às metas homologadas pelo CNJ.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year Selector */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            {[2021, 2022, 2023, 2024, 2025, 2026].map(y => (
              <button
                key={y}
                onClick={() => {
                  setSelectedYear(y);
                  if (activeTabSection === 'SEXENNIUM') {
                    setActiveTabSection('CONSUMO_MENSAL');
                  }
                }}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                  activeTabSection !== 'SEXENNIUM' && selectedYear === y
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {y}
              </button>
            ))}
          </div>

          {/* Quick Action: Lançar Mês */}
          <button
            onClick={() => onOpenDataIngestion()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Lançar Mês</span>
          </button>

          {/* Dropdown for Secondary Tools */}
          <div className="relative">
            <button
              onClick={() => setShowActionsDropdown(!showActionsDropdown)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors border border-slate-200"
            >
              <span>Ações</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {showActionsDropdown && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowActionsDropdown(false)}
                />
                <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl border border-slate-200 shadow-lg p-1.5 z-40 text-xs space-y-0.5">
                  <button
                    onClick={() => {
                      onOpenSpreadsheetImport();
                      setShowActionsDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors text-left"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Importar Planilha</span>
                  </button>
                  <button
                    onClick={() => {
                      onOpenDocumentUpload();
                      setShowActionsDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors text-left"
                  >
                    <UploadCloud className="w-4 h-4 text-blue-600" />
                    <span>Fatura / OCR</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsReorderModalOpen(true);
                      setShowActionsDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors text-left"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-slate-600" />
                    <span>Personalizar Cards</span>
                  </button>
                  <button
                    onClick={() => {
                      onOpenChatWithQuery(`Faça uma análise executiva detalhada do consumo mês a mês em ${selectedYear}.`);
                      setShowActionsDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors text-left"
                  >
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Diagnóstico IA</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Discreet Dismissible Alert Banner */}
      {activeAlerts.length > 0 && !isAlertDismissed && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200/90 text-xs text-amber-900 transition-all">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="line-clamp-1">
              <strong>Atenção Gestores:</strong> {activeAlerts[0].message}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => onOpenChatWithQuery(`Explique a anomalia de consumo em ${selectedYear}.`)}
              className="font-semibold underline hover:text-amber-950"
            >
              Ver Detalhes
            </button>
            <button
              onClick={() => setIsAlertDismissed(true)}
              className="p-1 rounded text-amber-600 hover:text-amber-900"
              title="Fechar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Strategic KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Energia */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-700">Energia Elétrica</span>
            </div>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                energyDelta <= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
              }`}
            >
              {energyDelta <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
              {energyDelta > 0 ? `+${energyDelta.toFixed(1)}%` : `${energyDelta.toFixed(1)}%`} vs {prevYear}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {Math.round(energy26).toLocaleString('pt-BR')}{' '}
              <span className="text-xs font-normal text-slate-400">kWh</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Média: <strong>{Math.round(energy26 / maxEvalMonth).toLocaleString('pt-BR')}</strong> kWh/mês</span>
              <span>Meta: <strong>{energyMonthlyTarget.toLocaleString('pt-BR')}</strong>/mês</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Combustível */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600">
                <Fuel className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-700">Combustível Total</span>
            </div>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                fuelDelta <= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
              }`}
            >
              {fuelDelta <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
              {fuelDelta > 0 ? `+${fuelDelta.toFixed(1)}%` : `${fuelDelta.toFixed(1)}%`} vs {prevYear}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {Math.round(fuel26).toLocaleString('pt-BR')}{' '}
              <span className="text-xs font-normal text-slate-400">litros</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Média: <strong>{Math.round(fuel26 / maxEvalMonth).toLocaleString('pt-BR')}</strong> L/mês</span>
              <span>Meta: <strong>{fuelMonthlyTarget.toLocaleString('pt-BR')}</strong>/mês</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Frota */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <Navigation className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-700">Frota Oficial</span>
            </div>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                kmDelta <= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
              }`}
            >
              {kmDelta <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
              {kmDelta > 0 ? `+${kmDelta.toFixed(1)}%` : `${kmDelta.toFixed(1)}%`} vs {prevYear}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {Math.round(km26).toLocaleString('pt-BR')}{' '}
              <span className="text-xs font-normal text-slate-400">km</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Média: <strong>{Math.round(km26 / maxEvalMonth).toLocaleString('pt-BR')}</strong> km/mês</span>
              <span>Meta: <strong>{mileageMonthlyTarget.toLocaleString('pt-BR')}</strong>/mês</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Índice Geral ISP */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <Gauge className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-700">Índice PLS (CNJ 400)</span>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-emerald-700 bg-emerald-50 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              +{(currentIspScore - previousYearIsp).toFixed(1)} pts
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-emerald-700 tracking-tight">
              {currentIspScore.toFixed(1)}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Status: <strong className="text-emerald-700">Conforme</strong></span>
              <span>Meta CNJ: <strong>≥ 80%</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTabSection('CONSUMO_MENSAL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTabSection === 'CONSUMO_MENSAL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Consumo Mês a Mês
          </button>
          <button
            onClick={() => setActiveTabSection('SEXENNIUM')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTabSection === 'SEXENNIUM'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Evolução do Sexênio (2021–2026)
          </button>
          <button
            onClick={() => setActiveTabSection('ISP')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTabSection === 'ISP'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Governança & ISP (CNJ 400)
          </button>
          <button
            onClick={() => setActiveTabSection('TRAJETORIA')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTabSection === 'TRAJETORIA'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Trajetória & Metas
          </button>
          <button
            onClick={() => setActiveTabSection('TODOS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTabSection === 'TODOS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Todos os Indicadores ({totalMonitored})
          </button>
        </div>

        {activeTabSection === 'CONSUMO_MENSAL' && (
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => toggleLayoutColumns('2_COL')}
                className={`p-1.5 rounded-md transition-all ${
                  layoutColumns === '2_COL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="2 Colunas"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => toggleLayoutColumns('1_COL')}
                className={`p-1.5 rounded-md transition-all ${
                  layoutColumns === '1_COL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="1 Coluna"
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 1: GRÁFICOS DE CONSUMO MÊS A MÊS */}
      {activeTabSection === 'CONSUMO_MENSAL' && (
        <div className="space-y-6">
          {/* Cards Grid */}
          {visibleCards.length > 0 ? (
            <div
              className={
                layoutColumns === '2_COL'
                  ? 'grid grid-cols-1 lg:grid-cols-2 gap-6'
                  : 'space-y-6'
              }
            >
              {visibleCards.map(cardId => renderCardById(cardId))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
              <EyeOff className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-800">Todos os cards estão ocultos</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4 max-w-md mx-auto">
                Você ocultou todos os gráficos de consumo no painel. Clique no botão abaixo para restaurar todos os cards visíveis.
              </p>
              <button
                onClick={showAllCards}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                Exibir Todos os Cards
              </button>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: BARRAS DE COMPARAÇÃO ANO A ANO DO SEXÊNIO (2021 A 2026) */}
      {activeTabSection === 'SEXENNIUM' && (
        <div className="space-y-4">
          <SexenniumBarComparisonCard
            measurements={measurements}
            targets={targets}
            indicators={indicators}
            selectedYear={selectedYear}
            onSelectYear={setSelectedYear}
          />
        </div>
      )}

      {/* SECTION: GOVERNANÇA & ÍNDICE DE SUSTENTABILIDADE (ISP - RESOLUÇÃO CNJ 400) */}
      {activeTabSection === 'ISP' && (
        <div className="space-y-6">
          <SustainabilityIndexCard
            score={currentIspScore}
            previousYearScore={previousYearIsp}
            currentYear={currYear}
            previousYear={prevYear}
            dimensions={ispDimensions}
          />
        </div>
      )}

      {/* SECTION 3: TRAJETÓRIA DE ALCANCE & FORECAST */}
      {activeTabSection === 'TRAJETORIA' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrajectoryForecastChart
              title="Trajetória de Alcance — Energia Elétrica"
              indicatorCode="6.1 — CEE"
              unit="kWh"
              monthlyActual2026={energySeries.data2026}
              annualTarget={energyTarget}
            />

            <TrajectoryForecastChart
              title="Trajetória de Alcance — Combustível da Frota"
              indicatorCode="14.1 — CG"
              unit="litros"
              monthlyActual2026={fuelSeries.data2026}
              annualTarget={fuelTarget}
            />

            <TrajectoryForecastChart
              title="Trajetória de Alcance — Quilômetros Rodados"
              indicatorCode="13.1 — Km"
              unit="km"
              monthlyActual2026={mileageSeries.data2026}
              annualTarget={mileageTarget}
            />

            <TrajectoryForecastChart
              title="Trajetória de Alcance — Consumo de Água"
              indicatorCode="7.1 — CA"
              unit="m³"
              monthlyActual2026={waterSeries.data2026}
              annualTarget={waterTarget}
            />
          </div>
        </div>
      )}

      {/* SECTION 3: TABELA COMPLETA DE INDICADORES CNJ */}
      {activeTabSection === 'TODOS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-slate-50/60">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Painel Consolidado de Indicadores e Metas — Exercício {selectedYear}
              </h3>
              <p className="text-xs text-slate-500">
                {filteredPerformances.length} indicadores com baseline de 2025 e projeção para 2026.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar código ou nome..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedThemeFilter}
                  onChange={e => setSelectedThemeFilter(e.target.value)}
                  className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                >
                  <option value="ALL">Todos os Temas ({themes.length})</option>
                  {themes.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Código / Indicador</th>
                  <th className="py-3 px-3">Unidade</th>
                  <th className="py-3 px-3 text-right">Baseline (2025)</th>
                  <th className="py-3 px-3 text-right">Meta ({selectedYear})</th>
                  <th className="py-3 px-3 text-right">Realizado (Jan-Ago)</th>
                  <th className="py-3 px-3 text-right">Projeção Anual</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPerformances.map(item => {
                  const ind = item.indicator;
                  const res = item.result;
                  const isOverBudget = ind.targetDirection === 'MENOR_MELHOR' && res.annualProjection > res.targetValue;

                  return (
                    <tr
                      key={ind.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => onSelectIndicator(ind)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                            {ind.code}
                          </span>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {ind.name}
                              {ind.acronym && (
                                <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1 rounded">
                                  {ind.acronym}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {ind.periodicity} • {ind.responsibleUnit || 'Gestão Socioambiental'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-600">{ind.unit}</td>

                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {res.baselineValue.toLocaleString('pt-BR')}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800">
                        {res.targetValue.toLocaleString('pt-BR')}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {res.accumulatedValue.toLocaleString('pt-BR')}
                      </td>

                      <td className="py-3 px-3 text-right font-mono">
                        <span
                          className={`font-semibold ${
                            isOverBudget ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          {res.annualProjection.toLocaleString('pt-BR')}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <StatusPill status={res.status} />
                      </td>

                      <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onSelectIndicator(ind)}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold"
                            title="Ver detalhes e fórmulas"
                          >
                            Detalhes
                          </button>
                          <button
                            onClick={() => onOpenDataIngestion(ind.id)}
                            className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold"
                            title="Lançar valor"
                          >
                            + Dado
                          </button>
                          <button
                            onClick={() => onOpenChatWithQuery(`Analise o indicador ${ind.name} (${ind.code}) e a meta de ${selectedYear}`)}
                            className="p-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
                            title="Perguntar à IA sobre este indicador"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
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

      {/* =========================================================================
          MODAL DE PERSONALIZAÇÃO & REORDENAÇÃO DOS CARDS
          ========================================================================= */}
      {isReorderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-900 text-white">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Organização dos Cards do Painel
                  </h3>
                  <p className="text-xs text-slate-500">
                    Defina a ordem em que os gráficos de consumo serão exibidos.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsReorderModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Presets Row */}
            <div className="p-4 border-b border-slate-100 bg-white">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-2">
                Predefinições Rápidas de Sequência:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <button
                  onClick={() => applyPreset('DEFAULT')}
                  className="p-2 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 text-left font-semibold text-slate-800 transition-colors"
                >
                  <span className="block text-[10px] text-slate-400 font-normal">Padrão</span>
                  🎯 Institucional
                </button>
                <button
                  onClick={() => applyPreset('FLEET_FIRST')}
                  className="p-2 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/40 text-left font-semibold text-slate-800 transition-colors"
                >
                  <span className="block text-[10px] text-slate-400 font-normal">Foco Frota</span>
                  🚗 Combustível / Km
                </button>
                <button
                  onClick={() => applyPreset('ENERGY_FIRST')}
                  className="p-2 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/40 text-left font-semibold text-slate-800 transition-colors"
                >
                  <span className="block text-[10px] text-slate-400 font-normal">Utilidades</span>
                  ⚡ Energia & Água
                </button>
                <button
                  onClick={() => applyPreset('METAS_FIRST')}
                  className="p-2 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 text-left font-semibold text-slate-800 transition-colors"
                >
                  <span className="block text-[10px] text-slate-400 font-normal">Governança</span>
                  📊 ISP & Metas
                </button>
              </div>
            </div>

            {/* Card Order List with HTML5 Drag & Drop and Visibility Toggles */}
            <div className="p-4 max-h-96 overflow-y-auto space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  Cards e Sequência (arraste ou use as setas):
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {cardOrder.length - hiddenCards.length} de {cardOrder.length} visíveis
                </span>
              </div>

              {cardOrder.map((id, index) => {
                const meta = CARD_METADATA[id] || { title: id, category: 'Geral', icon: 'BarChart' };
                const isFirst = index === 0;
                const isLast = index === cardOrder.length - 1;
                const isHidden = hiddenCards.includes(id);
                const isBeingDragged = draggedCardId === id;

                return (
                  <div
                    key={id}
                    draggable
                    onDragStart={() => handleDragStart(id)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
                      isBeingDragged
                        ? 'border-emerald-500 bg-emerald-50/60 shadow-md'
                        : isHidden
                        ? 'border-slate-200 bg-slate-50/60 opacity-60'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="text-slate-400 hover:text-slate-600 p-0.5" title="Arraste para mover">
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold font-mono text-[11px] flex items-center justify-center">
                        {index + 1}
                      </span>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className={`text-xs font-bold ${isHidden ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                            {meta.title}
                          </h4>
                          {isHidden && (
                            <span className="text-[9px] font-mono px-1 rounded bg-slate-200 text-slate-600">
                              Oculto
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block">{meta.category}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Toggle Visibility */}
                      <button
                        onClick={() => toggleCardVisibility(id)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          isHidden
                            ? 'border-slate-200 bg-slate-100 text-slate-400 hover:text-slate-700'
                            : 'border-slate-200 bg-white text-emerald-700 hover:bg-emerald-50'
                        }`}
                        title={isHidden ? 'Exibir este card no painel' : 'Ocultar este card do painel'}
                      >
                        {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>

                      {/* Move to Top */}
                      <button
                        onClick={() => moveToTop(id)}
                        disabled={isFirst}
                        className={`p-1.5 rounded-lg border border-slate-200 transition-colors ${
                          isFirst ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                        title="Mover direto para o topo"
                      >
                        <ChevronsUp className="w-3.5 h-3.5" />
                      </button>

                      {/* Move Up */}
                      <button
                        onClick={() => moveCard(id, 'up')}
                        disabled={isFirst}
                        className={`p-1.5 rounded-lg border border-slate-200 transition-colors ${
                          isFirst ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                        title="Subir uma posição"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      {/* Move Down */}
                      <button
                        onClick={() => moveCard(id, 'down')}
                        disabled={isLast}
                        className={`p-1.5 rounded-lg border border-slate-200 transition-colors ${
                          isLast ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                        title="Descer uma posição"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Move to Bottom */}
                      <button
                        onClick={() => moveToBottom(id)}
                        disabled={isLast}
                        className={`p-1.5 rounded-lg border border-slate-200 transition-colors ${
                          isLast ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                        title="Mover direto para o final"
                      >
                        <ChevronsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={resetOrder}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                  title="Voltar à ordem padrão institucional"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restaurar Padrão
                </button>

                {hiddenCards.length > 0 && (
                  <button
                    onClick={showAllCards}
                    className="text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    Reexibir todos ({hiddenCards.length})
                  </button>
                )}
              </div>

              <button
                onClick={() => setIsReorderModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
