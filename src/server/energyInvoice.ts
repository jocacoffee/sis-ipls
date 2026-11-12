/**
 * Leitura de faturas de energia elétrica (PDF) e lançamento nos indicadores CEE (kWh) e GEE (R$).
 *
 * 1. Texto do PDF (pdfjs-dist). PDF escaneado, sem texto, não é lido.
 * 2. IA local (JSON estruturado) + expressões regulares para conferir os mesmos campos.
 * 3. Checagens de consistência. Tudo certo → lançamento automático (VALIDADO);
 *    qualquer dúvida → documento pendente de validação, sem mexer nos indicadores.
 *
 * O mesmo motor será usado pela sincronização com o SEI (docs/INTEGRACAO-SEI.md).
 */
import crypto from 'crypto';
import type { Indicator, IndicatorMeasurement, PLSDocument } from '../types';
import { callLocalLLM, extractJson, localLLMSettings } from './localLLM';
import { detectMeasurementInconsistencies } from '../services/calculationEngine';

export const ENERGY_KWH_ACRONYM = 'CEE';
export const ENERGY_COST_ACRONYM = 'GEE';
/** Confiança mínima para lançar sem validação humana. */
export const AUTO_CONFIDENCE = 85;

// ------------------------------------------------------------------ texto do PDF
export async function pdfToText(data: Buffer): Promise<{ text: string; pages: number }> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(data),
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true
  }).promise;
  const parts: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    let line = '';
    for (const item of content.items as { str?: string; hasEOL?: boolean }[]) {
      line += item.str ?? '';
      if (item.hasEOL) {
        parts.push(line);
        line = '';
      } else {
        line += ' ';
      }
    }
    if (line.trim()) parts.push(line);
    parts.push('');
  }
  await doc.destroy();
  const text = parts.join('\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return { text, pages: doc.numPages };
}

// ------------------------------------------------------------------ números e datas (pt-BR)
/** "12.345,67" → 12345.67; "12345" → 12345; "1,234.5" (raro) → 1234.5 */
export function parseBRNumber(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  let s = String(raw).replace(/[^\d.,-]/g, '');
  if (!s) return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
  else if (lastDot > lastComma && lastComma >= 0) s = s.replace(/,/g, '');
  else if (lastDot >= 0 && /\.\d{3}$/.test(s) && !/\.\d{1,2}$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const MONTHS: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12
};

/** "10/2026", "OUT/2026", "outubro de 2026", "2026-10" → "2026-10" */
export function parseCompetence(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).toLowerCase().trim();
  let m = /^(\d{4})-(\d{1,2})$/.exec(s);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}`;
  m = /(\d{1,2})\s*[/.-]\s*(\d{4})/.exec(s);
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 12) return `${m[2]}-${m[1].padStart(2, '0')}`;
  m = /(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç]*\.?\s*(?:de\s*)?[/.-]?\s*(\d{4})/.exec(s);
  if (m) return `${m[2]}-${String(MONTHS[m[1]]).padStart(2, '0')}`;
  return null;
}

// ------------------------------------------------------------------ expressões regulares
export interface InvoiceFields {
  supplier: string | null;
  consumerUnit: string | null;
  invoiceNumber: string | null;
  competence: string | null; // YYYY-MM
  kwh: number | null;
  totalAmount: number | null;
  dueDate: string | null;
}

const NUM = '(\\d{1,3}(?:\\.\\d{3})+(?:,\\d+)?|\\d+(?:,\\d+)?)';

export function regexFields(text: string): InvoiceFields {
  const t = text.replace(/ /g, ' ');
  const first = (re: RegExp) => re.exec(t)?.[1] ?? null;

  const competenceRaw =
    first(/(?:m[eê]s\s*(?:\/\s*ano)?\s*(?:de\s*)?refer[eê]ncia|refer[eê]ncia|compet[eê]ncia)\s*[:\-]?\s*([a-zç]{3,9}\.?\s*(?:de\s*)?[/.-]?\s*\d{4}|\d{1,2}\s*[/.-]\s*\d{4})/i);

  const total =
    first(new RegExp(`(?:total\\s*a\\s*pagar|valor\\s*a\\s*pagar|valor\\s*total(?:\\s*da\\s*(?:fatura|nota))?|total\\s*da\\s*fatura)\\s*(?:\\(?R\\$\\)?)?\\s*[:\\-]?\\s*(?:R\\$\\s*)?${NUM}`, 'i'));

  // Consumo: soma ponta + fora ponta quando existirem; senão o primeiro "consumo ... kWh"
  const ponta = first(new RegExp(`consumo\\s*(?:ativo\\s*)?(?:na\\s*)?ponta[^\\n\\d]{0,30}${NUM}\\s*kwh`, 'i'));
  const foraPonta = first(new RegExp(`consumo\\s*(?:ativo\\s*)?fora\\s*(?:de\\s*)?ponta[^\\n\\d]{0,30}${NUM}\\s*kwh`, 'i'));
  let kwh: number | null = null;
  if (ponta && foraPonta) kwh = (parseBRNumber(ponta) ?? 0) + (parseBRNumber(foraPonta) ?? 0);
  else {
    const c =
      first(new RegExp(`consumo[^\\n\\d]{0,40}${NUM}\\s*kwh`, 'i')) ??
      first(new RegExp(`${NUM}\\s*kwh[^\\n]{0,20}consumo`, 'i'));
    kwh = parseBRNumber(c);
  }

  return {
    supplier: null,
    consumerUnit: first(/(?:unidade\s*consumidora|\bUC\b|c[oó]digo\s*(?:da\s*)?instala[cç][aã]o|instala[cç][aã]o|n[ºo°.]?\s*do\s*cliente|c[oó]digo\s*do\s*cliente)\s*[:\-nº°.]*\s*([0-9][0-9.\-/]{3,})/i),
    invoiceNumber: first(/(?:nota\s*fiscal|n\.?\s*f\.?|fatura)\s*(?:eletr[oô]nica\s*)?(?:n[ºo°.]?|n[uú]mero)\s*[:\-]?\s*([0-9][0-9.\-/]{2,})/i),
    competence: parseCompetence(competenceRaw),
    kwh,
    totalAmount: parseBRNumber(total),
    dueDate: first(/vencimento\s*[:\-]?\s*(\d{2}\/\d{2}\/\d{4})/i)
  };
}

// ------------------------------------------------------------------ IA local
const SYSTEM_PROMPT = `Você extrai dados de faturas de energia elétrica de concessionárias brasileiras.
Responda SOMENTE com um objeto JSON, sem texto antes ou depois, com estas chaves:
{"concessionaria": string|null, "unidade_consumidora": string|null, "numero_fatura": string|null,
 "mes_referencia": "MM/AAAA"|null, "consumo_kwh": number|null, "valor_total_reais": number|null,
 "vencimento": "DD/MM/AAAA"|null}
