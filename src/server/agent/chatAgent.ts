/**
 * Agente do chat do iPLS: o modelo local decide quais ferramentas (agent/tools.ts) chamar,
 * recebe os resultados e só então responde. Assim os números vêm sempre da base do iPLS,
 * na medida exata da pergunta, em vez de um contexto fixo enviado de uma vez.
 *
 * Somente leitura: nenhuma ferramenta grava dados.
 *
 * Variáveis de ambiente:
 *   AI_AGENT=off          desliga o agente (volta ao chat com contexto fixo)
 *   AI_AGENT_MAX_STEPS    rodadas de ferramentas por pergunta (padrão 6)
 */
import type { ChatMessage } from '../../types';
import { AgentMessage, callLocalLLMWithTools, localLLMSettings, ToolCall, ToolSpec } from '../localLLM';
import { runTool, TOOLS } from './tools';

export const agentEnabled = () => (process.env.AI_AGENT || '').toLowerCase() !== 'off';

const MAX_STEPS = () => Math.min(10, Math.max(1, Number(process.env.AI_AGENT_MAX_STEPS || 6)));
/** Tamanho máximo de cada resultado de ferramenta devolvido ao modelo (caracteres). */
const MAX_RESULT_CHARS = 5000;

export const toolSpecs = (): ToolSpec[] =>
  TOOLS.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }));

export interface AgentTrace {
  tool: string;
  args: unknown;
  ok: boolean;
  ms: number;
}

export interface ChatAgentInput {
  query: string;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
  organizationAcronym: string;
  organizationName: string;
  isConsolidated: boolean;
  year: number;
}

function systemPrompt(input: ChatAgentInput): string {
  const today = new Date().toLocaleDateString('pt-BR');
  return `Você é o assistente do iPLS, sistema de gestão do Plano de Logística Sustentável (PLS) da Justiça Federal da 1ª Região (Resolução CNJ nº 400/2021).
Hoje é ${today}. O usuário está vendo o órgão ${input.organizationAcronym} (${input.organizationName})${input.isConsolidated ? ', que é o consolidado regional (soma dos órgãos)' : ''} no exercício de ${input.year}.

Como trabalhar:
- Use as ferramentas para obter TODOS os números. Nunca invente valores, metas, causas, ações ou documentos.
- Se a pergunta não indicar órgão ou ano, use ${input.organizationAcronym} e ${input.year}.
- Se não souber o código do indicador, chame buscar_indicadores antes.
- Chame só as ferramentas necessárias; quando já tiver os dados, responda.
- Se uma ferramenta devolver "erro", corrija os argumentos ou explique ao usuário o que faltou.
- Você só consulta dados: não consegue lançar, alterar nem apagar nada. Se pedirem, explique onde fazer isso no iPLS.

Como responder:
- Português do Brasil, linguagem executiva, objetiva. Use Markdown: títulos curtos (###), negrito, listas e tabelas
  (com linha de cabeçalho e separador |---|) quando comparar órgãos, meses ou anos.
- Pode usar emojis com moderação para sinalizar situação: ✅ em dia/conformidade, ⚠️ atenção/pendência parcial,
  🔴 risco/sem lançamento, 📈 alta, 📉 queda, 💡 recomendação. No máximo um por linha.
- Números no formato brasileiro (1.234,5) com a unidade.
- Exercício em andamento: deixe claro que os valores são parciais (meses informados).
- Sem meta cadastrada: diga isso, sem avaliar cumprimento.
- Cite as resoluções do CNJ só pelo número, sem inventar artigos.`;
}

/**
 * Alguns modelos (ex.: Qwen no LM Studio) às vezes ESCREVEM a chamada de ferramenta no texto
 * em vez de devolvê-la estruturada. Reconhece os formatos usuais:
 *   <tool_call>{"name": "x", "arguments": {...}}</tool_call>
 *   <tool_call><function=x><parameter=p>valor</parameter></function></tool_call>
 * Devolve as chamadas encontradas e o texto sem elas.
 */
