import {
  Organization,
  User,
  PLSCycle,
  PLSTheme,
  Indicator,
  IndicatorTarget,
  IndicatorMeasurement,
  PLSDocument,
  ActionPlan,
  EmissionSource,
  GHGCalculation,
  PLSJudMapping,
  SEIConnector,
  AuditLog,
  InconsistencyAlert
} from '../types';
import { OFFICIAL_THEMES } from './officialThemes';
import { INDICATORS_PART_1 } from './officialIndicatorsPart1';
import { INDICATORS_PART_2 } from './officialIndicatorsPart2';
import { INDICATORS_PART_3 } from './officialIndicatorsPart3';

export const INITIAL_ORGANIZATIONS: Organization[] = [
  {
    id: 'org-sjrr',
    name: 'Seção Judiciária de Roraima',
    acronym: 'SJRR',
    type: 'SECAO_JUDICIARIA',
    parentOrganizationId: 'org-trf1',
    active: true,
    uf: 'RR',
    totalFloorAreaM2: 14500,
    totalMagistratesStaff: 331
  },
  {
    id: 'org-trf1',
    name: 'Tribunal Regional Federal da 1ª Região',
    acronym: 'TRF1',
    type: 'TRIBUNAL',
    active: true,
    uf: 'DF',
    totalFloorAreaM2: 85000,
    totalMagistratesStaff: 3450
  },
  {
    id: 'org-sjam',
    name: 'Seção Judiciária do Amazonas',
    acronym: 'SJAM',
    type: 'SECAO_JUDICIARIA',
    parentOrganizationId: 'org-trf1',
    active: true,
    uf: 'AM',
    totalFloorAreaM2: 22000,
    totalMagistratesStaff: 680
  },
  {
    id: 'org-sjac',
    name: 'Seção Judiciária do Acre',
    acronym: 'SJAC',
    type: 'SECAO_JUDICIARIA',
    parentOrganizationId: 'org-trf1',
    active: true,
    uf: 'AC',
    totalFloorAreaM2: 9800,
    totalMagistratesStaff: 210
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-1',
    name: 'Dr. Roberto Magalhães',
    email: 'gestao.sustentavel@trf1.jus.br',
    role: 'GESTOR_PLS',
    organizationId: 'org-sjrr'
  },
  {
    id: 'usr-2',
    name: 'Dra. Vanessa Cavalcante',
    email: 'admin.ipls@trf1.jus.br',
    role: 'ADMIN',
    organizationId: 'org-sjrr'
  },
  {
    id: 'usr-3',
    name: 'Eng. Carlos Mendonça',
    email: 'infra.predial@trf1.jus.br',
    role: 'RESPONSAVEL_INDICADOR',
    organizationId: 'org-sjrr'
  },
  {
    id: 'usr-4',
    name: 'Auditor Marcelo Rios',
    email: 'auditoria.interna@trf1.jus.br',
    role: 'AUDITOR',
    organizationId: 'org-sjrr'
  },
  {
    id: 'usr-5',
    name: 'Dra. Beatriz Albuquerque',
    email: 'diretoria.foro@trf1.jus.br',
    role: 'CONSULTOR',
    organizationId: 'org-sjrr'
  }
];

export const INITIAL_PLS_CYCLES: PLSCycle[] = [
  {
    id: 'pls-sjrr-2021-2026',
    organizationId: 'org-sjrr',
    title: 'Plano de Logística Sustentável da SJRR (Ciclo 2021-2026)',
    cycle: '2021-2026',
    startDate: '2021-01-01',
    endDate: '2026-12-31',
    status: 'VIGENTE',
    normativeBase: [
      'Resolução CNJ nº 400/2021',
      'Resolução CNJ nº 550/2024 (Alterações de Indicadores)',
      'Resolução CNJ nº 594/2024 (Programa Justiça Carbono Zero)',
      'Resolução CNJ nº 641/2025 (Novas Tecnologias e Inovação)',
      'Portaria SJRR/DIREF nº 14/2021',
      'Guia de Indicadores PLS-Jud CNJ'
    ]
  }
];

// Official CNJ PLS Themes (Temas 1 a 21)
export const INITIAL_THEMES: PLSTheme[] = OFFICIAL_THEMES;

// Official CNJ PLS Indicators Catalog
export const INITIAL_INDICATORS: Indicator[] = [
  ...INDICATORS_PART_1,
  ...INDICATORS_PART_2,
  ...INDICATORS_PART_3
];

// Target definitions for key indicators
export const INITIAL_TARGETS: IndicatorTarget[] = [
  {
    id: 'target-6-1-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-6-1',
    year: 2026,
    targetValue: 174000,
    targetUnit: 'kWh',
    targetType: 'REDUCAO_PERCENTUAL',
    baselineValue: 183150,
    baselineYear: 2025,
    reductionPercentage: 5.0,
    notes: 'Resolução CNJ 400/2021: redução de 5% sobre o baseline 2025 mediante retrofit térmico e eficiência.'
  },
  {
    id: 'target-6-2-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-6-2',
    year: 2026,
    targetValue: 12.0,
    targetUnit: 'kWh/m²',
    targetType: 'REDUCAO_PERCENTUAL',
    baselineValue: 12.6,
    baselineYear: 2025,
    reductionPercentage: 4.8,
    notes: 'Consumo relativo de energia elétrica por metro quadrado de área predial.'
  },
  {
    id: 'target-7-1-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-7-1',
    year: 2026,
    targetValue: 2160,
    targetUnit: 'm³',
    targetType: 'REDUCAO_PERCENTUAL',
    baselineValue: 2304,
    baselineYear: 2025,
    reductionPercentage: 6.25,
    notes: 'Redução viabilizada pela substituição de torneiras e bacias sanitárias por modelos economizadores.'
  },
  {
    id: 'target-7-2-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-7-2',
    year: 2026,
    targetValue: 0.15,
    targetUnit: 'm³/m²',
    targetType: 'REDUCAO_PERCENTUAL',
    baselineValue: 0.16,
    baselineYear: 2025,
    reductionPercentage: 6.25,
    notes: 'Consumo relativo de água por m² de área total.'
  },
  {
    id: 'target-2-1-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-2-1',
    year: 2026,
    targetValue: 600,
    targetUnit: 'resmas',
    targetType: 'REDUCAO_PERCENTUAL',
    baselineValue: 710,
    baselineYear: 2025,
    reductionPercentage: 15.5,
    notes: 'Forte redução viabilizada pela expansão do PJe e desmaterialização de processos administrativos.'
  },
  {
    id: 'target-3-1-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-3-1',
    year: 2026,
    targetValue: 0,
    targetUnit: 'centenas',
    targetType: 'LIMITE_MAXIMO',
    baselineValue: 48,
    baselineYear: 2025,
    notes: 'Meta Zero Descartável (Resolução CNJ nº 400/2021, Art. 11): eliminação de copos plásticos individuais.'
  },
  {
    id: 'target-4-1-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-4-1',
    year: 2026,
    targetValue: 0,
    targetUnit: 'embalagens',
    targetType: 'LIMITE_MAXIMO',
    baselineValue: 120,
    baselineYear: 2025,
    notes: 'Substituição integral de água em embalagens plásticas descartáveis por galões retornáveis e filtros prediais.'
  },
  {
    id: 'target-5-1-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-5-1',
    year: 2026,
    targetValue: 216000,
    targetUnit: 'páginas',
    targetType: 'REDUCAO_PERCENTUAL',
    baselineValue: 245000,
    baselineYear: 2025,
    reductionPercentage: 11.8,
    notes: 'Definição de cotas departamentais de impressão e conscientização.'
  },
  {
    id: 'target-8-1-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-8-1',
    year: 2026,
    targetValue: 3200,
    targetUnit: 'kg',
    targetType: 'AUMENTO_PERCENTUAL',
    baselineValue: 2800,
    baselineYear: 2025,
    reductionPercentage: -14.3,
    notes: 'Aumento na destinação de papel e papelão para reciclagem via associação de catadores.'
  },
  {
    id: 'target-8-6-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-8-6',
    year: 2026,
    targetValue: 4560,
    targetUnit: 'kg',
    targetType: 'AUMENTO_PERCENTUAL',
    baselineValue: 3950,
    baselineYear: 2025,
    reductionPercentage: -15.4,
    notes: 'Total de materiais destinados à reciclagem (TMR = DPa + DPl + DMt + DVd + CGe).'
  },
  {
    id: 'target-12-1-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-12-1',
    year: 2026,
    targetValue: 50400,
    targetUnit: 'R$',
    targetType: 'REDUCAO_PERCENTUAL',
    baselineValue: 54600,
    baselineYear: 2025,
    reductionPercentage: 7.7,
    notes: 'Migração para VoIP e corte definitivo de troncos analógicos residuais.'
  },
  {
    id: 'target-13-1-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-13-1',
    year: 2026,
    targetValue: 68000,
    targetUnit: 'km',
    targetType: 'REDUCAO_PERCENTUAL',
    baselineValue: 74550,
    baselineYear: 2025,
    reductionPercentage: 8.8,
    notes: 'Roteirização integrada de mandados jurisdicionais, expansão de audiências por videoconferência e teletrabalho.'
  },
  {
    id: 'target-14-1-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-14-1',
    year: 2026,
    targetValue: 8160,
    targetUnit: 'litros',
    targetType: 'REDUCAO_PERCENTUAL',
    baselineValue: 8850,
    baselineYear: 2025,
    reductionPercentage: 7.8,
    notes: 'Otimização de deslocamentos e rotas de mandados jurisdicionais.'
  },
  {
    id: 'target-16-3-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-16-3',
    year: 2026,
    targetValue: 75.0,
    targetUnit: '%',
    targetType: 'AUMENTO_PERCENTUAL',
    baselineValue: 62.0,
    baselineYear: 2025,
    reductionPercentage: -21.0,
    notes: 'Percentual de contratações com exigência de critérios de sustentabilidade nos editais.'
  },
  {
    id: 'target-20-4-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-20-4',
    year: 2026,
    targetValue: 102.0,
    targetUnit: 'tCO2e',
    targetType: 'REDUCAO_PERCENTUAL',
    baselineValue: 118.4,
    baselineYear: 2025,
    reductionPercentage: 13.8,
    notes: 'Meta do Plano de Descarbonização (Resolução CNJ nº 594/2024 — Justiça Carbono Zero).'
  },
  {
    id: 'target-21-2-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-21-2',
    year: 2026,
    targetValue: 180000,
    targetUnit: 'R$',
    targetType: 'AUMENTO_PERCENTUAL',
    baselineValue: 125000,
    baselineYear: 2025,
    reductionPercentage: -44.0,
    notes: 'Economia anual líquida proporcionada pela introdução de novas tecnologias (Res. CNJ 641/2025).'
  },
  {
    id: 'target-5-3-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-5-3',
    year: 2026,
    targetValue: 650.0,
    targetUnit: 'páginas/pessoa',
    targetType: 'REDUCAO_PERCENTUAL',
    baselineValue: 740.0,
    baselineYear: 2025,
    reductionPercentage: 12.2,
    notes: 'Metodologia Res. CNJ 550/2024: Impressões per capita geral calculadas sobre FTT = 331.'
  },
  {
    id: 'target-6-4-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-6-4',
    year: 2026,
    targetValue: 11.0,
    targetUnit: 'R$/m²',
    targetType: 'REDUCAO_PERCENTUAL',
    baselineValue: 12.1,
    baselineYear: 2025,
    reductionPercentage: 9.1,
    notes: 'Gasto relativo com eletricidade por metro quadrado de área predial total (14.500 m²).'
  },
  {
    id: 'target-7-4-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-7-4',
    year: 2026,
    targetValue: 2.45,
    targetUnit: 'R$/m²',
    targetType: 'REDUCAO_PERCENTUAL',
    baselineValue: 2.90,
    baselineYear: 2025,
    reductionPercentage: 15.5,
    notes: 'Gasto relativo com água e esgoto por m² com economia gerada pelas válvulas economizadoras.'
  },
  {
    id: 'target-8-5-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-8-5',
    year: 2026,
    targetValue: 100.0,
    targetUnit: '%',
    targetType: 'LIMITE_MINIMO',
    baselineValue: 100.0,
    baselineYear: 2025,
    reductionPercentage: 0,
    notes: 'Exigência da Res. CNJ 550/2024 e PNRS: 100% dos resíduos de TI e eletrônicos descartados com logística reversa e emissão de CDF.'
  },
  {
    id: 'target-14-5-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-14-5',
    year: 2026,
    targetValue: 24.5,
    targetUnit: 'litros/pessoa',
    targetType: 'REDUCAO_PERCENTUAL',
    baselineValue: 26.7,
    baselineYear: 2025,
    reductionPercentage: 8.2,
    notes: 'Consumo per capita de combustível veicular sobre a Força de Trabalho Total (FTT).'
  },
  {
    id: 'target-17-3-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-17-3',
    year: 2026,
    targetValue: 45.0,
    targetUnit: '%',
    targetType: 'AUMENTO_PERCENTUAL',
    baselineValue: 34.0,
    baselineYear: 2025,
    reductionPercentage: -32.4,
    notes: 'Meta PLS-SJRR: Participação de magistrados e servidores em ações de saúde e qualidade de vida.'
  },
  {
    id: 'target-18-3-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-18-3',
    year: 2026,
    targetValue: 35.0,
    targetUnit: '%',
    targetType: 'AUMENTO_PERCENTUAL',
    baselineValue: 24.5,
    baselineYear: 2025,
    reductionPercentage: -42.9,
    notes: 'Meta PLS-SJRR: Participação em capacitações de sustentabilidade, ODS e contratações sustentáveis.'
  },
  {
    id: 'target-1-1-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-1-1',
    year: 2026,
    targetValue: 331,
    targetUnit: 'pessoas',
    targetType: 'LIMITE_MAXIMO',
    baselineValue: 331,
    baselineYear: 2025,
    notes: 'Força de Trabalho Total (FTT) monitorada para cálculos de indicadores per capita.'
  },
  {
    id: 'target-1-2-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-1-2',
    year: 2026,
    targetValue: 14500,
    targetUnit: 'm²',
    targetType: 'LIMITE_MAXIMO',
    baselineValue: 14500,
    baselineYear: 2025,
    notes: 'Área Total Construída (ATC) para apuração de intensidade de uso.'
  },
  {
    id: 'target-9-1-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-9-1',
    year: 2026,
    targetValue: 100.0,
    targetUnit: '%',
    targetType: 'LIMITE_MINIMO',
    baselineValue: 80.0,
    baselineYear: 2025,
    reductionPercentage: -25.0,
    notes: '100% de reformas e obras com requisitos de sustentabilidade (Lei nº 14.133/2021 e Res. CNJ 400/2021).'
  },
  {
    id: 'target-10-1-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-10-1',
    year: 2026,
    targetValue: 90.0,
    targetUnit: '%',
    targetType: 'AUMENTO_PERCENTUAL',
    baselineValue: 75.0,
    baselineYear: 2025,
    reductionPercentage: -20.0,
    notes: 'Produtos de limpeza biodegradáveis com selo ecológico ou certificação ambiental.'
  },
  {
    id: 'target-11-1-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-11-1',
    year: 2026,
    targetValue: 390000,
    targetUnit: 'R$',
    targetType: 'REDUCAO_PERCENTUAL',
    baselineValue: 420000,
    baselineYear: 2025,
    reductionPercentage: 7.1,
    notes: 'Otimização de postos de vigilância presencial mediante integração com videomonitoramento inteligente.'
  },
  {
    id: 'target-15-1-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-15-1',
    year: 2026,
    targetValue: 42,
    targetUnit: 'postos',
    targetType: 'REDUCAO_PERCENTUAL',
    baselineValue: 45,
    baselineYear: 2025,
    reductionPercentage: 6.7,
    notes: 'Racionalização e eficiência de postos terceirizados de apoio administrativo.'
  },
  {
    id: 'target-19-1-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-19-1',
    year: 2026,
    targetValue: 50.0,
    targetUnit: '%',
    targetType: 'LIMITE_MINIMO',
    baselineValue: 42.0,
    baselineYear: 2025,
    reductionPercentage: -19.0,
    notes: 'Equidade de gênero: percentual mínimo de 50% de mulheres ocupando cargos de chefia e assessoramento (Res. CNJ 255/2018 e 400/2021).'
  },
  {
    id: 'target-21-1-2026',
    organizationId: 'org-sjrr',
    indicatorId: 'indicator-21-1',
    year: 2026,
    targetValue: 5,
    targetUnit: 'projetos',
    targetType: 'AUMENTO_PERCENTUAL',
    baselineValue: 2,
    baselineYear: 2025,
    reductionPercentage: -150.0,
    notes: 'Projetos e fluxos automatizados com IA e tecnologia para redução do uso de insumos e celeridade.'
  }
];