Regras:
- consumo_kwh é o consumo de energia ATIVA faturado no mês; se houver ponta e fora de ponta, some os dois. Não use demanda (kW), energia reativa (kVArh) nem leituras do medidor.
- valor_total_reais é o total a pagar da fatura.
- mes_referencia é o mês de consumo/referência da fatura (não o vencimento).
- Números em formato JSON (ponto como separador decimal, sem separador de milhar).
- Se um campo não estiver no texto, use null. Não invente valores.`;

export async function llmFields(text: string): Promise<{ fields: InvoiceFields; model: string } | null> {
  const settings = localLLMSettings();
  if (!settings.endpoint || !settings.model) return null;
  const excerpt = text.slice(0, 9000);
  const { text: answer, model } = await callLocalLLM(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Texto da fatura:\n"""\n${excerpt}\n"""` }
    ],
    { maxTokens: 400, timeoutMs: Math.max(settings.timeoutMs, 90_000) }
  );
  const j = extractJson<Record<string, unknown>>(answer);
  const str = (v: unknown) => (v === null || v === undefined || v === '' ? null : String(v).trim());
  return {
    model,
    fields: {
      supplier: str(j.concessionaria),
      consumerUnit: str(j.unidade_consumidora),
      invoiceNumber: str(j.numero_fatura),
      competence: parseCompetence(str(j.mes_referencia)),
      kwh: parseBRNumber(j.consumo_kwh as string | number),
      totalAmount: parseBRNumber(j.valor_total_reais as string | number),
      dueDate: str(j.vencimento)
    }
  };
}

const close = (a: number | null, b: number | null, tol = 0.01) =>
  a !== null && b !== null && Math.abs(a - b) <= Math.max(1, Math.abs(b) * tol);

export interface InvoiceExtraction {
  fields: InvoiceFields;
  confidence: number;
  method: string;
  notes: string[];
}

