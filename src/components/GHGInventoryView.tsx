import React, { useMemo } from 'react';
import { Leaf, Car, Zap, Plane, Info, AlertTriangle } from 'lucide-react';
import { Indicator, IndicatorMeasurement } from '../types';
import {
  computeGHGInventory,
  computeGHGSeries,
  commercialFuelFactors,
  FUEL_FACTORS_KG_PER_L,
  sinFactorFor,
  YEAR_FACTORS
} from '../services/ghgInventory';

interface GHGInventoryViewProps {
  measurements: IndicatorMeasurement[];
  indicators: Indicator[];
  selectedYear: number;
  availableYears: number[];
  organizationName: string;
}

const fmt = (v: number | null | undefined, digits = 2) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const fmtInt = (v: number | null | undefined) => (v == null ? 'sem dado' : v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }));

const scopeBadge = (scope: number) =>
  scope === 1
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
    : scope === 2
      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
      : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300';

const card = 'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900';

export const GHGInventoryView: React.FC<GHGInventoryViewProps> = ({
  measurements,
  indicators,
  selectedYear,
  availableYears,
  organizationName
}) => {
  const inv = useMemo(() => computeGHGInventory(measurements, indicators, selectedYear), [measurements, indicators, selectedYear]);
  const series = useMemo(
    () => computeGHGSeries(measurements, indicators, [...availableYears].sort((a, b) => a - b)),
    [measurements, indicators, availableYears]
  );
  const prev = series.find(s => s.year === selectedYear - 1);
  const partial = inv.energyMonths > 0 && inv.energyMonths < 12;
  const variation =
    inv.total12 != null && prev?.total12 && !partial ? ((inv.total12 - prev.total12) / prev.total12) * 100 : null;
  const fuel = commercialFuelFactors(selectedYear);
  const sin = sinFactorFor(selectedYear);
  const factorYears = Object.keys(YEAR_FACTORS).map(Number).sort((a, b) => a - b);

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-colors dark:border-slate-800/80 dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Leaf className="w-3.5 h-3.5" />
            <span>Programa Justiça Carbono Zero — Resolução CNJ nº 594/2024</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">Inventário de Emissões de GEE — {selectedYear}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {organizationName}: emissões calculadas a partir do consumo de combustíveis e de energia lançado no iPLS, com fatores oficiais.
          </p>
        </div>
        {inv.reported12 != null && (
          <div className="text-right">
            <div className="text-[11px] text-slate-400">Informado ao CNJ (escopos 1 e 2, GEE1e2)</div>
            <div className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">{fmt(inv.reported12)} tCO₂e</div>
          </div>
        )}
      </div>

      {(partial || inv.provisional) && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            {partial && <div>Exercício parcial: energia lançada em {inv.energyMonths} de 12 meses. O total ainda vai crescer.</div>}
            {inv.provisional && (
              <div>
                Há fator provisório neste ano
                {sin.provisional && sin.refYear ? ` (o fator médio do SIN de ${selectedYear} ainda não foi publicado; usado o de ${sin.refYear})` : ''}.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resumo por escopo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={card}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Escopo 1 (diretas)</span>
            <Car className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono mt-2 tabular-nums">
            {fmt(inv.scope1)} <span className="text-xs font-sans text-slate-400 font-normal">tCO₂e</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Combustíveis da frota e de geradores</div>
        </div>

        <div className={card}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Escopo 2 (energia)</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono mt-2 tabular-nums">
            {fmt(inv.scope2)} <span className="text-xs font-sans text-slate-400 font-normal">tCO₂e</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Energia elétrica adquirida da rede (SIN)</div>
        </div>

        <div className={card}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Escopo 3 (informado)</span>
            <Plane className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono mt-2 tabular-nums">
            {inv.scope3Reported == null ? (
              <span className="text-base font-sans font-semibold text-slate-400">não informado</span>
            ) : (
              <>
                {fmt(inv.scope3Reported)} <span className="text-xs font-sans text-slate-400 font-normal">tCO₂e</span>
              </>
            )}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Valor do indicador GEE-Esc3 (não calculado)</div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-emerald-800 to-teal-900 text-white p-4 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-200 uppercase tracking-wide">Escopos 1 e 2</span>
            <div className="text-2xl font-extrabold font-mono mt-1 tabular-nums">
              {fmt(inv.total12)} <span className="text-xs font-sans text-emerald-200 font-normal">tCO₂e</span>
            </div>
          </div>
          <div className="text-[11px] text-emerald-200 mt-2 font-medium">
            {variation != null ? (
              <span className={variation <= 0 ? 'text-emerald-300 font-semibold' : 'text-amber-200 font-semibold'}>
                {variation <= 0 ? '↓' : '↑'} {fmt(Math.abs(variation), 1)}% em relação a {selectedYear - 1}
              </span>
            ) : partial ? (
              <span>Comparação anual disponível ao fechar o exercício</span>
            ) : (
              <span>Sem ano anterior para comparar</span>
            )}
          </div>
        </div>
      </div>

      {/* Memória de cálculo */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden transition-colors dark:border-slate-800/80 dark:bg-slate-900">
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Memória de cálculo — {selectedYear}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Emissões (tCO₂e) = dado de atividade lançado no iPLS × fator de emissão. Linhas sem dado não entram na soma.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Escopo</th>
                <th className="py-3 px-3">Fonte emissora</th>
                <th className="py-3 px-3 text-right">Dado de atividade</th>
                <th className="py-3 px-3 text-right">Fator de emissão</th>
                <th className="py-3 px-3">Origem do fator</th>
                <th className="py-3 px-4 text-right">Emissões</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
              {inv.lines.map(l => (
                <tr key={l.key} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-sans font-bold">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] ${scopeBadge(l.scope)}`}>Escopo {l.scope}</span>
                  </td>
                  <td className="py-3 px-3 font-sans font-semibold text-slate-900 dark:text-white">
                    {l.source} <span className="font-mono font-normal text-slate-400">({l.indicatorCode})</span>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                    {l.activity == null ? (
                      <span className="font-sans font-normal text-slate-400">sem dado</span>
                    ) : (
                      <>
                        {fmtInt(l.activity)} <span className="font-sans font-normal text-slate-400">{l.activityUnit}</span>
                        {l.months != null && l.months < 12 && (
                          <span className="font-sans font-normal text-amber-600"> ({l.months} meses)</span>
                        )}
                      </>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {l.factor == null ? '—' : fmt(l.factor, 4)} <span className="font-sans font-normal text-slate-400">{l.factorUnit}</span>
                  </td>
                  <td className="py-3 px-3 font-sans text-slate-500 dark:text-slate-400 text-[10px]">
                    {l.factorSource}
                    {l.provisional && <span className="ml-1 text-amber-600 font-semibold">provisório</span>}
                  </td>
                  <td className="py-3 px-4 text-right font-extrabold text-slate-900 dark:text-white text-xs tabular-nums">
                    {l.tCO2e == null ? '—' : `${fmt(l.tCO2e)} tCO₂e`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {inv.injectedKwh != null && inv.injectedKwh > 0 && (
          <div className="px-4 py-2.5 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
            Energia injetada na rede por geração própria (kWhI): {fmtInt(inv.injectedKwh)} kWh. Informativo: não abate o escopo 2 calculado pela abordagem de localização.
          </div>
        )}
      </div>

      {/* Série histórica */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden transition-colors dark:border-slate-800/80 dark:bg-slate-900">
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Série histórica</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Escopos 1 e 2 calculados pelo iPLS, comparados ao valor informado ao CNJ (GEE1e2) quando houver.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-4 text-left">Ano</th>
                <th className="py-2.5 px-3 text-right">Escopo 1</th>
                <th className="py-2.5 px-3 text-right">Escopo 2</th>
                <th className="py-2.5 px-3 text-right">Escopos 1 e 2 (iPLS)</th>
                <th className="py-2.5 px-3 text-right">Informado ao CNJ</th>
                <th className="py-2.5 px-4 text-right">Escopo 3 informado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px] tabular-nums">
              {series.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center font-sans text-slate-400">
                    Sem consumo de combustíveis ou de energia lançado para este órgão.
                  </td>
                </tr>
              )}
              {series.map(s => (
                <tr key={s.year} className={s.year === selectedYear ? 'bg-emerald-50/60 dark:bg-emerald-950/30' : ''}>
                  <td className="py-2 px-4 font-sans font-semibold text-slate-800 dark:text-slate-200">
                    {s.year}
                    {s.energyMonths > 0 && s.energyMonths < 12 && (
                      <span className="ml-1 text-[10px] font-normal text-amber-600">parcial</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right">{fmt(s.scope1)}</td>
                  <td className="py-2 px-3 text-right">{fmt(s.scope2)}</td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">{fmt(s.total12)}</td>
                  <td className="py-2 px-3 text-right">{fmt(s.reported12)}</td>
                  <td className="py-2 px-4 text-right">{fmt(s.scope3Reported)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Metodologia e fatores */}
      <div className={`${card} text-xs text-slate-600 dark:text-slate-300 space-y-2`}>
        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
          <Info className="w-4 h-4 text-emerald-600" /> Metodologia e fatores de emissão
        </div>
        <ul className="list-disc ml-5 space-y-1">
          <li>
            <b>Escopo 1:</b> gasolina pura {fmt(FUEL_FACTORS_KG_PER_L.gasolinaA, 3)} e diesel puro {fmt(FUEL_FACTORS_KG_PER_L.dieselA, 3)} kg CO₂/L (IPCC 2006, adotados pelo MCTI e pelo Programa Brasileiro GHG Protocol), aplicados só à parcela fóssil. Em {selectedYear}: gasolina C com {fmt(fuel.etanolNaGasolina * 100, 1)}% de etanol anidro ({fmt(fuel.gasolinaC, 3)} kg CO₂/L) e diesel B com {fmt(fuel.biodieselNoDiesel * 100, 1)}% de biodiesel ({fmt(fuel.dieselB, 3)} kg CO₂/L).{fuel.nota ? ` ${fuel.nota}` : ''} O etanol hidratado e as parcelas renováveis emitem CO₂ biogênico, que não entra no escopo 1. CH₄ e N₂O da combustão não estão incluídos.
          </li>
          <li>
            <b>Escopo 2:</b> abordagem por localização, com o fator médio anual do Sistema Interligado Nacional publicado pelo MCTI (tCO₂/MWh):{' '}
            {factorYears.filter(y => YEAR_FACTORS[y].sin != null).map(y => `${y}: ${fmt(YEAR_FACTORS[y].sin!, 4)}`).join('; ')}. Anos sem publicação usam o último fator disponível, marcado como provisório.
          </li>
          <li>
            <b>Escopo 3:</b> não há, no Anexo da Resolução CNJ nº 400/2021, dados de atividade suficientes para o cálculo; o painel mostra o valor informado no indicador GEE-Esc3.
          </li>
          <li>
            Os fatores e as misturas obrigatórias por ano estão em <code>src/services/ghgInventory.ts</code> e devem ser validados pela unidade de gestão socioambiental a cada nova publicação do MCTI.
          </li>
        </ul>
      </div>
    </div>
  );
};