// Helper to generate monthly measurements
const generateSeedMeasurements = (): IndicatorMeasurement[] => {
  const measurements: IndicatorMeasurement[] = [];

  // Monthly values for 2022 (full year)
  // Monthly values for 2023 (full year)
  // Monthly values for 2024 (full year)
  // Monthly values for 2025 (full year)
  // Monthly values for 2026 (Jan to Aug reported, Sep-Dec pending)

  // 1. Energia Elétrica (6.1 — CEE) in kWh
  const energy2022 = [15300, 15100, 15400, 15500, 15200, 15000, 14900, 15300, 15600, 15700, 15100, 14300]; // 182.400 kWh
  const energy2023 = [15000, 14800, 15100, 15200, 14900, 14700, 14600, 15000, 15300, 15400, 14700, 13500]; // 178.200 kWh
  const energy2024 = [15800, 15600, 16200, 16400, 16100, 15900, 15700, 16300, 16800, 17100, 16500, 15900]; // 193.300 kWh
  const energy2025 = [15200, 15000, 15400, 15500, 15300, 15100, 14900, 15600, 15900, 16100, 15450, 14700]; // 184.250 kWh
  // 2026: August has an anomalous spike (21,450 kWh) due to HVAC chiller failure and backup units running 24/7!
  const energy2026 = [14200, 14100, 14450, 14300, 14600, 14800, 14500, 21450]; // Jan-Aug: 122.400 kWh

  // 2. Gasto Energia Elétrica (6.3 — GEE) in R$
  const energyCost2022 = [14200, 14000, 14300, 14400, 14100, 13950, 13850, 14200, 14500, 14600, 14000, 13300];
  const energyCost2023 = [14600, 14400, 14700, 14800, 14500, 14300, 14200, 14600, 14900, 15000, 14400, 13600];
  const energyCost2024 = [15010, 14820, 15390, 15580, 15295, 15105, 14915, 15485, 15960, 16245, 15675, 15105];
  const energyCost2025 = [14440, 14250, 14630, 14725, 14535, 14345, 14155, 14820, 15105, 15295, 14677, 13965];
  const energyCost2026 = [13490, 13395, 13727, 13585, 13870, 14060, 13775, 19840.65];

  // 3. Água (7.1 — CA) in m³
  const water2022 = [235, 230, 240, 245, 238, 230, 225, 242, 248, 252, 235, 230]; // 2.850 m³
  const water2023 = [220, 215, 225, 230, 222, 215, 210, 224, 228, 232, 218, 211]; // 2.650 m³
  const water2024 = [205, 198, 210, 215, 202, 195, 190, 208, 212, 218, 200, 192]; // 2.445 m³
  const water2025 = [195, 188, 196, 200, 194, 189, 184, 198, 202, 205, 189, 180]; // 2.320 m³
  const water2026 = [174, 170, 178, 172, 175, 168, 165, 179]; // Jan-Aug: 1.381 m³

  // 4. Gasto com Água (7.3 — GA) in R$
  const waterCost2022 = [3800, 3700, 3900, 4000, 3850, 3700, 3600, 3900, 4000, 4100, 3800, 3700];
  const waterCost2023 = [3750, 3650, 3850, 3950, 3800, 3650, 3550, 3850, 3900, 4000, 3700, 3600];
  const waterCost2024 = [3690, 3564, 3780, 3870, 3636, 3510, 3420, 3744, 3816, 3924, 3600, 3456];
  const waterCost2025 = [3510, 3384, 3528, 3600, 3492, 3402, 3312, 3564, 3636, 3690, 3402, 3240];
  const waterCost2026 = [3132, 3060, 3204, 3096, 3150, 3024, 2970, 3240.50];

  // 5. Papel Próprio (2.1 — CPP) in resmas
  const paper2022 = [95, 90, 100, 98, 92, 88, 85, 96, 98, 102, 90, 86]; // 1.120 resmas
  const paper2023 = [80, 76, 84, 82, 78, 74, 72, 80, 82, 86, 75, 71]; // 940 resmas
  const paper2024 = [65, 62, 70, 68, 64, 60, 58, 66, 68, 72, 60, 55]; // 768 resmas
  const paper2025 = [58, 55, 62, 60, 57, 54, 52, 60, 62, 64, 56, 70]; // 710 resmas
  const paper2026 = [48, 45, 49, 44, 46, 42, 40, 46]; // Jan-Aug: 360 resmas

  // 6. Gasto com Papel (2.2 — GPP) in R$
  const paperCost2022 = [3040, 2880, 3200, 3136, 2944, 2816, 2720, 3072, 3136, 3264, 2880, 2752];
  const paperCost2023 = [2640, 2508, 2772, 2706, 2574, 2442, 2376, 2640, 2706, 2838, 2475, 2343];
  const paperCost2024 = [2210, 2108, 2380, 2312, 2176, 2040, 1972, 2244, 2312, 2448, 2040, 1870];
  const paperCost2025 = [1972, 1870, 2108, 2040, 1938, 1836, 1768, 2040, 2108, 2176, 1904, 2380];
  const paperCost2026 = [1632, 1530, 1666, 1496, 1564, 1428, 1360, 1564];

  // 7. Copos Descartáveis (3.1 — CC) in centenas
  const cups2022 = [14.0, 13.5, 14.5, 14.2, 13.8, 13.2, 12.8, 14.0, 14.4, 15.0, 13.6, 13.0]; // 162 centenas
  const cups2023 = [10.5, 10.0, 11.0, 10.8, 10.2, 9.8, 9.5, 10.4, 10.6, 11.2, 10.0, 9.5]; // 123.5 centenas
  const cups2024 = [7.5, 7.0, 8.0, 7.8, 7.2, 6.8, 6.5, 7.4, 7.6, 8.2, 7.0, 6.5]; // 87.5 centenas
  const cups2025 = [4.5, 4.2, 4.6, 4.3, 4.0, 3.8, 3.5, 4.1, 4.2, 4.4, 3.8, 2.6]; // 48.0 centenas
  const cups2026 = [0, 0, 0, 0, 0, 0, 0, 0]; // 100% eliminado!

  // 8. Combustível / Gasolina (14.1 — CG) in litros
  const fuel2022 = [920, 890, 950, 940, 930, 900, 880, 940, 970, 990, 940, 880]; // 11.130 L
  const fuel2023 = [850, 820, 880, 870, 860, 830, 810, 870, 900, 920, 860, 810]; // 10.280 L
  const fuel2024 = [780, 750, 820, 810, 790, 760, 740, 800, 830, 850, 790, 740]; // 9.460 L
  const fuel2025 = [730, 710, 760, 750, 740, 720, 700, 760, 780, 800, 750, 650]; // 8.850 L
  const fuel2026 = [670, 650, 690, 660, 675, 640, 630, 680]; // Jan-Aug: 5.295 L

  // 8b. Quilometragem Rodada pela Frota (13.1 — Km) in km
  const km2022 = [7400, 7100, 7600, 7550, 7450, 7200, 7000, 7500, 7750, 7900, 7450, 7000]; // 88.900 km
  const km2023 = [6950, 6700, 7200, 7150, 7050, 6800, 6600, 7100, 7350, 7500, 7050, 6600]; // 84.050 km
  const km2024 = [6550, 6300, 6880, 6800, 6650, 6400, 6200, 6720, 6980, 7140, 6640, 6220]; // 79.480 km
  const km2025 = [6150, 5980, 6400, 6320, 6230, 6060, 5900, 6400, 6570, 6740, 6320, 5480]; // 74.550 km
  const km2026 = [5650, 5480, 5820, 5570, 5700, 5400, 5320, 5750]; // Jan-Ago: 44.690 km

  // 9. Gasto com Telefonia Fixa (12.1 — GTF) in R$
  const phone2022 = [5400, 5350, 5500, 5450, 5400, 5300, 5250, 5450, 5550, 5600, 5350, 5200];
  const phone2023 = [5100, 5050, 5200, 5150, 5100, 5000, 4950, 5150, 5250, 5300, 5050, 4900];
  const phone2024 = [4800, 4750, 4900, 4850, 4800, 4700, 4650, 4850, 4950, 5000, 4750, 4600];
  const phone2025 = [4550, 4500, 4600, 4580, 4520, 4480, 4400, 4590, 4650, 4700, 4530, 4500];
  // 2026: Jul e Ago acima da meta por cobrança de troncos E1 legados
  const phone2026 = [4150, 4100, 4180, 4120, 4210, 4190, 4850, 4920];

  // 10. Impressão (5.1 — QI) in páginas
  const print2022 = [26500, 26000, 27500, 27200, 26800, 26200, 25500, 27000, 27800, 28500, 26600, 24400]; // 320.000 págs
  const print2023 = [24200, 23700, 25100, 24800, 24300, 23800, 23000, 24600, 25200, 25800, 24000, 22500]; // 291.000 págs
  const print2024 = [22000, 21500, 23000, 22800, 22200, 21800, 21000, 22900, 23400, 24000, 22100, 20300]; // 267.000 págs
  const print2025 = [20500, 20100, 21200, 21000, 20600, 20200, 19800, 21100, 21600, 22000, 20400, 16500]; // 245.000 págs
  const print2026 = [17800, 17200, 18100, 17600, 17900, 16900, 16400, 17500]; // Jan-Aug: 139.400 págs

  // 11. Resíduos de Papel (8.1 — DPa) in kg
  const waste2022 = [240, 230, 255, 250, 245, 235, 225, 248, 258, 268, 245, 232];
  const waste2023 = [265, 255, 280, 275, 270, 260, 250, 272, 285, 295, 270, 258];
  const waste2024 = [290, 280, 310, 305, 295, 285, 275, 300, 315, 325, 295, 280];
  const waste2025 = [320, 310, 340, 335, 325, 315, 305, 330, 345, 355, 330, 340];
  const waste2026 = [390, 380, 410, 395, 415, 400, 395, 420];

  // 12. Total de Materiais Recicláveis (8.6 — TMR) in kg
  const tmr2022 = [310, 295, 330, 325, 315, 305, 295, 320, 335, 345, 315, 300]; // 3.790 kg
  const tmr2023 = [350, 335, 370, 365, 355, 342, 330, 360, 378, 390, 355, 340]; // 4.270 kg
  const tmr2024 = [385, 370, 410, 402, 390, 378, 365, 398, 418, 430, 392, 372]; // 4.712 kg
  const tmr2025 = [425, 410, 450, 445, 432, 418, 405, 438, 458, 472, 438, 452]; // 5.245 kg
  const tmr2026 = [520, 505, 545, 528, 552, 532, 525, 560]; // Jan-Aug: 4.267 kg

  // 13. Linhas Telefônicas Fixas (12.2 — LTF) in linhas
  const ltfMonthly = [48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48];

  // Configuration of tracked series for 5 full years (2022 - 2026)
  const series = [
    { id: 'indicator-6-1', unit: 'kWh', y22: energy2022, y23: energy2023, y24: energy2024, y25: energy2025, y26: energy2026, source: 'document_extraction', docRef: 'FAT-RORAIMA-ENERGIA' },
    { id: 'indicator-6-3', unit: 'R$', y22: energyCost2022, y23: energyCost2023, y24: energyCost2024, y25: energyCost2025, y26: energyCost2026, source: 'document_extraction', docRef: 'FAT-RORAIMA-ENERGIA-VALOR' },
    { id: 'indicator-7-1', unit: 'm³', y22: water2022, y23: water2023, y24: water2024, y25: water2025, y26: water2026, source: 'document_extraction', docRef: 'FAT-CAER-AGUA' },
    { id: 'indicator-7-3', unit: 'R$', y22: waterCost2022, y23: waterCost2023, y24: waterCost2024, y25: waterCost2025, y26: waterCost2026, source: 'document_extraction', docRef: 'FAT-CAER-VALOR' },
    { id: 'indicator-2-1', unit: 'resmas', y22: paper2022, y23: paper2023, y24: paper2024, y25: paper2025, y26: paper2026, source: 'spreadsheet', docRef: 'ALMOX-PAPEL' },
    { id: 'indicator-2-2', unit: 'R$', y22: paperCost2022, y23: paperCost2023, y24: paperCost2024, y25: paperCost2025, y26: paperCost2026, source: 'spreadsheet', docRef: 'ALMOX-PAPEL-VALOR' },
    { id: 'indicator-3-1', unit: 'centenas', y22: cups2022, y23: cups2023, y24: cups2024, y25: cups2025, y26: cups2026, source: 'manual', docRef: 'ATESTO-COPOS' },
    { id: 'indicator-13-1', unit: 'km', y22: km2022, y23: km2023, y24: km2024, y25: km2025, y26: km2026, source: 'API', docRef: 'TELEMETRIA-FROTA-KM' },
    { id: 'indicator-14-1', unit: 'litros', y22: fuel2022, y23: fuel2023, y24: fuel2024, y25: fuel2025, y26: fuel2026, source: 'API', docRef: 'CTF-FROTA-OFICIAL' },
    { id: 'indicator-12-1', unit: 'R$', y22: phone2022, y23: phone2023, y24: phone2024, y25: phone2025, y26: phone2026, source: 'document_extraction', docRef: 'FAT-OI-TELEFONIA' },
    { id: 'indicator-12-2', unit: 'linhas', y22: ltfMonthly, y23: ltfMonthly, y24: ltfMonthly, y25: ltfMonthly, y26: ltfMonthly.slice(0, 8), source: 'manual', docRef: 'CADASTRO-RAMAIS' },
    { id: 'indicator-5-1', unit: 'páginas', y22: print2022, y23: print2023, y24: print2024, y25: print2025, y26: print2026, source: 'document_extraction', docRef: 'REL-OUTSOURCING' },
    { id: 'indicator-8-1', unit: 'kg', y22: waste2022, y23: waste2023, y24: waste2024, y25: waste2025, y26: waste2026, source: 'manual', docRef: 'MANIFESTO-CATADORES' },
    { id: 'indicator-8-6', unit: 'kg', y22: tmr2022, y23: tmr2023, y24: tmr2024, y25: tmr2025, y26: tmr2026, source: 'manual', docRef: 'RELATORIO-TMR' },
    // Indicadores Calculados Oficiais (Resolução CNJ 400/2021)
    { 
      id: 'indicator-6-2', 
      unit: 'kWh/m²', 
      y22: energy2022.map(v => Number((v / 14500).toFixed(4))), 
      y23: energy2023.map(v => Number((v / 14500).toFixed(4))), 
      y24: energy2024.map(v => Number((v / 14500).toFixed(4))), 
      y25: energy2025.map(v => Number((v / 14500).toFixed(4))), 
      y26: energy2026.map(v => Number((v / 14500).toFixed(4))), 
      source: 'calculated', 
      docRef: 'CALC-CRE-CEE-M2' 
    },
    { 
      id: 'indicator-6-4', 
      unit: 'R$/m²', 
      y22: energyCost2022.map(v => Number((v / 14500).toFixed(2))), 
      y23: energyCost2023.map(v => Number((v / 14500).toFixed(2))), 
      y24: energyCost2024.map(v => Number((v / 14500).toFixed(2))), 
      y25: energyCost2025.map(v => Number((v / 14500).toFixed(2))), 
      y26: energyCost2026.map(v => Number((v / 14500).toFixed(2))), 
      source: 'calculated', 
      docRef: 'CALC-GRE-GEE-M2' 
    },
    { 
      id: 'indicator-7-2', 
      unit: 'm³/m²', 
      y22: water2022.map(v => Number((v / 14500).toFixed(4))), 
      y23: water2023.map(v => Number((v / 14500).toFixed(4))), 
      y24: water2024.map(v => Number((v / 14500).toFixed(4))), 
      y25: water2025.map(v => Number((v / 14500).toFixed(4))), 
      y26: water2026.map(v => Number((v / 14500).toFixed(4))), 
      source: 'calculated', 
      docRef: 'CALC-CRA-CA-M2' 
    },
    { 
      id: 'indicator-7-4', 
      unit: 'R$/m²', 
      y22: waterCost2022.map(v => Number((v / 14500).toFixed(2))), 
      y23: waterCost2023.map(v => Number((v / 14500).toFixed(2))), 
      y24: waterCost2024.map(v => Number((v / 14500).toFixed(2))), 
      y25: waterCost2025.map(v => Number((v / 14500).toFixed(2))), 
      y26: waterCost2026.map(v => Number((v / 14500).toFixed(2))), 
      source: 'calculated', 
      docRef: 'CALC-GRA-GA-M2' 
    },
    { 
      id: 'indicator-5-3', 
      unit: 'páginas/pessoa', 
      y22: print2022.map(v => Number((v / 331).toFixed(1))), 
      y23: print2023.map(v => Number((v / 331).toFixed(1))), 
      y24: print2024.map(v => Number((v / 331).toFixed(1))), 
      y25: print2025.map(v => Number((v / 331).toFixed(1))), 
      y26: print2026.map(v => Number((v / 331).toFixed(1))), 
      source: 'calculated', 
      docRef: 'CALC-QIP-QI-FTT' 
    },
    { 
      id: 'indicator-12-3', 
      unit: 'R$/pessoa', 
      y22: phone2022.map(v => Number((v / 331).toFixed(2))), 
      y23: phone2023.map(v => Number((v / 331).toFixed(2))), 
      y24: phone2024.map(v => Number((v / 331).toFixed(2))), 
      y25: phone2025.map(v => Number((v / 331).toFixed(2))), 
      y26: phone2026.map(v => Number((v / 331).toFixed(2))), 
      source: 'calculated', 
      docRef: 'CALC-GTFP-GTF-FTT' 
    },
    { 
      id: 'indicator-14-5', 
      unit: 'litros/pessoa', 
      y22: fuel2022.map(v => Number((v / 331).toFixed(2))), 
      y23: fuel2023.map(v => Number((v / 331).toFixed(2))), 
      y24: fuel2024.map(v => Number((v / 331).toFixed(2))), 
      y25: fuel2025.map(v => Number((v / 331).toFixed(2))), 
      y26: fuel2026.map(v => Number((v / 331).toFixed(2))), 
      source: 'calculated', 
      docRef: 'CALC-CGP-CG-FTT' 
    }
  ];

  series.forEach(s => {
    // 2022
    s.y22.forEach((val, idx) => {
      measurements.push({
        id: `m-${s.id}-2022-${idx + 1}`,
        indicatorId: s.id,
        organizationId: 'org-sjrr',
        year: 2022,
        month: idx + 1,
        value: val,
        unit: s.unit,
        sourceType: s.source as any,
        sourceReference: `${s.docRef}-2022-${String(idx + 1).padStart(2, '0')}`,
        processNumber: '0000450-01.2022.4.01.8012',
        validationStatus: 'VALIDADO',
        validatedBy: 'usr-1',
        validatedAt: '2022-12-31T18:00:00Z',
        confidenceScore: 98,
        createdAt: '2022-01-15T10:00:00Z',
        updatedAt: '2022-12-31T18:00:00Z'
      });
    });

    // 2023
    s.y23.forEach((val, idx) => {
      measurements.push({
        id: `m-${s.id}-2023-${idx + 1}`,
        indicatorId: s.id,
        organizationId: 'org-sjrr',
        year: 2023,
        month: idx + 1,
        value: val,
        unit: s.unit,
        sourceType: s.source as any,
        sourceReference: `${s.docRef}-2023-${String(idx + 1).padStart(2, '0')}`,
        processNumber: '0000620-33.2023.4.01.8012',
        validationStatus: 'VALIDADO',
        validatedBy: 'usr-1',
        validatedAt: '2023-12-31T18:00:00Z',
        confidenceScore: 98,
        createdAt: '2023-01-15T10:00:00Z',
        updatedAt: '2023-12-31T18:00:00Z'
      });
    });

    // 2024
    s.y24.forEach((val, idx) => {
      measurements.push({
        id: `m-${s.id}-2024-${idx + 1}`,
        indicatorId: s.id,
        organizationId: 'org-sjrr',
        year: 2024,
        month: idx + 1,
        value: val,
        unit: s.unit,
        sourceType: s.source as any,
        sourceReference: `${s.docRef}-2024-${String(idx + 1).padStart(2, '0')}`,
        processNumber: '0000842-12.2024.4.01.8012',
        validationStatus: 'VALIDADO',
        validatedBy: 'usr-1',
        validatedAt: '2024-12-31T18:00:00Z',
        confidenceScore: 98,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-12-31T18:00:00Z'
      });
    });

    // 2025
    s.y25.forEach((val, idx) => {
      measurements.push({
        id: `m-${s.id}-2025-${idx + 1}`,
        indicatorId: s.id,
        organizationId: 'org-sjrr',
        year: 2025,
        month: idx + 1,
        value: val,
        unit: s.unit,
        sourceType: s.source as any,
        sourceReference: `${s.docRef}-2025-${String(idx + 1).padStart(2, '0')}`,
        processNumber: '0001015-44.2025.4.01.8012',
        validationStatus: 'VALIDADO',
        validatedBy: 'usr-1',
        validatedAt: '2025-12-31T18:00:00Z',
        confidenceScore: 99,
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-12-31T18:00:00Z'
      });
    });

    // 2026 (Jan to Aug)
    s.y26.forEach((val, idx) => {
      const isAug = idx === 7;
      measurements.push({
        id: `m-${s.id}-2026-${idx + 1}`,
        indicatorId: s.id,
        organizationId: 'org-sjrr',
        year: 2026,
        month: idx + 1,
        value: val,
        unit: s.unit,
        sourceType: s.source as any,
        sourceReference: `${s.docRef}-2026-${String(idx + 1).padStart(2, '0')}`,
        processNumber: '0001245-88.2026.4.01.8012',
        sourceDocumentId: isAug && s.id === 'indicator-6-1' ? 'doc-energia-ago-2026' : undefined,
        validationStatus: (s.id === 'indicator-12-1' && isAug) ? 'PENDENTE' : 'VALIDADO',
        validatedBy: (s.id === 'indicator-12-1' && isAug) ? undefined : 'usr-1',
        validatedAt: (s.id === 'indicator-12-1' && isAug) ? undefined : '2026-09-05T14:30:00Z',
        confidenceScore: isAug ? 94 : 98,
        notes: isAug && s.id === 'indicator-6-1' ? 'Pico decorrente de avaria no chiller principal durante estiagem em Boa Vista/RR.' : undefined,
        createdAt: `2026-${String(idx + 1).padStart(2, '0')}-05T09:00:00Z`,
        updatedAt: `2026-${String(idx + 1).padStart(2, '0')}-06T15:00:00Z`
      });
    });
  });

  // Cadastrar Variáveis Gerais (Tema 1)
  const generalVars = [
    { id: 'indicator-1-1', unit: 'cargos', value: 22 },
    { id: 'indicator-1-2', unit: 'pessoas', value: 215 },
    { id: 'indicator-1-3', unit: 'pessoas', value: 14 },
    { id: 'indicator-1-5', unit: 'pessoas', value: 18 },
    { id: 'indicator-1-6', unit: 'pessoas', value: 247 },
    { id: 'indicator-1-7', unit: 'pessoas', value: 42 },
    { id: 'indicator-1-8', unit: 'pessoas', value: 20 },
    { id: 'indicator-1-15', unit: 'pessoas', value: 62 },
    { id: 'indicator-1-16', unit: 'pessoas', value: 331 },
    { id: 'indicator-1-17', unit: 'm²', value: 14500 }
  ];

  generalVars.forEach(gv => {
    [2022, 2023, 2024, 2025, 2026].forEach(yr => {
      measurements.push({
        id: `m-${gv.id}-${yr}-12`,
        indicatorId: gv.id,
        organizationId: 'org-sjrr',
        year: yr,
        month: 12,
        value: gv.value,
        unit: gv.unit,
        sourceType: 'manual',
        sourceReference: 'SIESPJ / SELEP',
        validationStatus: 'VALIDADO',
        confidenceScore: 100,
        createdAt: `${yr}-01-10T08:00:00Z`,
        updatedAt: `${yr}-12-31T18:00:00Z`
      });
    });
  });

  // Cadastrar Indicadores Anuais dos Temas 16, 20 e 21 para 5 anos (2022 a 2026)
  const annualMetrics = [
    // 16.1 TC
    { id: 'indicator-16-1', unit: 'contratações', y22: 58, y23: 61, y24: 64, y25: 68, y26: 72 },
    // 16.2 TCS
    { id: 'indicator-16-2', unit: 'contratações', y22: 22, y23: 28, y24: 36, y25: 42, y26: 54 },
    // 16.3 PCS
    { id: 'indicator-16-3', unit: '%', y22: 37.9, y23: 45.9, y24: 56.2, y25: 61.8, y26: 75.0 },
    // 20.1 Escopo 1
    { id: 'indicator-20-1', unit: 'tCO2e', y22: 46.5, y23: 42.1, y24: 38.4, y25: 34.2, y26: 30.0 },
    // 20.2 Escopo 2
    { id: 'indicator-20-2', unit: 'tCO2e', y22: 82.4, y23: 75.3, y24: 68.2, y25: 62.5, y26: 54.0 },
    // 20.3 Escopo 3
    { id: 'indicator-20-3', unit: 'tCO2e', y22: 29.5, y23: 26.8, y24: 24.1, y25: 21.7, y26: 18.0 },
    // 20.4 Total GEE
    { id: 'indicator-20-4', unit: 'tCO2e', y22: 158.4, y23: 144.2, y24: 130.7, y25: 118.4, y26: 102.0 },
    // 20.5 GEE per capita
    { id: 'indicator-20-5', unit: 'tCO2e/pessoa', y22: 0.48, y23: 0.44, y24: 0.40, y25: 0.37, y26: 0.31 },
    // 20.6 Compensação
    { id: 'indicator-20-6', unit: 'tCO2e', y22: 0.0, y23: 5.0, y24: 10.0, y25: 15.0, y26: 25.0 },
    // 21.1 ANT
    { id: 'indicator-21-1', unit: 'iniciativas', y22: 1, y23: 1, y24: 2, y25: 3, y26: 5 },
    // 21.2 RDC
    { id: 'indicator-21-2', unit: 'R$', y22: 45000, y23: 65000, y24: 90000, y25: 125000, y26: 180000 },
    // 17.3 PQVT
    { id: 'indicator-17-3', unit: '%', y22: 18.0, y23: 22.5, y24: 28.5, y25: 34.0, y26: 45.0 },
    // 18.3 PCSus
    { id: 'indicator-18-3', unit: '%', y22: 12.0, y23: 15.0, y24: 18.2, y25: 24.5, y26: 35.0 },
    // 8.5 DEE
    { id: 'indicator-8-5', unit: '%', y22: 85.0, y23: 92.0, y24: 100.0, y25: 100.0, y26: 100.0 },
    // 9.1 Obras Sustentáveis
    { id: 'indicator-9-1', unit: '%', y22: 60.0, y23: 70.0, y24: 75.0, y25: 80.0, y26: 100.0 },
    // 10.1 Produtos Limpeza Sustentáveis
    { id: 'indicator-10-1', unit: '%', y22: 55.0, y23: 65.0, y24: 70.0, y25: 75.0, y26: 92.0 },
    // 11.1 Vigilância
    { id: 'indicator-11-1', unit: 'R$', y22: 440000, y23: 435000, y24: 430000, y25: 420000, y26: 388000 },
    // 15.1 Apoio Terceirizado
    { id: 'indicator-15-1', unit: 'postos', y22: 48, y23: 47, y24: 46, y25: 45, y26: 42 },
    // 19.1 Equidade Mulheres Chefia
    { id: 'indicator-19-1', unit: '%', y22: 35.0, y23: 38.0, y24: 40.0, y25: 42.0, y26: 52.0 }
  ];

  annualMetrics.forEach(am => {
    [
      { y: 2022, v: am.y22 },
      { y: 2023, v: am.y23 },
      { y: 2024, v: am.y24 },
      { y: 2025, v: am.y25 },
      { y: 2026, v: am.y26 }
    ].forEach(item => {
      measurements.push({
        id: `m-${am.id}-${item.y}-annual`,
        indicatorId: am.id,
        organizationId: 'org-sjrr',
        year: item.y,
        month: 12,
        value: item.v,
        unit: am.unit,
        sourceType: 'manual',
        sourceReference: `Relatório Anual ${item.y}`,
        validationStatus: 'VALIDADO',
        confidenceScore: 100,
        createdAt: `${item.y}-12-20T10:00:00Z`,
        updatedAt: `${item.y}-12-31T18:00:00Z`
      });
    });
  });

  return measurements;
};

