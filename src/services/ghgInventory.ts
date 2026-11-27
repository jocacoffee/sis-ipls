import type { Indicator, IndicatorMeasurement } from '../types';

/**
 * Inventário de emissões de GEE calculado a partir das medições do órgão, alinhado à
 * Ferramenta GHG Protocol (Programa Brasileiro GHG Protocol/FGV, versão 2024.0.2), a mesma
 * usada nos inventários da Justiça Federal.
 *
 * - Escopo 1
 *   - Combustão móvel: gasolina (CG), etanol (CE) e diesel (CD). A gasolina C tem etanol anidro e o
 *     diesel B tem biodiesel; o CO2 entra só da parcela fóssil, e o CH4 e o N2O de todas as parcelas
 *     (GWP do AR5: CH4 = 28, N2O = 265). O CO2 dos biocombustíveis é biogênico e fica fora do total.
 *   - Emissões fugitivas: reposição de gases refrigerantes e recarga de extintores de CO2 (campos
 *     complementares 20.C1 a 20.C7). O R-22 (HCFC, Protocolo de Montreal) é relatado fora do total.
 * - Escopo 2 (abordagem por localização): consumo de energia (CEE) de cada mês × fator mensal do SIN
 *   (MCTI); sem fator mensal, a média anual. Em sistema isolado (Roraima até 2025) usa-se o fator
 *   informado no campo FESI ou, sem ele, o fator oficial do sistema (EPE/PASI, 2023–2025); sem
 *   nenhum dos dois, o escopo 2 fica sem cálculo.
 * - Escopo 3: viagens aéreas a serviço (campo GEEViag, coletado do painel de BI de viagens).
 *   O valor informado ao CNJ (GEE-Esc3) aparece à parte, para comparação.
 *
 * Nada é inventado: sem dado de atividade, a linha aparece como "sem dado".
 */

/**
 * Árvores equivalentes: árvores de Mata Atlântica necessárias para fixar 1 tCO2e em 20 anos de
 * crescimento (7,14 árvores/tCO2e; cerca de 140 kg de CO2 por árvore). Estimativa de divulgação,
 * não um fator oficial de compensação: varia com espécie, região, densidade e manejo.
 * Referência: LACERDA, J. S. "Afinal, quanto carbono uma árvore sequestra?", O Eco.
 */
export const TREES_PER_TCO2E = 7.14;

/** GWP-100 do 5º Relatório do IPCC (AR5), adotado pela Ferramenta GHG Protocol. */
export const GWP = { CH4: 28, N2O: 265, HFC32: 677, HFC125: 3170, HFC134a: 1300, HFC143a: 4800, HCFC22: 1760, CO2: 1 };

/**
 * Fatores de combustão móvel rodoviária (kg do gás por litro), da aba "Fatores de Emissão" da
 * Ferramenta GHG Protocol. CO2 dos biocombustíveis é biogênico.
 */
export const FUEL_EF = {
  gasolinaPura: { co2: 2.212, ch4: 0.000807717456, n2o: 0.00025846958592 },
  etanolAnidro: { co2bio: 1.526, ch4: 0.000223543719, n2o: 0.00001341262314 },
  dieselPuro: { co2: 2.603, ch4: 0.00013853116368, n2o: 0.00013853116368 },
  biodiesel: { co2bio: 2.431, ch4: 0.00033159456, n2o: 0.0000198956736 },
  etanolHidratado: { co2bio: 1.457, ch4: 0.00038409954408, n2o: 0.000012803318136 }
};

/** Gases dos campos complementares: GWP da mistura (AR5) e se entra no total (gases do Protocolo de Quioto). */
export const FUGITIVE_GASES: { acronym: string; label: string; gwp: number; inTotal: boolean }[] = [
  { acronym: 'R410A', label: 'Gás refrigerante R-410A', gwp: 0.5 * GWP.HFC32 + 0.5 * GWP.HFC125, inTotal: true },
  { acronym: 'R32', label: 'Gás refrigerante R-32', gwp: GWP.HFC32, inTotal: true },
  { acronym: 'R134a', label: 'Gás refrigerante R-134a', gwp: GWP.HFC134a, inTotal: true },
  { acronym: 'R407C', label: 'Gás refrigerante R-407C', gwp: 0.23 * GWP.HFC32 + 0.25 * GWP.HFC125 + 0.52 * GWP.HFC134a, inTotal: true },
  { acronym: 'R404A', label: 'Gás refrigerante R-404A', gwp: 0.44 * GWP.HFC125 + 0.52 * GWP.HFC143a + 0.04 * GWP.HFC134a, inTotal: true },
  { acronym: 'CO2Ext', label: 'Extintores de CO₂', gwp: GWP.CO2, inTotal: true },
  { acronym: 'R22', label: 'Gás refrigerante R-22 (HCFC, fora do total)', gwp: GWP.HCFC22, inTotal: false }
];

