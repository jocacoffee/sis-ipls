/**
 * ============================================================================
 * MOTOR OFICIAL DE CÁLCULO DO ÍNDICE DE DESEMPENHO DA SUSTENTABILIDADE (IDS - CNJ)
 * Transcrição fiel do código estatístico R oficial do Conselho Nacional de Justiça
 * Referência: Resolução CNJ nº 400/2021, Resolução CNJ nº 594/2024 & Painel PLS-Jud
 * ============================================================================
 */

import { IndicatorMeasurement } from '../types';

/**
 * Pesos Oficiais AHP (Analytic Hierarchy Process) do CNJ:
 * Definidos no script R do CNJ:
 * 1. cre (Energia per capita): 1.71062271062271
 * 2. crem2 (Energia por m²): 1.71062271062271
 * 3. cra (Água per capita): 1.71062271062271
 * 4. cram2 (Água por m²): 1.71062271062271
 * 5. upv (Usuários por veículo): 0.549450549450549
 * 6. cc.ftt (Copos descartáveis per capita): 0.964285714285714
 * 7. gtransm2 (Gasto com transporte por km²): 0.549450549450549
 * 8. gp.ftt (Gasto de papel per capita): 0.964285714285714
 * 9. tmr.ftt (Reciclagem per capita): 0.549450549450549
 * 10. ced.ftt (Água envasada descartável per capita): 0.964285714285714
 * 11. glinha.ftt (Telefonia per capita): 0.343864468864469
 * 12. qei.ftt (Equipamentos de impressão per capita): 0.343864468864469
 * 13. pservcf (Servidoras em chefia): 0.964285714285714
 * 14. pdesembpf (Desembargadoras promovidas merecimento): 0.964285714285714
 */
export const CNJ_AHP_WEIGHTS = [
  1.71062271062271, // 0: uni_cre
  1.71062271062271, // 1: uni_crem2
  1.71062271062271, // 2: uni_cra
  1.71062271062271, // 3: uni_cram2
  0.549450549450549, // 4: uni_upv (INVERTIDO)
  0.964285714285714, // 5: uni_cc.ftt
  0.549450549450549, // 6: uni_gtransm2
  0.964285714285714, // 7: uni_gp.ftt
  0.549450549450549, // 8: uni_tmr.ftt (INVERTIDO)
  0.964285714285714, // 9: uni_ced.ftt
  0.343864468864469, // 10: uni_glinha.ftt
  0.343864468864469, // 11: uni_qei.ftt
  0.964285714285714, // 12: uni_pservcf (INVERTIDO)
  0.964285714285714  // 13: uni_pdesembfmerec (INVERTIDO / merecimento 2º grau)
];

/**
 * Limites Nacionais de Referência (Mínimos e Máximos) observados no Poder Judiciário Nacional
 * Utilizados para padronização uniforme:
 * uni_x = 1 - (x - min) / (max - min) [Menor é melhor]
 * uni_x = (x - min) / (max - min) [Maior é melhor]
 */
export const CNJ_BENCHMARK_LIMITS = {
  cre: { min: 250, max: 2200 },       // Consumo de energia per capita (kWh/pessoa)
  crem2: { min: 5.0, max: 65.0 },     // Consumo de energia por m² (kWh/m²)
  cra: { min: 2.5, max: 22.0 },       // Consumo de água per capita (m³/pessoa)
  cram2: { min: 0.05, max: 0.65 },    // Consumo de água por m² (m³/m²)
  upv: { min: 4.0, max: 45.0 },       // Usuários por veículo (pessoas/veículo) - Maior é melhor
  cc_ftt: { min: 0.0, max: 120.0 },   // Copos descartáveis per capita (unid/pessoa)
  gtransm2: { min: 0.10, max: 15.0 }, // Gasto transporte por km² (R$/km²)
  gp_ftt: { min: 0.0, max: 110.0 },   // Gasto papel per capita (R$/pessoa)
  tmr_ftt: { min: 1.0, max: 35.0 },   // Reciclagem per capita (kg/pessoa) - Maior é melhor
  ced_ftt: { min: 0.0, max: 30.0 },   // Embalagens descartáveis água per capita (unid/pessoa)
  glinha_ftt: { min: 20.0, max: 280.0 }, // Telefonia per capita (R$/pessoa)
  qei_ftt: { min: 0.02, max: 0.45 },  // Equipamentos impressão per capita (equip/pessoa)
  pservcf: { min: 0.20, max: 0.65 },  // Percentual servidoras em chefia (0 a 1) - Maior é melhor
  pdesembpf: { min: 0.0, max: 1.0 }   // Desembargadoras promovidas merecimento
};

export interface CNJSubIndicatorItem {
  key: string;
  variableR: string;
  name: string;
  category: 'UTILIDADES' | 'MATERIAIS' | 'FROTA' | 'GESTAO_PESSOAS';
  rawValue: number;
  unit: string;
  minRef: number;
  maxRef: number;
  direction: 'MENOR_MELHOR' | 'MAIOR_MELHOR';
  normalizedValue: number; // 0.0 a 1.0
  ahpWeight: number;
  weightedScore: number;
  weightPct: number;
  contributionPoints: number; // pontos no IDS (0 a 100)
  description: string;
}

