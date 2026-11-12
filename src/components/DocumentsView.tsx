import React, { useState } from 'react';
import {
  FileText,
  Upload,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Check,
  FileCheck,
  Building,
  Hash,
  DollarSign,
  Zap,
  Clock,
  Layers,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import { PLSDocument, DocumentType, Indicator } from '../types';

interface DocumentsViewProps {
  documents: PLSDocument[];
  indicators: Indicator[];
  /** Envia o PDF da fatura de energia; o servidor lê, confere e lança (ou deixa pendente). */
  onUploadDocument: (file: { fileName: string; contentBase64: string; processNumber?: string }) => Promise<{ document?: PLSDocument; error?: string }>;
  /** Confirma a leitura (com valores corrigidos, se preciso) e lança CEE/GEE. */
  onValidateDocument: (documentId: string, values?: { kwh?: number; amount?: number; competence?: string }) => Promise<{ document?: PLSDocument; error?: string }>;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  documents,
  indicators,
  onUploadDocument,
  onValidateDocument
}) => {
  const [selectedDoc, setSelectedDoc] = useState<PLSDocument | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProcess, setUploadProcess] = useState<string>('');
  const [uploadBusy, setUploadBusy] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');
  // Valores editáveis na validação
  const [editKwh, setEditKwh] = useState<string>('');
  const [editAmount, setEditAmount] = useState<string>('');
  const [editCompetence, setEditCompetence] = useState<string>('');
  const [validateBusy, setValidateBusy] = useState<boolean>(false);
  const [validateError, setValidateError] = useState<string>('');

  const filteredDocs = documents.filter(doc => {
    if (filterType !== 'ALL' && doc.fileType !== filterType) return false;
    if (filterStatus !== 'ALL' && doc.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.fileName.toLowerCase().includes(q) ||
        (doc.supplier && doc.supplier.toLowerCase().includes(q)) ||
        (doc.processNumber && doc.processNumber.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const readBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploadBusy(true);
    setUploadError('');
    try {
      const contentBase64 = await readBase64(uploadFile);
      const r = await onUploadDocument({ fileName: uploadFile.name, contentBase64, processNumber: uploadProcess || undefined });
      if (r.error) {
        setUploadError(r.error);
        return;
      }
      setIsUploading(false);
      setUploadFile(null);
      setUploadProcess('');
      if (r.document) openDoc(r.document);
    } catch {
      setUploadError('Não foi possível ler o arquivo.');
    } finally {
      setUploadBusy(false);
    }
  };

  const openDoc = (doc: PLSDocument) => {
    setSelectedDoc(doc);
    setEditKwh(doc.consumption !== undefined ? String(doc.consumption).replace('.', ',') : '');
    setEditAmount(doc.amount !== undefined ? String(doc.amount).replace('.', ',') : '');
    setEditCompetence(doc.competence || '');
    setValidateError('');
  };

  const toNumber = (v: string) => Number(v.replace(/\./g, '').replace(',', '.'));

  const handleValidate = async () => {
    if (!selectedDoc) return;
    setValidateBusy(true);
    setValidateError('');
    const r = await onValidateDocument(selectedDoc.id, {
      kwh: toNumber(editKwh),
      amount: toNumber(editAmount),
      competence: editCompetence
    });
    setValidateBusy(false);
    if (r.error) {
      setValidateError(r.error);
      return;
    }
    setSelectedDoc(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 18. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-colors">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600">
            <FileText className="w-3.5 h-3.5" />
            <span>Repositório de Evidências & Atestos</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Documentos e Faturas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Faturas de energia elétrica em PDF: leitura automática e lançamento em CEE (kWh) e GEE (R$)
          </p>
        </div>

        <button
          onClick={() => setIsUploading(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs shadow-emerald-600/20 transition-colors"
        >
          <Upload className="w-4 h-4" />
          <span>Enviar fatura (PDF)</span>
        </button>
      </div>

      {/* Resumo Rápido em Cards Claros */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total de Documentos</span>
            <FileText className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-slate-900">{documents.length}</span>
            <span className="text-xs text-slate-500">arquivos</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Repositório comprobatório SEI/OCR</p>
        </div>

        <div className="rounded-2xl border border-emerald-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
            <span>Homologados</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-emerald-700">
              {documents.filter(d => d.status === 'PROCESSADO').length}
            </span>
            <span className="text-xs text-emerald-600 font-medium">validados</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Integrados na base de medições</p>
        </div>

        <div className="rounded-2xl border border-amber-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-700 font-medium">
            <span>Aguardando Validação</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-amber-700">
              {documents.filter(d => d.status === 'PENDENTE_VALIDACAO').length}
            </span>
            <span className="text-xs text-amber-600 font-medium">pendentes</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Necessita atesto do fiscal</p>
        </div>

        <div className="rounded-2xl border border-blue-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-blue-700 font-medium">
            <span>Confiança Média OCR</span>
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-blue-700">
              {documents.length > 0
                ? Math.round(documents.reduce((acc, d) => acc + (d.extractionConfidence || 95), 0) / documents.length)
                : 98}%
            </span>
            <span className="text-xs text-blue-600 font-medium">precisão</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Extração automatizada de faturas</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por fatura, fornecedor ou processo SEI..."
            className="w-full rounded-xl bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Todos os Tipos ({documents.length})</option>
            <option value="FATURA">Fatura</option>
            <option value="ATESTO">Atesto</option>
            <option value="RELATORIO">Relatório</option>
            <option value="NORMATIVO">Normativo</option>
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Todos os Status</option>
            <option value="PROCESSADO">Processados</option>
            <option value="PENDENTE_VALIDACAO">Aguardando Validação</option>
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map(doc => {
          const isPending = doc.status === 'PENDENTE_VALIDACAO';
          const isLowConfidence = (doc.extractionConfidence || 100) < 90;

          return (
            <div
              key={doc.id}
              className={`rounded-2xl border bg-white p-5 shadow-xs flex flex-col justify-between transition-all duration-200 hover:shadow-md ${
                isPending
                  ? 'border-amber-200/90 hover:border-amber-300'
                  : 'border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/70 uppercase tracking-wide">
                    {doc.fileType}
                  </span>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                      isPending
                        ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                    }`}
                  >
                    {isPending ? (
                      <>
                        <Clock className="w-3 h-3 text-amber-600" />
                        Pendente
                      </>
                    ) : (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        Processado
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-start gap-2.5 mt-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-1">
                      {doc.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono truncate">{doc.fileName}</p>
                  </div>
                </div>

                <div className="mt-3.5 space-y-1.5 text-xs text-slate-600 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                  {doc.supplier && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Fornecedor:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[160px]">{doc.supplier}</span>
                    </div>
                  )}

                  {doc.competence && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Competência:</span>
                      <span className="font-semibold font-mono text-slate-800">{doc.competence}</span>
                    </div>
                  )}

                  {doc.consumption !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Consumo:</span>
                      <span className="font-bold font-mono text-emerald-700">
                        {doc.consumption.toLocaleString('pt-BR')} {doc.unit}
                      </span>
                    </div>
                  )}

                  {doc.amount !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Valor Total:</span>
                      <span className="font-bold font-mono text-slate-900">
                        R$ {doc.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  {doc.processNumber && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-slate-400">Processo SEI:</span>
                      <span className="font-mono text-[10px] text-slate-600 truncate max-w-[140px]">{doc.processNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-slate-400">Confiança:</span>
                  <span
                    className={`font-mono font-bold ${
                      isLowConfidence ? 'text-amber-600' : 'text-emerald-700'
                    }`}
                  >
                    {doc.extractionConfidence}%
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openDoc(doc)}
                    className="flex items-center gap-1 px-3 py-1 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-[11px] shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver</span>
                  </button>

                  {isPending && (
                    <button
                      onClick={() => openDoc(doc)}
                      className="flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Conferir</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Envio da fatura de energia (PDF) */}
      {isUploading && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">Fatura de energia elétrica</h3>
            <p className="text-xs text-slate-500 mb-4">
              Envie o PDF da fatura (baixado do SEI ou da concessionária). O sistema lê o mês, o consumo
              (kWh) e o valor (R$); se tudo conferir, lança em CEE e GEE. Se houver dúvida, a fatura fica
              pendente para você conferir.
            </p>

            <form onSubmit={handleUpload} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Arquivo PDF *</label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  required
                  onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 p-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Processo SEI (opcional)</label>
                <input
                  type="text"
                  value={uploadProcess}
                  onChange={e => setUploadProcess(e.target.value)}
                  placeholder="Ex.: 0001234-56.2026.4.01.8012"
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 p-2.5 text-xs text-slate-900 font-mono"
                />
              </div>

              {uploadError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">{uploadError}</div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsUploading(false); setUploadError(''); }}
                  className="rounded-xl px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || uploadBusy}
                  className="rounded-xl px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold shadow-xs"
                >
                  {uploadBusy ? 'Lendo a fatura…' : 'Enviar e ler'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

            {/* Document Inspector Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 animate-in fade-in duration-150">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 uppercase">
                  {selectedDoc.fileType} · {selectedDoc.status}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{selectedDoc.title}</h3>
                <p className="text-xs text-slate-400 font-mono">{selectedDoc.fileName}</p>
              </div>

              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-slate-500 font-medium">Fornecedor:</span>
                  <div className="font-bold text-slate-800 mt-0.5">{selectedDoc.supplier || 'N/A'}</div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Processo SEI:</span>
                  <div className="font-mono font-bold text-slate-800 mt-0.5">{selectedDoc.processNumber || 'N/A'}</div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Competência:</span>
                  <div className="font-mono font-bold text-slate-800 mt-0.5">{selectedDoc.competence || 'N/A'}</div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Consumo / Volume:</span>
                  <div className="font-mono font-bold text-emerald-700 mt-0.5">
                    {selectedDoc.consumption ? `${selectedDoc.consumption.toLocaleString('pt-BR')} ${selectedDoc.unit}` : 'N/A'}
                  </div>
                </div>
              </div>

              {selectedDoc.reviewReasons && selectedDoc.reviewReasons.length > 0 && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                  <div className="font-bold">Por que não foi lançado automaticamente:</div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {selectedDoc.reviewReasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}

              {selectedDoc.extractionNotes && selectedDoc.extractionNotes.length > 0 && (
                <div className="text-[11px] text-slate-500">
                  <strong>Leitura:</strong> {selectedDoc.extractionMethod} · {selectedDoc.extractionNotes.join(' ')}
                </div>
              )}

              {selectedDoc.status === 'PENDENTE_VALIDACAO' && (
                <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                  <label className="block">
                    <span className="font-semibold text-slate-700">Mês (AAAA-MM)</span>
                    <input value={editCompetence} onChange={e => setEditCompetence(e.target.value)} placeholder="2026-10"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 font-mono" />
                  </label>
                  <label className="block">
                    <span className="font-semibold text-slate-700">Consumo (kWh)</span>
                    <input value={editKwh} onChange={e => setEditKwh(e.target.value)} inputMode="decimal"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 font-mono" />
                  </label>
                  <label className="block">
                    <span className="font-semibold text-slate-700">Valor total (R$)</span>
                    <input value={editAmount} onChange={e => setEditAmount(e.target.value)} inputMode="decimal"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 font-mono" />
                  </label>
                  <p className="col-span-3 text-[11px] text-emerald-900">
                    Confira com o PDF e corrija se preciso. Ao confirmar, o consumo entra em CEE e o valor em GEE
                    (somados às demais faturas do mesmo mês).
                  </p>
                </div>
              )}

              {validateError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">{validateError}</div>
              )}

              <div>
                <h4 className="font-bold text-slate-800 mb-1">Texto extraído do PDF:</h4>
                <div className="bg-slate-50 text-slate-800 border border-slate-200 p-4 rounded-2xl font-mono text-[11px] leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {selectedDoc.rawTextSnippet || 'Nenhum texto bruto disponível.'}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <div className="text-slate-500 text-[11px]">
                  Confiança da leitura: <strong className="text-emerald-700">{selectedDoc.extractionConfidence}%</strong>
                  {selectedDoc.uploadedBy && <> · enviado por {selectedDoc.uploadedBy}</>}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="rounded-xl px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                  >
                    Fechar
                  </button>

                  {selectedDoc.status === 'PENDENTE_VALIDACAO' && (
                    <button
                      onClick={handleValidate}
                      disabled={validateBusy}
                      className="rounded-xl px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 shadow-xs"
                    >
                      <Check className="w-4 h-4" />
                      <span>{validateBusy ? 'Lançando…' : 'Confirmar e lançar'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