interface IsolatedSystem {
  until: number;
  label: string;
  /** Fatores de emissão do sistema isolado por ano (tCO2/MWh), quando há fonte oficial. */
  factors?: Record<number, { value: number; monthly?: number[] }>;
  factorSource?: string;
}

/**
 * Órgãos atendidos por sistema isolado (fora do SIN) até o ano indicado, inclusive.
 *
 * Sistema Boa Vista (RR), 2023–2025: emissões ÷ geração das usinas que atendem a capital
 * (Jaguatirica II a gás; Monte Cristo, Floresta, Distrito e Novo Paraíso a diesel; biomassa e
 * PCH Jatapú com emissão zero), sem as localidades remotas. Dados mensais por usina do PASI
 * (EPE, com geração da CCEE), que usa os fatores do Informe Técnico EPE nº 011/2022
 * (diesel 0,762 e gás natural 0,367 tCO2/MWh). 2021 e 2022 não constam do PASI: sem fonte
 * oficial, ficam sem cálculo até que se informe o FESI.
 * O valor lançado no campo FESI (20.C8) prevalece sobre estes.
 */
export const ISOLATED_SYSTEM_UNTIL: Record<string, IsolatedSystem> = {
  'org-sjrr': {
    until: 2025,
    label: 'Roraima (sistema isolado até 2025)',
    factorSource: 'EPE/PASI, usinas do sistema Boa Vista (geração CCEE; fatores EPE IT 011/2022)',
    factors: {
      2023: { value: 0.3813, monthly: [0.3627, 0.372, 0.3832, 0.3946, 0.3725, 0.3732, 0.3782, 0.38, 0.4035, 0.3901, 0.3817, 0.3774] },
      2024: { value: 0.3852, monthly: [0.3814, 0.399, 0.4075, 0.4127, 0.3486, 0.3686, 0.3355, 0.364, 0.4093, 0.3886, 0.3916, 0.3972] },
      2025: { value: 0.3359, monthly: [0.3748, 0.386, 0.3605, 0.3394, 0.3188, 0.3392, 0.3511, 0.3454, 0.3252, 0.2828, 0.286, 0.2916] }
    }
  }
};

interface YearFactors {
  /** Fator médio anual do SIN (tCO2/MWh), MCTI. */
  sin?: number;
  /** Fatores mensais do SIN (jan a dez, tCO2/MWh), MCTI. */
  sinMensal?: number[];
  /** Fração volumétrica de etanol anidro na gasolina C (média do ano). */
  etanolNaGasolina: number;
  /** Fração volumétrica de biodiesel no diesel B (média do ano). */
  biodieselNoDiesel: number;
  nota?: string;
}

/**
 * Parâmetros por ano.
 * - 2021 a 2023: fatores mensais do SIN e misturas da aba "Fatores Variáveis" da Ferramenta GHG
 *   Protocol (fonte: MCTI/SIRENE, ANP e CNPE).
 * - 2024: fator médio anual divulgado pelo MCTI; a conferir com a planilha oficial.
 * - Mistura obrigatória: etanol anidro 27% (desde 03/2015) e 30% a partir de 08/2025;
 *   biodiesel conforme as resoluções do CNPE, em média ponderada pelos meses do ano.
 */
export const YEAR_FACTORS: Record<number, YearFactors> = {
  2021: {
    sin: 0.126417,
    sinMensal: [0.1164, 0.082, 0.0673, 0.0764, 0.0883, 0.1491, 0.1634, 0.1743, 0.1699, 0.1786, 0.1484, 0.1029],
    etanolNaGasolina: 0.27, biodieselNoDiesel: 0.111667, nota: 'Biodiesel entre B10 e B13 ao longo do ano.'
  },
  2022: {
    sin: 0.042596,
    sinMensal: [0.0732, 0.050254, 0.040615, 0.021588, 0.028025, 0.044061, 0.041866, 0.045714, 0.049087, 0.047125, 0.040243, 0.029368],
    etanolNaGasolina: 0.27, biodieselNoDiesel: 0.10
  },
  2023: {
    sin: 0.03851,
    sinMensal: [0.029174, 0.023774, 0.029573, 0.034027, 0.029511, 0.052788, 0.04951, 0.041901, 0.034334, 0.03873, 0.052926, 0.045868],
    etanolNaGasolina: 0.27, biodieselNoDiesel: 0.115, nota: 'B10 até março e B12 a partir de abril.'
  },
  2024: { sin: 0.0545, etanolNaGasolina: 0.27, biodieselNoDiesel: 0.137, nota: 'B12 até fevereiro e B14 a partir de março.' },
  2025: { etanolNaGasolina: 0.2825, biodieselNoDiesel: 0.144, nota: 'E27 até julho e E30 a partir de agosto; B14 até julho e B15 a partir de agosto.' },
  2026: { etanolNaGasolina: 0.30, biodieselNoDiesel: 0.15 }
};

