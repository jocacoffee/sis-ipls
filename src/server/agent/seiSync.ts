/**
 * Agente de coleta do SEI (Fase 3).
 *
 * Para cada processo monitorado ativo: lista os documentos no SEI, filtra pelos tipos
 * configurados (ex.: "Fatura") e pelo nível de acesso, pula os já vistos, baixa os novos e
 * passa cada PDF pela mesma ingestão do upload manual (invoiceIngest.ts): leitura, IA local,
 * checagens e — só se tudo conferir — lançamento de CEE/GEE. O resto fica pendente para
 * validação humana na tela de Documentos.
 *
 * Variáveis:
 *   SEI_SYNC_HOUR               hora da execução diária automática (0–23; vazio = sem agendamento)
 *   SEI_MAX_DOCS_POR_EXECUCAO   limite de documentos novos por execução (padrão 30)
 *   SEI_SOMENTE_PUBLICOS        "false" para aceitar documentos restritos (padrão: só públicos)
 */
import { storage } from '../storage';
import type { SeiMonitoredProcess, SeiSyncedDocument, SeiSyncRun } from '../../types';
import { ingestEnergyInvoice } from '../invoiceIngest';
import { SeiClient, SeiConfigError, seiClientFromEnv, seiStatus } from './seiClient';

const env = process.env;
const AGENT_ACTOR = { username: 'agente-sei', displayName: 'Agente de coleta do SEI' };
const MAX_RUNS_KEPT = 60;

let running: Promise<SeiSyncRun> | null = null;

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const isSyncRunning = () => !!running;

