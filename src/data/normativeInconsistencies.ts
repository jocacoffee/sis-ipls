import { NormativeInconsistency } from '../types';

/**
 * Matriz Oficial de Diagnóstico de Inconsistências Normativas
 * Compara o texto original do PLS da SJRR (Ciclo 2021-2026) com a legislação vigente (2024-2026)
 * e documenta a adaptação e conformidade realizada no sistema iPLS.
 */
export const OFFICIAL_NORMATIVE_INCONSISTENCIES: NormativeInconsistency[] = [
  {
    id: 'inc-01',
    theme: 'Descarbonização e Mudanças Climáticas (Tema 20)',
    indicatorCode: '20.1 a 20.6',
    originalTextPLS: 'O PLS SJRR 2021-2026 original não previa metas de emissões de Gases de Efeito Estufa (GEE), Plano de Descarbonização nem inventários periódicos por escopo.',
    normativeConflict: 'A Resolução CNJ nº 594, de 05/11/2024, instituiu o Programa Justiça Carbono Zero, tornando compulsório o inventário anual de GEE (Escopos 1, 2 e 3) e o estabelecimento de plano de descarbonização com compensação residual.',
    lawOrResolution: 'Resolução CNJ nº 594/2024 (alterou a Res. CNJ 400/2021)',
    severity: 'CRITICA',
    systemAdjustment: 'Inclusão do Módulo Justiça Carbono Zero, cadastro de fatores de emissão locais de Roraima (MCTI e IPCC), meta anual de 102,0 tCO2e (-13,8%) e Ação 08 no Plano de Ação Socioambiental.',
    status: 'ATUALIZADO'
  },
  {
    id: 'inc-02',
    theme: 'Contratações Públicas Sustentáveis (Tema 16)',
    indicatorCode: '16.1 a 16.3',
    originalTextPLS: 'O Plano de Ação original fundamentava as aquisições na revogada Lei nº 8.666/1993 e Decreto nº 7.746/2012, com meta de sustentabilidade tímida e sem integração ao Plano de Contratações Anual (PCA).',
    normativeConflict: 'A Nova Lei de Licitações (Lei nº 14.133/2021, Art. 5º e Art. 11, inc. IV) tornou o Desenvolvimento Nacional Sustentável princípio e objetivo expresso da contratação, vinculando o PLS diretamente ao PCA.',
    lawOrResolution: 'Lei Federal nº 14.133/2021 e IN SEGES/ME nº 58/2022',
    severity: 'ALTA',
    systemAdjustment: 'Meta de contratações sustentáveis (PCS) elevada para 75% em 2026, inserção obrigatória de critérios nos ETPs (Estudos Técnicos Preliminares) e inclusão da Ação 07 no Plano de Ação.',
    status: 'ATUALIZADO'
  },
  {
    id: 'inc-03',
    theme: 'Copos e Embalagens Plásticas Descartáveis (Temas 3 e 4)',
    indicatorCode: '3.1 e 4.1',
    originalTextPLS: 'Previsão de metas de redução percentual linear de copos e garrafas plásticas ao longo do sexênio.',
    normativeConflict: 'O Art. 11 da Resolução CNJ nº 400/2021 veda o fornecimento de água mineral em embalagens plásticas descartáveis individuais e impõe a eliminação total de copos plásticos no Poder Judiciário.',
    lawOrResolution: 'Resolução CNJ nº 400/2021, Art. 11',
    severity: 'ALTA',
    systemAdjustment: 'Metas ajustadas no sistema para LIMITE_MAXIMO = 0 (Meta Zero Descartável), mantendo a política "Adote sua Caneca/Garrafa" e substituição por galões retornáveis de 20L e bebedouros centrais.',
    status: 'ATUALIZADO'
  },
  {
    id: 'inc-04',
    theme: 'Resíduos Eletroeletrônicos e Perigosos (Tema 8)',
    indicatorCode: '8.5',
    originalTextPLS: 'Menção genérica a descarte de bens obsoletos patrimoniais sem obrigatoriedade de Certificado de Destinação Final (CDF) ou logística reversa certificada.',
    normativeConflict: 'A Resolução CNJ nº 550/2024 e o Decreto nº 10.936/2022 exigem logística reversa formalizada para eletroeletrônicos e lâmpadas, com comprovação por CDF e rastreamento ambiental.',
    lawOrResolution: 'Resolução CNJ nº 550/2024 e Lei nº 12.305/2010 (PNRS)',
    severity: 'MEDIA',
    systemAdjustment: 'Inclusão da meta de 100% de destinação com CDF para o indicador 8.5 (DEE) e criação da Ação 10 específica para descarte de TI verde e lâmpadas.',
    status: 'ATUALIZADO'
  },
  {
    id: 'inc-05',
    theme: 'Metodologia e Fórmulas de Indicadores Per Capita (Temas 5, 6, 7 e 14)',
    indicatorCode: '5.3, 6.2, 7.2, 14.5',
    originalTextPLS: 'O plano de 2021 utilizava quadro de servidores ativos sem padronização exata da Força de Trabalho Total (FTT) e área predial m²Total.',
    normativeConflict: 'A Resolução CNJ nº 550/2024 uniformizou as definições de Força de Trabalho Total (FTT = Magistrados + Servidores Efetivos + Comissionados + Requisitados + Estagiários + Terceirizados residentes) e Área Predial.',
    lawOrResolution: 'Resolução CNJ nº 550/2024 (Revisão Metodológica PLS-Jud)',
    severity: 'MEDIA',
    systemAdjustment: 'Motor de cálculo (calculationEngine.ts) atualizado para aplicar FTT = 331 e m²Total = 14.500 m² nas derivações automáticas dos indicadores per capita e por metro quadrado.',
    status: 'CONFORME'
  },
  {
    id: 'inc-06',
    theme: 'Novas Tecnologias e Redução de Despesas de Custeio (Tema 21)',
    indicatorCode: '21.1 e 21.2',
    originalTextPLS: 'O PLS SJRR original de 2021 não mensurava financeiramente a Redução de Despesas de Custeio (RDC) decorrente de IA, automação e transformação digital.',
    normativeConflict: 'A Resolução CNJ nº 641/2025 incorporou o monitoramento de novas tecnologias e a economia líquida gerada no custeio operacional do órgão judicial.',
    lawOrResolution: 'Resolução CNJ nº 641/2025 (Novas Tecnologias e Inovação)',
    severity: 'MEDIA',
    systemAdjustment: 'Cadastro do indicador 21.2 com meta de R$ 180.000 de economia líquida anual gerada por IA, desmaterialização SEI e telefonia VoIP, além da Ação 14 no Plano de Ação.',
    status: 'ATUALIZADO'
  },
  {
    id: 'inc-07',
    theme: 'Equidade, Diversidade e Inclusão (Tema 19)',
    indicatorCode: '19.1 a 19.8',
    originalTextPLS: 'Previsões genéricas de capacitação sem indicadores de paridade de gênero e raça na ocupação de funções de liderança e comissões examinadoras.',
    normativeConflict: 'As Resoluções CNJ nº 497/2023, 525/2023 e 540/2024 estabeleceram diretrizes imperativas para ação afirmativa e paridade nos tribunais e seções judiciárias.',
    lawOrResolution: 'Resoluções CNJ nº 497/2023 e nº 525/2023',
    severity: 'ALTA',
    systemAdjustment: 'Inclusão da Ação 13 no Plano de Ação para monitoramento de cotas, paridade em funções de confiança e acessibilidade conforme NBR 9050 na sede da SJRR.',
    status: 'ATUALIZADO'
  }
];