const FIRST_YEAR = Math.min(...Object.keys(YEAR_FACTORS).map(Number));

export interface SinFactor {
  value: number | null;
  /** Ano de referência efetivamente usado. */
  refYear: number | null;
  provisional: boolean;
  monthly?: number[];
}

/** Fator do SIN do ano; se não publicado, o do último ano disponível (provisório). */
export function sinFactorFor(year: number): SinFactor {
  for (let y = year; y >= FIRST_YEAR; y--) {
    const f = YEAR_FACTORS[y];
    if (f?.sin != null) return { value: f.sin, refYear: y, provisional: y !== year, monthly: y === year ? f.sinMensal : undefined };
  }
  return { value: null, refYear: null, provisional: true };
}

function blendFor(year: number): YearFactors {
  if (YEAR_FACTORS[year]) return YEAR_FACTORS[year];
  const years = Object.keys(YEAR_FACTORS).map(Number).sort((a, b) => a - b);
  const ref = year < years[0] ? years[0] : years[years.length - 1];
  return YEAR_FACTORS[ref];
}

interface FuelFactor {
  /** kg CO2e (fóssil + CH4 + N2O) por litro do combustível comercial. */
  co2e: number;
  /** kg CO2 biogênico por litro do combustível comercial. */
  co2bio: number;
}

const ghgOf = (ch4: number, n2o: number) => ch4 * GWP.CH4 + n2o * GWP.N2O;

/** Fatores por litro de gasolina C, diesel B e etanol hidratado no ano. */
export function commercialFuelFactors(year: number) {
  const b = blendFor(year);
  const e = b.etanolNaGasolina;
  const d = b.biodieselNoDiesel;
  const { gasolinaPura: gp, etanolAnidro: ea, dieselPuro: dp, biodiesel: bd, etanolHidratado: eh } = FUEL_EF;
  const gasolinaC: FuelFactor = {
    co2e: (1 - e) * (gp.co2 + ghgOf(gp.ch4, gp.n2o)) + e * ghgOf(ea.ch4, ea.n2o),
    co2bio: e * ea.co2bio
  };
  const dieselB: FuelFactor = {
    co2e: (1 - d) * (dp.co2 + ghgOf(dp.ch4, dp.n2o)) + d * ghgOf(bd.ch4, bd.n2o),
    co2bio: d * bd.co2bio
  };
  const etanolHidratado: FuelFactor = { co2e: ghgOf(eh.ch4, eh.n2o), co2bio: eh.co2bio };
  return { gasolinaC, dieselB, etanolHidratado, etanolNaGasolina: e, biodieselNoDiesel: d, nota: b.nota };
}

export type GHGLineKey = 'gasolina' | 'etanol' | 'diesel' | 'energia' | 'viagens' | `fugitiva-${string}`;

export interface GHGLine {
  key: GHGLineKey;
  scope: 1 | 2 | 3;
  source: string;
  indicatorCode: string;
  activity: number | null;
  activityUnit: string;
  /** Fator na unidade exibida (kg CO2e/L, tCO2/MWh ou GWP). */
  factor: number | null;
  factorUnit: string;
  factorSource: string;
  provisional: boolean;
  tCO2e: number | null;
  /** CO2 biogênico (t), fora do total. */
  tCO2bio?: number | null;
  /** Relatado, mas fora do total (R-22). */
  excluded?: boolean;
  /** Meses com dado (indicadores mensais). */
  months?: number;
  /** Aviso específico da linha (ex.: sistema isolado sem fator). */
  warning?: string;
}