export const INITIAL_MEASUREMENTS: IndicatorMeasurement[] = generateSeedMeasurements();

export const INITIAL_DOCUMENTS: PLSDocument[] = [
  {
    id: 'doc-energia-ago-2026',
    organizationId: 'org-sjrr',
    title: 'Fatura Roraima Energia - Competência 08/2026',
    fileName: 'Fatura_Roraima_Energia_08_2026_SEI_0001245.pdf',
    fileType: 'FATURA',
    competence: '2026-08',
    indicatorId: 'indicator-6-1',
    processNumber: '0001245-88.2026.4.01.8012',
    supplier: 'Roraima Energia S.A. (CNPJ 02.341.470/0001-44)',
    amount: 19840.65,
    consumption: 21450,
    unit: 'kWh',
    status: 'PROCESSADO',
    extractionConfidence: 96,
    fileSize: '1.4 MB',
    uploadedAt: '2026-09-02T11:20:00Z',
    validatedAt: '2026-09-04T15:10:00Z',
    validatedBy: 'usr-3',
    ocrConfidence: 97,
    rawTextSnippet: 'RORAIMA ENERGIA S.A. - FATURA DE ENERGIA ELÉTRICA - UC: 7489210-4 - Sede SJRR - Competência: 08/2026 - Consumo Ativo Total: 21.450 kWh - Total a Pagar: R$ 19.840,65 - Vencimento: 20/09/2026 - Atesto SEI nº 1489201'
  },
  {
    id: 'doc-atesto-energia-ago-2026',
    organizationId: 'org-sjrr',
    title: 'Atesto do Fiscal do Contrato de Energia Elétrica - 08/2026',
    fileName: 'Atesto_Fiscal_Energia_08_2026.pdf',
    fileType: 'ATESTO',
    competence: '2026-08',
    indicatorId: 'indicator-6-1',
    processNumber: '0001245-88.2026.4.01.8012',
    supplier: 'Seção de Infraestrutura Predial',
    amount: 19840.65,
    consumption: 21450,
    unit: 'kWh',
    status: 'PROCESSADO',
    extractionConfidence: 98,
    fileSize: '450 KB',
    uploadedAt: '2026-09-04T14:00:00Z',
    validatedAt: '2026-09-04T15:10:00Z',
    validatedBy: 'usr-3',
    ocrConfidence: 98,
    rawTextSnippet: 'ATESTO DE LIQUIDAÇÃO DE DESPESA: Atesto para os devidos fins de liquidação da despesa que os serviços de fornecimento de eletricidade da fatura 9812401 da Roraima Energia S.A. foram regularmente prestados no mês de agosto/2026...'
  },
  {
    id: 'doc-caer-ago-2026',
    organizationId: 'org-sjrr',
    title: 'Fatura CAER Água e Esgoto - 08/2026',
    fileName: 'Fatura_CAER_Agua_08_2026.pdf',
    fileType: 'FATURA',
    competence: '2026-08',
    indicatorId: 'indicator-7-1',
    processNumber: '0001246-73.2026.4.01.8012',
    supplier: 'Companhia de Águas e Esgotos de Roraima - CAER',
    amount: 3240.50,
    consumption: 179,
    unit: 'm³',
    status: 'PROCESSADO',
    extractionConfidence: 98,
    fileSize: '980 KB',
    uploadedAt: '2026-09-03T10:15:00Z',
    validatedAt: '2026-09-04T16:20:00Z',
    validatedBy: 'usr-1',
    ocrConfidence: 98,
    rawTextSnippet: 'CAER - COMPANHIA DE ÁGUAS E ESGOTOS DE RORAIMA - Matrícula: 334102-1 - Sede da SJRR - Mês de Referência: 08/2026 - Consumo Medido: 179 m3 - Tarifa Comercial Pública - Total da Conta: R$ 3.240,50'
  },
  {
    id: 'doc-telefonia-ago-2026',
    organizationId: 'org-sjrr',
    title: 'Fatura Telefônica STFC Oi S.A. - 08/2026 (Em Contestação)',
    fileName: 'Fatura_Oi_STFC_08_2026_Pendente.pdf',
    fileType: 'FATURA',
    competence: '2026-08',
    indicatorId: 'indicator-12-1',
    processNumber: '0000789-22.2026.4.01.8012',
    supplier: 'Telemar Norte Leste S/A - Em Recuperação Judicial',
    amount: 4920.00,
    consumption: 4920,
    unit: 'R$',
    status: 'PENDENTE_VALIDACAO',
    extractionConfidence: 82, // Low confidence alert
    fileSize: '1.8 MB',
    uploadedAt: '2026-09-08T16:40:00Z',
    ocrConfidence: 82,
    rawTextSnippet: 'OI S.A. - CONTA TELEFÔNICA STFC - Competência: 08/2026 - Troncos E1 e Acessos Diretos - Valor Total: R$ 4.920,00 - Cobrança retroativa de manutenção de tronco fixo.'
  },
  {
    id: 'doc-res-cnj-400',
    organizationId: 'org-sjrr',
    title: 'Resolução CNJ nº 400/2021 Compilada',
    fileName: 'Resolucao_CNJ_400_2021_Compilada.pdf',
    fileType: 'NORMATIVO',
    status: 'PROCESSADO',
    extractionConfidence: 100,
    fileSize: '4.2 MB',
    uploadedAt: '2024-01-10T08:00:00Z',
    validatedAt: '2024-01-10T08:00:00Z',
    validatedBy: 'usr-2',
    ocrConfidence: 100,
    rawTextSnippet: 'RESOLUÇÃO Nº 400, DE 16 DE JUNHO DE 2021. Dispõe sobre a política de sustentabilidade no âmbito do Poder Judiciário. Art. 1º Fica instituída a política de sustentabilidade do Poder Judiciário...'
  },
  {
    id: 'doc-res-cnj-594',
    organizationId: 'org-sjrr',
    title: 'Resolução CNJ nº 594/2024 (Justiça Carbono Zero)',
    fileName: 'Resolucao_CNJ_594_2024_Carbono_Zero.pdf',
    fileType: 'NORMATIVO',
    status: 'PROCESSADO',
    extractionConfidence: 100,
    fileSize: '2.8 MB',
    uploadedAt: '2024-11-20T10:00:00Z',
    validatedAt: '2024-11-20T10:00:00Z',
    validatedBy: 'usr-2',
    ocrConfidence: 100,
    rawTextSnippet: 'RESOLUÇÃO Nº 594, DE 05 DE NOVEMBRO DE 2024. Institui o Programa Justiça Carbono Zero e altera a Resolução CNJ nº 400/2021 para estabelecer diretrizes de neutralidade climática no Judiciário.'
  },
  {
    id: 'doc-recibo-catadores-08-2026',
    organizationId: 'org-sjrr',
    title: 'Manifesto e Recibo Coleta Seletiva Cidadã - Terra Viva 08/2026',
    fileName: 'Recibo_Catadores_Terra_Viva_08_2026.pdf',
    fileType: 'RELATORIO',
    competence: '2026-08',
    indicatorId: 'indicator-8-1',
    processNumber: '0000312-55.2026.4.01.8012',
    supplier: 'Associação de Catadores Terra Viva de Boa Vista/RR',
    amount: 0,
    consumption: 420,
    unit: 'kg',
    status: 'PROCESSADO',
    extractionConfidence: 99,
    fileSize: '510 KB',
    uploadedAt: '2026-09-02T16:00:00Z',
    validatedAt: '2026-09-03T11:00:00Z',
    validatedBy: 'usr-1',
    ocrConfidence: 99,
    rawTextSnippet: 'MANIFESTO DE TRANSPORTE DE RESÍDUOS RECICLÁVEIS - Doação autorizada nos termos do Decreto 5.940/2006. Papelão: 260kg, Plásticos limpos: 110kg, Alumínio: 50kg. Total: 420kg.'
  }
];

