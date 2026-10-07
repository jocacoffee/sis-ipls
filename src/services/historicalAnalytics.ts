import {
  Indicator,
  IndicatorMeasurement,
  IndicatorTarget,
  FiveYearIndicatorSeries,
  HistoricalYearData
} from '../types';
import { OFFICIAL_THEMES } from '../data/officialThemes';

export const HISTORICAL_YEARS = [2022, 2023, 2024, 2025, 2026] as const;

export interface FiveYearSummaryStats {
  energyChange5Y: number; // % kWh
  waterChange5Y: number;  // % m3
  paperChange5Y: number;  // % resmas
  cupsEliminated: boolean; // 100% elimination
  recyclingChange5Y: number; // % kg TMR
  ghgChange5Y: number;    // % tCO2e
  printChange5Y: number;  // % pages
  fuelChange5Y: number;   // % liters
}

/**
 * Natural comparison function for indicator codes (e.g. 1.1, 1.2, ..., 1.10, 6.1)
 */
function compareCodes(codeA: string, codeB: string): number {
  const partsA = codeA.split('.').map(p => parseInt(p, 10) || 0);
  const partsB = codeB.split('.').map(p => parseInt(p, 10) || 0);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const valA = partsA[i] || 0;
    const valB = partsB[i] || 0;
    if (valA !== valB) return valA - valB;
  }
  return codeA.localeCompare(codeB);
}

/**
 * Computes 5-year historical series for all major indicators (2022 - 2026)
 * across all PLS themes that have measurements or targets.
 */
