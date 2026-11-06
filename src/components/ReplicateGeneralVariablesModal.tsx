import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Copy,
  Building2,
  CheckCircle2,
  Info,
  ArrowRight,
  ShieldAlert,
  Save,
  RotateCcw
} from 'lucide-react';
import { Indicator, IndicatorMeasurement } from '../types';
import {
  GENERAL_VARIABLE_INDICATOR_IDS,
  getGeneralVariablesSummary,
  cloneGeneralVariables
} from '../utils/generalVariablesUtils';

interface ReplicateGeneralVariablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetYear: number;
  availableYears: number[];
  measurements: IndicatorMeasurement[];
  indicators: Indicator[];
  onConfirmReplication: (newMeasurements: IndicatorMeasurement[], fromYear: number, toYear: number) => void;
}

export const ReplicateGeneralVariablesModal: React.FC<ReplicateGeneralVariablesModalProps> = ({
  isOpen,
  onClose,
  targetYear,
  availableYears,
  measurements,
  indicators,
  onConfirmReplication
}) => {
  // Encontrar o ano base mais adequado (ex: ano anterior mais próximo com dados)
  const previousYears = availableYears
    .filter(y => y < targetYear)
    .sort((a, b) => b - a);
  const defaultSourceYear = previousYears.find(y => y <= 2026) || previousYears[0] || (targetYear - 1);

  const [sourceYear, setSourceYear] = useState<number>(defaultSourceYear);

  // Estado editável dos valores das 10 variáveis antes de salvar
  const [editedValues, setEditedValues] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isOpen) {
      setSourceYear(defaultSourceYear);
    }
  }, [isOpen, defaultSourceYear]);

  // Recarregar os valores quando sourceYear mudar
  useEffect(() => {
    const summary = getGeneralVariablesSummary(measurements, sourceYear);
    setEditedValues({
      'indicator-1-1': summary.magistrados,
      'indicator-1-2': summary.servidoresEfetivos,
      'indicator-1-3': summary.servidoresComissionados,
      'indicator-1-5': summary.estagiarios,
      'indicator-1-6': summary.teletrabalho,
      'indicator-1-7': summary.terceirizados,
      'indicator-1-8': summary.outros,
      'indicator-1-15': summary.usuariosPredio,
      'indicator-1-16': summary.fttTotal,
      'indicator-1-17': summary.areaTotalM2
    });
  }, [sourceYear, measurements]);

  if (!isOpen) return null;

  const handleValueChange = (indicatorId: string, val: number) => {
    setEditedValues(prev => {
      const next = { ...prev, [indicatorId]: val };
      // Se alterou servidores ou terceirizados, recalcular FTT automaticamente
      if (['indicator-1-1', 'indicator-1-2', 'indicator-1-3', 'indicator-1-5', 'indicator-1-7', 'indicator-1-8'].includes(indicatorId)) {
        const mag = next['indicator-1-1'] || 0;
        const servEfet = next['indicator-1-2'] || 0;
        const servCom = next['indicator-1-3'] || 0;
        const estag = next['indicator-1-5'] || 0;
        const terc = next['indicator-1-7'] || 0;
        const out = next['indicator-1-8'] || 0;
        next['indicator-1-16'] = mag + servEfet + servCom + estag + terc + out;
      }
      return next;
    });
  };

  const handleSave = () => {
    const baseCloned = cloneGeneralVariables(measurements, sourceYear, targetYear);
    // Aplicar valores editados
    const finalized = baseCloned.map(m => {
      if (editedValues[m.indicatorId] !== undefined) {
        return {
          ...m,
          value: editedValues[m.indicatorId],
          notes: `Replicado a partir de ${sourceYear} com ajustes manuais para o exercício de ${targetYear}.`
        };
      }
      return m;
    });

    onConfirmReplication(finalized, sourceYear, targetYear);
    onClose();
  };

  const variableMetaList = [
    { id: 'indicator-1-1', code: '1.1', label: 'Magistrados(as) Providos (MagP)', unit: 'cargos', icon: '⚖️' },
    { id: 'indicator-1-2', code: '1.2', label: 'Servidores(as) Efetivos(as) (ServP)', unit: 'pessoas', icon: '👥' },
    { id: 'indicator-1-3', code: '1.3', label: 'Cargos em Comissão sem Vínculo (ServCom)', unit: 'pessoas', icon: '👔' },
    { id: 'indicator-1-5', code: '1.5', label: 'Estagiários(as) (Estag)', unit: 'pessoas', icon: '🎓' },
    { id: 'indicator-1-6', code: '1.6', label: 'Pessoal em Teletrabalho (Teletrab)', unit: 'pessoas', icon: '💻' },
    { id: 'indicator-1-7', code: '1.7', label: 'Trabalhadores(as) Terceirizados(as) (Terceiriz)', unit: 'pessoas', icon: '👷' },
    { id: 'indicator-1-8', code: '1.8', label: 'Outros Colaboradores / Residentes (Outros)', unit: 'pessoas', icon: '🤝' },
    { id: 'indicator-1-15', code: '1.15', label: 'Total de Usuários(as) do Prédio', unit: 'pessoas', icon: '🏛️' },
    { id: 'indicator-1-16', code: '1.16', label: 'Força de Trabalho Total (FTT = MagP + ServP + Terceiriz + Estag + Outros)', unit: 'pessoas', icon: '🌐', isHighlight: true },
    { id: 'indicator-1-17', code: '1.17', label: 'Área Total Construída da Seção Judiciária (m²)', unit: 'm²', icon: '📐', isHighlight: true }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-white backdrop-blur-xs">
              <Copy className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>Repetir Variáveis Gerais para {targetYear}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/30 text-emerald-100 border border-emerald-400/30">
                  Tema 1 • Dados Anuais
                </span>
              </h3>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Replique a Força de Trabalho Total (FTT) e Área Construída do ano anterior para destravar os indicadores per capita
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Informational Guidance */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 flex items-start gap-3 text-xs text-emerald-950">
            <Info className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
            <div className="leading-relaxed">
              <strong>Como funciona a persistência:</strong> Todos os consumos do exercício de <strong>{targetYear}</strong> permanecem <strong>zerados</strong> até que sejam medidos e atestados. Ao replicar as Variáveis Gerais, você estabelece a base de cálculo institucional (denominador de consumo per capita e por m²) exigida pela Resolução CNJ nº 400/2021.
            </div>
          </div>

          {/* Source Year Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Copiar dados a partir de:</span>
              <select
                value={sourceYear}
                onChange={(e) => setSourceYear(Number(e.target.value))}
                className="bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                {previousYears.map(y => (
                  <option key={y} value={y}>
                    Exercício de {y} {y === 2026 ? '(Base Consolidada)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
              <span>Origem: {sourceYear}</span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
              <span>Destino: {targetYear}</span>
            </div>
          </div>

          {/* Variables Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
              <span>Variáveis do Tema 1 (Valores Editáveis)</span>
              <span className="text-[11px] text-slate-400 font-normal">Ajuste os valores antes de salvar caso haja alterações</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {variableMetaList.map((item) => {
                const currentVal = editedValues[item.id] ?? 0;
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-all ${
                      item.isHighlight
                        ? 'border-emerald-300 bg-emerald-50/40 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm">{item.icon}</span>
                        <span className="text-xs font-bold text-slate-800 truncate" title={item.label}>
                          {item.code} {item.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">
                        {item.unit}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step={item.unit === 'm²' ? '1' : '1'}
                        value={currentVal}
                        onChange={(e) => handleValueChange(item.id, Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                      <span className="text-xs font-semibold text-slate-600 flex-shrink-0">
                        {item.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>As 10 variáveis serão gravadas permanentemente para o exercício de {targetYear}.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Confirmar e Replicar para {targetYear}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