/** Combina IA e regex. A IA manda; a regex confere. Sem IA, só a regex (vai para validação). */
export async function extractEnergyInvoice(text: string): Promise<InvoiceExtraction> {
  const rx = regexFields(text);
  const notes: string[] = [];
  let ai: Awaited<ReturnType<typeof llmFields>> = null;
  try {
    ai = await llmFields(text);
  } catch (err: any) {
    notes.push(`IA local indisponível: ${err?.message || err}`);
  }
  if (!ai) {
    return { fields: rx, confidence: 55, method: 'Expressões regulares (sem IA)', notes: [...notes, 'Lido sem IA: confira os valores.'] };
  }
  const f = ai.fields;
  let confidence = 100;
  const check = (label: string, aiVal: number | null, rxVal: number | null) => {
    if (aiVal === null) { confidence -= 40; notes.push(`${label} não encontrado.`); return; }
    if (rxVal === null) { confidence -= 8; notes.push(`${label}: só a IA encontrou (${aiVal.toLocaleString('pt-BR')}).`); return; }
    if (!close(aiVal, rxVal)) {
      confidence -= 30;
      notes.push(`${label}: IA leu ${aiVal.toLocaleString('pt-BR')} e a conferência ${rxVal.toLocaleString('pt-BR')}.`);
    }
  };
  check('Consumo (kWh)', f.kwh, rx.kwh);
  check('Valor total (R$)', f.totalAmount, rx.totalAmount);
  if (!f.competence) { confidence -= 40; notes.push('Mês de referência não encontrado.'); }
  else if (rx.competence && rx.competence !== f.competence) {
    confidence -= 30;
    notes.push(`Mês de referência: IA leu ${f.competence} e a conferência ${rx.competence}.`);
  }
  return {
    fields: {
      ...f,
      consumerUnit: f.consumerUnit ?? rx.consumerUnit,
      invoiceNumber: f.invoiceNumber ?? rx.invoiceNumber,
      dueDate: f.dueDate ?? rx.dueDate
    },
    confidence: Math.max(0, confidence),
    method: `IA local (${ai.model}) + conferência por expressões regulares`,
    notes
  };
}

// ------------------------------------------------------------------ checagens e lançamento
export interface IngestContext {
  organizationId: string;
  indicators: Indicator[];
  /** Medições do órgão (todos os anos). */
  measurements: IndicatorMeasurement[];
  /** Documentos já existentes (para detectar fatura repetida e somar UCs). */
  documents: PLSDocument[];
  now?: Date;
}

export const sha256 = (data: Buffer) => crypto.createHash('sha256').update(data).digest('hex');

/** Motivos para NÃO lançar automaticamente (lista vazia = pode lançar). */
export function reviewReasons(fields: InvoiceFields, confidence: number, ctx: IngestContext, docId?: string): string[] {
  const reasons: string[] = [];
  const cee = ctx.indicators.find(i => i.acronym === ENERGY_KWH_ACRONYM);
  const gee = ctx.indicators.find(i => i.acronym === ENERGY_COST_ACRONYM);
  if (!cee || !gee) return ['Indicadores CEE/GEE não encontrados no catálogo.'];
  if (confidence < AUTO_CONFIDENCE) reasons.push(`Confiança da leitura abaixo de ${AUTO_CONFIDENCE}%.`);
  if (!fields.competence) return [...reasons, 'Sem mês de referência.'];
  const [y, m] = fields.competence.split('-').map(Number);
  const now = ctx.now ?? new Date();
  if (y < 2021 || y * 12 + m > now.getFullYear() * 12 + now.getMonth() + 1) reasons.push(`Mês de referência fora do período válido (${fields.competence}).`);
  if (!fields.kwh || fields.kwh <= 0) reasons.push('Consumo (kWh) ausente ou zero.');
  if (!fields.totalAmount || fields.totalAmount <= 0) reasons.push('Valor total ausente ou zero.');

  // Mesma fatura/UC já lida para o mês
  const dup = ctx.documents.find(
    d => d.id !== docId && d.organizationId === ctx.organizationId && d.competence === fields.competence &&
      d.status !== 'ERRO' && (
        (fields.invoiceNumber && d.invoiceNumber === fields.invoiceNumber) ||
        (fields.consumerUnit && d.consumerUnit === fields.consumerUnit)
      )
  );
  if (dup) reasons.push(`Já existe fatura desta unidade consumidora/número para ${fields.competence} (${dup.fileName}).`);

  // Lançamento manual/importado no mês prevalece
  const existing = ctx.measurements.find(
    x => x.organizationId === ctx.organizationId && x.year === y && x.month === m &&
      (x.indicatorId === cee.id || x.indicatorId === gee.id) && x.sourceType !== 'document_extraction'
  );
  if (existing) reasons.push(`Já existe lançamento ${existing.sourceType === 'manual' ? 'manual' : 'importado'} de energia para ${String(m).padStart(2, '0')}/${y}.`);

  // R$/kWh coerente com o histórico do órgão (últimos 24 meses com os dois valores)
  if (fields.kwh && fields.totalAmount) {
    const price = fields.totalAmount / fields.kwh;
    const pairs: number[] = [];
    const byKey = (ind: string) => new Map(
      ctx.measurements.filter(x => x.indicatorId === ind && x.organizationId === ctx.organizationId && x.month >= 1 && x.month <= 12)
        .map(x => [`${x.year}-${x.month}`, x.value] as const)
    );
    const k = byKey(cee.id), g = byKey(gee.id);
    for (const [key, kv] of k) { const gv = g.get(key); if (kv > 0 && gv && gv > 0) pairs.push(gv / kv); }
    const recent = pairs.slice(-24);
    if (recent.length >= 3) {
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      if (price < avg * 0.6 || price > avg * 1.4) {
        reasons.push(`Preço médio R$ ${price.toFixed(2)}/kWh fora da faixa histórica do órgão (média R$ ${avg.toFixed(2)}/kWh).`);
      }
    } else if (price < 0.3 || price > 3) {
      reasons.push(`Preço médio R$ ${price.toFixed(2)}/kWh fora da faixa usual.`);
    }

    // Pico de consumo pela regra dos alertas (meses anteriores + mesmo mês do ano anterior)
    const monthTotal = monthSum(ctx, fields.competence, 'kwh') + fields.kwh;
    const simulated: IndicatorMeasurement[] = [
      ...ctx.measurements.filter(x => x.indicatorId === cee.id && !(x.year === y && x.month === m)),
      { id: 'simulado', indicatorId: cee.id, organizationId: ctx.organizationId, year: y, month: m, value: monthTotal,
        unit: 'kWh', sourceType: 'document_extraction', validationStatus: 'VALIDADO', confidenceScore: confidence,
        createdAt: now.toISOString(), updatedAt: now.toISOString() }
    ];
    const spike = detectMeasurementInconsistencies([cee], simulated, y).find(a => a.type === 'SPIKE' && a.month === m);
    if (spike) reasons.push(`Consumo atípico: ${spike.message}`);
  }
  return reasons;
}

