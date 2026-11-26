import type { Indicator, IndicatorMeasurement } from '../types';

/**
 * Inventário de emissões de GEE calculado a partir das medições do órgão, alinhado à
 * Ferramenta GHG Protocol (Programa Brasileiro GHG Protocol/FGV, versão 2024.0.2), a mesma
 * usada nos inventários da Justiça Federal.
 *
 * - Escopo 1 (combustão móvel): consumo de gasolina (CG), etanol (CE) e diesel (CD).
 *   A gasolina C tem etanol anidro e o diesel B tem biodiesel; a ferramenta separa as parcelas:
 *   CO2 fóssil só da parcela fóssil; CH4 e N2O de todas as parcelas (convertidos em CO2e pelo
 *   GWP do AR5: CH4 = 28, N2O = 265). O CO2 dos biocombustíveis é biogênico e fica fora do total,
 *   relatado à parte.
 * - Escopo 2 (energia adquirida, abordagem por localização): consumo de energia (CEE) de cada mês
 *   × fator mensal do Sistema Interligado Nacional (MCTI); sem fator mensal, o fator médio anual.
 * - Escopo 3: sem variáveis de atividade suficientes no Anexo; usa-se o valor informado (GEE-Esc3).
 * - Para comparação, mostra-se o valor de escopos 1 e 2 informado ao CNJ (GEE1e2), quando houver.
 *
 * Nada é inventado: sem dado de atividade, a linha aparece como "sem dado".
 * Fatores de anos sem publicação usam o último ano disponível e ficam marcados como provisórios.
 */

/** GWP-100 do 5º Relatório do IPCC (AR5), adotado pela Ferramenta GHG Protocol. */
export const GWP = { CH4: 28, N2O: 265 };

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

export type GHGLineKey = 'gasolina' | 'etanol' | 'diesel' | 'energia';

export interface GHGLine {
  key: GHGLineKey;
  scope: 1 | 2;
  source: string;
  indicatorCode: string;
  activity: number | null;
  activityUnit: string;
  /** Fator na unidade exibida (kg CO2e/L ou tCO2/MWh). */
  factor: number | null;
  factorUnit: string;
  factorSource: string;
  provisional: boolean;
  tCO2e: number | null;
  /** CO2 biogênico (t), fora do total. */
  tCO2bio?: number | null;
  /** Meses com dado (indicadores mensais). */
  months?: number;
}

export interface GHGYearInventory {
  year: number;
  lines: GHGLine[];
  scope1: number | null;
  scope2: number | null;
  /** Escopos 1 e 2 calculados pelo iPLS. */
  total12: number | null;
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
  year: number
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

  const fuel = commercialFuelFactors(year);
  const sin = sinFactorFor(year);
  const blendProvisional = !YEAR_FACTORS[year];
  const fuelSource = `Ferramenta GHG Protocol (CO₂ fóssil, CH₄ e N₂O)`;

  const t = (activity: number | null, kgPerUnit: number) => (activity == null ? null : (activity * kgPerUnit) / 1000);

  // Escopo 2: mês a mês com o fator mensal; sem fator mensal (ou lançamento anual), o fator anual
  let scope2: number | null = null;
  const monthlyEnergy = ceeInd?.periodicity === 'MENSAL';
  if (ceeMs.length && sin.value != null) {
    scope2 = ceeMs.reduce((s, m) => {
      const f = monthlyEnergy && sin.monthly && m.month >= 1 && m.month <= 12 ? sin.monthly[m.month - 1] : sin.value!;
      return s + (m.value / 1000) * f;
    }, 0);
  }
  const effectiveSin = scope2 != null && cee.total ? scope2 / (cee.total / 1000) : sin.value;

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
    {
      key: 'energia', scope: 2, source: 'Energia elétrica adquirida da rede', indicatorCode: 'CEE',
      activity: cee.total, activityUnit: 'kWh',
      factor: effectiveSin, factorUnit: 'tCO₂/MWh',
      factorSource: sin.refYear
        ? sin.monthly
          ? `MCTI, fatores mensais do SIN de ${sin.refYear} (média ponderada pelo consumo)`
          : `MCTI, fator médio anual do SIN de ${sin.refYear}${sin.provisional ? ' (provisório)' : ''}`
        : 'Fator do SIN não disponível',
      provisional: sin.provisional,
      tCO2e: scope2,
      months: cee.months
    }
  ];

  const scope1 = sumOrNull(lines.filter(l => l.scope === 1).map(l => l.tCO2e));

  return {
    year,
    lines,
    scope1,
    scope2,
    total12: sumOrNull([scope1, scope2]),
    biogenic: sumOrNull(lines.map(l => l.tCO2bio)),
    // Valor informado igual a zero significa "não inventariado" (nenhum órgão emite zero)
    scope3Reported: esc3.total && esc3.total > 0 ? esc3.total : null,
    reported12: rep12.total && rep12.total > 0 ? rep12.total : null,
    injectedKwh: inj.total,
    energyMonths: cee.months,
    provisional: lines.some(l => l.provisional && l.tCO2e != null)
  };
}

/** Série de anos com algum dado de atividade ou valor informado. */
export function computeGHGSeries(
  measurements: IndicatorMeasurement[],
  indicators: Indicator[],
  years: number[]
): GHGYearInventory[] {
  return years
    .map(y => computeGHGInventory(measurements, indicators, y))
    .filter(r => r.total12 != null || r.reported12 != null || r.scope3Reported != null);
}