export interface GHGYearInventory {
  year: number;
  lines: GHGLine[];
  scope1: number | null;
  scope2: number | null;
  /** Escopo 3 calculado (viagens aéreas). */
  scope3: number | null;
  /** Escopos 1 e 2 calculados pelo iPLS. */
  total12: number | null;
  /** Escopos 1, 2 e 3 calculados pelo iPLS. */
  total: number | null;
  /** CO2 biogênico do escopo 1 (t), relatado à parte. */
  biogenic: number | null;
  /** Escopo 3 informado (GEE-Esc3). */
  scope3Reported: number | null;
  /** Escopos 1 e 2 informados ao CNJ (GEE1e2). */
  reported12: number | null;
  /** Energia injetada na rede por fonte própria (kWh), informativo. */
  injectedKwh: number | null;
  /** Meses de energia lançados (exercício em curso fica parcial). */
  energyMonths: number;
  provisional: boolean;
  /** Avisos gerais do ano (sistema isolado, etc.). */
  warnings: string[];
}

function findIndicator(indicators: Indicator[], acronym: string, code?: string): Indicator | undefined {
  return indicators.find(i => i.acronym === acronym) || (code ? indicators.find(i => i.code === code) : undefined);
}

function yearMeasurements(measurements: IndicatorMeasurement[], ind: Indicator | undefined, year: number) {
  return ind ? measurements.filter(m => m.indicatorId === ind.id && m.year === year && Number.isFinite(m.value)) : [];
}

/** Soma do ano (mensais ou anuais) e número de meses distintos com dado. */
function yearTotal(measurements: IndicatorMeasurement[], ind: Indicator | undefined, year: number) {
  const ms = yearMeasurements(measurements, ind, year);
  if (!ms.length) return { total: null as number | null, months: 0 };
  return { total: ms.reduce((s, m) => s + m.value, 0), months: new Set(ms.map(m => m.month)).size };
}

const sumOrNull = (vals: (number | null | undefined)[]) => {
  const ok = vals.filter((v): v is number => v != null);
  return ok.length ? ok.reduce((a, b) => a + b, 0) : null;
};

const pct = (v: number) => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;

