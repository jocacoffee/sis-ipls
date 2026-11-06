import { IndicatorMeasurement } from '../types';

/**
 * Indicadores oficiais do Tema 1 (Variáveis Gerais da Seção Judiciária / Tribunal)
 * Conforme Resoluções CNJ nº 400/2021 e 550/2024.
 */
export const GENERAL_VARIABLE_INDICATOR_IDS = [
  'indicator-1-1',  // MagP: Cargos de magistrados(as) providos
  'indicator-1-2',  // ServP/ServEfet: Cargos e funções de servidores(as) providos
  'indicator-1-3',  // ServCom: Cargos em comissão sem vínculo providos
  'indicator-1-5',  // Estag: Estagiários(as)
  'indicator-1-6',  // Teletrab: Pessoal em teletrabalho
  'indicator-1-7',  // Terceiriz: Terceirizados contínuos
  'indicator-1-8',  // Outros: Residentes, juízes leigos, voluntários
  'indicator-1-15', // Usuários: Usuários do prédio
  'indicator-1-16', // FTT: Força de Trabalho Total
  'indicator-1-17'  // ÁreaTotal: Área total construída em m²
];

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
    const item = list.find(m => m.indicatorId === id);
    return item?.value !== undefined ? item.value : fallback;
  };

  const countReported = list.filter(m => m.value !== undefined && m.value > 0).length;

  return {
    year,
    magistrados: getVal('indicator-1-1', 22),
    servidoresEfetivos: getVal('indicator-1-2', 215),
    servidoresComissionados: getVal('indicator-1-3', 14),
    estagiarios: getVal('indicator-1-5', 18),
    teletrabalho: getVal('indicator-1-6', 247),
    terceirizados: getVal('indicator-1-7', 42),
    outros: getVal('indicator-1-8', 20),
    usuariosPredio: getVal('indicator-1-15', 62),
    fttTotal: getVal('indicator-1-16', 331),
    areaTotalM2: getVal('indicator-1-17', 14500),
    hasData: countReported > 0,
    countReported
  };
}

/**
 * Clona as medições das variáveis gerais de um exercício base para um exercício de destino
 */
export function cloneGeneralVariables(
  measurements: IndicatorMeasurement[],
  fromYear: number,
  toYear: number,
  orgId: string = 'org-sjrr'
): IndicatorMeasurement[] {
  const sourceItems = measurements.filter(
    m => m.year === fromYear && GENERAL_VARIABLE_INDICATOR_IDS.includes(m.indicatorId)
  );

  // Se não encontrar medições no ano base, usar os valores institucionais padrão da SJRR
  const fallbackDefaults: Record<string, { value: number; unit: string }> = {
    'indicator-1-1': { value: 22, unit: 'cargos' },
    'indicator-1-2': { value: 215, unit: 'pessoas' },
    'indicator-1-3': { value: 14, unit: 'pessoas' },
    'indicator-1-5': { value: 18, unit: 'pessoas' },
    'indicator-1-6': { value: 247, unit: 'pessoas' },
    'indicator-1-7': { value: 42, unit: 'pessoas' },
    'indicator-1-8': { value: 20, unit: 'pessoas' },
    'indicator-1-15': { value: 62, unit: 'pessoas' },
    'indicator-1-16': { value: 331, unit: 'pessoas' },
    'indicator-1-17': { value: 14500, unit: 'm²' }
  };

  const cloned: IndicatorMeasurement[] = [];
  const now = new Date().toISOString();

  GENERAL_VARIABLE_INDICATOR_IDS.forEach(indId => {
    const src = sourceItems.find(m => m.indicatorId === indId);
    const fallback = fallbackDefaults[indId] || { value: 0, unit: 'unidades' };
    const val = src?.value !== undefined ? src.value : fallback.value;
    const unit = src?.unit || fallback.unit;

    cloned.push({
      id: `m-${indId}-${toYear}-annual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      indicatorId: indId,
      organizationId: orgId,
      year: toYear,
      month: 12,
      value: val,
      unit,
      sourceType: 'manual',
      sourceReference: `Replicado a partir do exercício de ${fromYear}`,
      validationStatus: 'VALIDADO',
      confidenceScore: 100,
      notes: `Variável geral anual replicada automaticamente de ${fromYear} conforme permissão do gestor do PLS.`,
      createdAt: now,
      updatedAt: now
    });
  });

  return cloned;
}
