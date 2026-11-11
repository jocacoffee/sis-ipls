import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronUp,
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
  X,
  Phone,
  BookOpen,
  Award,
  ShieldCheck,
  Plus,
  Settings2,
  Maximize2,
  Minimize2,
  Layers,
  Copy,
  Users
} from 'lucide-react';
import {
  Indicator,
  IndicatorMeasurement,
  IndicatorTarget,
  ActionPlan,
  PLSTheme,
  InconsistencyAlert,
  IndicatorCalculationResult,
  Organization,
  IDSComplement
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
import { OrgContributionCard } from './OrgContributionCard';
import { IDSThermometerCard } from './IDSThermometerCard';
import {
  hasGeneralVariablesForYear,
  getLatestYearWithGeneralVariables,
  getGeneralVariablesSummary
} from '../utils/generalVariablesUtils';
import { getPlsCycleForYear } from '../utils/yearUtils';
import { calculateCNJIDS, scopeForOrganization } from '../services/idsCalculator';

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
  /** Só no perfil dev (módulo Documentos & OCR). */
  onOpenDocumentUpload?: () => void;
  onOpenChatWithQuery: (q: string) => void;
  onSelectIndicator: (indicator: Indicator) => void;
  onOpenReplicateModal?: () => void;
  organizationLabel?: string;
  organization?: Organization;
  idsComplements?: IDSComplement[];
}

// Ordem padrão inicial de cards no Painel Executivo
const DEFAULT_CARD_ORDER = [
  'ids_clock',
  'energy',
  'water',
  'fuel',
  'mileage',
  'efficiency',
  'paper'
];