export const INITIAL_ACTION_PLANS: ActionPlan[] = [
  {
    id: 'act-01',
    organizationId: 'org-sjrr',
    year: 2026,
    title: 'Modernização e Retrofit do Sistema de Climatização (Chillers)',
    description: 'Substituição das condensadoras antigas por equipamentos com tecnologia Inverter de alta eficiência e automação predial horária.',
    responsibleUnit: 'Seção de Infraestrutura Predial (SEINFRA)',
    responsibleUser: 'Eng. Carlos Mendonça',
    startDate: '2026-02-01',
    endDate: '2026-10-31',
    status: 'EM_ANDAMENTO',
    percentageComplete: 65,
    priority: 'CRITICA',
    relatedIndicatorIds: ['indicator-6-1', 'indicator-6-2', 'indicator-20-4'],
    expectedImpact: 'Redução estimada de 8% a 12% no consumo mensal de energia elétrica a partir da entrega em outubro/2026.',
    evidenceNotes: 'Processo SEI 0000912-14.2026.4.01.8012. Ordem de serviço expedida. Equipamentos recebidos na sede em 15/07/2026.',
    eixoTematico: 'Energia Elétrica e Climatização',
    normativeReference: 'Resolução CNJ nº 400/2021, Art. 12',
    statusHistory: [
      { date: '2026-02-01', note: 'Início da licitação de engenharia.', status: 'NAO_INICIADA' },
      { date: '2026-05-10', note: 'Contrato assinado com a vencedora.', status: 'EM_ANDAMENTO' },
      { date: '2026-08-15', note: 'Instalação das primeiras 4 condensadoras iniciada.', status: 'EM_ANDAMENTO' }
    ]
  },
  {
    id: 'act-02',
    organizationId: 'org-sjrr',
    year: 2026,
    title: 'Campanha "Adote sua Caneca": Descarte Zero de Copos e Garrafas Plásticas',
    description: 'Distribuição de canecas e garrafas térmicas institucionais e eliminação definitiva de copos descartáveis e garrafas plásticas individuais.',
    responsibleUnit: 'Comissão Gestora do PLS / SEMAT',
    responsibleUser: 'Dr. Roberto Magalhães',
    startDate: '2026-01-10',
    endDate: '2026-03-31',
    status: 'CONCLUIDA',
    percentageComplete: 100,
    priority: 'MEDIA',
    relatedIndicatorIds: ['indicator-3-1', 'indicator-3-2', 'indicator-4-1'],
    expectedImpact: 'Eliminação de 100% dos copos descartáveis de plástico no âmbito predial da Seção Judiciária (Meta Zero).',
    evidenceNotes: 'Portaria DIREF homologou o descarte zero. Nenhuma resma ou centena de copo adquirida em 2026.',
    eixoTematico: 'Descarte Zero e Consumo Consciente',
    normativeReference: 'Resolução CNJ nº 400/2021, Art. 11 (Veda fornecimento de descartáveis plásticos)',
    inconsistencyNote: 'Norma atual impõe vedação absoluta; meta ajustada para zero.',
    statusHistory: [
      { date: '2026-01-10', note: 'Distribuição dos kits de canecas térmicas.', status: 'EM_ANDAMENTO' },
      { date: '2026-03-31', note: 'Retirada total dos dispensers e conclusão da campanha.', status: 'CONCLUIDA' }
    ]
  },
  {
    id: 'act-03',
    organizationId: 'org-sjrr',
    year: 2026,
    title: 'Instalação de Arejadores e Válvulas Hidráulicas Economizadoras',
    description: 'Substituição de 92% das torneiras manuais por acionamento hidromecânico temporizado e bacias com duplo acionamento.',
    responsibleUnit: 'Seção de Infraestrutura Predial',
    responsibleUser: 'Eng. Carlos Mendonça',
    startDate: '2026-03-01',
    endDate: '2026-08-30',
    status: 'CONCLUIDA',
    percentageComplete: 100,
    priority: 'ALTA',
    relatedIndicatorIds: ['indicator-7-1', 'indicator-7-2', 'indicator-7-4'],
    expectedImpact: 'Redução sustentada do consumo de água potável em cerca de 15% a 20% no prédio-sede.',
    evidenceNotes: 'Processo SEI 0000412-88.2026.4.01.8012. Concluído com atesto favorável em 28/08/2026.',
    eixoTematico: 'Água e Saneamento Sustentável',
    normativeReference: 'Resolução CNJ nº 400/2021 e Resolução CNJ nº 550/2024',
    statusHistory: [
      { date: '2026-03-01', note: 'Início da troca nos banheiros públicos do térreo.', status: 'EM_ANDAMENTO' },
      { date: '2026-08-28', note: 'Conclusão e vistoria final da SEINFRA.', status: 'CONCLUIDA' }
    ]
  },
  {
    id: 'act-04',
    organizationId: 'org-sjrr',
    year: 2026,
    title: 'Migração Integral para Telefonia IP (VoIP Teams) e Rescisão Troncos E1',
    description: 'Conclusão da portabilidade dos ramais para nuvem e cancelamento do contrato legado STFC com a concessionária Oi.',
    responsibleUnit: 'Núcleo de Tecnologia da Informação (NUTEC)',
    responsibleUser: 'Dra. Vanessa Cavalcante',
    startDate: '2026-01-15',
    endDate: '2026-06-30',
    status: 'ATRASADA',
    percentageComplete: 45,
    priority: 'ALTA',
    relatedIndicatorIds: ['indicator-12-1', 'indicator-12-3'],
    expectedImpact: 'Economia direta recorrente de R$ 1.200,00 por mês em tarifas de troncos fixos analógicos.',
    evidenceNotes: 'Processo SEI 0000789-22.2026.4.01.8012. Notificação extrajudicial enviada à operadora em 12/08/2026.',
    eixoTematico: 'Telecomunicações e TI Verde',
    normativeReference: 'Resolução CNJ nº 400/2021, Tema 12',
    statusHistory: [
      { date: '2026-01-15', note: 'Início da configuração do Teams Telephony.', status: 'EM_ANDAMENTO' },
      { date: '2026-06-30', note: 'Prazo expirado com pendência de portabilidade da Oi.', status: 'ATRASADA' }
    ]
  },
  {
    id: 'act-05',
    organizationId: 'org-sjrr',
    year: 2026,
    title: 'Desmaterialização de Processos Administrativos e Cotas de Impressão',
    description: 'Migração de 100% dos formulários de RH e almoxarifado para o SEI e fixação de cotas no software SafeQ.',
    responsibleUnit: 'Secretaria Administrativa / Almoxarifado',
    responsibleUser: 'Dr. Roberto Magalhães',
    startDate: '2026-02-01',
    endDate: '2026-11-30',
    status: 'EM_ANDAMENTO',
    percentageComplete: 75,
    priority: 'MEDIA',
    relatedIndicatorIds: ['indicator-2-1', 'indicator-5-1', 'indicator-5-3', 'indicator-21-1'],
    expectedImpact: 'Redução contínua de 15% nas resmas de papel A4 e 12% no volume faturado de outsourcing de impressão.',
    evidenceNotes: 'Processo SEI 0000623-10.2026.4.01.8012. Novas cotas ativas desde abril.',
    eixoTematico: 'Desmaterialização e Impressão',
    normativeReference: 'Resolução CNJ nº 400/2021 e Resolução CNJ nº 550/2024',
    statusHistory: [
      { date: '2026-02-01', note: 'Publicação da portaria de cotas.', status: 'EM_ANDAMENTO' }
    ]
  },
  {
    id: 'act-06',
    organizationId: 'org-sjrr',
    year: 2026,
    title: 'Fortalecimento da Coleta Seletiva Solidária e Triagem In Loco',
    description: 'Ampliação dos pontos de entrega voluntária (PEVs) e capacitação dos colaboradores da limpeza para separação gravimétrica de resíduos.',
    responsibleUnit: 'Comissão Gestora do PLS',
    responsibleUser: 'Dr. Roberto Magalhães',
    startDate: '2026-03-01',
    endDate: '2026-12-15',
    status: 'EM_ANDAMENTO',
    percentageComplete: 70,
    priority: 'MEDIA',
    relatedIndicatorIds: ['indicator-8-1', 'indicator-8-6'],
    expectedImpact: 'Incremento de 15% no peso total de recicláveis entregues à Associação Terra Viva em Boa Vista/RR.',
    evidenceNotes: 'Processo SEI 0000312-55.2026.4.01.8012. Doação formalizada nos termos do Decreto 10.936/2022.',
    eixoTematico: 'Gestão de Resíduos Sólidos',
    normativeReference: 'Resolução CNJ nº 400/2021 e Decreto Federal nº 10.936/2022',
    statusHistory: [
      { date: '2026-03-01', note: 'Instalação das novas lixeiras de coleta seletiva.', status: 'EM_ANDAMENTO' }
    ]
  },
  {
    id: 'act-07',
    organizationId: 'org-sjrr',
    year: 2026,
    title: 'Adequação dos Editais de Licitação à Nova Lei nº 14.133/2021 e Guia CNJ',
    description: 'Revisão dos modelos de Termos de Referência (TR) e Estudos Técnicos Preliminares (ETP), inserindo cláusulas compulsórias de sustentabilidade socioambiental no Plano de Contratações Anual (PCA).',
    responsibleUnit: 'Núcleo de Compras e Contratos (NUCAP)',
    responsibleUser: 'Dra. Beatriz Albuquerque',
    startDate: '2026-01-15',
    endDate: '2026-11-30',
    status: 'EM_ANDAMENTO',
    percentageComplete: 80,
    priority: 'ALTA',
    relatedIndicatorIds: ['indicator-16-1', 'indicator-16-2', 'indicator-16-3'],
    expectedImpact: 'Atingimento de 75% dos editais com critérios de sustentabilidade homologados pelo NUCAP.',
    evidenceNotes: 'Processo SEI 0001089-40.2026.4.01.8012. Caderno de cláusulas verdes instituído.',
    eixoTematico: 'Contratações Públicas Sustentáveis',
    normativeReference: 'Lei Federal nº 14.133/2021 (Art. 5º e 11, IV) e Guia CNJ de Contratações Sustentáveis',
    inconsistencyNote: 'Substituição formal das referências à antiga Lei 8.666/1993 pela Lei 14.133/2021.',
    statusHistory: [
      { date: '2026-01-15', note: 'Abertura do processo de revisão dos TRs.', status: 'EM_ANDAMENTO' },
      { date: '2026-06-20', note: 'Caderno de especificações verdes aprovado pela DIREF.', status: 'EM_ANDAMENTO' }
    ]
  },
  {
    id: 'act-08',
    organizationId: 'org-sjrr',
    year: 2026,
    title: 'Implantação do Programa Justiça Carbono Zero (Resolução CNJ nº 594/2024)',
    description: 'Elaboração do Inventário Anual de Emissões de GEE (Escopos 1, 2 e 3), plano de descarbonização da SJRR e contratação de compensação residual via créditos de preservação florestal na Amazônia.',
    responsibleUnit: 'Comissão Gestora do PLS / Gestão Socioambiental',
    responsibleUser: 'Dr. Roberto Magalhães',
    startDate: '2026-01-10',
    endDate: '2026-12-31',
    status: 'EM_ANDAMENTO',
    percentageComplete: 75,
    priority: 'CRITICA',
    relatedIndicatorIds: ['indicator-20-1', 'indicator-20-2', 'indicator-20-3', 'indicator-20-4', 'indicator-20-5', 'indicator-20-6'],
    expectedImpact: 'Redução de 13,8% nas emissões anuais (meta de 102,0 tCO2e) e compensação de 25 tCO2e de emissões residuais.',
    evidenceNotes: 'Processo SEI 0001402-12.2026.4.01.8012. Calculadora GHG Protocol parametrizada para os fatores do sistema isolado de Roraima.',
    eixoTematico: 'Descarbonização e Clima',
    normativeReference: 'Resolução CNJ nº 594/2024 (Programa Justiça Carbono Zero)',
    inconsistencyNote: 'O PLS original de 2021 não previa o programa compulsório do CNJ; incorporação estruturada em 2026.',
    statusHistory: [
      { date: '2026-01-10', note: 'Instituição do Grupo Técnico de Descarbonização.', status: 'EM_ANDAMENTO' },
      { date: '2026-05-30', note: 'Conclusão do inventário base de 2025 (118,4 tCO2e).', status: 'EM_ANDAMENTO' }
    ]
  },
  {
    id: 'act-09',
    organizationId: 'org-sjrr',
    year: 2026,
    title: 'Otimização de Roteiros da Frota Oficial e Mandados Jurisdicionais',
    description: 'Roteirização integrada dos mandados cumpridos pelos Oficiais de Justiça, uso prioritário de etanol/biocombustível nos veículos flex e expansão de audiências virtuais.',
    responsibleUnit: 'Central de Mandados / Seção de Transporte',
    responsibleUser: 'Eng. Carlos Mendonça',
    startDate: '2026-02-01',
    endDate: '2026-11-30',
    status: 'EM_ANDAMENTO',
    percentageComplete: 85,
    priority: 'MEDIA',
    relatedIndicatorIds: ['indicator-13-1', 'indicator-14-1', 'indicator-14-5'],
    expectedImpact: 'Redução de 8,8% na quilometragem rodada e 7,8% no consumo anual de gasolina da frota oficial.',
    evidenceNotes: 'Processo SEI 0000554-19.2026.4.01.8012. Sistema de telemetria e roteirização implantado.',
    eixoTematico: 'Transporte e Frota Sustentável',
    normativeReference: 'Resolução CNJ nº 400/2021, Tema 13 e 14',
    statusHistory: [
      { date: '2026-02-01', note: 'Parametrização do mapa de zoneamento de Boa Vista.', status: 'EM_ANDAMENTO' }
    ]
  },
  {
    id: 'act-10',
    organizationId: 'org-sjrr',
    year: 2026,
    title: 'Logística Reversa de Eletroeletrônicos e Lâmpadas com Emissão de CDF',
    description: 'Desfazimento de equipamentos de TI obsoletos e lâmpadas fluorescentes através de entidade gestora certificada, com Certificado de Destinação Final (CDF).',
    responsibleUnit: 'Seção de Material e Patrimônio (SEMAT) / NUTEC',
    responsibleUser: 'Dra. Vanessa Cavalcante',
    startDate: '2026-03-01',
    endDate: '2026-10-31',
    status: 'EM_ANDAMENTO',
    percentageComplete: 90,
    priority: 'ALTA',
    relatedIndicatorIds: ['indicator-8-5'],
    expectedImpact: 'Garantia de 100% de destinação ambientalmente adequada com rastreabilidade integral.',
    evidenceNotes: 'Processo SEI 0000831-77.2026.4.01.8012. Acordo com a entidade Green Eletron.',
    eixoTematico: 'Gestão de Resíduos Perigosos',
    normativeReference: 'Resolução CNJ nº 550/2024 e Lei nº 12.305/2010 (PNRS)',
    inconsistencyNote: 'Norma atual exige certificação formal de destinação final (CDF).',
    statusHistory: [
      { date: '2026-03-01', note: 'Inventário dos lotes para desfazimento.', status: 'EM_ANDAMENTO' },
      { date: '2026-07-15', note: 'Coleta do primeiro lote de computadores obsoletos.', status: 'EM_ANDAMENTO' }
    ]
  },
  {
    id: 'act-11',
    organizationId: 'org-sjrr',
    year: 2026,
    title: 'Capacitação Contínua em Sustentabilidade e Compras Públicas Verdes',
    description: 'Realização de oficinas e cursos EAD sobre os ODS da Agenda 2030 da ONU, contratações sustentáveis na Lei 14.133/2021 e sensibilização socioambiental.',
    responsibleUnit: 'Seção de Desenvolvimento e Avaliação de Pessoas (SELEP)',
    responsibleUser: 'Dr. Roberto Magalhães',
    startDate: '2026-02-15',
    endDate: '2026-11-30',
    status: 'EM_ANDAMENTO',
    percentageComplete: 60,
    priority: 'MEDIA',
    relatedIndicatorIds: ['indicator-18-1', 'indicator-18-2', 'indicator-18-3'],
    expectedImpact: 'Capacitar pelo menos 35% do quadro de magistrados e servidores em temáticas socioambientais.',
    evidenceNotes: 'Processo SEI 0000678-90.2026.4.01.8012. 3 eventos realizados no 1º semestre.',
    eixoTematico: 'Capacitação e Educação Socioambiental',
    normativeReference: 'Resolução CNJ nº 400/2021, Tema 18',
    statusHistory: [
      { date: '2026-02-15', note: 'Início do cronograma anual de cursos.', status: 'EM_ANDAMENTO' }
    ]
  },
  {
    id: 'act-12',
    organizationId: 'org-sjrr',
    year: 2026,
    title: 'Programa de Qualidade de Vida no Trabalho (QVT) e Saúde Mental',
    description: 'Ações de ergonomia presencial e no teletrabalho, programas de acolhimento psicossocial, campanhas de vacinação e ginástica laboral preventiva.',
    responsibleUnit: 'Núcleo de Saúde e Bem-Estar (NUSAU)',
    responsibleUser: 'Dr. Roberto Magalhães',
    startDate: '2026-01-15',
    endDate: '2026-12-15',
    status: 'EM_ANDAMENTO',
    percentageComplete: 80,
    priority: 'MEDIA',
    relatedIndicatorIds: ['indicator-17-1', 'indicator-17-2', 'indicator-17-3'],
    expectedImpact: 'Alcançar 45% de servidores e magistrados engajados nas atividades de bem-estar.',
    evidenceNotes: 'Processo SEI 0000215-63.2026.4.01.8012. Avaliações ergonômicas de postos concluídas.',
    eixoTematico: 'Qualidade de Vida e Gestão de Pessoas',
    normativeReference: 'Resolução CNJ nº 400/2021, Tema 17',
    statusHistory: [
      { date: '2026-01-15', note: 'Início da Semana de Saúde Mental.', status: 'EM_ANDAMENTO' }
    ]
  },
  {
    id: 'act-13',
    organizationId: 'org-sjrr',
    year: 2026,
    title: 'Ações Afirmativas de Equidade, Diversidade e Acessibilidade Predial',
    description: 'Monitoramento da representatividade feminina e de pessoas negras em cargos de liderança e adequação de acessibilidade predial conforme NBR 9050 na sede da SJRR.',
    responsibleUnit: 'Comitê de Equidade, Diversidade e Acessibilidade SJRR',
    responsibleUser: 'Dra. Beatriz Albuquerque',
    startDate: '2026-02-01',
    endDate: '2026-12-15',
    status: 'EM_ANDAMENTO',
    percentageComplete: 70,
    priority: 'ALTA',
    relatedIndicatorIds: ['indicator-19-1', 'indicator-19-2', 'indicator-19-5'],
    expectedImpact: 'Paridade de gênero e representatividade afirmativa nos comitês decisórios e adequação física das rotas acessíveis.',
    evidenceNotes: 'Portaria SJRR/DIREF instituiu o Comitê Permanente de Equidade.',
    eixoTematico: 'Equidade e Direitos Humanos',
    normativeReference: 'Resoluções CNJ nº 497/2023, 525/2023 e 540/2024',
    inconsistencyNote: 'O plano original de 2021 não continha metas de equidade e gênero alinhadas aos normativos CNJ recentes.',
    statusHistory: [
      { date: '2026-02-01', note: 'Reunião inaugural do comitê.', status: 'EM_ANDAMENTO' }
    ]
  },
  {
    id: 'act-14',
    organizationId: 'org-sjrr',
    year: 2026,
    title: 'Automação Documental com IA e Redução de Despesas de Custeio (RDC)',
    description: 'Adoção de inteligência artificial para leitura e conciliação de faturas de concessionárias (E-Extrator iPLS) e automação de fluxos no SEI, mensurando a economia de despesas correntes.',
    responsibleUnit: 'Núcleo de Tecnologia da Informação (NUTEC)',
    responsibleUser: 'Dra. Vanessa Cavalcante',
    startDate: '2026-01-10',
    endDate: '2026-12-31',
    status: 'EM_ANDAMENTO',
    percentageComplete: 75,
    priority: 'ALTA',
    relatedIndicatorIds: ['indicator-21-1', 'indicator-21-2'],
    expectedImpact: 'Economia anual líquida comprovada de R$ 180.000,00 em despesas de custeio administrativo e ganho de produtividade.',
    evidenceNotes: 'Processo SEI 0001332-90.2026.4.01.8012. Módulo de IA em operação no iPLS.',
    eixoTematico: 'Inovação e Novas Tecnologias',
    normativeReference: 'Resolução CNJ nº 641/2025 (Novas Tecnologias e Inovação)',
    inconsistencyNote: 'Norma de 2025 introduziu o indicador RDC; sistema iPLS totalmente adaptado.',
    statusHistory: [
      { date: '2026-01-10', note: 'Início do piloto de leitura inteligente de faturas.', status: 'EM_ANDAMENTO' },
      { date: '2026-06-30', note: 'Relatório semestral de economia atestou R$ 90.000 economizados.', status: 'EM_ANDAMENTO' }
    ]
  }
];

