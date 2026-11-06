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

export type LLMMessage = { role: 'system' | 'user' | 'assistant'; content: string };

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

/** Extrai o primeiro objeto JSON de um texto (modelos locais às vezes cercam o JSON com texto ou ```json). */
export function extractJson<T = any>(text: string): T {
  const cleaned = stripReasoning(text).replace(/```(?:json)?/gi, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Resposta da IA não contém JSON.');
  return JSON.parse(cleaned.slice(start, end + 1));
}
