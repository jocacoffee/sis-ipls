import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Indicador de espera do chat: frases da etapa em andamento com uma animação de "cérebro
 * trabalhando" e o tempo decorrido.
 *
 * Com o agente da IA local, a etapa é a real: a tela consulta /api/ai/chat/progress a cada
 * segundo, e "Buscando na internet" só aparece durante uma busca de verdade. Sem essa
 * informação (outros modos ou falha na consulta), alternam-se frases genéricas, sem internet.
 * Com prefers-reduced-motion, as animações param e só o texto muda.
 */

export type ChatThinkingMode = 'local' | 'gemini' | 'heuristic';
type Stage = 'pensando' | 'consultando' | 'internet' | 'lendo' | 'escrevendo';

const STAGE_PHRASES: Record<Stage, string[]> = {
  pensando: ['Pensando', 'Entendendo a pergunta'],
  consultando: ['Consultando os dados do iPLS', 'Calculando indicadores e metas', 'Cruzando órgãos e exercícios'],
  internet: ['Buscando na internet'],
  lendo: ['Lendo as fontes encontradas'],
  escrevendo: ['Analisando os resultados', 'Organizando a resposta']
};

const GENERIC: Record<ChatThinkingMode, string[]> = {
  local: ['Pensando', 'Entendendo a pergunta', 'Analisando', 'Organizando a resposta'],
  gemini: ['Pensando', 'Consultando as normas do CNJ', 'Cruzando com as medições do PLS', 'Organizando a resposta'],
  heuristic: ['Analisando a base do iPLS', 'Consultando as normas do CNJ', 'Organizando a resposta']
};

const STEP_MS = 2600;
const MIN_STAGE_MS = 2000;
const POLL_MS = 1000;

export const ChatThinking: React.FC<{ mode: ChatThinkingMode; model?: string | null; requestId?: string | null }> = ({
  mode,
  model,
  requestId
}) => {
  const [stage, setStage] = useState<Stage | null>(null);
  const [tick, setTick] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const stageStart = useRef(Date.now());
  // Etapas a exibir, em ordem: cada uma fica na tela pelo menos MIN_STAGE_MS, mesmo que no
  // servidor tenha durado milissegundos (ex.: consulta à base), para não sumir entre duas consultas.
  const queue = useRef<Stage[]>([]);
  const shown = useRef<Set<Stage>>(new Set());
  const displayed = useRef<Stage | null>(null);

  // Relógio: tempo decorrido, troca de etapa (fila) e troca de frase dentro da etapa
  useEffect(() => {
    const t0 = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      if (queue.current.length && (!displayed.current || now - stageStart.current >= MIN_STAGE_MS)) {
        const next = queue.current.shift()!;
        displayed.current = next;
        shown.current.add(next);
        stageStart.current = now;
        setStage(next);
      }
      setSeconds(Math.floor((now - t0) / 1000));
      setTick(Math.floor((now - stageStart.current) / STEP_MS));
    }, 250);
    return () => clearInterval(timer);
  }, []);

  // Etapa real do agente (só IA local, com id da pergunta)
  useEffect(() => {
    if (mode !== 'local' || !requestId) return;
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch(`/api/ai/chat/progress?id=${encodeURIComponent(requestId)}`, { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        if (!alive || !j?.stage || !(j.stage in STAGE_PHRASES)) return;
        const q = queue.current;
        // Etapas que aconteceram e ainda não apareceram (ex.: busca rápida na internet)
        for (const s of (Array.isArray(j.seen) ? j.seen : []) as Stage[]) {
          if (s in STAGE_PHRASES && !shown.current.has(s) && !q.includes(s) && displayed.current !== s) q.push(s);
        }
        // Etapa atual por último
        const last = q.length ? q[q.length - 1] : displayed.current;
        if (j.stage !== last) q.push(j.stage as Stage);
      } catch {
        /* sem progresso: mantém as frases genéricas */
      }
    };
    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [mode, requestId]);

  const phrases = stage ? STAGE_PHRASES[stage] : GENERIC[mode];
  // Sem etapa real: percorre as frases genéricas e fica alternando entre as do meio
  const idx = stage
    ? tick % phrases.length
    : tick < phrases.length
      ? tick
      : 1 + ((tick - phrases.length) % Math.max(1, phrases.length - 1));
  const phrase = phrases[idx];
  const web = stage === 'internet' || stage === 'lendo';

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3.5 p-4 bg-white dark:bg-slate-800/60 border border-emerald-200/70 dark:border-emerald-900/60 rounded-2xl max-w-md shadow-2xs"
    >
      <style>{`
        @keyframes ipls-think-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        @keyframes ipls-think-orbit { to { transform: rotate(360deg); } }
        @keyframes ipls-think-dot { 0%, 80%, 100% { opacity: .25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-3px); } }
        @keyframes ipls-think-bar { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
        .ipls-think-in { animation: ipls-think-in .35s ease-out both; }
        .ipls-think-orbit { animation: ipls-think-orbit 2.4s linear infinite; }
        .ipls-think-dot { animation: ipls-think-dot 1.2s ease-in-out infinite; }
        .ipls-think-bar { animation: ipls-think-bar 1.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ipls-think-in, .ipls-think-orbit, .ipls-think-dot, .ipls-think-bar, .ipls-think-ping { animation: none !important; }
        }
      `}</style>

      {/* Ícone: brilho central, anel pulsando e dois pontos orbitando (azul durante a busca na internet) */}
      <div className="relative w-10 h-10 shrink-0" aria-hidden="true">
        <span className={`ipls-think-ping absolute inset-0 rounded-full animate-ping ${web ? 'bg-sky-400/25' : 'bg-emerald-400/25'}`} />
        <span className={`absolute inset-0 rounded-full bg-gradient-to-br shadow-sm ${web ? 'from-sky-500 to-blue-600' : 'from-emerald-500 to-teal-600'}`} />
        <span className="ipls-think-orbit absolute inset-[-3px]">
          <span className={`absolute left-1/2 top-0 -ml-[3px] w-1.5 h-1.5 rounded-full ${web ? 'bg-sky-300' : 'bg-emerald-300'}`} />
          <span className={`absolute left-1/2 bottom-0 -ml-[2px] w-1 h-1 rounded-full ${web ? 'bg-blue-200' : 'bg-teal-200'}`} />
        </span>
        <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-white" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <span key={`${stage}-${idx}`} className="ipls-think-in truncate">{phrase}</span>
          <span className="inline-flex gap-0.5 pl-0.5">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className={`ipls-think-dot inline-block w-1 h-1 rounded-full ${web ? 'bg-sky-600 dark:bg-sky-400' : 'bg-emerald-600 dark:bg-emerald-400'}`}
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </span>
        </div>
        <div className={`mt-1.5 h-1 w-full overflow-hidden rounded-full ${web ? 'bg-sky-100 dark:bg-sky-950/60' : 'bg-emerald-100 dark:bg-emerald-950/60'}`}>
          <div className={`ipls-think-bar h-full w-2/5 rounded-full bg-gradient-to-r from-transparent to-transparent ${web ? 'via-sky-500' : 'via-emerald-500'}`} />
        </div>
        <div className="mt-1 text-[10.5px] text-slate-500 dark:text-slate-400 tabular-nums">
          {mode === 'local' ? `IA local${model ? ` (${model})` : ''}` : mode === 'gemini' ? 'Gemini' : 'Análise local'}
          {seconds >= 3 && ` · ${seconds} s`}
          {mode === 'local' && seconds >= 20 && ' · modelos locais podem levar até 1–2 minutos'}
        </div>
      </div>
    </div>
  );
};