export const INITIAL_EMISSION_SOURCES: EmissionSource[] = [
  {
    id: 'src-01',
    scope: 1,
    name: 'Frota Oficial - Gasolina e Etanol',
    category: 'Combustão Móvel',
    activityUnit: 'litros',
    emissionFactor: 2.27,
    factorSource: 'MCTI / GHG Protocol Brasil',
    factorYear: 2026
  },
  {
    id: 'src-02',
    scope: 1,
    name: 'Frota Oficial - Diesel S10',
    category: 'Combustão Móvel',
    activityUnit: 'litros',
    emissionFactor: 2.68,
    factorSource: 'MCTI / GHG Protocol Brasil',
    factorYear: 2026
  },
  {
    id: 'src-03',
    scope: 1,
    name: 'Grupo Moto-Gerador de Emergência',
    category: 'Combustão Estacionária',
    activityUnit: 'litros',
    emissionFactor: 2.68,
    factorSource: 'GHG Protocol Brasil',
    factorYear: 2026
  },
  {
    id: 'src-04',
    scope: 2,
    name: 'Consumo de Energia Elétrica da Rede',
    category: 'Eletricidade Adquirida (Rede Conectada)',
    activityUnit: 'kWh',
    emissionFactor: 0.38,
    factorSource: 'Fator de Emissão Médio do Sistema Isolado RR (MCTI)',
    factorYear: 2026
  },
  {
    id: 'src-05',
    scope: 3,
    name: 'Viagens Aéreas a Serviço',
    category: 'Deslocamentos a Serviço',
    activityUnit: 'passageiro-km (pkm)',
    emissionFactor: 0.155,
    factorSource: 'ICAO Carbon Emissions Calculator / GHG Protocol',
    factorYear: 2026
  },
  {
    id: 'src-06',
    scope: 3,
    name: 'Destinação de Resíduos em Aterro',
    category: 'Tratamento de Resíduos Sólidos',
    activityUnit: 'kg',
    emissionFactor: 0.58,
    factorSource: 'IPCC Guidelines',
    factorYear: 2026
  }
];

