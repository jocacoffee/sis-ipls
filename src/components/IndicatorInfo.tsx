import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import type { Indicator } from '../types';

interface IndicatorInfoProps {
  indicator: Pick<Indicator, 'name' | 'code' | 'acronym' | 'unit' | 'periodicity' | 'annex'>;
  className?: string;
  /** Tamanho do ícone (px). */
  size?: number;
}

const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const WIDTH = 360;

/**
 * Ícone de ajuda com a definição oficial do indicador segundo o Anexo da
 * Res. CNJ nº 400/2021 (redação dada pelas Res. 550/2024, 594/2024 e 641/2025).
 * Abre ao passar o mouse ou ao focar pelo teclado.
 */
export const IndicatorInfo: React.FC<IndicatorInfoProps> = ({ indicator, className = '', size = 14 }) => {
  const btn = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean }>({ top: 0, left: 0, above: false });
  const tipId = `ind-info-${(indicator.acronym || indicator.code).replace(/[^A-Za-z0-9]/g, '')}`;
  const a = indicator.annex;

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const left = Math.min(Math.max(8, r.left - 12), window.innerWidth - WIDTH - 8);
    const above = r.bottom + 320 > window.innerHeight && r.top > 320;
    setPos({ top: above ? r.top - 8 : r.bottom + 8, left, above });
  }, [open]);

  const header =
    !a || a.kind === 'FORA'
      ? 'Indicador local do iPLS'
      : a.kind === 'VARIAVEL'
        ? `Res. CNJ 400/2021 · Anexo · variável do item ${a.item} (${a.parent?.acronym})`
        : `Res. CNJ 400/2021 · Anexo · item ${a.item}`;

  const iplsPer = indicator.periodicity === 'MENSAL' ? 'mensal' : 'anual';
  const annexPer = (a?.periodicity || '').toLowerCase();
  const perDiffers = a?.kind === 'ITEM' && annexPer && !annexPer.startsWith(iplsPer);

  const tip = (
    <div
      id={tipId}
      role="tooltip"
      className="fixed z-[200] rounded-xl border border-slate-200 bg-white p-3 text-left text-[11px] leading-snug text-slate-700 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      style={{ top: pos.top, left: pos.left, width: WIDTH, transform: pos.above ? 'translateY(-100%)' : undefined }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">{header}</div>
      <div className="mt-0.5 text-xs font-bold text-slate-900 dark:text-white">
        {indicator.acronym ? `${indicator.acronym} — ` : ''}{indicator.name}
      </div>

      {!a || a.kind === 'FORA' ? (
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Este indicador não consta do Anexo da Res. CNJ nº 400/2021 vigente. É acompanhado pelo órgão como indicador próprio.
        </p>
      ) : (
        <>
          {a.definition && <p className="mt-2">{cap(a.definition)}</p>}

          {a.kind === 'VARIAVEL' && a.parent && (
            <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-800">
              Usada no indicador <strong>{a.parent.item} {a.parent.acronym}</strong> — {a.parent.title}
              {a.parent.formula && <span className="block mt-0.5 font-mono text-[10px]">{a.parent.formula}</span>}
            </p>
          )}

          {a.kind === 'ITEM' && (
            <dl className="mt-2 grid grid-cols-[92px_1fr] gap-x-2 gap-y-1">
              <dt className="text-slate-500">Unidade</dt><dd>{cap(a.unit)}</dd>
              <dt className="text-slate-500">Periodicidade</dt>
              <dd>
                {cap(a.periodicity)}
                {perDiffers && <span className="text-amber-700 dark:text-amber-400"> (no iPLS: {iplsPer})</span>}
              </dd>
              <dt className="text-slate-500">No PLS-Jud</dt><dd>{cap(a.plsJud)}</dd>
            </dl>
          )}

          {a.formula && (
            <div className="mt-2">
              <div className="text-slate-500">Fórmula</div>
              <div className="font-mono text-[10px] text-slate-800 dark:text-slate-100">{a.formula}</div>
              {a.variables && a.variables.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-[10px] text-slate-600 dark:text-slate-300">
                  {a.variables.slice(0, 8).map(v => (
                    <li key={v.acronym}>
                      <strong className="font-mono">{v.acronym}</strong>: {v.text.length > 110 ? `${v.text.slice(0, 110)}…` : v.text}
                    </li>
                  ))}
                  {a.variables.length > 8 && <li>… e mais {a.variables.length - 8} variáveis</li>}
                </ul>
              )}
            </div>
          )}

          {a.amendments && a.amendments.length > 0 && (
            <p className="mt-2 text-[10px] text-slate-500">Redação/inclusão: {a.amendments.join('; ')}</p>
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={`Sobre o indicador ${indicator.acronym || indicator.name}`}
        aria-describedby={open ? tipId : undefined}
        className={`inline-flex shrink-0 items-center justify-center rounded-full text-slate-400 hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${className}`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={e => {
          e.stopPropagation();
          setOpen(o => !o);
        }}
        onKeyDown={e => e.key === 'Escape' && setOpen(false)}
      >
        <Info style={{ width: size, height: size }} />
      </button>
      {open && createPortal(tip, document.body)}
    </>
  );
};
