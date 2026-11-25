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
  /** Faixas de consumo lidas da descrição da conta (ponta, fora de ponta...). */
  kwhBreakdown?: ConsumptionLine[];
  /** Histórico de medição impresso na fatura (do mais antigo ao mês faturado). */
  history?: HistoryPoint[];
}

export interface ConsumptionLine {
  label: string;
  posto: string;
  kwh: number;
}

export interface HistoryPoint {
  competence: string; // YYYY-MM
  kwh: number;
}

/** Posto tarifário de uma linha "Consumo ...": TUSD e TE da mesma faixa repetem o mesmo kWh. */
function postoOf(label: string): string {
  const l = label.toLowerCase();
  if (/f\s*\/\s*p|fora|\bfp\b|f\.\s*p/.test(l)) return 'Fora de ponta';
  if (/interm/.test(l)) return 'Intermediário';
  if (/reserv/.test(l)) return 'Reservado';
  if (/ponta|\bpta\b/.test(l)) return 'Ponta';
  return 'Geral';
}

/**
 * Linhas "Consumo <faixa> N kWh" da descrição da conta. Faturas do grupo A trazem uma linha por
 * posto (Ponta, F/Ponta...); o consumo do mês é a soma dos postos. Linhas de TUSD e TE do mesmo
 * posto repetem o kWh e contam uma vez só.
 */
export function consumptionLines(text: string): { lines: ConsumptionLine[]; total: number | null } {
  const re = new RegExp(`consumo\\s+([^\\n\\d]{0,40}?)\\s*${NUM}\\s*kwh`, 'gi');
  const found: ConsumptionLine[] = [];
  for (const m of text.matchAll(re)) {
    const label = m[1].trim().replace(/[:\-]+$/, '').trim();
    if (/reativ|m[eé]di|hist|meses|kvar/i.test(label)) continue;
    const kwh = parseBRNumber(m[2]);
    if (kwh === null || kwh <= 0) continue;
    found.push({ label: label || 'Consumo', posto: postoOf(label), kwh });
  }
  const byPosto = new Map<string, ConsumptionLine>();
  for (const l of found) {
    const prev = byPosto.get(l.posto);
    if (!prev || l.kwh > prev.kwh) byPosto.set(l.posto, l);
  }
  // Com postos definidos, uma linha "Consumo" genérica igual à soma é o total: não soma de novo
  if (byPosto.size > 1 && byPosto.has('Geral')) {
    const geral = byPosto.get('Geral')!;
    byPosto.delete('Geral');
    const sum = [...byPosto.values()].reduce((a, l) => a + l.kwh, 0);
    if (Math.abs(sum - geral.kwh) > 1) byPosto.set('Geral', geral);
  }
  const lines = [...byPosto.values()];
  return { lines, total: lines.length ? Math.round(lines.reduce((a, l) => a + l.kwh, 0) * 100) / 100 : null };
}

const addMonths = (competence: string, delta: number) => {
  const [y, m] = competence.split('-').map(Number);
  const t = y * 12 + (m - 1) + delta;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
};

/**
 * Histórico de medição (gráfico de barras da fatura). O texto traz os valores em ordem
 * cronológica, terminando no mês faturado; os rótulos dos meses saem embaralhados no PDF,
 * por isso os meses são atribuídos a partir da competência.
 */
export function parseHistory(text: string, competence: string | null): HistoryPoint[] {
  if (!competence) return [];
  const i = text.search(/hist[oó]rico\s*de\s*(?:medi[cç][aã]o|consumo)/i);
  if (i < 0) return [];
  const win = text.slice(i, i + 800);
  const tok = '(?:\\d{1,3}(?:\\.\\d{3})+|\\d{1,7})';
  const run = new RegExp(`(?:^|\\s)(${tok}(?:[ \\t]+${tok}){5,12})(?=\\s|$)`).exec(win);
  if (!run) return [];
  const values = run[1].trim().split(/\s+/).map(v => parseBRNumber(v)).filter((v): v is number => v !== null);
  if (values.length < 6 || values.length > 13) return [];
  return values.map((kwh, k) => ({ competence: addMonths(competence, k - (values.length - 1)), kwh }));
}

