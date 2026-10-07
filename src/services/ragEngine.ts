import { RAGDocumentChunk, DocumentType } from '../types';

export const OFFICIAL_KNOWLEDGE_CHUNKS: RAGDocumentChunk[] = [
  // 1. Resolução CNJ nº 400/2021
  {
    id: 'chunk-cnj-400-art1',
    documentTitle: 'Resolução CNJ nº 400/2021 Compilada',
    documentType: 'NORMATIVO',
    organizationId: 'all',
    year: 2021,
    themeCode: 'GERAL',
    section: 'Art. 1º a 3º - Diretrizes Gerais',
    sourceReference: 'Resolução CNJ nº 400/2021, Art. 1º-3º',
    content: `Art. 1º Fica instituída a política de sustentabilidade do Poder Judiciário, com a finalidade de estabelecer diretrizes, metas e indicadores para a gestão estratégica socioambiental, logística sustentável e contratações públicas compartilhadas no âmbito dos tribunais e conselhos.
Art. 2º O Plano de Logística Sustentável (PLS) é instrumento vinculado ao planejamento estratégico do órgão, com vigência mínima de 5 (cinco) anos, contendo objetivos, metas, indicadores e plano de ação anual.
Art. 3º O PLS-Jud é o sistema informatizado mantido pelo CNJ para coleta, consolidação e monitoramento dos dados de logística sustentável de todos os órgãos do Poder Judiciário.`,
    metadata: { authority: 'CNJ', scope: 'Nacional' }
  },
  {
    id: 'chunk-cnj-400-art11',
    documentTitle: 'Resolução CNJ nº 400/2021 Compilada',
    documentType: 'NORMATIVO',
    organizationId: 'all',
    year: 2021,
    themeCode: 'COPOS',
    indicatorCode: '3.1',
    section: 'Art. 11 - Eliminação de Descartáveis',
    sourceReference: 'Resolução CNJ nº 400/2021, Art. 11, § 2º',
    content: `Art. 11. Os órgãos do Poder Judiciário deverão adotar medidas para redução contínua do consumo de materiais plásticos descartáveis.
§ 2º É vedada a aquisição de copos plásticos descartáveis para consumo de água ou café quando houver disponibilidade de canecas ou copos reutilizáveis individuais, devendo os órgãos atingir a eliminação total de copos plásticos descartáveis até o encerramento do primeiro ciclo do PLS.`,
    metadata: { authority: 'CNJ', priority: 'Alta' }
  },
  {
    id: 'chunk-cnj-400-art15',
    documentTitle: 'Resolução CNJ nº 400/2021 Compilada',
    documentType: 'NORMATIVO',
    organizationId: 'all',
    year: 2021,
    themeCode: 'ENERGIA',
    indicatorCode: '6.1',
    section: 'Art. 15 - Eficiência Energética',
    sourceReference: 'Resolução CNJ nº 400/2021, Art. 15',
    content: `Art. 15. As ações de eficiência energética do PLS deverão contemplar a modernização dos sistemas de climatização artificial, substituição progressiva do parque luminotécnico por tecnologia LED de baixo consumo, automação predial horária e, sempre que economicamente viável, a implantação de geração distribuída por fontes renováveis (solar fotovoltaica).`,
    metadata: { authority: 'CNJ', category: 'Energia' }
  },
  {
    id: 'chunk-cnj-400-relatorio',
    documentTitle: 'Resolução CNJ nº 400/2021 Compilada',
    documentType: 'NORMATIVO',
    organizationId: 'all',
    year: 2021,
    themeCode: 'RELATORIO',
    section: 'Art. 22 - Relatório Anual do PLS',
    sourceReference: 'Resolução CNJ nº 400/2021, Art. 22',
    content: `Art. 22. A Comissão Permanente de Sustentabilidade deverá elaborar anualmente, até o final do primeiro trimestre do exercício subsequente, o Relatório de Desempenho do PLS, contendo a avaliação do cumprimento das metas, a execução física e financeira do Plano de Ação, as justificativas para indicadores não alcançados e as recomendações de medidas corretivas.`,
    metadata: { authority: 'CNJ', duty: 'Anual' }
  },

  // 2. Resolução CNJ nº 594/2024 (Justiça Carbono Zero)
  {
    id: 'chunk-cnj-594-carbono',
    documentTitle: 'Resolução CNJ nº 594/2024 - Programa Justiça Carbono Zero',
    documentType: 'NORMATIVO',
    organizationId: 'all',
    year: 2024,
    themeCode: 'GEE',
    indicatorCode: '20.4',
    section: 'Art. 1º a 4º - Diretrizes de Descarbonização',
    sourceReference: 'Resolução CNJ nº 594/2024, Art. 1º-4º',
    content: `Art. 1º Fica instituído o Programa Justiça Carbono Zero no Poder Judiciário, com o objetivo de orientar a transição ecológica dos órgãos judiciários para a neutralidade climática.
Art. 2º Os tribunais e seções judiciárias deverão elaborar inventário anual de emissões de Gases de Efeito Estufa (GEE), contemplando obrigatoriamente os Escopos 1 (combustão móvel e estacionária da frota própria/geradores) e 2 (eletricidade adquirida da rede de distribuição), e progressivamente o Escopo 3 (deslocamento aéreo e terrestre a serviço, além de tratamento de resíduos).
Art. 3º O inventário deverá adotar os fatores de emissão oficiais divulgados pelo Programa Brasileiro GHG Protocol e pelo Ministério da Ciência, Tecnologia e Inovação (MCTI).`,
    metadata: { authority: 'CNJ', program: 'Justiça Carbono Zero' }
  },

  // 3. PLS SJRR 2021-2026
  {
    id: 'chunk-pls-sjrr-metodologia',
    documentTitle: 'Plano de Logística Sustentável da SJRR (2021-2026)',
    documentType: 'NORMATIVO',
    organizationId: 'org-sjrr',
    year: 2026,
    themeCode: 'METODOLOGIA',
    section: 'Capítulo 2 - Metodologia de Cálculo e Linha de Base',
    sourceReference: 'PLS SJRR 2021-2026, Cap. 2, p. 14-16',
    content: `A Seção Judiciária de Roraima (SJRR) fixou como linha de base (baseline) os consumos consolidados de 2025 para apuração das metas do exercício de 2026.
Para os indicadores de consumo predial (energia elétrica e água potável), a meta estabelecida para 2026 é de redução de 5,0% em relação ao exercício anterior.
A extração de dados ocorre mensalmente a partir das faturas atestadas nos processos SEI de fiscalização de contratos mantidos pela Seção de Infraestrutura Predial (SEINFRA).`,
    metadata: { org: 'SJRR', cycle: '2021-2026' }
  },

  // 4. Plano de Ação 2026 SJRR
  {
    id: 'chunk-acao-01-chillers',
    documentTitle: 'Plano de Ação Anual 2026 da SJRR',
    documentType: 'RELATORIO',
    organizationId: 'org-sjrr',
    year: 2026,
    themeCode: 'ENERGIA',
    indicatorCode: '6.1',
    section: 'Ação 01 - Retrofit dos Chillers da Sede',
    sourceReference: 'Plano de Ação SJRR 2026, Ação 01, Processo SEI 0000912-14.2026.4.01.8012',
    content: `Ação 01: Modernização e Retrofit do Sistema de Climatização da Sede da SJRR.
Objetivo: Substituição de chillers e condensadoras com tecnologia antiga por unidades Inverter automatizadas.
Responsável: Seção de Infraestrutura Predial (SEINFRA) - Eng. Carlos Mendonça.
Status: Em andamento (65% executada).
Impacto esperado: Redução prevista de 8% a 12% no consumo faturado a partir de outubro de 2026.
Observação de Campo: Em agosto de 2026 houve pane no compressor do chiller primário, exigindo o funcionamento ininterrupto de chillers de reserva que ocasionaram aumento atípico temporário no faturamento.`,
    metadata: { org: 'SJRR', status: 'EM_ANDAMENTO' }
  },
  {
    id: 'chunk-acao-04-telefonia',
    documentTitle: 'Plano de Ação Anual 2026 da SJRR',
    documentType: 'RELATORIO',
    organizationId: 'org-sjrr',
    year: 2026,
    themeCode: 'TELEFONIA',
    indicatorCode: '12.1',
    section: 'Ação 04 - Migração VoIP e Rescisão Troncos Oi',
    sourceReference: 'Plano de Ação SJRR 2026, Ação 04, Processo SEI 0000789-22.2026.4.01.8012',
    content: `Ação 04: Migração Integral para Telefonia IP (VoIP Teams) e Cancelamento de Troncos E1 STFC da Oi.
Objetivo: Eliminação de cobranças de ramais físicos fixos e redução de custos contratuais em R$ 1.200,00/mês.
Responsável: Núcleo de Tecnologia da Informação (NUTEC) - Dra. Vanessa Cavalcante.
Status: ATRASADA (40% de execução). O prazo previsto de conclusão era 30/06/2026.
Causa do Atraso: A concessionária Oi S.A. atrasou a conclusão da portabilidade dos blocos de números DID públicos da SJRR, gerando faturamento de troncos analógicos residuais nas competências de julho e agosto de 2026.`,
    metadata: { org: 'SJRR', status: 'ATRASADA' }
  },

  // 5. Documentos SEI e Faturas Extraídas
  {
    id: 'chunk-doc-fatura-energia-ago-2026',
    documentTitle: 'Fatura Roraima Energia - Competência 08/2026',
    documentType: 'FATURA',
    organizationId: 'org-sjrr',
    year: 2026,
    themeCode: 'ENERGIA',
    indicatorCode: '6.1',
    section: 'Demonstrativo de Consumo e Faturamento',
    sourceReference: 'Fatura nº 9812401 / Processo SEI 0001245-88.2026.4.01.8012, Doc. SEI nº 1489201',
    content: `Fatura de Energia Elétrica - Concessionária: Roraima Energia S.A.
Unidade Consumidora: 7489210-4 (Edifício-Sede SJRR, Av. Brasil, 351, Boa Vista/RR).
Competência: 08/2026 (Período de Medição: 01/08/2026 a 31/08/2026).
Consumo Ativo Medido: 21.450 kWh.
Valor Faturado: R$ 19.840,65.
Atesto do Fiscal do Contrato (Doc. SEI 1489201): Emitido em 04/09/2026 pelo Eng. Carlos Mendonça com a seguinte ressalva técnica: "Consumo 46,9% superior à média móvel em virtude da falha no chiller nº 1 durante o período de estiagem e elevadas temperaturas em Boa Vista".`,
    metadata: { org: 'SJRR', verified: 'true', amount: 19840.65 }
  },
  {
    id: 'chunk-doc-fatura-telefonia-ago-2026',
    documentTitle: 'Fatura Telefônica Oi/Telemar - Competência 08/2026',
    documentType: 'FATURA',
    organizationId: 'org-sjrr',
    year: 2026,
    themeCode: 'TELEFONIA',
    indicatorCode: '12.1',
    section: 'Detalhamento dos Serviços de Telefonia Fixa',
    sourceReference: 'Processo SEI 0000789-22.2026.4.01.8012, Doc. SEI nº 1492004',
    content: `Fatura Telefônica Oi S.A. - Competência: 08/2026.
Valor Cobrado: R$ 4.920,00 (Meta mensal fixada no PLS: R$ 4.200,00).
Status no iPLS: PENDENTE DE VALIDAÇÃO (Extração com confiança de 82%).
O fiscal do contrato informou que contestou formalmente no processo SEI a cobrança de tarifa de manutenção de troncos que deveriam ter sido desativados em junho pela operadora.`,
    metadata: { org: 'SJRR', status: 'PENDENTE' }
  }
];

