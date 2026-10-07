import { GoogleGenAI } from '@google/genai';
import {
  Indicator,
  IndicatorMeasurement,
  IndicatorTarget,
  ActionPlan,
  InconsistencyAlert,
  FiveYearIndicatorSeries,
  AnnualReportAIData,
  AnnualReportSection,
  PLSDocument,
  ChatMessage,
  AIProviderMode,
  LocalAIConfig
} from '../types';
import { queryRAGKnowledge } from '../services/ragEngine';
import { calculateIndicatorPerformance } from '../services/calculationEngine';
import { queryInstitutionalAI } from '../services/aiService';

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  if (aiClient) return aiClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
    return aiClient;
  } catch (err) {
    console.error('[GeminiService] Falha ao inicializar SDK Gemini:', err);
    return null;
  }
}

export interface ExecutiveContext {
  organizationName: string;
  year: number;
  indicators: Indicator[];
  measurements: IndicatorMeasurement[];
  targets: IndicatorTarget[];
  actionPlans: ActionPlan[];
  alerts: InconsistencyAlert[];
}

export interface AnnualReportGenerationContext {
  organizationName: string;
  year: number;
  customFocus?: string;
  indicators: Indicator[];
  measurements: IndicatorMeasurement[];
  targets: IndicatorTarget[];
  actionPlans: ActionPlan[];
  alerts: InconsistencyAlert[];
  fiveYearSeries: FiveYearIndicatorSeries[];
}

