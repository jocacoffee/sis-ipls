import type { Indicator, IndicatorMeasurement } from '../types';

/**
 * Inventário de emissões de GEE calculado a partir das medições do órgão.
 *
 * - Escopo 1 (combustão móvel): consumo de gasolina (CG), etanol (CE) e diesel (CD) × fator de emissão.
 *   Só entra o CO2 de origem fóssil: a gasolina C tem etanol anidro e o diesel B tem biodiesel, cuja
 *   parcela é biogênica; o etanol hidratado não entra no escopo 1 (CO2 biogênico, relatado à parte
 *   pelo GHG Protocol). CH4 e N2O da combustão não estão incluídos (menos de 1% do total).
 * - Escopo 2 (energia adquirida, abordagem por localização): consumo de energia (CEE) × fator médio
 *   anual do Sistema Interligado Nacional (MCTI).
 * - Escopo 3: não há variáveis de atividade suficientes no Anexo; usa-se o valor informado (GEE-Esc3).
 * - Para comparação, mostra-se o valor de escopos 1 e 2 informado ao CNJ (GEE1e2), quando houver.
 *
 * Nada é inventado: sem dado de atividade, a linha aparece como "sem dado".
 * Fatores de anos sem publicação usam o último ano disponível e ficam marcados como provisórios.
 */

/** Combustíveis puros (fração fóssil): kg CO2 por litro. Fonte: 2006 IPCC Guidelines, adotados pelo MCTI e pelo Programa Brasileiro GHG Protocol. */
export const FUEL_FACTORS_KG_PER_L = {
  gasolinaA: 2.212,
  dieselA: 2.603
};

interface YearFactors {
  /** Fator médio anual do SIN (tCO2/MWh), MCTI. */
  sin?: number;
  /** Fração volumétrica de etanol anidro na gasolina C (média do ano). */
  etanolNaGasolina: number;
  /** Fração volumétrica de biodiesel no diesel B (média do ano). */
  biodieselNoDiesel: number;
  nota?: string;
}

/**
 * Parâmetros por ano.
 * - SIN: médias anuais publicadas pelo MCTI (Método da Análise de Despacho/fator médio).
 * - Mistura obrigatória: etanol anidro 27% (desde 03/2015) e 30% a partir de 08/2025;
 *   biodiesel conforme as resoluções do CNPE (B10 a B15), em média ponderada pelos meses do ano.
 */
export const YEAR_FACTORS: Record<number, YearFactors> = {
  2021: { sin: 0.1264, etanolNaGasolina: 0.27, biodieselNoDiesel: 0.11, nota: 'Biodiesel variou entre B10 e B13 no ano.' },
  2022: { sin: 0.0426, etanolNaGasolina: 0.27, biodieselNoDiesel: 0.10 },
  2023: { sin: 0.0385, etanolNaGasolina: 0.27, biodieselNoDiesel: 0.115, nota: 'B10 até março e B12 a partir de abril.' },
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
}

/** Fator do SIN do ano; se não publicado, o do último ano disponível (provisório). */
export function sinFactorFor(year: number): SinFactor {
  for (let y = year; y >= FIRST_YEAR; y--) {
    const f = YEAR_FACTORS[y]?.sin;
    if (f != null) return { value: f, refYear: y, provisional: y !== year };
  }
  return { value: null, refYear: null, provisional: true };
}

function blendFor(year: number): YearFactors {
  if (YEAR_FACTORS[year]) return YEAR_FACTORS[year];
  const years = Object.keys(YEAR_FACTORS).map(Number).sort((a, b) => a - b);
  const ref = year < years[0] ? years[0] : years[years.length - 1];
  return YEAR_FACTORS[ref];
}

/** kg CO2 fóssil por litro de gasolina C e diesel B no ano. */
export function commercialFuelFactors(year: number) {
  const b = blendFor(year);
  return {
    gasolinaC: FUEL_FACTORS_KG_PER_L.gasolinaA * (1 - b.etanolNaGasolina),
    dieselB: FUEL_FACTORS_KG_PER_L.dieselA * (1 - b.biodieselNoDiesel),
    etanolHidratado: 0,
    etanolNaGasolina: b.etanolNaGasolina,
    biodieselNoDiesel: b.biodieselNoDiesel,
    nota: b.nota
  };
}

export type GHGLineKey = 'gasolina' | 'etanol' | 'diesel' | 'energia';

