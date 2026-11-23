import { Indicator, IndicatorMeasurement, IndicatorTarget, Organization } from '../types';
import { applyAutoCalculations, consolidateAutoCalculations, isAutoIndicator } from './autoCalc';

/**
 * Escopo multi-órgão do iPLS.
 *
 * Cada medição pertence a um órgão (organizationId). O órgão marcado como
 * `isConsolidated` (1ª Região) não recebe lançamentos próprios: seus valores
 * são a soma dos órgãos, apenas para indicadores com `consolidation = 'SOMA'`.
 * Percentuais, razões e códigos não são consolidados.
 */

export const LEGACY_DEFAULT_ORG_ID = 'org-sjrr';
export const CONSOLIDATED_ORG_ID = 'org-trf1';

export const orgIdOf = (m: { organizationId?: string }): string =>
  m.organizationId || LEGACY_DEFAULT_ORG_ID;

export function isConsolidatedOrg(orgId: string, organizations: Organization[]): boolean {
  const org = organizations.find(o => o.id === orgId);
  return org ? !!org.isConsolidated : orgId === CONSOLIDATED_ORG_ID;
}

/** Regra de consolidação do indicador (explícita ou inferida pelo tipo de dado). */
export function indicatorConsolidates(ind: Indicator): boolean {
  if (ind.consolidation) return ind.consolidation === 'SOMA';
  if (ind.indicatorType === 'CALCULATED') return false;
  return ind.dataType === 'QUANTIDADE' || ind.dataType === 'VALOR_MONETARIO';
}

/**
 * Soma as medições dos órgãos (exceto o próprio consolidado) por indicador/ano/mês.
 * Inclui órgãos inativos no período em que tinham dados (ex.: SJMG em 2021),
 * reproduzindo o consolidado histórico da planilha de origem.
 */
export function buildConsolidatedMeasurements(
  measurements: IndicatorMeasurement[],
  indicators: Indicator[],
  consolidatedOrgId: string = CONSOLIDATED_ORG_ID
): IndicatorMeasurement[] {
  const summable = new Map(indicators.filter(indicatorConsolidates).map(i => [i.id, i]));
  const groups = new Map<string, { sum: number; orgs: Set<string>; sample: IndicatorMeasurement }>();

  for (const m of measurements) {
    const org = orgIdOf(m);
    if (org === consolidatedOrgId || !summable.has(m.indicatorId)) continue;
    const key = `${m.indicatorId}__${m.year}__${m.month}`;
    const g = groups.get(key);
    if (g) {
      g.sum += m.value;
      g.orgs.add(org);
    } else {
      groups.set(key, { sum: m.value, orgs: new Set([org]), sample: m });
    }
  }

  const now = new Date().toISOString();
  return Array.from(groups.entries()).map(([key, g]) => ({
    id: `consolidado__${key}`,
    indicatorId: g.sample.indicatorId,
    organizationId: consolidatedOrgId,
    year: g.sample.year,
    month: g.sample.month,
    value: Number(g.sum.toFixed(6)),
    unit: g.sample.unit,
    sourceType: 'calculated' as const,
    sourceReference: `Consolidado regional: soma de ${g.orgs.size} órgão(s)`,
    validationStatus: 'VALIDADO' as const,
    confidenceScore: 100,
    notes: `Órgãos informantes: ${g.orgs.size}`,
    reportingOrgIds: [...g.orgs].sort(),
    createdAt: now,
    updatedAt: now
  }));
}

/**
 * Medições visíveis para o órgão selecionado (próprias ou consolidadas), já com os
 * indicadores de cálculo automático obtidos das fórmulas. No consolidado, as fórmulas
 * são aplicadas sobre as variáveis somadas (ex.: CRE regional = soma do CEE / soma da área).
 */
export function scopeMeasurements(
  orgId: string,
  measurements: IndicatorMeasurement[],
  indicators: Indicator[],
  organizations: Organization[]
): IndicatorMeasurement[] {
  if (!isConsolidatedOrg(orgId, organizations)) {
    return applyAutoCalculations(measurements.filter(m => orgIdOf(m) === orgId), indicators);
  }
  // Consolidado: somas dos órgãos + fórmulas sobre as variáveis dos órgãos com dados completos
  const byOrg = new Map<string, IndicatorMeasurement[]>();
  for (const m of measurements) {
    const o = orgIdOf(m);
    if (o === orgId) continue;
    const list = byOrg.get(o);
    if (list) list.push(m); else byOrg.set(o, [m]);
  }
  const autoValues = consolidateAutoCalculations([...byOrg.values()], indicators, orgId);
  const calculated = new Set(autoValues.map(m => `${m.indicatorId}|${m.year}|${m.month}`));
  const autoIds = new Set(indicators.filter(isAutoIndicator).map(i => i.id));
  const summed = buildConsolidatedMeasurements(measurements, indicators, orgId).filter(
    m => !(autoIds.has(m.indicatorId) && calculated.has(`${m.indicatorId}|${m.year}|${m.month}`))
  );
  return [...summed, ...autoValues];
}

export function scopeTargets(orgId: string, targets: IndicatorTarget[]): IndicatorTarget[] {
  return targets.filter(t => (t.organizationId || LEGACY_DEFAULT_ORG_ID) === orgId);
}

/** Área (m²) e força de trabalho usadas nos indicadores derivados do órgão. */
export function orgDenominators(
  orgId: string,
  organizations: Organization[]
): { areaM2: number; ftt: number } {
  const org = organizations.find(o => o.id === orgId);
  return {
    areaM2: org?.totalFloorAreaM2 && org.totalFloorAreaM2 > 0 ? org.totalFloorAreaM2 : 14500,
    ftt: org?.totalMagistratesStaff && org.totalMagistratesStaff > 0 ? org.totalMagistratesStaff : 331
  };
}