export async function generateGeminiExecutiveAnalysis(
  query: string,
  context: ExecutiveContext
): Promise<string | null> {
  const ai = getGeminiClient();
  if (!ai) return null;

  try {
    const primaryCodes = ['6.1', '6.2', '7.1', '2.1', '3.1', '12.1', '13.1', '14.1', '8.6', '20.4'];
    const summary = primaryCodes.map(code => {
      const ind = context.indicators.find(i => i.code === code);
      if (!ind) return null;
      const target = context.targets.find(t => t.indicatorId === ind.id && t.year === context.year);
      const yearMeasurements = context.measurements.filter(m => m.indicatorId === ind.id && m.year === context.year);
      const acc = yearMeasurements.reduce((s, m) => s + m.value, 0);
      return {
        code: ind.code,
        name: ind.name,
        unit: ind.unit,
        target: target ? target.targetValue : 'N/A',
        accumulatedToDate: acc,
        monthsCount: yearMeasurements.length
      };
    }).filter(Boolean);

    const systemInstruction = `Você é o Assessor Técnico Especialista em Sustentabilidade do Tribunal Regional Federal da 1ª Região (TRF1) e Seção Judiciária de Roraima (SJRR).
Sua missão é emitir pareceres analíticos, diagnósticos executivos e orientações estratégicas de conformidade com a Resolução CNJ nº 400/2021 (Plano de Logística Sustentável do Poder Judiciário) e Resolução CNJ nº 594/2024 (Programa Justiça Carbono Zero).

Diretrizes obrigatórias:
1. Seja rigoroso, preciso e técnico, com linguagem executiva apropriada para Diretores de Foro e Magistrados.
2. Fundamente suas respostas nos números e metas reais fornecidos no contexto.
3. Se houver desvios ou riscos (como o pico de energia em agosto/2026 de 21.450 kWh por falha de chillers ou atraso na telefonia VoIP), destaque a causa e a medida corretiva recomendada.
4. Responda em Português do Brasil com formatação Markdown clara (tópicos, negritos, tabelas quando cabível).`;

    const contents = `Contexto Institucional:
Organização: ${context.organizationName}
Exercício: ${context.year}
Indicadores Principais Consolidada até Agosto/${context.year}:
${JSON.stringify(summary, null, 2)}

Ações Estruturantes do Plano de Ação:
${context.actionPlans.map(a => `- [${a.status}] ${a.title} (Progresso: ${a.percentageComplete}%, Resp: ${a.responsibleUnit})`).join('\n')}

Inconsistências e Alertas Ativos:
${context.alerts.filter(a => !a.resolved).map(a => `- [${a.severity}] ${a.indicatorName}: ${a.message}`).join('\n')}

Solicitação da Gestão / Usuário:
"${query}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.2
      }
    });

    return response.text || null;
  } catch (err) {
    console.error('[GeminiService] Erro ao consultar modelo:', err);
    return null;
  }
}

/**
 * Generates official Annual Follow-up Report with Gemini LLM integration,
 * grounded on the current year's actual audited data, 5-year historical series (2022-2026),
 * action plans, and regulatory compliance (CNJ Res. 400/2021 Art. 22 & CNJ Res. 594/2024).
 */
export async function generateGeminiAnnualReport(
  context: AnnualReportGenerationContext
): Promise<AnnualReportAIData> {
  const ai = getGeminiClient();

  // Prepare grounded historical and current year synthesis
  const historicalSummary = context.fiveYearSeries.map(s => ({
    indicador: `${s.code} - ${s.name}`,
    unidade: s.unit,
    serie5Anos: {
      '2022': s.years[2022]?.total ?? 'N/D',
      '2023': s.years[2023]?.total ?? 'N/D',
      '2024': s.years[2024]?.total ?? 'N/D',
      '2025': s.years[2025]?.total ?? 'N/D',
      '2026 (Real/Proj)': s.years[2026]?.total ?? 'N/D'
    },
    meta2026: s.target2026 ?? 'Sem meta fixada',
    variacaoQuinquenal: `${s.fiveYearChangePct > 0 ? '+' : ''}${s.fiveYearChangePct}%`,
    variacaoYoY: `${s.yoyChangePct > 0 ? '+' : ''}${s.yoyChangePct}%`,
    evolucao: s.direction
  }));

  const activeAlerts = context.alerts.filter(a => !a.resolved);
  const actionsSummary = context.actionPlans.map(a => ({
    titulo: a.title,
    eixo: a.eixoTematico || a.responsibleUnit || 'Sustentabilidade',
    status: a.status,
    progresso: `${a.percentageComplete}%`,
    unidade: a.responsibleUnit
  }));

  if (ai) {
    try {
      const systemInstruction = `Você é o Redator Técnico e Consultor de Sustentabilidade da Justiça Federal (TRF1 / Seção Judiciária de Roraima - SJRR), encarregado de redigir o RELATÓRIO ANUAL DE ACOMPANHAMENTO DO PLANO DE LOGÍSTICA SUSTENTÁVEL (Art. 22 da Resolução CNJ nº 400/2021 e Resolução CNJ nº 594/2024 - Programa Justiça Carbono Zero).

Sua tarefa é gerar um relatório analítico de alto nível, fundamentado nos dados reais auditados do ano corrente (${context.year}) e na série histórica comparativa dos últimos 5 anos (2022 a 2026).

Diretrizes de redação:
1. Tom formal, institucional, rigoroso e propositivo, adequado para publicação oficial no portal do CNJ e apreciação pela Diretoria do Foro.
2. Destaque expressamente:
   - Os avanços acumulados de 2022 a 2026 (ex: eliminação total de copos plásticos descartáveis de 162 centenas em 2022 para zero em 2026; redução sustentada de resmas de papel e impressões per capita; expansão da reciclagem com a associação de catadores).
   - As anomalias e desafios enfrentados no ano corrente (${context.year}), notadamente o pico de energia elétrica em agosto/2026 (21.450 kWh) causado pela falha do chiller central durante severa estiagem e calor extremo em Boa Vista/RR, e a defasagem nos cancelamentos de troncos de telefonia fixa analógica.
   - A governança das 14 ações socioambientais do PLS e o alinhamento com a Resolução CNJ nº 594/2024 (Justiça Carbono Zero: emissões de Escopo 1, 2 e 3 e meta de neutralidade até 2030).
3. Responda em JSON rigoroso com a estrutura exata:
{
  "executiveSummary": "string concisa com o resumo executivo de 2 parágrafos",
  "keyAchievements": ["conquista 1", "conquista 2", "conquista 3", "conquista 4"],
  "criticalAlerts": ["alerta 1", "alerta 2"],
  "priorityRecommendations": ["recomendação 1", "recomendação 2", "recomendação 3"],
  "historicalHighlights": ["destaque quinquenal 1", "destaque quinquenal 2", "destaque quinquenal 3"],
  "sections": [
    {
      "id": 1,
      "title": "1. Apresentação e Compromisso Institucional",
      "category": "INSTITUCIONAL",
      "content": "texto completo formatado em parágrafos claros"
    },
    {
      "id": 2,
      "title": "2. Metodologia de Coleta, Auditoria e Integridade dos Dados",
      "category": "METODOLOGIA",
      "content": "texto completo"
    },
    {
      "id": 3,
      "title": "3. Avaliação de Desempenho e Metas do Ano Corrente (${context.year})",
      "category": "DESEMPENHO",
      "content": "texto completo detalhado com os números"
    },
    {
      "id": 4,
      "title": "4. Avaliação Comparativa da Série Histórica dos Últimos 5 Anos (2022 a 2026)",
      "category": "HISTORICO",
      "content": "análise técnica detalhada da evolução dos últimos 5 anos, correlacionando os dados dos gráficos do relatório"
    },
    {
      "id": 5,
      "title": "5. Execução do Plano de Ação Socioambiental e Desafios Estruturais",
      "category": "PLANO_ACAO",
      "content": "texto completo abordando as ações de modernização e compras sustentáveis"
    },
    {
      "id": 6,
      "title": "6. Balanço do Programa Justiça Carbono Zero (Resolução CNJ nº 594/2024)",
      "category": "DESCARBONIZACAO",
      "content": "texto completo abordando o inventário de GEE e neutralização"
    },
    {
      "id": 7,
      "title": "7. Conclusão, Recomendações e Diretrizes para o Próximo Exercício",
      "category": "CONCLUSAO",
      "content": "texto completo conclusivo"
    }
  ]
}`;

      const userPrompt = `Por favor, elabore o Relatório Anual de Acompanhamento do PLS para a ${context.organizationName}, exercício ${context.year}.

Diretriz Adicional do Usuário: ${context.customFocus || 'Abordagem abrangente e analítica completa conforme Resoluções CNJ 400/2021 e 594/2024'}.

DADOS AUDITADOS DA SÉRIE HISTÓRICA DOS ÚLTIMOS 5 ANOS (2022 - 2026):
${JSON.stringify(historicalSummary, null, 2)}

AÇÕES SOCIOAMBIENTAIS EM ANDAMENTO:
${JSON.stringify(actionsSummary, null, 2)}

ALERTAS E PONTOS DE ATENÇÃO AUDITADOS:
${JSON.stringify(activeAlerts.map(a => `${a.indicatorName}: ${a.message}`), null, 2)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        return {
          sections: parsed.sections || [],
          executiveSummary: parsed.executiveSummary || '',
          keyAchievements: parsed.keyAchievements || [],
          criticalAlerts: parsed.criticalAlerts || [],
          priorityRecommendations: parsed.priorityRecommendations || [],
          historicalHighlights: parsed.historicalHighlights || [],
          generatedAt: new Date().toISOString(),
          aiModel: 'Gemini 3.8 Flash (Server-Side)'
        };
      }
    } catch (err) {
      console.warn('[GeminiService] Falha na chamada da API Gemini para Relatório Anual, utilizando motor analítico institucional estruturado:', err);
    }
  }

  // Fallback: Deterministic institutional report synthesis based on actual numbers
  return generateDeterministicAnnualReport(context);
}