export const INITIAL_GHG_CALCULATIONS: GHGCalculation[] = [
  // 2025 Baseline
  {
    id: 'calc-2025-01',
    organizationId: 'org-sjrr',
    year: 2025,
    sourceId: 'src-01',
    sourceName: 'Frota Oficial - Gasolina e Etanol',
    scope: 1,
    activityData: 8850,
    activityUnit: 'litros',
    emissionFactor: 2.27,
    factorSource: 'MCTI / GHG Protocol Brasil',
    calculatedCO2eTons: 20.09
  },
  {
    id: 'calc-2025-02',
    organizationId: 'org-sjrr',
    year: 2025,
    sourceId: 'src-02',
    sourceName: 'Frota Oficial - Diesel S10',
    scope: 1,
    activityData: 3950,
    activityUnit: 'litros',
    emissionFactor: 2.68,
    factorSource: 'MCTI / GHG Protocol Brasil',
    calculatedCO2eTons: 10.59
  },
  {
    id: 'calc-2025-03',
    organizationId: 'org-sjrr',
    year: 2025,
    sourceId: 'src-03',
    sourceName: 'Grupo Moto-Gerador de Emergência',
    scope: 1,
    activityData: 1310,
    activityUnit: 'litros',
    emissionFactor: 2.68,
    factorSource: 'GHG Protocol Brasil',
    calculatedCO2eTons: 3.51
  },
  {
    id: 'calc-2025-04',
    organizationId: 'org-sjrr',
    year: 2025,
    sourceId: 'src-04',
    sourceName: 'Consumo de Energia Elétrica da Rede',
    scope: 2,
    activityData: 164474,
    activityUnit: 'kWh',
    emissionFactor: 0.38,
    factorSource: 'MCTI / Fator Médio SIN-Isolado',
    calculatedCO2eTons: 62.50
  },
  {
    id: 'calc-2025-05',
    organizationId: 'org-sjrr',
    year: 2025,
    sourceId: 'src-05',
    sourceName: 'Viagens Aéreas a Serviço',
    scope: 3,
    activityData: 80000,
    activityUnit: 'passageiro-km (pkm)',
    emissionFactor: 0.155,
    factorSource: 'ICAO Carbon Emissions Calculator',
    calculatedCO2eTons: 12.40
  },
  {
    id: 'calc-2025-06',
    organizationId: 'org-sjrr',
    year: 2025,
    sourceId: 'src-06',
    sourceName: 'Destinação de Resíduos em Aterro',
    scope: 3,
    activityData: 16034,
    activityUnit: 'kg',
    emissionFactor: 0.58,
    factorSource: 'IPCC Guidelines',
    calculatedCO2eTons: 9.30
  },

  // 2026 Exercício Atual
  {
    id: 'calc-2026-01',
    organizationId: 'org-sjrr',
    year: 2026,
    sourceId: 'src-01',
    sourceName: 'Frota Oficial - Gasolina e Etanol',
    scope: 1,
    activityData: 7800,
    activityUnit: 'litros',
    emissionFactor: 2.27,
    factorSource: 'MCTI / GHG Protocol Brasil',
    calculatedCO2eTons: 17.71
  },
  {
    id: 'calc-2026-02',
    organizationId: 'org-sjrr',
    year: 2026,
    sourceId: 'src-02',
    sourceName: 'Frota Oficial - Diesel S10',
    scope: 1,
    activityData: 3500,
    activityUnit: 'litros',
    emissionFactor: 2.68,
    factorSource: 'MCTI / GHG Protocol Brasil',
    calculatedCO2eTons: 9.38
  },
  {
    id: 'calc-2026-03',
    organizationId: 'org-sjrr',
    year: 2026,
    sourceId: 'src-03',
    sourceName: 'Grupo Moto-Gerador de Emergência',
    scope: 1,
    activityData: 1085,
    activityUnit: 'litros',
    emissionFactor: 2.68,
    factorSource: 'GHG Protocol Brasil',
    calculatedCO2eTons: 2.91
  },
  {
    id: 'calc-2026-04',
    organizationId: 'org-sjrr',
    year: 2026,
    sourceId: 'src-04',
    sourceName: 'Consumo de Energia Elétrica da Rede',
    scope: 2,
    activityData: 142105,
    activityUnit: 'kWh',
    emissionFactor: 0.38,
    factorSource: 'MCTI / Fator Médio SIN-Isolado',
    calculatedCO2eTons: 54.00
  },
  {
    id: 'calc-2026-05',
    organizationId: 'org-sjrr',
    year: 2026,
    sourceId: 'src-05',
    sourceName: 'Viagens Aéreas a Serviço',
    scope: 3,
    activityData: 64516,
    activityUnit: 'passageiro-km (pkm)',
    emissionFactor: 0.155,
    factorSource: 'ICAO Carbon Emissions Calculator',
    calculatedCO2eTons: 10.00
  },
  {
    id: 'calc-2026-06',
    organizationId: 'org-sjrr',
    year: 2026,
    sourceId: 'src-06',
    sourceName: 'Destinação de Resíduos em Aterro',
    scope: 3,
    activityData: 13793,
    activityUnit: 'kg',
    emissionFactor: 0.58,
    factorSource: 'IPCC Guidelines',
    calculatedCO2eTons: 8.00
  }
];

