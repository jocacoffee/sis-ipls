/**
 * Etapa em andamento de cada pergunta ao chat, para o indicador de espera mostrar o que o agente
 * está realmente fazendo (ex.: "Buscando na internet" só durante uma busca de verdade).
 *
 * Fica só em memória, por pergunta (id gerado no navegador) e por usuário: só quem perguntou
 * consulta a própria etapa. Registros somem ao fim da resposta ou em 10 minutos.
 */

export type ChatStage = 'pensando' | 'consultando' | 'internet' | 'lendo' | 'escrevendo';

interface Entry {
  user: string;
  stage: ChatStage;
  /** Etapas já percorridas (para não repetir frases de algo que não aconteceu). */
  seen: ChatStage[];
  at: number;
}

const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 500;
const entries = new Map<string, Entry>();

export const validRequestId = (id: unknown): id is string => typeof id === 'string' && /^[\w-]{8,64}$/.test(id);

function prune() {
  const now = Date.now();
  for (const [k, e] of entries) if (now - e.at > TTL_MS) entries.delete(k);
  while (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value as string);
}

export function setChatStage(id: string, user: string, stage: ChatStage) {
  prune();
  const e = entries.get(id);
  if (e && e.user !== user) return;
  const seen = e ? (e.seen.includes(stage) ? e.seen : [...e.seen, stage]) : [stage];
  entries.set(id, { user, stage, seen, at: Date.now() });
}

export function getChatStage(id: string, user: string): { stage: ChatStage; seen: ChatStage[] } | null {
  const e = entries.get(id);
  if (!e || e.user !== user || Date.now() - e.at > TTL_MS) return null;
  return { stage: e.stage, seen: e.seen };
}

export function clearChatStage(id: string) {
  entries.delete(id);
}

/** Etapa correspondente a cada ferramenta do agente. */
export const stageForTool = (tool: string): ChatStage =>
  tool === 'buscar_internet' ? 'internet' : tool === 'ler_pagina' ? 'lendo' : 'consultando';
