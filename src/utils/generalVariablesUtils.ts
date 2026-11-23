import { IndicatorMeasurement } from '../types';

/**
 * Indicadores oficiais do Tema 1 (Variáveis Gerais da Seção Judiciária / Tribunal)
 * Conforme Resoluções CNJ nº 400/2021 e 550/2024.
 */
export const GENERAL_VARIABLE_INDICATOR_IDS = [
  'indicator-1-1',  // MagP: cargos de magistrados(as) providos
  'indicator-1-2',  // TPEfet: pessoal do quadro efetivo
  'indicator-1-3',  // TPI: cessão/requisição
  'indicator-1-4',  // TPIExt: ingresso extraordinário (pleitos eleitorais)
  'indicator-1-5',  // TPSV: comissionados sem vínculo
  'indicator-1-7',  // TFAuxT: terceirizados
  'indicator-1-8',  // TFAuxE: estagiários
  'indicator-1-9',  // TFAuxJL: juízes(as) leigos(as)
  'indicator-1-10', // TFAuxSP: serventias privatizadas
  'indicator-1-11', // TFAuxC: conciliadores
  'indicator-1-12', // TFAuxV: voluntários
  'indicator-1-13', // TFAuxA: aprendizes
  'indicator-1-14', // TFAuxRJ: residentes jurídicos
  'indicator-1-17'  // m²Total: área total
  // Serv (1.6), TFAux (1.15) e FTT (1.16) são de cálculo automático
]

export interface GeneralVariablesSummary {
  year: number;
  areaTotalM2: number;
  fttTotal: number;
  magistrados: number;
  servidoresEfetivos: number;
  servidoresComissionados: number;
  estagiarios: number;
  teletrabalho: number;
  terceirizados: number;
  outros: number;
  usuariosPredio: number;
  hasData: boolean;
  countReported: number;
}

/**
 * Verifica se um determinado ano possui variáveis gerais reportadas
 */
export function hasGeneralVariablesForYear(
  measurements: IndicatorMeasurement[],
  year: number
): boolean {
  return measurements.some(
    m => m.year === year && GENERAL_VARIABLE_INDICATOR_IDS.includes(m.indicatorId) && m.value !== undefined && m.value > 0
  );
}

/**
 * Encontra o ano mais recente anterior ao ano informado que possui variáveis gerais cadastradas
 */
export function getLatestYearWithGeneralVariables(
  measurements: IndicatorMeasurement[],
  currentYear: number
): number | null {
  const candidateYears = Array.from(
    new Set(
      measurements
        .filter(m => GENERAL_VARIABLE_INDICATOR_IDS.includes(m.indicatorId) && m.year < currentYear && m.value !== undefined && m.value > 0)
        .map(m => m.year)
    )
  ).sort((a, b) => b - a);

  return candidateYears.length > 0 ? candidateYears[0] : (currentYear > 2026 ? 2026 : null);
}

/**
 * Extrai resumo estruturado das variáveis gerais de um exercício
 */
export function getGeneralVariablesSummary(
  measurements: IndicatorMeasurement[],
  year: number
): GeneralVariablesSummary {
  const list = measurements.filter(m => m.year === year && GENERAL_VARIABLE_INDICATOR_IDS.includes(m.indicatorId));
  const getVal = (id: string, fallback: number = 0) => {
    // Inclui os totais calculados (Serv, TFAux, FTT), que não estão na lista de variáveis lançadas
    const item = measurements.find(m => m.year === year && m.indicatorId === id);
    return item?.value !== undefined ? item.value : fallback;
  };

  const countReported = list.filter(m => m.value !== undefined && m.value > 0).length;

  return {
    year,
    magistrados: getVal('indicator-1-1'),
    servidoresEfetivos: getVal('indicator-1-2'),
    servidoresComissionados: getVal('indicator-1-3'),
    estagiarios: getVal('indicator-1-5'),
    teletrabalho: getVal('indicator-1-6'),
    terceirizados: getVal('indicator-1-7'),
    outros: getVal('indicator-1-8'),
    usuariosPredio: getVal('indicator-1-15'),
    fttTotal: getVal('indicator-1-16'),
    areaTotalM2: getVal('indicator-1-17'),
    hasData: countReported > 0,
    countReported
  };
}
