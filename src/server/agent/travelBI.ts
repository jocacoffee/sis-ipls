/**
 * Coleta das emissões de viagens aéreas a serviço do painel de BI de viagens (Power BI).
 *
 * O painel é publicado com "Publicar na Web"; o iPLS faz as mesmas consultas que o navegador faz
 * ao abri-lo (endpoint público do Power BI, sem login). Lê trecho a trecho a unidade, a data de
 * partida, a distância e a emissão, e soma por órgão e mês no campo GEEViag (20.C9).
 *
 * Por que trecho a trecho: a medida "Emissão Total (t)" do painel não é somável. Em totais
 * agregados ela aplica o fator do voo curto a toda a distância; por trecho, o fator certo da faixa.
 *
 * Configuração (variáveis de ambiente):
 *   TRAVEL_BI_URL         link "Publicar na Web" do painel (https://app.powerbi.com/view?r=...)
 *   TRAVEL_BI_API_HOST    opcional: servidor da API (descoberto pela página do painel se vazio)
 *   TRAVEL_BI_SYNC_HOUR   hora da coleta diária (0–23; padrão 4; vazio desliga o agendamento)
 *
 * Endpoint não documentado: se a Microsoft ou a SJBA mudarem o relatório, a coleta falha com
 * mensagem clara e os valores já lançados ficam como estão.
 */
import { gunzipSync } from 'zlib';
import { storage } from '../storage';
import type { AuditLog, IndicatorMeasurement, TravelStats } from '../../types';

const env = process.env;
const INDICATOR_ACRONYM = 'GEEViag';
const ID_PREFIX = 'bi-viagens';

export interface TravelBIRun {
  at: string;
  trigger: 'AGENDADO' | 'MANUAL' | 'INICIAL';
  ok: boolean;
  message: string;
  panelRefreshedAt?: string;
  trips?: number;
  written?: number;
  skippedManual?: number;
  unmappedUnits?: string[];
}

let lastRun: TravelBIRun | null = null;
let running = false;

export function travelBIStatus() {
  const url = (env.TRAVEL_BI_URL || '').trim();
  return {
    configured: !!url,
    running,
    lastRun,
    message: url ? 'Coleta do painel de viagens configurada.' : 'Coleta desligada (defina TRAVEL_BI_URL).'
  };
}

function resourceKeyOf(url: string): string {
  const r = new URL(url).searchParams.get('r');
  if (!r) throw new Error('TRAVEL_BI_URL sem o parâmetro r= do "Publicar na Web".');
  const tok = JSON.parse(Buffer.from(r, 'base64').toString('utf-8'));
  if (!tok.k) throw new Error('Não foi possível ler a chave do painel no link.');
  return tok.k as string;
}

async function readBody(res: Response): Promise<any> {
  const buf = Buffer.from(await res.arrayBuffer());
  const raw = buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf) : buf;
  return JSON.parse(raw.toString('utf-8'));
}

async function apiHost(viewUrl: string): Promise<string> {
  if (env.TRAVEL_BI_API_HOST) return env.TRAVEL_BI_API_HOST.replace(/\/$/, '');
  const html = await (await fetch(viewUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30000) })).text();
  const m = html.match(/ClusterUri['"]?\s*[:=]\s*['"](https:\/\/[^'"]+?)\/?['"]/);
  if (!m) throw new Error('Não foi possível descobrir o servidor do Power BI pela página do painel (defina TRAVEL_BI_API_HOST).');
  return m[1].replace('-redirect.', '-api.').replace(/\/$/, '');
}

