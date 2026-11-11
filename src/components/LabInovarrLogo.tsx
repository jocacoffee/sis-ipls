import React from 'react';

interface LabInovarrLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
  textColor?: string;
}

/**
 * Símbolo do Lab InovaRR (Laboratório de Inovação da Justiça Federal em Roraima - SJRR)
 */
export const LabInovarrSymbol: React.FC<{
  className?: string;
  size?: number | string;
}> = ({ className = 'w-6 h-6', size }) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      style={style}
      aria-label="Símbolo Lab InovaRR"
    >
      <defs>
        {/* Gradiente da Fita Superior Verde */}
        <linearGradient id="inovaRibbon" x1="0%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#16a34a" />
          <stop offset="60%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>

        {/* Gradiente da Folha Verde Central */}
        <linearGradient id="inovaLeaf" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#15803d" />
          <stop offset="40%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#86efac" />
        </linearGradient>

        {/* Gradiente do Quadrante Laranja */}
        <linearGradient id="inovaOrange" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="70%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>

        {/* Gradiente do Quadrante Vermelho */}
        <linearGradient id="inovaRed" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="60%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>

        {/* Gradiente do Elemento Azul Superior */}
        <linearGradient id="inovaBlue1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        {/* Gradiente do Elemento Azul Inferior */}
        <linearGradient id="inovaBlue2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
      </defs>

      {/* Quadrados/Tecnologia Azuis à Esquerda */}
      <rect x="36" y="44" width="18" height="18" rx="2.5" fill="url(#inovaBlue1)" />
      <rect x="26" y="78" width="22" height="15" rx="2.5" fill="url(#inovaBlue2)" />

      {/* Fita Verde Orgânica Superior que ascende em curva */}
      <path
        d="M74,68 C70,44 74,24 82,10 C96,10 110,30 104,56 C98,54 86,62 74,68 Z"
        fill="url(#inovaRibbon)"
      />

      {/* Pétala / Folha Verde Central que conecta o centro */}
      <path
        d="M48,98 C50,72 72,46 98,46 C94,70 74,96 48,98 Z"
        fill="url(#inovaLeaf)"
      />

      {/* Setor Laranja / Amarelo (Quadrante Superior Direito) */}
      <path
        d="M93,57 C116,59 138,76 138,102 C120,102 93,102 93,102 Z"
        fill="url(#inovaOrange)"
      />

      {/* Setor Vermelho (Quadrante Inferior) */}
      <path
        d="M50,108 C50,126 60,138 78,142 C94,144 97,132 99,108 Z"
        fill="url(#inovaRed)"
      />
    </svg>
  );
};

/**
 * Componente do Logo Oficial do Lab InovaRR com texto
 */
export const LabInovarrLogo: React.FC<LabInovarrLogoProps> = ({
  className = '',
  size = 28,
  showText = true,
  textColor = 'text-slate-200',
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <LabInovarrSymbol size={size} />
      {showText && (
        <span className={`font-semibold tracking-tight text-sm ${textColor}`}>
          Lab Inova<span className="font-extrabold">RR</span>
        </span>
      )}
    </div>
  );
};

/**
 * Badge elegante para o rodapé do sistema: "Desenvolvido pelo Lab InovaRR" com o logo
 */
export const LabInovarrFooterBadge: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  return (
    <div
      className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 shadow-sm transition-all hover:border-slate-600 hover:bg-slate-800 ${className}`}
      title="Laboratório de Inovação da Justiça Federal em Roraima"
    >
      <LabInovarrSymbol size={22} className="drop-shadow-sm" />
      <span className="text-slate-300 text-xs font-medium">
        Desenvolvido pelo{' '}
        <span className="text-white font-bold tracking-tight">
          Lab Inova<span className="text-white font-extrabold">RR</span>
        </span>
      </span>
    </div>
  );
};