// Metadados dos Cards Curados do Painel Executivo
const CURATED_CARD_METADATA: Record<string, { title: string; category: string; icon: string; code?: string; unit?: string }> = {
  ids_clock: {
    title: 'Relógio & Termômetro do IDS (Resolução CNJ nº 400/2021)',
    category: 'Governança & IDS',
    icon: 'Gauge',
    code: 'CNJ-IDS',
    unit: '%'
  },
  energy: {
    title: 'Consumo de Energia Elétrica (CEE)',
    category: 'Utilidades',
    icon: 'Zap',
    code: '6.1',
    unit: 'kWh'
  },
  water: {
    title: 'Consumo de Água Potável (CA)',
    category: 'Utilidades',
    icon: 'Droplet',
    code: '7.1',
    unit: 'm³'
  },
  fuel: {
    title: 'Consumo de Combustível da Frota (CG)',
    category: 'Frota Oficial',
    icon: 'Fuel',
    code: '14.1',
    unit: 'litros'
  },
  mileage: {
    title: 'Quilômetros Rodados da Frota (Km)',
    category: 'Frota Oficial',
    icon: 'Navigation',
    code: '13.1',
    unit: 'km'
  },
  efficiency: {
    title: 'Rendimento Médio da Frota (Km/L)',
    category: 'Frota Oficial',
    icon: 'Fuel',
    code: 'EFIC',
    unit: 'km/l'
  },
  paper: {
    title: 'Consumo de Papel A4 Próprio (CPP)',
    category: 'Desmaterialização',
    icon: 'FileText',
    code: '2.1',
    unit: 'resmas'
  },
  cups: {
    title: 'Copos Plásticos Descartáveis (CD)',
    category: 'Plásticos & Resíduos',
    icon: 'GlassWater',
    code: '3.1',
    unit: 'centenas'
  },
  bottles: {
    title: 'Garrafas Plásticas Descartáveis de Água (GDA)',
    category: 'Plásticos & Resíduos',
    icon: 'Package',
    code: '4.1',
    unit: 'garrafas'
  },
  printing: {
    title: 'Impressão de Documentos Físicos (QI)',
    category: 'Desmaterialização',
    icon: 'Printer',
    code: '5.1',
    unit: 'páginas'
  },
  telephony: {
    title: 'Gastos com Telefonia e Comunicações (GTF)',
    category: 'Utilidades',
    icon: 'Phone',
    code: '12.1',
    unit: 'R$'
  },
  waste_recycled: {
    title: 'Destinação de Resíduos Recicláveis (TMR)',
    category: 'Gestão de Resíduos',
    icon: 'Trash2',
    code: '8.2',
    unit: 'kg'
  },
  clean_energy: {
    title: 'Geração de Energia Solar Fotovoltaica',
    category: 'Energia Limpa',
    icon: 'Sparkles',
    code: '6.2',
    unit: 'kWh'
  },
  gender_equity: {
    title: 'Servidoras em Cargos de Direção e Chefia (PSERVCF)',
    category: 'Gestão de Pessoas',
    icon: 'Award',
    code: '17.1',
    unit: '%'
  },
  training: {
    title: 'Ações de Capacitação em Sustentabilidade (CAP)',
    category: 'Educação Ambiental',
    icon: 'BookOpen',
    code: '16.1',
    unit: 'ações'
  },
  contracts: {
    title: 'Contratações com Critérios de Sustentabilidade',
    category: 'Compras Públicas',
    icon: 'ShieldCheck',
    code: '15.1',
    unit: '%'
  },
  sexennium: {
    title: 'Evolução Quinquenal do Sexênio (2021 a 2026)',
    category: 'Visão Geral',
    icon: 'BarChart3',
    code: 'SEXENNIUM',
    unit: 'painel'
  },
  isp: {
    title: 'Índice de Sustentabilidade Geral (ISP CNJ 400)',
    category: 'Governança',
    icon: 'Gauge',
    code: 'ISP',
    unit: '%'
  }
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
  onOpenDocumentUpload,
  onOpenChatWithQuery,
  onSelectIndicator,
  onOpenReplicateModal,
  organizationLabel = 'SJRR / TRF1',
  organization,
  idsComplements = []
}) => {
  const [selectedThemeFilter, setSelectedThemeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTabSection, setActiveTabSection] = useState<'CONSUMO_MENSAL' | 'SEXENNIUM' | 'ISP' | 'TRAJETORIA' | 'TODOS'>('CONSUMO_MENSAL');

  // Monitorar se o ano selecionado possui dados e variáveis gerais
  const hasGeneralVarsInCurrentYear = useMemo(() => {
    return hasGeneralVariablesForYear(measurements, selectedYear);
  }, [measurements, selectedYear]);

  const latestPrevYearWithData = useMemo(() => {
    return getLatestYearWithGeneralVariables(measurements, selectedYear);
  }, [measurements, selectedYear]);

  const currentYearSummary = useMemo(() => {
    return getGeneralVariablesSummary(measurements, selectedYear);
  }, [measurements, selectedYear]);

  const activeCycleInfo = useMemo(() => {
    return getPlsCycleForYear(selectedYear);
  }, [selectedYear]);

  const isYearEmpty = useMemo(() => {
    return !measurements.some(m => m.year === selectedYear && m.value !== undefined && m.value > 0);
  }, [measurements, selectedYear]);

  const showGeneralVariablesBanner = selectedYear > 2026 || isYearEmpty || !hasGeneralVarsInCurrentYear;

  // Controle de exibição do Hero Relógio do IDS
  const [isHeroIdsExpanded, setIsHeroIdsExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sispls_hero_ids_expanded');
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return true;
  });

  // Card Reordering & Organization State (Persisted in localStorage)
  const [cardOrder, setCardOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sispls_dashboard_card_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
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

  // Modal de Personalização dos Cards
  const [isReorderModalOpen, setIsReorderModalOpen] = useState<boolean>(false);
  const [modalActiveTab, setModalActiveTab] = useState<'ACTIVE' | 'CATALOG'>('ACTIVE');
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<string>('ALL');
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);

  const toggleHeroIdsExpanded = () => {
    setIsHeroIdsExpanded(prev => {
      const updated = !prev;
      try {
        localStorage.setItem('sispls_hero_ids_expanded', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

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

  const addCardToPanel = (id: string) => {
    setCardOrder(prev => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      try {
        localStorage.setItem('sispls_dashboard_card_order', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    // Remove dos ocultos se estava oculto
    setHiddenCards(prev => {
      const updated = prev.filter(c => c !== id);
      try {
        localStorage.setItem('sispls_dashboard_hidden_cards', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const removeCardFromPanel = (id: string) => {
    setCardOrder(prev => {
      const updated = prev.filter(c => c !== id);
      try {
        localStorage.setItem('sispls_dashboard_card_order', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    setHiddenCards(prev => {
      const updated = prev.filter(c => c !== id);
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

  const applyPreset = (preset: 'DEFAULT' | 'FLEET_FIRST' | 'ENERGY_FIRST' | 'METAS_FIRST' | 'RESIDUOS_FIRST' | 'GOV_FIRST' | 'ALL_KEY') => {
    let newOrder = [...DEFAULT_CARD_ORDER];
    if (preset === 'FLEET_FIRST') {
      newOrder = ['ids_clock', 'fuel', 'mileage', 'efficiency', 'energy', 'water', 'paper'];
    } else if (preset === 'ENERGY_FIRST') {
      newOrder = ['ids_clock', 'energy', 'clean_energy', 'water', 'paper', 'fuel'];
    } else if (preset === 'RESIDUOS_FIRST') {
      newOrder = ['paper', 'cups', 'bottles', 'printing', 'waste_recycled', 'ids_clock'];
    } else if (preset === 'GOV_FIRST') {
      newOrder = ['ids_clock', 'isp', 'gender_equity', 'training', 'contracts'];
    } else if (preset === 'ALL_KEY') {
      newOrder = ['ids_clock', 'energy', 'water', 'fuel', 'mileage', 'efficiency', 'paper', 'cups', 'bottles', 'printing', 'waste_recycled', 'clean_energy', 'gender_equity', 'training'];
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

  // Função para resolver os metadados de qualquer card (curado ou qualquer indicador por ID)
  const getCardMeta = (id: string) => {
    if (CURATED_CARD_METADATA[id]) {
      return CURATED_CARD_METADATA[id];
    }
    const ind = indicators.find(i => i.id === id);
    if (ind) {
      const theme = themes.find(t => t.id === ind.themeId);
      return {
        title: `${ind.name} (${ind.code})`,
        category: theme ? theme.name : 'Indicador Oficial PLS',
        icon: 'BarChart3',
        code: ind.code,
        unit: ind.unit
      };
    }
    return {
      title: id,
      category: 'Indicador Geral',
      icon: 'BarChart3'
    };
  };

  // Dynamic current and previous year based on selectedYear (Cycle 2021-2026)
  const currYear = selectedYear;
  const prevYear = selectedYear > 2021 ? selectedYear - 1 : 2021;

  // Key KPI Counts
  const totalMonitored = performances.length;
  const inCompliance = performances.filter(p => p.result.status === 'EM_CONFORMIDADE' || p.result.status === 'META_ATINGIDA').length;
  const inAttention = performances.filter(p => p.result.status === 'ATENCAO').length;
  const inRisk = performances.filter(p => p.result.status === 'RISCO').length;

  const activeAlerts = alerts.filter(a => !a.resolved && a.year === selectedYear);
  const [isAlertDismissed, setIsAlertDismissed] = useState<boolean>(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState<boolean>(false);

  // Helper universal to extract monthly data for current and comparison year
  const getSeries = (indicatorId: string) => {
    const dataPrev = Array(12).fill(null);
    const dataCurr = Array(12).fill(null);

    // Mapeamento de apelidos comuns
    const matchId = (mIndicatorId: string) => {
      if (mIndicatorId === indicatorId) return true;
      if (indicatorId === 'indicator-6-1' && mIndicatorId === 'ind-energia-kwh') return true;
      if (indicatorId === 'indicator-7-1' && mIndicatorId === 'ind-agua-m3') return true;
      if (indicatorId === 'indicator-2-1' && mIndicatorId === 'ind-papel-resmas') return true;
      if (indicatorId === 'indicator-3-1' && mIndicatorId === 'ind-copos-centenas') return true;
      if (indicatorId === 'indicator-4-1' && mIndicatorId === 'ind-garrafas-descartaveis') return true;
      if (indicatorId === 'indicator-5-1' && mIndicatorId === 'ind-impressao-paginas') return true;
      if (indicatorId === 'indicator-8-1' && (mIndicatorId === 'ind-residuos-kg' || mIndicatorId === 'ind-residuos-reciclaveis')) return true;
      if (indicatorId === 'indicator-12-1' && mIndicatorId === 'ind-telefonia-reais') return true;
      if (indicatorId === 'indicator-14-1' && mIndicatorId === 'ind-combustivel-litros') return true;
      if (indicatorId === 'indicator-13-1' && mIndicatorId === 'ind-frota-km') return true;
      return false;
    };

    measurements
      .filter(m => matchId(m.indicatorId) && m.year === prevYear)
      .forEach(m => {
        if (m.month >= 1 && m.month <= 12) {
          dataPrev[m.month - 1] = m.value;
        }
      });

    measurements
      .filter(m => matchId(m.indicatorId) && m.year === currYear)
      .forEach(m => {
        if (m.month >= 1 && m.month <= 12) {
          dataCurr[m.month - 1] = m.value;
        }
      });

    return {
      dataPrev,
      dataCurr,
      data2025: dataPrev,
      data2026: dataCurr
    };
  };

  // Series dos principais eixos
  const energySeries = getSeries('indicator-6-1');
  const fuelSeries = getSeries('indicator-14-1');
  const mileageSeries = getSeries('indicator-13-1');
  const waterSeries = getSeries('indicator-7-1');
  const paperSeries = getSeries('indicator-2-1');
  const cupsSeries = getSeries('indicator-3-1');
  const bottlesSeries = getSeries('indicator-4-1');
  const printSeries = getSeries('indicator-5-1');
  const telephonySeries = getSeries('indicator-12-1');
  const wasteSeries = getSeries('indicator-8-1');
  const cleanEnergySeries = getSeries('indicator-6-2');
  const genderSeries = getSeries('indicator-17-1');
  const trainingSeries = getSeries('indicator-16-1');
  const contractsSeries = getSeries('indicator-15-1');

  // Metas anuais com progressão histórica

  // Somente metas cadastradas para o órgão selecionado (sem valores fixos de demonstração)
  const getTargetForIndicator = (indicatorId: string, year: number, _fallback?: number) =>
    targets.find(t => t.indicatorId === indicatorId && t.year === year)?.targetValue ?? 0;

  const energyTarget = getTargetForIndicator('indicator-6-1', selectedYear, 174000);
  const fuelTarget = getTargetForIndicator('indicator-14-1', selectedYear, 8160);
  const mileageTarget = getTargetForIndicator('indicator-13-1', selectedYear, 68000);
  const waterTarget = getTargetForIndicator('indicator-7-1', selectedYear, 2160);
  const paperTarget = getTargetForIndicator('indicator-2-1', selectedYear, 600);
  const cupsTarget = getTargetForIndicator('indicator-3-1', selectedYear, 0);
  const bottlesTarget = getTargetForIndicator('indicator-4-1', selectedYear, 0);
  const printTarget = getTargetForIndicator('indicator-5-1', selectedYear, 216000);
  const telephonyTarget = getTargetForIndicator('indicator-12-1', selectedYear, 26000);
  const wasteTarget = getTargetForIndicator('indicator-8-1', selectedYear, 4800);
  const cleanEnergyTarget = getTargetForIndicator('indicator-6-2', selectedYear, 30000);
  const genderTarget = getTargetForIndicator('indicator-17-1', selectedYear, 50);
  const trainingTarget = getTargetForIndicator('indicator-16-1', selectedYear, 12);
  const contractsTarget = getTargetForIndicator('indicator-15-1', selectedYear, 90);

  // Combustível total = gasolina + etanol + diesel (CG + CE + CD)
  const fuelSeriesParts = ['indicator-14-1', 'indicator-14-2', 'indicator-14-3'].map(getSeries);
  const sumSeries = (pick: (s: ReturnType<typeof getSeries>) => (number | null)[]) =>
    Array.from({ length: 12 }, (_, i) => {
      const vals = fuelSeriesParts.map(s => pick(s)[i]).filter((v): v is number => v !== null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
    });
  const fuelTotalSeries = { dataCurr: sumSeries(s => s.dataCurr), dataPrev: sumSeries(s => s.dataPrev) };

  // Período avaliado: até o último mês com dado no exercício (comparação com o mesmo período do ano anterior)
  const lastMonthWithData = (series: (number | null)[]) => {
    for (let i = 11; i >= 0; i--) if (series[i] !== null) return i + 1;
    return 0;
  };
  const maxEvalMonth =
    Math.max(
      lastMonthWithData(energySeries.dataCurr),
      lastMonthWithData(fuelTotalSeries.dataCurr),
      lastMonthWithData(mileageSeries.dataCurr)
    ) || 12;
  const sumEvalPeriod = (series: (number | null)[]) =>
    series.slice(0, maxEvalMonth).filter((v): v is number => v !== null).reduce((a, b) => a + b, 0);
  const evalPeriodLabel = maxEvalMonth < 12 ? `jan–${['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][maxEvalMonth - 1]}` : '';
  const hasTargetFor = (...ids: string[]) => targets.some(t => ids.includes(t.indicatorId) && t.year === selectedYear);
  const fmtMonthlyTarget = (ids: string[], annual: number) =>
    hasTargetFor(...ids) ? `${Math.round(annual / 12).toLocaleString('pt-BR')}/mês` : 'sem meta definida';

  const energy26 = sumEvalPeriod(energySeries.dataCurr);
  const energy25 = sumEvalPeriod(energySeries.dataPrev);
  const energyDelta = energy25 > 0 ? ((energy26 - energy25) / energy25) * 100 : 0;

  const fuel26 = sumEvalPeriod(fuelTotalSeries.dataCurr);
  const fuel25 = sumEvalPeriod(fuelTotalSeries.dataPrev);
  const fuelTotalTarget = ['indicator-14-1', 'indicator-14-2', 'indicator-14-3']
    .reduce((acc, id) => acc + getTargetForIndicator(id, selectedYear), 0);
  const fuelDelta = fuel25 > 0 ? ((fuel26 - fuel25) / fuel25) * 100 : 0;

  const km26 = sumEvalPeriod(mileageSeries.dataCurr);
  const km25 = sumEvalPeriod(mileageSeries.dataPrev);
  const kmDelta = km25 > 0 ? ((km26 - km25) / km25) * 100 : 0;

  // Índice PLS = IDS (Res. CNJ 400) calculado com os mesmos dados e regras do relógio do IDS
  const idsScope = scopeForOrganization(organization);
  const idsCtx = useMemo(
    () => ({ indicators, complements: idsComplements, organization }),
    [indicators, idsComplements, organization]
  );
  const idsCurrent = useMemo(
    () => calculateCNJIDS(measurements, currYear, { scope: idsScope, context: idsCtx }),
    [measurements, currYear, idsScope, idsCtx]
  );
  const idsPrevious = useMemo(
    () => (prevYear < currYear ? calculateCNJIDS(measurements, prevYear, { scope: idsScope, context: idsCtx }) : null),
    [measurements, prevYear, currYear, idsScope, idsCtx]
  );
  const currentIspScore = Number(idsCurrent.idsScore.toFixed(1));
  const previousYearIsp = idsPrevious?.hasScore ? Number(idsPrevious.idsScore.toFixed(1)) : currentIspScore;
  const idsDelta = idsPrevious?.hasScore && idsCurrent.hasScore ? currentIspScore - previousYearIsp : null;

  // Dimensões do IDS agrupadas por categoria dos subindicadores (pontuação 0–100 e peso efetivo)
  const ispDimensions = useMemo(() => {
    const labels: Record<string, string> = {
      UTILIDADES: 'Utilidades (energia, água, telefonia)',
      MATERIAIS: 'Materiais e resíduos (papel, copos, resíduos)',
      FROTA: 'Frota e combustíveis',
      GESTAO_PESSOAS: 'Gestão de pessoas (capacitação e paridade)'
    };
    return Object.entries(labels)
      .map(([cat, name]) => {
        const items = idsCurrent.subIndicators.filter(i => i.category === cat && i.available);
        const weight = items.reduce((a, i) => a + i.weightPct, 0);
        const score = weight > 0 ? items.reduce((a, i) => a + i.normalizedValue * 100 * i.weightPct, 0) / weight : 0;
        const status = score >= 80 ? 'EXCELENTE' as const : score >= 60 ? 'BOM' as const : score >= 40 ? 'ATENCAO' as const : 'CRITICO' as const;
        return { name, score: Math.round(score), weight: Math.round(weight), status };
      })
      .filter(d => d.weight > 0);
  }, [idsCurrent]);

  // Filtragem de indicadores para o catálogo da modal
  const allAvailableCardsForCatalog = useMemo(() => {
    // 1. Cards curados
    const curatedList = Object.entries(CURATED_CARD_METADATA).map(([id, meta]) => ({
      id,
      title: meta.title,
      code: meta.code || 'SYS',
      category: meta.category,
      unit: meta.unit || '',
      isCurated: true
    }));

    // 2. Todos os indicadores monitorados
    const dynamicList = indicators.map(ind => {
      const theme = themes.find(t => t.id === ind.themeId);
      return {
        id: ind.id,
        title: ind.name,
        code: ind.code,
        category: theme ? theme.name : 'Indicador Oficial',
        unit: ind.unit,
        isCurated: false
      };
    });

    // Combinar evitando duplicação de IDs
    const seen = new Set<string>();
    const combined: Array<{ id: string; title: string; code: string; category: string; unit: string; isCurated: boolean }> = [];

    curatedList.forEach(item => {
      seen.add(item.id);
      combined.push(item);
    });

    dynamicList.forEach(item => {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        combined.push(item);
      }
    });

    return combined;
  }, [indicators, themes]);

  const filteredCatalogCards = useMemo(() => {
    return allAvailableCardsForCatalog.filter(card => {
      if (catalogCategoryFilter !== 'ALL' && !card.category.toLowerCase().includes(catalogCategoryFilter.toLowerCase())) {
        return false;
      }
      if (catalogSearch.trim()) {
        const q = catalogSearch.toLowerCase();
        return (
          card.title.toLowerCase().includes(q) ||
          card.code.toLowerCase().includes(q) ||
          card.category.toLowerCase().includes(q) ||
          card.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allAvailableCardsForCatalog, catalogCategoryFilter, catalogSearch]);

  // Render individual card by ID (Curated or Dynamic from any Indicator)
  const renderCardById = (cardId: string) => {
    const cardIndex = visibleCards.indexOf(cardId);
    const cardNumber = cardIndex !== -1 ? cardIndex + 1 : undefined;
    const totalCards = visibleCards.length;
    const isFirst = cardIndex === 0;
    const isLast = cardIndex === totalCards - 1;

    switch (cardId) {
      case 'ids_clock':
        return (
          <div key="ids_clock" className={layoutColumns === '2_COL' ? 'lg:col-span-2' : ''}>
            <IDSThermometerCard
              measurements={measurements}
              indicators={indicators}
              idsComplements={idsComplements}
              organization={organization}
              currentYear={selectedYear}
              onYearSelect={setSelectedYear}
              initialViewMode="CLOCK"
              defaultExpanded={false}
            />
          </div>
        );

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
            monthlyTarget={Math.round(energyTarget / 12)}
            annualTarget={energyTarget}
            icon={<Zap className="w-5 h-5 text-amber-600" />}
            primaryColor="amber"
            invertGoodDirection={true}
            onMoveUp={() => moveCard(cardId, 'up')}
            onMoveDown={() => moveCard(cardId, 'down')}
            onMoveToTop={() => moveToTop(cardId)}
            onMoveToBottom={() => moveToBottom(cardId)}
            isFirst={isFirst}
            isLast={isLast}
            cardNumber={cardNumber}
            totalCards={totalCards}
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
            monthlyTarget={Math.round(waterTarget / 12)}
            annualTarget={waterTarget}
            icon={<Droplet className="w-5 h-5 text-cyan-600" />}
            primaryColor="cyan"
            invertGoodDirection={true}
            onMoveUp={() => moveCard(cardId, 'up')}
            onMoveDown={() => moveCard(cardId, 'down')}
            onMoveToTop={() => moveToTop(cardId)}
            onMoveToBottom={() => moveToBottom(cardId)}
            isFirst={isFirst}
            isLast={isLast}
            cardNumber={cardNumber}
            totalCards={totalCards}
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
            monthlyTarget={Math.round(fuelTarget / 12)}
            annualTarget={fuelTarget}
            icon={<Fuel className="w-5 h-5 text-orange-600" />}
            primaryColor="orange"
            invertGoodDirection={true}
            onMoveUp={() => moveCard(cardId, 'up')}
            onMoveDown={() => moveCard(cardId, 'down')}
            onMoveToTop={() => moveToTop(cardId)}
            onMoveToBottom={() => moveToBottom(cardId)}
            isFirst={isFirst}
            isLast={isLast}
            cardNumber={cardNumber}
            totalCards={totalCards}
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
            monthlyTarget={Math.round(mileageTarget / 12)}
            annualTarget={mileageTarget}
            icon={<Navigation className="w-5 h-5 text-blue-600" />}
            primaryColor="blue"
            invertGoodDirection={true}
            onMoveUp={() => moveCard(cardId, 'up')}
            onMoveDown={() => moveCard(cardId, 'down')}
            onMoveToTop={() => moveToTop(cardId)}
            onMoveToBottom={() => moveToBottom(cardId)}
            isFirst={isFirst}
            isLast={isLast}
            cardNumber={cardNumber}
            totalCards={totalCards}
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
            monthlyTarget={Math.round(paperTarget / 12)}
            annualTarget={paperTarget}
            icon={<FileText className="w-5 h-5 text-emerald-600" />}
            primaryColor="emerald"
            invertGoodDirection={true}
            onMoveUp={() => moveCard(cardId, 'up')}
            onMoveDown={() => moveCard(cardId, 'down')}
            onMoveToTop={() => moveToTop(cardId)}
            onMoveToBottom={() => moveToBottom(cardId)}
            isFirst={isFirst}
            isLast={isLast}
            cardNumber={cardNumber}
            totalCards={totalCards}
          />
        );

      case 'cups':
        return (
          <MonthlyConsumptionLineChart
            key="cups"
            title="Consumo de Copos Descartáveis Mês a Mês (CD)"
            code="3.1"
            unit="centenas"
            data2025={cupsSeries.dataPrev}
            data2026={cupsSeries.dataCurr}
            currentYear={currYear}
            previousYear={prevYear}
            monthlyTarget={cupsTarget > 0 ? Math.round(cupsTarget / 12) : 0}
            annualTarget={cupsTarget}
            icon={<GlassWater className="w-5 h-5 text-teal-600" />}
            primaryColor="cyan"
            invertGoodDirection={true}
            onMoveUp={() => moveCard(cardId, 'up')}
            onMoveDown={() => moveCard(cardId, 'down')}
            onMoveToTop={() => moveToTop(cardId)}
            onMoveToBottom={() => moveToBottom(cardId)}
            isFirst={isFirst}
            isLast={isLast}
            cardNumber={cardNumber}
            totalCards={totalCards}
          />
        );

      case 'bottles':
        return (
          <MonthlyConsumptionLineChart
            key="bottles"
            title="Garrafas Plásticas Descartáveis Mês a Mês (GDA)"
            code="4.1"
            unit="garrafas"
            data2025={bottlesSeries.dataPrev}
            data2026={bottlesSeries.dataCurr}
            currentYear={currYear}
            previousYear={prevYear}
            monthlyTarget={bottlesTarget > 0 ? Math.round(bottlesTarget / 12) : 0}
            annualTarget={bottlesTarget}
            icon={<Package className="w-5 h-5 text-teal-600" />}
            primaryColor="cyan"
            invertGoodDirection={true}
            onMoveUp={() => moveCard(cardId, 'up')}
            onMoveDown={() => moveCard(cardId, 'down')}
            onMoveToTop={() => moveToTop(cardId)}
            onMoveToBottom={() => moveToBottom(cardId)}
            isFirst={isFirst}
            isLast={isLast}
            cardNumber={cardNumber}
            totalCards={totalCards}
          />
        );

      case 'printing':
        return (
          <MonthlyConsumptionLineChart
            key="printing"
            title="Impressão de Documentos Físicos Mês a Mês (QI)"
            code="5.1"
            unit="páginas"
            data2025={printSeries.dataPrev}
            data2026={printSeries.dataCurr}
            currentYear={currYear}
            previousYear={prevYear}
            monthlyTarget={Math.round(printTarget / 12)}
            annualTarget={printTarget}
            icon={<Printer className="w-5 h-5 text-blue-600" />}
            primaryColor="blue"
            invertGoodDirection={true}
            onMoveUp={() => moveCard(cardId, 'up')}
            onMoveDown={() => moveCard(cardId, 'down')}
            onMoveToTop={() => moveToTop(cardId)}
            onMoveToBottom={() => moveToBottom(cardId)}
            isFirst={isFirst}
            isLast={isLast}
            cardNumber={cardNumber}
            totalCards={totalCards}
          />
        );

      case 'telephony':
        return (
          <MonthlyConsumptionLineChart
            key="telephony"
            title="Gastos com Telefonia e Telecomunicações Mês a Mês (GTF)"
            code="12.1"
            unit="R$"
            data2025={telephonySeries.dataPrev}
            data2026={telephonySeries.dataCurr}
            currentYear={currYear}
            previousYear={prevYear}
            monthlyTarget={Math.round(telephonyTarget / 12)}
            annualTarget={telephonyTarget}
            icon={<Phone className="w-5 h-5 text-amber-600" />}
            primaryColor="amber"
            invertGoodDirection={true}
            onMoveUp={() => moveCard(cardId, 'up')}
            onMoveDown={() => moveCard(cardId, 'down')}
            onMoveToTop={() => moveToTop(cardId)}
            onMoveToBottom={() => moveToBottom(cardId)}
            isFirst={isFirst}
            isLast={isLast}
            cardNumber={cardNumber}
            totalCards={totalCards}
          />
        );

      case 'waste_recycled':
        return (
          <MonthlyConsumptionLineChart
            key="waste_recycled"
            title="Destinação de Resíduos Recicláveis Mês a Mês (TMR)"
            code="8.2"
            unit="kg"
            data2025={wasteSeries.dataPrev}
            data2026={wasteSeries.dataCurr}
            currentYear={currYear}
            previousYear={prevYear}
            monthlyTarget={Math.round(wasteTarget / 12)}
            annualTarget={wasteTarget}
            icon={<Trash2 className="w-5 h-5 text-emerald-600" />}
            primaryColor="emerald"
            invertGoodDirection={false}
            onMoveUp={() => moveCard(cardId, 'up')}
            onMoveDown={() => moveCard(cardId, 'down')}
            onMoveToTop={() => moveToTop(cardId)}
            onMoveToBottom={() => moveToBottom(cardId)}
            isFirst={isFirst}
            isLast={isLast}
            cardNumber={cardNumber}
            totalCards={totalCards}
          />
        );

      case 'clean_energy':
        return (
          <MonthlyConsumptionLineChart
            key="clean_energy"
            title="Geração de Energia Solar Fotovoltaica Mês a Mês"
            code="6.2"
            unit="kWh"
            data2025={cleanEnergySeries.dataPrev}
            data2026={cleanEnergySeries.dataCurr}
            currentYear={currYear}
            previousYear={prevYear}
            monthlyTarget={Math.round(cleanEnergyTarget / 12)}
            annualTarget={cleanEnergyTarget}
            icon={<Sparkles className="w-5 h-5 text-emerald-600" />}
            primaryColor="emerald"
            invertGoodDirection={false}
            onMoveUp={() => moveCard(cardId, 'up')}
            onMoveDown={() => moveCard(cardId, 'down')}
            onMoveToTop={() => moveToTop(cardId)}
            onMoveToBottom={() => moveToBottom(cardId)}
            isFirst={isFirst}
            isLast={isLast}
            cardNumber={cardNumber}
            totalCards={totalCards}
          />
        );

      case 'gender_equity':
        return (
          <MonthlyConsumptionLineChart
            key="gender_equity"
            title="Servidoras em Cargos de Direção e Chefia (PSERVCF)"
            code="17.1"
            unit="%"
            data2025={genderSeries.dataPrev}
            data2026={genderSeries.dataCurr}
            currentYear={currYear}
            previousYear={prevYear}
            monthlyTarget={genderTarget}
            annualTarget={genderTarget}
            icon={<Award className="w-5 h-5 text-purple-600" />}
            primaryColor="purple"
            invertGoodDirection={false}
            onMoveUp={() => moveCard(cardId, 'up')}
            onMoveDown={() => moveCard(cardId, 'down')}
            onMoveToTop={() => moveToTop(cardId)}
            onMoveToBottom={() => moveToBottom(cardId)}
            isFirst={isFirst}
            isLast={isLast}
            cardNumber={cardNumber}
            totalCards={totalCards}
          />
        );

      case 'training':
        return (
          <MonthlyConsumptionLineChart
            key="training"
            title="Ações de Capacitação em Sustentabilidade (CAP)"
            code="16.1"
            unit="ações"
            data2025={trainingSeries.dataPrev}
            data2026={trainingSeries.dataCurr}
            currentYear={currYear}
            previousYear={prevYear}
            monthlyTarget={trainingTarget > 0 ? Math.round(trainingTarget / 12) : 1}
            annualTarget={trainingTarget}
            icon={<BookOpen className="w-5 h-5 text-emerald-600" />}
            primaryColor="emerald"
            invertGoodDirection={false}
            onMoveUp={() => moveCard(cardId, 'up')}
            onMoveDown={() => moveCard(cardId, 'down')}
            onMoveToTop={() => moveToTop(cardId)}
            onMoveToBottom={() => moveToBottom(cardId)}
            isFirst={isFirst}
            isLast={isLast}
            cardNumber={cardNumber}
            totalCards={totalCards}
          />
        );

      case 'contracts':
        return (
          <MonthlyConsumptionLineChart
            key="contracts"
            title="Contratações com Critérios de Sustentabilidade"
            code="15.1"
            unit="%"
            data2025={contractsSeries.dataPrev}
            data2026={contractsSeries.dataCurr}
            currentYear={currYear}
            previousYear={prevYear}
            monthlyTarget={contractsTarget}
            annualTarget={contractsTarget}
            icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
            primaryColor="emerald"
            invertGoodDirection={false}
            onMoveUp={() => moveCard(cardId, 'up')}
            onMoveDown={() => moveCard(cardId, 'down')}
            onMoveToTop={() => moveToTop(cardId)}
            onMoveToBottom={() => moveToBottom(cardId)}
            isFirst={isFirst}
            isLast={isLast}
            cardNumber={cardNumber}
            totalCards={totalCards}
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

      default: {
        // Suporte Dinâmico a Qualquer Indicador Selecionado pelo Usuário
        const ind = indicators.find(i => i.id === cardId);
        if (ind) {
          const dynamicSeries = getSeries(ind.id);
          const indTarget = getTargetForIndicator(ind.id, selectedYear, 0);
          const monthlyTarget = indTarget > 0 ? Math.round(indTarget / 12) : undefined;
          const isLowerBetter = ind.targetDirection === 'MENOR_MELHOR';

          return (
            <MonthlyConsumptionLineChart
              key={ind.id}
              title={`${ind.name} Mês a Mês`}
              code={ind.code}
              unit={ind.unit}
              data2025={dynamicSeries.dataPrev}
              data2026={dynamicSeries.dataCurr}
              currentYear={currYear}
              previousYear={prevYear}
              monthlyTarget={monthlyTarget}
              annualTarget={indTarget > 0 ? indTarget : undefined}
              icon={<BarChart3 className="w-5 h-5 text-emerald-600" />}
              primaryColor="emerald"
              invertGoodDirection={isLowerBetter}
              onMoveUp={() => moveCard(cardId, 'up')}
              onMoveDown={() => moveCard(cardId, 'down')}
              onMoveToTop={() => moveToTop(cardId)}
              onMoveToBottom={() => moveToBottom(cardId)}
              isFirst={isFirst}
              isLast={isLast}
              cardNumber={cardNumber}
              totalCards={totalCards}
            />
          );
        }
        return null;
      }
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Top Header com Controles Executivos */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="text-xs font-semibold text-emerald-800 tracking-wider uppercase">
            Plano de Logística Sustentável · {organizationLabel}
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
            {activeTabSection === 'SEXENNIUM'
              ? 'Evolução do Sexênio (2021 a 2026)'
              : `Acompanhamento Executivo (${selectedYear})`}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Painel executivo com o Relógio do IDS, metas da Resolução CNJ nº 400/2021 e gráficos customizáveis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Ano */}
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
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  activeTabSection !== 'SEXENNIUM' && selectedYear === y
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {y}
              </button>
            ))}
          </div>

          {/* Botão Personalizar Cards */}
          <button
            onClick={() => setIsReorderModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            title="Escolha quais gráficos e indicadores vão aparecer no painel"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Personalizar Painel</span>
          </button>

          {/* Lançar Mês */}
          <button
            onClick={() => onOpenDataIngestion()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Lançar Mês</span>
          </button>

          {/* Dropdown de Ações Complementares */}
          <div className="relative">
            <button
              onClick={() => setShowActionsDropdown(!showActionsDropdown)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors border border-slate-200 cursor-pointer"
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
                  {onOpenDocumentUpload && (
                  <button
                    onClick={() => {
                      onOpenDocumentUpload?.();
                      setShowActionsDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4 text-blue-600" />
                    <span>Fatura / OCR</span>
                  </button>
                  )}
                  <button
                    onClick={() => {
                      setIsReorderModalOpen(true);
                      setShowActionsDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-slate-600" />
                    <span>Escolher Gráficos</span>
                  </button>
                  <button
                    onClick={() => {
                      onOpenChatWithQuery(`Faça uma análise executiva detalhada do consumo e do Relógio do IDS em ${selectedYear}.`);
                      setShowActionsDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
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

      {/* Alerta Pontual */}
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
              className="font-semibold underline hover:text-amber-950 cursor-pointer"
            >
              Ver Detalhes
            </button>
            <button
              onClick={() => setIsAlertDismissed(true)}
              className="p-1 rounded text-amber-600 hover:text-amber-900 cursor-pointer"
              title="Fechar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Banner de Gestão de Variáveis Gerais para Anos Futuros / Sem Dados */}
      {showGeneralVariablesBanner && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4.5 rounded-2xl bg-gradient-to-r from-emerald-900 to-teal-900 text-white shadow-xs border border-emerald-700/60 transition-all">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-emerald-300">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Exercício de {selectedYear} • {isYearEmpty ? 'Dados Zerados' : 'Lançamento Progressivo'}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  {activeCycleInfo.cycleNumber}º Ciclo PLS ({activeCycleInfo.cycle})
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
                As informações deste exercício permanecem <strong>zeradas</strong> para serem alimentadas conforme os fatos geradores ocorrerem.
                {hasGeneralVarsInCurrentYear ? (
                  <span className="text-emerald-300 font-semibold block mt-0.5">
                    ✓ Variáveis Gerais cadastradas (Área: {currentYearSummary.areaTotalM2.toLocaleString('pt-BR')} m² · FTT: {currentYearSummary.fttTotal} pessoas · {currentYearSummary.magistrados} magistrados · {currentYearSummary.servidoresEfetivos} servidores).
                  </span>
                ) : (
                  <span className="block mt-0.5">
                    Você pode <strong>repetir as Variáveis Gerais</strong> (Área Construída, FTT, Magistrados, Servidores, Terceirizados) a partir do exercício de <strong>{latestPrevYearWithData || (selectedYear - 1)}</strong> para calibrar os denominadores per capita e por m².
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
            {onOpenReplicateModal && (
              <button
                type="button"
                onClick={onOpenReplicateModal}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-400 hover:bg-emerald-300 text-slate-950 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                title="Copiar e ajustar Variáveis Gerais do exercício anterior"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{hasGeneralVarsInCurrentYear ? 'Ajustar / Repetir Variáveis' : `Repetir Variáveis de ${latestPrevYearWithData || (selectedYear - 1)}`}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenDataIngestion()}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors cursor-pointer"
            >
              Lançar Dados
            </button>
          </div>
        </div>
      )}

      {/* 2. Placar Estratégico de Indicadores (KPI Summary) */}
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
                energy26 === 0
                  ? 'text-slate-500 bg-slate-100 border border-slate-200'
                  : energyDelta <= 0
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-rose-700 bg-rose-50'
              }`}
            >
              {energy26 === 0 ? (
                <span>Aguardando dados de {selectedYear}</span>
              ) : (
                <>
                  {energyDelta <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                  {energyDelta > 0 ? `+${energyDelta.toFixed(1)}%` : `${energyDelta.toFixed(1)}%`} vs {prevYear}{evalPeriodLabel && ` (${evalPeriodLabel})`}
                </>
              )}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {Math.round(energy26).toLocaleString('pt-BR')}{' '}
              <span className="text-xs font-normal text-slate-400">kWh</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Média: <strong>{energy26 > 0 ? Math.round(energy26 / maxEvalMonth).toLocaleString('pt-BR') : '0'}</strong> kWh/mês</span>
              <span>Meta: <strong>{fmtMonthlyTarget(['indicator-6-1'], energyTarget)}</strong></span>
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
                fuel26 === 0
                  ? 'text-slate-500 bg-slate-100 border border-slate-200'
                  : fuelDelta <= 0
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-rose-700 bg-rose-50'
              }`}
            >
              {fuel26 === 0 ? (
                <span>Aguardando dados de {selectedYear}</span>
              ) : (
                <>
                  {fuelDelta <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                  {fuelDelta > 0 ? `+${fuelDelta.toFixed(1)}%` : `${fuelDelta.toFixed(1)}%`} vs {prevYear}{evalPeriodLabel && ` (${evalPeriodLabel})`}
                </>
              )}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {Math.round(fuel26).toLocaleString('pt-BR')}{' '}
              <span className="text-xs font-normal text-slate-400" title="Gasolina + etanol + diesel (CG + CE + CD)">litros (CG+CE+CD)</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Média: <strong>{fuel26 > 0 ? Math.round(fuel26 / maxEvalMonth).toLocaleString('pt-BR') : '0'}</strong> L/mês</span>
              <span>Meta: <strong>{fmtMonthlyTarget(['indicator-14-1', 'indicator-14-2', 'indicator-14-3'], fuelTotalTarget)}</strong></span>
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
                km26 === 0
                  ? 'text-slate-500 bg-slate-100 border border-slate-200'
                  : kmDelta <= 0
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-rose-700 bg-rose-50'
              }`}
            >
              {km26 === 0 ? (
                <span>Aguardando dados de {selectedYear}</span>
              ) : (
                <>
                  {kmDelta <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                  {kmDelta > 0 ? `+${kmDelta.toFixed(1)}%` : `${kmDelta.toFixed(1)}%`} vs {prevYear}{evalPeriodLabel && ` (${evalPeriodLabel})`}
                </>
              )}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {Math.round(km26).toLocaleString('pt-BR')}{' '}
              <span className="text-xs font-normal text-slate-400">km</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Média: <strong>{km26 > 0 ? Math.round(km26 / maxEvalMonth).toLocaleString('pt-BR') : '0'}</strong> km/mês</span>
              <span>Meta: <strong>{fmtMonthlyTarget(['indicator-13-1'], mileageTarget)}</strong></span>
            </div>
          </div>
        </div>

        {/* KPI 4: Índice Geral do CNJ */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <Gauge className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-700" title="IDS da Res. CNJ 400/2021 — mesmo cálculo do relógio do IDS">IDS (Res. CNJ 400)</span>
            </div>
            {idsDelta !== null ? (
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${idsDelta >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                {idsDelta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {idsDelta >= 0 ? '+' : ''}{idsDelta.toFixed(1)} pts vs {prevYear}
              </span>
            ) : (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-slate-500 bg-slate-100 border border-slate-200">
                sem comparação
              </span>
            )}
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tracking-tight" style={{ color: idsCurrent.hasScore ? idsCurrent.classification.color : '#64748b' }}>
              {idsCurrent.hasScore ? `${currentIspScore.toFixed(1)}%` : 'n.d.'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between gap-2">
              <span className="truncate" title={idsCurrent.notes.join('\n')}>
                <strong style={{ color: idsCurrent.classification.color }}>{idsCurrent.classification.label}</strong>
              </span>
              <span className="shrink-0" title="Indicadores do IDS com dados no exercício">
                {idsCurrent.coverage.available}/{idsCurrent.coverage.total} ind.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. RELÓGIO DO IDS DO CNJ NO TOPO DO PAINEL EXECUTIVO */}
      {activeTabSection === 'CONSUMO_MENSAL' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Relógio do IDS do CNJ — Visão Executiva Institucional
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={toggleHeroIdsExpanded}
                className="text-slate-500 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer"
              >
                {isHeroIdsExpanded ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Minimizar Relógio</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Expandir Relógio</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {isHeroIdsExpanded && (
            <IDSThermometerCard
              measurements={measurements}
              indicators={indicators}
              idsComplements={idsComplements}
              organization={organization}
              currentYear={selectedYear}
              onYearSelect={setSelectedYear}
              initialViewMode="CLOCK"
              defaultExpanded={false}
            />
          )}
        </div>
      )}

      {/* 3b. Consolidado da 1ª Região: contribuição de cada unidade (consumo e IDS) */}
      {organization?.isConsolidated && <OrgContributionCard year={selectedYear} />}

      {/* 4. Abas de Navegação das Seções */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTabSection('CONSUMO_MENSAL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTabSection === 'CONSUMO_MENSAL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Gráficos Executivos ({visibleCards.length})
          </button>
          <button
            onClick={() => setActiveTabSection('SEXENNIUM')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTabSection === 'SEXENNIUM'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Evolução do Sexênio (2021–2026)
          </button>
          <button
            onClick={() => setActiveTabSection('ISP')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTabSection === 'ISP'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Governança & ISP (CNJ 400)
          </button>
          <button
            onClick={() => setActiveTabSection('TRAJETORIA')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTabSection === 'TRAJETORIA'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Trajetória & Metas
          </button>
          <button
            onClick={() => setActiveTabSection('TODOS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
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
            <button
              onClick={() => setIsReorderModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-bold transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-700" />
              <span>Editar Gráficos ({visibleCards.length})</span>
            </button>

            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => toggleLayoutColumns('2_COL')}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  layoutColumns === '2_COL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="2 Colunas"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => toggleLayoutColumns('1_COL')}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
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

      {/* 5. SEÇÃO: GRÁFICOS EDITÁVEIS DO PAINEL EXECUTIVO */}
      {activeTabSection === 'CONSUMO_MENSAL' && (
        <div className="space-y-6">
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
              <h4 className="text-base font-bold text-slate-800">Nenhum gráfico está visível no painel</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4 max-w-md mx-auto">
                Você pode escolher quais gráficos e indicadores deseja visualizar no painel executivo.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setIsReorderModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Escolher Indicadores no Catálogo</span>
                </button>
                <button
                  onClick={showAllCards}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Reexibir Todos os Cards
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SEÇÃO: SEXÊNIO */}
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

      {/* SEÇÃO: ISP */}
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

      {/* SEÇÃO: TRAJETÓRIA */}
      {activeTabSection === 'TRAJETORIA' && (
        <div className="space-y-6">
          <TrajectoryForecastChart
            title="Consumo Total de Energia Elétrica (CEE) — Meta Quinquenal"
            indicatorCode="6.1"
            unit="kWh"
            monthlyActual2026={energySeries.dataCurr}
            annualTarget={energyTarget}
          />
          <TrajectoryForecastChart
            title="Consumo Total de Combustível da Frota (CG) — Meta Quinquenal"
            indicatorCode="14.1"
            unit="litros"
            monthlyActual2026={fuelSeries.dataCurr}
            annualTarget={fuelTarget}
          />
        </div>
      )}

      {/* SEÇÃO: TODOS OS INDICADORES */}
      {activeTabSection === 'TODOS' && (() => {
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

        return (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative w-full md:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Filtrar por nome, código ou sigla..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
                <button
                  onClick={() => setSelectedThemeFilter('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                    selectedThemeFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todos ({performances.length})
                </button>
                {themes.slice(0, 6).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedThemeFilter(t.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                      selectedThemeFilter === t.id ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Indicador</th>
                    <th className="py-3 px-4">Unidade</th>
                    <th className="py-3 px-4 text-right">Meta {selectedYear}</th>
                    <th className="py-3 px-4 text-right">Realizado</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                {filteredPerformances.map(({ indicator, target, result }) => {
                  const isInPanel = cardOrder.includes(indicator.id);

                  return (
                    <tr key={indicator.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-700">
                        {indicator.code}
                      </td>
                      <td className="py-2.5 px-4">
                        <button
                          onClick={() => onSelectIndicator(indicator)}
                          className="font-bold text-slate-900 hover:text-emerald-700 text-left cursor-pointer"
                        >
                          {indicator.name}
                        </button>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 font-mono">
                        {indicator.unit}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        {target ? target.targetValue.toLocaleString('pt-BR') : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold">
                        {result.accumulatedValue ? result.accumulatedValue.toLocaleString('pt-BR') : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <StatusPill status={result.status} />
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {isInPanel ? (
                          <button
                            onClick={() => removeCardFromPanel(indicator.id)}
                            className="px-2 py-1 rounded-md text-[11px] font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                          >
                            Remover do Painel
                          </button>
                        ) : (
                          <button
                            onClick={() => addCardToPanel(indicator.id)}
                            className="px-2 py-1 rounded-md text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 border border-emerald-300 cursor-pointer"
                          >
                            + Exibir no Painel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    })()}

      {/* =========================================================================
          MODAL DE PERSONALIZAÇÃO COMPLETA DOS CARDS E INDICADORES DO PAINEL
      ========================================================================= */}
      {isReorderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-2xs">
                  <SlidersHorizontal className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    Personalizar Painel Executivo
                  </h3>
                  <p className="text-xs text-slate-500">
                    Escolha quais gráficos e indicadores vão aparecer no painel e ajuste sua sequência.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsReorderModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Presets Rápidos */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-2">
                Predefinições Rápidas de Gráficos:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <button
                  onClick={() => applyPreset('DEFAULT')}
                  className="p-2 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left font-semibold text-slate-800 transition-colors bg-white cursor-pointer"
                >
                  <span className="block text-[9px] text-slate-400 font-normal">Padrão CNJ</span>
                  🎯 Institucional
                </button>
                <button
                  onClick={() => applyPreset('GOV_FIRST')}
                  className="p-2 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left font-semibold text-slate-800 transition-colors bg-white cursor-pointer"
                >
                  <span className="block text-[9px] text-slate-400 font-normal">Eixo Governança</span>
                  ⏱️ Relógio IDS & Metas
                </button>
                <button
                  onClick={() => applyPreset('ENERGY_FIRST')}
                  className="p-2 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 text-left font-semibold text-slate-800 transition-colors bg-white cursor-pointer"
                >
                  <span className="block text-[9px] text-slate-400 font-normal">Eixo Utilidades</span>
                  ⚡ Energia & Solar
                </button>
                <button
                  onClick={() => applyPreset('RESIDUOS_FIRST')}
                  className="p-2 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 text-left font-semibold text-slate-800 transition-colors bg-white cursor-pointer"
                >
                  <span className="block text-[9px] text-slate-400 font-normal">Desmaterialização</span>
                  ♻️ Papel, Copos & Resíduos
                </button>
                <button
                  onClick={() => applyPreset('ALL_KEY')}
                  className="p-2 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 text-left font-semibold text-slate-800 transition-colors bg-white cursor-pointer"
                >
                  <span className="block text-[9px] text-slate-400 font-normal">Visão Ampla</span>
                  📊 Todos os Principais
                </button>
              </div>
            </div>

            {/* Abas da Modal: Cards Ativos vs Catálogo Completo */}
            <div className="flex border-b border-slate-200 px-4 pt-2 bg-white">
              <button
                onClick={() => setModalActiveTab('ACTIVE')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  modalActiveTab === 'ACTIVE'
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Gráficos Ativos no Painel</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono">
                  {cardOrder.length} ({visibleCards.length} visíveis)
                </span>
              </button>

              <button
                onClick={() => setModalActiveTab('CATALOG')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  modalActiveTab === 'CATALOG'
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>Catálogo de Indicadores & Gráficos</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono">
                  {allAvailableCardsForCatalog.length}
                </span>
              </button>
            </div>

            {/* Conteúdo da Aba 1: Gráficos Ativos (Reordenação, Ocultar, Excluir) */}
            {modalActiveTab === 'ACTIVE' && (
              <div className="p-4 overflow-y-auto space-y-2 flex-1 max-h-[50vh]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Arraste ou use as setas para definir a ordem dos gráficos:
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {visibleCards.length} de {cardOrder.length} visíveis
                  </span>
                </div>

                {cardOrder.map((id, index) => {
                  const meta = getCardMeta(id);
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
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="text-slate-400 hover:text-slate-600 p-0.5" title="Arraste para mover">
                          <GripVertical className="w-4 h-4" />
                        </div>

                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold font-mono text-[11px] flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className={`text-xs font-bold ${isHidden ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                              {meta.title}
                            </h4>
                            {id === 'ids_clock' && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                                Relógio Oficial
                              </span>
                            )}
                            {isHidden && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-600 font-bold">
                                Oculto
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 block">{meta.category}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Alternar Visibilidade */}
                        <button
                          onClick={() => toggleCardVisibility(id)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            isHidden
                              ? 'border-slate-200 bg-slate-100 text-slate-400 hover:text-slate-700'
                              : 'border-slate-200 bg-white text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title={isHidden ? 'Exibir no painel' : 'Ocultar do painel'}
                        >
                          {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>

                        {/* Mover Topo */}
                        <button
                          onClick={() => moveToTop(id)}
                          disabled={isFirst}
                          className={`p-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer ${
                            isFirst ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                          title="Mover para o topo"
                        >
                          <ChevronsUp className="w-3.5 h-3.5" />
                        </button>

                        {/* Mover Cima */}
                        <button
                          onClick={() => moveCard(id, 'up')}
                          disabled={isFirst}
                          className={`p-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer ${
                            isFirst ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                          title="Subir posição"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        {/* Mover Baixo */}
                        <button
                          onClick={() => moveCard(id, 'down')}
                          disabled={isLast}
                          className={`p-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer ${
                            isLast ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                          title="Descer posição"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Mover Fim */}
                        <button
                          onClick={() => moveToBottom(id)}
                          disabled={isLast}
                          className={`p-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer ${
                            isLast ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                          title="Mover para o final"
                        >
                          <ChevronsDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Excluir do painel */}
                        <button
                          onClick={() => removeCardFromPanel(id)}
                          className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer ml-1"
                          title="Remover este gráfico do painel executivo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Conteúdo da Aba 2: Catálogo de Indicadores & Gráficos */}
            {modalActiveTab === 'CATALOG' && (
              <div className="p-4 flex-1 flex flex-col max-h-[50vh] overflow-hidden space-y-3">
                {/* Busca e Filtros de Categoria */}
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar por código, indicador, resíduo, energia..."
                      value={catalogSearch}
                      onChange={e => setCatalogSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <select
                    value={catalogCategoryFilter}
                    onChange={e => setCatalogCategoryFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-hidden text-slate-700 font-semibold w-full sm:w-auto"
                  >
                    <option value="ALL">Todas as Categorias</option>
                    <option value="Utilidades">Utilidades & Energia</option>
                    <option value="Desmaterialização">Desmaterialização & Papel</option>
                    <option value="Resíduos">Resíduos & Plásticos</option>
                    <option value="Frota">Frota & Mobilidade</option>
                    <option value="Pessoas">Gestão de Pessoas</option>
                    <option value="Governança">Governança & IDS</option>
                  </select>
                </div>

                {/* Lista do Catálogo com Rolagem */}
                <div className="overflow-y-auto space-y-2 flex-1 pr-1">
                  {filteredCatalogCards.map(card => {
                    const isAlreadyInPanel = cardOrder.includes(card.id);

                    return (
                      <div
                        key={card.id}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                          isAlreadyInPanel
                            ? 'border-emerald-200 bg-emerald-50/30'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                            isAlreadyInPanel ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {card.code.slice(0, 4)}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-bold text-slate-900">
                                {card.title}
                              </h4>
                              {card.id === 'ids_clock' && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                                  Relógio Oficial
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-slate-400">
                                ({card.unit || 'indicador'})
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 block">{card.category}</span>
                          </div>
                        </div>

                        <div>
                          {isAlreadyInPanel ? (
                            <button
                              onClick={() => removeCardFromPanel(card.id)}
                              className="px-3 py-1.5 rounded-xl border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Remover</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => addCardToPanel(card.id)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Adicionar ao Painel</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={resetOrder}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  title="Voltar à ordem padrão institucional"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restaurar Padrão
                </button>

                {hiddenCards.length > 0 && (
                  <button
                    onClick={showAllCards}
                    className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Reexibir todos ({hiddenCards.length})
                  </button>
                )}
              </div>

              <button
                onClick={() => setIsReorderModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
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