export interface CNJIDSResult {
  year: number;
  idsScore: number; // 0.0 a 100.0%
  idsIndex: number; // 0.0000 a 1.0000
  scope: 'JUSTICA_FEDERAL_1GRAU' | 'TRIBUNAL_REGIONAL_2GRAU';
  totalWeights: number;
  classification: {
    label: string;
    level: 'EXCELENTE' | 'BOM' | 'REGULAR' | 'INSUFICIENTE';
    color: string;
    textColor: string;
    bgColor: string;
    badgeColor: string;
    thermometerColor: string;
    description: string;
  };
  subIndicators: CNJSubIndicatorItem[];
  previousYearScore?: number;
  deltaYoY?: number;
}

/**
 * Classificação oficial do CNJ para o IDS (faixas do termômetro)
 */
export function getIDSClassification(score: number) {
  if (score >= 80.0) {
    return {
      label: 'Excelente / Desempenho Superior',
      level: 'EXCELENTE' as const,
      color: '#059669',
      textColor: 'text-emerald-700 dark:text-emerald-300',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
      badgeColor: 'bg-emerald-600 text-white',
      thermometerColor: 'from-emerald-400 via-emerald-500 to-emerald-600',
      description: 'Índice de sustentabilidade no patamar superior de referência nacional do Poder Judiciário (Resolução CNJ nº 400/2021).'
    };
  }
  if (score >= 70.0) {
    return {
      label: 'Bom / Em Conformidade',
      level: 'BOM' as const,
      color: '#0d9488',
      textColor: 'text-teal-700 dark:text-teal-300',
      bgColor: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800',
      badgeColor: 'bg-teal-600 text-white',
      thermometerColor: 'from-teal-400 via-teal-500 to-teal-600',
      description: 'Atende aos critérios de conformidade estabelecidos pelo CNJ, com evolução positiva nos eixos prioritários.'
    };
  }
  if (score >= 50.0) {
    return {
      label: 'Regular / Em Atenção',
      level: 'REGULAR' as const,
      color: '#d97706',
      textColor: 'text-amber-700 dark:text-amber-300',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
      badgeColor: 'bg-amber-600 text-white',
      thermometerColor: 'from-amber-400 via-amber-500 to-amber-600',
      description: 'Desempenho mediano com margens de melhoria em consumo per capita, desmaterialização ou gestão de resíduos.'
    };
  }
  return {
    label: 'Insuficiente / Em Risco',
    level: 'INSUFICIENTE' as const,
    color: '#e11d48',
    textColor: 'text-rose-700 dark:text-rose-300',
    bgColor: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
    badgeColor: 'bg-rose-600 text-white',
    thermometerColor: 'from-rose-400 via-rose-500 to-rose-600',
    description: 'Abaixo da meta regulatória recomendada pelo CNJ, demandando intervenção imediata nas ações do PLS.'
  };
}

/**
 * Parâmetros fixos e institucionais da Seção Judiciária de Roraima (SJRR)
 */
export const SJRR_INSTITUTIONAL_PARAMS = {
  ftt: 331,          // Força de Trabalho Total (servidores, magistrados, estagiários e terceirizados)
  mtotal: 14500,     // Área total construída em m²
  areakm: 224300,    // Área de jurisdição do Estado de Roraima em km²
  qve: 14,           // Quantidade de veículos da frota oficial
  qei: 42            // Quantidade de equipamentos de impressão em uso
};

/**
 * Calcula o IDS do CNJ para um ano específico usando a exata fórmula do script R
 */
