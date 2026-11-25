/**
 * API da coleta automática do SEI (Fase 3).
 *   GET    /api/sei/status              configuração (sem segredos) e se há coleta em andamento
 *   GET    /api/sei/processes?orgId=    processos monitorados (todos, se consolidado)
 *   POST   /api/sei/processes           cadastra processo         (ADMIN ou MASTER do órgão)
 *   PUT    /api/sei/processes/:id       altera / ativa / desativa (ADMIN ou MASTER do órgão)
 *   DELETE /api/sei/processes/:id       remove                    (ADMIN ou MASTER do órgão)
 *   POST   /api/sei/sync                inicia a coleta agora     (ADMIN; MASTER só do próprio órgão)
 *   GET    /api/sei/runs?orgId=         últimas execuções e documentos vistos
 */
import express, { Request, Response } from 'express';
import { storage } from '../storage';
import type { AuditLog, SeiMonitoredProcess } from '../../types';
import { canManageOrg, currentUser, requireLogin, requireRole } from '../auth';
import { isConsolidatedOrg } from '../../services/orgScope';
import { seiStatus } from './seiClient';
import { isSyncRunning, normalizeProcessNumber, runSeiSync } from './seiSync';

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const typesOf = (v: unknown): string[] =>
  (Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : [])
    .map(x => text(x, 60))
    .filter(Boolean)
    .slice(0, 10);

export function createSeiRouter() {
  const router = express.Router();
  const db = storage.getDatabase();

  const audit = (action: AuditLog['action'], orgId: string, entityId: string, newValue: string, prev?: string) => {
    const u = currentUser();
    db.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      organizationId: orgId,
      userId: u?.username || '',
      userName: u?.displayName || '',
      action,
      timestamp: new Date().toISOString(),
      entityType: 'INTEGRACAO',
      entityId,
      previousValue: prev,
      newValue,
      source: 'Coleta automática do SEI'
    });
  };

  router.get('/sei/status', requireLogin, (_req, res) => {
    res.json({ ...seiStatus(), running: isSyncRunning(), scheduleHour: process.env.SEI_SYNC_HOUR || null });
  });

  router.get('/sei/processes', requireLogin, (req, res) => {
    const orgId = String(req.query.orgId || '');
    const all = !orgId || isConsolidatedOrg(orgId, db.organizations);
    res.json(db.seiProcesses.filter(p => all || p.organizationId === orgId));
  });

  router.post('/sei/processes', requireRole('ADMIN', 'MASTER'), async (req: Request, res: Response) => {
    const organizationId = text(req.body?.organizationId, 60);
    if (!db.organizations.some(o => o.id === organizationId) || isConsolidatedOrg(organizationId, db.organizations)) {
      return res.status(400).json({ error: 'Escolha o órgão dono do processo (não o consolidado).' });
    }
    if (!canManageOrg(currentUser(), organizationId)) return res.status(403).json({ error: 'Sem permissão para este órgão.' });
    const processNumber = normalizeProcessNumber(text(req.body?.processNumber, 40));
    if (!processNumber) return res.status(400).json({ error: 'Número de processo SEI inválido.' });
    if (db.seiProcesses.some(p => p.processNumber === processNumber && p.organizationId === organizationId)) {
      return res.status(409).json({ error: 'Este processo já está cadastrado para o órgão.' });
    }
    const proc: SeiMonitoredProcess = {
      id: `seiproc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      organizationId,
      processNumber,
      description: text(req.body?.description, 200) || undefined,
      kind: 'ENERGIA',
      documentTypes: typesOf(req.body?.documentTypes),
      active: true,
      createdAt: new Date().toISOString(),
      createdBy: currentUser()?.username || ''
    };
    db.seiProcesses.push(proc);
    audit('CRIACAO', organizationId, proc.id, `Processo SEI monitorado: ${processNumber} (${proc.documentTypes.join(', ') || 'todos os tipos'})`);
    await storage.saveNow();
    res.json(proc);
  });

  router.put('/sei/processes/:id', requireRole('ADMIN', 'MASTER'), async (req: Request, res: Response) => {
    const proc = db.seiProcesses.find(p => p.id === req.params.id);
    if (!proc) return res.status(404).json({ error: 'Processo não encontrado.' });
    if (!canManageOrg(currentUser(), proc.organizationId)) return res.status(403).json({ error: 'Sem permissão para este órgão.' });
    const before = `${proc.active ? 'ativo' : 'inativo'}; ${proc.documentTypes.join(', ')}`;
    if (typeof req.body?.active === 'boolean') proc.active = req.body.active;
    if (req.body?.description !== undefined) proc.description = text(req.body.description, 200) || undefined;
    if (req.body?.documentTypes !== undefined) proc.documentTypes = typesOf(req.body.documentTypes);
    audit('ALTERACAO', proc.organizationId, proc.id, `${proc.active ? 'ativo' : 'inativo'}; ${proc.documentTypes.join(', ')}`, before);
    await storage.saveNow();
    res.json(proc);
  });

  router.delete('/sei/processes/:id', requireRole('ADMIN', 'MASTER'), async (req: Request, res: Response) => {
    const idx = db.seiProcesses.findIndex(p => p.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Processo não encontrado.' });
    const proc = db.seiProcesses[idx];
    if (!canManageOrg(currentUser(), proc.organizationId)) return res.status(403).json({ error: 'Sem permissão para este órgão.' });
    db.seiProcesses.splice(idx, 1);
    audit('EXCLUSAO', proc.organizationId, proc.id, `Processo SEI removido do monitoramento: ${proc.processNumber}`);
    await storage.saveNow();
    res.json({ success: true });
  });

  router.post('/sei/sync', requireRole('ADMIN', 'MASTER'), (req: Request, res: Response) => {
    const user = currentUser()!;
    const organizationId = text(req.body?.organizationId, 60) || undefined;
    const processId = text(req.body?.processId, 80) || undefined;
    const procOrg = processId ? db.seiProcesses.find(p => p.id === processId)?.organizationId : undefined;
    const scopeOrg = procOrg || (organizationId && !isConsolidatedOrg(organizationId, db.organizations) ? organizationId : undefined);
    if (user.role !== 'ADMIN') {
      if (!scopeOrg || !canManageOrg(user, scopeOrg)) {
        return res.status(403).json({ error: 'Master só sincroniza os processos do próprio órgão.' });
      }
    }
    if (!seiStatus().ready) return res.status(409).json({ error: seiStatus().message });
    if (isSyncRunning()) return res.status(409).json({ error: 'Já existe uma coleta em andamento.' });
    runSeiSync({ trigger: 'MANUAL', triggeredBy: user.username, organizationId: scopeOrg, processId }).catch(err =>
      console.error('[SEI] Falha na coleta manual:', err)
    );
    res.status(202).json({ started: true, runId: db.seiSyncRuns[0]?.id });
  });

  router.get('/sei/runs', requireLogin, (req, res) => {
    const orgId = String(req.query.orgId || '');
    const all = !orgId || isConsolidatedOrg(orgId, db.organizations);
    res.json({
      running: isSyncRunning(),
      runs: db.seiSyncRuns.filter(r => all || !r.organizationId || r.organizationId === orgId).slice(0, 20),
      documents: db.seiSyncedDocuments
        .filter(d => all || d.organizationId === orgId)
        .sort((a, b) => b.syncedAt.localeCompare(a.syncedAt))
        .slice(0, 100)
    });
  });

  return router;
}
