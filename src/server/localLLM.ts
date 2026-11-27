/**
 * IA local (servidor compatível com a API da OpenAI: LM Studio, Ollama, vLLM, LiteLLM).
 *
 * A configuração fica no SERVIDOR (variáveis de ambiente), e não no navegador:
 *   AI_PROVIDER          local | gemini | heuristic  (padrão: local se LOCAL_AI_ENDPOINT
 *                        estiver definido; senão gemini se houver GEMINI_API_KEY; senão heuristic)
 *   LOCAL_AI_ENDPOINT    ex.: http://<servidor-de-ia>:1234/v1
 *   LOCAL_AI_MODEL       ex.: qwen/qwen3.5-9b
 *   LOCAL_AI_API_KEY     opcional (Bearer)
 *   LOCAL_AI_TEMPERATURE padrão 0.1
 *   LOCAL_AI_MAX_TOKENS  padrão 4096
 *   LOCAL_AI_TIMEOUT_S   tempo limite do chat, padrão 120
 *   LOCAL_AI_REPORT_TIMEOUT_S  tempo limite do relatório anual, padrão 600
 *   LOCAL_AI_CONTEXT_TOKENS    contexto do modelo carregado (padrão 8192)
 */
import type { AIProviderMode, LocalAIConfig } from '../types';

const env = process.env;

export interface LocalLLMSettings extends LocalAIConfig {
  maxTokens: number;
  timeoutMs: number;
  reportTimeoutMs: number;
  contextTokens: number;
}

export function localLLMSettings(): LocalLLMSettings {
  return {
    endpoint: (env.LOCAL_AI_ENDPOINT || '').replace(/\/$/, ''),
    model: env.LOCAL_AI_MODEL || '',
    apiKey: env.LOCAL_AI_API_KEY || undefined,
    temperature: env.LOCAL_AI_TEMPERATURE ? Number(env.LOCAL_AI_TEMPERATURE) : 0.1,
    maxTokens: Number(env.LOCAL_AI_MAX_TOKENS || 4096),
    timeoutMs: Number(env.LOCAL_AI_TIMEOUT_S || 120) * 1000,
    reportTimeoutMs: Number(env.LOCAL_AI_REPORT_TIMEOUT_S || 600) * 1000,
    contextTokens: Number(env.LOCAL_AI_CONTEXT_TOKENS || 8192)
  };
}

export function defaultAIProvider(): AIProviderMode {
  const p = (env.AI_PROVIDER || '').toLowerCase();
  if (p === 'local' || p === 'gemini' || p === 'heuristic') return p;
  if (env.LOCAL_AI_ENDPOINT) return 'local';
  if (env.GEMINI_API_KEY) return 'gemini';
  return 'heuristic';
}

/** Configuração pública (sem segredos) para a interface. */
export function publicAIConfig() {
  const s = localLLMSettings();
  return {
    defaultProvider: defaultAIProvider(),
    localAvailable: !!s.endpoint && !!s.model,
    localModel: s.model || null,
    geminiAvailable: !!env.GEMINI_API_KEY
  };
}

/**
 * Tokens disponíveis para a resposta, dado o tamanho do prompt e o contexto do modelo.
 * Estimativa conservadora: ~2,2 caracteres por token (JSON e números em português).
 */
export function responseBudget(promptChars: number, cap: number): number {
  const s = localLLMSettings();
  const promptTokens = Math.ceil(promptChars / 2.2);
  return Math.max(0, Math.min(cap, s.contextTokens - promptTokens - 400));
}

/** Remove blocos de raciocínio (<think>…</think>) que alguns modelos emitem. */
export const stripReasoning = (text: string) => text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

/** Parte de mensagem no formato OpenAI: texto ou imagem (data URL), para modelos com visão. */
export type LLMContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };
export type LLMMessage = { role: 'system' | 'user' | 'assistant'; content: string | LLMContentPart[] };

/**
 * Chama /chat/completions. Lança erro com mensagem clara em caso de falha.
 * `overrides` só deve vir de administradores (testes de outro endpoint/modelo).
 */
