import React from 'react';

/**
 * Símbolo do iPLS: o "i" formado pela haste, pelo ponto verde e pela folha.
 * `gapColor` é a cor do fundo onde o símbolo é desenhado (contorno da folha e nervura).
 */
export const IplsSymbol: React.FC<{ size?: number; gapColor?: string; className?: string }> = ({
  size = 40,
  gapColor = '#ffffff',
  className = ''
}) => (
  <svg
    viewBox="-4 0 244 470"
    height={size}
    width={(size * 244) / 470}
    className={`shrink-0 ${className}`}
    role="img"
    aria-label="iPLS"
  >
    <defs>
      <linearGradient id="iplsDot" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#8cc63f" />
        <stop offset="100%" stopColor="#3f9b48" />
      </linearGradient>
      <linearGradient id="iplsStem" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#24607e" />
        <stop offset="100%" stopColor="#0f3f63" />
      </linearGradient>
      <linearGradient id="iplsLeaf" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stopColor="#0b4f4a" />
        <stop offset="55%" stopColor="#2f8a45" />
        <stop offset="100%" stopColor="#8cc63f" />
      </linearGradient>
    </defs>
    {/* ponto do i */}
    <circle cx="114" cy="70" r="58" fill="url(#iplsDot)" />
    {/* haste do i */}
    <rect x="58" y="145" width="102" height="312" rx="24" fill="url(#iplsStem)" />
    {/* base da haste, à direita da folha */}
    <path d="M150,318 L212,318 Q222,318 222,328 L222,432 Q222,460 194,460 L110,460 Z" fill="url(#iplsStem)" />
    {/* folha sobre a haste, com contorno da cor do fundo */}
    <path
      d="M228,190 C140,205 32,262 10,350 C-2,400 20,440 48,460 C132,450 206,395 222,300 C228,262 229,226 228,190 Z"
      fill="url(#iplsLeaf)"
      stroke={gapColor}
      strokeWidth="9"
      strokeLinejoin="round"
    />
    {/* nervura */}
    <path
      d="M44,452 C72,388 118,326 182,276"
      fill="none"
      stroke={gapColor}
      strokeWidth="11"
      strokeLinecap="round"
    />
  </svg>
);

/** Marca para fundo escuro (barra lateral): símbolo + "PLS" e a descrição do sistema. */
export const IplsBrandDark: React.FC = () => (
  <div className="flex items-center gap-2.5 min-w-0">
    <div className="flex items-end gap-1">
      <IplsSymbol size={38} gapColor="#0f172a" />
      <span className="text-[30px] leading-[0.8] font-extrabold tracking-tight text-white">PLS</span>
    </div>
    <div className="min-w-0 border-l border-slate-700 pl-2.5">
      <div className="text-[10px] leading-tight font-semibold text-slate-200">Sistema Inteligente de Gestão</div>
      <div className="text-[9.5px] leading-tight text-slate-400">do Plano de Logística Sustentável</div>
    </div>
  </div>
);
