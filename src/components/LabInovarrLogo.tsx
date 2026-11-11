import React, { useState, useEffect } from 'react';
import { X, Users } from 'lucide-react';

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
 * Modal explicativo Sobre o Lab InovaRR
 */
export const LabInovarrModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lab-inovarr-title"
    >
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header do Modal */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-3.5">
            <div className="p-2 bg-slate-800/90 rounded-xl border border-slate-700/80 shadow-inner shrink-0">
              <LabInovarrSymbol size={38} className="drop-shadow-sm" />
            </div>
            <div>
              <h2 id="lab-inovarr-title" className="text-lg font-bold text-white tracking-tight">
                Sobre o Lab InovaRR
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Laboratório de Inovação • Seção Judiciária de Roraima (SJRR)
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-lab-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com a Descrição e Envolvidos */}
        <div className="p-5 sm:p-6 space-y-4 text-sm leading-relaxed text-slate-300">
          <p>
            O <strong className="text-white font-semibold">Lab InovaRR</strong> – Laboratório de Inovação da Seção Judiciária de Roraima atua na identificação de desafios institucionais e na criação, experimentação e validação de soluções inovadoras para aprimorar os serviços da instituição.
          </p>

          <div className="p-3.5 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-emerald-200/90 text-xs">
            <p className="font-medium">
              Este sistema foi desenvolvido no âmbito do <span className="font-semibold text-emerald-100">Lab InovaRR</span>, em colaboração com a <span className="font-semibold text-emerald-100">SEMAD – Seção de Modernização Administrativa da SJRR</span>.
            </p>
          </div>

          <div className="pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              Principais envolvidos
            </h3>
            
            <div className="space-y-2.5">
              <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Lab InovaRR
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Desenvolvimento e coordenação do projeto.
                </p>
              </div>

              <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  SEMAD – Seção de Modernização Administrativa
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Demanda e validação da solução.
                </p>
              </div>

              <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  NUTEC
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Participação técnica e institucional.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé com botão fechar */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            id="btn-confirm-close-lab-modal"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Badge elegante para o rodapé do sistema: "Desenvolvido pelo Lab InovaRR" com o logo,
 * agora clicável para exibir o pop-up explicativo
 */
export const LabInovarrFooterBadge: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        id="btn-lab-inovarr-badge"
        onClick={() => setIsModalOpen(true)}
        className={`group inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 shadow-sm transition-all hover:border-emerald-500/50 hover:bg-slate-800 hover:shadow-md cursor-pointer text-left focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50 ${className}`}
        title="Clique para saber mais sobre o Lab InovaRR"
      >
        <LabInovarrSymbol size={22} className="drop-shadow-sm group-hover:scale-105 transition-transform" />
        <span className="text-slate-300 text-xs font-medium">
          Desenvolvido pelo{' '}
          <span className="text-white font-bold tracking-tight group-hover:text-emerald-400 transition-colors">
            Lab Inova<span className="text-white font-extrabold group-hover:text-emerald-400">RR</span>
          </span>
        </span>
      </button>

      <LabInovarrModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
