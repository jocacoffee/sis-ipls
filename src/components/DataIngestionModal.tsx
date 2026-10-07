import React, { useState } from 'react';
import { X, Save, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { Indicator, IndicatorMeasurement, SourceType } from '../types';
import { MONTH_NAMES } from '../services/calculationEngine';

interface DataIngestionModalProps {
  indicators: Indicator[];
  measurements: IndicatorMeasurement[];
  preselectedIndicatorId?: string;
  preselectedMonth?: number;
  selectedYear: number;
  onClose: () => void;
  onSave: (data: {
    indicatorId: string;
    year: number;
    month: number;
    value: number;
    unit: string;
    sourceType: SourceType;
    sourceReference: string;
    processNumber: string;
    notes: string;
    reason?: string;
  }) => void;
}

export const DataIngestionModal: React.FC<DataIngestionModalProps> = ({
  indicators,
  measurements,
  preselectedIndicatorId,
  preselectedMonth,
  selectedYear,
  onClose,
  onSave
}) => {
  const [indicatorId, setIndicatorId] = useState<string>(preselectedIndicatorId || indicators[0]?.id || '');
  const [year, setYear] = useState<number>(selectedYear);
  const [month, setMonth] = useState<number>(preselectedMonth || 8);
  const [value, setValue] = useState<string>('');
  const [sourceType, setSourceType] = useState<SourceType>('manual');
  const [sourceReference, setSourceReference] = useState<string>('Boletim de Medição Interno');
  const [processNumber, setProcessNumber] = useState<string>('0001245-88.2026.4.01.8012');
  const [notes, setNotes] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isConfirmingChange, setIsConfirmingChange] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedIndicator = indicators.find(i => i.id === indicatorId) || indicators[0];

  const existingMeasurement = measurements.find(
    m => m.indicatorId === indicatorId && m.year === year && m.month === month
  );

  React.useEffect(() => {
    if (existingMeasurement && value === '') {
      setValue(existingMeasurement.value.toString());
      setSourceType(existingMeasurement.sourceType);
      setSourceReference(existingMeasurement.sourceReference || '');
      setProcessNumber(existingMeasurement.processNumber || '');
      setNotes(existingMeasurement.notes || '');
    }
  }, [existingMeasurement]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setErrorMessage('Por favor, informe um valor numérico válido.');
      return;
    }

    if (existingMeasurement && existingMeasurement.value !== numValue && !isConfirmingChange) {
      setIsConfirmingChange(true);
      return;
    }

    if (isConfirmingChange && !reason.trim()) {
      setErrorMessage('Para alterar um valor existente, é obrigatório informar o motivo da retificação.');
      return;
    }

    onSave({
      indicatorId,
      year,
      month,
      value: numValue,
      unit: selectedIndicator?.unit || '',
      sourceType,
      sourceReference,
      processNumber,
      notes,
      reason: reason.trim() || undefined
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in fade-in duration-150">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
              📝
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Lançamento Manual de Medição
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Coleta auditável com registro no SEI e histórico de alterações
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/40 p-3 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isConfirmingChange && existingMeasurement && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                Confirmação de Retificação de Valor
              </div>
              <p className="text-amber-800 dark:text-amber-300 text-[11px]">
                Você está alterando o valor anterior de{' '}
                <strong>
                  {existingMeasurement.value.toLocaleString('pt-BR')} {selectedIndicator.unit}
                </strong>{' '}
                para{' '}
                <strong>
                  {parseFloat(value).toLocaleString('pt-BR')} {selectedIndicator.unit}
                </strong>
                . Informe a justificativa abaixo para fins de auditoria:
              </p>
              <div>
                <label className="block text-[11px] font-semibold text-amber-900 dark:text-amber-200 mb-1">
                  Motivo da Alteração / Justificativa *
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Ex: Correção de digitação conforme fatura retificada no SEI..."
                  className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-xl p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          {/* Indicator Select */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Indicador PLS *
            </label>
            <select
              value={indicatorId}
              onChange={e => {
                setIndicatorId(e.target.value);
                setValue('');
                setIsConfirmingChange(false);
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {indicators.map(ind => (
                <option key={ind.id} value={ind.id}>
                  {ind.code} — {ind.name} ({ind.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Year and Month */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Exercício (Ano) *
              </label>
              <select
                value={year}
                onChange={e => {
                  setYear(Number(e.target.value));
                  setIsConfirmingChange(false);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Competência (Mês) *
              </label>
              <select
                value={month}
                onChange={e => {
                  setMonth(Number(e.target.value));
                  setIsConfirmingChange(false);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i + 1} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Value and Unit */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Valor Medido *
              </label>
              <input
                type="number"
                step="any"
                required
                value={value}
                onChange={e => {
                  setValue(e.target.value);
                  setIsConfirmingChange(false);
                }}
                placeholder="Ex: 14500"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 tabular-nums"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unidade
              </label>
              <input
                type="text"
                disabled
                value={selectedIndicator?.unit || ''}
                className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono text-slate-500"
              />
            </div>
          </div>

          {/* Source Type and Reference */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Origem do Dado *
              </label>
              <select
                value={sourceType}
                onChange={e => setSourceType(e.target.value as SourceType)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="manual">Manual (Digitado)</option>
                <option value="spreadsheet">Planilha de Almoxarifado</option>
                <option value="SEI">Documento SEI</option>
                <option value="document_extraction">Fatura de Concessionária</option>
                <option value="API">Integração WebService</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Documento de Referência
              </label>
              <input
                type="text"
                value={sourceReference}
                onChange={e => setSourceReference(e.target.value)}
                placeholder="Ex: Fatura nº 98412 / Atesto"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Process Number SEI */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Processo SEI Vinculado
            </label>
            <input
              type="text"
              value={processNumber}
              onChange={e => setProcessNumber(e.target.value)}
              placeholder="0001245-88.2026.4.01.8012"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Observações Técnicas
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Descreva detalhes como condições atípicas, manutenção predial, etc."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>{isConfirmingChange ? 'Confirmar Alteração' : 'Gravar Medição'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
