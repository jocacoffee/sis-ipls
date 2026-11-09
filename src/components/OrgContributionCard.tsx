import { IndicatorInfo } from './IndicatorInfo';
import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Gauge, Loader2, Table2, BarChart3 } from 'lucide-react';
import type { Indicator } from '../types';

interface BreakdownOrg { id: string; acronym: string; name: string; type: string }
interface BreakdownIndicator { id: string; code: string; acronym?: string; name: string; unit: string; periodicity: 'MENSAL' | 'ANUAL'; annex?: Indicator['annex'] }
interface IdsCell { score: number | null; available: number; total: number }
interface Breakdown {
  year: number;
  organizations: BreakdownOrg[];
  indicators: BreakdownIndicator[];
  totals: Record<string, Record<string, { total: number; months: number }>>;
  ids: { consolidated: IdsCell; byOrganization: Record<string, IdsCell> };
}

interface OrgContributionCardProps {
  year: number;
}

const fmt = (v: number, digits = 0) => v.toLocaleString('pt-BR', { maximumFractionDigits: digits });
const fmtPct = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;
const shortLabel = (o: BreakdownOrg) => (o.acronym === 'TRF1-2G' ? '2º Grau' : o.acronym);

/**
 * Contribuição de cada unidade (2º grau e seções) para o consolidado da 1ª Região:
 * participação no consumo/gasto de um indicador e IDS de cada unidade frente ao regional.
 */
