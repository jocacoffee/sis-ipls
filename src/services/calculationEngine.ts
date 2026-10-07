import {
  Indicator,
  IndicatorMeasurement,
  IndicatorTarget,
  IndicatorCalculationResult,
  IndicatorStatus,
  InconsistencyAlert
} from '../types';

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const MONTH_SHORT_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

/**
 * Automatically computes measurements for calculated indicators
 * based on their dependencies (Res. CNJ 400/2021).
 */
export function deriveMeasurementsForIndicator(
  indicator: Indicator,
  measurements: IndicatorMeasurement[],
  year: number,
  orgAreaM2: number = 14500,
  fttTotal: number = 331
): IndicatorMeasurement[] {
  const derived: IndicatorMeasurement[] = [];

  const getMonthlyMap = (indId: string): Map<number, number> => {
    const map = new Map<number, number>();
    measurements
      .filter(m => m.indicatorId === indId && m.year === year)
      .forEach(m => map.set(m.month, m.value));
    return map;
  };

  // Tema 6: 6.2 CRE = CEE (6.1) / m²Total
  if (indicator.code === '6.2' || indicator.id === 'indicator-6-2') {
    const ceeMap = getMonthlyMap('indicator-6-1');
    ceeMap.forEach((val, month) => {
      derived.push({
        id: `derived-6-2-${year}-${month}`,
        indicatorId: indicator.id,
        organizationId: 'org-sjrr',
        year,
        month,
        value: Number((val / orgAreaM2).toFixed(4)),
        unit: 'kWh/m²',
        sourceType: 'calculated',
        sourceReference: 'Cálculo Automático: CEE / m²Total',
        validationStatus: 'VALIDADO',
        confidenceScore: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
  }

  // Tema 6: 6.4 GRE = GEE (6.3) / m²Total
  else if (indicator.code === '6.4' || indicator.id === 'indicator-6-4') {
    const geeMap = getMonthlyMap('indicator-6-3');
    geeMap.forEach((val, month) => {
      derived.push({
        id: `derived-6-4-${year}-${month}`,
        indicatorId: indicator.id,
        organizationId: 'org-sjrr',
        year,
        month,
        value: Number((val / orgAreaM2).toFixed(2)),
        unit: 'R$/m²',
        sourceType: 'calculated',
        sourceReference: 'Cálculo Automático: GEE / m²Total',
        validationStatus: 'VALIDADO',
        confidenceScore: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
  }

  // Tema 7: 7.2 CRA = CA (7.1) / m²Total
  else if (indicator.code === '7.2' || indicator.id === 'indicator-7-2') {
    const caMap = getMonthlyMap('indicator-7-1');
    caMap.forEach((val, month) => {
      derived.push({
        id: `derived-7-2-${year}-${month}`,
        indicatorId: indicator.id,
        organizationId: 'org-sjrr',
        year,
        month,
        value: Number((val / orgAreaM2).toFixed(4)),
        unit: 'm³/m²',
        sourceType: 'calculated',
        sourceReference: 'Cálculo Automático: CA / m²Total',
        validationStatus: 'VALIDADO',
        confidenceScore: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
  }

  // Tema 7: 7.4 GRA = GA (7.3) / m²Total
  else if (indicator.code === '7.4' || indicator.id === 'indicator-7-4') {
    const gaMap = getMonthlyMap('indicator-7-3');
    gaMap.forEach((val, month) => {
      derived.push({
        id: `derived-7-4-${year}-${month}`,
        indicatorId: indicator.id,
        organizationId: 'org-sjrr',
        year,
        month,
        value: Number((val / orgAreaM2).toFixed(2)),
        unit: 'R$/m²',
        sourceType: 'calculated',
        sourceReference: 'Cálculo Automático: GA / m²Total',
        validationStatus: 'VALIDADO',
        confidenceScore: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
  }

  // Tema 5: 5.3 QIP = QI (5.1) / FTT
  else if (indicator.code === '5.3' || indicator.id === 'indicator-5-3') {
    const qiMap = getMonthlyMap('indicator-5-1');
    qiMap.forEach((val, month) => {
      derived.push({
        id: `derived-5-3-${year}-${month}`,
        indicatorId: indicator.id,
        organizationId: 'org-sjrr',
        year,
        month,
        value: Number((val / fttTotal).toFixed(1)),
        unit: 'páginas/pessoa',
        sourceType: 'calculated',
        sourceReference: 'Cálculo Automático: QI / FTT',
        validationStatus: 'VALIDADO',
        confidenceScore: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
  }

  // Tema 12: 12.3 GTFP = GTF (12.1) / FTT
  else if (indicator.code === '12.3' || indicator.id === 'indicator-12-3') {
    const gtfMap = getMonthlyMap('indicator-12-1');
    gtfMap.forEach((val, month) => {
      derived.push({
        id: `derived-12-3-${year}-${month}`,
        indicatorId: indicator.id,
        organizationId: 'org-sjrr',
        year,
        month,
        value: Number((val / fttTotal).toFixed(2)),
        unit: 'R$/pessoa',
        sourceType: 'calculated',
        sourceReference: 'Cálculo Automático: GTF / FTT',
        validationStatus: 'VALIDADO',
        confidenceScore: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
  }

  // Tema 14: 14.5 CGP = CG (14.1) / FTT
  else if (indicator.code === '14.5' || indicator.id === 'indicator-14-5') {
    const cgMap = getMonthlyMap('indicator-14-1');
    cgMap.forEach((val, month) => {
      derived.push({
        id: `derived-14-5-${year}-${month}`,
        indicatorId: indicator.id,
        organizationId: 'org-sjrr',
        year,
        month,
        value: Number((val / fttTotal).toFixed(2)),
        unit: 'litros/pessoa',
        sourceType: 'calculated',
        sourceReference: 'Cálculo Automático: CG / FTT',
        validationStatus: 'VALIDADO',
        confidenceScore: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
  }

  return derived;
}

/**
 * Calculates key PLS indicator metrics, target fulfillment, projection,
 * and classifies status with complete rationale.
 */
export function calculateIndicatorPerformance(
  indicator: Indicator,
  measurements: IndicatorMeasurement[],
  target: IndicatorTarget | undefined,
  year: number = 2026,
  orgAreaM2: number = 14500,
  fttTotal: number = 331
): IndicatorCalculationResult {
  // Filter measurements for this indicator and year
  let yearMeasurements = measurements
    .filter(m => m.indicatorId === indicator.id && m.year === year)
    .sort((a, b) => a.month - b.month);

  // If this is a calculated indicator without direct measurements, calculate on-the-fly
  if (yearMeasurements.length === 0 && indicator.indicatorType === 'CALCULATED') {
    yearMeasurements = deriveMeasurementsForIndicator(indicator, measurements, year, orgAreaM2, fttTotal);
  }

  const monthlyValues: (number | null)[] = Array(12).fill(null);
  let accumulatedValue = 0;
  let monthsReported = 0;
  let hasPendingValidation = false;

  for (const m of yearMeasurements) {
    if (m.month >= 1 && m.month <= 12) {
      monthlyValues[m.month - 1] = m.value;
      accumulatedValue += m.value;
      monthsReported++;
      if (m.validationStatus === 'PENDENTE') {
        hasPendingValidation = true;
      }
    }
  }

  const baselineValue = target?.baselineValue ?? indicator.baselineValue ?? 0;
  const targetValue = target?.targetValue ?? indicator.targetValue2026 ?? 0;
  const isAnnual = indicator.periodicity === 'ANUAL';
  const monthlyAverage = !isAnnual && monthsReported > 0 ? accumulatedValue / monthsReported : accumulatedValue;

  // Projection calculation: Extrapolate reported months to full 12 months for monthly indicators
  // For annual indicators, the reported value is the annual consolidated value
  const annualProjection = isAnnual
    ? (monthsReported > 0 ? accumulatedValue : baselineValue)
    : (monthsReported > 0 ? (accumulatedValue / monthsReported) * 12 : baselineValue);

  // Distance to target
  const distanceToTarget = annualProjection - targetValue;

  // Required monthly run-rate for remaining months to hit the annual target
  const remainingMonths = isAnnual ? 0 : Math.max(0, 12 - monthsReported);
  const remainingTargetBudget = targetValue - accumulatedValue;
  const requiredMonthlyRunRate = (!isAnnual && remainingMonths > 0)
    ? remainingTargetBudget / remainingMonths
    : 0;

  // Fulfillment calculation
  let fulfillmentPercentage = 100;
  if (targetValue > 0) {
    if (indicator.targetDirection === 'MENOR_MELHOR') {
      // For reduction targets: if projection is lower than target, fulfillment > 100%
      // If projection is higher than target, fulfillment decreases
      fulfillmentPercentage = Math.max(0, Math.round(((targetValue - (annualProjection - targetValue)) / targetValue) * 100));
    } else {
      // For increase targets (e.g. recycling):
      fulfillmentPercentage = Math.round((annualProjection / targetValue) * 100);
    }
  } else if (targetValue === 0) {
    // Zero target (e.g. plastic cups)
    fulfillmentPercentage = accumulatedValue === 0 ? 100 : 0;
  }

  // Calculate YoY comparison with previous year (same period)
  const prevYear = year - 1;
  const prevYearMeasurements = measurements
    .filter(m => m.indicatorId === indicator.id && m.year === prevYear && (isAnnual ? true : m.month <= monthsReported));
  
  const prevAccumulated = prevYearMeasurements.reduce((sum, item) => sum + item.value, 0);
  let yoyVariationPercent: number | undefined = undefined;
  let yoyAbsoluteVariation: number | undefined = undefined;

  if (prevAccumulated > 0 && monthsReported > 0) {
    yoyAbsoluteVariation = accumulatedValue - prevAccumulated;
    yoyVariationPercent = Number(((yoyAbsoluteVariation / prevAccumulated) * 100).toFixed(1));
  }

  // Determine descriptive status and explanatory rationale
  let status: IndicatorStatus = 'EM_CONFORMIDADE';
  let statusReason = '';

  if (monthsReported === 0) {
    status = 'SEM_DADOS';
    statusReason = isAnnual
      ? `Nenhum dado anual consolidado informado para o exercício de ${year}.`
      : `Nenhum dado informado para o exercício de ${year}. Competências de Janeiro a Dezembro pendentes.`;
  } else if (hasPendingValidation) {
    status = 'EM_VALIDACAO';
    statusReason = `Competências recentes possuem documentos atestados aguardando validação formal de conformidade.`;
  } else if (targetValue === 0) {
    // Target zero (e.g. copos plásticos descartáveis)
    if (accumulatedValue === 0) {
      status = 'META_ATINGIDA';
      statusReason = isAnnual
        ? `Meta rigorosamente cumprida: 0 unidades registradas no exercício de ${year}.`
        : `Meta rigorosamente cumprida: 0 unidades registradas no período de Jan a ${MONTH_NAMES[monthsReported - 1]}.`;
    } else {
      status = 'RISCO';
      statusReason = `Meta de zero violada: detectadas ${accumulatedValue} unidades consumidas no período.`;
    }
  } else if (indicator.targetDirection === 'MENOR_MELHOR') {
    const deviationPercent = ((annualProjection - targetValue) / targetValue) * 100;
    
    if (annualProjection <= targetValue) {
      if (isAnnual || monthsReported === 12) {
        status = 'META_ATINGIDA';
        statusReason = `Meta anual plenamente atingida no exercício de ${year} com resultado favorável de ${accumulatedValue.toLocaleString('pt-BR')} ${indicator.unit}.`;
      } else {
        status = 'EM_CONFORMIDADE';
        statusReason = `Projeção anual de ${Math.round(annualProjection).toLocaleString('pt-BR')} ${indicator.unit} está ${Math.abs(Number(deviationPercent.toFixed(1)))}% abaixo do teto fixado (${targetValue.toLocaleString('pt-BR')} ${indicator.unit}).`;
      }
    } else if (deviationPercent <= 5.0) {
      status = 'ATENCAO';
      statusReason = isAnnual
        ? `Resultado anual ligeiramente acima da meta (+${deviationPercent.toFixed(1)}%).`
        : `Projeção anual está ligeiramente acima da meta (+${deviationPercent.toFixed(1)}%). Necessário manter o consumo médio abaixo de ${Math.round(requiredMonthlyRunRate).toLocaleString('pt-BR')} ${indicator.unit}/mês.`;
    } else {
      status = 'RISCO';
      statusReason = `Classificado em RISCO porque a projeção anual de ${Math.round(annualProjection).toLocaleString('pt-BR')} ${indicator.unit} ultrapassa o teto da meta em ${deviationPercent.toFixed(1)}%.`;
    }
  } else {
    // MAIOR_MELHOR
    const fulfillmentRatio = (annualProjection / targetValue) * 100;
    if (fulfillmentRatio >= 100) {
      status = (isAnnual || monthsReported === 12) ? 'META_ATINGIDA' : 'EM_CONFORMIDADE';
      statusReason = `Projeção anual de ${Math.round(annualProjection).toLocaleString('pt-BR')} ${indicator.unit} supera a meta mínima em ${(fulfillmentRatio - 100).toFixed(1)}%.`;
    } else if (fulfillmentRatio >= 90) {
      status = 'ATENCAO';
      statusReason = `Projeção anual atinge ${fulfillmentRatio.toFixed(1)}% da meta mínima exigida (${targetValue.toLocaleString('pt-BR')} ${indicator.unit}).`;
    } else {
      status = 'RISCO';
      statusReason = `Ritmo atual insuficiente: projeção de ${Math.round(annualProjection).toLocaleString('pt-BR')} ${indicator.unit} está ${(100 - fulfillmentRatio).toFixed(1)}% abaixo da meta estipulada.`;
    }
  }

  return {
    indicatorId: indicator.id,
    year,
    monthsReported,
    accumulatedValue,
    monthlyAverage,
    baselineValue,
    targetValue,
    annualProjection: Math.round(annualProjection * 10) / 10,
    fulfillmentPercentage,
    distanceToTarget: Math.round(distanceToTarget * 10) / 10,
    requiredMonthlyRunRate: Math.round(requiredMonthlyRunRate * 10) / 10,
    status,
    statusReason,
    yoyVariationPercent,
    yoyAbsoluteVariation,
    monthlyValues
  };
}

/**
 * Scans measurements for consistency anomalies:
 * - Sudden spikes (> 30% increase over 4-month rolling average)
 * - Negative values
 * - Discrepancies
 */
export function detectMeasurementInconsistencies(
  indicators: Indicator[],
  measurements: IndicatorMeasurement[],
  year: number = 2026
): InconsistencyAlert[] {
  const alerts: InconsistencyAlert[] = [];

  for (const indicator of indicators) {
    const indMeasurements = measurements
      .filter(m => m.indicatorId === indicator.id && m.year === year)
      .sort((a, b) => a.month - b.month);

    for (let i = 0; i < indMeasurements.length; i++) {
      const current = indMeasurements[i];

      // Negative value check
      if (current.value < 0) {
        alerts.push({
          id: `alert-neg-${current.id}`,
          indicatorId: indicator.id,
          indicatorName: indicator.name,
          month: current.month,
          year: current.year,
          type: 'NEGATIVE',
          severity: 'CRITICA',
          message: `Valor negativo indevido (${current.value} ${indicator.unit}) registrado na competência de ${MONTH_NAMES[current.month - 1]}/${year}.`,
          detectedValue: current.value,
          suggestedAction: 'Retificar o valor medido ou apurar se houve estorno incorreto no documento de origem.',
          createdAt: current.createdAt,
          resolved: false
        });
      }

      // Spike check (need at least 2 prior months to calculate baseline)
      if (i >= 2) {
        const priorValues = indMeasurements.slice(Math.max(0, i - 4), i).map(m => m.value);
        const priorAvg = priorValues.reduce((a, b) => a + b, 0) / priorValues.length;

        if (priorAvg > 0 && current.value > priorAvg * 1.30) {
          const increasePercent = Math.round(((current.value - priorAvg) / priorAvg) * 100);
          alerts.push({
            id: `alert-spike-${current.id}`,
            indicatorId: indicator.id,
            indicatorName: indicator.name,
            month: current.month,
            year: current.year,
            type: 'SPIKE',
            severity: increasePercent > 45 ? 'CRITICA' : 'ATENCAO',
            message: `${indicator.name} em ${MONTH_NAMES[current.month - 1]} (${current.value.toLocaleString('pt-BR')} ${indicator.unit}) aumentou ${increasePercent}% em relação à média dos meses anteriores (${Math.round(priorAvg).toLocaleString('pt-BR')} ${indicator.unit}).`,
            detectedValue: current.value,
            referenceValue: Math.round(priorAvg),
            suggestedAction: `Auditar a fatura/comprovante ${current.sourceReference || ''} e apurar se houve evento extraordinário ou erro de digitação.`,
            createdAt: current.createdAt,
            resolved: false
          });
        }
      }

      // Unvalidated document check
      if (current.validationStatus === 'PENDENTE') {
        alerts.push({
          id: `alert-val-${current.id}`,
          indicatorId: indicator.id,
          indicatorName: indicator.name,
          month: current.month,
          year: current.year,
          type: 'UNVALIDATED_DOC',
          severity: 'ATENCAO',
          message: `Competência ${MONTH_NAMES[current.month - 1]}/${year} informada via extração documental porém pendente de validação pelo fiscal.`,
          detectedValue: current.value,
          suggestedAction: 'Acessar o módulo de Documentos e homologar o atesto correspondente.',
          createdAt: current.createdAt,
          resolved: false
        });
      }
    }
  }

  return alerts;
}
