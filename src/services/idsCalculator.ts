/**
 * ============================================================================
 * CÁLCULO DO ÍNDICE DE DESEMPENHO DA SUSTENTABILIDADE (IDS - CNJ) POR ÓRGÃO
 * Metodologia: 10º Balanço da Sustentabilidade do Poder Judiciário (CNJ, 2026),
 * conforme o "Mapa IDS" do Painel Unificado de Sustentabilidade da JF1.
 * ============================================================================
 *
 * Etapas:
 *  1. Resultado bruto de cada indicador, a partir dos dados do órgão no ano:
 *     - Energia: Einj = kWhI se > 0; senão Redgee3. Consumo líquido = max(CEE − Einj, 0).
 *       cre = líquido / FTT; crem2 = líquido / m²Total.
 *     - Água: cra = CA / FTT; cram2 = CA / m²Total.
 *     - upv = FTT / QVe (maior é melhor).
 *     - cc.ftt = CC / FTT (convertido de centos para copos).
 *     - gtransm2 = (GMV + GCM + GC + GCV + GOT) / área de jurisdição (km²).
 *     - gp.ftt = (GPP + GCGraf) / FTT.
 *     - tmr.ftt = (TMR + DEl + DImp + DPB) / FTT (TMR já inclui papel, plástico, metal e vidro).
 *     - ced.ftt = CED / FTT; glinha.ftt = (GTF + GTM) / FTT; qei.ftt = QEI / FTT.
 *     - Pservcf (servidoras em chefia) e Pdesembpf (desembargadoras, só 2º grau/tribunal).
 *  2. Padronização 0–1 pela distribuição uniforme entre os limites de referência.
 *     Pdesembpf: 1 se ≥ 40%; abaixo disso, o próprio percentual.
 *  3. IDS = Σ(peso AHP × padronizado) / Σ(pesos), em %.
 *
 * Nada é inventado: indicador sem dado fica "não disponível" e sai do cálculo; o
 * resultado informa a cobertura (quantos dos 13/14 indicadores entraram).
 *
 * ATENÇÃO: a padronização oficial usa a distribuição nacional de todos os tribunais.
 * Enquanto os limites nacionais não forem carregados, os limites abaixo são
 * PROVISÓRIOS e o IDS deve ser lido como estimativa interna.
 */

import { IDSComplement, Indicator, IndicatorMeasurement, Organization } from '../types';

/**
 * Pesos AHP do CNJ (autovetor da matriz de comparação; somam 14).
 * Ordem: cre, crem2, cra, cram2, upv, cc.ftt, gtransm2, gp.ftt, tmr.ftt, ced.ftt,
 * glinha.ftt, qei.ftt, pservcf, pdesembpf.
 */
export const CNJ_AHP_WEIGHTS = [
  1.71062271062271, 1.71062271062271, 1.71062271062271, 1.71062271062271,
  0.549450549450549, 0.964285714285714, 0.549450549450549, 0.964285714285714,
  0.549450549450549, 0.964285714285714, 0.343864468864469, 0.343864468864469,
  0.964285714285714, 0.964285714285714
];

/** Limites de referência PROVISÓRIOS (não oficiais) para a padronização uniforme. */
export const CNJ_BENCHMARK_LIMITS = {
  cre: { min: 250, max: 2200 },          // kWh/pessoa
  crem2: { min: 5.0, max: 65.0 },        // kWh/m²
  cra: { min: 2.5, max: 22.0 },          // m³/pessoa
  cram2: { min: 0.05, max: 0.65 },       // m³/m²
  upv: { min: 4.0, max: 45.0 },          // pessoas/veículo (maior é melhor)
  cc_ftt: { min: 0.0, max: 120.0 },      // copos/pessoa
  gtransm2: { min: 0.1, max: 15.0 },     // R$/km²
  gp_ftt: { min: 0.0, max: 110.0 },      // R$/pessoa
  tmr_ftt: { min: 1.0, max: 35.0 },      // kg/pessoa (maior é melhor)
  ced_ftt: { min: 0.0, max: 30.0 },      // unidades/pessoa
  glinha_ftt: { min: 20.0, max: 280.0 }, // R$/pessoa
  qei_ftt: { min: 0.02, max: 0.45 },     // equipamentos/pessoa
  pservcf: { min: 0.2, max: 0.65 },      // fração (maior é melhor)
  pdesembpf: { min: 0.0, max: 0.4 }      // fração; ≥ 0,4 vale 1
};
export const BENCHMARK_STATUS: 'PROVISORIO' | 'OFICIAL' = 'PROVISORIO';