/** Nº da NF3e a partir da chave de acesso (44 dígitos, modelo 66): posições 26–34. */
function nf3eNumber(text: string): string | null {
  for (const m of text.matchAll(/(?:\d{4}\s){10}\d{4}/g)) {
    const d = m[0].replace(/\s/g, '');
    if (d.length === 44 && d.slice(20, 22) === '66') return String(Number(d.slice(25, 34)));
  }
  return null;
}

const NUM = '(\\d{1,3}(?:\\.\\d{3})+(?:,\\d+)?|\\d+(?:,\\d+)?)';
/** Valor em reais: sempre com centavos (evita pegar "00" ou códigos soltos). */
const MONEY = '(\\d{1,3}(?:\\.\\d{3})*,\\d{2}|\\d+,\\d{2})(?!\\d)';

export function regexFields(text: string): InvoiceFields {
  const t = text.replace(/ /g, ' ');
  const first = (re: RegExp) => re.exec(t)?.[1] ?? null;

  const competenceRaw =
    first(/(?:m[eê]s\s*(?:\/\s*ano)?\s*(?:de\s*)?refer[eê]ncia|refer[eê]ncia|compet[eê]ncia)\s*[:\-]?\s*([a-zç]{3,9}\.?\s*(?:de\s*)?[/.-]?\s*\d{4}|\d{1,2}\s*[/.-]\s*\d{4})/i) ??
    // "Mês Faturado" com o valor algumas palavras adiante (layout em colunas)
    first(/m[eê]s\s*faturado[\s\S]{0,120}?(?<![\d/])(\d{2}\/\d{4})(?!\d)/i);

  const total =
    first(new RegExp(`(?:total\\s*a\\s*pagar|valor\\s*a\\s*pagar|valor\\s*total(?:\\s*da\\s*(?:fatura|nota))?|total\\s*da\\s*fatura)\\s*(?:\\(?R\\$\\)?)?\\s*[:\\-]?\\s*(?:R\\$\\s*)?${MONEY}`, 'i')) ??
    // "R$ 36.099,42 Total a pagar" (valor antes do rótulo)
    first(new RegExp(`R\\$\\s*${MONEY}\\s*(?:total|valor)\\s*a\\s*pagar`, 'i')) ??
    // canhoto: "Valor a Pagar ... R$ 36.099,42"
    first(new RegExp(`valor\\s*a\\s*pagar[\\s\\S]{0,160}?R\\$\\s*${MONEY}`, 'i'));

  // Consumo: soma das faixas (ponta, fora de ponta...); senão "N kWh ... consumo"
  const { lines, total: linesTotal } = consumptionLines(t);
  const kwh = linesTotal ?? parseBRNumber(first(new RegExp(`${NUM}\\s*kwh[^\\n]{0,20}consumo`, 'i')));
  const competence = parseCompetence(competenceRaw);

  return {
    supplier: null,
    consumerUnit: first(/n[uú]mero\s*da\s*UC[\s\S]{0,140}?(\d{6,}-\d{1,2})/i) ?? first(/(?:unidade\s*consumidora|\bUC\b|c[oó]digo\s*(?:da\s*)?instala[cç][aã]o|instala[cç][aã]o|n[ºo°.]?\s*do\s*cliente|c[oó]digo\s*do\s*cliente)\s*[:\-nº°.]*\s*([0-9][0-9.\-/]{3,})/i),
    invoiceNumber: nf3eNumber(t) ?? first(/(?:nota\s*fiscal|n\.?\s*f\.?|fatura)\s*(?:eletr[oô]nica\s*)?(?:n[ºo°.]?|n[uú]mero)\s*[:\-]?\s*([0-9][0-9.\-/]{2,})/i),
    competence,
    kwh,
    totalAmount: parseBRNumber(total),
    dueDate: first(/vencimento\s*[:\-]?\s*(\d{2}\/\d{2}\/\d{4})/i) ?? first(/vencimento[\s\S]{0,100}?(\d{2}\/\d{2}\/\d{4})/i),
    kwhBreakdown: lines,
    history: parseHistory(t, competence)
  };
}