export function parseTextToolCalls(content: string): { calls: ToolCall[]; rest: string } {
  const calls: ToolCall[] = [];
  const known = new Set(TOOLS.map(t => t.name));
  const add = (name: string, args: Record<string, unknown>) => {
    if (!known.has(name)) return;
    calls.push({
      id: `textcall-${Date.now()}-${calls.length}`,
      type: 'function',
      function: { name, arguments: JSON.stringify(args) }
    });
  };
  const value = (raw: string): unknown => {
    const v = raw.trim();
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  };
  let rest = content;
  // Formato XML: <function=nome> ... <parameter=p>v</parameter> ... </function>
  rest = rest.replace(/<function=([\w-]+)>([\s\S]*?)<\/function>/g, (_m, name: string, body: string) => {
    const args: Record<string, unknown> = {};
    body.replace(/<parameter=([\w-]+)>([\s\S]*?)<\/parameter>/g, (_p: string, k: string, v: string) => {
      args[k] = value(v);
      return '';
    });
    add(name, args);
    return '';
  });
  // Formato JSON dentro de <tool_call>
  rest = rest.replace(/<tool_call>([\s\S]*?)<\/tool_call>/g, (_m, body: string) => {
    const t = body.trim();
    if (t.startsWith('{')) {
      try {
        const j = JSON.parse(t);
        const name = j.name || j.function?.name;
        let args = j.arguments ?? j.parameters ?? j.function?.arguments ?? {};
        if (typeof args === 'string') args = JSON.parse(args);
        if (name) add(String(name), args);
      } catch {
        /* ignora */
      }
    }
    return '';
  });
  rest = rest.replace(/<\/?tool_call>/g, '').trim();
  return { calls, rest };
}

const clip = (s: string) => (s.length > MAX_RESULT_CHARS ? `${s.slice(0, MAX_RESULT_CHARS)}… [resultado truncado: refine a consulta]` : s);

/**
 * Executa a pergunta com o agente. Lança erro se a IA local falhar (o chamador decide o fallback).
 */
export async function runChatAgent(input: ChatAgentInput): Promise<ChatMessage & { trace: AgentTrace[] }> {
  const settings = localLLMSettings();
  const tools = toolSpecs();
  // Orçamento de contexto: ~2,2 caracteres por token, reservando espaço para a resposta
  const budgetChars = Math.max(6000, (settings.contextTokens - 1500) * 2.2);
  const messages: AgentMessage[] = [
    { role: 'system', content: systemPrompt(input) },
    ...(input.conversationHistory || []).slice(-4).map(h => ({
      role: (h.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: String(h.content || '').slice(0, 2000)
    })) as AgentMessage[],
    { role: 'user', content: input.query }
  ];
  const size = () => messages.reduce((s, m) => s + JSON.stringify(m).length, 0) + JSON.stringify(tools).length;

  const trace: AgentTrace[] = [];
  let model = settings.model;
  let answer = '';

  for (let step = 0; step < MAX_STEPS(); step++) {
    const canUseTools = size() < budgetChars;
    const out = await callLocalLLMWithTools(messages, canUseTools ? tools : []);
    model = out.model;
    if (!out.toolCalls.length) {
      // Chamada escrita no texto em vez de estruturada: executa do mesmo jeito
      const parsed = parseTextToolCalls(out.content);
      if (parsed.calls.length && canUseTools) {
        out.toolCalls = parsed.calls;
        out.content = parsed.rest;
      } else {
        answer = parsed.rest;
        if (answer || !parsed.calls.length) break;
      }
    }
    if (!out.toolCalls.length || !canUseTools) {
      answer = parseTextToolCalls(out.content).rest;
      break;
    }
    messages.push({ role: 'assistant', content: out.content || null, tool_calls: out.toolCalls });
    for (const call of out.toolCalls) {
      let args: unknown = {};
      try {
        args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
      } catch {
        args = {};
      }
      const t0 = Date.now();
      const { ok, result } = runTool(call.function.name, args);
      trace.push({ tool: call.function.name, args, ok, ms: Date.now() - t0 });
      messages.push({ role: 'tool', tool_call_id: call.id, content: clip(JSON.stringify(result)) });
    }
  }

  if (!answer) {
    // Esgotou as rodadas: pede a resposta final com o que já foi coletado
    messages.push({ role: 'user', content: 'Responda agora à pergunta original com os dados já obtidos, sem chamar mais ferramentas.' });
    const out = await callLocalLLMWithTools(messages, []);
    answer = parseTextToolCalls(out.content).rest;
  }
  if (!answer) throw new Error('A IA local não produziu resposta.');

  const used = [...new Set(trace.map(t => t.tool))];
  return {
    id: `msg-${Date.now()}`,
    sender: 'assistant',
    timestamp: new Date().toISOString(),
    text: answer,
    sources: [
      {
        title: `Base de dados do iPLS (${input.organizationAcronym})`,
        reference: used.length ? `Consultas: ${used.join(', ')}` : 'Sem consultas à base',
        type: 'DADO_ESTRUTURADO',
        details: `${trace.length} consulta(s) feitas pelo agente`
      }
    ],
    providerUsed: 'local',
    modelUsed: `IA local com ferramentas (${model})`,
    trace
  };
}