export type IDSScope = 'JUSTICA_FEDERAL_1GRAU' | 'TRIBUNAL_REGIONAL_2GRAU';

export interface CNJSubIndicatorItem {
  key: string;
  variableR: string;
  name: string;
  category: 'UTILIDADES' | 'MATERIAIS' | 'FROTA' | 'GESTAO_PESSOAS';
  available: boolean;
  /** Motivo da indisponibilidade ou observação sobre o dado usado. */
  note?: string;
  numerator?: number;
  denominator?: number;
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
  idsScore: number; // 0.0 a 100.0 (0 quando não há indicadores disponíveis)
  idsIndex: number; // 0.0000 a 1.0000
  hasScore: boolean;
  scope: IDSScope;
  totalWeights: number;
  coverage: { available: number; total: number };
  notes: string[];
  inputs: Record<string, number | null>;
  classification: ReturnType<typeof getIDSClassification>;
  subIndicators: CNJSubIndicatorItem[];
  previousYearScore?: number;
  deltaYoY?: number;
}

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
      description: 'Índice no patamar superior das faixas de referência.'
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
      description: 'Desempenho bom nas faixas de referência, com evolução positiva nos eixos prioritários.'
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
      description: 'Desempenho mediano, com margem de melhoria em consumo per capita, desmaterialização ou resíduos.'
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
    description: 'Abaixo das faixas de referência, demandando atenção nas ações do PLS.'
  };
}

const NO_DATA_CLASSIFICATION = {
  label: 'Dados insuficientes',
  level: 'INSUFICIENTE' as const,
  color: '#94a3b8',
  textColor: 'text-slate-500',
  bgColor: 'bg-slate-50 border-slate-200',
  badgeColor: 'bg-slate-500 text-white',
  thermometerColor: 'from-slate-300 to-slate-400',
  description: 'Nenhum indicador do IDS tem dados suficientes para este órgão e exercício.'
};

/** Contexto do órgão para o cálculo. */
export interface IDSContext {
  indicators: Indicator[];
  /** Variáveis complementares da fonte anual CNJ (FTT, área, TMR, GCGraf, Redgee3, Pservcf…). */
  complements?: IDSComplement[];
  organization?: Organization;
}

export function scopeForOrganization(org?: Organization): IDSScope {
  return org && org.type === 'SECAO_JUDICIARIA' ? 'JUSTICA_FEDERAL_1GRAU' : 'TRIBUNAL_REGIONAL_2GRAU';
}

type Custom = Partial<Record<'cee' | 'kwhi' | 'ca' | 'cc' | 'gc' | 'gpp' | 'tmr' | 'ced' | 'gtf' | 'gtm' | 'pservcf', number>>;

/**
 * Calcula o IDS de um órgão em um exercício.
 */