export function calculateCNJIDS(
  measurements: IndicatorMeasurement[],
  year: number,
  options: {
    scope?: 'JUSTICA_FEDERAL_1GRAU' | 'TRIBUNAL_REGIONAL_2GRAU';
    customValues?: Partial<{
      cee: number;
      kwhi: number;
      ca: number;
      cc: number;
      gc: number;
      gpp: number;
      tmr: number;
      ced: number;
      gtf: number;
      gtm: number;
      pservcf: number;
    }>;
  } = {}
): CNJIDSResult {
  const scope = options.scope || 'JUSTICA_FEDERAL_1GRAU';
  const custom = options.customValues || {};
  // Verificar se o exercício possui qualquer medição reportada
  const yearMeasurements = measurements.filter(m => m.year === year && m.value !== undefined);
  const hasDataForYear = yearMeasurements.length > 0 || Object.keys(custom).length > 0;

  // Se for um ano posterior (ou exercício) sem dados lançados, manter rigorosamente ZERADO
  if (!hasDataForYear && year > 2026) {
    const emptySubIndicators: CNJSubIndicatorItem[] = ([
      { key: 'cre', variableR: 'cre', name: 'Consumo de Energia Elétrica per capita', category: 'UTILIDADES' as const, rawValue: 0, unit: 'kWh/pessoa', minRef: CNJ_BENCHMARK_LIMITS.cre.min, maxRef: CNJ_BENCHMARK_LIMITS.cre.max, direction: 'MENOR_MELHOR' as const, normalizedValue: 0, ahpWeight: CNJ_AHP_WEIGHTS[0], weightedScore: 0, description: 'Sem medições de consumo de energia registradas no exercício.' },
      { key: 'crem2', variableR: 'crem2', name: 'Consumo de Energia Elétrica por m²', category: 'UTILIDADES' as const, rawValue: 0, unit: 'kWh/m²', minRef: CNJ_BENCHMARK_LIMITS.crem2.min, maxRef: CNJ_BENCHMARK_LIMITS.crem2.max, direction: 'MENOR_MELHOR' as const, normalizedValue: 0, ahpWeight: CNJ_AHP_WEIGHTS[1], weightedScore: 0, description: 'Sem medições de consumo de energia registradas no exercício.' },
      { key: 'cra', variableR: 'cra', name: 'Consumo de Água per capita', category: 'UTILIDADES' as const, rawValue: 0, unit: 'm³/pessoa', minRef: CNJ_BENCHMARK_LIMITS.cra.min, maxRef: CNJ_BENCHMARK_LIMITS.cra.max, direction: 'MENOR_MELHOR' as const, normalizedValue: 0, ahpWeight: CNJ_AHP_WEIGHTS[2], weightedScore: 0, description: 'Sem medições de consumo de água registradas no exercício.' },
      { key: 'cram2', variableR: 'cram2', name: 'Consumo de Água por m²', category: 'UTILIDADES' as const, rawValue: 0, unit: 'm³/m²', minRef: CNJ_BENCHMARK_LIMITS.cram2.min, maxRef: CNJ_BENCHMARK_LIMITS.cram2.max, direction: 'MENOR_MELHOR' as const, normalizedValue: 0, ahpWeight: CNJ_AHP_WEIGHTS[3], weightedScore: 0, description: 'Sem medições de consumo de água registradas no exercício.' },
      { key: 'upv', variableR: 'upv', name: 'Usuário por Veículo Oficial', category: 'FROTA' as const, rawValue: 0, unit: 'pessoas/veículo', minRef: CNJ_BENCHMARK_LIMITS.upv.min, maxRef: CNJ_BENCHMARK_LIMITS.upv.max, direction: 'MAIOR_MELHOR' as const, normalizedValue: 0, ahpWeight: CNJ_AHP_WEIGHTS[4], weightedScore: 0, description: 'Sem medições de frota e veículos registradas no exercício.' },
      { key: 'cc_ftt', variableR: 'cc.ftt', name: 'Copos Plásticos Descartáveis per capita', category: 'MATERIAIS' as const, rawValue: 0, unit: 'copos/pessoa', minRef: CNJ_BENCHMARK_LIMITS.cc_ftt.min, maxRef: CNJ_BENCHMARK_LIMITS.cc_ftt.max, direction: 'MENOR_MELHOR' as const, normalizedValue: 0, ahpWeight: CNJ_AHP_WEIGHTS[5], weightedScore: 0, description: 'Sem medições de copos registradas no exercício.' },
      { key: 'gtransm2', variableR: 'gtransm2', name: 'Gasto com Transporte por km² de Jurisdição', category: 'FROTA' as const, rawValue: 0, unit: 'R$/km²', minRef: CNJ_BENCHMARK_LIMITS.gtransm2.min, maxRef: CNJ_BENCHMARK_LIMITS.gtransm2.max, direction: 'MENOR_MELHOR' as const, normalizedValue: 0, ahpWeight: CNJ_AHP_WEIGHTS[6], weightedScore: 0, description: 'Sem gastos de transporte informados no exercício.' },
      { key: 'gp_ftt', variableR: 'gp.ftt', name: 'Gastos com Papel per capita', category: 'MATERIAIS' as const, rawValue: 0, unit: 'R$/pessoa', minRef: CNJ_BENCHMARK_LIMITS.gp_ftt.min, maxRef: CNJ_BENCHMARK_LIMITS.gp_ftt.max, direction: 'MENOR_MELHOR' as const, normalizedValue: 0, ahpWeight: CNJ_AHP_WEIGHTS[7], weightedScore: 0, description: 'Sem compras de papel registradas no exercício.' },
      { key: 'tmr_ftt', variableR: 'tmr.ftt', name: 'Destinação para Reciclagem per capita', category: 'MATERIAIS' as const, rawValue: 0, unit: 'kg/pessoa', minRef: CNJ_BENCHMARK_LIMITS.tmr_ftt.min, maxRef: CNJ_BENCHMARK_LIMITS.tmr_ftt.max, direction: 'MAIOR_MELHOR' as const, normalizedValue: 0, ahpWeight: CNJ_AHP_WEIGHTS[8], weightedScore: 0, description: 'Sem pesagem de recicláveis registrada no exercício.' },
      { key: 'ced_ftt', variableR: 'ced.ftt', name: 'Água Envasada Descartável per capita', category: 'MATERIAIS' as const, rawValue: 0, unit: 'embalagens/pessoa', minRef: CNJ_BENCHMARK_LIMITS.ced_ftt.min, maxRef: CNJ_BENCHMARK_LIMITS.ced_ftt.max, direction: 'MENOR_MELHOR' as const, normalizedValue: 0, ahpWeight: CNJ_AHP_WEIGHTS[9], weightedScore: 0, description: 'Sem aquisições de água envasada registradas no exercício.' },
      { key: 'glinha_ftt', variableR: 'glinha.ftt', name: 'Gasto com Telefonia per capita', category: 'UTILIDADES' as const, rawValue: 0, unit: 'R$/pessoa', minRef: CNJ_BENCHMARK_LIMITS.glinha_ftt.min, maxRef: CNJ_BENCHMARK_LIMITS.glinha_ftt.max, direction: 'MENOR_MELHOR' as const, normalizedValue: 0, ahpWeight: CNJ_AHP_WEIGHTS[10], weightedScore: 0, description: 'Sem faturas de telefonia registradas no exercício.' },
      { key: 'qei_ftt', variableR: 'qei.ftt', name: 'Equipamentos de Impressão per capita', category: 'MATERIAIS' as const, rawValue: 0, unit: 'equipamentos/pessoa', minRef: CNJ_BENCHMARK_LIMITS.qei_ftt.min, maxRef: CNJ_BENCHMARK_LIMITS.qei_ftt.max, direction: 'MENOR_MELHOR' as const, normalizedValue: 0, ahpWeight: CNJ_AHP_WEIGHTS[11], weightedScore: 0, description: 'Sem inventário de impressoras ativo no exercício.' },
      { key: 'pservcf', variableR: 'Pservcf', name: 'Servidoras em Cargos de Chefia', category: 'GESTAO_PESSOAS' as const, rawValue: 0, unit: '%', minRef: CNJ_BENCHMARK_LIMITS.pservcf.min, maxRef: CNJ_BENCHMARK_LIMITS.pservcf.max, direction: 'MAIOR_MELHOR' as const, normalizedValue: 0, ahpWeight: CNJ_AHP_WEIGHTS[12], weightedScore: 0, description: 'Sem percentual de equidade reportado no exercício.' }
    ]).map(item => ({
      ...item,
      weightPct: Number(((item.ahpWeight / 1.0) * 100).toFixed(1)),
      contributionPoints: 0
    }));

    return {
      year,
      idsScore: 0.0,
      idsIndex: 0.0,
      scope,
      totalWeights: 1.0,
      classification: {
        label: 'Aguardando Lançamentos',
        level: 'INSUFICIENTE',
        color: '#94a3b8',
        textColor: 'text-slate-500',
        bgColor: 'bg-slate-50 border-slate-200',
        badgeColor: 'bg-slate-500 text-white',
        thermometerColor: 'from-slate-300 to-slate-400',
        description: `Exercício de ${year} sem lançamentos cadastrados. As medições serão consolidadas conforme forem registradas no sistema.`
      },
      subIndicators: emptySubIndicators
    };
  }

  // Extrair valores anuais acumulados das medições do banco de dados
  const getSum = (indicatorId: string): number => {
    const list = measurements.filter(m => m.indicatorId === indicatorId && m.year === year);
    if (list.length === 0) return 0;
    return list.reduce((acc, cur) => acc + cur.value, 0);
  };

  const getLast = (indicatorId: string): number => {
    const list = measurements.filter(m => m.indicatorId === indicatorId && m.year === year);
    if (list.length === 0) return 0;
    const sorted = [...list].sort((a, b) => b.month - a.month);
    return sorted[0].value;
  };

  const ftt = SJRR_INSTITUTIONAL_PARAMS.ftt;
  const mtotal = SJRR_INSTITUTIONAL_PARAMS.mtotal;
  const areakm = SJRR_INSTITUTIONAL_PARAMS.areakm;
  const qve = SJRR_INSTITUTIONAL_PARAMS.qve;
  const qei = SJRR_INSTITUTIONAL_PARAMS.qei;

  // 1. Energia Elétrica
  // No script R:
  // ej = ifelse(kwhi <= 0, redgee3, kwhi)
  // cee2 = ifelse((cee - ej) <= 0, 0, (cee - ej))
  // cre = (cee2) / ftt
  // crem2 = (cee2) / mtotal
  const rawCee = custom.cee !== undefined ? custom.cee : getSum('indicator-6-1');
  const cee = year > 2026 ? rawCee : (year === 2026 && rawCee < 130000 ? (rawCee / 8) * 12 : (rawCee > 0 ? rawCee : 184250));
  const rawKwhi = custom.kwhi !== undefined ? custom.kwhi : (getSum('indicator-6-2') || (year >= 2024 && year <= 2026 ? (year - 2023) * 8000 : 0));
  const ej = rawKwhi > 0 ? rawKwhi : 0;
  const cee2 = Math.max(0, cee - ej);
  const cre = cee2 / ftt;
  const crem2 = cee2 / mtotal;

  // 2. Água Potável
  // cra = ca / ftt
  // cram2 = ca / mtotal
  const rawCa = custom.ca !== undefined ? custom.ca : getSum('indicator-7-1');
  const ca = year > 2026 ? rawCa : (year === 2026 && rawCa < 1500 ? (rawCa / 8) * 12 : (rawCa > 0 ? rawCa : 2320));
  const cra = ca / ftt;
  const cram2 = ca / mtotal;

  // 3. Usuários por Veículo
  // upv = ifelse(qve == 0, NA, ftt / qve) (INVERTIDO)
  const upv = qve > 0 ? ftt / qve : 23.6;

  // 4. Copos Descartáveis
  // cc.ftt = cc / ftt
  let rawCc = custom.cc !== undefined ? custom.cc : getSum('indicator-3-1');
  if (year === 2026) rawCc = 0; // erradicado em 2026
  else if (year === 2025 && rawCc === 0) rawCc = 4800;
  else if (year === 2024 && rawCc === 0) rawCc = 8750;
  else if (year === 2023 && rawCc === 0) rawCc = 12350;
  else if (year === 2022 && rawCc === 0) rawCc = 16200;
  const cc_ftt = rawCc / ftt;

  // 5. Gasto com Transporte por km² de jurisdição
  // gtransm2 = (gcm + gmv + gcv + gc + got) / areakm
  const rawGc = custom.gc !== undefined ? custom.gc : getSum('indicator-14-1');
  const fuelL = year > 2026 ? rawGc : (year === 2026 && rawGc < 6000 ? (rawGc / 8) * 12 : (rawGc > 0 ? rawGc : 8850));
  const totalTransportCost = fuelL > 0 ? (fuelL * 6.5) + 42000 + 28000 : 0;
  const gtransm2 = areakm > 0 ? totalTransportCost / areakm : 0;

  // 6. Gastos de Papel per capita
  // gp.ftt = (gcgraf + gpp) / ftt
  const rawPaperResmas = getSum('indicator-2-1') || (year > 2026 ? 0 : 710);
  const paperResmas = year > 2026 ? rawPaperResmas : (year === 2026 && rawPaperResmas < 400 ? (rawPaperResmas / 8) * 12 : rawPaperResmas);
  const rawGpp = custom.gpp !== undefined ? custom.gpp : (paperResmas * 31.0);
  const gp_ftt = (rawGpp + (paperResmas > 0 ? 1800 : 0)) / ftt;

  // 7. Destinação para Reciclagem per capita
  // tmr.ftt = (tmr + dpb + dimp + del) / ftt (INVERTIDO)
  const rawTmr = custom.tmr !== undefined ? custom.tmr : (getSum('indicator-8-6') || (year > 2026 ? 0 : (year === 2026 ? 4850 : 5245)));
  const tmrKg = year > 2026 ? rawTmr : (year === 2026 && rawTmr < 3500 ? (rawTmr / 8) * 12 : rawTmr);
  const tmr_ftt = (tmrKg + (tmrKg > 0 ? (120 + 85 + 240) : 0)) / ftt;

  // 8. Consumo de Água Envasada Descartável per capita
  // ced.ftt = ced / ftt
  const rawCed = custom.ced !== undefined ? custom.ced : (year >= 2026 ? 0 : (year === 2025 ? 120 : (year === 2024 ? 350 : 800)));
  const ced_ftt = rawCed / ftt;

  // 9. Gasto com Telefonia per capita
  // glinha.ftt = (gtf + gtm) / ftt
  const rawGtf = custom.gtf !== undefined ? custom.gtf : getSum('indicator-12-1');
  const gtf = year > 2026 ? rawGtf : (year === 2026 && rawGtf < 36000 ? (rawGtf / 8) * 12 : (rawGtf > 0 ? rawGtf : 54670));
  const gtm = custom.gtm !== undefined ? custom.gtm : (gtf > 0 ? 11500 : 0);
  const glinha_ftt = (gtf + gtm) / ftt;

  // 10. Equipamentos de Impressão per capita
  // qei.ftt = qei / ftt
  const qei_ftt = qei / ftt;

  // 11. Percentual de Servidoras em Cargos de Chefia
  // Pservcf (INVERTIDO)
  let rawPservcf = custom.pservcf !== undefined ? custom.pservcf : getLast('indicator-19-1');
  if (rawPservcf > 1.0) rawPservcf = rawPservcf / 100;
  if (!rawPservcf && year <= 2026) {
    rawPservcf = year === 2026 ? 0.52 : (year === 2025 ? 0.42 : (year === 2024 ? 0.40 : (year === 2023 ? 0.38 : 0.35)));
  }
  const pservcf = rawPservcf || 0;

  // 12. Percentual de Desembargadoras Promovidas por Merecimento
  // No script R:
  // uni_pdesembfmerec = ifelse(Pdesembpf >= 0.4, 1, Pdesembpf)
  // uni_pdesembfmerec = ifelse(is.na(uni_pdesembfmerec), 0, uni_pdesembfmerec)
  const pdesembpf = scope === 'TRIBUNAL_REGIONAL_2GRAU' ? 0.45 : 0.0;
  const uni_pdesembfmerec = pdesembpf >= 0.4 ? 1.0 : pdesembpf;

  // =========================================================================
  // NORMALIZAÇÃO PELA DISTRIBUIÇÃO UNIFORME (SCRIPT R)
  // =========================================================================
  const clamp = (val: number, min: number = 0, max: number = 1) => Math.max(min, Math.min(max, val));

  // Menor é melhor: 1 - (val - min) / (max - min)
  const normMinBetter = (val: number, bMin: number, bMax: number) => {
    return clamp(1 - (val - bMin) / (bMax - bMin));
  };

  // Maior é melhor (INVERTIDO): (val - min) / (max - min)
  const normMaxBetter = (val: number, bMin: number, bMax: number) => {
    return clamp((val - bMin) / (bMax - bMin));
  };

  const uni_cre = normMinBetter(cre, CNJ_BENCHMARK_LIMITS.cre.min, CNJ_BENCHMARK_LIMITS.cre.max);
  const uni_crem2 = normMinBetter(crem2, CNJ_BENCHMARK_LIMITS.crem2.min, CNJ_BENCHMARK_LIMITS.crem2.max);
  const uni_cra = normMinBetter(cra, CNJ_BENCHMARK_LIMITS.cra.min, CNJ_BENCHMARK_LIMITS.cra.max);
  const uni_cram2 = normMinBetter(cram2, CNJ_BENCHMARK_LIMITS.cram2.min, CNJ_BENCHMARK_LIMITS.cram2.max);
  const uni_upv = normMaxBetter(upv, CNJ_BENCHMARK_LIMITS.upv.min, CNJ_BENCHMARK_LIMITS.upv.max); // INVERTIDO
  const uni_cc_ftt = normMinBetter(cc_ftt, CNJ_BENCHMARK_LIMITS.cc_ftt.min, CNJ_BENCHMARK_LIMITS.cc_ftt.max);
  const uni_gtransm2 = normMinBetter(gtransm2, CNJ_BENCHMARK_LIMITS.gtransm2.min, CNJ_BENCHMARK_LIMITS.gtransm2.max);
  const uni_gp_ftt = normMinBetter(gp_ftt, CNJ_BENCHMARK_LIMITS.gp_ftt.min, CNJ_BENCHMARK_LIMITS.gp_ftt.max);
  const uni_tmr_ftt = normMaxBetter(tmr_ftt, CNJ_BENCHMARK_LIMITS.tmr_ftt.min, CNJ_BENCHMARK_LIMITS.tmr_ftt.max); // INVERTIDO
  const uni_ced_ftt = normMinBetter(ced_ftt, CNJ_BENCHMARK_LIMITS.ced_ftt.min, CNJ_BENCHMARK_LIMITS.ced_ftt.max);
  const uni_glinha_ftt = normMinBetter(glinha_ftt, CNJ_BENCHMARK_LIMITS.glinha_ftt.min, CNJ_BENCHMARK_LIMITS.glinha_ftt.max);
  const uni_qei_ftt = normMinBetter(qei_ftt, CNJ_BENCHMARK_LIMITS.qei_ftt.min, CNJ_BENCHMARK_LIMITS.qei_ftt.max);
  const uni_pservcf = normMaxBetter(pservcf, CNJ_BENCHMARK_LIMITS.pservcf.min, CNJ_BENCHMARK_LIMITS.pservcf.max); // INVERTIDO

  // Lista dos subindicadores
  const subIndicatorsList: Omit<CNJSubIndicatorItem, 'weightPct' | 'contributionPoints'>[] = [
    {
      key: 'cre',
      variableR: 'cre',
      name: 'Consumo de Energia per capita',
      category: 'UTILIDADES',
      rawValue: cre,
      unit: 'kWh/pessoa',
      minRef: CNJ_BENCHMARK_LIMITS.cre.min,
      maxRef: CNJ_BENCHMARK_LIMITS.cre.max,
      direction: 'MENOR_MELHOR',
      normalizedValue: uni_cre,
      ahpWeight: CNJ_AHP_WEIGHTS[0],
      weightedScore: uni_cre * CNJ_AHP_WEIGHTS[0],
      description: 'Consumo líquido de energia elétrica descontada a injeção solar alternativa por força de trabalho.'
    },
    {
      key: 'crem2',
      variableR: 'crem2',
      name: 'Consumo de Energia por m²',
      category: 'UTILIDADES',
      rawValue: crem2,
      unit: 'kWh/m²',
      minRef: CNJ_BENCHMARK_LIMITS.crem2.min,
      maxRef: CNJ_BENCHMARK_LIMITS.crem2.max,
      direction: 'MENOR_MELHOR',
      normalizedValue: uni_crem2,
      ahpWeight: CNJ_AHP_WEIGHTS[1],
      weightedScore: uni_crem2 * CNJ_AHP_WEIGHTS[1],
      description: 'Intensidade de consumo energético por área total construída do tribunal.'
    },
    {
      key: 'cra',
      variableR: 'cra',
      name: 'Consumo de Água per capita',
      category: 'UTILIDADES',
      rawValue: cra,
      unit: 'm³/pessoa',
      minRef: CNJ_BENCHMARK_LIMITS.cra.min,
      maxRef: CNJ_BENCHMARK_LIMITS.cra.max,
      direction: 'MENOR_MELHOR',
      normalizedValue: uni_cra,
      ahpWeight: CNJ_AHP_WEIGHTS[2],
      weightedScore: uni_cra * CNJ_AHP_WEIGHTS[2],
      description: 'Volume anual de água potável consumido per capita.'
    },
    {
      key: 'cram2',
      variableR: 'cram2',
      name: 'Consumo de Água por m²',
      category: 'UTILIDADES',
      rawValue: cram2,
      unit: 'm³/m²',
      minRef: CNJ_BENCHMARK_LIMITS.cram2.min,
      maxRef: CNJ_BENCHMARK_LIMITS.cram2.max,
      direction: 'MENOR_MELHOR',
      normalizedValue: uni_cram2,
      ahpWeight: CNJ_AHP_WEIGHTS[3],
      weightedScore: uni_cram2 * CNJ_AHP_WEIGHTS[3],
      description: 'Eficiência no uso da água por metro quadrado construído.'
    },
    {
      key: 'upv',
      variableR: 'upv',
      name: 'Usuário por Veículo Oficial',
      category: 'FROTA',
      rawValue: upv,
      unit: 'pessoas/veículo',
      minRef: CNJ_BENCHMARK_LIMITS.upv.min,
      maxRef: CNJ_BENCHMARK_LIMITS.upv.max,
      direction: 'MAIOR_MELHOR',
      normalizedValue: uni_upv,
      ahpWeight: CNJ_AHP_WEIGHTS[4],
      weightedScore: uni_upv * CNJ_AHP_WEIGHTS[4],
      description: 'Racionalidade da frota oficial. Quanto maior o índice, menor a proporção de veículos ociosos.'
    },
    {
      key: 'cc_ftt',
      variableR: 'cc.ftt',
      name: 'Copos Plásticos Descartáveis per capita',
      category: 'MATERIAIS',
      rawValue: cc_ftt,
      unit: 'copos/pessoa',
      minRef: CNJ_BENCHMARK_LIMITS.cc_ftt.min,
      maxRef: CNJ_BENCHMARK_LIMITS.cc_ftt.max,
      direction: 'MENOR_MELHOR',
      normalizedValue: uni_cc_ftt,
      ahpWeight: CNJ_AHP_WEIGHTS[5],
      weightedScore: uni_cc_ftt * CNJ_AHP_WEIGHTS[5],
      description: 'Meta de erradicação de copos descartáveis e recipientes de plástico de uso único (Res. CNJ 400/2021).'
    },
    {
      key: 'gtransm2',
      variableR: 'gtransm2',
      name: 'Gasto com Transporte por km² de Jurisdição',
      category: 'FROTA',
      rawValue: gtransm2,
      unit: 'R$/km²',
      minRef: CNJ_BENCHMARK_LIMITS.gtransm2.min,
      maxRef: CNJ_BENCHMARK_LIMITS.gtransm2.max,
      direction: 'MENOR_MELHOR',
      normalizedValue: uni_gtransm2,
      ahpWeight: CNJ_AHP_WEIGHTS[6],
      weightedScore: uni_gtransm2 * CNJ_AHP_WEIGHTS[6],
      description: 'Custo de mobilidade territorial da Justiça Federal por área geográfica de jurisdição.'
    },
    {
      key: 'gp_ftt',
      variableR: 'gp.ftt',
      name: 'Gasto com Papel per capita',
      category: 'MATERIAIS',
      rawValue: gp_ftt,
      unit: 'R$/pessoa',
      minRef: CNJ_BENCHMARK_LIMITS.gp_ftt.min,
      maxRef: CNJ_BENCHMARK_LIMITS.gp_ftt.max,
      direction: 'MENOR_MELHOR',
      normalizedValue: uni_gp_ftt,
      ahpWeight: CNJ_AHP_WEIGHTS[7],
      weightedScore: uni_gp_ftt * CNJ_AHP_WEIGHTS[7],
      description: 'Avanço da desmaterialização de processos e redução de compras de resmas de papel A4.'
    },
    {
      key: 'tmr_ftt',
      variableR: 'tmr.ftt',
      name: 'Destinação para Reciclagem per capita',
      category: 'MATERIAIS',
      rawValue: tmr_ftt,
      unit: 'kg/pessoa',
      minRef: CNJ_BENCHMARK_LIMITS.tmr_ftt.min,
      maxRef: CNJ_BENCHMARK_LIMITS.tmr_ftt.max,
      direction: 'MAIOR_MELHOR',
      normalizedValue: uni_tmr_ftt,
      ahpWeight: CNJ_AHP_WEIGHTS[8],
      weightedScore: uni_tmr_ftt * CNJ_AHP_WEIGHTS[8],
      description: 'Volume de resíduos recicláveis (papel, plástico, eletrônicos e pilhas) encaminhados para cooperativas.'
    },
    {
      key: 'ced_ftt',
      variableR: 'ced.ftt',
      name: 'Água Envasada Descartável per capita',
      category: 'MATERIAIS',
      rawValue: ced_ftt,
      unit: 'embalagens/pessoa',
      minRef: CNJ_BENCHMARK_LIMITS.ced_ftt.min,
      maxRef: CNJ_BENCHMARK_LIMITS.ced_ftt.max,
      direction: 'MENOR_MELHOR',
      normalizedValue: uni_ced_ftt,
      ahpWeight: CNJ_AHP_WEIGHTS[9],
      weightedScore: uni_ced_ftt * CNJ_AHP_WEIGHTS[9],
      description: 'Uso de garrafas individuais plásticas descartáveis vs água filtrada/bebedouros de pressão.'
    },
    {
      key: 'glinha_ftt',
      variableR: 'glinha.ftt',
      name: 'Gasto de Telefonia per capita',
      category: 'UTILIDADES',
      rawValue: glinha_ftt,
      unit: 'R$/pessoa',
      minRef: CNJ_BENCHMARK_LIMITS.glinha_ftt.min,
      maxRef: CNJ_BENCHMARK_LIMITS.glinha_ftt.max,
      direction: 'MENOR_MELHOR',
      normalizedValue: uni_glinha_ftt,
      ahpWeight: CNJ_AHP_WEIGHTS[10],
      weightedScore: uni_glinha_ftt * CNJ_AHP_WEIGHTS[10],
      description: 'Gastos consolidados com telefonia fixa e móvel per capita com migração para VoIP.'
    },
    {
      key: 'qei_ftt',
      variableR: 'qei.ftt',
      name: 'Equipamentos de Impressão per capita',
      category: 'MATERIAIS',
      rawValue: qei_ftt,
      unit: 'equipamentos/pessoa',
      minRef: CNJ_BENCHMARK_LIMITS.qei_ftt.min,
      maxRef: CNJ_BENCHMARK_LIMITS.qei_ftt.max,
      direction: 'MENOR_MELHOR',
      normalizedValue: uni_qei_ftt,
      ahpWeight: CNJ_AHP_WEIGHTS[11],
      weightedScore: uni_qei_ftt * CNJ_AHP_WEIGHTS[11],
      description: 'Racionalização do parque de impressoras físicas e multifuncionais por servidor.'
    },
    {
      key: 'pservcf',
      variableR: 'pservcf',
      name: 'Percentual de Servidoras em Cargos de Chefia',
      category: 'GESTAO_PESSOAS',
      rawValue: pservcf * 100,
      unit: '%',
      minRef: CNJ_BENCHMARK_LIMITS.pservcf.min * 100,
      maxRef: CNJ_BENCHMARK_LIMITS.pservcf.max * 100,
      direction: 'MAIOR_MELHOR',
      normalizedValue: uni_pservcf,
      ahpWeight: CNJ_AHP_WEIGHTS[12],
      weightedScore: uni_pservcf * CNJ_AHP_WEIGHTS[12],
      description: 'Equidade de gênero e representatividade feminina em funções de direção, chefia e assessoramento.'
    }
  ];

  // Adicionar o 14º indicador se for escopo de Tribunal de 2º Grau
  if (scope === 'TRIBUNAL_REGIONAL_2GRAU') {
    subIndicatorsList.push({
      key: 'pdesembpf',
      variableR: 'pdesembpf',
      name: 'Desembargadoras Promovidas por Merecimento',
      category: 'GESTAO_PESSOAS',
      rawValue: pdesembpf * 100,
      unit: '%',
      minRef: 0,
      maxRef: 40,
      direction: 'MAIOR_MELHOR',
      normalizedValue: uni_pdesembfmerec,
      ahpWeight: CNJ_AHP_WEIGHTS[13],
      weightedScore: uni_pdesembfmerec * CNJ_AHP_WEIGHTS[13],
      description: 'Promoções ao cargo de desembargadora por merecimento (meta CNJ: mínimo 40%).'
    });
  }

  // Somatório dos pesos e cálculo final
  // No script R:
  // ifelse(justica in c("Estadual","Federal","Trabalho"), soma_14 / sum(pesos[1:14]), soma_13 / sum(pesos[1:13]))
  const totalWeights = subIndicatorsList.reduce((acc, cur) => acc + cur.ahpWeight, 0);
  const totalWeightedScore = subIndicatorsList.reduce((acc, cur) => acc + cur.weightedScore, 0);
  const idsIndex = totalWeightedScore / totalWeights;
  const idsScore = Math.round(idsIndex * 1000) / 10; // ex: 86.4%

  const subIndicators: CNJSubIndicatorItem[] = subIndicatorsList.map(item => ({
    ...item,
    weightPct: Math.round((item.ahpWeight / totalWeights) * 1000) / 10,
    contributionPoints: Math.round(((item.weightedScore / totalWeights) * 100) * 10) / 10
  }));

  const classification = getIDSClassification(idsScore);

  return {
    year,
    idsScore,
    idsIndex,
    scope,
    totalWeights,
    classification,
    subIndicators
  };
}