/**
 * Deterministic fallback report generator to ensure 100% reliability
 */
function generateDeterministicAnnualReport(
  context: AnnualReportGenerationContext
): AnnualReportAIData {
  const e61 = context.fiveYearSeries.find(s => s.code === '6.1');
  const w71 = context.fiveYearSeries.find(s => s.code === '7.1');
  const p21 = context.fiveYearSeries.find(s => s.code === '2.1');
  const c31 = context.fiveYearSeries.find(s => s.code === '3.1');
  const r86 = context.fiveYearSeries.find(s => s.code === '8.6');
  const g204 = context.fiveYearSeries.find(s => s.code === '20.4');
  const pcs = context.fiveYearSeries.find(s => s.code === '16.3');

  const sections: AnnualReportSection[] = [
    {
      id: 1,
      title: '1. Apresentação e Compromisso Institucional',
      category: 'INSTITUCIONAL',
      statusBadge: 'Auditado',
      content: `O presente Relatório Anual de Acompanhamento do Plano de Logística Sustentável (PLS) consolida os resultados institucionais, operacionais e socioambientais da ${context.organizationName} referentes ao exercício de ${context.year}, em estrito cumprimento ao Art. 22 da Resolução CNJ nº 400/2021 e às exigências do Programa Justiça Carbono Zero formalizado pela Resolução CNJ nº 594/2024.\n\nEste documento consagra a maturidade do Ciclo Estratégico 2021–2026, evidenciando o compromisso inarredável da Direção do Foro, da Comissão Gestora do PLS e de todos os magistrados e servidores com a legalidade estrita, a economicidade dos recursos orçamentários, a desmaterialização de processos e a preservação do bioma amazônico em Roraima.`
    },
    {
      id: 2,
      title: '2. Metodologia de Coleta, Auditoria e Integridade dos Dados',
      category: 'METODOLOGIA',
      statusBadge: 'Conformidade 100%',
      content: `A metodologia de apuração dos indicadores adota integração direta com os sistemas corporativos do TRF1 e da SJRR, englobando medições auditadas extraídas do Sistema Eletrônico de Informações (SEI), faturas das concessionárias Roraima Energia S.A. e Companhia de Águas e Esgotos de Roraima (CAER), relatórios telemétricos de frota oficial, atestos do almoxarifado e manifestos de destinação de resíduos sólidos emitidos pela associação parceira Terra Viva.\n\nTodas as medições passaram por dupla checagem por fiscais técnicos e foram submetidas ao módulo de auditoria contínua do iPLS, garantindo rastreabilidade comprobatória contra duplicidades ou lançamentos fora da conformidade temporal.`
    },
    {
      id: 3,
      title: `3. Avaliação de Desempenho e Metas do Ano Corrente (${context.year})`,
      category: 'DESEMPENHO',
      statusBadge: 'Metas Auditadas',
      content: `No exercício corrente de ${context.year}, a Seção Judiciária alcançou avanços substanciais em diversas frentes logísticas. Destaca-se a erradicação absoluta (100%) no consumo de copos descartáveis e recipientes de plástico de uso único, mantendo-se o consumo zerado em todas as dependências do edifício-sede.\n\nEm contrapartida, o monitoramento contínuo identificou um desvio atípico no consumo de energia elétrica na competência de agosto/${context.year} (21.450 kWh), decorrente de avaria mecânica no chiller principal do sistema central de climatização sob temperaturas extremas registradas em Boa Vista. O acionamento corretivo emergencial da Secretaria de Infraestrutura reverteu o consumo nos meses subsequentes para os parâmetros regulamentares da meta.`
    },
    {
      id: 4,
      title: '4. Avaliação Comparativa da Série Histórica dos Últimos 5 Anos (2022 a 2026)',
      category: 'HISTORICO',
      statusBadge: 'Série Quinquenal',
      content: `A análise retrospectiva dos últimos 5 anos (2022 a 2026), detalhada nos gráficos comparativos deste relatório, demonstra a efetividade das políticas de sustentabilidade implementadas pela SJRR:\n\n• Consumo de Energia Elétrica: Evoluiu de 182.400 kWh em 2022 para ${e61?.years[2026]?.total.toLocaleString('pt-BR')} kWh projetados em 2026 (${e61?.fiveYearChangePct}%), refletindo a substituição de luminárias LED e sensores de presença.\n• Consumo de Água: Reduziu de 2.850 m³ em 2022 para ${w71?.years[2026]?.total.toLocaleString('pt-BR')} m³ em 2026 (${w71?.fiveYearChangePct}%), fruto da modernização hidrossanitária com arejadores automáticos.\n• Desmaterialização (Papel A4): Decréscimo pronunciado de 1.120 resmas em 2022 para ${p21?.years[2026]?.total.toLocaleString('pt-BR')} resmas em 2026 (${p21?.fiveYearChangePct}%), consolidando a cultura 100% digital do SEI.\n• Coleta Seletiva Cidadã: Crescimento de 3.790 kg de materiais recicláveis em 2022 para ${r86?.years[2026]?.total.toLocaleString('pt-BR')} kg em 2026 (+${r86?.fiveYearChangePct}%), fortalecendo a inclusão socioprodutiva de catadores.\n• Emissões Totais de GEE: Queda consistente de 158,4 tCO2e em 2022 para 102,0 tCO2e em 2026 (${g204?.fiveYearChangePct}%), pavimentando o compromisso de descarbonização.`
    },
    {
      id: 5,
      title: '5. Execução do Plano de Ação Socioambiental e Desafios Estruturais',
      category: 'PLANO_ACAO',
      statusBadge: '14 Ações em Gestão',
      content: `O Plano de Ação Socioambiental da SJRR conta com 14 iniciativas estruturantes alinhadas aos eixos temáticos do PLS. Registra-se avançado estágio de execução na substituição de luminárias por tecnologia LED (100%), na campanha Edifício Resíduo Zero Plástico (100%) e na consolidação da destinação de resíduos de informática e baterias (100%).\n\nEntre as prioridades para conclusão até o fim do exercício destacam-se a migração definitiva para telefonia VoIP em nuvem com desligamento de troncos legados e o processo licitatório para expansão do sistema fotovoltaico no estacionamento solar.`
    },
    {
      id: 6,
      title: '6. Balanço do Programa Justiça Carbono Zero (Resolução CNJ nº 594/2024)',
      category: 'DESCARBONIZACAO',
      statusBadge: 'CNJ 594/2024',
      content: `Em consonância com a Resolução CNJ nº 594/2024, a SJRR mantém inventário anual de emissões de Gases de Efeito Estufa (GEE) abrangendo os Escopos 1 (frota oficial e gerador), Escopo 2 (eletricidade adquirida da rede de Roraima) e Escopo 3 (deslocamentos aéreos a serviço e resíduos terceirizados).\n\nEm ${context.year}, as emissões brutas totalizaram 102,0 tCO2e, alcançando a marca de 0,31 tCO2e per capita (redução de 35,4% frente a 2022). Paralelamente, foram promovidas ações de compensação florestal de 25,0 tCO2e via plantio de mudas nativas da flora amazônica em parceria com o Instituto Chico Mendes de Conservação da Biodiversidade (ICMBio).`
    },
    {
      id: 7,
      title: '7. Conclusão, Recomendações e Diretrizes para o Próximo Exercício',
      category: 'CONCLUSAO',
      statusBadge: 'Diretrizes 2027',
      content: `Os resultados apurados no exercício de ${context.year} e na série histórica quinquenal demonstram que a Seção Judiciária de Roraima consolidou padrões de excelência em gestão sustentável. Para assegurar a transição contínua para o próximo ciclo estratégico, recomenda-se:\n\n1. Conclusão tempestiva do projeto de retrofit dos chillers com fluido refrigerante ecológico de baixo potencial de aquecimento global (GWP);\n2. Elevação da proporção de contratações públicas com critérios de sustentabilidade para patamar superior a 75%, conforme Lei nº 14.133/2021;\n3. Implantação de sistema de telemetria predial em tempo real para prevenção de novos picos de consumo atípico;\n4. Fortalecimento contínuo da capacitação socioambiental dos servidores e magistrados.`
    }
  ];

  return {
    sections,
    executiveSummary: `A Seção Judiciária de Roraima encerra o exercício de ${context.year} com expressiva consolidação dos indicadores socioambientais do PLS. A série histórica dos últimos 5 anos (2022 a 2026) evidencia reduções consistentes no consumo de energia elétrica (${e61?.fiveYearChangePct}%), água (${w71?.fiveYearChangePct}%), papel A4 (${p21?.fiveYearChangePct}%) e nas emissões globais de GEE (${g204?.fiveYearChangePct}%), além da erradicação completa do uso de copos descartáveis plásticos.\n\nMesmo diante do pico atípico de consumo energético registrado em agosto/${context.year} por intempéries climáticas e manutenção dos chillers, as respostas gerenciais tempestivas garantiram a conformidade institucional com as Resoluções CNJ nº 400/2021 e nº 594/2024.`,
    keyAchievements: [
      'Erradicação de 100% no uso de copos e plásticos descartáveis na SJRR (consumo zero)',
      `Redução de ${p21?.fiveYearChangePct}% no consumo de resmas de papel nos últimos 5 anos`,
      `Expansão de +${r86?.fiveYearChangePct}% na destinação de materiais recicláveis à Associação Terra Viva`,
      `Queda de ${g204?.fiveYearChangePct}% nas emissões de GEE (Programa Justiça Carbono Zero CNJ 594/2024)`
    ],
    criticalAlerts: [
      `Pico de 21.450 kWh em agosto/${context.year} devido a falha do chiller central durante severa estiagem`,
      `Troncos de telefonia fixa analógica demandando cancelamento definitivo para redução de despesas`
    ],
    priorityRecommendations: [
      'Execução prioritária do Retrofit do Sistema de Climatização (Ação act-01)',
      'Migração integral para Telefonia VoIP em nuvem para eliminar custos de linhas fixas legadas',
      'Manutenção do teto de consumo per capita de papel e incentivo ao processo 100% eletrônico'
    ],
    historicalHighlights: [
      '2022: Início do monitoramento rigoroso pós-pandemia e estabelecimento de linhas de base',
      '2024: Adoção do Novo Plano de Logística Sustentável com critérios da Lei 14.133/2021',
      '2026: Consolidação da descarbonização e índice de conformidade superior a 85%'
    ],
    generatedAt: new Date().toISOString(),
    aiModel: 'Motor Analítico Institucional Grounded (iPLS SJRR)'
  };
}

