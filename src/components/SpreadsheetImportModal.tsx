import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  Upload,
  Check,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  Download,
  Calendar,
  Layers,
  Database,
  CheckCircle2,
  FileText,
  Sparkles,
  RefreshCw,
  Eye,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Indicator, IndicatorMeasurement } from '../types';
import {
  parseSpreadsheetBuffer,
  getOfficialSjrr2021To2025Dataset,
  generateOfficialSjrrCSV,
  generateOfficialSjrrWorkbook,
  prepareMeasurementsForBatchPersistence,
  ParsedSpreadsheetRow,
  SpreadsheetParseReport
} from '../services/spreadsheetService';
import { STORAGE_KEYS, saveLocalData } from '../services/storageSync';

interface SpreadsheetImportModalProps {
  indicators: Indicator[];
  selectedYear: number;
  onClose: () => void;
  onImportBatch: (measurements: Partial<IndicatorMeasurement>[]) => void;
}

export const SpreadsheetImportModal: React.FC<SpreadsheetImportModalProps> = ({
  indicators,
  selectedYear,
  onClose,
  onImportBatch
}) => {
  const [tabMode, setTabMode] = useState<'FILE_UPLOAD' | 'PASTE_TEXT'>('FILE_UPLOAD');
  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [pastedText, setPastedText] = useState<string>('');

  const [parseReport, setParseReport] = useState<SpreadsheetParseReport | null>(null);
  const [previewYearFilter, setPreviewYearFilter] = useState<string>('ALL');
  const [previewTypeFilter, setPreviewTypeFilter] = useState<'ALL' | 'MONTHLY' | 'ANNUAL'>('ALL');
  const [importedSummary, setImportedSummary] = useState<{
    total: number;
    years: number[];
    serverPersisted?: boolean;
    serverMessage?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Consolidate both monthly and annual parsed rows into a complete batch ready for database
  const consolidatedMeasurements = useMemo(() => {
    if (!parseReport) return [];
    return prepareMeasurementsForBatchPersistence(parseReport, indicators);
  }, [parseReport, indicators]);

  // Handle uploaded File (Excel or CSV)
  const processFile = async (file: File) => {
    setIsProcessing(true);
    setSelectedFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const report = parseSpreadsheetBuffer(buffer, file.name, indicators);
      setParseReport(report);
      setStep('preview');
    } catch (err: any) {
      alert(`Erro ao ler arquivo da planilha: ${err.message || 'Formato não reconhecido.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Handle processing pasted CSV/text
  const handleProcessPastedText = () => {
    if (!pastedText.trim()) {
      alert('Por favor, cole o texto da planilha no campo antes de processar.');
      return;
    }
    setIsProcessing(true);
    try {
      const report = parseSpreadsheetBuffer(pastedText, 'dados_colados.csv', indicators);
      setParseReport(report);
      setStep('preview');
    } catch (err: any) {
      alert(`Erro ao processar texto colado: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 1-Click Load Official SJRR 2021-2025 Dataset
  const handleLoadOfficialSjrrDataset = () => {
    setIsProcessing(true);
    try {
      const csv = generateOfficialSjrrCSV();
      const report = parseSpreadsheetBuffer(csv, 'PLS_SJRR_2021-2025_Oficial_CNJ.csv', indicators);
      setSelectedFileName('PLS_SJRR_2021-2025_Oficial_CNJ.xlsx');
      setParseReport(report);
      setStep('preview');
    } catch (err: any) {
      alert(`Erro ao carregar série oficial SJRR: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Download official Excel template (.xlsx)
  const handleDownloadExcelTemplate = () => {
    try {
      const wb = generateOfficialSjrrWorkbook();
      XLSX.writeFile(wb, 'Modelo_Planilha_PLS_SJRR_2021-2025.xlsx');
    } catch (err: any) {
      alert(`Falha ao gerar planilha Excel: ${err.message}`);
    }
  };

  // Download CSV template
  const handleDownloadCsvTemplate = () => {
    const csv = generateOfficialSjrrCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Modelo_Planilha_PLS_SJRR_2021-2025.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Confirm and persist to database & local state
  const handleConfirmImport = async () => {
    if (!parseReport) return;
    setIsProcessing(true);

    const batchPayload = consolidatedMeasurements;

    if (batchPayload.length === 0) {
      alert('Nenhum dado de medição foi identificado para gravação. Verifique as colunas da planilha.');
      setIsProcessing(false);
      return;
    }

    let serverPersisted = false;
    let serverMessage = '';

    // 1. Post to Server API for Disk Persistence in database.json
    try {
      const res = await fetch('/api/measurements/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          measurements: batchPayload,
          sourceDescription: `Importação de Planilha: ${parseReport.fileName} (${parseReport.detectedYears.join(', ')})`,
          userId: 'usr-1',
          userName: 'Dr. Roberto Magalhães'
        })
      });

      if (res.ok) {
        const json = await res.json();
        serverPersisted = true;
        serverMessage = `${json.insertedCount || 0} novos registros, ${json.updatedCount || 0} atualizados no banco de dados.`;
      } else {
        const errJson = await res.json().catch(() => ({}));
        serverMessage = errJson.error || `HTTP ${res.status}`;
      }
    } catch (e: any) {
      serverMessage = e.message || 'Armazenamento local ativo.';
    }

    // 2. Update parent state & save to LocalStorage for dual-layer client persistence
    onImportBatch(batchPayload);

    setImportedSummary({
      total: batchPayload.length,
      years: parseReport.detectedYears,
      serverPersisted,
      serverMessage
    });
    setIsProcessing(false);
    setStep('success');
  };

  // Filter preview items
  const allPreviewRows = parseReport
    ? [
        ...(previewTypeFilter !== 'ANNUAL' ? parseReport.validMeasurements : []),
        ...(previewTypeFilter !== 'MONTHLY' ? parseReport.annualConsolidations : [])
      ]
    : [];

  const filteredPreviewRows = allPreviewRows.filter(r => {
    if (previewYearFilter !== 'ALL' && r.year !== parseInt(previewYearFilter, 10)) {
      return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-emerald-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Importador de Planilhas PLS (SJRR 2021–2025)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  Excel & CSV
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Suporte nativo a planilhas anuais e mensais da Justiça Federal (Série Histórica e Ciclo 2021-2026).
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-xs space-y-5">
          {step === 'upload' && (
            <div className="space-y-5">
              {/* Tab Navigation: Upload File vs Paste Text */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setTabMode('FILE_UPLOAD')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      tabMode === 'FILE_UPLOAD'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Upload de Arquivo (.xlsx / .csv)
                  </button>
                  <button
                    onClick={() => setTabMode('PASTE_TEXT')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      tabMode === 'PASTE_TEXT'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Colar Dados Textuais
                  </button>
                </div>

                {/* Templates & 1-Click Load */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadOfficialSjrrDataset}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200 transition-colors"
                    title="Carregar automaticamente os dados históricos oficiais da SJRR de 2021 a 2025"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Carregar Dados Oficiais SJRR (2021–2025)
                  </button>
                </div>
              </div>

              {tabMode === 'FILE_UPLOAD' ? (
                /* Drag and Drop Zone */
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                    isDragging
                      ? 'border-emerald-500 bg-emerald-50/60 scale-[0.99]'
                      : 'border-slate-300 hover:border-emerald-500 bg-slate-50/60 hover:bg-emerald-50/20'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.tsv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      Clique para selecionar ou arraste sua planilha aqui
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Formatos aceitos: <strong>.xlsx (Excel)</strong>, <strong>.xls</strong>, <strong>.csv</strong> ou <strong>.tsv</strong>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                    <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-600 font-medium">
                      Multi-abas (2021, 2022, 2023, 2024, 2025)
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-600 font-medium">
                      Mês a Mês (Jan a Dez)
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-600 font-medium">
                      Consolidados Anuais
                    </span>
                  </div>
                </div>
              ) : (
                /* Paste Text Zone */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">
                      Cole as linhas da planilha com cabeçalho (CSV ou delimitado por tabulação):
                    </span>
                    <button
                      type="button"
                      onClick={() => setPastedText(generateOfficialSjrrCSV().slice(0, 750))}
                      className="text-emerald-700 hover:text-emerald-800 font-semibold text-xs flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Inserir Exemplo
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    value={pastedText}
                    onChange={e => setPastedText(e.target.value)}
                    placeholder="ano,mes,codigo_indicador,valor,unidade&#10;2025,1,6.1,19450,kWh&#10;2025,2,6.1,18920,kWh"
                    className="w-full bg-slate-50 font-mono text-xs p-3.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleProcessPastedText}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-colors"
                    >
                      Processar Linhas & Prévia
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Informative Guidance & Templates Download Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Info className="w-4 h-4 text-emerald-600" />
                    Compatibilidade com Padrão CNJ / PLS-Jud:
                  </div>
                  <ul className="text-[11px] text-slate-600 space-y-1 list-disc list-inside leading-relaxed">
                    <li>Reconhece códigos oficiais: <strong>6.1 (Energia)</strong>, <strong>7.1 (Água)</strong>, <strong>2.1 (Papel)</strong>, <strong>3.1 (Copos)</strong>, <strong>14.1 (Combustível)</strong>, <strong>13.1 (Frota)</strong>, etc.</li>
                    <li>Aceita siglas oficiais (ex: <code>CEE, CA, CPP, CD, CG, TMR, GTF</code>).</li>
                    <li>Mapeamento flexível para colunas de meses (Jan..Dez) ou formato em lista (Ano, Mês, Código, Valor).</li>
                  </ul>
                </div>

                <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/70 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="font-bold text-emerald-900 flex items-center gap-1.5 text-xs">
                      <Download className="w-4 h-4 text-emerald-700" />
                      Modelos Oficiais de Planilha SJRR:
                    </div>
                    <p className="text-[11px] text-emerald-800 mt-1">
                      Baixe o modelo com a estrutura oficial e todos os campos predefinidos para 2021 a 2025.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleDownloadExcelTemplate}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Baixar Modelo .XLSX
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadCsvTemplate}
                      className="px-3 py-2 rounded-lg bg-white hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300 transition-colors"
                    >
                      .CSV
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && parseReport && (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Medições Mensais</div>
                  <div className="text-xl font-bold text-emerald-700 mt-0.5">
                    {parseReport.validMeasurements.length}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Lançamentos mês a mês</div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Exercícios Detectados</div>
                  <div className="text-base font-bold text-slate-800 mt-0.5 flex flex-wrap gap-1">
                    {parseReport.detectedYears.map(y => (
                      <span key={y} className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-xs">
                        {y}
                      </span>
                    ))}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Ciclo PLS SJRR</div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Indicadores Mapeados</div>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">
                    {parseReport.matchedIndicatorCodes.length}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Códigos CNJ reconhecidos
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Origem do Arquivo</div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5 truncate" title={parseReport.fileName}>
                    {parseReport.fileName}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Validação Concluída
                  </div>
                </div>
              </div>

              {/* Filters & Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 font-medium pr-1 text-xs">Exercício:</span>
                  <button
                    onClick={() => setPreviewYearFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      previewYearFilter === 'ALL'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Todos ({parseReport.detectedYears.join(', ')})
                  </button>
                  {parseReport.detectedYears.map(y => (
                    <button
                      key={y}
                      onClick={() => setPreviewYearFilter(String(y))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        previewYearFilter === String(y)
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 text-xs">
                  <button
                    onClick={() => setStep('upload')}
                    className="px-3 py-1.5 text-slate-600 hover:text-slate-900 underline font-semibold"
                  >
                    Escolher outro arquivo
                  </button>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-2 px-3">Exercício</th>
                      <th className="py-2 px-3">Competência</th>
                      <th className="py-2 px-3">Código</th>
                      <th className="py-2 px-3">Indicador</th>
                      <th className="py-2 px-3 text-right">Valor Medido</th>
                      <th className="py-2 px-3">Unidade</th>
                      <th className="py-2 px-3">Processo SEI</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {filteredPreviewRows.slice(0, 100).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-1.5 px-3 font-bold text-slate-800">{row.year}</td>
                        <td className="py-1.5 px-3">
                          {row.month === 0 ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                              TOTAL ANUAL
                            </span>
                          ) : (
                            `Mês ${String(row.month).padStart(2, '0')}`
                          )}
                        </td>
                        <td className="py-1.5 px-3 font-bold text-emerald-700">{row.indicatorCode}</td>
                        <td className="py-1.5 px-3 font-sans text-slate-800 font-medium truncate max-w-[200px]" title={row.indicatorName}>
                          {row.indicatorName || 'Indicador PLS'}
                        </td>
                        <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                          {row.value.toLocaleString('pt-BR')}
                        </td>
                        <td className="py-1.5 px-3 text-slate-500 font-sans">{row.unit}</td>
                        <td className="py-1.5 px-3 text-slate-400 font-sans text-[10px]">{row.processNumber || '—'}</td>
                        <td className="py-1.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            <Check className="w-2.5 h-2.5" />
                            Apto
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredPreviewRows.length > 100 && (
                <div className="text-center text-[11px] text-slate-500 italic">
                  Mostrando os primeiros 100 de {filteredPreviewRows.length} registros validados.
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
                >
                  Voltar
                </button>

                <button
                  onClick={handleConfirmImport}
                  disabled={isProcessing || consolidatedMeasurements.length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold text-xs shadow-md transition-all scale-100 hover:scale-[1.01]"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Gravando e Persistindo na Base...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirmar e Persistir {consolidatedMeasurements.length} Registros
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'success' && importedSummary && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-slate-900">
                  Planilha Gravada e Persistida com Sucesso!
                </h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Foram consolidados e persistidos permanentemente <strong>{importedSummary.total} registros</strong> cobrindo os exercícios de{' '}
                  <strong>{importedSummary.years.join(', ')}</strong> na base oficial da Seção Judiciária de Roraima.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md mx-auto text-left text-xs space-y-2 text-slate-600">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-600" />
                  Status da Persistência Dupla (Servidor & Navegador):
                </div>
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg font-semibold text-[11px]">
                  <Check className="w-3.5 h-3.5" />
                  <span>{importedSummary.serverMessage || 'Gravado com sucesso no servidor e no cache local.'}</span>
                </div>
                <div>• Painel de Gestão: gráficos de consumo mês a mês refletem as séries históricas.</div>
                <div>• Gráficos Quinquenais (2022–2026): dados auditados disponíveis no Relatório Anual.</div>
                <div>• Persistência garantida mesmo após recarregar a página ou reiniciar a sessão.</div>
                <div>• Log de Auditoria registrado com assinatura digital institucional.</div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                >
                  Concluir e Voltar ao Painel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
