import type { Indicator, IndicatorMeasurement, IndicatorTarget } from '../types';
import { calculateIndicatorPerformance } from './calculationEngine';

/**
 * Metas numéricas ou percentuais.
 *
 * - NUMERICA: o valor da meta é informado diretamente (teto ou piso).
 * - PERCENTUAL: a meta é a linha de base (realizado no ano-base) ajustada por um
 *   percentual: meta = base × (1 + percentChange / 100).
 *     "Reduzir em 10%"             → percentChange −10, teto
 *     "Limitar o aumento a 10%"    → percentChange +10, teto
 *     "Aumentar em pelo menos 10%" → percentChange +10, piso
 *     "Limitar a redução a 10%"    → percentChange −10, piso
 *   A linha de base é sempre recalculada a partir das medições do órgão.
 */

export type TargetMode = 'NUMERICA' | 'PERCENTUAL';
export type LimitKind = 'TETO' | 'PISO';

export const round = (v: number) => (Math.abs(v) >= 100 ? Math.round(v * 100) / 100 : Math.round(v * 10000) / 10000);

/** Realizado do indicador no ano-base (mesma regra do painel: soma do ano / valor anual). */
export function baselineFor(
  indicator: Indicator,
  measurements: IndicatorMeasurement[],
  baselineYear: number
): { value: number; monthsReported: number } | null {
  const r = calculateIndicatorPerformance(indicator, measurements, undefined, baselineYear);
  if (r.monthsReported === 0) return null;
  return { value: r.accumulatedValue, monthsReported: r.monthsReported };
}

/** Valor da meta percentual a partir da base. */
export const percentTargetValue = (base: number, percentChange: number) => round(base * (1 + percentChange / 100));

/** Recalcula base e valor de uma meta percentual com os dados atuais (sem efeito nas numéricas). */
export function resolveTarget(
  target: IndicatorTarget,
  indicator: Indicator | undefined,
  measurements: IndicatorMeasurement[]
): IndicatorTarget {
  if (target.targetMode !== 'PERCENTUAL' || !indicator || target.percentChange === undefined) return target;
  const base = baselineFor(indicator, measurements, target.baselineYear);
  if (!base) return { ...target, baselineValue: 0, targetValue: 0, baselineMissing: true };
  return {
    ...target,
    baselineValue: round(base.value),
    targetValue: percentTargetValue(base.value, target.percentChange),
    baselineMissing: false
  };
}

/** Texto curto da regra da meta (ex.: "Teto: −10% sobre 2025"). */
export function describeTarget(t: Pick<IndicatorTarget, 'targetMode' | 'percentChange' | 'limitKind' | 'baselineYear'>): string {
  const kind = t.limitKind === 'PISO' ? 'Piso' : 'Teto';
  if (t.targetMode === 'PERCENTUAL' && t.percentChange !== undefined) {
    const p = `${t.percentChange > 0 ? '+' : t.percentChange < 0 ? '−' : ''}${Math.abs(t.percentChange).toLocaleString('pt-BR')}%`;
    return `${kind}: ${p} sobre ${t.baselineYear}`;
  }
  return `${kind} numérico`;
}

/** Tipo legado (targetType) equivalente, para compatibilidade com relatórios. */
export function legacyTargetType(mode: TargetMode, limit: LimitKind, percentChange?: number): IndicatorTarget['targetType'] {
  if (mode === 'PERCENTUAL') return (percentChange ?? 0) < 0 ? 'REDUCAO_PERCENTUAL' : 'AUMENTO_PERCENTUAL';
  return limit === 'PISO' ? 'LIMITE_MINIMO' : 'LIMITE_MAXIMO';
}
