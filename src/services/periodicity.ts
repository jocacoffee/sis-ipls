import type { Indicator, IndicatorMeasurement } from '../types';

/**
 * Indicadores anuais que também aceitam lançamento mês a mês (ex.: combustíveis
 * e quilometragem, que várias seccionais apuram mensalmente).
 *
 * Em cada exercício, o órgão escolhe UM modo:
 *  - ANUAL: um único total (gravado no mês 12);
 *  - MENSAL: um valor por mês (marcado com isMonthlyEntry); o total do ano é a soma.
 * Os modos não se misturam no mesmo ano, para não somar duas vezes.
 */
export const MONTHLY_ENTRY_ACRONYMS = ['CG', 'CE', 'CD', 'GC', 'Km'];

export type EntryMode = 'ANUAL' | 'MENSAL';

export const acceptsMonthlyEntry = (ind?: Pick<Indicator, 'periodicity' | 'allowMonthlyEntry'>) =>
  !!ind && (ind.periodicity === 'MENSAL' || !!ind.allowMonthlyEntry);

/** Modo já usado pelo órgão no exercício (null = nenhum lançamento ainda). */
export function yearEntryMode(
  measurements: Pick<IndicatorMeasurement, 'indicatorId' | 'organizationId' | 'year' | 'isMonthlyEntry'>[],
  indicatorId: string,
  organizationId: string,
  year: number
): EntryMode | null {
  const list = measurements.filter(
    m => m.indicatorId === indicatorId && m.year === year && (m.organizationId || 'org-sjrr') === organizationId
  );
  if (list.length === 0) return null;
  return list.some(m => m.isMonthlyEntry) ? 'MENSAL' : 'ANUAL';
}