export interface GHGLine {
  key: GHGLineKey;
  scope: 1 | 2;
  source: string;
  indicatorCode: string;
  activity: number | null;
  activityUnit: string;
  /** Fator na unidade exibida (kg CO2/L ou tCO2/MWh). */
  factor: number | null;
  factorUnit: string;
  factorSource: string;
  provisional: boolean;
  tCO2e: number | null;
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

/** Soma do ano (mensais ou anuais) e número de meses distintos com dado. */
function yearTotal(measurements: IndicatorMeasurement[], ind: Indicator | undefined, year: number) {
  if (!ind) return { total: null as number | null, months: 0 };
  const ms = measurements.filter(m => m.indicatorId === ind.id && m.year === year && Number.isFinite(m.value));
  if (!ms.length) return { total: null, months: 0 };
  return { total: ms.reduce((s, m) => s + m.value, 0), months: new Set(ms.map(m => m.month)).size };
}

const sumOrNull = (vals: (number | null)[]) => {
  const ok = vals.filter((v): v is number => v != null);
  return ok.length ? ok.reduce((a, b) => a + b, 0) : null;
};

export function computeGHGInventory(
  measurements: IndicatorMeasurement[],
  indicators: Indicator[],
  year: number
): GHGYearInventory {
  const cg = yearTotal(measurements, findIndicator(indicators, 'CG', '14.1'), year);
  const ce = yearTotal(measurements, findIndicator(indicators, 'CE', '14.2'), year);
  const cd = yearTotal(measurements, findIndicator(indicators, 'CD', '14.3'), year);
  const cee = yearTotal(measurements, findIndicator(indicators, 'CEE', '6.1'), year);
  const inj = yearTotal(measurements, findIndicator(indicators, 'kWhI', '6.7'), year);
  const esc3 = yearTotal(measurements, findIndicator(indicators, 'GEE-Esc3'), year);
  const rep12 = yearTotal(measurements, findIndicator(indicators, 'GEE1e2'), year);

  const fuel = commercialFuelFactors(year);
  const sin = sinFactorFor(year);
  const blendProvisional = !YEAR_FACTORS[year];
  const fuelSource = (pct: number, what: string) =>
    `IPCC 2006/MCTI (combustível puro) com ${(pct * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% de ${what}`;

  const t = (activity: number | null, kgPerUnit: number | null) =>
    activity == null || kgPerUnit == null ? null : (activity * kgPerUnit) / 1000;

  const lines: GHGLine[] = [
    {
      key: 'gasolina', scope: 1, source: 'Frota: gasolina C', indicatorCode: 'CG',
      activity: cg.total, activityUnit: 'litros',
      factor: fuel.gasolinaC, factorUnit: 'kg CO₂/L',
      factorSource: fuelSource(fuel.etanolNaGasolina, 'etanol anidro'),
      provisional: blendProvisional, tCO2e: t(cg.total, fuel.gasolinaC)
    },
    {
      key: 'etanol', scope: 1, source: 'Frota: etanol hidratado', indicatorCode: 'CE',
      activity: ce.total, activityUnit: 'litros',
      factor: 0, factorUnit: 'kg CO₂/L',
      factorSource: 'CO₂ biogênico, fora do escopo 1 (GHG Protocol)',
      provisional: false, tCO2e: ce.total == null ? null : 0
    },
    {
      key: 'diesel', scope: 1, source: 'Frota e geradores: diesel B', indicatorCode: 'CD',
      activity: cd.total, activityUnit: 'litros',
      factor: fuel.dieselB, factorUnit: 'kg CO₂/L',
      factorSource: fuelSource(fuel.biodieselNoDiesel, 'biodiesel'),
      provisional: blendProvisional, tCO2e: t(cd.total, fuel.dieselB)
    },
    {
      key: 'energia', scope: 2, source: 'Energia elétrica adquirida da rede', indicatorCode: 'CEE',
      activity: cee.total, activityUnit: 'kWh',
      factor: sin.value, factorUnit: 'tCO₂/MWh',
      factorSource: sin.refYear
        ? `MCTI, fator médio do SIN de ${sin.refYear}${sin.provisional ? ' (provisório)' : ''}`
        : 'Fator do SIN não disponível',
      provisional: sin.provisional,
      tCO2e: cee.total == null || sin.value == null ? null : (cee.total / 1000) * sin.value,
      months: cee.months
    }
  ];

  const scope1 = sumOrNull(lines.filter(l => l.scope === 1).map(l => l.tCO2e));
  const scope2 = lines.find(l => l.key === 'energia')!.tCO2e;

  return {
    year,
    lines,
    scope1,
    scope2,
    total12: sumOrNull([scope1, scope2]),
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