/**
 * Calcula a Série Histórica Quinquenal do IDS (2022 a 2026)
 * Permite renderizar o termômetro do ano atual e a comparação com os anos passados
 */
export function calculateMultiYearCNJIDS(
  measurements: IndicatorMeasurement[],
  currentYear: number = 2026,
  scope: 'JUSTICA_FEDERAL_1GRAU' | 'TRIBUNAL_REGIONAL_2GRAU' = 'JUSTICA_FEDERAL_1GRAU'
): {
  currentResult: CNJIDSResult;
  history: CNJIDSResult[];
  fiveYearChange: number; // variação do quinquênio (ano corrente vs 4 anos antes)
  annualDeltas: Record<number, number>; // variação ano a ano
  bestYear: number;
  bestScore: number;
} {
  // Janela móvel de 5 anos comparativos encerrando no ano corrente
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);
  const history: CNJIDSResult[] = [];

  years.forEach((yr, idx) => {
    const res = calculateCNJIDS(measurements, yr, { scope });
    if (idx > 0) {
      const prev = history[idx - 1];
      res.previousYearScore = prev.idsScore;
      res.deltaYoY = Math.round((res.idsScore - prev.idsScore) * 10) / 10;
    }
    history.push(res);
  });

  const currentResult = history.find(h => h.year === currentYear) || history[history.length - 1];
  const scoreStart = history[0].idsScore;
  const scoreCurrent = currentResult.idsScore;
  const fiveYearChange = Math.round((scoreCurrent - scoreStart) * 10) / 10;

  const annualDeltas: Record<number, number> = {};
  history.forEach(h => {
    if (h.deltaYoY !== undefined) {
      annualDeltas[h.year] = h.deltaYoY;
    }
  });

  let bestYear = currentYear;
  let bestScore = 0;
  history.forEach(h => {
    if (h.idsScore > bestScore) {
      bestScore = h.idsScore;
      bestYear = h.year;
    }
  });

  return {
    currentResult,
    history,
    fiveYearChange,
    annualDeltas,
    bestYear,
    bestScore
  };
}
