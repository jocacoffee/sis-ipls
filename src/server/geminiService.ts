import { GoogleGenAI } from '@google/genai';
import { callLocalLLM, extractJson, localLLMSettings, responseBudget } from './localLLM';
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
  provider?: AIProviderMode;
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


/** Indicadores mensais e anuais principais usados no relatório (siglas do catálogo). */
const REPORT_KEY_ACRONYMS = new Set([
  'CPP', 'GPP', 'CPC', 'CC', 'GCD', 'CED', 'CER', 'GAED', 'GAER', 'QI', 'CEE', 'GEE', 'kWhI', 'CA', 'GA',
  'DPa', 'DPl', 'DMt', 'DVd', 'GTF', 'GTM', 'QEI', 'GLB', 'GV', 'Km', 'GC', 'CG', 'CD', 'ACR', 'ACS', 'PCS',
  'FTT', 'DEI/DEl', 'DImp', 'GEE-Esc3', 'GEE1e2'
]);

const round2 = (v: number) => (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 100) / 100);

/** Série histórica resumida: só indicadores principais com dados no período. */
export function summarizeSeriesForReport(context: AnnualReportGenerationContext) {
  const years = Array.from({ length: 5 }, (_, i) => context.year - 4 + i);
  return context.fiveYearSeries
    .filter(s => REPORT_KEY_ACRONYMS.has(s.acronym || '') || REPORT_KEY_ACRONYMS.has(s.code))
    .filter(s => years.some(y => (s.years[y]?.monthsReported ?? 0) > 0))
    .map(s => {
      const serie: Record<string, number | string> = {};
      years.forEach(y => {
        const d = s.years[y];
        serie[String(y)] = d && d.monthsReported > 0 ? round2(d.total) : 'n/d';
      });
      const cur = s.years[context.year];
      const val = (y: number) => (typeof serie[String(y)] === 'number' ? (serie[String(y)] as number) : null);
      const variation = (from: number | null, to: number | null) =>
        from === null || to === null ? 'n/d' : from === 0 ? (to === 0 ? '0%' : 'n/d (base zero)') : `${to >= from ? '+' : ''}${(Math.round(((to - from) / from) * 1000) / 10).toLocaleString('pt-BR')}%`;
      const firstYear = years.find(y => val(y) !== null) ?? years[0];
      return {
        ind: `${s.acronym || s.code} - ${s.name}`,
        un: s.unit,
        serie,
        [`var_${firstYear}_${context.year}`]: variation(val(firstYear), val(context.year)),
        [`var_${context.year - 1}_${context.year}`]: variation(val(context.year - 1), val(context.year)),
        mensal: context.indicators.find(i => i.id === s.indicatorId)?.periodicity === 'MENSAL',
        mesesNoAno: cur?.monthsReported ?? 0,
        meta: s.target2026 ?? null
      };
    });
}