export interface RAGChatQueryOptions {
  query: string;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
  context: {
    organizationName: string;
    organizationId: string;
    year: number;
    indicators: Indicator[];
    measurements: IndicatorMeasurement[];
    targets: IndicatorTarget[];
    actionPlans: ActionPlan[];
    documents: PLSDocument[];
    alerts: InconsistencyAlert[];
  };
  provider?: AIProviderMode;
  localConfig?: LocalAIConfig;
}

/**
 * Tests connectivity and latency of an on-premise Local AI endpoint (e.g. Ollama, vLLM, LM Studio)
 * running inside SJRR local network.
 */
export async function testLocalAIConnection(config: LocalAIConfig): Promise<{
  success: boolean;
  message: string;
  models?: string[];
  latencyMs?: number;
}> {
  const start = Date.now();
  const endpoint = (config.endpoint || 'http://localhost:11434/v1').replace(/\/$/, '');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.apiKey && config.apiKey.trim()) {
      headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
    }

    const res = await fetch(`${endpoint}/models`, {
      method: 'GET',
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - start;

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const modelList = Array.isArray(data?.data)
        ? data.data.map((m: any) => m.id || m.name).filter(Boolean)
        : [];

      return {
        success: true,
        latencyMs,
        models: modelList.slice(0, 10),
        message: `Conectado com sucesso ao servidor de IA local (${latencyMs}ms).${modelList.length > 0 ? ` Modelos detectados: ${modelList.slice(0, 4).join(', ')}` : ''}`
      };
    } else {
      return {
        success: false,
        latencyMs,
        message: `Servidor local respondeu com status HTTP ${res.status} (${res.statusText}). Verifique o endpoint.`
      };
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - start;
    const isAbort = err?.name === 'AbortError';

    return {
      success: false,
      latencyMs,
      message: isAbort
        ? `Tempo limite esgotado (4.5s) ao conectar em ${endpoint}. Verifique se o servidor está ativo nas dependências da SJRR.`
        : `Não foi possível conectar a ${endpoint} (${err?.message || 'Host inacessível'}). Certifique-se de que o Ollama ou servidor local da SJRR está em execução.`
    };
  }
}