export async function callLocalLLM(
  messages: LLMMessage[],
  opts: { timeoutMs?: number; maxTokens?: number; overrides?: Partial<LocalAIConfig> } = {}
): Promise<{ text: string; model: string; usage?: { prompt_tokens?: number; completion_tokens?: number } }> {
  const base = localLLMSettings();
  const endpoint = (opts.overrides?.endpoint || base.endpoint).replace(/\/$/, '');
  const model = opts.overrides?.model || base.model;
  if (!endpoint || !model) throw new Error('IA local não configurada (LOCAL_AI_ENDPOINT e LOCAL_AI_MODEL).');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const apiKey = opts.overrides?.apiKey || base.apiKey;
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? base.timeoutMs;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.overrides?.temperature ?? base.temperature,
        max_tokens: opts.maxTokens ?? base.maxTokens,
        stream: false
      })
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Servidor de IA respondeu HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = await res.json();
    const text = stripReasoning(String(json.choices?.[0]?.message?.content || ''));
    if (!text) throw new Error('A IA local retornou resposta vazia.');
    return { text, model, usage: json.usage };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error(`Tempo limite de ${Math.round(timeoutMs / 1000)} s esgotado aguardando a IA local (${model}).`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ------------------------------------------------------------------ chamada de ferramentas

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

/** Mensagem no formato da API da OpenAI, incluindo chamadas e resultados de ferramentas. */
export type AgentMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

export interface ToolSpec {
  type: 'function';
  function: { name: string; description: string; parameters: unknown };
}

/**
 * Uma rodada do agente: envia a conversa e as ferramentas disponíveis e devolve a resposta
 * do modelo (texto final e/ou pedidos de chamada de ferramenta). Exige modelo com suporte
 * a "tool calling" (ex.: Qwen 2.5/3.x, Llama 3.1+ no LM Studio).
 */
export async function callLocalLLMWithTools(
  messages: AgentMessage[],
  tools: ToolSpec[],
  opts: {
    timeoutMs?: number;
    maxTokens?: number;
    /**
     * Streaming: recebe o texto visível acumulado à medida que o modelo escreve (sem o raciocínio
     * <think>). Deixa de ser chamado quando a resposta vira chamada de ferramenta.
     */
    onText?: (visibleSoFar: string) => void;
  } = {}
): Promise<{ content: string; toolCalls: ToolCall[]; model: string; finishReason?: string }> {
  if (opts.onText) return callLocalLLMStreaming(messages, tools, { ...opts, onText: opts.onText });
  const s = localLLMSettings();
  if (!s.endpoint || !s.model) throw new Error('IA local não configurada (LOCAL_AI_ENDPOINT e LOCAL_AI_MODEL).');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (s.apiKey) headers.Authorization = `Bearer ${s.apiKey}`;
  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? s.timeoutMs;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${s.endpoint}/chat/completions`, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: s.model,
        messages,
        ...(tools.length ? { tools, tool_choice: 'auto' } : {}),
        temperature: s.temperature,
        max_tokens: opts.maxTokens ?? s.maxTokens,
        stream: false
      })
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Servidor de IA respondeu HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = await res.json();
    const choice = json.choices?.[0];
    const msg = choice?.message || {};
    const toolCalls: ToolCall[] = Array.isArray(msg.tool_calls)
      ? msg.tool_calls
          .filter((c: any) => c?.function?.name)
          .map((c: any, k: number) => ({
            id: String(c.id || `call-${Date.now()}-${k}`),
            type: 'function' as const,
            function: {
              name: String(c.function.name),
              arguments: typeof c.function.arguments === 'string' ? c.function.arguments : JSON.stringify(c.function.arguments || {})
            }
          }))
      : [];
    return { content: stripReasoning(String(msg.content || '')), toolCalls, model: s.model, finishReason: choice?.finish_reason };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error(`Tempo limite de ${Math.round(timeoutMs / 1000)} s esgotado aguardando a IA local (${s.model}).`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Texto que pode ir para a tela durante o streaming: sem blocos <think> (nem um <think> ainda
 * aberto) e sem nada a partir de uma chamada de ferramenta escrita no texto.
 */
export function visibleStreamText(raw: string): string {
  let t = raw.replace(/<think>[\s\S]*?<\/think>/gi, '');
  const open = t.search(/<think>/i);
  if (open >= 0) t = t.slice(0, open);
  const call = t.search(/<tool_call>|<function=/);
  if (call >= 0) t = t.slice(0, call);
  return t.replace(/^\s+/, '');
}

/** Igual a callLocalLLMWithTools, com stream=true (SSE da API compatível com a OpenAI). */
async function callLocalLLMStreaming(
  messages: AgentMessage[],
  tools: ToolSpec[],
  opts: { timeoutMs?: number; maxTokens?: number; onText: (visibleSoFar: string) => void }
): Promise<{ content: string; toolCalls: ToolCall[]; model: string; finishReason?: string }> {
  const s = localLLMSettings();
  if (!s.endpoint || !s.model) throw new Error('IA local não configurada (LOCAL_AI_ENDPOINT e LOCAL_AI_MODEL).');
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'text/event-stream' };
  if (s.apiKey) headers.Authorization = `Bearer ${s.apiKey}`;
  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? s.timeoutMs;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${s.endpoint}/chat/completions`, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: s.model,
        messages,
        ...(tools.length ? { tools, tool_choice: 'auto' } : {}),
        temperature: s.temperature,
        max_tokens: opts.maxTokens ?? s.maxTokens,
        stream: true
      })
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Servidor de IA respondeu HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    // Servidor que ignora stream=true e devolve JSON inteiro
    if (!(res.headers.get('content-type') || '').includes('event-stream')) {
      const json = await res.json();
      const msg = json.choices?.[0]?.message || {};
      const content = stripReasoning(String(msg.content || ''));
      const toolCalls = normalizeToolCalls(msg.tool_calls);
      if (!toolCalls.length) opts.onText(visibleStreamText(content));
      return { content, toolCalls, model: s.model, finishReason: json.choices?.[0]?.finish_reason };
    }

    let raw = '';
    let finishReason: string | undefined;
    let toolMode = false;
    const calls: { id?: string; name: string; args: string }[] = [];
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        let chunk: any;
        try {
          chunk = JSON.parse(data);
        } catch {
          continue;
        }
        const choice = chunk.choices?.[0];
        if (!choice) continue;
        if (choice.finish_reason) finishReason = choice.finish_reason;
        const delta = choice.delta || {};
        for (const tc of Array.isArray(delta.tool_calls) ? delta.tool_calls : []) {
          toolMode = true;
          const i = typeof tc.index === 'number' ? tc.index : calls.length;
          const c = (calls[i] ||= { name: '', args: '' });
          if (tc.id) c.id = tc.id;
          if (tc.function?.name) c.name += tc.function.name;
          if (tc.function?.arguments) c.args += tc.function.arguments;
        }
        if (typeof delta.content === 'string' && delta.content) {
          raw += delta.content;
          if (!toolMode) opts.onText(visibleStreamText(raw));
        }
      }
    }
    const toolCalls: ToolCall[] = calls
      .filter(c => c && c.name)
      .map((c, k) => ({ id: c.id || `call-${Date.now()}-${k}`, type: 'function' as const, function: { name: c.name, arguments: c.args || '{}' } }));
    return { content: stripReasoning(raw), toolCalls, model: s.model, finishReason };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error(`Tempo limite de ${Math.round(timeoutMs / 1000)} s esgotado aguardando a IA local (${s.model}).`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeToolCalls(list: unknown): ToolCall[] {
  return Array.isArray(list)
    ? list
        .filter((c: any) => c?.function?.name)
        .map((c: any, k: number) => ({
          id: String(c.id || `call-${Date.now()}-${k}`),
          type: 'function' as const,
          function: {
            name: String(c.function.name),
            arguments: typeof c.function.arguments === 'string' ? c.function.arguments : JSON.stringify(c.function.arguments || {})
          }
        }))
    : [];
}

/** Extrai o primeiro objeto JSON de um texto (modelos locais às vezes cercam o JSON com texto ou ```json). */
export function extractJson<T = any>(text: string): T {
  const cleaned = stripReasoning(text).replace(/```(?:json)?/gi, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Resposta da IA não contém JSON.');
  return JSON.parse(cleaned.slice(start, end + 1));
}
