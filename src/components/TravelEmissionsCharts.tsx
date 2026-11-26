import React from 'react';
import { Plane, Route, MapPin, Building2, CalendarDays, TreePine } from 'lucide-react';
import { TREES_PER_TCO2E } from '../services/ghgInventory';

/** Estatísticas de viagens do ano, somadas trecho a trecho (vindas de /api/ghg/inventory). */
export interface TravelYearStats {
  trips: number;
  km: number;
  tCO2e: number;
  byDestination: Record<string, number>;
  byRoute: Record<string, { trips: number; t: number }>;
  byCategory: Record<string, { trips: number; km: number; t: number }>;
  byMonth: { trips: number; t: number }[];
  byOrg: { orgId: string; acronym: string; trips: number; t: number }[];
  panelRefreshedAt?: string;
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const nf = (v: number, d = 0) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const card = 'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900';
// Faixas de distância são ordinais: uma só cor, do claro (curta) ao escuro (longa)
const CATEGORY_ORDER = ['Curta', 'Média', 'Longa'];
const CATEGORY_COLOR: Record<string, string> = { Curta: '#6ee7b7', Média: '#059669', Longa: '#064e3b' };

const Title: React.FC<{ icon: React.ReactNode; children: React.ReactNode; note?: string }> = ({ icon, children, note }) => (
  <div className="mb-3">
    <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
      {icon}
      {children}
    </div>
    {note && <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{note}</div>}
  </div>
);

/** Barras horizontais ordenadas (uma série: sem legenda; o título nomeia a medida). */
const HBars: React.FC<{ items: { label: string; value: number; hint: string }[]; format: (v: number) => string }> = ({ items, format }) => {
  const max = Math.max(...items.map(i => i.value), 0) || 1;
  if (!items.length) return <div className="text-xs text-slate-400">Sem dados.</div>;
  return (
    <ul className="space-y-1.5" role="list">
      {items.map(i => (
        <li key={i.label} className="group grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-2 text-[11px]" title={i.hint}>
          <span className="truncate text-slate-600 dark:text-slate-300">{i.label}</span>
          <span className="h-3 rounded-r bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <span
              className="block h-full rounded-r bg-emerald-600 group-hover:bg-emerald-700 dark:bg-emerald-500 transition-colors"
              style={{ width: `${Math.max(2, (i.value / max) * 100)}%` }}
            />
          </span>
          <span className="font-mono tabular-nums text-slate-700 dark:text-slate-200">{format(i.value)}</span>
        </li>
      ))}
    </ul>
  );
};

/** Barras verticais (por unidade ou por mês). */
const VBars: React.FC<{ items: { label: string; value: number; hint: string }[]; format: (v: number) => string }> = ({ items, format }) => {
  const max = Math.max(...items.map(i => i.value), 0) || 1;
  return (
    <div className="flex items-end gap-1.5 h-44 pt-5" role="list">
      {items.map(i => (
        <div key={i.label} className="group flex-1 min-w-0 flex flex-col items-center justify-end h-full" title={i.hint} role="listitem">
          <span className="text-[10px] font-mono tabular-nums text-slate-600 dark:text-slate-300 mb-0.5 whitespace-nowrap">
            {i.value > 0 ? format(i.value) : ''}
          </span>
          <span
            className="w-full max-w-[2.5rem] rounded-t bg-emerald-600 group-hover:bg-emerald-700 dark:bg-emerald-500"
            style={{ height: `${i.value > 0 ? Math.max(2, (i.value / max) * 85) : 0}%` }}
          />
          <span className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate w-full text-center">{i.label}</span>
        </div>
      ))}
    </div>
  );
};

/** Rosca da participação das faixas de distância no número de trechos, com legenda e rótulos. */
const Donut: React.FC<{ parts: { label: string; value: number; km: number; t: number }[] }> = ({ parts }) => {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const r = 42;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 110 110" className="w-28 h-28 shrink-0" role="img" aria-label="Trechos por faixa de distância">
        <circle cx="55" cy="55" r={r} fill="none" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="16" />
        {parts.map(p => {
          const len = (p.value / total) * c;
          const el = (
            <circle
              key={p.label}
              cx="55" cy="55" r={r} fill="none"
              stroke={CATEGORY_COLOR[p.label] || '#94a3b8'}
              strokeWidth="16"
              strokeDasharray={`${Math.max(0, len - 2)} ${c}`}
              strokeDashoffset={-acc}
              transform="rotate(-90 55 55)"
            >
              <title>{`${p.label}: ${nf(p.value)} trechos (${nf((p.value / total) * 100, 1)}%), ${nf(p.km)} km, ${nf(p.t, 2)} tCO₂e`}</title>
            </circle>
          );
          acc += len;
          return el;
        })}
      </svg>
      <ul className="space-y-1.5 text-[11px]">
        {parts.map(p => (
          <li key={p.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: CATEGORY_COLOR[p.label] || '#94a3b8' }} />
            <span className="text-slate-700 dark:text-slate-200 font-semibold">{p.label}</span>
            <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {nf(p.value)} ({nf((p.value / total) * 100, 1)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const TravelEmissionsCharts: React.FC<{ stats: TravelYearStats; year: number; consolidated: boolean }> = ({ stats, year, consolidated }) => {
  const destinations = Object.entries(stats.byDestination)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value, hint: `${label}: ${nf(value)} trechos` }));
  const routes = Object.entries(stats.byRoute)
    .sort((a, b) => b[1].t - a[1].t)
    .slice(0, 8)
    .map(([label, v]) => ({ label, value: v.t, hint: `${label}: ${nf(v.t, 2)} tCO₂e em ${nf(v.trips)} trechos` }));
  const categories = [
    ...CATEGORY_ORDER.filter(k => stats.byCategory[k]),
    ...Object.keys(stats.byCategory).filter(k => !CATEGORY_ORDER.includes(k))
  ].map(k => ({ label: k, value: stats.byCategory[k].trips, km: stats.byCategory[k].km, t: stats.byCategory[k].t }));
  const byUnit = [...stats.byOrg]
    .sort((a, b) => b.t - a.t)
    .map(o => ({ label: o.acronym, value: o.t, hint: `${o.acronym}: ${nf(o.t, 2)} tCO₂e em ${nf(o.trips)} trechos` }));
  const byMonth = stats.byMonth.map((m, i) => ({ label: MONTHS[i], value: m.t, hint: `${MONTHS[i]}/${year}: ${nf(m.t, 2)} tCO₂e em ${nf(m.trips)} trechos` }));
  const trees = stats.tCO2e * TREES_PER_TCO2E;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Plane className="w-4 h-4 text-blue-500" /> Viagens a serviço — {year}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Escopo 3, viagens aéreas, do painel de BI de viagens; emissões somadas trecho a trecho.
            {stats.panelRefreshedAt && ` Painel atualizado em ${new Date(stats.panelRefreshedAt).toLocaleDateString('pt-BR')}.`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Trechos', value: nf(stats.trips) },
          { label: 'Distância total', value: `${nf(stats.km)} km` },
          { label: 'Emissão total', value: `${nf(stats.tCO2e, 2)} tCO₂e` },
          { label: 'Árvores equivalentes', value: nf(trees), icon: true }
        ].map(k => (
          <div key={k.label} className={card}>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              {k.icon && <TreePine className="w-3.5 h-3.5 text-emerald-600" />}
              {k.label}
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={card}>
          <Title icon={<MapPin className="w-4 h-4 text-emerald-600" />} note="Trechos por cidade de destino">Destinos mais escolhidos</Title>
          <HBars items={destinations} format={v => nf(v)} />
        </div>
        <div className={card}>
          <Title icon={<Route className="w-4 h-4 text-emerald-600" />} note="Participação no número de trechos (até 500 km, até 3.700 km, acima)">Faixa de distância</Title>
          {categories.length ? <Donut parts={categories} /> : <div className="text-xs text-slate-400">Sem dados.</div>}
        </div>
        <div className={card}>
          <Title icon={<Plane className="w-4 h-4 text-emerald-600" />} note="Trajetos de maior emissão (tCO₂e)">Emissão por trajeto</Title>
          <HBars items={routes} format={v => nf(v, 1)} />
        </div>
      </div>

      <div className={card}>
        {consolidated ? (
          <>
            <Title icon={<Building2 className="w-4 h-4 text-emerald-600" />} note="tCO₂e no ano, por órgão">Emissão por unidade</Title>
            <VBars items={byUnit} format={v => nf(v, 1)} />
          </>
        ) : (
          <>
            <Title icon={<CalendarDays className="w-4 h-4 text-emerald-600" />} note="tCO₂e por mês de partida">Emissão por mês</Title>
            <VBars items={byMonth} format={v => nf(v, 1)} />
          </>
        )}
      </div>
    </div>
  );
};
