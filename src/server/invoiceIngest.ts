/**
 * Ingestão de fatura de energia (PDF): leitura do texto, extração (IA local + regex),
 * checagens de consistência e, se tudo conferir, lançamento de CEE (kWh) e GEE (R$) do mês.
 *
 * Usado pelo upload manual (POST /api/documents/upload) e pelo agente de coleta do SEI
 * (agent/seiSync.ts), para que os dois caminhos apliquem exatamente as mesmas regras.
 */
import { storage } from './storage';
import type { AuditLog, IndicatorMeasurement, PLSDocument } from '../types';
import {
  ENERGY_KWH_ACRONYM,
  energyMeasurementsFor,
  extractEnergyInvoice,
  pdfToText,
  reviewReasons,
  sha256
} from './energyInvoice';

export const MAX_INVOICE_BYTES = 8 * 1024 * 1024;

export interface IngestParams {
  organizationId: string;
  fileName: string;
  data: Buffer;
  processNumber?: string;
  /** Quem enviou: usuário logado (upload) ou o agente do SEI. */
  actor: { username: string; displayName: string };
  source: 'UPLOAD' | 'SEI';
  seiDocumentId?: string;
}

export type IngestResult =
  | { kind: 'invalid'; error: string }
  | { kind: 'duplicate'; existing: PLSDocument }
  | { kind: 'done'; document: PLSDocument; measurements: IndicatorMeasurement[] };

export async function ingestEnergyInvoice(p: IngestParams): Promise<IngestResult> {
  const db = storage.getDatabase();
  if (p.data.length > MAX_INVOICE_BYTES) return { kind: 'invalid', error: 'PDF maior que 8 MB.' };
  if (p.data.subarray(0, 5).toString('latin1') !== '%PDF-') return { kind: 'invalid', error: 'O arquivo não é um PDF.' };

  const hash = sha256(p.data);
  const same = db.documents.find(d => d.contentHash === hash && d.organizationId === p.organizationId && d.status !== 'ERRO');
  if (same) return { kind: 'duplicate', existing: same };

  const cee = db.indicators.find(i => i.acronym === ENERGY_KWH_ACRONYM);
  const now = new Date().toISOString();
  const doc: PLSDocument = {
    id: `doc-${Date.now()}-${hash.slice(0, 6)}`,
    organizationId: p.organizationId,
    title: 'Fatura de energia elétrica',
    fileName: String(p.fileName || 'fatura.pdf').slice(0, 200),
    fileType: 'FATURA',
    indicatorId: cee?.id,
    processNumber: p.processNumber?.trim() ? p.processNumber.trim().slice(0, 40) : undefined,
    status: 'PENDENTE_VALIDACAO',
    extractionConfidence: 0,
    fileSize: `${(p.data.length / 1024).toFixed(0)} KB`,
    uploadedAt: now,
    uploadedBy: p.actor.username,
    contentHash: hash,
    sourceSystem: p.source,
    ...(p.seiDocumentId ? { seiDocumentId: p.seiDocumentId } : {})
  };

  let text = '';
  try {
    text = (await pdfToText(p.data)).text;
  } catch (err: any) {
    doc.status = 'ERRO';
    doc.reviewReasons = [`Não foi possível ler o PDF: ${err?.message || err}`];
  }
  if (doc.status !== 'ERRO' && text.replace(/\s/g, '').length < 80) {
    doc.reviewReasons = ['PDF sem texto (provavelmente escaneado): informe os valores manualmente.'];
  }

  let measurements: IndicatorMeasurement[] = [];
  if (doc.status !== 'ERRO' && !doc.reviewReasons) {
    const ex = await extractEnergyInvoice(text);
    const f = ex.fields;
    Object.assign(doc, {
      title: f.supplier ? `Fatura de energia — ${f.supplier}` : doc.title,
      supplier: f.supplier ?? undefined,
      consumerUnit: f.consumerUnit ?? undefined,
      invoiceNumber: f.invoiceNumber ?? undefined,
      dueDate: f.dueDate ?? undefined,
      competence: f.competence ?? undefined,
      consumption: f.kwh ?? undefined,
      unit: 'kWh',
      amount: f.totalAmount ?? undefined,
      extractionConfidence: ex.confidence,
      ocrConfidence: ex.confidence,
      extractionMethod: ex.method,
      extractionNotes: ex.notes
    });
    const ctx = {
      organizationId: p.organizationId,
      indicators: db.indicators,
      measurements: db.measurements.filter(m => m.organizationId === p.organizationId),
      documents: db.documents
    };
    doc.reviewReasons = reviewReasons(f, ex.confidence, ctx, doc.id);
    if (doc.reviewReasons.length === 0 && f.competence) {
      doc.status = 'PROCESSADO';
      doc.validatedAt = now;
      doc.validatedBy = p.source === 'SEI' ? 'Lançamento automático (coleta SEI)' : 'Lançamento automático';
      measurements = energyMeasurementsFor({ ...ctx, documents: [doc, ...db.documents] }, f.competence, p.actor.username);
    }
  }
  doc.rawTextSnippet = text.slice(0, 4000);

  db.documents.unshift(doc);
  for (const m of measurements) {
    const i = db.measurements.findIndex(x => x.id === m.id);
    if (i >= 0) db.measurements[i] = m; else db.measurements.push(m);
  }
  const audit: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    organizationId: p.organizationId,
    userId: p.actor.username,
    userName: p.actor.displayName,
    action: 'EXTRAÇÃO_OCR',
    timestamp: now,
    entityType: 'DOCUMENT',
    entityId: doc.id,
    newValue:
      doc.status === 'PROCESSADO'
        ? `Lançado: ${doc.consumption?.toLocaleString('pt-BR')} kWh e R$ ${doc.amount?.toLocaleString('pt-BR')} (${doc.competence})`
        : `Pendente: ${(doc.reviewReasons || []).join(' ')}`,
    reason: `Leitura da fatura ${doc.fileName}${p.source === 'SEI' ? ` (SEI ${p.processNumber || ''})` : ''}. Confiança ${doc.extractionConfidence}%.`,
    source: p.source === 'SEI' ? 'Coleta automática do SEI' : 'Leitura de faturas de energia'
  };
  db.auditLogs.unshift(audit);
  await storage.saveNow();
  return { kind: 'done', document: doc, measurements };
}