export function computeGHGInventory(
  measurements: IndicatorMeasurement[],
  indicators: Indicator[],
  year: number,
  orgId?: string
): GHGYearInventory {
  const cg = yearTotal(measurements, findIndicator(indicators, 'CG', '14.1'), year);
  const ce = yearTotal(measurements, findIndicator(indicators, 'CE', '14.2'), year);
  const cd = yearTotal(measurements, findIndicator(indicators, 'CD', '14.3'), year);
  const ceeInd = findIndicator(indicators, 'CEE', '6.1');
  const ceeMs = yearMeasurements(measurements, ceeInd, year);
  const cee = yearTotal(measurements, ceeInd, year);
  const inj = yearTotal(measurements, findIndicator(indicators, 'kWhI', '6.7'), year);
  const esc3 = yearTotal(measurements, findIndicator(indicators, 'GEE-Esc3'), year);
  const rep12 = yearTotal(measurements, findIndicator(indicators, 'GEE1e2'), year);
  const viag = yearTotal(measurements, findIndicator(indicators, 'GEEViag', '20.C9'), year);
  const fesiMs = yearMeasurements(measurements, findIndicator(indicators, 'FESI', '20.C8'), year).filter(m => m.value > 0);
  const fesi = fesiMs.length ? fesiMs.reduce((s, m) => s + m.value, 0) / fesiMs.length : null;

  const fuel = commercialFuelFactors(year);
  const sin = sinFactorFor(year);
  const blendProvisional = !YEAR_FACTORS[year];
  const fuelSource = `Ferramenta GHG Protocol (CO₂ fóssil, CH₄ e N₂O)`;
  const warnings: string[] = [];

  const t = (activity: number | null, kgPerUnit: number) => (activity == null ? null : (activity * kgPerUnit) / 1000);

  // Escopo 2
  const isolated = orgId ? ISOLATED_SYSTEM_UNTIL[orgId] : undefined;
  const isIsolated = !!isolated && year <= isolated.until;
  let scope2: number | null = null;
  let energyFactor: number | null = null;
  let energySource: string;
  let energyProvisional = false;
  let energyWarning: string | undefined;
  if (isIsolated) {
    const official = isolated!.factors?.[year];
    if (fesi != null) {
      energyFactor = fesi;
      energySource = `${isolated!.label}: fator informado no campo FESI (20.C8)`;
      if (cee.total != null) scope2 = (cee.total / 1000) * fesi;
    } else if (official) {
      const monthlyEnergy = ceeInd?.periodicity === 'MENSAL';
      if (ceeMs.length) {
        scope2 = ceeMs.reduce((s, m) => {
          const f = monthlyEnergy && official.monthly && m.month >= 1 && m.month <= 12 ? official.monthly[m.month - 1] : official.value;
          return s + (m.value / 1000) * f;
        }, 0);
      }
      energyFactor = scope2 != null && cee.total ? scope2 / (cee.total / 1000) : official.value;
      energySource = `${isolated!.label}: ${isolated!.factorSource}${official.monthly && monthlyEnergy ? ', fatores mensais (média ponderada pelo consumo)' : ''}`;
    } else {
      energyFactor = null;
      energySource = `${isolated!.label}: fator informado no campo FESI (20.C8)`;
    }
    if (cee.total != null && energyFactor == null) {
      energyWarning = 'Sistema isolado: informe o fator de emissão no campo FESI (20.C8).';
      warnings.push(`${isolated!.label}: o fator do SIN não se aplica. Informe o fator de emissão da energia do sistema isolado no campo FESI (20.C8) de ${year} para calcular o escopo 2.`);
    }
  } else {
    const monthlyEnergy = ceeInd?.periodicity === 'MENSAL';
    if (ceeMs.length && sin.value != null) {
      scope2 = ceeMs.reduce((s, m) => {
        const f = monthlyEnergy && sin.monthly && m.month >= 1 && m.month <= 12 ? sin.monthly[m.month - 1] : sin.value!;
        return s + (m.value / 1000) * f;
      }, 0);
    }
    energyFactor = scope2 != null && cee.total ? scope2 / (cee.total / 1000) : sin.value;
    energySource = sin.refYear
      ? sin.monthly && monthlyEnergy
        ? `MCTI, fatores mensais do SIN de ${sin.refYear} (média ponderada pelo consumo)`
        : `MCTI, fator médio anual do SIN de ${sin.refYear}${sin.provisional ? ' (provisório)' : ''}`
      : 'Fator do SIN não disponível';
    energyProvisional = sin.provisional;
  }

  const fugitive: GHGLine[] = FUGITIVE_GASES.flatMap(g => {
    const v = yearTotal(measurements, findIndicator(indicators, g.acronym), year);
    if (v.total == null || v.total <= 0) return [];
    const ind = findIndicator(indicators, g.acronym);
    return [{
      key: `fugitiva-${g.acronym}` as GHGLineKey, scope: 1 as const, source: g.label, indicatorCode: ind?.code || g.acronym,
      activity: v.total, activityUnit: 'kg', factor: g.gwp, factorUnit: 'GWP (AR5)',
      factorSource: g.inTotal ? 'IPCC AR5, conforme a Ferramenta GHG Protocol' : 'IPCC AR5; gás do Protocolo de Montreal, relatado à parte',
      provisional: false, tCO2e: (v.total * g.gwp) / 1000, excluded: !g.inTotal
    }];
  });

  const lines: GHGLine[] = [
    {
      key: 'gasolina', scope: 1, source: 'Frota: gasolina C', indicatorCode: 'CG',
      activity: cg.total, activityUnit: 'litros',
      factor: fuel.gasolinaC.co2e, factorUnit: 'kg CO₂e/L',
      factorSource: `${fuelSource}; ${pct(fuel.etanolNaGasolina)} de etanol anidro`,
      provisional: blendProvisional, tCO2e: t(cg.total, fuel.gasolinaC.co2e), tCO2bio: t(cg.total, fuel.gasolinaC.co2bio)
    },
    {
      key: 'etanol', scope: 1, source: 'Frota: etanol hidratado', indicatorCode: 'CE',
      activity: ce.total, activityUnit: 'litros',
      factor: fuel.etanolHidratado.co2e, factorUnit: 'kg CO₂e/L',
      factorSource: `${fuelSource}; CO₂ biogênico fora do total`,
      provisional: false, tCO2e: t(ce.total, fuel.etanolHidratado.co2e), tCO2bio: t(ce.total, fuel.etanolHidratado.co2bio)
    },
    {
      key: 'diesel', scope: 1, source: 'Frota e geradores: diesel B', indicatorCode: 'CD',
      activity: cd.total, activityUnit: 'litros',
      factor: fuel.dieselB.co2e, factorUnit: 'kg CO₂e/L',
      factorSource: `${fuelSource}; ${pct(fuel.biodieselNoDiesel)} de biodiesel`,
      provisional: blendProvisional, tCO2e: t(cd.total, fuel.dieselB.co2e), tCO2bio: t(cd.total, fuel.dieselB.co2bio)
    },
    ...fugitive,
    {
      key: 'energia', scope: 2, source: 'Energia elétrica adquirida da rede', indicatorCode: 'CEE',
      activity: cee.total, activityUnit: 'kWh',
      factor: energyFactor, factorUnit: 'tCO₂/MWh',
      factorSource: energySource,
      provisional: energyProvisional,
      tCO2e: scope2,
      months: cee.months,
      warning: energyWarning
    },
    {
      key: 'viagens', scope: 3, source: 'Viagens aéreas a serviço', indicatorCode: 'GEEViag',
      activity: viag.total, activityUnit: 'tCO₂e',
      factor: null, factorUnit: '',
      factorSource: 'Painel de BI de viagens, calculado trecho a trecho (distância × fator por faixa)',
      provisional: false, tCO2e: viag.total, months: viag.months
    }
  ];

  const inTotal = (l: GHGLine) => !l.excluded;
  const scope1 = sumOrNull(lines.filter(l => l.scope === 1 && inTotal(l)).map(l => l.tCO2e));
  const scope3 = viag.total;
  const total12 = sumOrNull([scope1, scope2]);

  return {
    year,
    lines,
    scope1,
    scope2,
    scope3,
    total12,
    total: sumOrNull([total12, scope3]),
    biogenic: sumOrNull(lines.map(l => l.tCO2bio)),
    // Valor informado igual a zero significa "não inventariado" (nenhum órgão emite zero)
    scope3Reported: esc3.total && esc3.total > 0 ? esc3.total : null,
    reported12: rep12.total && rep12.total > 0 ? rep12.total : null,
    injectedKwh: inj.total,
    energyMonths: cee.months,
    provisional: lines.some(l => l.provisional && l.tCO2e != null),
    warnings
  };
}

