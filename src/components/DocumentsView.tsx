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
  onUploadDocument: (fileData: { fileName: string; fileType: DocumentType; textSnippet?: string }) => void;
  onValidateDocument: (documentId: string, approvedValue?: number) => void;
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
  const [simulatedFileName, setSimulatedFileName] = useState<string>('');
  const [simulatedDocType, setSimulatedDocType] = useState<DocumentType>('FATURA');
  const [isUploading, setIsUploading] = useState<boolean>(false);

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

  const handleSimulatedUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatedFileName) return;

    onUploadDocument({
      fileName: simulatedFileName.endsWith('.pdf') ? simulatedFileName : `${simulatedFileName}.pdf`,
      fileType: simulatedDocType
    });

    setSimulatedFileName('');
    setIsUploading(false);
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
            Faturas de concessionárias, notas fiscais, atestos do fiscal e extração automática via OCR
          </p>
        </div>

        <button
          onClick={() => setIsUploading(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs shadow-emerald-600/20 transition-colors"
        >
          <Upload className="w-4 h-4" />
          <span>Subir Documento</span>
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
                  <span className="text-slate-400">OCR:</span>
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
                    onClick={() => setSelectedDoc(doc)}
                    className="flex items-center gap-1 px-3 py-1 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-[11px] shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver</span>
                  </button>

                  {isPending && (
                    <button
                      onClick={() => onValidateDocument(doc.id)}
                      className="flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Homologar</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Modal */}
      {isUploading && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Ingestão Documental & OCR
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Faça a submissão de faturas ou atestos para extração de dados
            </p>

            <form onSubmit={handleSimulatedUpload} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tipo de Documento *
                </label>
                <select
                  value={simulatedDocType}
                  onChange={e => setSimulatedDocType(e.target.value as DocumentType)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 p-2.5 text-xs text-slate-900"
                >
                  <option value="FATURA">Fatura de Concessionária (Energia, Água, Telefonia)</option>
                  <option value="ATESTO">Atesto do Fiscal de Contrato</option>
                  <option value="NOTA_FISCAL">Nota Fiscal de Compra / Fornecimento</option>
                  <option value="RELATORIO">Relatório / Manifesto de Resíduos</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nome do Arquivo / Modelo de Fatura *
                </label>
                <input
                  type="text"
                  required
                  value={simulatedFileName}
                  onChange={e => setSimulatedFileName(e.target.value)}
                  placeholder="Ex: Fatura_Roraima_Energia_08_2026.pdf"
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 p-2.5 text-xs text-slate-900 font-mono"
                />
              </div>

              <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200/80 text-emerald-900 text-[11px] space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Modelos de Teste Rápido:
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setSimulatedFileName('Fatura_Roraima_Energia_Set_2026.pdf')}
                    className="px-2 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-[10px] font-medium"
                  >
                    Energia Elétrica
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimulatedFileName('Fatura_CAER_Agua_Set_2026.pdf')}
                    className="px-2 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-[10px] font-medium"
                  >
                    Água CAER
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimulatedFileName('Fatura_Telefonia_Oi_Set_2026.pdf')}
                    className="px-2 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-[10px] font-medium"
                  >
                    Telefonia
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploading(false)}
                  className="rounded-xl px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                >
                  Processar com OCR
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

              <div>
                <h4 className="font-bold text-slate-800 mb-1">Texto Extraído via OCR / Parser:</h4>
                <div className="bg-slate-50 text-slate-800 border border-slate-200 p-4 rounded-2xl font-mono text-[11px] leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {selectedDoc.rawTextSnippet || 'Nenhum texto bruto disponível.'}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <div className="text-slate-500 text-[11px]">
                  Índice de Confiança OCR: <strong className="text-emerald-700">{selectedDoc.extractionConfidence}%</strong>
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
                      onClick={() => {
                        onValidateDocument(selectedDoc.id);
                        setSelectedDoc(null);
                      }}
                      className="rounded-xl px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-xs"
                    >
                      <Check className="w-4 h-4" />
                      <span>Homologar Atesto</span>
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
