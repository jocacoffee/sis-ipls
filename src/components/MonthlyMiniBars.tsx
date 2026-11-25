import React from 'react';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface Props {
  /** 12 valores (null = mês sem lançamento). */
  values: (number | null)[];
  unit: string;
  year: number;
  /** Classe de cor do texto (as barras usam currentColor), ex.: "text-blue-500". */
  colorClass?: string;
  /** Meta mensal (linha tracejada), se houver meta cadastrada. */
  monthlyTarget?: number;
}

/**
 * Minigráfico de barras dos 12 meses do exercício para os cards de indicadores.
 * Mês sem lançamento aparece como um traço claro; passe o mouse para ver o valor.
 */
export const MonthlyMiniBars: React.FC<Props> = ({ values, unit, year, colorClass = 'text-emerald-500', monthlyTarget }) => {
  const nums = values.filter((v): v is number => v !== null && Number.isFinite(v));
  const max = Math.max(...nums, monthlyTarget || 0, 0);
  const targetPct = monthlyTarget && max > 0 ? Math.min(100, (monthlyTarget / max) * 100) : null;
  const filled = nums.length;
  const fmt = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: Math.abs(v) >= 100 ? 0 : 2 });

  return (
    <div className="pt-1.5">
      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
        <span>Meses lançados em {year}</span>
        <span className="font-mono font-semibold text-slate-500">{filled}/12</span>
      </div>
      <div className={`relative h-10 flex items-end gap-[3px] ${colorClass}`}>
        {targetPct !== null && (
          <div
            className="absolute left-0 right-0 border-t border-dashed border-amber-500/70 pointer-events-none"
            style={{ bottom: `${targetPct}%` }}
            title={`Meta mensal: ${fmt(monthlyTarget!)} ${unit}`}
          />
        )}
        {values.map((v, i) => {
          const has = v !== null && Number.isFinite(v);
          const h = has && max > 0 ? Math.max(4, ((v as number) / max) * 100) : 0;
          return (
            <div
              key={i}
              className="flex-1 h-full flex items-end group/bar"
              title={`${MONTHS[i]}/${year}: ${has ? `${fmt(v as number)} ${unit}` : 'sem lançamento'}`}
            >
              {has ? (
                <div
                  className="w-full rounded-t-[2px] bg-current opacity-80 group-hover/bar:opacity-100 transition-opacity"
                  style={{ height: `${h}%` }}
                />
              ) : (
                <div className="w-full h-[3px] rounded-full bg-slate-200" />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-[3px] mt-0.5">
        {MONTHS.map((m, i) => (
          <span key={m} className={`flex-1 text-center text-[8px] leading-none ${values[i] !== null ? 'text-slate-500' : 'text-slate-300'}`}>
            {m[0]}
          </span>
        ))}
      </div>
    </div>
  );
};