/** Formato do número de processo do SEI (aceita com ou sem pontuação). */
export function normalizeProcessNumber(raw: string): string | null {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 25) return null;
  // Padrão CNJ/SEI de 20 dígitos: NNNNNNN-DD.AAAA.J.TR.OOOO
  if (digits.length === 20) {
    return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16)}`;
  }
  return String(raw).trim();
}

export interface SyncOptions {
  trigger: 'AGENDADO' | 'MANUAL';
  triggeredBy?: string;
  /** Restringe a um órgão (masters só sincronizam o próprio). */
  organizationId?: string;
  /** Restringe a um processo. */
  processId?: string;
}

/** Executa a coleta (uma por vez). Devolve o registro da execução. */
export function runSeiSync(opts: SyncOptions): Promise<SeiSyncRun> {
  if (running) return Promise.reject(new Error('Já existe uma coleta do SEI em andamento. Aguarde terminar.'));
  running = doSync(opts).finally(() => {
    running = null;
  });
  return running;
}

async function doSync(opts: SyncOptions): Promise<SeiSyncRun> {
  const db = storage.getDatabase();
  const status = seiStatus();
  const run: SeiSyncRun = {
    id: `sei-run-${Date.now()}`,
    trigger: opts.trigger,
    triggeredBy: opts.triggeredBy,
    organizationId: opts.organizationId,
    clientMode: status.mode,
    startedAt: new Date().toISOString(),
    status: 'EM_ANDAMENTO',
    processes: 0,
    newDocuments: 0,
    launched: 0,
    pending: 0,
    ignored: 0,
    errors: 0,
    log: []
  };
  const log = (line: string) => {
    run.log.push(line);
    console.log(`[SEI] ${line}`);
  };
  db.seiSyncRuns.unshift(run);
  db.seiSyncRuns.splice(MAX_RUNS_KEPT);

  let client: SeiClient;
  try {
    client = seiClientFromEnv();
  } catch (err: any) {
    run.status = 'ERRO';
    run.finishedAt = new Date().toISOString();
    log(err instanceof SeiConfigError ? err.message : `Falha ao iniciar o cliente do SEI: ${err?.message || err}`);
    await storage.saveNow();
    return run;
  }

  const onlyPublic = (env.SEI_SOMENTE_PUBLICOS || 'true').toLowerCase() !== 'false';
  let budget = Math.max(1, Number(env.SEI_MAX_DOCS_POR_EXECUCAO || 30));
  const processes = db.seiProcesses.filter(
    p => p.active && (!opts.organizationId || p.organizationId === opts.organizationId) && (!opts.processId || p.id === opts.processId)
  );
  run.processes = processes.length;
  log(`Início (${opts.trigger === 'MANUAL' ? `manual, ${opts.triggeredBy || '?'}` : 'agendada'}) · ${client.mode} · ${processes.length} processo(s).`);

  for (const proc of processes) {
    if (budget <= 0) {
      log('Limite de documentos por execução atingido; o restante fica para a próxima.');
      break;
    }
    try {
      const docs = await client.listDocuments(proc.processNumber);
      const wanted = proc.documentTypes.map(norm).filter(Boolean);
      const candidates = docs.filter(d => !wanted.length || wanted.some(w => norm(d.type).includes(w)));
      const seen = new Map(
        db.seiSyncedDocuments.filter(s => s.processId === proc.id).map(s => [s.seiDocumentId, s] as const)
      );
      const fresh = candidates.filter(d => {
        const prev = seen.get(d.id);
        return !prev || prev.status === 'ERRO';
      });
      log(`${proc.processNumber}: ${docs.length} documento(s), ${candidates.length} do tipo esperado, ${fresh.length} novo(s).`);

      for (const d of fresh) {
        if (budget-- <= 0) break;
        run.newDocuments++;
        const record: SeiSyncedDocument = {
          id: `${proc.id}:${d.id}`,
          processId: proc.id,
          organizationId: proc.organizationId,
          seiDocumentId: d.id,
          seiDocumentNumber: d.number,
          documentType: d.type,
          documentDate: d.date,
          status: 'ERRO',
          syncedAt: new Date().toISOString()
        };
        try {
          if (onlyPublic && d.accessLevel !== undefined && d.accessLevel !== '' && d.accessLevel !== '0') {
            record.status = 'IGNORADO';
            record.message = 'Documento com acesso restrito (coleta configurada só para públicos).';
          } else {
            const content = await client.getContent(d, proc.processNumber);
            const result = await ingestEnergyInvoice({
              organizationId: proc.organizationId,
              fileName: content.fileName,
              data: content.data,
              processNumber: proc.processNumber,
              actor: AGENT_ACTOR,
              source: 'SEI',
              seiDocumentId: d.number || d.id
            });
            if (result.kind === 'invalid') {
              record.status = 'IGNORADO';
              record.message = result.error;
            } else if (result.kind === 'duplicate') {
              record.status = 'IGNORADO';
              record.message = `Mesmo PDF já importado (${result.existing.fileName}).`;
              record.plsDocumentId = result.existing.id;
            } else {
              const doc = result.document;
              record.plsDocumentId = doc.id;
              record.status = doc.status === 'PROCESSADO' ? 'LANCADO' : doc.status === 'ERRO' ? 'ERRO' : 'PENDENTE';
              record.message =
                doc.status === 'PROCESSADO'
                  ? `Lançado ${doc.competence}: ${doc.consumption?.toLocaleString('pt-BR')} kWh, R$ ${doc.amount?.toLocaleString('pt-BR')}.`
                  : (doc.reviewReasons || []).join(' ');
            }
          }
        } catch (err: any) {
          record.status = 'ERRO';
          record.message = `Falha ao baixar/ler: ${err?.message || err}`;
        }
        const label = d.number ? `SEI ${d.number}` : d.id;
        if (record.status === 'LANCADO') run.launched++;
        else if (record.status === 'PENDENTE') run.pending++;
        else if (record.status === 'IGNORADO') run.ignored++;
        else run.errors++;
        log(`  ${label} (${d.type}): ${record.status}${record.message ? ` — ${record.message}` : ''}`);
        const k = db.seiSyncedDocuments.findIndex(x => x.id === record.id);
        if (k >= 0) db.seiSyncedDocuments[k] = record; else db.seiSyncedDocuments.push(record);
      }
      proc.lastSyncAt = new Date().toISOString();
      proc.lastSyncStatus = 'OK';
      proc.lastSyncMessage = `${fresh.length} documento(s) novo(s).`;
    } catch (err: any) {
      run.errors++;
      proc.lastSyncAt = new Date().toISOString();
      proc.lastSyncStatus = 'ERRO';
      proc.lastSyncMessage = String(err?.message || err).slice(0, 300);
      log(`${proc.processNumber}: ERRO — ${proc.lastSyncMessage}`);
    }
  }

  run.finishedAt = new Date().toISOString();
  run.status = run.errors === 0 ? 'OK' : run.launched + run.pending + run.ignored > 0 ? 'PARCIAL' : 'ERRO';
  log(`Fim: ${run.launched} lançado(s), ${run.pending} pendente(s), ${run.ignored} ignorado(s), ${run.errors} erro(s).`);
  await storage.saveNow();
  return run;
}

/** Agendamento diário (SEI_SYNC_HOUR). Confere a cada 10 minutos. */
export function startSeiScheduler(): void {
  const hour = env.SEI_SYNC_HOUR === undefined || env.SEI_SYNC_HOUR === '' ? NaN : Number(env.SEI_SYNC_HOUR);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return;
  if (!seiStatus().ready) {
    console.log(`[SEI] Agendamento não iniciado: ${seiStatus().message}`);
    return;
  }
  let lastDay = '';
  console.log(`[SEI] Coleta diária agendada para as ${hour}h.`);
  setInterval(() => {
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    if (now.getHours() !== hour || day === lastDay || running) return;
    lastDay = day;
    runSeiSync({ trigger: 'AGENDADO' }).catch(err => console.error('[SEI] Falha na coleta agendada:', err));
  }, 10 * 60 * 1000).unref();
}

export type { SeiMonitoredProcess };