export function calculateCNJIDS(
  measurements: IndicatorMeasurement[],
  year: number,
  options: {
    scope?: IDSScope;
    customValues?: Custom;
    context?: IDSContext;
    /** Exercício em curso (padrão: ano atual do relógio do sistema). */
    referenceYear?: number;
  } = {}
): CNJIDSResult {
  const ctx = options.context || { indicators: [] };
  const scope = options.scope || scopeForOrganization(ctx.organization);
  const custom = options.customValues || {};
  const notes: string[] = [];

  const idByAcronym = new Map<string, string>();
  ctx.indicators.forEach(i => i.acronym && idByAcronym.set(i.acronym.toLowerCase(), i.id));
  const yearList = (acr: string) => {
    const id = idByAcronym.get(acr.toLowerCase());
    return id ? measurements.filter(m => m.indicatorId === id && m.year === year) : [];
  };

  // Soma anual de um indicador. No exercício em curso, séries mensais incompletas são
  // projetadas para 12 meses; em exercícios encerrados, usa-se a soma informada
  // (como no Mapa IDS da planilha), registrando os meses faltantes.
  const ongoingYear = year >= (options.referenceYear ?? new Date().getFullYear());
  const annualized = new Set<string>();
  const partial = new Set<string>();
  const sum = (acr: string, monthly = false): number | null => {
    const list = yearList(acr);
    if (list.length === 0) return null;
    const total = list.reduce((a, m) => a + m.value, 0);
    if (monthly && list.length < 12) {
      if (ongoingYear) {
        annualized.add(`${acr} (${list.length}/12 meses)`);
        return (total / list.length) * 12;
      }
      partial.add(`${acr} (${list.length}/12 meses)`);
    }
    return total;
  };
  /** Fluxos anuais (gastos, consumos): soma do ano; se lançado mês a mês, trata como série mensal. */
  const flow = (acr: string): number | null => {
    const list = yearList(acr);
    if (list.length === 0) return null;
    return list.some(m => m.isMonthlyEntry) ? sum(acr, true) : sum(acr);
  };
  const last = (acr: string): number | null => {
    const list = yearList(acr).sort((a, b) => b.month - a.month);
    return list.length ? list[0].value : null;
  };

  // Complementos da fonte anual: valor do ano; para FTT/área/área de jurisdição,
  // usa o último ano anterior com valor positivo (com observação)
  const comps = ctx.complements || [];
  const comp = (field: IDSComplement['field'], allowPrevious = false): number | null => {
    const exact = comps.find(c => c.field === field && c.year === year);
    if (exact && (exact.value > 0 || !allowPrevious)) return exact.value;
    if (!allowPrevious) return null;
    const prev = comps
      .filter(c => c.field === field && c.year < year && c.value > 0)
      .sort((a, b) => b.year - a.year)[0];
    if (prev) {
      notes.push(`${field.toUpperCase()} de ${prev.year} usado em ${year} (sem valor positivo no exercício).`);
      return prev.value;
    }
    return null;
  };
  const firstOf = (...vals: (number | null | undefined)[]) => {
    for (const v of vals) if (v !== null && v !== undefined) return v;
    return null;
  };
  const sumOf = (...vals: (number | null)[]) =>
    vals.every(v => v === null) ? null : vals.reduce<number>((a, v) => a + (v ?? 0), 0);

  // ---------------------------------------------------------------- insumos
  const ftt = firstOf(comp('ftt', true), last('FTT'));
  const mtotal = firstOf(comp('mtotal', true), last('m²Total'));
  const areakm = firstOf(comp('areakm', true), ctx.organization?.jurisdictionAreaKm2 ?? null);

  const cee = firstOf(custom.cee, sum('CEE', true));
  const kwhi = firstOf(custom.kwhi, sum('kWhI', true));
  const redgee3 = comp('redgee3');
  const einj = kwhi !== null && kwhi > 0 ? kwhi : redgee3 ?? 0;
  const ceeNet = cee === null ? null : Math.max(0, cee - einj);

  const ca = firstOf(custom.ca, sum('CA', true));
  const qve = last('QVe');
  const cc = firstOf(custom.cc, sum('CC', true));
  const gc = firstOf(custom.gc, flow('GC'));
  const transport = sumOf(flow('GMV'), flow('GCM'), gc, flow('GCV'), flow('GOT'));
  const gpp = firstOf(custom.gpp, sum('GPP', true));
  const gcgraf = firstOf(comp('gcgraf'), sum('GCGraf', true));
  const paper = gpp === null ? null : gpp + (gcgraf ?? 0);
  const tmrBase = firstOf(
    custom.tmr,
    comp('tmr'),
    sumOf(sum('DPa', true), sum('DPl', true), sum('DMt', true), sum('DVd', true))
  );
  const recycling = tmrBase === null ? null : tmrBase + (flow('DEl') ?? flow('DEI/DEl') ?? 0) + (flow('DImp') ?? 0) + (flow('DPB') ?? 0);
  const ced = firstOf(custom.ced, sum('CED', true));
  const gtf = firstOf(custom.gtf, sum('GTF', true));
  const gtm = firstOf(custom.gtm, sum('GTM', true));
  const phones = sumOf(gtf, gtm);
  const qei = last('QEI');
  const pservRaw = firstOf(custom.pservcf, comp('pservcf'), last('PServCF'));
  const pservcf = pservRaw === null ? null : pservRaw > 1 ? pservRaw / 100 : pservRaw;
  const pdesemb = comp('pdesembpf');

  if (annualized.size) notes.push(`Exercício em curso: projeção anual de ${[...annualized].join(', ')}.`);
  if (partial.size) notes.push(`Meses não informados no exercício: ${[...partial].join(', ')}.`);
  const fttPrev = comps.find(c => c.field === 'ftt' && c.year === year - 1)?.value;
  const fttThis = comps.find(c => c.field === 'ftt' && c.year === year)?.value;
  if (fttPrev && fttThis && Math.abs(fttThis / fttPrev - 1) > 0.5) {
    notes.push(
      `Atenção: FTT variou de ${Math.round(fttPrev).toLocaleString('pt-BR')} (${year - 1}) para ` +
      `${Math.round(fttThis).toLocaleString('pt-BR')} (${year}); indicadores per capita podem estar distorcidos. Verifique a FTT na fonte.`
    );
  }

  // ---------------------------------------------------------------- subindicadores
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const L = CNJ_BENCHMARK_LIMITS;
  type Def = {
    key: keyof typeof L; variableR: string; name: string; category: CNJSubIndicatorItem['category'];
    unit: string; direction: CNJSubIndicatorItem['direction']; weight: number; description: string;
    num: number | null; den: number | null; factor?: number; missing: string; display?: number;
  };
  const per = (v: number | null) => v;
  const defs: Def[] = [
    { key: 'cre', variableR: 'cre', name: 'Energia elétrica per capita', category: 'UTILIDADES', unit: 'kWh/pessoa', direction: 'MENOR_MELHOR', weight: CNJ_AHP_WEIGHTS[0], description: 'Consumo líquido de energia (CEE − energia injetada) por força de trabalho.', num: ceeNet, den: ftt, missing: 'Sem CEE ou FTT no exercício.' },
    { key: 'crem2', variableR: 'crem2', name: 'Energia elétrica por m²', category: 'UTILIDADES', unit: 'kWh/m²', direction: 'MENOR_MELHOR', weight: CNJ_AHP_WEIGHTS[1], description: 'Consumo líquido de energia por área total construída.', num: ceeNet, den: mtotal, missing: 'Sem CEE ou área total (m²).' },
    { key: 'cra', variableR: 'cra', name: 'Água per capita', category: 'UTILIDADES', unit: 'm³/pessoa', direction: 'MENOR_MELHOR', weight: CNJ_AHP_WEIGHTS[2], description: 'Consumo de água por força de trabalho.', num: ca, den: ftt, missing: 'Sem CA ou FTT no exercício.' },
    { key: 'cram2', variableR: 'cram2', name: 'Água por m²', category: 'UTILIDADES', unit: 'm³/m²', direction: 'MENOR_MELHOR', weight: CNJ_AHP_WEIGHTS[3], description: 'Consumo de água por área total construída.', num: ca, den: mtotal, missing: 'Sem CA ou área total (m²).' },
    { key: 'upv', variableR: 'upv', name: 'Usuários por veículo', category: 'FROTA', unit: 'pessoas/veículo', direction: 'MAIOR_MELHOR', weight: CNJ_AHP_WEIGHTS[4], description: 'Força de trabalho por veículo da frota (QVe).', num: ftt, den: qve, missing: 'Sem FTT ou quantidade de veículos (QVe).' },
    { key: 'cc_ftt', variableR: 'cc.ftt', name: 'Copos descartáveis per capita', category: 'MATERIAIS', unit: 'copos/pessoa', direction: 'MENOR_MELHOR', weight: CNJ_AHP_WEIGHTS[5], description: 'Copos descartáveis (CC, em centos) por força de trabalho.', num: per(cc), den: ftt, factor: 100, missing: 'Sem CC ou FTT no exercício.' },
    { key: 'gtransm2', variableR: 'gtransm2', name: 'Gastos de transporte por área de jurisdição', category: 'FROTA', unit: 'R$/km²', direction: 'MENOR_MELHOR', weight: CNJ_AHP_WEIGHTS[6], description: 'GMV + GCM + GC + GCV + GOT por km² de jurisdição.', num: transport, den: areakm, missing: 'Sem gastos de transporte ou área de jurisdição.' },
    { key: 'gp_ftt', variableR: 'gp.ftt', name: 'Gastos de papel e serviços gráficos per capita', category: 'MATERIAIS', unit: 'R$/pessoa', direction: 'MENOR_MELHOR', weight: CNJ_AHP_WEIGHTS[7], description: '(GPP + GCGraf) por força de trabalho.', num: paper, den: ftt, missing: 'Sem GPP ou FTT no exercício.' },
    { key: 'tmr_ftt', variableR: 'tmr.ftt', name: 'Resíduos destinados à reciclagem per capita', category: 'MATERIAIS', unit: 'kg/pessoa', direction: 'MAIOR_MELHOR', weight: CNJ_AHP_WEIGHTS[8], description: '(TMR + DEl + DImp + DPB) por força de trabalho.', num: recycling, den: ftt, missing: 'Sem TMR/resíduos ou FTT no exercício.' },
    { key: 'ced_ftt', variableR: 'ced.ftt', name: 'Água envasada descartável per capita', category: 'MATERIAIS', unit: 'unid./pessoa', direction: 'MENOR_MELHOR', weight: CNJ_AHP_WEIGHTS[9], description: 'Embalagens descartáveis de água (CED) por força de trabalho.', num: ced, den: ftt, missing: 'Sem CED ou FTT no exercício.' },
    { key: 'glinha_ftt', variableR: 'glinha.ftt', name: 'Gastos de telefonia per capita', category: 'UTILIDADES', unit: 'R$/pessoa', direction: 'MENOR_MELHOR', weight: CNJ_AHP_WEIGHTS[10], description: '(GTF + GTM) por força de trabalho.', num: phones, den: ftt, missing: 'Sem GTF/GTM ou FTT no exercício.' },
    { key: 'qei_ftt', variableR: 'qei.ftt', name: 'Equipamentos de impressão per capita', category: 'MATERIAIS', unit: 'equip./pessoa', direction: 'MENOR_MELHOR', weight: CNJ_AHP_WEIGHTS[11], description: 'Equipamentos de impressão (QEI) por força de trabalho.', num: qei, den: ftt, missing: 'Sem QEI ou FTT no exercício.' },
    { key: 'pservcf', variableR: 'Pservcf', name: 'Servidoras em cargos de chefia', category: 'GESTAO_PESSOAS', unit: '%', direction: 'MAIOR_MELHOR', weight: CNJ_AHP_WEIGHTS[12], description: 'Percentual de servidoras em cargos e funções de chefia.', num: pservcf, den: 1, missing: 'Percentual não informado para este órgão/exercício.' }
  ];
  if (scope === 'TRIBUNAL_REGIONAL_2GRAU') {
    defs.push({ key: 'pdesembpf', variableR: 'Pdesembpf', name: 'Desembargadoras da carreira da magistratura', category: 'GESTAO_PESSOAS', unit: '%', direction: 'MAIOR_MELHOR', weight: CNJ_AHP_WEIGHTS[13], description: 'Percentual de desembargadoras nas vagas da carreira; ≥ 40% vale nota máxima.', num: pdesemb, den: 1, missing: 'Percentual não informado para este órgão/exercício.' });
  }

  const items = defs.map(d => {
    const lim = L[d.key];
    const available = d.num !== null && d.den !== null && d.den > 0;
    const raw = available ? (d.num! * (d.factor ?? 1)) / d.den! : 0;
    let norm = 0;
    if (available) {
      if (d.key === 'pdesembpf') norm = raw >= 0.4 ? 1 : clamp(raw);
      else if (d.direction === 'MENOR_MELHOR') norm = clamp(1 - (raw - lim.min) / (lim.max - lim.min));
      else norm = clamp((raw - lim.min) / (lim.max - lim.min));
    }
    const isPct = d.unit === '%';
    return {
      key: d.key,
      variableR: d.variableR,
      name: d.name,
      category: d.category,
      available,
      note: available ? undefined : d.missing,
      numerator: d.num ?? undefined,
      denominator: d.den ?? undefined,
      rawValue: isPct ? raw * 100 : raw,
      unit: d.unit,
      minRef: isPct ? lim.min * 100 : lim.min,
      maxRef: isPct ? lim.max * 100 : lim.max,
      direction: d.direction,
      normalizedValue: norm,
      ahpWeight: d.weight,
      weightedScore: available ? norm * d.weight : 0,
      description: d.description
    };
  });

  const usedWeights = items.filter(i => i.available).reduce((a, i) => a + i.ahpWeight, 0);
  const totalWeightedScore = items.reduce((a, i) => a + i.weightedScore, 0);
  const hasScore = usedWeights > 0;
  const idsIndex = hasScore ? totalWeightedScore / usedWeights : 0;
  const idsScore = Math.round(idsIndex * 1000) / 10;
  const availableCount = items.filter(i => i.available).length;
  if (hasScore && availableCount < items.length) {
    notes.push(`IDS parcial: ${availableCount} de ${items.length} indicadores com dados; pesos redistribuídos entre os disponíveis.`);
  }

  const subIndicators: CNJSubIndicatorItem[] = items.map(i => ({
    ...i,
    weightPct: hasScore && i.available ? Math.round((i.ahpWeight / usedWeights) * 1000) / 10 : 0,
    contributionPoints: hasScore ? Math.round((i.weightedScore / usedWeights) * 1000) / 10 : 0
  }));

  return {
    year,
    idsScore,
    idsIndex,
    hasScore,
    scope,
    totalWeights: usedWeights,
    coverage: { available: availableCount, total: items.length },
    notes,
    inputs: { ftt, mtotal, areakm, cee, kwhi, redgee3, ceeNet, ca, qve, cc, transport, gpp, gcgraf, paper, recycling, ced, phones, qei, pservcf, pdesemb },
    classification: hasScore ? getIDSClassification(idsScore) : NO_DATA_CLASSIFICATION,
    subIndicators
  };
}

