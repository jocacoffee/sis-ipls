/**
 * ============================================================================
 * UTILITÁRIO DE GESTÃO DE EXERCÍCIOS, ANOS FUTUROS E CICLOS DO PLS (CNJ)
 * Garante que o sistema opere continuamente ano após ano sem necessidade de
 * reconfiguração ou intervenção no código-fonte.
 * ============================================================================
 */

import { IndicatorMeasurement, IndicatorTarget, PLSCycle } from '../types';

export const BASE_START_YEAR = 2021; // Início do 1º Ciclo da Resolução CNJ nº 400/2021
export const FUTURE_HORIZON_YEARS = 8; // Janela de planejamento futuro antecipada

/**
 * Retorna o ano calendário atual do sistema
 */
export function getCurrentCalendarYear(): number {
  return new Date().getFullYear();
}

/**
 * Gera dinamicamente a lista de anos disponíveis no sistema:
 * - Todos os anos que já possuem medições registradas (passados e presentes)
 * - Todos os anos que possuem metas cadastradas
 * - O ano calendário atual
 * - Anos futuros de planejamento (pelo menos até 2035 ou horizonte futuro)
 */
export function getSystemAvailableYears(
  measurements: IndicatorMeasurement[] = [],
  targets: IndicatorTarget[] = [],
  extraSelectedYear?: number
): number[] {
  const currentYear = getCurrentCalendarYear();
  const yearsSet = new Set<number>();

  // 1. Anos da série histórica base (2021 em diante)
  for (let y = BASE_START_YEAR; y <= Math.max(currentYear + 2, 2027); y++) {
    yearsSet.add(y);
  }

  // 2. Anos presentes nas medições existentes
  measurements.forEach(m => {
    if (m.year && m.year >= 2015 && m.year <= 2050) {
      yearsSet.add(m.year);
    }
  });

  // 3. Anos presentes nas metas cadastradas
  targets.forEach(t => {
    if (t.year && t.year >= 2015 && t.year <= 2050) {
      yearsSet.add(t.year);
    }
  });

  // 4. Ano atualmente selecionado
  if (extraSelectedYear && extraSelectedYear >= 2015 && extraSelectedYear <= 2050) {
    yearsSet.add(extraSelectedYear);
  }

  // 5. Futuros anos de projeção do ciclo (até pelo menos 2032 ou horizonte)
  const maxYearFound = Math.max(...Array.from(yearsSet), currentYear);
  for (let y = maxYearFound + 1; y <= Math.max(maxYearFound + FUTURE_HORIZON_YEARS, 2035); y++) {
    yearsSet.add(y);
  }

  // Ordenar decrescente (mais recente para o mais antigo) ou crescente
  return Array.from(yearsSet).sort((a, b) => b - a);
}

/**
 * Retorna os anos sugeridos para dropdowns de cadastro (ex: 2021 até 2035)
 */
export function getSelectableYears(
  measurements: IndicatorMeasurement[] = [],
  targets: IndicatorTarget[] = [],
  currentSelectedYear?: number
): number[] {
  return getSystemAvailableYears(measurements, targets, currentSelectedYear);
}

/**
 * Identifica ou gera dinamicamente as informações do Ciclo do PLS (CNJ)
 * Ciclos sexenais oficiais (Art. 10 da Resolução CNJ nº 400/2021):
 * - Ciclo I: 2021–2026
 * - Ciclo II: 2027–2032
 * - Ciclo III: 2033–2038
 */
export function getPlsCycleForYear(year: number, existingCycles: PLSCycle[] = []): {
  id: string;
  title: string;
  cycle: string;
  startYear: number;
  endYear: number;
  status: 'VIGENTE' | 'ENCERRADO' | 'PREVISTO';
  cycleNumber: number;
} {
  const currentCalYear = getCurrentCalendarYear();
  
  // Calcular início e fim do ciclo de 6 anos com base em 2021
  const cycleIndex = Math.floor((year - BASE_START_YEAR) / 6);
  const cycleNumber = cycleIndex + 1;
  const startYear = BASE_START_YEAR + (cycleIndex * 6);
  const endYear = startYear + 5;
  const cycleStr = `${startYear}-${endYear}`;

  let status: 'VIGENTE' | 'ENCERRADO' | 'PREVISTO' = 'PREVISTO';
  if (year < startYear || currentCalYear > endYear) {
    status = 'ENCERRADO';
  } else if (currentCalYear >= startYear && currentCalYear <= endYear) {
    status = 'VIGENTE';
  } else {
    status = 'PREVISTO';
  }

  // Se houver ciclo customizado cadastrado, aproveitar metadados
  const matched = existingCycles.find(c => c.cycle === cycleStr);

  return {
    id: matched?.id || `pls-sjrr-${cycleStr}`,
    title: matched?.title || `Plano de Logística Sustentável (${cycleNumber}º Ciclo ${cycleStr})`,
    cycle: cycleStr,
    startYear,
    endYear,
    status,
    cycleNumber
  };
}

