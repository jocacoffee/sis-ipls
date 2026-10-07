import React from 'react';
import type jsPDF from 'jspdf';
import { BRASAO_REPUBLICA_PNG_DATA_URI } from '../assets/brasaoDataUri';

interface BrasaoDaRepublicaProps {
  size?: number;
  className?: string;
  showSubtitle?: boolean;
}

/**
 * Componente oficial do Brasão das Armas Nacionais da República Federativa do Brasil
 * utilizando a imagem oficial PNG anexada pelo usuário, centralizada com alta fidelidade.
 */
export const BrasaoDaRepublica: React.FC<BrasaoDaRepublicaProps> = ({
  size = 84,
  className = '',
  showSubtitle = false
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <img
        src="/brasao-republica.png"
        alt="Brasão das Armas Nacionais da República Federativa do Brasil"
        className="object-contain drop-shadow-xs transition-transform duration-200 hover:scale-105"
        style={{ width: `${size}px`, height: `${size}px` }}
        loading="eager"
      />

      {showSubtitle && (
        <div className="text-center mt-1.5">
          <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-800">
            República Federativa do Brasil
          </span>
          <span className="block text-[8px] font-semibold uppercase tracking-wider text-slate-500">
            Poder Judiciário Federal
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Insere a imagem oficial PNG do Brasão das Armas Nacionais da República Federativa do Brasil
 * centralizada no topo do documento PDF usando jsPDF com renderização de alta resolução.
 *
 * @param pdf Instância do documento jsPDF
 * @param centerX Coordenada X central em milímetros (ex: pageWidth / 2)
 * @param topY Coordenada Y superior em milímetros
 * @param size Dimensões (largura e altura) em milímetros (padrão: 24mm)
 */
export function drawBrasaoDaRepublicaPdf(
  pdf: jsPDF,
  centerX: number,
  topY: number,
  size: number = 24
): void {
  try {
    const x = centerX - size / 2;
    pdf.addImage(
      BRASAO_REPUBLICA_PNG_DATA_URI,
      'PNG',
      x,
      topY,
      size,
      size,
      undefined,
      'FAST'
    );
  } catch (err) {
    console.warn('[PDF] Erro ao embutir imagem PNG do Brasão:', err);
  }
}