/** Soma os inventários dos órgãos (consolidado regional), linha a linha. */
export function sumGHGInventories(parts: GHGYearInventory[], year: number): GHGYearInventory {
  const keys: GHGLineKey[] = [];
  for (const p of parts) for (const l of p.lines) if (!keys.includes(l.key)) keys.push(l.key);
  const lines: GHGLine[] = keys.map(key => {
    const ls = parts.map(p => p.lines.find(l => l.key === key)).filter((l): l is GHGLine => !!l);
    const first = ls[0];
    const activity = sumOrNull(ls.map(l => l.activity));
    const tCO2e = sumOrNull(ls.map(l => l.tCO2e));
    const covered = sumOrNull(ls.filter(l => l.tCO2e != null).map(l => l.activity));
    let factor: number | null = first.factor;
    if (key === 'energia') factor = tCO2e != null && covered ? tCO2e / (covered / 1000) : null;
    const sources = [...new Set(ls.filter(l => l.activity != null).map(l => l.factorSource))];
    return {
      ...first,
      activity,
      tCO2e,
      tCO2bio: sumOrNull(ls.map(l => l.tCO2bio)),
      factor,
      factorSource: key === 'energia' && sources.length > 1 ? 'Por órgão: SIN (MCTI) e sistema isolado (EPE/PASI ou FESI); fator médio ponderado' : sources[0] || first.factorSource,
      provisional: ls.some(l => l.provisional && l.tCO2e != null),
      months: Math.max(0, ...ls.map(l => l.months || 0)) || undefined,
      warning: ls.some(l => l.warning) ? 'Há órgão em sistema isolado sem o fator informado (FESI); o consumo dele não entra no escopo 2.' : undefined
    };
  });
  const s = (pick: (p: GHGYearInventory) => number | null) => sumOrNull(parts.map(pick));
  return {
    year,
    lines,
    scope1: s(p => p.scope1),
    scope2: s(p => p.scope2),
    scope3: s(p => p.scope3),
    total12: s(p => p.total12),
    total: s(p => p.total),
    biogenic: s(p => p.biogenic),
    scope3Reported: s(p => p.scope3Reported),
    reported12: s(p => p.reported12),
    injectedKwh: s(p => p.injectedKwh),
    energyMonths: Math.max(0, ...parts.map(p => p.energyMonths)),
    provisional: parts.some(p => p.provisional),
    warnings: [...new Set(parts.flatMap(p => p.warnings))]
  };
}

export const hasGHGData = (r: GHGYearInventory) =>
  r.total != null || r.reported12 != null || r.scope3Reported != null;