/** Soma do mês nas faturas já lançadas do órgão (várias unidades consumidoras). */
function monthSum(ctx: IngestContext, competence: string, field: 'kwh' | 'amount', exceptId?: string): number {
  return ctx.documents
    .filter(d => d.id !== exceptId && d.organizationId === ctx.organizationId && d.competence === competence &&
      d.status === 'PROCESSADO' && d.indicatorId === ctx.indicators.find(i => i.acronym === ENERGY_KWH_ACRONYM)?.id)
    .reduce((a, d) => a + Number((field === 'kwh' ? d.consumption : d.amount) || 0), 0);
}

/**
 * Medições CEE e GEE do mês = soma das faturas PROCESSADAS do órgão naquele mês.
 * Retorna as medições a gravar (criadas ou atualizadas).
 */
export function energyMeasurementsFor(ctx: IngestContext, competence: string, userLogin: string): IndicatorMeasurement[] {
  const cee = ctx.indicators.find(i => i.acronym === ENERGY_KWH_ACRONYM)!;
  const gee = ctx.indicators.find(i => i.acronym === ENERGY_COST_ACRONYM)!;
  const [y, m] = competence.split('-').map(Number);
  const docs = ctx.documents.filter(
    d => d.organizationId === ctx.organizationId && d.competence === competence && d.status === 'PROCESSADO' && d.indicatorId === cee.id
  );
  const now = new Date().toISOString();
  const note = `Faturas: ${docs.map(d => `${d.consumerUnit ? `UC ${d.consumerUnit}` : d.fileName}${d.invoiceNumber ? ` (nº ${d.invoiceNumber})` : ''}`).join('; ')}`;
  const build = (ind: Indicator, value: number): IndicatorMeasurement => {
    const prev = ctx.measurements.find(x => x.organizationId === ctx.organizationId && x.indicatorId === ind.id && x.year === y && x.month === m);
    return {
      ...(prev || {}),
      id: prev?.id || `doc-${ctx.organizationId.replace('org-', '')}-${ind.id.replace('indicator-', '')}-${y}-${String(m).padStart(2, '0')}`,
      indicatorId: ind.id,
      organizationId: ctx.organizationId,
      year: y,
      month: m,
      value: Math.round(value * 100) / 100,
      unit: ind.unit,
      sourceType: 'document_extraction',
      sourceReference: docs.length === 1 ? `Fatura ${docs[0].fileName}` : `${docs.length} faturas`,
      sourceDocumentId: docs[0]?.id,
      processNumber: docs.find(d => d.processNumber)?.processNumber,
      validationStatus: 'VALIDADO',
      validatedBy: userLogin,
      validatedAt: now,
      confidenceScore: Math.min(...docs.map(d => d.extractionConfidence || 0)),
      notes: note,
      createdAt: prev?.createdAt || now,
      updatedAt: now
    } as IndicatorMeasurement;
  };
  return [
    build(cee, docs.reduce((a, d) => a + Number(d.consumption || 0), 0)),
    build(gee, docs.reduce((a, d) => a + Number(d.amount || 0), 0))
  ];
}