export function buildFiveYearHistoricalSeries(
  indicators: Indicator[],
  measurements: IndicatorMeasurement[],
  targets: IndicatorTarget[],
  currentYear: number = 2026,
  customIndicatorIds?: string[]
): FiveYearIndicatorSeries[] {
  // Determine which indicators to build series for
  let targetIndicators: Indicator[] = [];

  if (customIndicatorIds && customIndicatorIds.length > 0) {
    targetIndicators = indicators.filter(i => customIndicatorIds.includes(i.id));
  } else {
    // Collect indicators that either have targets or have recorded measurements in 2022-2026
    const indicatorIdsWithData = new Set<string>();

    targets.forEach(t => indicatorIdsWithData.add(t.indicatorId));
    measurements.forEach(m => {
      if (HISTORICAL_YEARS.includes(m.year as any) && m.value !== undefined) {
        indicatorIdsWithData.add(m.indicatorId);
      }
    });

    // Also include priority benchmark indicators even if 0
    const priorityCodes = [
      '1.1', '1.2',
      '2.1', '3.1', '4.1',
      '5.1', '5.3',
      '6.1', '6.2', '6.4',
      '7.1', '7.2', '7.4',
      '8.1', '8.5', '8.6',
      '9.1', '10.1', '11.1',
      '12.1', '13.1',
      '14.1', '14.5',
      '15.1',
      '16.3', '17.3', '18.3', '19.1',
      '20.1', '20.2', '20.3', '20.4',
      '21.1', '21.2'
    ];

    targetIndicators = indicators.filter(i => 
      indicatorIdsWithData.has(i.id) || priorityCodes.includes(i.code)
    );
  }

  // Sort logically by indicator code
  targetIndicators.sort((a, b) => compareCodes(a.code, b.code));

  const seriesList: FiveYearIndicatorSeries[] = [];

  targetIndicators.forEach(ind => {
    const target2026 = targets.find(t => t.indicatorId === ind.id && t.year === currentYear);
    const targetObj = targets.find(t => t.indicatorId === ind.id);
    const yearsData: Record<number, HistoricalYearData> = {};

    HISTORICAL_YEARS.forEach(yr => {
      const yearMeasurements = measurements.filter(m => m.indicatorId === ind.id && m.year === yr);
      const targetForYear = targets.find(t => t.indicatorId === ind.id && t.year === yr);
      const monthsCount = yearMeasurements.length;
      
      let total = 0;
      let isProjected = false;

      if (monthsCount > 0) {
        // If it's an annual single measurement (like Tema 20, 16, 21, 17, 18, 1, 9, 10, etc.)
        if (monthsCount === 1 && (yearMeasurements[0].month === 12 || yearMeasurements[0].month === 1 || yearMeasurements[0].month === 0)) {
          total = yearMeasurements[0].value;
        } else {
          const sum = yearMeasurements.reduce((acc, m) => acc + m.value, 0);
          if (yr === currentYear && monthsCount < 12) {
            // Annualize current year based on months reported
            total = Number(((sum / monthsCount) * 12).toFixed(2));
            isProjected = true;
          } else {
            total = Number(sum.toFixed(2));
          }
        }
      }

      const monthlyAverage = monthsCount > 0 && monthsCount > 1 
        ? Number((total / 12).toFixed(2)) 
        : (total > 0 ? total : undefined);

      yearsData[yr] = {
        year: yr,
        total,
        monthlyAverage,
        target: targetForYear?.targetValue,
        monthsReported: monthsCount,
        isProjected
      };
    });

    const val2022 = yearsData[2022]?.total || 0;
    const val2025 = yearsData[2025]?.total || 0;
    const val2026 = yearsData[2026]?.total || 0;

    const fiveYearChangePct = val2022 > 0 
      ? Number((((val2026 - val2022) / val2022) * 100).toFixed(1)) 
      : 0;

    const yoyChangePct = val2025 > 0 
      ? Number((((val2026 - val2025) / val2025) * 100).toFixed(1)) 
      : 0;

    // Determine if change is improvement or deterioration
    const isHigherBetter = [
      '8.1', '8.2', '8.3', '8.4', '8.5', '8.6',
      '9.1', '10.1', '16.2', '16.3', '17.1', '17.3',
      '18.1', '18.2', '18.3', '19.1', '21.1', '21.2'
    ].includes(ind.code);

    let direction: 'MELHORA' | 'PIORA' | 'ESTAVEL' = 'ESTAVEL';

    if (Math.abs(fiveYearChangePct) < 0.5) {
      direction = 'ESTAVEL';
    } else if (isHigherBetter) {
      direction = fiveYearChangePct > 0 ? 'MELHORA' : 'PIORA';
    } else {
      // For consumption and emissions, reduction is improvement
      direction = fiveYearChangePct < 0 ? 'MELHORA' : 'PIORA';
    }

    seriesList.push({
      indicatorId: ind.id,
      code: ind.code,
      name: ind.name,
      acronym: ind.acronym,
      unit: ind.unit,
      themeId: ind.themeId,
      themeName: OFFICIAL_THEMES.find(t => t.id === ind.themeId)?.name || ind.themeId,
      years: yearsData,
      fiveYearChangePct,
      yoyChangePct,
      direction,
      target2026: target2026?.targetValue,
      baseline: targetObj ? { year: targetObj.baselineYear, value: targetObj.baselineValue } : undefined
    });
  });

  return seriesList;
}

/**
 * Computes high-level summary statistics of the 5-year evolution
 */
export function getFiveYearSummaryStats(seriesList: FiveYearIndicatorSeries[]): FiveYearSummaryStats {
  const getChange = (code: string) => seriesList.find(s => s.code === code)?.fiveYearChangePct || 0;

  const cups = seriesList.find(s => s.code === '3.1');
  const cups2026Val = cups?.years[2026]?.total ?? 1;

  return {
    energyChange5Y: getChange('6.1'),
    waterChange5Y: getChange('7.1'),
    paperChange5Y: getChange('2.1'),
    cupsEliminated: cups2026Val === 0,
    recyclingChange5Y: getChange('8.6'),
    ghgChange5Y: getChange('20.4'),
    printChange5Y: getChange('5.1'),
    fuelChange5Y: getChange('14.1')
  };
}