/**
 * Série de 5 exercícios do IDS encerrando no ano corrente.
 */
export function calculateMultiYearCNJIDS(
  measurements: IndicatorMeasurement[],
  currentYear: number = 2026,
  scope?: IDSScope,
  context?: IDSContext
): {
  currentResult: CNJIDSResult;
  history: CNJIDSResult[];
  fiveYearChange: number;
  annualDeltas: Record<number, number>;
  bestYear: number;
  bestScore: number;
} {
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);
  const history: CNJIDSResult[] = [];

  years.forEach(yr => {
    const res = calculateCNJIDS(measurements, yr, { scope, context });
    const prev = [...history].reverse().find(h => h.hasScore);
    if (prev && res.hasScore) {
      res.previousYearScore = prev.idsScore;
      res.deltaYoY = Math.round((res.idsScore - prev.idsScore) * 10) / 10;
    }
    history.push(res);
  });

  const currentResult = history.find(h => h.year === currentYear) || history[history.length - 1];
  const scored = history.filter(h => h.hasScore);
  const fiveYearChange = scored.length >= 2 && currentResult.hasScore
    ? Math.round((currentResult.idsScore - scored[0].idsScore) * 10) / 10
    : 0;

  const annualDeltas: Record<number, number> = {};
  history.forEach(h => {
    if (h.deltaYoY !== undefined) annualDeltas[h.year] = h.deltaYoY;
  });

  let bestYear = currentYear;
  let bestScore = 0;
  scored.forEach(h => {
    if (h.idsScore > bestScore) {
      bestScore = h.idsScore;
      bestYear = h.year;
    }
  });

  return { currentResult, history, fiveYearChange, annualDeltas, bestYear, bestScore };
}