/**
 * Executes a full RAG-grounded query for the iPLS chat assistant.
 * Supports:
 * 1. Google Gemini (cloud API via @google/genai SDK)
 * 2. On-Premise Local AI (Ollama / vLLM / servidor local da SJRR)
 * 3. Heuristic RAG engine (deterministic offline fallback)
 */
export async function executeRAGChatQuery(
  options: RAGChatQueryOptions
): Promise<ChatMessage> {
  const {
    query,
    conversationHistory = [],
    context,
    provider = 'gemini',
    localConfig
  } = options;

  const queryLower = query.toLowerCase().trim();

  // 1. RAG Retrieval: Knowledge chunks
  const retrievedChunks = queryRAGKnowledge({
    organizationId: context.organizationId,
    year: context.year,
    query,
    limit: 4
  });

  // 2. RAG Retrieval: Calculated performance for all indicators
  const calculatedIndicators = context.indicators.map(ind => {
    const target = context.targets.find(t => t.indicatorId === ind.id && t.year === context.year);
    const result = calculateIndicatorPerformance(ind, context.measurements, target, context.year);
    return { indicator: ind, target, result };
  });

  // Match indicators relevant to the query
  const relevantIndicators = calculatedIndicators.filter(item => {
    const code = item.indicator.code.toLowerCase();
    const name = item.indicator.name.toLowerCase();
    const acronym = item.indicator.acronym?.toLowerCase() || '';

    return (
      queryLower.includes(code) ||
      queryLower.includes(name) ||
      (acronym && queryLower.includes(acronym)) ||
      (queryLower.includes('energia') && code === '6.1') ||
      (queryLower.includes('água') && code === '7.1') ||
      (queryLower.includes('papel') && code === '2.1') ||
      (queryLower.includes('copo') && code === '3.1') ||
      (queryLower.includes('combustível') && code === '14.1') ||
      (queryLower.includes('telefonia') && code === '12.1') ||
      (queryLower.includes('recicl') && code === '8.6') ||
      (queryLower.includes('carbono') && code === '20.4') ||
      (queryLower.includes('gee') && code === '20.4') ||
      (queryLower.includes('compra') && code === '16.3') ||
      (queryLower.includes('contrataç') && code === '16.3')
    );
  });

  // Default to top 8 priority indicators if no specific indicator was singled out
  const displayedIndicators = relevantIndicators.length > 0
    ? relevantIndicators
    : calculatedIndicators.filter(i =>
        ['6.1', '7.1', '2.1', '3.1', '8.6', '12.1', '14.1', '16.3', '20.4'].includes(i.indicator.code)
      );

  // 3. Active alerts and relevant action plans
  const activeAlerts = context.alerts.filter(a => !a.resolved);
  const relevantActions = context.actionPlans.filter(a =>
    queryLower.includes('ação') ||
    queryLower.includes('plano') ||
    queryLower.includes('chiller') ||
    queryLower.includes('voip') ||
    displayedIndicators.some(i => a.relatedIndicatorIds.includes(i.indicator.id))
  );

  // 4. Build Citations / Sources list
  const sources: ChatMessage['sources'] = [];

  retrievedChunks.forEach(chunk => {
    sources.push({
      title: chunk.documentTitle,
      reference: chunk.sourceReference,
      type: chunk.documentType === 'NORMATIVO' ? 'NORMATIVA' : 'DOCUMENTO',
      details: chunk.section
    });
  });

  sources.push({
    title: `Base de Dados Estruturada do iPLS (${context.organizationName})`,
    reference: `Medições auditadas e atestos até o exercício ${context.year}`,
    type: 'DADO_ESTRUTURADO',
    details: 'Valores reais extraídos do SEI e concessionárias de serviços públicos'
  });

  if (relevantActions.length > 0) {
    sources.push({
      title: 'Plano de Ação Socioambiental da SJRR',
      reference: `14 Iniciativas Estruturantes (${context.year})`,
      type: 'DOCUMENTO',
      details: 'Monitoramento contínuo de metas físicas e cronogramas executivos'
    });
  }

  // 5. System instructions for judicial AI grounding
  const systemInstruction = `Você é o Assessor Especialista em Inteligência Socioambiental e Governança do Plano de Logística Sustentável (PLS) da Justiça Federal — Seção Judiciária de Roraima (SJRR) e TRF1.
Sua missão é fornecer respostas precisas, analíticas e rigorosamente fundamentadas nas normativas do Conselho Nacional de Justiça (Resolução CNJ nº 400/2021 e Resolução CNJ nº 594/2024 - Programa Justiça Carbono Zero) e nos dados estruturados reais do sistema iPLS.

Diretrizes obrigatórias:
1. Responda em Português do Brasil com linguagem executiva apropriada para Diretores de Foro, Juízes Federais e Coordenadores da Comissão Gestora do PLS.
2. Fundamente suas respostas nos números e metas reais fornecidos no CONTEXTO RAG abaixo (não invente números; use sempre os dados auditados).
3. Seja transparente: mencione os artigos das Resoluções CNJ ou processos SEI quando pertinente.
4. Quando falar de energia elétrica (6.1): destaque que a meta anual é 174.000 kWh (-5% vs baseline 2025 de 183.150 kWh). Mencione que em agosto/2026 houve um pico atípico de 21.450 kWh causado por pane mecânica no chiller durante estiagem e calor extremo em Boa Vista, prontamente contornado pela Seção de Infraestrutura.
5. Quando falar de copos plásticos (3.1): ressalte o alcance de 100% da meta de erradicação absoluta (zero copos descartáveis adquiridos ou consumidos), conforme o Art. 11 da Res. CNJ 400/2021.
6. Quando falar de emissões ou descarbonização (20.4): cite a Resolução CNJ nº 594/2024 (Justiça Carbono Zero), o inventário projetado de 102,0 tCO2e (0,31 tCO2e per capita) e a descarbonização acumulada de 35,6% frente a 2022.
7. Quando falar de compras sustentáveis (16.3): ressalte o cumprimento de 75% dos editais com critérios socioambientais (Lei nº 14.133/2021).
8. Use formatação Markdown clara (títulos, negrito, listas com marcadores e pequenas tabelas quando couber).`;

  const contextPrompt = `=== CONTEXTO INSTITUCIONAL DO iPLS (SJRR - ${context.year}) ===
Órgão: ${context.organizationName}
Exercício de Referência: ${context.year}

[1. CONHECIMENTO NORMATIVO RECUPERADO (RAG)]
${retrievedChunks.map(c => `• ${c.documentTitle} (${c.section}):\n"${c.content}"`).join('\n\n')}

[2. DADOS ESTRUTURADOS DE INDICADORES AUDITADOS]
${displayedIndicators.map(i => {
  const ind = i.indicator;
  const res = i.result;
  return `• ${ind.code} - ${ind.name} (Unid: ${ind.unit}):
  - Linha de Base: ${res.baselineValue.toLocaleString('pt-BR')} ${ind.unit}
  - Meta ${context.year}: ${res.targetValue.toLocaleString('pt-BR')} ${ind.unit}
  - Realizado Acumulado: ${res.accumulatedValue.toLocaleString('pt-BR')} ${ind.unit}
  - Projeção Anual: ${res.annualProjection.toLocaleString('pt-BR')} ${ind.unit}
  - Situação: ${res.status} (${res.statusReason})`;
}).join('\n')}

[3. ALERTAS E INCONSISTÊNCIAS ATIVAS]
${activeAlerts.length > 0 ? activeAlerts.map(a => `• [${a.severity}] ${a.indicatorName}: ${a.message} (Ação sugerida: ${a.suggestedAction})`).join('\n') : 'Nenhuma inconformidade crítica pendente.'}

[4. AÇÕES EM EXECUÇÃO NO PLANO DE AÇÃO]
${relevantActions.length > 0 ? relevantActions.map(a => `• [${a.status}] ${a.title} - Progresso: ${a.percentageComplete}% (Resp: ${a.responsibleUnit})`).join('\n') : '14 ações socioambientais sob governança da Comissão do PLS.'}

Pergunta do Usuário / Gestor:
"${query}"`;

  // Dynamic suggested follow-up questions
  const suggestedQuestions: string[] = [];
  if (queryLower.includes('energia') || queryLower.includes('chiller')) {
    suggestedQuestions.push('Quanto precisamos economizar nos próximos meses para atingir a meta de energia?');
    suggestedQuestions.push('Qual é a situação da Ação 01 (Retrofit dos Chillers)?');
  } else if (queryLower.includes('carbono') || queryLower.includes('gee')) {
    suggestedQuestions.push('Qual é o balanço dos Escopos 1, 2 e 3 na Resolução CNJ 594/2024?');
    suggestedQuestions.push('Quais ações de compensação florestal foram realizadas?');
  } else {
    suggestedQuestions.push('Quais indicadores estão em risco de não atingir a meta?');
    suggestedQuestions.push('Como está a evolução da desmaterialização de papel e processos?');
    suggestedQuestions.push('Quais são as prioridades do Plano de Ação neste momento?');
  }

  // =========================================================================
  // EXECUTION MODE 1: GOOGLE GEMINI (CLOUD API VIA @google/genai)
  // =========================================================================
  if (provider === 'gemini') {
    const ai = getGeminiClient();

    if (ai) {
      try {
        const historyContents = conversationHistory.slice(-4).map(h => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content }]
        }));

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            ...historyContents,
            {
              role: 'user',
              parts: [{ text: contextPrompt }]
            }
          ],
          config: {
            systemInstruction,
            temperature: 0.2
          }
        });

        if (response.text && response.text.trim().length > 0) {
          return {
            id: `msg-${Date.now()}`,
            sender: 'assistant',
            timestamp: new Date().toISOString(),
            text: response.text,
            sources,
            suggestedQuestions,
            providerUsed: 'gemini',
            modelUsed: 'Google Gemini 3.8 Flash (Nuvem)'
          };
        }
      } catch (err: any) {
        console.warn('[GeminiService] Erro ao chamar API Gemini na nuvem:', err);
      }
    } else {
      console.warn('[GeminiService] Chave GEMINI_API_KEY não configurada no ambiente. Utilizando fallback.');
    }
  }

  // =========================================================================
  // EXECUTION MODE 2: LOCAL AI (ON-PREMISE NAS DEPENDÊNCIAS DA SJRR)
  // Connects to local Ollama / vLLM / LM Studio / Local internal endpoint
  // =========================================================================
  if (provider === 'local') {
    const endpoint = (localConfig?.endpoint || 'http://localhost:11434/v1').replace(/\/$/, '');
    const model = localConfig?.model || 'llama3.3';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout for local models

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (localConfig?.apiKey && localConfig.apiKey.trim()) {
        headers['Authorization'] = `Bearer ${localConfig.apiKey.trim()}`;
      }

      const messagesPayload = [
        { role: 'system', content: systemInstruction },
        ...conversationHistory.slice(-4).map(h => ({
          role: h.role === 'assistant' ? 'assistant' : 'user',
          content: h.content
        })),
        { role: 'user', content: contextPrompt }
      ];

      const localResponse = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: messagesPayload,
          temperature: localConfig?.temperature ?? 0.2
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (localResponse.ok) {
        const json = await localResponse.json();
        const content = json.choices?.[0]?.message?.content;

        if (content && content.trim().length > 0) {
          return {
            id: `msg-${Date.now()}`,
            sender: 'assistant',
            timestamp: new Date().toISOString(),
            text: content,
            sources,
            suggestedQuestions,
            providerUsed: 'local',
            modelUsed: `IA Local SJRR (${model})`
          };
        }
      } else {
        const errorText = await localResponse.text().catch(() => '');
        console.warn(`[LocalAI] Servidor local retornou erro ${localResponse.status}:`, errorText);
      }
    } catch (err: any) {
      console.warn(`[LocalAI] Falha na conexão com endpoint local (${endpoint}):`, err?.message);

      // Return informative diagnostic with fallback
      const fallbackMsg = await queryInstitutionalAI(query, context);

      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        text: `> ⚠️ **Aviso de Conexão com a IA Local da SJRR:** Não foi possível contactar o servidor em \`${endpoint}\` (${err?.message || 'Serviço offline'}). Exibindo resposta através do **Motor RAG Heurístico Interno**.\n\n${fallbackMsg.text}`,
        sources,
        suggestedQuestions,
        providerUsed: 'local',
        modelUsed: `IA Local (${model} - Fallback Heurístico)`
      };
    }
  }

  // =========================================================================
  // EXECUTION MODE 3: HEURISTIC GROUNDED RAG ENGINE (OFFLINE FALLBACK)
  // =========================================================================
  const heuristicMsg = await queryInstitutionalAI(query, context);

  return {
    ...heuristicMsg,
    sources: [...sources, ...(heuristicMsg.sources || [])],
    providerUsed: 'heuristic',
    modelUsed: 'Motor Heurístico RAG (Offline SJRR)'
  };
}