// ------------------------------------------------------------------ IA local
const SYSTEM_PROMPT = `Você extrai dados de faturas de energia elétrica de concessionárias brasileiras.
Responda SOMENTE com um objeto JSON, sem texto antes ou depois, com estas chaves:
{"concessionaria": string|null, "unidade_consumidora": string|null, "numero_fatura": string|null,
 "mes_referencia": "MM/AAAA"|null, "consumo_kwh": number|null, "valor_total_reais": number|null,
 "vencimento": "DD/MM/AAAA"|null}
Regras:
- consumo_kwh é o consumo de energia ATIVA faturado no mês. Faturas do grupo A têm uma linha por posto
  tarifário ("Consumo Ponta", "Consumo F/Ponta" ou "Fora Ponta", "Intermediário"): SOME todas essas linhas.
  Não use demanda (kW), energia reativa (kVArh), leituras do medidor nem a média de 12 meses.
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
    const histNow = rx.history?.length ? rx.history[rx.history.length - 1].kwh : null;
    if (histNow !== null && close(rx.kwh, histNow)) notes.push('Consumo confere com o histórico de medição da fatura.');
    return { fields: rx, confidence: 55, method: 'Expressões regulares (sem IA)', notes: [...notes, 'Lido sem IA: confira os valores.'] };
  }
  const f: InvoiceFields = { ...ai.fields, kwhBreakdown: rx.kwhBreakdown };
  let confidence = 100;
  // Histórico impresso na fatura: o último ponto é o próprio mês faturado
  const hist = parseHistory(text, f.competence ?? rx.competence);
  f.history = hist;
  const histNow = hist.length ? hist[hist.length - 1].kwh : null;
  if (rx.kwh !== null && close(rx.kwh, histNow)) {
    if (!close(f.kwh, rx.kwh)) {
      const parts = (rx.kwhBreakdown || []).map(l => `${l.label} ${l.kwh.toLocaleString('pt-BR')}`).join(' + ');
      notes.push(`Consumo = soma das faixas (${parts}) = ${rx.kwh.toLocaleString('pt-BR')} kWh, igual ao histórico de medição da fatura${f.kwh !== null ? `; a IA tinha lido ${f.kwh.toLocaleString('pt-BR')}` : ''}.`);
      f.kwh = rx.kwh;
    } else {
      notes.push('Consumo confere com o histórico de medição da fatura.');
    }
  } else if (histNow !== null && f.kwh !== null && close(f.kwh, histNow)) {
    notes.push('Consumo confere com o histórico de medição da fatura.');
  } else if (histNow !== null && f.kwh !== null) {
    confidence -= 15;
    notes.push(`Consumo lido (${f.kwh.toLocaleString('pt-BR')} kWh) difere do histórico de medição da fatura para o mês (${histNow.toLocaleString('pt-BR')} kWh).`);
  }
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
      consumerUnit: rx.consumerUnit ?? f.consumerUnit,
      // Número tirado da chave de acesso da NF3e é exato
      invoiceNumber: rx.invoiceNumber ?? f.invoiceNumber,
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


/**
 * Compara o histórico de medição da fatura com o que está lançado no iPLS (CEE do órgão).
 * O órgão pode ter várias unidades consumidoras: diferença não é necessariamente erro.
 */
export function compareHistory(
  history: HistoryPoint[] | undefined,
  measurements: IndicatorMeasurement[],
  ceeId: string,
  organizationId: string,
  currentCompetence?: string | null
): HistoryComparison[] {
  if (!history?.length) return [];
  const launched = new Map<string, number>();
  for (const m of measurements) {
    if (m.indicatorId !== ceeId || m.organizationId !== organizationId || m.month < 1 || m.month > 12) continue;
    const k = `${m.year}-${String(m.month).padStart(2, '0')}`;
    launched.set(k, (launched.get(k) ?? 0) + m.value);
  }
  return history
    .filter(h => h.competence !== currentCompetence)
    .map(h => {
      const v = launched.get(h.competence) ?? null;
      return {
        competence: h.competence,
        invoiceKwh: h.kwh,
        iplsKwh: v,
        diffPct: v !== null && h.kwh > 0 ? Math.round(((v - h.kwh) / h.kwh) * 1000) / 10 : null
      };
    });
}

export interface HistoryComparison {
  competence: string;
  invoiceKwh: number;
  iplsKwh: number | null;
  diffPct: number | null;
}