export interface SearchRAGOptions {
  organizationId?: string;
  year?: number;
  themeCode?: string;
  indicatorCode?: string;
  documentType?: DocumentType;
  query: string;
  limit?: number;
}

/**
 * Searches and retrieves the most relevant document chunks
 * using normalized lexical scoring + metadata filtering.
 */
export function queryRAGKnowledge(options: SearchRAGOptions): RAGDocumentChunk[] {
  const {
    organizationId,
    year,
    themeCode,
    indicatorCode,
    documentType,
    query,
    limit = 5
  } = options;

  const normalizedQuery = query.toLowerCase();
  const queryTerms = normalizedQuery.split(/\s+/).filter(t => t.length > 2);

  const scoredChunks = OFFICIAL_KNOWLEDGE_CHUNKS.filter(chunk => {
    // Multi-tenant check: if chunk belongs to a specific org and query specifies another org
    if (organizationId && chunk.organizationId !== 'all' && chunk.organizationId !== organizationId) {
      return false;
    }
    // Filter by year if requested and chunk has a specific year
    if (year && chunk.year && chunk.year !== year && chunk.organizationId !== 'all') {
      return false;
    }
    // Filter by document type
    if (documentType && chunk.documentType !== documentType) {
      return false;
    }
    // Filter by theme if requested
    if (themeCode && chunk.themeCode && chunk.themeCode !== 'GERAL' && chunk.themeCode !== themeCode) {
      return false;
    }
    // Filter by indicator if requested
    if (indicatorCode && chunk.indicatorCode && chunk.indicatorCode !== indicatorCode) {
      return false;
    }
    return true;
  }).map(chunk => {
    let score = 0;
    const contentLower = chunk.content.toLowerCase();
    const titleLower = chunk.documentTitle.toLowerCase();
    const sectionLower = chunk.section.toLowerCase();

    for (const term of queryTerms) {
      if (titleLower.includes(term)) score += 5;
      if (sectionLower.includes(term)) score += 4;
      if (contentLower.includes(term)) {
        // frequency
        const matches = (contentLower.match(new RegExp(term, 'g')) || []).length;
        score += matches * 2;
      }
    }

    return { chunk, score };
  });

  return scoredChunks
    .filter(item => item.score > 0 || queryTerms.length === 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.chunk);
}
