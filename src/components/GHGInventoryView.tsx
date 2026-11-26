import React, { useEffect, useState } from 'react';
import { Leaf, Car, Zap, Plane, Info, AlertTriangle, Loader2 } from 'lucide-react';
import { IndicatorMeasurement } from '../types';
import {
  commercialFuelFactors,
  FUEL_EF,
  FUGITIVE_GASES,
  GHGYearInventory,
  GWP,
  sinFactorFor,
  YEAR_FACTORS
} from '../services/ghgInventory';

interface GHGInventoryViewProps {
  organizationId: string;
  organizationName: string;
  selectedYear: number;
  /** Medições do órgão: só para recarregar o inventário quando houver lançamento. */
  measurements: IndicatorMeasurement[];
}

interface TravelBIStatus {
  configured: boolean;
  running: boolean;
  lastRun: { at: string; ok: boolean; message: string; panelRefreshedAt?: string } | null;
}

const fmt = (v: number | null | undefined, digits = 2) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const fmtInt = (v: number | null | undefined) => (v == null ? 'sem dado' : v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }));
const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '');

const scopeBadge = (scope: number) =>
  scope === 1
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
    : scope === 2
      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
      : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300';

const card = 'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900';

export const GHGInventoryView: React.FC<GHGInventoryViewProps> = ({
  organizationId,
  organizationName,
  selectedYear,
  measurements
}) => {
  const [series, setSeries] = useState<GHGYearInventory[] | null>(null);
  const [error, setError] = useState('');
  const [travel, setTravel] = useState<TravelBIStatus | null>(null);

  useEffect(() => {
    let alive = true;
    setError('');
    fetch(`/api/ghg/inventory?orgId=${encodeURIComponent(organizationId)}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(d => alive && setSeries(d.series || []))
      .catch(e => alive && setError(`Não foi possível calcular o inventário (${e.message}).`));
    fetch('/api/travel-bi/status')
      .then(r => (r.ok ? r.json() : null))
      .then(d => alive && setTravel(d))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [organizationId, measurements]);

  if (error) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>;
  }
  if (!series) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Calculando o inventário…
      </div>
    );
  }

  const inv = series.find(s => s.year === selectedYear);
  const prev = series.find(s => s.year === selectedYear - 1);
  const partial = !!inv && inv.energyMonths > 0 && inv.energyMonths < 12;
  const variation =
    inv?.total != null && prev?.total && !partial && !inv.warnings.length && !prev.warnings.length
      ? ((inv.total - prev.total) / prev.total) * 100
      : null;
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
            {organizationName}: emissões calculadas a partir dos dados lançados no iPLS, com os fatores da Ferramenta GHG Protocol.
          </p>
        </div>
        {inv?.reported12 != null && (
          <div className="text-right">
            <div className="text-[11px] text-slate-400">Informado ao CNJ (escopos 1 e 2, GEE1e2)</div>
            <div className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">{fmt(inv.reported12)} tCO₂e</div>
          </div>
        )}
      </div>

      {!inv && (
        <div className={`${card} text-sm text-slate-500`}>Sem dados de atividade para {selectedYear} neste órgão.</div>
      )}

      {inv && (partial || inv.provisional || inv.warnings.length > 0) && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            {inv.warnings.map(w => <div key={w}>{w}</div>)}
            {partial && <div>Exercício parcial: energia lançada em {inv.energyMonths} de 12 meses. O total ainda vai crescer.</div>}
            {inv.provisional && (
              <div>
                Há fator provisório neste ano
                {sin.provisional && sin.refYear ? ` (o fator do SIN de ${selectedYear} ainda não foi publicado; usado o de ${sin.refYear})` : ''}.
              </div>
            )}
          </div>
        </div>
      )}

      {inv && (
        <>
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
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Combustíveis e emissões fugitivas</div>
            </div>

            <div className={card}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Escopo 2 (energia)</span>
                <Zap className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono mt-2 tabular-nums">
                {fmt(inv.scope2)} <span className="text-xs font-sans text-slate-400 font-normal">tCO₂e</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Energia elétrica adquirida</div>
            </div>

            <div className={card}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Escopo 3 (viagens)</span>
                <Plane className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono mt-2 tabular-nums">
                {inv.scope3 == null ? (
                  <span className="text-base font-sans font-semibold text-slate-400">sem dado</span>
                ) : (
                  <>
                    {fmt(inv.scope3)} <span className="text-xs font-sans text-slate-400 font-normal">tCO₂e</span>
                  </>
                )}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Viagens aéreas a serviço
                {inv.scope3Reported != null && <> · informado (GEE-Esc3): {fmt(inv.scope3Reported)}</>}
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-emerald-800 to-teal-900 text-white p-4 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-200 uppercase tracking-wide">Total (escopos 1, 2 e 3)</span>
                <div className="text-2xl font-extrabold font-mono mt-1 tabular-nums">
                  {fmt(inv.total)} <span className="text-xs font-sans text-emerald-200 font-normal">tCO₂e</span>
                </div>
              </div>
              <div className="text-[11px] text-emerald-200 mt-2 font-medium">
                {variation != null ? (
                  <span className={variation <= 0 ? 'text-emerald-300 font-semibold' : 'text-amber-200 font-semibold'}>
                    {variation <= 0 ? '↓' : '↑'} {fmt(Math.abs(variation), 1)}% em relação a {selectedYear - 1}
                  </span>
                ) : partial ? (
                  <span>Comparação anual disponível ao fechar o exercício</span>
                ) : inv.warnings.length || prev?.warnings.length ? (
                  <span>Sem comparação: falta dado de algum escopo</span>
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
                    <tr key={l.key} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${l.excluded ? 'opacity-60' : ''}`}>
                      <td className="py-3 px-4 font-sans font-bold">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] whitespace-nowrap ${scopeBadge(l.scope)}`}>Escopo {l.scope}</span>
                      </td>
                      <td className="py-3 px-3 font-sans font-semibold text-slate-900 dark:text-white">
                        {l.source} <span className="font-mono font-normal text-slate-400">({l.indicatorCode})</span>
                        {l.excluded && <span className="ml-1 font-sans font-normal text-[10px] text-slate-500">fora do total</span>}
                        {l.warning && <div className="font-sans font-normal text-[10px] text-amber-600">{l.warning}</div>}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                        {l.activity == null ? (
                          <span className="font-sans font-normal text-slate-400">sem dado</span>
                        ) : (
                          <>
                            {l.activityUnit === 'tCO₂e' ? fmt(l.activity) : fmtInt(l.activity)}{' '}
                            <span className="font-sans font-normal text-slate-400">{l.activityUnit}</span>
                            {l.key === 'energia' && l.months != null && l.months < 12 && (
                              <span className="font-sans font-normal text-amber-600"> ({l.months} meses)</span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {l.factor == null ? '—' : fmt(l.factor, l.factorUnit.startsWith('GWP') ? 1 : 4)}{' '}
                        <span className="font-sans font-normal text-slate-400">{l.factorUnit}</span>
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
        </>
      )}

      {/* Série histórica */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden transition-colors dark:border-slate-800/80 dark:bg-slate-900">
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Série histórica</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Calculado pelo iPLS, comparado aos valores informados ao CNJ (GEE1e2 e GEE-Esc3) quando houver.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-4 text-left">Ano</th>
                <th className="py-2.5 px-3 text-right">Escopo 1</th>
                <th className="py-2.5 px-3 text-right">Escopo 2</th>
                <th className="py-2.5 px-3 text-right">Escopo 3 (viagens)</th>
                <th className="py-2.5 px-3 text-right">Total iPLS</th>
                <th className="py-2.5 px-3 text-right">Informado 1 e 2</th>
                <th className="py-2.5 px-4 text-right">Informado 3</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px] tabular-nums">
              {series.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center font-sans text-slate-400">
                    Sem dados de atividade lançados para este órgão.
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
                    {s.warnings.length > 0 && (
                      <span className="ml-1 text-[10px] font-normal text-amber-600" title={s.warnings.join(' ')}>⚠</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right">{fmt(s.scope1)}</td>
                  <td className="py-2 px-3 text-right">{fmt(s.scope2)}</td>
                  <td className="py-2 px-3 text-right">{fmt(s.scope3)}</td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">{fmt(s.total)}</td>
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
            <b>Escopo 1, combustíveis:</b> fatores da Ferramenta GHG Protocol (Programa Brasileiro GHG Protocol/FGV), a mesma usada nos inventários da Justiça Federal. O CO₂ entra só da parcela fóssil (gasolina pura {fmt(FUEL_EF.gasolinaPura.co2, 3)} e diesel puro {fmt(FUEL_EF.dieselPuro.co2, 3)} kg CO₂/L); o CH₄ e o N₂O entram de todas as parcelas, pelo GWP do AR5 (CH₄ = {GWP.CH4}; N₂O = {GWP.N2O}). Em {selectedYear}: gasolina C com {fmt(fuel.etanolNaGasolina * 100, 1)}% de etanol anidro ({fmt(fuel.gasolinaC.co2e, 3)} kg CO₂e/L) e diesel B com {fmt(fuel.biodieselNoDiesel * 100, 1)}% de biodiesel ({fmt(fuel.dieselB.co2e, 3)} kg CO₂e/L).{fuel.nota ? ` ${fuel.nota}` : ''} O CO₂ do etanol e do biodiesel é biogênico e fica fora do total{inv?.biogenic != null ? ` (${fmt(inv.biogenic)} tCO₂ biogênico em ${selectedYear})` : ''}.
          </li>
          <li>
            <b>Escopo 1, emissões fugitivas:</b> massa de gás refrigerante reposta e de CO₂ recarregado em extintores (campos complementares 20.C1 a 20.C7, fora do Anexo) × GWP do AR5:{' '}
            {FUGITIVE_GASES.map(g => `${g.label.replace('Gás refrigerante ', '').replace(' (HCFC, fora do total)', '')} ${fmt(g.gwp, 0)}`).join('; ')}. O R-22 é controlado pelo Protocolo de Montreal e, como na ferramenta, é relatado fora do total.
          </li>
          <li>
            <b>Escopo 2:</b> abordagem por localização, com o consumo de cada mês multiplicado pelo fator mensal do Sistema Interligado Nacional (MCTI); sem fator mensal, a média anual (tCO₂/MWh):{' '}
            {factorYears.filter(y => YEAR_FACTORS[y].sin != null).map(y => `${y}: ${fmt(YEAR_FACTORS[y].sin!, 4)}`).join('; ')}. Anos sem publicação usam o último fator disponível, marcado como provisório. Roraima foi sistema isolado até 2025: nesses anos, a SJRR usa o fator informado no campo FESI (20.C8).
          </li>
          <li>
            <b>Escopo 3, viagens:</b> emissões das viagens aéreas a serviço, coletadas do painel de BI de viagens e somadas trecho a trecho (campo 20.C9). O total que o painel mostra em visões agregadas aplica o fator do voo curto a toda a distância e fica maior que esta soma.
            {travel && (
              <>
                {' '}
                {travel.configured
                  ? travel.lastRun
                    ? travel.lastRun.ok
                      ? `Última coleta: ${fmtDate(travel.lastRun.at)}${travel.lastRun.panelRefreshedAt ? `; painel atualizado em ${fmtDate(travel.lastRun.panelRefreshedAt)}` : ''}.`
                      : `Última coleta falhou (${fmtDate(travel.lastRun.at)}): ${travel.lastRun.message}`
                    : 'Coleta ainda não executada desde a última reinicialização.'
                  : 'Coleta do painel desligada no servidor.'}
              </>
            )}
          </li>
          <li>
            Os fatores e as misturas por ano estão em <code>src/services/ghgInventory.ts</code> e devem ser validados pela unidade de gestão socioambiental a cada nova publicação do MCTI.
          </li>
        </ul>
      </div>
    </div>
  );
};