export const INITIAL_PLS_JUD_MAPPINGS: PLSJudMapping[] = [
  {
    id: 'map-01',
    indicatorId: 'indicator-6-1',
    indicatorName: '6.1 — Consumo de Energia Elétrica (CEE)',
    cnjCode: '6.1',
    cnjFieldName: 'CEE',
    unit: 'kWh',
    periodicity: 'Mensal',
    sendRule: 'Soma do consumo ativo faturado em todas as unidades consumidoras vinculadas à Seção',
    status: 'PREPARADO',
    lastTransmissionDate: '2026-08-10'
  },
  {
    id: 'map-02',
    indicatorId: 'indicator-7-1',
    indicatorName: '7.1 — Consumo de Água (CA)',
    cnjCode: '7.1',
    cnjFieldName: 'CA',
    unit: 'm³',
    periodicity: 'Mensal',
    sendRule: 'Consumo total de água medido por hidrômetros de rede pública',
    status: 'CONFIRMADO',
    lastTransmissionDate: '2026-08-10',
    receiptProtocol: 'PLS-JUD-2026-RR-00812'
  },
  {
    id: 'map-03',
    indicatorId: 'indicator-2-1',
    indicatorName: '2.1 — Consumo de Papel Próprio (CPP)',
    cnjCode: '2.1',
    cnjFieldName: 'CPP',
    unit: 'resmas',
    periodicity: 'Mensal',
    sendRule: 'Total de resmas de papel formato A4 (75g/m²) retiradas do almoxarifado',
    status: 'CONFIRMADO',
    lastTransmissionDate: '2026-08-10',
    receiptProtocol: 'PLS-JUD-2026-RR-00813'
  },
  {
    id: 'map-04',
    indicatorId: 'indicator-3-1',
    indicatorName: '3.1 — Consumo de Copos Descartáveis (CC)',
    cnjCode: '3.1',
    cnjFieldName: 'CC',
    unit: 'centenas',
    periodicity: 'Mensal',
    sendRule: 'Volume de copos descartáveis consumidos',
    status: 'CONFIRMADO',
    lastTransmissionDate: '2026-08-10',
    receiptProtocol: 'PLS-JUD-2026-RR-00814'
  },
  {
    id: 'map-05',
    indicatorId: 'indicator-12-1',
    indicatorName: '12.1 — Gasto com Telefonia Fixa (GTF)',
    cnjCode: '12.1',
    cnjFieldName: 'GTF',
    unit: 'R$',
    periodicity: 'Mensal',
    sendRule: 'Despesa bruta liquidada com o serviço telefônico fixo comutado',
    status: 'AGUARDANDO_VALIDACAO',
    lastTransmissionDate: '2026-07-15'
  },
  {
    id: 'map-06',
    indicatorId: 'indicator-8-6',
    indicatorName: '8.6 — Total de Materiais Destinados à Reciclagem (TMR)',
    cnjCode: '8.6',
    cnjFieldName: 'TMR',
    unit: 'kg',
    periodicity: 'Mensal',
    sendRule: 'Soma dos materiais recicláveis triados e doados a associações de catadores',
    status: 'CONFIRMADO',
    lastTransmissionDate: '2026-08-10',
    receiptProtocol: 'PLS-JUD-2026-RR-00815'
  },
  {
    id: 'map-07',
    indicatorId: 'indicator-14-1',
    indicatorName: '14.1 — Consumo de Gasolina (CG)',
    cnjCode: '14.1',
    cnjFieldName: 'CG',
    unit: 'litros',
    periodicity: 'Mensal',
    sendRule: 'Consumo de gasolina abastecida na frota oficial',
    status: 'CONFIRMADO',
    lastTransmissionDate: '2026-08-10',
    receiptProtocol: 'PLS-JUD-2026-RR-00816'
  }
];

