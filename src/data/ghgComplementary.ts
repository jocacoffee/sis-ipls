import type { Indicator } from '../types';

/**
 * Campos complementares do inventário de GEE (fora do Anexo da Res. CNJ nº 400/2021).
 *
 * Servem para que o inventário calculado pelo iPLS chegue ao total da Ferramenta GHG Protocol:
 * emissões fugitivas (gases refrigerantes e CO2 de extintores), o fator de emissão da energia
 * de sistema isolado (Roraima até 2025) e as emissões de viagens a serviço coletadas do painel
 * de BI de viagens. Ficam no tema 20, com categoria INSTITUCIONAL e marcados como fora do Anexo.
 */

const base = {
  organizationId: 'all',
  themeId: 'theme-20',
  indicatorType: 'INPUT' as const,
  category: 'INSTITUCIONAL' as const,
  requiresPlsJudInput: false,
  automaticCalculation: false,
  active: true,
  startValidity: '2021-01-01',
  responsibleUnit: 'Núcleo Socioambiental / SEINFRA',
  normativeReference: 'Complementar ao inventário de GEE (Ferramenta GHG Protocol); fora do Anexo da Res. CNJ nº 400/2021',
  annex: { kind: 'FORA' as const }
};

const refrigerant = (n: number, acronym: string, gas: string, composition: string): Indicator => ({
  ...base,
  id: `indicator-20-c${n}`,
  code: `20.C${n}`,
  acronym,
  name: `Reposição de gás refrigerante ${gas}`,
  description: `Massa de ${gas} (${composition}) reposta em aparelhos de ar-condicionado e refrigeração no ano. Corresponde ao gás que vazou para a atmosfera (emissão fugitiva, escopo 1).`,
  unit: 'kg',
  periodicity: 'ANUAL',
  dataType: 'QUANTIDADE',
  consolidation: 'SOMA',
  allowMonthlyEntry: true,
  targetDirection: 'MENOR_MELHOR'
});

export const GHG_COMPLEMENTARY_INDICATORS: Indicator[] = [
  refrigerant(1, 'R410A', 'R-410A', '50% HFC-32 e 50% HFC-125'),
  refrigerant(2, 'R32', 'R-32', 'HFC-32'),
  refrigerant(3, 'R134a', 'R-134a', 'HFC-134a'),
  refrigerant(4, 'R407C', 'R-407C', '23% HFC-32, 25% HFC-125 e 52% HFC-134a'),
  refrigerant(5, 'R404A', 'R-404A', '44% HFC-125, 52% HFC-143a e 4% HFC-134a'),
  refrigerant(6, 'R22', 'R-22', 'HCFC-22, controlado pelo Protocolo de Montreal; relatado fora do total do inventário'),
  {
    ...base,
    id: 'indicator-20-c7',
    code: '20.C7',
    acronym: 'CO2Ext',
    name: 'Recarga de extintores de CO2',
    description: 'Massa de CO2 recarregada em extintores no ano (emissão fugitiva, escopo 1).',
    unit: 'kg',
    periodicity: 'ANUAL',
    dataType: 'QUANTIDADE',
    consolidation: 'SOMA',
    allowMonthlyEntry: true,
    targetDirection: 'MENOR_MELHOR'
  },
  {
    ...base,
    id: 'indicator-20-c8',
    code: '20.C8',
    acronym: 'FESI',
    name: 'Fator de emissão da energia de sistema isolado',
    description:
      'Fator de emissão (tCO2/MWh) da energia elétrica consumida em sistema isolado, não conectado ao SIN (Roraima até 2025). ' +
      'Informe o fator divulgado pela distribuidora ou calculado a partir da geração térmica local.',
    unit: 'tCO2/MWh',
    periodicity: 'ANUAL',
    dataType: 'QUANTIDADE',
    consolidation: 'NENHUMA'
  },
  {
    ...base,
    id: 'indicator-20-c9',
    code: '20.C9',
    acronym: 'GEEViag',
    name: 'Emissões de GEE de viagens aéreas a serviço',
    description:
      'Emissões das viagens aéreas a serviço (escopo 3, categoria 6), calculadas trecho a trecho pelo painel de BI de viagens. ' +
      'Coletado automaticamente; o lançamento manual prevalece.',
    unit: 'tCO2e',
    periodicity: 'ANUAL',
    dataType: 'QUANTIDADE',
    consolidation: 'SOMA',
    allowMonthlyEntry: true,
    targetDirection: 'MENOR_MELHOR'
  }
];