/** Instruções do relatório anual (compartilhadas entre Gemini e IA local). */
export function buildReportSystemInstruction(context: AnnualReportGenerationContext): string {
  return `Você é o Redator Técnico e Consultor de Sustentabilidade da Justiça Federal da 1ª Região, encarregado de redigir o RELATÓRIO ANUAL DE ACOMPANHAMENTO DO PLANO DE LOGÍSTICA SUSTENTÁVEL (Art. 22 da Resolução CNJ nº 400/2021 e Resolução CNJ nº 594/2024 - Programa Justiça Carbono Zero).

Sua tarefa é gerar um relatório analítico de alto nível, fundamentado nos dados reais auditados do ano corrente (${context.year}) e na série histórica comparativa dos últimos 5 anos (${context.year - 4} a ${context.year}).

Diretrizes de redação:
1. Tom formal, institucional, rigoroso e propositivo, adequado para publicação oficial no portal do CNJ e apreciação pela Diretoria do Foro.
2. Não cite artigos, parágrafos ou incisos de normas. Use EXCLUSIVAMENTE os números fornecidos nos dados abaixo. NÃO FAÇA CONTAS: para variações use somente os campos var_AAAA_AAAA já calculados (se for "n/d", não informe variação). Copie os valores exatamente da série do ano correspondente. Não invente valores, causas, ações, contratos, processos ou fatos que não estejam nos dados; quando um dado não existir, diga que não foi informado.
3. Destaque:
   - A evolução de ${context.year - 4} a ${context.year} dos indicadores com dados (aumentos e reduções, em números e percentuais).
   - Os pontos de atenção do ano corrente (${context.year}) que constam nos alertas fornecidos.
   - As ações do plano de ação informadas (se houver) e o alinhamento com a Resolução CNJ nº 594/2024 (Justiça Carbono Zero), sem atribuir resultados não informados.
4. Se o exercício estiver incompleto, deixe claro que os valores são parciais.
5a. Seja conciso: resumo executivo com no máximo 120 palavras; cada seção com no máximo 110 palavras; listas com no máximo 4 itens curtos (até 25 palavras cada).
5. Responda SOMENTE com um JSON válido (sem texto antes ou depois), com a estrutura exata:
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
      "title": "4. Avaliação Comparativa da Série Histórica dos Últimos 5 Anos (${context.year - 4} a ${context.year})",
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
}

/** Dados do relatório anual enviados ao modelo. */
export function buildReportUserPrompt(
  context: AnnualReportGenerationContext,
  historicalSummary: unknown[],
  actionsSummary: unknown[],
  activeAlerts: InconsistencyAlert[]
): string {
  return `Por favor, elabore o Relatório Anual de Acompanhamento do PLS para a ${context.organizationName}, exercício ${context.year}.

Diretriz Adicional do Usuário: ${context.customFocus || 'Abordagem abrangente e analítica completa conforme Resoluções CNJ 400/2021 e 594/2024'}.

DADOS AUDITADOS DA SÉRIE HISTÓRICA DOS ÚLTIMOS 5 ANOS (${context.year - 4} - ${context.year}):
${JSON.stringify(historicalSummary)}

AÇÕES SOCIOAMBIENTAIS EM ANDAMENTO:
${JSON.stringify(actionsSummary)}

ALERTAS E PONTOS DE ATENÇÃO AUDITADOS:
${JSON.stringify(activeAlerts.slice(0, 40).map(a => `${a.indicatorName}: ${a.message}`))}`;
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

  // Resumo compacto (cabe no contexto de modelos locais de 8k tokens):
  // indicadores mensais + anuais principais, com dados no período, números arredondados
  const historicalSummary = summarizeSeriesForReport(context);

  const activeAlerts = context.alerts
    .filter(a => !a.resolved)
    .sort((a, b) => (a.severity === 'CRITICA' ? 0 : a.severity === 'ATENCAO' ? 1 : 2) - (b.severity === 'CRITICA' ? 0 : b.severity === 'ATENCAO' ? 1 : 2))
    .slice(0, 12);
  const actionsSummary = context.actionPlans.map(a => ({
    titulo: a.title,
    eixo: a.eixoTematico || a.responsibleUnit || 'Sustentabilidade',
    status: a.status,
    progresso: `${a.percentageComplete}%`,
    unidade: a.responsibleUnit
  }));

  const reportSystemInstruction = (): string => buildReportSystemInstruction(context);
  const reportUserPrompt = (): string => buildReportUserPrompt(context, historicalSummary, actionsSummary, activeAlerts);

  if (context.provider === 'local') {
    try {
      const sysText = reportSystemInstruction();
      const userText = reportUserPrompt();
      const budget = responseBudget(sysText.length + userText.length, 4000);
      if (budget < 1800) {
        throw new Error(
          `Contexto do modelo insuficiente para o relatório (${localLLMSettings().contextTokens} tokens). ` +
          'Aumente o "Context Length" do modelo no LM Studio (recomendado: 16384) e ajuste LOCAL_AI_CONTEXT_TOKENS.'
        );
      }
      const { text, model } = await callLocalLLM(
        [
          { role: 'system', content: sysText },
          { role: 'user', content: userText }
        ],
        { timeoutMs: localLLMSettings().reportTimeoutMs, maxTokens: budget }
      );
      const parsed = extractJson(text);
      return {
        sections: parsed.sections || [],
        executiveSummary: parsed.executiveSummary || '',
        keyAchievements: parsed.keyAchievements || [],
        criticalAlerts: parsed.criticalAlerts || [],
        priorityRecommendations: parsed.priorityRecommendations || [],
        historicalHighlights: parsed.historicalHighlights || [],
        generatedAt: new Date().toISOString(),
        aiModel: `IA local (${model})`
      };
    } catch (err) {
      console.warn('[LocalAI] Falha ao gerar o relatório anual com a IA local; usando o motor determinístico:', err);
      return generateDeterministicAnnualReport(context);
    }
  }

  if (ai) {
    try {
      const systemInstruction = reportSystemInstruction();

      const userPrompt = reportUserPrompt();

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
 * Relatório de reserva (quando não há IA disponível): apenas fatos calculados dos
 * dados do órgão, sem narrativa inventada.
 */
function generateDeterministicAnnualReport(
  context: AnnualReportGenerationContext
): AnnualReportAIData {
  const fmt = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  const years = Array.from({ length: 5 }, (_, i) => context.year - 4 + i);
  const rows = summarizeSeriesForReport(context);
  const first = years[0];
  // FTT é denominador (força de trabalho), não resultado de gestão: fica fora do ranking
  const changes = rows
    .filter(r => !r.ind.startsWith('FTT'))
    .map(r => {
      const a = r.serie[String(first)];
      const b = r.serie[String(context.year)];
      return typeof a === 'number' && typeof b === 'number' && a > 0
        ? { r, a, b, pct: Math.round(((b - a) / a) * 1000) / 10 }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
  const reductions = changes.filter(c => c.pct < 0).sort((x, y) => x.pct - y.pct).slice(0, 4);
  const increases = changes.filter(c => c.pct > 0).sort((x, y) => y.pct - x.pct).slice(0, 3);
  const current = rows.filter(r => typeof r.serie[String(context.year)] === 'number');
  const partial = current.filter(r => r.mensal && r.mesesNoAno > 0 && r.mesesNoAno < 12);
  const alerts = context.alerts.filter(a => !a.resolved);
  const line = (c: (typeof changes)[number]) => `${c.r.ind}: ${fmt(c.a)} → ${fmt(c.b)} ${c.r.un} (${c.pct > 0 ? '+' : ''}${c.pct}%)`;

  const table = current
    .map(r => `• ${r.ind}: ${fmt(r.serie[String(context.year)] as number)} ${r.un}${r.mensal && r.mesesNoAno > 0 && r.mesesNoAno < 12 ? ` (${r.mesesNoAno} meses)` : ''}`)
    .join('\n');

  const sections: AnnualReportSection[] = [
    { id: 1, title: '1. Apresentação', category: 'INSTITUCIONAL', statusBadge: 'Dados do iPLS',
      content: `Relatório de acompanhamento do Plano de Logística Sustentável da ${context.organizationName}, exercício ${context.year}, elaborado a partir dos dados registrados no iPLS (Resoluções CNJ nº 400/2021 e nº 594/2024).\n\nEste texto foi gerado automaticamente sem IA e contém apenas números calculados dos dados. A análise qualitativa deve ser complementada pela unidade.` },
    { id: 2, title: '2. Base de dados', category: 'METODOLOGIA',
      content: `Foram considerados ${rows.length} indicadores principais com dados entre ${first} e ${context.year}.${partial.length ? ` No exercício, ${partial.length} indicador(es) mensal(is) têm meses não informados.` : ''} Há ${alerts.length} alerta(s) de qualidade de dados ativo(s) para o órgão.` },
    { id: 3, title: `3. Resultados de ${context.year}`, category: 'DESEMPENHO',
      content: table || 'Não há dados registrados para o exercício.' },
    { id: 4, title: `4. Evolução ${first}–${context.year}`, category: 'HISTORICO',
      content: [
        reductions.length ? `Maiores reduções:\n${reductions.map(c => `• ${line(c)}`).join('\n')}` : '',
        increases.length ? `Maiores aumentos:\n${increases.map(c => `• ${line(c)}`).join('\n')}` : ''
      ].filter(Boolean).join('\n\n') || `Não há dados suficientes em ${first} e ${context.year} para comparação.` },
    { id: 5, title: '5. Plano de ação', category: 'PLANO_ACAO',
      content: context.actionPlans.length
        ? context.actionPlans.map(a => `• ${a.title} — ${a.status}, ${a.percentageComplete}%`).join('\n')
        : 'Nenhuma ação cadastrada no iPLS para o órgão.' },
    { id: 6, title: '6. Justiça Carbono Zero (Resolução CNJ nº 594/2024)', category: 'DESCARBONIZACAO',
      content: (() => {
        const gee = rows.filter(r => /GEE-Esc3|GEE1e2/.test(r.ind));
        return gee.length
          ? gee.map(r => `• ${r.ind}: ${years.map(y => `${y}: ${typeof r.serie[String(y)] === 'number' ? fmt(r.serie[String(y)] as number) : 'n/d'}`).join('; ')} ${r.un}`).join('\n')
          : 'Não há dados de inventário de emissões registrados para o órgão.';
      })() },
    { id: 7, title: '7. Pontos de atenção', category: 'CONCLUSAO',
      content: alerts.length
        ? alerts.slice(0, 15).map(a => `• ${a.indicatorName} (${a.year}${a.month ? `/${a.month}` : ''}): ${a.message}`).join('\n')
        : 'Nenhum alerta de qualidade de dados ativo.' }
  ];

  return {
    sections,
    executiveSummary: `Relatório gerado sem IA para a ${context.organizationName} (${context.year}), apenas com números do iPLS. ${reductions.length ? `Maior redução no período: ${line(reductions[0])}.` : ''} ${increases.length ? `Maior aumento: ${line(increases[0])}.` : ''}`.trim(),
    keyAchievements: reductions.map(line),
    criticalAlerts: alerts.filter(a => a.severity === 'CRITICA').slice(0, 5).map(a => `${a.indicatorName}: ${a.message}`),
    priorityRecommendations: [
      'Confirmar com as unidades os valores sinalizados nos alertas de qualidade de dados.',
      'Cadastrar metas do exercício para os indicadores sem meta.',
      partial.length ? 'Completar os meses não informados dos indicadores mensais.' : 'Manter a regularidade dos lançamentos mensais.'
    ],
    historicalHighlights: increases.map(line),
    generatedAt: new Date().toISOString(),
    aiModel: 'Sem IA (somente dados do iPLS)'
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

  // 1. Base de conhecimento: a base embutida (ragEngine) era de DEMONSTRAÇÃO (faturas,
  //    processos SEI e trechos normativos fictícios) e foi desativada. Reative quando
  //    houver documentos reais carregados no iPLS.
  const retrievedChunks: ReturnType<typeof queryRAGKnowledge> = [];

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
  const sevRank = (a: InconsistencyAlert) => (a.severity === 'CRITICA' ? 0 : a.severity === 'ATENCAO' ? 1 : 2);
  const shownIds = new Set(displayedIndicators.map(i => i.indicator.id));
  const activeAlerts = context.alerts
    .filter(a => !a.resolved && (a.year === context.year || a.year === context.year - 1))
    .sort((a, b) => Number(!shownIds.has(a.indicatorId)) - Number(!shownIds.has(b.indicatorId)) || sevRank(a) - sevRank(b))
    .slice(0, 10);
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
    details: 'Medições do órgão registradas no iPLS (Painel Unificado de Sustentabilidade da JF1 e lançamentos)'
  });

  if (relevantActions.length > 0) {
    sources.push({
      title: `Plano de Ação Socioambiental (${context.organizationName})`,
      reference: `${relevantActions.length} ação(ões) relacionada(s) (${context.year})`,
      type: 'DOCUMENTO',
      details: 'Monitoramento contínuo de metas físicas e cronogramas executivos'
    });
  }

  // 5. System instructions for judicial AI grounding
  const systemInstruction = `Você é o assessor de sustentabilidade e governança do Plano de Logística Sustentável (PLS) da Justiça Federal da 1ª Região, respondendo sobre o órgão: ${context.organizationName}.
Fundamente as respostas nas normas do CNJ (Resolução CNJ nº 400/2021 e Resolução CNJ nº 594/2024 - Programa Justiça Carbono Zero) e nos dados do sistema iPLS fornecidos no CONTEXTO.

Regras obrigatórias:
1. Responda em português do Brasil, com linguagem executiva, objetiva e clara.
2. Use SOMENTE os números do CONTEXTO. Nunca invente valores, metas, causas, contratos, processos SEI ou eventos. Se a informação não estiver no contexto, diga claramente que ela não está disponível no iPLS.
3. Quando não houver meta cadastrada (meta 0), diga que o órgão ainda não cadastrou meta, em vez de avaliar cumprimento.
4. Se o exercício estiver em andamento, deixe claro que os valores são parciais (meses informados).
5. Refira-se às Resoluções do CNJ apenas pelo número (ex.: Resolução CNJ nº 400/2021). NÃO cite artigos, parágrafos, incisos ou processos, nem descreva o que a norma determina, a menos que o trecho esteja no CONTEXTO.
7. Não mencione ações, projetos ou obras que não estejam listados no CONTEXTO.
6. Use Markdown (títulos curtos, negrito, listas e pequenas tabelas quando ajudar).`;

  const contextPrompt = `=== CONTEXTO DO iPLS (${context.organizationName} - ${context.year}) ===
Órgão: ${context.organizationName}
Exercício de Referência: ${context.year}

[1. DOCUMENTOS NORMATIVOS]
${retrievedChunks.length ? retrievedChunks.map(c => `• ${c.documentTitle} (${c.section}):\n"${c.content}"`).join('\n\n') : 'Nenhum documento normativo carregado no iPLS (cite as resoluções apenas pelo número).'}

[2. DADOS ESTRUTURADOS DE INDICADORES AUDITADOS]
${displayedIndicators.map(i => {
  const ind = i.indicator;
  const res = i.result;
  const hasData = res.monthsReported > 0;
  const isMonthly = ind.periodicity === 'MENSAL';
  const coverage = !hasData
    ? 'sem dados informados no exercício'
    : isMonthly
      ? `${res.monthsReported} de 12 meses informados${res.monthsReported < 12 ? ' (exercício parcial)' : ' (exercício completo)'}`
      : 'valor anual informado';
  const lines = [
    `• ${ind.code} - ${ind.name} (${ind.acronym || ''}; unidade: ${ind.unit}; ${isMonthly ? 'mensal' : 'anual'})`,
    `  - Cobertura: ${coverage}`
  ];
  if (hasData) {
    lines.push(`  - Realizado no exercício: ${res.accumulatedValue.toLocaleString('pt-BR')} ${ind.unit}`);
    if (isMonthly && res.monthsReported < 12) {
      lines.push(`  - Projeção para 12 meses: ${res.annualProjection.toLocaleString('pt-BR')} ${ind.unit}`);
    }
  }
  if (i.target) {
    lines.push(`  - Meta ${context.year}: ${res.targetValue.toLocaleString('pt-BR')} ${ind.unit} (linha de base: ${res.baselineValue.toLocaleString('pt-BR')})`);
    if (hasData) lines.push(`  - Situação frente à meta: ${res.status} (${res.statusReason})`);
  } else {
    lines.push(`  - Meta ${context.year}: NÃO CADASTRADA (não avalie cumprimento de meta)`);
  }
  return lines.join('\n');
}).join('\n')}

[3. ALERTAS E INCONSISTÊNCIAS ATIVAS]
${activeAlerts.length > 0 ? activeAlerts.map(a => `• [${a.severity}] ${a.indicatorName}: ${a.message} (Ação sugerida: ${a.suggestedAction})`).join('\n') : 'Nenhuma inconformidade crítica pendente.'}

[4. AÇÕES EM EXECUÇÃO NO PLANO DE AÇÃO]
${relevantActions.length > 0 ? relevantActions.map(a => `• [${a.status}] ${a.title} - Progresso: ${a.percentageComplete}% (Resp: ${a.responsibleUnit})`).join('\n') : 'Nenhuma ação do plano de ação relacionada à pergunta.'}

Pergunta do Usuário / Gestor:
"${query}"`;

  // Dynamic suggested follow-up questions
  const suggestedQuestions: string[] = [];
  if (queryLower.includes('energia')) {
    suggestedQuestions.push('Como evoluiu o consumo de energia nos últimos anos?');
    suggestedQuestions.push('Qual foi a energia injetada na rede (kWhI) no exercício?');
  } else if (queryLower.includes('carbono') || queryLower.includes('gee')) {
    suggestedQuestions.push('Qual é o balanço dos Escopos 1, 2 e 3 na Resolução CNJ 594/2024?');
    suggestedQuestions.push('Quais dados de inventário de GEE estão disponíveis?');
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
    const settings = localLLMSettings();
    const model = localConfig?.model || settings.model;
    try {
      const { text, model: usedModel } = await callLocalLLM(
        [
          { role: 'system', content: systemInstruction },
          ...conversationHistory.slice(-4).map(h => ({
            role: (h.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
            content: h.content
          })),
          { role: 'user', content: contextPrompt }
        ],
        { overrides: localConfig }
      );
      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        text,
        sources,
        suggestedQuestions,
        providerUsed: 'local',
        modelUsed: `IA local (${usedModel})`
      };
    } catch (err: any) {
      console.warn('[LocalAI] Falha na IA local:', err?.message);
      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        text: `> ⚠️ **IA local indisponível:** ${err?.message || 'serviço offline'}.\n\n${factualFallbackText(context, displayedIndicators)}`,
        sources,
        suggestedQuestions,
        providerUsed: 'local',
        modelUsed: `IA local (${model || 'não configurada'}) — resposta do motor interno`
      };
    }
  }

  // =========================================================================
  // EXECUTION MODE 3: HEURISTIC GROUNDED RAG ENGINE (OFFLINE FALLBACK)
  // =========================================================================
  return {
    id: `msg-${Date.now()}`,
    sender: 'assistant',
    timestamp: new Date().toISOString(),
    text: factualFallbackText(context, displayedIndicators),
    sources,
    suggestedQuestions,
    providerUsed: 'heuristic',
    modelUsed: 'Sem IA (somente dados do iPLS)'
  };
}

/** Resposta sem IA: apenas os números do iPLS para os indicadores relacionados à pergunta. */
export function factualFallbackText(
  context: { organizationName: string; year: number; alerts: InconsistencyAlert[] },
  items: { indicator: Indicator; target?: IndicatorTarget; result: ReturnType<typeof calculateIndicatorPerformance> }[]
): string {
  const fmt = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  const rows = items
    .filter(i => i.result.monthsReported > 0)
    .map(i => {
      const r = i.result;
      const ind = i.indicator;
      const mensal = ind.periodicity === 'MENSAL';
      const cobertura = mensal ? ` (${r.monthsReported}/12 meses)` : '';
      const meta = i.target ? ` · meta ${fmt(r.targetValue)} ${ind.unit}` : ' · sem meta cadastrada';
      return `| ${ind.acronym || ind.code} — ${ind.name} | ${fmt(r.accumulatedValue)} ${ind.unit}${cobertura}${meta} |`;
    });
  const alerts = context.alerts.filter(a => !a.resolved && items.some(i => i.indicator.id === a.indicatorId)).slice(0, 5);
  return [
    `**Dados do iPLS — ${context.organizationName}, ${context.year}** (resposta sem IA, apenas números registrados)`,
    rows.length ? `\n| Indicador | Valor no exercício |\n|---|---|\n${rows.join('\n')}` : '\nNão há dados registrados no exercício para os indicadores relacionados à pergunta.',
    alerts.length ? `\n**Alertas de qualidade de dados:**\n${alerts.map(a => `- ${a.indicatorName}: ${a.message}`).join('\n')}` : ''
  ].join('\n');
}