export const INITIAL_SEI_CONNECTORS: SEIConnector[] = [
  {
    id: 'sei-conn-01',
    processNumber: '0001245-88.2026.4.01.8012',
    description: 'Gestão do Contrato de Fornecimento de Energia Elétrica - Sede SJRR',
    expectedDocumentType: 'FATURA',
    periodicity: 'MENSAL',
    indicatorId: 'indicator-6-1',
    indicatorName: '6.1 — Consumo de Energia Elétrica (CEE)',
    active: true,
    lastSyncDate: '2026-09-04T15:10:00Z',
    lastFoundDocNumber: 'Doc. SEI nº 1489201',
    status: 'SINCRONIZADO'
  },
  {
    id: 'sei-conn-02',
    processNumber: '0001246-73.2026.4.01.8012',
    description: 'Fornecimento de Água e Tratamento de Esgoto - CAER',
    expectedDocumentType: 'FATURA',
    periodicity: 'MENSAL',
    indicatorId: 'indicator-7-1',
    indicatorName: '7.1 — Consumo de Água (CA)',
    active: true,
    lastSyncDate: '2026-09-04T16:20:00Z',
    lastFoundDocNumber: 'Doc. SEI nº 1489312',
    status: 'SINCRONIZADO'
  },
  {
    id: 'sei-conn-03',
    processNumber: '0000789-22.2026.4.01.8012',
    description: 'Contrato de Serviços de Telecomunicações - Telefonia Fixa e Móvel',
    expectedDocumentType: 'FATURA',
    periodicity: 'MENSAL',
    indicatorId: 'indicator-12-1',
    indicatorName: '12.1 — Gasto com Telefonia Fixa (GTF)',
    active: true,
    lastSyncDate: '2026-09-08T16:40:00Z',
    lastFoundDocNumber: 'Doc. SEI nº 1492004',
    status: 'PENDENTE'
  },
  {
    id: 'sei-conn-04',
    processNumber: '0000312-55.2026.4.01.8012',
    description: 'Termo de Doação e Destinação de Resíduos Recicláveis à Associação Terra Viva',
    expectedDocumentType: 'RELATORIO',
    periodicity: 'MENSAL',
    indicatorId: 'indicator-8-1',
    indicatorName: '8.1 — Destinação de Resíduos de Papel (DPa)',
    active: true,
    lastSyncDate: '2026-09-03T11:00:00Z',
    lastFoundDocNumber: 'Doc. SEI nº 1488109',
    status: 'SINCRONIZADO'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit-01',
    organizationId: 'org-sjrr',
    userId: 'usr-3',
    userName: 'Eng. Carlos Mendonça',
    action: 'EXTRAÇÃO_OCR',
    timestamp: '2026-09-02T11:25:00Z',
    entityType: 'DOCUMENT',
    entityId: 'doc-energia-ago-2026',
    indicatorCode: '6.1',
    previousValue: undefined,
    newValue: 'Consumo: 21.450 kWh, Valor: R$ 19.840,65, Comp: 08/2026',
    reason: 'Extração automática via OCR de fatura emitida pela Roraima Energia S.A.',
    source: 'SEI - Processo 0001245-88.2026.4.01.8012'
  },
  {
    id: 'audit-02',
    organizationId: 'org-sjrr',
    userId: 'usr-1',
    userName: 'Dr. Roberto Magalhães',
    action: 'VALIDACAO',
    timestamp: '2026-09-04T15:10:00Z',
    entityType: 'MEASUREMENT',
    entityId: 'm-indicator-6-1-2026-8',
    indicatorCode: '6.1',
    previousValue: 'Status: PENDENTE',
    newValue: 'Status: VALIDADO (21.450 kWh)',
    reason: 'Validação confirmada após conferência do Atesto assinado pelo fiscal predial no SEI nº 1489201.',
    source: 'Módulo de Gestão Documental'
  },
  {
    id: 'audit-03',
    organizationId: 'org-sjrr',
    userId: 'usr-2',
    userName: 'Dra. Vanessa Cavalcante',
    action: 'ALTERACAO',
    timestamp: '2026-09-05T09:30:00Z',
    entityType: 'TARGET',
    entityId: 'target-3-1-2026',
    indicatorCode: '3.1',
    previousValue: 'Meta 2026: 6 centenas',
    newValue: 'Meta 2026: 0 centenas (Zero Descartável)',
    reason: 'Alinhamento compulsório à deliberação da Comissão de Sustentabilidade e Res. CNJ 400/2021.',
    source: 'Painel Administrativo'
  }
];

export const INITIAL_ALERTS: InconsistencyAlert[] = [
  {
    id: 'alert-01',
    indicatorId: 'indicator-6-1',
    indicatorName: '6.1 — Consumo de energia elétrica (CEE)',
    month: 8,
    year: 2026,
    type: 'SPIKE',
    severity: 'CRITICA',
    message: 'Consumo de energia de agosto (21.450 kWh) aumentou 46,9% em relação à média dos quatro meses anteriores (14.600 kWh).',
    detectedValue: 21450,
    referenceValue: 14600,
    suggestedAction: 'Verificar motivo do acionamento dos chillers de reserva na SEINFRA e auditar faturamento da concessionária.',
    createdAt: '2026-09-02T12:00:00Z',
    resolved: false
  },
  {
    id: 'alert-02',
    indicatorId: 'indicator-12-1',
    indicatorName: '12.1 — Gasto com telefonia fixa (GTF)',
    month: 8,
    year: 2026,
    type: 'UNVALIDATED_DOC',
    severity: 'ATENCAO',
    message: 'Fatura de telefonia de agosto (R$ 4.920,00) extraída com confiança baixa (82%) e sem atesto do fiscal no processo SEI 0000789-22.',
    detectedValue: 4920,
    referenceValue: 4200,
    suggestedAction: 'Exigir conferência manual dos troncos analógicos cobrados antes de autorizar o lançamento no PLS.',
    createdAt: '2026-09-08T17:00:00Z',
    resolved: false
  },
  {
    id: 'alert-03',
    indicatorId: 'indicator-12-1',
    indicatorName: '12.1 — Gasto com telefonia fixa (GTF)',
    month: 7,
    year: 2026,
    type: 'SPIKE',
    severity: 'ATENCAO',
    message: 'Gasto de telefonia de julho (R$ 4.850,00) 15,5% acima da meta mensal de R$ 4.200,00.',
    detectedValue: 4850,
    referenceValue: 4200,
    suggestedAction: 'Ação 04 do Plano de Ação (Migração VoIP) está ATRASADA. Necessário notificar operadora Oi.',
    createdAt: '2026-08-05T10:00:00Z',
    resolved: false
  }
];