async function pbi(host: string, key: string, path: string, body?: unknown) {
  const res = await fetch(`${host}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'X-PowerBI-ResourceKey': key, 'Content-Type': 'application/json', Accept: 'application/json', 'Accept-Encoding': 'gzip' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(120000)
  });
  if (!res.ok) throw new Error(`Power BI respondeu HTTP ${res.status} em ${path.split('?')[0]}.`);
  return readBody(res);
}

const col = (src: string, prop: string) => ({ Column: { Expression: { SourceRef: { Source: src } }, Property: prop }, Name: `${src}.${prop}` });
const mea = (src: string, prop: string) => ({ Measure: { Expression: { SourceRef: { Source: src } }, Property: prop }, Name: `${src}.${prop}` });

/** Decodifica o formato compactado (DSR) do Power BI em linhas. */
function decodeDSR(result: any): unknown[][] {
  const data = result?.results?.[0]?.result?.data;
  const ds = data?.dsr?.DS?.[0];
  if (!ds) {
    const err = result?.results?.[0]?.result?.data?.dsr?.DataShapes?.[0]?.['odata.error'] || result?.error;
    throw new Error(`Consulta ao painel sem dados${err ? `: ${JSON.stringify(err).slice(0, 200)}` : '.'}`);
  }
  const dicts: Record<string, unknown[]> = ds.ValueDicts || {};
  const rows: unknown[][] = [];
  let cols: { N: string; DN?: string }[] = [];
  let prev: unknown[] | null = null;
  for (const dm of ds.PH?.[0]?.DM0 || []) {
    if (dm.S) cols = dm.S;
    const vals: unknown[] = dm.C || [];
    const repeat: number = dm.R || 0;
    const nulls: number = dm['Ø'] || 0;
    let k = 0;
    const row = cols.map((c, i) => {
      if (prev && repeat & (1 << i)) return prev[i];
      if (nulls & (1 << i)) return null;
      const v = vals[k++];
      return c.DN && typeof v === 'number' ? dicts[c.DN][v] : v;
    });
    rows.push(row);
    prev = row;
  }
  return rows;
}

/** Nome da unidade no painel → órgão do iPLS (TRF1 = 2º grau; SJXX = seção). */
function orgIdFor(unit: string, orgIds: Set<string>): string | null {
  const u = unit.trim().toUpperCase();
  const id = u === 'TRF1' ? 'org-trf1-2g' : `org-${u.toLowerCase()}`;
  return orgIds.has(id) ? id : null;
}

export async function runTravelBISync(trigger: TravelBIRun['trigger'] = 'MANUAL'): Promise<TravelBIRun> {
  const url = (env.TRAVEL_BI_URL || '').trim();
  const at = new Date().toISOString();
  if (!url) return (lastRun = { at, trigger, ok: false, message: 'Coleta desligada (defina TRAVEL_BI_URL).' });
  if (running) return { at, trigger, ok: false, message: 'Já há uma coleta em andamento.' };
  running = true;
  try {
    const key = resourceKeyOf(url);
    const host = await apiHost(url);
    const me = await pbi(host, key, `/public/reports/${key}/modelsAndExploration?preferReadOnlySession=true`);
    const model = me?.models?.[0];
    if (!model?.id) throw new Error('Painel sem modelo de dados publicado.');

    const select = [
      col('u', 'Índice'), col('u', 'Data Partida'), col('u', 'Unidade'), col('u', 'Distancia (km)'),
      col('u', 'Trajeto Normalizado'), col('u', 'Destino'), col('u', 'Categoria Distancia'),
      mea('m', 'Emissão Total (t)')
    ];
    const query = {
      version: '1.0.0',
      queries: [{
        Query: { Commands: [{ SemanticQueryDataShapeCommand: {
          Query: { Version: 2, From: [{ Name: 'u', Entity: 'Carbonometro', Type: 0 }, { Name: 'm', Entity: 'Medidas', Type: 0 }], Select: select },
          Binding: { Primary: { Groupings: [{ Projections: select.map((_, i) => i) }] }, DataReduction: { DataVolume: 4, Primary: { Window: { Count: 100000 } } }, Version: 1 }
        } }] },
        QueryId: ''
      }],
      cancelQueries: [],
      modelId: model.id
    };
    const rows = decodeDSR(await pbi(host, key, '/public/reports/querydata?synchronous=true', query));
    if (!rows.length) throw new Error('O painel não devolveu nenhum trecho.');

    const db = storage.getDatabase();
    const ind = db.indicators.find(i => i.acronym === INDICATOR_ACRONYM);
    if (!ind) throw new Error('Campo GEEViag (20.C9) não encontrado no catálogo.');
    const orgIds = new Set(db.organizations.filter(o => !o.isConsolidated).map(o => o.id));

    // Soma por órgão e mês (só meses já iniciados: viagens futuras ficam para depois)
    const now = new Date();
    const limit = now.getUTCFullYear() * 12 + now.getUTCMonth();
    const agg = new Map<string, { orgId: string; year: number; month: number; t: number; trips: number; km: number }>();
    const unmapped = new Set<string>();
    const stats = new Map<string, TravelStats>();
    for (const [, dateMs, unit, km, route, dest, category, emission] of rows) {
      if (typeof dateMs !== 'number' || typeof unit !== 'string') continue;
      const d = new Date(dateMs);
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth() + 1;
      if (year < 2021 || year * 12 + month - 1 > limit) continue;
      const orgId = orgIdFor(unit, orgIds);
      if (!orgId) { unmapped.add(unit); continue; }
      const k = `${orgId}__${year}__${month}`;
      const a = agg.get(k) || { orgId, year, month, t: 0, trips: 0, km: 0 };
      a.t += Number(emission) || 0;
      a.km += Number(km) || 0;
      a.trips += 1;
      agg.set(k, a);

      // Estatísticas do ano (gráficos de viagens), sem dados pessoais
      const sk = `${orgId}__${year}`;
      const st = stats.get(sk) || {
        id: sk, organizationId: orgId, year, trips: 0, km: 0, tCO2e: 0,
        byDestination: {}, byRoute: {}, byCategory: {},
        byMonth: Array.from({ length: 12 }, () => ({ trips: 0, t: 0 })), updatedAt: ''
      };
      const t = Number(emission) || 0;
      const dist = Number(km) || 0;
      st.trips += 1; st.km += dist; st.tCO2e += t;
      st.byMonth[month - 1].trips += 1; st.byMonth[month - 1].t += t;
      const city = typeof dest === 'string' && dest.trim() ? dest.trim() : 'Não informado';
      st.byDestination[city] = (st.byDestination[city] || 0) + 1;
      const r = typeof route === 'string' && route.trim() ? route.trim() : 'Não informado';
      const rr = (st.byRoute[r] ||= { trips: 0, t: 0 }); rr.trips += 1; rr.t += t;
      const c = typeof category === 'string' && category.trim() ? category.trim() : 'Não informada';
      const cc = (st.byCategory[c] ||= { trips: 0, km: 0, t: 0 }); cc.trips += 1; cc.km += dist; cc.t += t;
      stats.set(sk, st);
    }

    const refreshed = model.LastRefreshTime ? String(model.LastRefreshTime) : undefined;
    const stamp = new Date().toISOString();
    let written = 0;
    let skippedManual = 0;
    const seen = new Set<string>();
    for (const a of agg.values()) {
      const id = `${ID_PREFIX}__${a.orgId}__${a.year}__${String(a.month).padStart(2, '0')}`;
      seen.add(id);
      // Lançamento manual do mesmo órgão/mês prevalece
      const manual = db.measurements.find(m => m.indicatorId === ind.id && m.organizationId === a.orgId && m.year === a.year && m.month === a.month && m.id !== id);
      if (manual) { skippedManual++; continue; }
      const value = Math.round(a.t * 1e6) / 1e6;
      const i = db.measurements.findIndex(m => m.id === id);
      const prev = i >= 0 ? db.measurements[i] : undefined;
      if (prev && prev.value === value) continue;
      const m: IndicatorMeasurement = {
        id,
        indicatorId: ind.id,
        organizationId: a.orgId,
        year: a.year,
        month: a.month,
        value,
        unit: ind.unit,
        sourceType: 'API',
        sourceReference: 'Painel de BI de viagens (Power BI)',
        extractionMethod: 'Soma trecho a trecho das emissões do painel',
        validationStatus: 'VALIDADO',
        validatedBy: 'Coleta automática do painel de viagens',
        validatedAt: stamp,
        notes: `${a.trips} trecho(s), ${Math.round(a.km).toLocaleString('pt-BR')} km${refreshed ? `; painel atualizado em ${refreshed.slice(0, 10)}` : ''}.`,
        isMonthlyEntry: true,
        createdAt: prev?.createdAt || stamp,
        updatedAt: stamp
      };
      if (i >= 0) db.measurements[i] = m; else db.measurements.push(m);
      written++;
    }
    // Meses que sumiram do painel: remove o lançamento automático correspondente
    const before = db.measurements.length;
    for (let i = db.measurements.length - 1; i >= 0; i--) {
      const m = db.measurements[i];
      if (m.id.startsWith(`${ID_PREFIX}__`) && !seen.has(m.id)) db.measurements.splice(i, 1);
    }
    const removed = before - db.measurements.length;

    // Substitui as estatísticas de viagens (mantém só os 40 destinos e trajetos mais frequentes)
    const top = <T,>(o: Record<string, T>, by: (v: T) => number) =>
      Object.fromEntries(Object.entries(o).sort((x, y) => by(y[1]) - by(x[1])).slice(0, 40));
    db.travelStats = [...stats.values()].map(s => ({
      ...s,
      byDestination: top(s.byDestination, v => v),
      byRoute: top(s.byRoute, v => v.t),
      panelRefreshedAt: refreshed,
      updatedAt: stamp
    }));

    const run: TravelBIRun = {
      at, trigger, ok: true,
      message: `${rows.length} trecho(s) lido(s); ${written} mês(es) gravado(s)${removed ? `, ${removed} removido(s)` : ''}${skippedManual ? `, ${skippedManual} com lançamento manual mantido` : ''}.`,
      panelRefreshedAt: refreshed, trips: rows.length, written, skippedManual,
      unmappedUnits: [...unmapped]
    };
    if (written || removed) {
      const audit: AuditLog = {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        organizationId: 'org-trf1',
        userId: 'sistema',
        userName: 'Coleta automática do painel de viagens',
        action: 'IMPORTACAO',
        timestamp: stamp,
        entityType: 'MEASUREMENT',
        entityId: ind.id,
        indicatorCode: ind.code,
        newValue: run.message,
        reason: `Emissões de viagens aéreas a serviço por órgão e mês${refreshed ? ` (painel atualizado em ${refreshed.slice(0, 16).replace('T', ' ')})` : ''}.`,
        source: 'Painel de BI de viagens (Power BI)'
      };
      db.auditLogs.unshift(audit);
    }
    await storage.saveNow();
    console.log(`[Viagens BI] ${run.message}${unmapped.size ? ` Unidades sem órgão: ${[...unmapped].join(', ')}.` : ''}`);
    return (lastRun = run);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Viagens BI] Falha na coleta:', message);
    return (lastRun = { at, trigger, ok: false, message });
  } finally {
    running = false;
  }
}

/** Coleta inicial 1 minuto após subir e depois diariamente (TRAVEL_BI_SYNC_HOUR, padrão 4h). */
export function startTravelBIScheduler(): void {
  if (!travelBIStatus().configured) return;
  const raw = env.TRAVEL_BI_SYNC_HOUR;
  const hour = raw === undefined ? 4 : raw === '' ? NaN : Number(raw);
  setTimeout(() => void runTravelBISync('INICIAL'), 60 * 1000).unref();
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return;
  let lastDay = '';
  console.log(`[Viagens BI] Coleta diária agendada para as ${hour}h.`);
  setInterval(() => {
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    if (now.getHours() !== hour || day === lastDay || running) return;
    lastDay = day;
    void runTravelBISync('AGENDADO');
  }, 10 * 60 * 1000).unref();
}
