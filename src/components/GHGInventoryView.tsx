import React, { useState } from 'react';
import {
  Leaf,
  Layers,
  HelpCircle,
  TrendingDown,
  Info,
  Car,
  Zap,
  Plane,
  Trash2,
  CheckCircle,
  FileText
} from 'lucide-react';
import { EmissionSource, GHGCalculation } from '../types';

interface GHGInventoryViewProps {
  sources: EmissionSource[];
  calculations: GHGCalculation[];
  selectedYear: number;
}

export const GHGInventoryView: React.FC<GHGInventoryViewProps> = ({
  sources,
  calculations,
  selectedYear
}) => {
  const [selectedScope, setSelectedScope] = useState<number | 'ALL'>('ALL');

  // Filter calculations by year and scope
  const yearCalculations = calculations.filter(c => c.year === selectedYear);
  const filteredCalculations = yearCalculations.filter(c =>
    selectedScope === 'ALL' ? true : c.scope === selectedScope
  );

  // Totals by scope
  const scope1Total = yearCalculations
    .filter(c => c.scope === 1)
    .reduce((sum, c) => sum + c.calculatedCO2eTons, 0);

  const scope2Total = yearCalculations
    .filter(c => c.scope === 2)
    .reduce((sum, c) => sum + c.calculatedCO2eTons, 0);

  const scope3Total = yearCalculations
    .filter(c => c.scope === 3)
    .reduce((sum, c) => sum + c.calculatedCO2eTons, 0);

  const grandTotalTons = scope1Total + scope2Total + scope3Total;

  // Baseline 2025 total
  const baselineCalculations = calculations.filter(c => c.year === 2025);
  const baselineTotal = baselineCalculations.reduce((sum, c) => sum + c.calculatedCO2eTons, 0);

  const reductionPercent = baselineTotal > 0
    ? Math.round(((baselineTotal - grandTotalTons) / baselineTotal) * 100)
    : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-colors dark:border-slate-800/80 dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Leaf className="w-3.5 h-3.5" />
            <span>Programa Justiça Carbono Zero — Resolução CNJ nº 594/2024</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            Inventário Institucional de Emissões de GEE
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Rastreabilidade de fatores de emissão oficiais, dados de atividade e cálculo estequiométrico em tCO₂e
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Baseline 2025:</span>
          <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
            {baselineTotal.toFixed(2)} tCO₂e
          </span>
        </div>
      </div>

      {/* Scope Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Scope 1 */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Escopo 1 (Diretas)</span>
            <Car className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono mt-2 tabular-nums">
            {scope1Total.toFixed(2)} <span className="text-xs font-sans text-slate-400 font-normal">tCO₂e</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Combustão móvel (frota oficial)
          </div>
        </div>

        {/* Scope 2 */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Escopo 2 (Energia)</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono mt-2 tabular-nums">
            {scope2Total.toFixed(2)} <span className="text-xs font-sans text-slate-400 font-normal">tCO₂e</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Eletricidade adquirida da rede
          </div>
        </div>

        {/* Scope 3 */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Escopo 3 (Indiretas)</span>
            <Plane className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono mt-2 tabular-nums">
            {scope3Total.toFixed(2)} <span className="text-xs font-sans text-slate-400 font-normal">tCO₂e</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Viagens a serviço e resíduos em aterro
          </div>
        </div>

        {/* Total & Neutrality */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-800 to-teal-900 text-white p-4 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-200 uppercase tracking-wide">
              Total Geral de Emissões
            </span>
            <div className="text-2xl font-extrabold font-mono mt-1 tabular-nums">
              {grandTotalTons.toFixed(2)} <span className="text-xs font-sans text-emerald-200 font-normal">tCO₂e</span>
            </div>
          </div>
          <div className="text-[11px] text-emerald-200 mt-2 font-medium">
            {reductionPercent > 0 ? (
              <span className="text-emerald-300 font-semibold">
                ↓ Redução de {reductionPercent}% vs baseline
              </span>
            ) : (
              <span>Monitoramento em tempo real</span>
            )}
          </div>
        </div>
      </div>

      {/* Scope Filter Buttons */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-400">Filtrar por Escopo:</span>
        <div className="flex items-center gap-1 rounded-xl bg-white dark:bg-slate-900 p-1 border border-slate-200/80 dark:border-slate-800 text-xs">
          {[
            { id: 'ALL', label: 'Todos os Escopos' },
            { id: 1, label: 'Escopo 1 (Frota)' },
            { id: 2, label: 'Escopo 2 (Eletricidade)' },
            { id: 3, label: 'Escopo 3 (Viagens/Resíduos)' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedScope(tab.id as any)}
              className={`rounded-lg px-3 py-1 font-medium transition-colors ${
                selectedScope === tab.id
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Detailed Emissions Traceability Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden transition-colors dark:border-slate-800/80 dark:bg-slate-900">
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
            Memória de Cálculo e Rastreabilidade Metodológica
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Fórmula: <code>Emissões (tCO₂e) = [Dado de Atividade × Fator de Emissão (kg CO₂e/un)] / 1000</code>
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Escopo</th>
                <th className="py-3 px-3">Fonte Emissora</th>
                <th className="py-3 px-3 text-right">Dado de Atividade</th>
                <th className="py-3 px-3 text-right">Fator de Emissão</th>
                <th className="py-3 px-3">Fonte Oficial</th>
                <th className="py-3 px-4 text-right">Emissões Calculadas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
              {filteredCalculations.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-sans font-bold">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] ${
                        c.scope === 1
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : c.scope === 2
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      Escopo {c.scope}
                    </span>
                  </td>

                  <td className="py-3 px-3 font-sans font-semibold text-slate-900 dark:text-white">
                    {c.sourceName}
                  </td>

                  <td className="py-3 px-3 text-right font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                    {c.activityData.toLocaleString('pt-BR')} <span className="font-sans font-normal text-slate-400">{c.activityUnit}</span>
                  </td>

                  <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {c.emissionFactor.toLocaleString('pt-BR')} <span className="font-sans font-normal text-slate-400">kg/un</span>
                  </td>

                  <td className="py-3 px-3 font-sans text-slate-500 dark:text-slate-400 text-[10px] max-w-[200px] truncate" title={c.factorSource}>
                    {c.factorSource}
                  </td>

                  <td className="py-3 px-4 text-right font-extrabold text-slate-900 dark:text-white text-xs tabular-nums">
                    {c.calculatedCO2eTons.toFixed(2)} tCO₂e
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
