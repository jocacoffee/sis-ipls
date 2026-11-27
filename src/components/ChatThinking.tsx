import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Indicador de espera do chat: frases que se alternam ("Pensando…", "Consultando os dados do
 * iPLS…", "Buscando na internet…") com uma animação de "cérebro trabalhando" e o tempo decorrido.
 *
 * As frases mostram as etapas que o agente costuma percorrer, não a etapa exata em andamento
 * (a resposta chega de uma vez). Com prefers-reduced-motion, as animações param e só o texto muda.
 */

export type ChatThinkingMode = 'local' | 'gemini' | 'heuristic';

const PHRASES: Record<ChatThinkingMode, string[]> = {
  local: [
    'Pensando',
    'Entendendo a pergunta',
    'Consultando os dados do iPLS',
    'Calculando indicadores e metas',
    'Cruzando órgãos e exercícios',
    'Organizando a resposta'
  ],
  gemini: ['Pensando', 'Consultando as normas do CNJ', 'Cruzando com as medições do PLS', 'Organizando a resposta'],
  heuristic: ['Analisando a base do iPLS', 'Consultando as normas do CNJ', 'Organizando a resposta']
};

const WEB_PHRASES = ['Buscando na internet', 'Lendo as fontes encontradas'];

const STEP_MS = 2600;

export const ChatThinking: React.FC<{ mode: ChatThinkingMode; model?: string | null; webSearch?: boolean }> = ({
  mode,
  model,
  webSearch
}) => {
  const phrases = mode === 'local' && webSearch
    ? [...PHRASES.local.slice(0, 4), ...WEB_PHRASES, ...PHRASES.local.slice(4)]
    : PHRASES[mode];
  const [step, setStep] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const t0 = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - t0;
      setSeconds(Math.floor(elapsed / 1000));
      // Percorre as frases uma vez; depois alterna entre as do meio (sem voltar ao "Pensando")
      const i = Math.floor(elapsed / STEP_MS);
      const loopFrom = 1;
      setStep(i < phrases.length ? i : loopFrom + ((i - phrases.length) % (phrases.length - loopFrom)));
    }, 250);
    return () => clearInterval(timer);
  }, [phrases.length]);

  const phrase = phrases[Math.min(step, phrases.length - 1)];

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

      {/* Ícone: brilho central, anel pulsando e dois pontos orbitando */}
      <div className="relative w-10 h-10 shrink-0" aria-hidden="true">
        <span className="ipls-think-ping absolute inset-0 rounded-full bg-emerald-400/25 animate-ping" />
        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm" />
        <span className="ipls-think-orbit absolute inset-[-3px]">
          <span className="absolute left-1/2 top-0 -ml-[3px] w-1.5 h-1.5 rounded-full bg-emerald-300" />
          <span className="absolute left-1/2 bottom-0 -ml-[2px] w-1 h-1 rounded-full bg-teal-200" />
        </span>
        <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-white" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <span key={step} className="ipls-think-in truncate">{phrase}</span>
          <span className="inline-flex gap-0.5 pl-0.5">
            {[0, 1, 2].map(i => (
              <span key={i} className="ipls-think-dot inline-block w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </span>
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950/60">
          <div className="ipls-think-bar h-full w-2/5 rounded-full bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
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
