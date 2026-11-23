import React, { useState, useEffect, useMemo } from 'react';
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
import { applyAutoCalculations, isAutoIndicator } from '../services/autoCalc';

interface ReplicateGeneralVariablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetYear: number;
  availableYears: number[];
  measurements: IndicatorMeasurement[];
  indicators: Indicator[];
  organizationId: string;
  onConfirmReplication: (newMeasurements: IndicatorMeasurement[], fromYear: number, toYear: number) => void;
}

export const ReplicateGeneralVariablesModal: React.FC<ReplicateGeneralVariablesModalProps> = ({
  isOpen,
  onClose,
  targetYear,
  availableYears,
  measurements,
  indicators,
  organizationId,
  onConfirmReplication
}) => {
  // Encontrar o ano base mais adequado (ex: ano anterior mais próximo com dados)
  const previousYears = availableYears
    .filter(y => y < targetYear)
    .sort((a, b) => b - a);
  const defaultSourceYear = previousYears.find(y => y <= 2026) || previousYears[0] || (targetYear - 1);

  const [sourceYear, setSourceYear] = useState<number>(defaultSourceYear);

  // Variáveis do Tema 1 lançadas pelo órgão (as de cálculo automático são só exibidas)
  const theme1 = indicators
    .filter(i => i.themeId === 'theme-1' && i.active !== false)
    .sort((a, b) => Number(a.code.split('.')[1]) - Number(b.code.split('.')[1]));
  const inputVars = theme1.filter(i => !isAutoIndicator(i));
  const autoVars = theme1.filter(i => isAutoIndicator(i));

  // Valores editáveis ('' = não informado, não será gravado)
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setSourceYear(defaultSourceYear);
    }
  }, [isOpen, defaultSourceYear]);

  // Recarregar os valores quando sourceYear mudar
  useEffect(() => {
    const values: Record<string, string> = {};
    for (const ind of inputVars) {
      const m = measurements.find(x => x.indicatorId === ind.id && x.year === sourceYear && x.month === 12)
        || measurements.find(x => x.indicatorId === ind.id && x.year === sourceYear);
      values[ind.id] = m ? String(m.value) : '';
    }
    setEditedValues(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceYear, measurements, indicators]);

  // Prévia dos totais calculados (Serv, TFAux, FTT) com os valores do formulário
  const preview = useMemo(() => {
    const draft: IndicatorMeasurement[] = Object.entries(editedValues)
      .filter(([, v]) => v !== '' && Number.isFinite(Number(v)))
      .map(([indicatorId, v]) => ({
        id: `draft-${indicatorId}`, indicatorId, year: targetYear, month: 12, value: Number(v), unit: '',
        sourceType: 'manual', validationStatus: 'VALIDADO', confidenceScore: 100, createdAt: '', updatedAt: ''
      } as IndicatorMeasurement));
    const out = applyAutoCalculations(draft, indicators);
    return Object.fromEntries(autoVars.map(a => [a.id, out.find(m => m.indicatorId === a.id)?.value ?? null]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editedValues, indicators, targetYear]);

  if (!isOpen) return null;

  const handleValueChange = (indicatorId: string, val: string) => {
    setEditedValues(prev => ({ ...prev, [indicatorId]: val }));
  };

  const filledCount = inputVars.filter(i => editedValues[i.id] !== '' && editedValues[i.id] !== undefined).length;

  const handleSave = () => {
    const now = new Date().toISOString();
    const finalized: IndicatorMeasurement[] = inputVars
      .filter(ind => editedValues[ind.id] !== '' && Number.isFinite(Number(editedValues[ind.id])))
      .map(ind => ({
        id: `m-${ind.id}-${targetYear}-annual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        indicatorId: ind.id,
        organizationId,
        year: targetYear,
        month: 12,
        value: Number(editedValues[ind.id]),
        unit: ind.unit,
        sourceType: 'manual',
        sourceReference: `Replicado a partir do exercício de ${sourceYear}`,
        validationStatus: 'VALIDADO',
        confidenceScore: 100,
        notes: `Variável geral replicada de ${sourceYear} para ${targetYear}.`,
        createdAt: now,
        updatedAt: now
      } as IndicatorMeasurement));

    onConfirmReplication(finalized, sourceYear, targetYear);
    onClose();
  };

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
              {inputVars.map((ind) => (
                <div key={ind.id} className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-slate-800 truncate" title={ind.name}>
                      {ind.code} {ind.name} {ind.acronym ? `(${ind.acronym})` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={editedValues[ind.id] ?? ''}
                      placeholder="não informado"
                      onChange={(e) => handleValueChange(ind.id, e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <span className="text-xs font-semibold text-slate-600 flex-shrink-0">{ind.unit}</span>
                  </div>
                </div>
              ))}
            </div>

            {autoVars.length > 0 && (
              <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50/40 p-3">
                <div className="text-xs font-bold text-emerald-900 mb-2">Calculados automaticamente (não editáveis)</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {autoVars.map(a => (
                    <div key={a.id} className="rounded-lg bg-white border border-emerald-200 px-3 py-2">
                      <div className="text-[11px] font-bold text-slate-700">{a.code} {a.acronym}</div>
                      <div className="font-mono text-sm font-bold text-emerald-800">
                        {preview[a.id] !== null && preview[a.id] !== undefined ? `${Number(preview[a.id]).toLocaleString('pt-BR')} ${a.unit}` : '—'}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 truncate" title={a.formula}>{a.formula}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{filledCount} variável(is) informada(s) serão gravadas no exercício de {targetYear}.</span>
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
