import React, { useState, useMemo } from 'react';
import {
  Gauge,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  Info,
  Calendar,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Sliders,
  RotateCcw,
  Building2,
  HelpCircle,
  Award,
  Layers,
  Thermometer,
  Clock,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { IDSComplement, Indicator, IndicatorMeasurement, Organization } from '../types';
import {
  BENCHMARK_STATUS,
  calculateCNJIDS,
  calculateMultiYearCNJIDS,
  CNJIDSResult,
  CNJSubIndicatorItem,
  IDSContext,
  scopeForOrganization
} from '../services/idsCalculator';

/** Formata o resultado bruto de um subindicador (n.d. quando não há dado). */
const fmtRaw = (sub: CNJSubIndicatorItem | undefined, digits = 1) =>
  !sub || !sub.available
    ? 'n.d.'
    : sub.rawValue >= 1000
      ? sub.rawValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
      : sub.rawValue.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

interface IDSThermometerCardProps {
  measurements: IndicatorMeasurement[];
  /** Catálogo de indicadores (para localizar CEE, CA, FTT etc. pela sigla). */
  indicators?: Indicator[];
  /** Variáveis complementares da fonte anual CNJ do órgão selecionado. */
  idsComplements?: IDSComplement[];
  /** Órgão selecionado (define o escopo: seção = 13 indicadores; tribunal/consolidado = 14). */
  organization?: Organization;
  currentYear?: number;
  onYearSelect?: (year: number) => void;
  className?: string;
  defaultExpanded?: boolean;
  initialViewMode?: 'CLOCK' | 'THERMOMETER' | 'COMBINED';
  compact?: boolean;
  showBreakdownToggle?: boolean;
}

// Auxiliares de Trigonometria para o Relógio Analógico (Gauge Semicircular de 240°)
function polarToCartesian(cx: number, cy: number, r: number, angleDegrees: number) {
  // 0° é o topo (12h)
  const rad = ((angleDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad)
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', start.x, start.y,
    'A', r, r, 0, largeArcFlag, 0, end.x, end.y
  ].join(' ');
}

export const IDSThermometerCard: React.FC<IDSThermometerCardProps> = ({
  measurements,
  indicators = [],
  idsComplements = [],
  organization,
  currentYear = 2026,
  onYearSelect,
  className = '',
  defaultExpanded = false,
  initialViewMode = 'CLOCK',
  compact = false,
  showBreakdownToggle = true
}) => {
  const [selectedDisplayYear, setSelectedDisplayYear] = useState<number>(currentYear);
  // Escopo definido pelo órgão: seção judiciária (13 indicadores) ou tribunal/consolidado (14)
  const scope = scopeForOrganization(organization);
  const idsContext: IDSContext = useMemo(
    () => ({ indicators, complements: idsComplements, organization }),
    [indicators, idsComplements, organization]
  );
  const [viewMode, setViewMode] = useState<'CLOCK' | 'THERMOMETER' | 'COMBINED'>(initialViewMode);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState<boolean>(defaultExpanded);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [hoveredSubInd, setHoveredSubInd] = useState<string | null>(null);

  // Simulator adjustment states (percentage shifts or absolute values)
  const [simEnergyReduction, setSimEnergyReduction] = useState<number>(0);
  const [simZeroPlasticCups, setSimZeroPlasticCups] = useState<boolean>(false);
  const [simPservcfBoost, setSimPservcfBoost] = useState<number>(0);

  // Sincronizar ano se a prop currentYear mudar externamente
  React.useEffect(() => {
    setSelectedDisplayYear(currentYear);
  }, [currentYear]);

  // Cálculo da Série Quinquenal oficial com os dados reais
  const multiYear = useMemo(() => {
    return calculateMultiYearCNJIDS(measurements, selectedDisplayYear, scope, idsContext);
  }, [measurements, selectedDisplayYear, scope, idsContext]);

  // Cálculo com simulação ativa se o usuário estiver simulando no ano selecionado
  const activeResult: CNJIDSResult = useMemo(() => {
    if (!isSimulatorOpen || (simEnergyReduction === 0 && !simZeroPlasticCups && simPservcfBoost === 0)) {
      return multiYear.currentResult;
    }

    const baseRes = multiYear.currentResult;
    const rawCeeItem = baseRes.subIndicators.find(i => i.key === 'cre');
    const rawCcItem = baseRes.subIndicators.find(i => i.key === 'cc_ftt');
    const rawPservItem = baseRes.subIndicators.find(i => i.key === 'pservcf');

    const baseCee = baseRes.inputs.cee;
    const simulatedCee = rawCeeItem?.available && baseCee !== null ? baseCee * (1 - simEnergyReduction / 100) : undefined;
    const simulatedCc = simZeroPlasticCups ? 0 : undefined;
    const simulatedPservcf = rawPservItem?.available ? (rawPservItem.rawValue + simPservcfBoost) / 100 : undefined;

    return calculateCNJIDS(measurements, selectedDisplayYear, {
      scope,
      context: idsContext,
      customValues: {
        cee: simulatedCee,
        cc: simulatedCc,
        pservcf: simulatedPservcf
      }
    });
  }, [multiYear.currentResult, isSimulatorOpen, simEnergyReduction, simZeroPlasticCups, simPservcfBoost, measurements, selectedDisplayYear, scope, idsContext]);

  const score = activeResult.idsScore;
  const classification = activeResult.classification;
  const previousYear = selectedDisplayYear - 1;
  const prevResult = multiYear.history.find(h => h.year === previousYear);
  const delta = prevResult && prevResult.hasScore && activeResult.hasScore
    ? Math.round((score - prevResult.idsScore) * 10) / 10
    : null;

  // Parâmetros do Relógio / Gauge (Sweep de 240°, de -120° a +120°)
  // Score 0% -> -120°, Score 50% -> 0°, Score 80% -> +72°, Score 100% -> +120°
  const needleAngle = -120 + (Math.max(0, Math.min(100, score)) / 100) * 240;
  const target80Angle = -120 + 0.8 * 240; // +72°

  // Altura do mercúrio no termômetro vertical (0% a 100%)
  const mercuryHeightPct = Math.max(5, Math.min(100, score));

  // Renderizador do Relógio Analógico (Speedometer / Gauge SVG)
  const renderAnalogClock = (size = 300) => {
    const cx = 150;
    const cy = 135;
    const r = 98;
    const strokeW = 14;

    // Arcos das 4 faixas do CNJ
    // Insuficiente: 0% a 50% (-120° a 0°)
    const arcInsuficiente = describeArc(cx, cy, r, -120, 0);
    // Regular: 50% a 70% (0° a +48°)
    const arcRegular = describeArc(cx, cy, r, 0, 48);
    // Bom: 70% a 80% (+48° a +72°)
    const arcBom = describeArc(cx, cy, r, 48, 72);
    // Excelente: 80% a 100% (+72° a +120°)
    const arcExcelente = describeArc(cx, cy, r, 72, 120);

    // Ponto da Meta CNJ (80%)
    const targetPoint = polarToCartesian(cx, cy, r + 10, target80Angle);

    // Ticks para marcação
    const tickValues = [0, 20, 40, 50, 60, 70, 80, 90, 100];

    return (
      <div className="relative flex flex-col items-center select-none">
        <svg
          viewBox="0 0 300 230"
          className="w-full max-w-[310px] h-auto drop-shadow-sm transition-all"
        >
          <defs>
            <radialGradient id="dialGradient" cx="50%" cy="50%" r="65%">
              <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.4" />
            </radialGradient>
            <radialGradient id="pivotGradient" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="70%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
            <filter id="needleShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.35" />
            </filter>
          </defs>

          {/* Fundo do mostrador circular */}
          <path
            d={describeArc(cx, cy, r + 18, -125, 125)}
            fill="none"
            stroke="url(#dialGradient)"
            strokeWidth="38"
            strokeLinecap="round"
          />

          {/* Trilha base cinza suave */}
          <path
            d={describeArc(cx, cy, r, -120, 120)}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeW}
            strokeLinecap="round"
          />

          {/* Faixa 1: Insuficiente (< 50%) - Vermelho / Rose */}
          <path
            d={arcInsuficiente}
            fill="none"
            stroke="#f43f5e"
            strokeWidth={strokeW}
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* Faixa 2: Regular (50% a 70%) - Âmbar */}
          <path
            d={arcRegular}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={strokeW}
            strokeLinecap="butt"
            opacity="0.9"
          />

          {/* Faixa 3: Bom (70% a 80%) - Teal */}
          <path
            d={arcBom}
            fill="none"
            stroke="#0d9488"
            strokeWidth={strokeW}
            strokeLinecap="butt"
            opacity="0.9"
          />

          {/* Faixa 4: Excelente (80% a 100%) - Esmeralda */}
          <path
            d={arcExcelente}
            fill="none"
            stroke="#059669"
            strokeWidth={strokeW}
            strokeLinecap="round"
            opacity="0.95"
          />

          {/* Graduações e Marcadores de Texto */}
          {tickValues.map(val => {
            const angle = -120 + (val / 100) * 240;
            const ptInner = polarToCartesian(cx, cy, r - 12, angle);
            const ptOuter = polarToCartesian(cx, cy, r - 5, angle);
            const ptText = polarToCartesian(cx, cy, r - 22, angle);
            const isTarget = val === 80;

            return (
              <g key={val}>
                <line
                  x1={ptInner.x}
                  y1={ptInner.y}
                  x2={ptOuter.x}
                  y2={ptOuter.y}
                  stroke={isTarget ? '#059669' : '#64748b'}
                  strokeWidth={isTarget ? 2.5 : 1.2}
                />
                <text
                  x={ptText.x}
                  y={ptText.y + 3}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight={isTarget ? '800' : '600'}
                  fill={isTarget ? '#059669' : '#64748b'}
                  className="font-mono select-none"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Marcador em Destaque da Meta CNJ (80%) */}
          <g transform={`rotate(${target80Angle}, ${cx}, ${cy})`}>
            <polygon
              points={`${cx - 4},${cy - r - 8} ${cx + 4},${cy - r - 8} ${cx},${cy - r - 1}`}
              fill="#059669"
            />
          </g>

          {/* Ponteiro Analógico (Agulha Esbelta com Sombra) */}
          <g
            style={{
              transform: `rotate(${needleAngle}deg)`,
              transformOrigin: `${cx}px ${cy}px`,
              transition: 'transform 0.9s cubic-bezier(0.34, 1.3, 0.64, 1)'
            }}
            filter="url(#needleShadow)"
          >
            {/* Haste do ponteiro */}
            <polygon
              points={`${cx - 3.5},${cy} ${cx + 3.5},${cy} ${cx + 0.8},${cy - r + 8} ${cx - 0.8},${cy - r + 8}`}
              fill="#1e293b"
            />
            {/* Ponta colorida conforme classificação */}
            <polygon
              points={`${cx - 1.2},${cy - r + 8} ${cx + 1.2},${cy - r + 8} ${cx},${cy - r + 2}`}
              fill={classification.color}
            />
            {/* Contra-peso na cauda */}
            <circle cx={cx} cy={cy + 12} r="4.5" fill="#475569" />
          </g>

          {/* Pivô Central (Tampa do Eixo Metálico) */}
          <circle cx={cx} cy={cy} r="10" fill="url(#pivotGradient)" />
          <circle cx={cx} cy={cy} r="5" fill="#f8fafc" opacity="0.9" />
          <circle cx={cx} cy={cy} r="2.5" fill="#0f172a" />

          {/* Display Odométrico / Placar no Centro Inferior */}
          <g transform={`translate(${cx}, ${cy + 42})`}>
            <rect
              x="-68"
              y="-18"
              width="136"
              height="36"
              rx="10"
              fill="#ffffff"
              stroke="#e2e8f0"
              strokeWidth="1.5"
              className="drop-shadow-xs"
            />
            <text
              x="0"
              y="6"
              textAnchor="middle"
              fontSize="20"
              fontWeight="900"
              fill="#0f172a"
              className="font-mono tracking-tight"
            >
              {activeResult.hasScore ? `${score.toFixed(1)}%` : 'n.d.'}
            </text>
          </g>
        </svg>

        {/* Badge da Classificação Oficial CNJ */}
        <div className="flex items-center gap-1.5 -mt-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-2xs border ${classification.bgColor} ${classification.textColor}`}
          >
            {classification.label}
          </span>
        </div>
      </div>
    );
  };

  // Renderizador do Termômetro Vertical de Mercúrio
  const renderMercuryThermometer = () => {
    return (
      <div className="flex items-center gap-5 py-2 select-none">
        {/* Escala Graduada à esquerda do tubo */}
        <div className="flex flex-col justify-between h-52 text-[10px] font-mono font-bold text-slate-400 py-1">
          <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
            100% <span className="w-2 h-0.5 bg-emerald-500"></span>
          </span>
          <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-extrabold">
            80% <span className="w-3.5 h-0.5 bg-emerald-600"></span>
          </span>
          <span className="text-teal-700 dark:text-teal-400 flex items-center gap-1">
            70% <span className="w-2 h-0.5 bg-teal-500"></span>
          </span>
          <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1">
            50% <span className="w-2 h-0.5 bg-amber-500"></span>
          </span>
          <span className="text-rose-700 dark:text-rose-400 flex items-center gap-1">
            25% <span className="w-2 h-0.5 bg-rose-400"></span>
          </span>
          <span className="text-slate-400 flex items-center gap-1">
            0% <span className="w-2 h-0.5 bg-slate-300"></span>
          </span>
        </div>

        {/* Tubo Capilar de Vidro com o Bulbo */}
        <div className="relative flex flex-col items-center">
          {/* Linha da Meta CNJ (80%) */}
          <div
            className="absolute left-[-22px] right-[-22px] border-b-2 border-dashed border-emerald-600 pointer-events-none z-20 flex items-center justify-end"
            style={{ bottom: 'calc(38px + 48 * 0.8 * 3.5px)' }}
            title="Meta CNJ: 80% de IDS"
          >
            <span className="text-[9px] font-mono font-bold bg-emerald-600 text-white px-1 rounded-xs shadow-2xs mr-[-10px]">
              Meta CNJ
            </span>
          </div>

          {/* Tubo Capilar */}
          <div className="w-6 h-52 rounded-t-full bg-slate-200/90 dark:bg-slate-700/90 border-2 border-slate-300 dark:border-slate-600 relative overflow-hidden shadow-inner flex flex-col justify-end p-0.5">
            <div className="absolute inset-0 bg-gradient-to-t from-rose-200/40 via-amber-200/30 via-teal-200/30 to-emerald-200/40 pointer-events-none" />
            <div
              className={`w-full rounded-t-full bg-gradient-to-t ${classification.thermometerColor} transition-all duration-1000 ease-out shadow-sm relative`}
              style={{ height: `${mercuryHeightPct}%` }}
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-full bg-white/70" />
            </div>
          </div>

          {/* Bulbo na Base */}
          <div className="w-11 h-11 -mt-2 rounded-full border-2 border-slate-300 dark:border-slate-600 bg-slate-200/90 dark:bg-slate-700/90 flex items-center justify-center p-1 shadow-md z-10">
            <div className={`w-full h-full rounded-full bg-gradient-to-br ${classification.thermometerColor} shadow-inner flex items-center justify-center`}>
              <div className="w-2.5 h-2.5 rounded-full bg-white/50 blur-2xs -mt-1 -ml-1" />
            </div>
          </div>
        </div>

        {/* Display Numérico */}
        <div className="flex flex-col justify-center">
          <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
            Temperatura IDS
          </div>
          <div className="font-mono text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-baseline gap-1">
            {score.toFixed(1)}
            <span className="text-xl font-bold text-slate-500">%</span>
          </div>

          <div className="mt-2 space-y-1">
            <div className="text-xs font-semibold flex items-center gap-1">
              {delta !== null ? (
                delta >= 0 ? (
                  <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5 font-bold">
                    <TrendingUp className="w-3.5 h-3.5" />
                    +{delta.toFixed(1)}% vs {previousYear}
                  </span>
                ) : (
                  <span className="text-rose-700 dark:text-rose-400 flex items-center gap-0.5 font-bold">
                    <TrendingDown className="w-3.5 h-3.5" />
                    {delta.toFixed(1)}% vs {previousYear}
                  </span>
                )
              ) : (
                <span className="text-slate-400 text-[11px]">Ano base</span>
              )}
            </div>

            <div className="text-[11px] text-slate-500 font-medium">
              {score >= 80 ? (
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Acima da meta CNJ
                </span>
              ) : (
                <span className="text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Faltam {(80 - score).toFixed(1)}% para a meta
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden transition-all ${className}`}>
      {/* 1. Header do Termômetro / Relógio com Identificação Oficial do CNJ */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50/90 via-white to-slate-50/90 dark:from-slate-800/40 dark:via-slate-900 dark:to-slate-800/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 flex items-center justify-center shrink-0 shadow-2xs">
            <Gauge className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 dark:text-emerald-400">
                Índice de Desempenho da Sustentabilidade (IDS)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-bold text-[10px] border border-slate-200 dark:border-slate-700">
                Resolução CNJ nº 400/2021 & AHP
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Relógio do IDS do CNJ — Exercício {selectedDisplayYear}
              {isSimulatorOpen && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 font-medium animate-pulse">
                  Simulação Ativa
                </span>
              )}
            </h3>
          </div>
        </div>

        {/* Controles de Modo de Exibição, Escopo e Ferramentas */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Seletor de Visualização: Relógio vs Termômetro vs Combinado */}
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setViewMode('CLOCK')}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'CLOCK'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Exibir Relógio / Velocímetro Analógico do IDS"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Relógio</span>
            </button>
            <button
              onClick={() => setViewMode('THERMOMETER')}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'THERMOMETER'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Exibir Termômetro Vertical de Mercúrio"
            >
              <Thermometer className="w-3.5 h-3.5" />
              <span>Termômetro</span>
            </button>
            <button
              onClick={() => setViewMode('COMBINED')}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'COMBINED'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Exibir Relógio e Termômetro Juntos"
            >
              <span>Ambos</span>
            </button>
          </div>

          {/* Escopo definido pelo órgão selecionado */}
          <div
            className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 px-2.5 py-1 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
            title={scope === 'JUSTICA_FEDERAL_1GRAU' ? '13 indicadores aplicáveis a seções judiciárias' : '14 indicadores (inclui desembargadoras)'}
          >
            {organization?.acronym || 'Órgão'} · {scope === 'JUSTICA_FEDERAL_1GRAU' ? '1º grau (13 ind.)' : 'Tribunal (14 ind.)'}
          </div>

          {/* Botão Simulador */}
          <button
            onClick={() => setIsSimulatorOpen(prev => !prev)}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all shadow-2xs ${
              isSimulatorOpen
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Simulador</span>
          </button>
        </div>
      </div>

      {/* 2. Área Central: O Relógio / Termômetro + Série Quinquenal dos Anos Passados */}
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Mostrador Principal: Relógio, Termômetro ou Ambos */}
        <div className={`${viewMode === 'COMBINED' ? 'lg:col-span-6' : 'lg:col-span-5'} flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-50/70 to-slate-100/40 dark:from-slate-800/40 dark:to-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 relative`}>
          <div className="text-center mb-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              {viewMode === 'THERMOMETER' ? 'Termômetro de Sustentabilidade' : 'Relógio do IDS — Padrão Oficial CNJ'}
            </span>
          </div>

          {viewMode === 'CLOCK' && renderAnalogClock(290)}

          {viewMode === 'THERMOMETER' && renderMercuryThermometer()}

          {viewMode === 'COMBINED' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center w-full">
              <div className="flex flex-col items-center">{renderAnalogClock(240)}</div>
              <div className="flex justify-center border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 pt-3 md:pt-0 md:pl-3">
                {renderMercuryThermometer()}
              </div>
            </div>
          )}

          {/* Cobertura e natureza do cálculo */}
          <div className="mt-2 w-full max-w-md text-center space-y-1">
            <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
              Cobertura: {activeResult.coverage.available}/{activeResult.coverage.total} indicadores com dados
            </div>
            {BENCHMARK_STATUS === 'PROVISORIO' && (
              <div className="text-[10px] leading-snug text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                Estimativa interna: padronização com faixas de referência provisórias. O IDS oficial depende dos limites nacionais do CNJ.
              </div>
            )}
            {activeResult.notes.map((n, i) => (
              <div key={i} className="text-[10px] leading-snug text-slate-500">{n}</div>
            ))}
          </div>

          {/* Informações adicionais do mostrador */}
          <div className="mt-3 text-center">
            <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1 font-medium">
              {delta !== null && (
                <span>
                  Variação YoY: <strong className={delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{delta >= 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}</strong> vs {previousYear}
                </span>
              )}
              <span className="text-slate-300">·</span>
              <span>Meta CNJ: <strong className="text-emerald-700">≥ 80.0%</strong></span>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Anos Passados (Série 2022-2026) + Resumo dos 4 Eixos Temáticos */}
        <div className={`${viewMode === 'COMBINED' ? 'lg:col-span-6' : 'lg:col-span-7'} space-y-4`}>
          {/* A. Comparativo dos Anos Passados (Mini-Relógios & Mini-Termômetros Quinquenais) */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2.5">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  Evolução do IDS do CNJ na Série Histórica ({multiYear.history[0]?.year} a {multiYear.history[multiYear.history.length - 1]?.year})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Clique em um ano para atualizar o relógio e os dados do painel executivo
                </p>
              </div>

              <div className="text-right">
                <span className={`text-xs font-mono font-bold ${multiYear.fiveYearChange >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700'}`}>
                  {multiYear.fiveYearChange >= 0 ? `+${multiYear.fiveYearChange.toFixed(1)}%` : `${multiYear.fiveYearChange.toFixed(1)}%`}
                </span>
                <span className="text-[10px] text-slate-400 block">no quinquênio</span>
              </div>
            </div>

            {/* Mini-Relógios ou Mini-Termômetros para os 5 anos */}
            <div className="grid grid-cols-5 gap-2 pt-1">
              {multiYear.history.map(item => {
                const isSelected = item.year === selectedDisplayYear;
                const isCurrent = item.year === currentYear;
                const itemClas = item.classification;
                // Ângulo do ponteiro no mini relógio
                const miniNeedleAngle = -120 + (Math.max(0, Math.min(100, item.idsScore)) / 100) * 240;

                return (
                  <button
                    key={item.year}
                    onClick={() => {
                      setSelectedDisplayYear(item.year);
                      if (onYearSelect) onYearSelect(item.year);
                    }}
                    className={`flex flex-col items-center p-2 rounded-xl border transition-all text-center group cursor-pointer ${
                      isSelected
                        ? 'bg-white dark:bg-slate-900 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                        : 'bg-white/70 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      {item.year}
                      {isCurrent && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Ano Corrente" />
                      )}
                    </span>

                    {/* Mini Visualizador (Mini-Relógio em SVG) */}
                    {viewMode === 'CLOCK' || viewMode === 'COMBINED' ? (
                      <div className="my-1.5 relative w-12 h-10 flex items-center justify-center">
                        <svg viewBox="0 0 50 40" className="w-12 h-10 overflow-visible">
                          {/* Trilha do mini relógio */}
                          <path
                            d={describeArc(25, 24, 15, -120, 120)}
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                          />
                          {/* Arco do resultado */}
                          <path
                            d={describeArc(25, 24, 15, -120, miniNeedleAngle)}
                            fill="none"
                            stroke={itemClas.color}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                          />
                          {/* Mini agulha */}
                          <g transform={`rotate(${miniNeedleAngle}, 25, 24)`}>
                            <line x1="25" y1="24" x2="25" y2="10" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
                          </g>
                          <circle cx="25" cy="24" r="2.5" fill="#0f172a" />
                        </svg>
                      </div>
                    ) : (
                      /* Mini Tubo de Termômetro */
                      <div className="w-3 h-14 rounded-full bg-slate-200 dark:bg-slate-700 p-0.5 my-1.5 flex flex-col justify-end overflow-hidden">
                        <div
                          className={`w-full rounded-full bg-gradient-to-t ${itemClas.thermometerColor} transition-all duration-700`}
                          style={{ height: `${Math.max(10, item.idsScore)}%` }}
                        />
                      </div>
                    )}

                    <span className="font-mono text-xs font-black text-slate-900 dark:text-white">
                      {item.hasScore ? `${item.idsScore.toFixed(1)}%` : 'n.d.'}
                    </span>

                    <span className={`text-[9px] font-mono mt-0.5 ${item.deltaYoY !== undefined && item.deltaYoY >= 0 ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-slate-400'}`}>
                      {item.deltaYoY !== undefined ? (item.deltaYoY >= 0 ? `+${item.deltaYoY.toFixed(1)}%` : `${item.deltaYoY.toFixed(1)}%`) : 'base'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* B. Resumo dos 4 Eixos Temáticos de Maior Peso no IDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-2xs">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Energia (cre)</span>
              <div className="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {fmtRaw(activeResult.subIndicators.find(i => i.key === 'cre'), 0)} kWh/p
              </div>
              <div className="text-[9px] text-emerald-700 dark:text-emerald-400 mt-0.5 font-semibold">
                Nota: {(activeResult.subIndicators.find(i => i.key === 'cre')?.normalizedValue || 0).toFixed(2)} (AHP: 1,71)
              </div>
            </div>

            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-2xs">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Água (cra)</span>
              <div className="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {fmtRaw(activeResult.subIndicators.find(i => i.key === 'cra'), 1)} m³/p
              </div>
              <div className="text-[9px] text-emerald-700 dark:text-emerald-400 mt-0.5 font-semibold">
                Nota: {(activeResult.subIndicators.find(i => i.key === 'cra')?.normalizedValue || 0).toFixed(2)} (AHP: 1,71)
              </div>
            </div>

            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-2xs">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Copos (cc)</span>
              <div className="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {fmtRaw(activeResult.subIndicators.find(i => i.key === 'cc_ftt'), 1)} copos/p
              </div>
              <div className="text-[9px] text-emerald-700 dark:text-emerald-400 mt-0.5 font-semibold">
                Nota: {(activeResult.subIndicators.find(i => i.key === 'cc_ftt')?.normalizedValue || 0).toFixed(2)} (AHP: 0.96)
              </div>
            </div>

            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-2xs">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Mulheres Chefia</span>
              <div className="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {fmtRaw(activeResult.subIndicators.find(i => i.key === 'pservcf'), 1)}%
              </div>
              <div className="text-[9px] text-emerald-700 dark:text-emerald-400 mt-0.5 font-semibold">
                Nota: {(activeResult.subIndicators.find(i => i.key === 'pservcf')?.normalizedValue || 0).toFixed(2)} (AHP: 0.96)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Painel do Simulador de Impacto (Se Aberto) */}
      {isSimulatorOpen && (
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                Simulador de Ajustes no IDS ({selectedDisplayYear})
              </h4>
            </div>

            <button
              onClick={() => {
                setSimEnergyReduction(0);
                setSimZeroPlasticCups(false);
                setSimPservcfBoost(0);
              }}
              className="text-xs text-amber-800 dark:text-amber-300 hover:underline flex items-center gap-1 font-semibold"
            >
              <RotateCcw className="w-3 h-3" /> Restaurar Valores Reais
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 space-y-1.5">
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                <span>Redução de Energia Elétrica:</span>
                <span className="font-mono font-bold text-emerald-700">-{simEnergyReduction}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="2"
                value={simEnergyReduction}
                onChange={e => setSimEnergyReduction(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block">
                Impacta 2 variáveis no cálculo (energia per capita e por m²).
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 space-y-1.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Erradicar 100% dos Copos Descartáveis:
                </span>
                <input
                  type="checkbox"
                  checked={simZeroPlasticCups}
                  onChange={e => setSimZeroPlasticCups(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
              </div>
              <span className="text-[10px] text-slate-400 block">
                Alcança nota máxima 1.0 no indicador `cc.ftt` (Resolução CNJ nº 400/2021).
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 space-y-1.5">
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                <span>Aumentar Mulheres em Chefia:</span>
                <span className="font-mono font-bold text-purple-700">+{simPservcfBoost}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="2"
                value={simPservcfBoost}
                onChange={e => setSimPservcfBoost(Number(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block">
                Eleva a pontuação do eixo de Gestão de Pessoas e Equidade de Gênero.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Rodapé Expansível com Decomposição Completa dos 13/14 Subindicadores do Código R */}
      {showBreakdownToggle && (
        <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
          <button
            onClick={() => setIsBreakdownOpen(prev => !prev)}
            className="w-full px-5 py-3 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>
                Decomposição dos {activeResult.subIndicators.length} Indicadores do Algoritmo R do CNJ (Pesos AHP & Normalização)
              </span>
            </div>

            <div className="flex items-center gap-1 text-slate-500 font-semibold">
              <span>{isBreakdownOpen ? 'Ocultar tabela' : 'Inspecionar detalhes'}</span>
              {isBreakdownOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {isBreakdownOpen && (
            <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">Variável R</th>
                    <th className="py-2.5 px-3">Indicador Oficial CNJ</th>
                    <th className="py-2.5 px-3 text-right">Valor Bruto</th>
                    <th className="py-2.5 px-3 text-center">Referência Min–Max</th>
                    <th className="py-2.5 px-3 text-right">Nota Uniforme (0 a 1)</th>
                    <th className="py-2.5 px-3 text-right">Peso AHP</th>
                    <th className="py-2.5 px-3 text-right">Pontos no IDS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {activeResult.subIndicators.map(sub => {
                    const isHovered = hoveredSubInd === sub.key;

                    return (
                      <tr
                        key={sub.key}
                        onMouseEnter={() => setHoveredSubInd(sub.key)}
                        onMouseLeave={() => setHoveredSubInd(null)}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                          isHovered ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                        }`}
                      >
                        <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-200">
                          <code>{sub.variableR}</code>
                        </td>
                        <td className="py-2 px-3 font-sans font-medium text-slate-900 dark:text-white">
                          <div>{sub.name}</div>
                          <div className="text-[10px] text-slate-400 font-sans">{sub.available ? sub.description : sub.note}</div>
                        </td>
                        <td className="py-2 px-3 text-right text-slate-800 dark:text-slate-200 font-bold">
                          {sub.available ? `${fmtRaw(sub, 2)} ${sub.unit}` : <span title={sub.note}>n.d.</span>}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-400 text-[11px]">
                          [{sub.minRef} – {sub.maxRef}]
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className={`font-bold ${sub.normalizedValue >= 0.8 ? 'text-emerald-700 dark:text-emerald-400' : sub.normalizedValue >= 0.5 ? 'text-amber-700 dark:text-amber-400' : 'text-rose-700'}`}>
                              {sub.normalizedValue.toFixed(4)}
                            </span>
                            <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden hidden sm:block">
                              <div
                                className="h-full bg-emerald-600 rounded-full"
                                style={{ width: `${sub.normalizedValue * 100}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                          {sub.ahpWeight.toFixed(2)} ({sub.weightPct}%)
                        </td>
                        <td className="py-2 px-3 text-right font-black text-emerald-800 dark:text-emerald-300">
                          +{sub.contributionPoints.toFixed(1)} pts
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-700">
                  <tr>
                    <td colSpan={5} className="py-2.5 px-3 font-sans text-right text-slate-700 dark:text-slate-300">
                      Soma dos Pesos: {activeResult.totalWeights.toFixed(2)} | IDS Final ({selectedDisplayYear}):
                    </td>
                    <td colSpan={2} className="py-2.5 px-3 text-right font-mono text-sm text-emerald-700 dark:text-emerald-400">
                      {activeResult.hasScore ? `${activeResult.idsScore.toFixed(1)}%` : 'n.d.'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
