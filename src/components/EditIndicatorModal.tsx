import React, { useState } from 'react';
import {
  X,
  Save,
  RotateCcw,
  Sliders,
  Calendar,
  FileText,
  Building2,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  Sparkles
} from 'lucide-react';
import { Indicator, IndicatorPeriodicity, PLSTheme } from '../types';

interface EditIndicatorModalProps {
  indicator: Indicator;
  theme?: PLSTheme;
  onClose: () => void;
  onSave: (updatedIndicator: Indicator, reason?: string) => void;
}

export const EditIndicatorModal: React.FC<EditIndicatorModalProps> = ({
  indicator,
  theme,
  onClose,
  onSave
}) => {
  const [name, setName] = useState<string>(indicator.name);
  const [acronym, setAcronym] = useState<string>(indicator.acronym || '');
  const [description, setDescription] = useState<string>(indicator.description);
  const [periodicity, setPeriodicity] = useState<IndicatorPeriodicity>(indicator.periodicity);
  const [unit, setUnit] = useState<string>(indicator.unit);
  const [normativeReference, setNormativeReference] = useState<string>(indicator.normativeReference || '');
  const [responsibleUnit, setResponsibleUnit] = useState<string>(indicator.responsibleUnit || '');
  const [formulaDescription, setFormulaDescription] = useState<string>(indicator.formulaDescription || '');
  const [reason, setReason] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const isGeneralVariable = indicator.themeId === 'theme-1';

  const handleResetToDefault = () => {
    setName(indicator.name);
    setAcronym(indicator.acronym || '');
    setDescription(indicator.description);
    // Para variáveis gerais, o padrão institucional correto é ANUAL
    setPeriodicity(isGeneralVariable ? 'ANUAL' : indicator.periodicity);
    setUnit(indicator.unit);
    setNormativeReference(indicator.normativeReference || '');
    setResponsibleUnit(indicator.responsibleUnit || '');
    setFormulaDescription(indicator.formulaDescription || '');
    setReason('');
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('O nome da variável / indicador não pode ficar vazio.');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('O texto de definição é obrigatório para conformidade regulatória.');
      return;
    }

    const updated: Indicator = {
      ...indicator,
      name: name.trim(),
      acronym: acronym.trim() || undefined,
      description: description.trim(),
      periodicity,
      unit: unit.trim(),
      normativeReference: normativeReference.trim() || undefined,
      responsibleUnit: responsibleUnit.trim() || undefined,
      formulaDescription: formulaDescription.trim() || undefined
    };

    setIsSaved(true);
    setTimeout(() => {
      onSave(updated, reason.trim() || undefined);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
              <Sliders className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded-md">
                  {indicator.code}
                </span>
                {acronym && (
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-mono">
                    {acronym}
                  </span>
                )}
                <span className="text-[11px] font-semibold text-slate-500">
                  {theme?.name || (isGeneralVariable ? 'Variáveis Gerais' : 'Indicador PLS')}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                Editar Definição e Periodicidade da Variável
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isGeneralVariable && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 text-emerald-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong>Regra Institucional das Variáveis Gerais (Tema 1):</strong> Por definição do Conselho Nacional de Justiça, as variáveis gerais possuem apuração <strong>anual</strong> e alimentam os cálculos per capita (por pessoa) e por metro quadrado de todos os 20 temas do PLS.
              </div>
            </div>
          )}

          {/* Nome e Sigla */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3">
              <label className="block font-bold text-slate-700 mb-1">
                Nome da Variável / Indicador *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Força de trabalho total"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Sigla Oficial
              </label>
              <input
                type="text"
                value={acronym}
                onChange={e => setAcronym(e.target.value)}
                placeholder="Ex: FTT"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
              />
            </div>
          </div>

          {/* TEXTO DE DEFINIÇÃO (Requisito Explícito do Usuário) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-800">
                Texto de Definição / Metodologia do Indicador *
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {description.length} caracteres
              </span>
            </div>
            <textarea
              required
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descreva a definição técnica, o escopo de medição, fontes de apuração e a base legal desta variável..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 leading-relaxed font-sans"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Este texto constará nos relatórios anuais em PDF, auditorias do CNJ e no detalhamento metodológico da variável.
            </p>
          </div>

          {/* PERIODICIDADE (ANUAL OU MENSAL - Requisito Explícito do Usuário) */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Periodicidade de Apuração *</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Opção ANUAL */}
              <label
                onClick={() => setPeriodicity('ANUAL')}
                className={`flex flex-col p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                  periodicity === 'ANUAL'
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      periodicity === 'ANUAL' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                    }`}>
                      {periodicity === 'ANUAL' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="font-extrabold text-xs text-slate-900">
                      ANUAL (Exercício)
                    </span>
                  </div>
                  {isGeneralVariable && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                      Padrão Variáveis Gerais
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 pl-6 leading-relaxed">
                  Lançamento único por exercício anual (ex: total de servidores, área construída em m², contratações consolidadas).
                </p>
              </label>

              {/* Opção MENSAL */}
              <label
                onClick={() => setPeriodicity('MENSAL')}
                className={`flex flex-col p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                  periodicity === 'MENSAL'
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      periodicity === 'MENSAL' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                    }`}>
                      {periodicity === 'MENSAL' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="font-extrabold text-xs text-slate-900">
                      MENSAL (Competências)
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 pl-6 leading-relaxed">
                  Lançamento mês a mês para acompanhamento contínuo de consumo (ex: faturas de energia, água, combustível, resmas de papel).
                </p>
              </label>
            </div>
          </div>

          {/* Unidade de Medida e Unidade Administrativa Responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Unidade de Medida *
              </label>
              <input
                type="text"
                required
                value={unit}
                onChange={e => setUnit(e.target.value)}
                placeholder="Ex: pessoas, cargos, m², kWh"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Unidade Responsável no Órgão
              </label>
              <input
                type="text"
                value={responsibleUnit}
                onChange={e => setResponsibleUnit(e.target.value)}
                placeholder="Ex: Diretoria de Gestão de Pessoas"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Referência Normativa */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Referência Normativa CNJ
            </label>
            <input
              type="text"
              value={normativeReference}
              onChange={e => setNormativeReference(e.target.value)}
              placeholder="Ex: Resolução CNJ nº 400/2021, Anexo, Tema 1"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Fórmula / Descrição de Cálculo (se aplicável) */}
          {indicator.indicatorType === 'CALCULATED' && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                <span>Fórmula de Cálculo Automático:</span>
                <code className="text-emerald-700 font-mono text-xs">{indicator.formula}</code>
              </div>
              <input
                type="text"
                value={formulaDescription}
                onChange={e => setFormulaDescription(e.target.value)}
                placeholder="Descrição em texto da fórmula de consolidação..."
                className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Motivo da Alteração / Justificativa (Trilha de Auditoria) */}
          <div className="pt-2 border-t border-slate-200">
            <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Motivo da Alteração Metodológica (Auditoria)</span>
              <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ex: Atualização metodológica e ajuste de periodicidade conforme Resolução CNJ nº 400/2021"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Ficará registrado no log de auditoria permanente da SJRR com data, horário e usuário responsável.
            </p>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Valores Padrão</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              className={`px-5 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                isSaved ? 'bg-emerald-600' : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{isSaved ? 'Salvo!' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