/**
 * Retorna a janela móvel oficial de 5 anos comparativos que encerra no ano informado
 * Ex: para 2026 -> [2022, 2023, 2024, 2025, 2026]
 * Ex: para 2027 -> [2023, 2024, 2025, 2026, 2027]
 * Ex: para 2028 -> [2024, 2025, 2026, 2027, 2028]
 * Ex: para 2030 -> [2026, 2027, 2028, 2029, 2030]
 */
export function getRollingFiveYearWindow(targetYear: number): number[] {
  return Array.from({ length: 5 }, (_, i) => targetYear - 4 + i);
}

/**
 * Formata um rótulo legível para o ano
 */
export function formatYearDisplay(year: number): string {
  const calYear = getCurrentCalendarYear();
  if (year === calYear) return `${year} (Exercício Vigente)`;
  if (year === calYear + 1) return `${year} (Próximo Exercício)`;
  if (year > calYear + 1) return `${year} (Planejamento Futuro)`;
  return `${year}`;
}

export interface PLSCycleDefinition {
  id: string;
  cycle: string; // "2021-2026"
  label: string; // "1º Ciclo (2021–2026)"
  cycleNumber: number;
  startYear: number;
  endYear: number;
  years: number[]; // [2021, 2022, 2023, 2024, 2025, 2026]
  status: 'VIGENTE' | 'ENCERRADO' | 'PREVISTO';
}

export const OFFICIAL_PLS_CYCLES: PLSCycleDefinition[] = [
  {
    id: 'cycle-2021-2026',
    cycle: '2021-2026',
    label: '1º Ciclo (2021–2026)',
    cycleNumber: 1,
    startYear: 2021,
    endYear: 2026,
    years: [2021, 2022, 2023, 2024, 2025, 2026],
    status: 'VIGENTE'
  },
  {
    id: 'cycle-2027-2032',
    cycle: '2027-2032',
    label: '2º Ciclo (2027–2032)',
    cycleNumber: 2,
    startYear: 2027,
    endYear: 2032,
    years: [2027, 2028, 2029, 2030, 2031, 2032],
    status: 'PREVISTO'
  },
  {
    id: 'cycle-2033-2038',
    cycle: '2033-2038',
    label: '3º Ciclo (2033–2038)',
    cycleNumber: 3,
    startYear: 2033,
    endYear: 2038,
    years: [2033, 2034, 2035, 2036, 2037, 2038],
    status: 'PREVISTO'
  }
];

export function getAllAvailableCycles(): PLSCycleDefinition[] {
  return OFFICIAL_PLS_CYCLES;
}

export function getYearsForCycle(cycleString: string): number[] {
  const found = OFFICIAL_PLS_CYCLES.find(c => c.cycle === cycleString);
  if (found) return found.years;

  const parts = cycleString.split('-').map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    const list: number[] = [];
    for (let y = parts[0]; y <= parts[1]; y++) {
      list.push(y);
    }
    return list;
  }
  return [2021, 2022, 2023, 2024, 2025, 2026];
}

export function getCycleFromYear(year: number): string {
  const cycleIndex = Math.floor((year - BASE_START_YEAR) / 6);
  const start = BASE_START_YEAR + (cycleIndex * 6);
  const end = start + 5;
  return `${start}-${end}`;
}

export function getCycleInfo(cycleString: string): PLSCycleDefinition {
  const found = OFFICIAL_PLS_CYCLES.find(c => c.cycle === cycleString);
  if (found) return found;

  const parts = cycleString.split('-').map(Number);
  const start = parts[0] || 2021;
  const end = parts[1] || (start + 5);
  const cycleIndex = Math.floor((start - BASE_START_YEAR) / 6);
  const cycleNumber = cycleIndex + 1;
  const cur = getCurrentCalendarYear();

  let status: 'VIGENTE' | 'ENCERRADO' | 'PREVISTO' = 'PREVISTO';
  if (cur > end) status = 'ENCERRADO';
  else if (cur >= start && cur <= end) status = 'VIGENTE';

  return {
    id: `cycle-${cycleString}`,
    cycle: cycleString,
    label: `${cycleNumber}º Ciclo (${cycleString})`,
    cycleNumber,
    startYear: start,
    endYear: end,
    years: getYearsForCycle(cycleString),
    status
  };
}