export const OrgContributionCard: React.FC<OrgContributionCardProps> = ({ year }) => {
  const [data, setData] = useState<Breakdown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [indicatorId, setIndicatorId] = useState<string>('indicator-6-1'); // CEE
  const [hover, setHover] = useState<{ panel: 'consumo' | 'ids'; orgId: string } | null>(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(null);
    fetch(`/api/consolidated/breakdown?year=${year}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(d => alive && setData(d))
      .catch(e => alive && setError(e.message || 'Falha ao carregar'));
    return () => {
      alive = false;
    };
  }, [year]);

  const indicators = useMemo(
    () => (data?.indicators || []).slice().sort((a, b) => a.code.localeCompare(b.code, 'pt-BR', { numeric: true })),
    [data]
  );
  const indicator = indicators.find(i => i.id === indicatorId) || indicators[0];

  const consumo = useMemo(() => {
    if (!data || !indicator) return null;
    const byOrg = data.totals[indicator.id] || {};
    const rows = data.organizations
      .map(o => ({ org: o, total: byOrg[o.id]?.total ?? null, months: byOrg[o.id]?.months ?? 0 }))
      .filter(r => r.total !== null || r.org.acronym !== 'SJMG');
    const sum = rows.reduce((a, r) => a + (r.total || 0), 0);
    const informed = rows.filter(r => r.total !== null).length;
    const sorted = rows.sort((a, b) => (b.total ?? -1) - (a.total ?? -1));
    const max = Math.max(0, ...sorted.map(r => r.total || 0));
    return { rows: sorted, sum, max, informed };
  }, [data, indicator]);

  const ids = useMemo(() => {
    if (!data) return null;
    const rows = data.organizations
      .filter(o => data.ids.byOrganization[o.id])
      .map(o => ({ org: o, ...data.ids.byOrganization[o.id] }))
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    return { rows, regional: data.ids.consolidated };
  }, [data]);

  if (error) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Não foi possível carregar a contribuição por unidade ({error}).</div>;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900" aria-labelledby="org-contrib-title">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 id="org-contrib-title" className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            Contribuição de cada unidade — 1ª Região ({year})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">2º grau e seções judiciárias. O consolidado é a soma das unidades.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowTable(v => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-pressed={showTable}
        >
          {showTable ? <BarChart3 className="w-3.5 h-3.5" /> : <Table2 className="w-3.5 h-3.5" />}
          {showTable ? 'Ver gráfico' : 'Ver tabela'}
        </button>
      </div>

      {!data ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-10 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* ---------------- Consumo / gasto */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Participação no consumo e nos gastos</h4>
              <label className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <span className="sr-only">Indicador</span>
                <select
                  value={indicator?.id || ''}
                  onChange={e => setIndicatorId(e.target.value)}
                  className="max-w-[260px] rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {indicators.map(i => (
                    <option key={i.id} value={i.id}>{i.acronym || i.code} — {i.name} ({i.unit})</option>
                  ))}
                </select>
                {indicator && <IndicatorInfo indicator={indicator} />}
              </label>
            </div>

            {consumo && indicator && (
              <>
                {showTable ? (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-700">
                        <th className="py-1.5">Unidade</th><th className="py-1.5 text-right">{indicator.unit}</th><th className="py-1.5 text-right">Participação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consumo.rows.map(r => (
                        <tr key={r.org.id} className="border-b border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200">
                          <td className="py-1">{r.org.acronym}</td>
                          <td className="py-1 text-right tabular-nums">{r.total === null ? 'n.d.' : fmt(r.total, 2)}</td>
                          <td className="py-1 text-right tabular-nums">{r.total === null || consumo.sum === 0 ? '—' : fmtPct((r.total / consumo.sum) * 100)}</td>
                        </tr>
                      ))}
                      <tr className="font-semibold text-slate-900 dark:text-white">
                        <td className="py-1">1ª Região</td><td className="py-1 text-right tabular-nums">{fmt(consumo.sum, 2)}</td><td className="py-1 text-right">100%</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <ul className="space-y-[2px]" aria-label={`Participação de cada unidade em ${indicator.name}`}>
                    {consumo.rows.map(r => {
                      const share = r.total !== null && consumo.sum > 0 ? (r.total / consumo.sum) * 100 : null;
                      const width = r.total !== null && consumo.max > 0 ? Math.max(0.5, (r.total / consumo.max) * 100) : 0;
                      const partial = indicator.periodicity === 'MENSAL' && r.total !== null && r.months < 12;
                      const isHover = hover?.panel === 'consumo' && hover.orgId === r.org.id;
                      return (
                        <li
                          key={r.org.id}
                          className={`grid grid-cols-[64px_1fr_132px] items-center gap-2 rounded-md px-1 py-1 ${isHover ? 'bg-slate-50 dark:bg-slate-800/60' : ''}`}
                          onMouseEnter={() => setHover({ panel: 'consumo', orgId: r.org.id })}
                          onMouseLeave={() => setHover(null)}
                          title={`${r.org.name}: ${r.total === null ? 'sem dado' : `${fmt(r.total, 2)} ${indicator.unit}`}${share !== null ? ` (${fmtPct(share)} do total)` : ''}${partial ? ` · ${r.months}/12 meses` : ''}`}
                        >
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{shortLabel(r.org)}</span>
                          <span className="h-3.5 w-full rounded-r-[4px] bg-slate-100 dark:bg-slate-800 overflow-hidden" aria-hidden="true">
                            <span className="block h-full rounded-r-[4px] bg-emerald-600 dark:bg-emerald-500" style={{ width: `${width}%` }} />
                          </span>
                          <span className="text-[11px] tabular-nums text-right text-slate-600 dark:text-slate-300">
                            {r.total === null ? <span className="text-slate-400">sem dado</span> : (
                              <>
                                <strong className="text-slate-900 dark:text-white">{fmtPct(share || 0)}</strong>
                                {' · '}{fmt(r.total)}
                                {partial && <span className="text-slate-400"> ({r.months}m)</span>}
                              </>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                  Total da 1ª Região: <strong>{fmt(consumo.sum, 2)} {indicator.unit}</strong> · {consumo.informed} de {consumo.rows.length} unidades com dado
                  {indicator.periodicity === 'MENSAL' && ' · (Xm) = meses informados no exercício'}
                </p>
              </>
            )}
          </div>

          {/* ---------------- IDS */}
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-emerald-600" />
              IDS de cada unidade e da 1ª Região
            </h4>
            {ids && (
              <>
                {showTable ? (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-700">
                        <th className="py-1.5">Unidade</th><th className="py-1.5 text-right">IDS</th><th className="py-1.5 text-right">Indicadores com dado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ids.rows.map(r => (
                        <tr key={r.org.id} className="border-b border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200">
                          <td className="py-1">{r.org.acronym}</td>
                          <td className="py-1 text-right tabular-nums">{r.score === null ? 'n.d.' : fmtPct(r.score)}</td>
                          <td className="py-1 text-right tabular-nums">{r.available}/{r.total}</td>
                        </tr>
                      ))}
                      <tr className="font-semibold text-slate-900 dark:text-white">
                        <td className="py-1">1ª Região</td>
                        <td className="py-1 text-right tabular-nums">{ids.regional.score === null ? 'n.d.' : fmtPct(ids.regional.score)}</td>
                        <td className="py-1 text-right tabular-nums">{ids.regional.available}/{ids.regional.total}</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <div className="relative">
                    <ul className="space-y-[2px]" aria-label="IDS de cada unidade">
                      {ids.rows.map(r => {
                        const isHover = hover?.panel === 'ids' && hover.orgId === r.org.id;
                        return (
                          <li
                            key={r.org.id}
                            className={`grid grid-cols-[64px_1fr_84px] items-center gap-2 rounded-md px-1 py-1 ${isHover ? 'bg-slate-50 dark:bg-slate-800/60' : ''}`}
                            onMouseEnter={() => setHover({ panel: 'ids', orgId: r.org.id })}
                            onMouseLeave={() => setHover(null)}
                            title={`${r.org.name}: IDS ${r.score === null ? 'n.d.' : fmtPct(r.score)} · ${r.available} de ${r.total} indicadores com dado`}
                          >
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{shortLabel(r.org)}</span>
                            <span className="relative h-3.5 w-full rounded-r-[4px] bg-slate-100 dark:bg-slate-800" aria-hidden="true">
                              <span className="block h-full rounded-r-[4px] bg-emerald-600 dark:bg-emerald-500" style={{ width: `${r.score ?? 0}%` }} />
                              {ids.regional.score !== null && (
                                <span className="absolute top-[-3px] bottom-[-3px] w-0 border-l-2 border-dashed border-slate-700 dark:border-slate-200" style={{ left: `${ids.regional.score}%` }} />
                              )}
                            </span>
                            <span className="text-[11px] tabular-nums text-right text-slate-600 dark:text-slate-300">
                              {r.score === null ? <span className="text-slate-400">n.d.</span> : <strong className="text-slate-900 dark:text-white">{fmtPct(r.score)}</strong>}
                              <span className="text-slate-400"> {r.available}/{r.total}</span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-1.5">
                  <span className="inline-block w-4 border-t-2 border-dashed border-slate-700 dark:border-slate-200" aria-hidden="true" />
                  IDS da 1ª Região: <strong>{ids.regional.score === null ? 'n.d.' : fmtPct(ids.regional.score)}</strong>
                  <span className="text-slate-400">({ids.regional.available}/{ids.regional.total} indicadores)</span>
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  O IDS é um índice (0–100) e não se soma: cada barra é o IDS da unidade calculado com os dados dela. O regional usa os
                  consumos somados e a força de trabalho e a área informadas na fonte do CNJ. Faixas de padronização provisórias.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
