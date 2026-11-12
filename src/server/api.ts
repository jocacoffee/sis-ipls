import express, { Request, Response } from 'express';
import { storage } from './storage';
import {
  generateGeminiExecutiveAnalysis,
  generateGeminiAnnualReport,
  executeRAGChatQuery,
  testLocalAIConnection
} from './geminiService';
import { calculateIndicatorPerformance, detectMeasurementInconsistencies } from '../services/calculationEngine';
import { buildFiveYearHistoricalSeries, getFiveYearSummaryStats } from '../services/historicalAnalytics';
import {
  ENERGY_COST_ACRONYM,
  ENERGY_KWH_ACRONYM,
  energyMeasurementsFor,
  extractEnergyInvoice,
  pdfToText,
  reviewReasons,
  sha256
} from './energyInvoice';
import { IndicatorMeasurement, AuditLog, PLSDocument, InconsistencyAlert } from '../types';
import {
  LEGACY_DEFAULT_ORG_ID,
  isConsolidatedOrg,
  orgDenominators,
  orgIdOf,
  scopeMeasurements,
  scopeTargets
} from '../services/orgScope';
import { canManageOrg, canWriteOrg, currentUser, requireLogin, requireRole } from './auth';
import { defaultAIProvider, publicAIConfig } from './localLLM';
import { calculateCNJIDS } from '../services/idsCalculator';
import { indicatorConsolidates, CONSOLIDATED_ORG_ID } from '../services/orgScope';
import { EntryMode, yearEntryMode } from '../services/periodicity';
import { legacyTargetType, resolveTarget } from '../services/targets';

export function createApiRouter() {
  const router = express.Router();
  const db = storage.getDatabase();

  /** Dados do órgão selecionado: medições próprias (ou consolidadas) e metas. */
  const scopeFor = (orgId: string) => ({
    measurements: scopeMeasurements(orgId, db.measurements, db.indicators, db.organizations),
    targets: scopeTargets(orgId, db.targets).map(t =>
      resolveTarget(t, db.indicators.find(i => i.id === t.indicatorId), db.measurements.filter(m => orgIdOf(m) === orgId))
    ),
    ...orgDenominators(orgId, db.organizations)
  });

  const consolidatedWriteError = (orgId: string) =>
    isConsolidatedOrg(orgId, db.organizations)
      ? 'O consolidado regional é calculado a partir dos órgãos e não aceita lançamentos diretos. Selecione um órgão.'
      : null;

  // Helper for audit logging
  const logAudit = (
    userId: string,
    userName: string,
    action: AuditLog['action'],
    entityType: AuditLog['entityType'],
    entityId: string,
    previousValue?: string,
    newValue?: string,
    reason?: string,
    source: string = 'API'
  ) => {
    const sessionUser = currentUser();
    const entry: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      organizationId: sessionUser?.organizationId || LEGACY_DEFAULT_ORG_ID,
      userId: sessionUser?.username || userId,
      userName: sessionUser?.displayName || userName,
      action,
      timestamp: new Date().toISOString(),
      entityType,
      entityId,
      previousValue,
      newValue,
      reason,
      source
    };
    db.auditLogs.unshift(entry);
    storage.scheduleSave();
    return entry;
  };

  // GET /api/health
  router.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'iPLS API',
      version: '2.0.0 (Full-Stack com Persistência & Gemini API)',
      persistedRecords: db.measurements.length,
      lastSavedAt: db.lastSavedAt,
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString()
    });
  });

  // GET /api/bootstrap - Complete payload for initial load
  router.get('/bootstrap', (req: Request, res: Response) => {
    const year = Number(req.query.year) || 2026;
    const orgId = (req.query.orgId as string) || LEGACY_DEFAULT_ORG_ID;
    const scoped = scopeFor(orgId);

    // Recalculate indicator metrics (somente dados do órgão selecionado)
    const indicatorPerformances = db.indicators.map(ind => {
      const target = scoped.targets.find(t => t.indicatorId === ind.id && t.year === year);
      return {
        indicator: ind,
        target,
        result: calculateIndicatorPerformance(ind, scoped.measurements, target, year, scoped.areaM2, scoped.ftt)
      };
    });

    // Detect inconsistencies
    const dynamicAlerts = detectMeasurementInconsistencies(db.indicators, scoped.measurements, year);
    const allAlerts = db.alerts.filter(a => !a.organizationId || a.organizationId === orgId);
    dynamicAlerts.forEach(da => {
      if (!allAlerts.some(a => a.id === da.id || (a.indicatorId === da.indicatorId && a.month === da.month && a.type === da.type))) {
        allAlerts.push(da);
      }
    });

    res.json({
      organizations: db.organizations,
      users: db.users,
      plsCycles: db.plsCycles,
      themes: db.themes,
      indicators: db.indicators,
      targets: scoped.targets,
      measurements: scoped.measurements,
      selectedOrgId: orgId,
      idsComplements: (db.idsComplements || []).filter(c => c.organizationId === orgId),
      // Documentos do órgão (no consolidado, de todos)
      documents: isConsolidatedOrg(orgId, db.organizations) ? db.documents : db.documents.filter(d => d.organizationId === orgId),
      actionPlans: db.actionPlans,
      emissionSources: db.emissionSources,
      ghgCalculations: db.ghgCalculations,
      plsJudMappings: db.plsJudMappings,
      seiConnectors: db.seiConnectors,
      auditLogs: db.auditLogs,
      alerts: allAlerts,
      indicatorPerformances,
      hasGeminiApiKey: !!process.env.GEMINI_API_KEY,
      lastSavedAt: db.lastSavedAt
    });
  });

  // GET /api/indicators
  /**
   * GET /api/consolidated/breakdown?year=AAAA
   * Contribuição de cada órgão (2º grau e seções) para o consolidado da 1ª Região:
   * - totais do exercício por indicador somável (consumos, gastos, quantidades);
   * - IDS de cada órgão e do consolidado (o IDS é um índice: não se soma).
   */
  router.get('/consolidated/breakdown', (req: Request, res: Response) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    const parts = db.organizations.filter(o => !o.isConsolidated);
    const summable = db.indicators.filter(indicatorConsolidates);
    const summableIds = new Set(summable.map(i => i.id));

    // Totais por indicador e órgão no exercício
    const totals: Record<string, Record<string, { total: number; months: number }>> = {};
    for (const m of db.measurements) {
      if (m.year !== year || !summableIds.has(m.indicatorId)) continue;
      const org = m.organizationId || LEGACY_DEFAULT_ORG_ID;
      if (org === CONSOLIDATED_ORG_ID) continue;
      const byOrg = (totals[m.indicatorId] ||= {});
      const cell = (byOrg[org] ||= { total: 0, months: 0 });
      cell.total += m.value;
      cell.months += 1;
    }

    const idsFor = (orgId: string) => {
      const org = db.organizations.find(o => o.id === orgId)!;
      const scoped = scopeFor(orgId);
      const r = calculateCNJIDS(scoped.measurements, year, {
        context: {
          indicators: db.indicators,
          complements: (db.idsComplements || []).filter(c => c.organizationId === orgId),
          organization: org
        }
      });
      return { score: r.hasScore ? r.idsScore : null, available: r.coverage.available, total: r.coverage.total };
    };

    res.json({
      year,
      organizations: parts
        .filter(o => o.active !== false || Object.values(totals).some(t => t[o.id]))
        .map(o => ({ id: o.id, acronym: o.acronym, name: o.name, type: o.type })),
      indicators: summable
        .filter(i => totals[i.id])
        .map(i => ({ id: i.id, code: i.code, acronym: i.acronym, name: i.name, unit: i.unit, periodicity: i.periodicity, themeId: i.themeId, annex: i.annex })),
      totals,
      ids: {
        consolidated: idsFor(CONSOLIDATED_ORG_ID),
        byOrganization: Object.fromEntries(parts.filter(o => o.active !== false).map(o => [o.id, idsFor(o.id)]))
      }
    });
  });

  router.get('/indicators', (req: Request, res: Response) => {
    res.json(db.indicators);
  });

  // PUT /api/indicators/:id - Update indicator/variable definition, periodicity, and metadata
  router.put('/indicators/:id', requireRole('ADMIN'), (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      name,
      acronym,
      description,
      periodicity,
      unit,
      normativeReference,
      responsibleUnit,
      formulaDescription,
      reason,
      userId = 'usr-1',
      userName = 'Dr. Roberto Magalhães'
    } = req.body;

    const indIndex = db.indicators.findIndex(i => i.id === id);
    if (indIndex === -1) {
      return res.status(404).json({ error: 'Indicador/Variável não encontrada.' });
    }

    const old = db.indicators[indIndex];
    const updated = {
      ...old,
      name: name !== undefined ? String(name).trim() : old.name,
      acronym: acronym !== undefined ? (String(acronym).trim() || undefined) : old.acronym,
      description: description !== undefined ? String(description).trim() : old.description,
      periodicity: periodicity === 'ANUAL' || periodicity === 'MENSAL' ? periodicity : old.periodicity,
      unit: unit !== undefined ? String(unit).trim() : old.unit,
      normativeReference: normativeReference !== undefined ? (String(normativeReference).trim() || undefined) : old.normativeReference,
      responsibleUnit: responsibleUnit !== undefined ? (String(responsibleUnit).trim() || undefined) : old.responsibleUnit,
      formulaDescription: formulaDescription !== undefined ? (String(formulaDescription).trim() || undefined) : old.formulaDescription
    };

    db.indicators[indIndex] = updated;

    const changes: string[] = [];
    if (old.periodicity !== updated.periodicity) {
      changes.push(`Periodicidade: ${old.periodicity} → ${updated.periodicity}`);
    }
    if (old.description !== updated.description) {
      changes.push(`Texto de definição atualizado`);
    }
    if (old.name !== updated.name) {
      changes.push(`Nome: ${old.name} → ${updated.name}`);
    }
    if (old.acronym !== updated.acronym) {
      changes.push(`Sigla: ${old.acronym || '—'} → ${updated.acronym || '—'}`);
    }
    if (old.unit !== updated.unit) {
      changes.push(`Unidade: ${old.unit} → ${updated.unit}`);
    }

    const auditDesc = changes.length > 0 ? changes.join('; ') : 'Parâmetros metodológicos do indicador atualizados';

    const auditEntry = logAudit(
      userId,
      userName,
      'ALTERACAO',
      'INDICATOR',
      updated.id,
      `${old.name} [${old.periodicity}]`,
      `${updated.name} [${updated.periodicity}]`,
      reason || auditDesc,
      'Gestão Metodológica de Indicadores'
    );

    storage.scheduleSave();
    res.json({ success: true, indicator: updated, auditLog: auditEntry });
  });

  // GET /api/analytics/indicators
  router.get('/analytics/indicators', (req: Request, res: Response) => {
    const year = Number(req.query.year) || 2026;
    const scoped = scopeFor((req.query.orgId as string) || LEGACY_DEFAULT_ORG_ID);
    const results = db.indicators.map(ind => {
      const target = scoped.targets.find(t => t.indicatorId === ind.id && t.year === year);
      return calculateIndicatorPerformance(ind, scoped.measurements, target, year, scoped.areaM2, scoped.ftt);
    });
    res.json(results);
  });

  // POST /api/measurements - Add or update measurement with validation, audit & disk persistence
  router.post('/measurements', requireRole('ADMIN', 'MASTER', 'PREENCHEDOR'), async (req: Request, res: Response) => {
    const {
      indicatorId,
      year,
      month,
      value,
      unit,
      sourceType,
      sourceReference,
      processNumber,
      notes,
      reason,
      organizationId = LEGACY_DEFAULT_ORG_ID,
      userId = 'usr-1',
      userName = 'Dr. Roberto Magalhães'
    } = req.body;

    if (!indicatorId || !year || !month || value === undefined) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes (indicatorId, year, month, value).' });
    }

    const writeError = consolidatedWriteError(organizationId);
    if (writeError) {
      return res.status(400).json({ error: writeError });
    }
    if (!canWriteOrg(currentUser(), organizationId)) {
      return res.status(403).json({ error: 'Você só pode lançar dados do seu próprio órgão.' });
    }
    if (!db.organizations.some(o => o.id === organizationId)) {
      return res.status(404).json({ error: 'Órgão não encontrado.' });
    }

    const ind = db.indicators.find(i => i.id === indicatorId);
    if (!ind) {
      return res.status(404).json({ error: 'Indicador não encontrado.' });
    }

    // Periodicidade: anual = total no mês 12; anual com lançamento mensal = um modo por exercício
    let effMonth = Number(month);
    let isMonthlyEntry: boolean | undefined;
    if (ind.periodicity === 'ANUAL') {
      const requested: EntryMode = ind.allowMonthlyEntry && req.body.entryMode === 'MENSAL' ? 'MENSAL' : 'ANUAL';
      const current = yearEntryMode(db.measurements, indicatorId, organizationId, Number(year));
      if (current && current !== requested) {
        return res.status(409).json({
          error: current === 'ANUAL'
            ? `Já existe um total anual de ${year} para este indicador. Para lançar mês a mês, o total anual precisa ser removido antes.`
            : `Este indicador já está sendo lançado mês a mês em ${year}. Continue informando os meses (o total do ano é a soma).`
        });
      }
      if (requested === 'ANUAL') {
        effMonth = 12;
      } else {
        if (!(effMonth >= 1 && effMonth <= 12)) {
          return res.status(400).json({ error: 'Informe o mês (1 a 12).' });
        }
        isMonthlyEntry = true;
      }
    } else if (!(effMonth >= 1 && effMonth <= 12)) {
      return res.status(400).json({ error: 'Informe o mês (1 a 12).' });
    }

    const existingIndex = db.measurements.findIndex(
      m =>
        m.indicatorId === indicatorId &&
        m.year === Number(year) &&
        m.month === effMonth &&
        orgIdOf(m) === organizationId
    );

    let measurement: IndicatorMeasurement;

    if (existingIndex >= 0) {
      const oldVal = db.measurements[existingIndex];
      measurement = {
        ...oldVal,
        value: Number(value),
        unit: unit || ind.unit,
        sourceType: sourceType || 'manual',
        sourceReference: sourceReference || oldVal.sourceReference,
        processNumber: processNumber || oldVal.processNumber,
        notes: notes || oldVal.notes,
        validationStatus: 'VALIDADO',
        validatedBy: userId,
        validatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.measurements[existingIndex] = measurement;

      logAudit(
        userId,
        userName,
        'ALTERACAO',
        'MEASUREMENT',
        measurement.id,
        `${oldVal.value} ${oldVal.unit}`,
        `${measurement.value} ${measurement.unit}`,
        reason || 'Alteração manual informada pelo usuário gestor.',
        'Módulo de Entrada Manual'
      );
    } else {
      measurement = {
        id: `m-${indicatorId}-${year}-${month}-${Date.now()}`,
        indicatorId,
        organizationId,
        year: Number(year),
        month: effMonth,
        ...(isMonthlyEntry ? { isMonthlyEntry: true } : {}),
        value: Number(value),
        unit: unit || ind.unit,
        sourceType: sourceType || 'manual',
        sourceReference,
        processNumber,
        validationStatus: 'VALIDADO',
        validatedBy: userId,
        validatedAt: new Date().toISOString(),
        confidenceScore: 100,
        notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.measurements.push(measurement);

      logAudit(
        userId,
        userName,
        'CRIACAO',
        'MEASUREMENT',
        measurement.id,
        undefined,
        `${measurement.value} ${measurement.unit}`,
        reason || 'Lançamento manual inicial de competência.',
        'Módulo de Entrada Manual'
      );
    }

    try {
      await storage.saveNow();
    } catch (err) {
      console.error('[API] Falha ao gravar no banco:', err);
      return res.status(500).json({ error: 'Falha ao gravar no banco de dados. O lançamento não foi confirmado.' });
    }
    res.json({ success: true, measurement, persisted: true });
  });

  // POST /api/measurements/batch - Ingest batch of measurements from spreadsheet (2021-2025)
  router.post('/measurements/batch', requireRole('ADMIN', 'MASTER', 'PREENCHEDOR'), async (req: Request, res: Response) => {
    const {
      measurements: items,
      sourceDescription = 'Importação de Planilha PLS SJRR',
      userId = 'usr-1',
      userName = 'Dr. Roberto Magalhães'
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Nenhuma medição fornecida no lote.' });
    }

    let insertedCount = 0;
    let updatedCount = 0;
    let rejectedCount = 0;
    const now = new Date().toISOString();

    items.forEach((item, idx) => {
      if (!item.indicatorId || item.value === undefined) return;
      const batchOrgId = item.organizationId || LEGACY_DEFAULT_ORG_ID;
      if (consolidatedWriteError(batchOrgId) || !canWriteOrg(currentUser(), batchOrgId)) {
        rejectedCount++;
        return;
      }
      const year = Number(item.year) || 2026;
      const month = item.month !== undefined ? Number(item.month) : 1;
      const val = Number(item.value);

      const itemOrgId = item.organizationId || 'org-sjrr';
      const existingIndex = db.measurements.findIndex(
        m => m.indicatorId === item.indicatorId &&
             m.year === year &&
             m.month === month &&
             (m.organizationId === itemOrgId || (!m.organizationId && itemOrgId === 'org-sjrr'))
      );

      if (existingIndex >= 0) {
        db.measurements[existingIndex] = {
          ...db.measurements[existingIndex],
          value: val,
          unit: item.unit || db.measurements[existingIndex].unit,
          sourceType: (item.sourceType as any) || 'spreadsheet',
          sourceReference: item.sourceReference || sourceDescription,
          processNumber: item.processNumber || db.measurements[existingIndex].processNumber || undefined,
          validationStatus: 'VALIDADO',
          validatedBy: userId,
          validatedAt: now,
          updatedAt: now
        };
        updatedCount++;
      } else {
        const newRecord: IndicatorMeasurement = {
          id: item.id || `m-batch-${year}-${month}-${item.indicatorId}-${Date.now()}-${idx}`,
          indicatorId: item.indicatorId,
          organizationId: item.organizationId || 'org-sjrr',
          year,
          month,
          value: val,
          unit: item.unit || 'unidades',
          sourceType: (item.sourceType as any) || 'spreadsheet',
          sourceReference: item.sourceReference || sourceDescription,
          processNumber: item.processNumber || undefined,
          validationStatus: 'VALIDADO',
          validatedBy: userId,
          validatedAt: now,
          confidenceScore: 99,
          notes: item.notes || `Importado via Planilha PLS SJRR (${year})`,
          createdAt: now,
          updatedAt: now
        };
        db.measurements.push(newRecord);
        insertedCount++;
      }
    });

    logAudit(
      userId,
      userName,
      'IMPORTACAO',
      'MEASUREMENT',
      `batch-${Date.now()}`,
      undefined,
      `${insertedCount} novos registros, ${updatedCount} atualizados. Total: ${items.length}.`,
      sourceDescription,
      'Módulo de Importação de Planilhas'
    );

    try {
      await storage.saveNow();
    } catch (err) {
      console.error('[API] Falha ao gravar no banco:', err);
      return res.status(500).json({ error: 'Falha ao gravar no banco de dados. O lançamento não foi confirmado.' });
    }
    res.json({
      success: true,
      totalProcessed: items.length,
      insertedCount,
      updatedCount,
      rejectedCount,
      totalInDatabase: db.measurements.length,
      persisted: true
    });
  });

  // ---------------------------------------------------------------- faturas de energia (PDF)
  // POST /api/documents/upload — lê a fatura (texto do PDF + IA local + conferência) e, se tudo
  // conferir, lança CEE (kWh) e GEE (R$) do mês; senão o documento fica pendente de validação.
  router.post('/documents/upload', requireRole('ADMIN', 'MASTER', 'PREENCHEDOR'), async (req: Request, res: Response) => {
    const { organizationId, fileName, contentBase64, processNumber } = req.body || {};
    const user = currentUser();
    if (typeof organizationId !== 'string' || !db.organizations.some(o => o.id === organizationId)) {
      return res.status(400).json({ error: 'Órgão inválido.' });
    }
    const consolidatedError = consolidatedWriteError(organizationId);
    if (consolidatedError) return res.status(400).json({ error: consolidatedError });
    if (!canWriteOrg(user, organizationId)) return res.status(403).json({ error: 'Sem permissão para lançar dados neste órgão.' });
    if (typeof contentBase64 !== 'string' || !contentBase64) return res.status(400).json({ error: 'Envie o PDF da fatura.' });

    const data = Buffer.from(contentBase64, 'base64');
    if (data.length > 8 * 1024 * 1024) return res.status(400).json({ error: 'PDF maior que 8 MB.' });
    if (data.subarray(0, 5).toString('latin1') !== '%PDF-') return res.status(400).json({ error: 'O arquivo não é um PDF.' });

    const hash = sha256(data);
    const same = db.documents.find(d => d.contentHash === hash && d.organizationId === organizationId && d.status !== 'ERRO');
    if (same) return res.status(409).json({ error: `Este PDF já foi enviado (${same.fileName}).`, document: same });

    const cee = db.indicators.find(i => i.acronym === ENERGY_KWH_ACRONYM);
    const now = new Date().toISOString();
    const doc: PLSDocument = {
      id: `doc-${Date.now()}-${hash.slice(0, 6)}`,
      organizationId,
      title: 'Fatura de energia elétrica',
      fileName: String(fileName || 'fatura.pdf').slice(0, 200),
      fileType: 'FATURA',
      indicatorId: cee?.id,
      processNumber: typeof processNumber === 'string' && processNumber.trim() ? processNumber.trim().slice(0, 40) : undefined,
      status: 'PENDENTE_VALIDACAO',
      extractionConfidence: 0,
      fileSize: `${(data.length / 1024).toFixed(0)} KB`,
      uploadedAt: now,
      uploadedBy: user?.username,
      contentHash: hash,
      sourceSystem: 'UPLOAD'
    };

    let text = '';
    try {
      text = (await pdfToText(data)).text;
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
        organizationId,
        indicators: db.indicators,
        measurements: db.measurements.filter(m => m.organizationId === organizationId),
        documents: db.documents
      };
      doc.reviewReasons = reviewReasons(f, ex.confidence, ctx, doc.id);
      if (doc.reviewReasons.length === 0 && f.competence) {
        doc.status = 'PROCESSADO';
        doc.validatedAt = now;
        doc.validatedBy = 'Lançamento automático';
        measurements = energyMeasurementsFor({ ...ctx, documents: [doc, ...db.documents] }, f.competence, user?.username || '');
      }
    }
    doc.rawTextSnippet = text.slice(0, 4000);

    db.documents.unshift(doc);
    for (const m of measurements) {
      const i = db.measurements.findIndex(x => x.id === m.id);
      if (i >= 0) db.measurements[i] = m; else db.measurements.push(m);
    }
    logAudit(
      user?.username || '',
      user?.displayName || '',
      'EXTRAÇÃO_OCR',
      'DOCUMENT',
      doc.id,
      undefined,
      doc.status === 'PROCESSADO'
        ? `Lançado: ${doc.consumption?.toLocaleString('pt-BR')} kWh e R$ ${doc.amount?.toLocaleString('pt-BR')} (${doc.competence})`
        : `Pendente: ${(doc.reviewReasons || []).join(' ')}`,
      `Leitura da fatura ${doc.fileName}. Confiança ${doc.extractionConfidence}%.`,
      'Leitura de faturas de energia'
    );
    await storage.saveNow();
    res.json({ success: true, document: doc, measurements });
  });

  // POST /api/documents/:id/validate — confirma (e corrige, se preciso) a leitura e lança CEE/GEE.
  router.post('/documents/:id/validate', requireRole('ADMIN', 'MASTER', 'PREENCHEDOR'), async (req: Request, res: Response) => {
    const doc = db.documents.find(d => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: 'Documento não encontrado.' });
    const user = currentUser();
    if (!canWriteOrg(user, doc.organizationId)) return res.status(403).json({ error: 'Sem permissão para este órgão.' });

    const { kwh, amount, competence } = req.body || {};
    const k = kwh !== undefined ? Number(kwh) : Number(doc.consumption);
    const a = amount !== undefined ? Number(amount) : Number(doc.amount);
    const comp = typeof competence === 'string' && /^\d{4}-\d{2}$/.test(competence) ? competence : doc.competence;
    if (!comp) return res.status(400).json({ error: 'Informe o mês de referência (AAAA-MM).' });
    if (!(k > 0) || !(a > 0)) return res.status(400).json({ error: 'Informe consumo (kWh) e valor (R$) maiores que zero.' });
    const [y, m] = comp.split('-').map(Number);
    const cee = db.indicators.find(i => i.acronym === ENERGY_KWH_ACRONYM);
    const gee = db.indicators.find(i => i.acronym === ENERGY_COST_ACRONYM);
    // Lançamento manual/importado do mês não é sobrescrito
    const manual = db.measurements.find(
      x => x.organizationId === doc.organizationId && x.year === y && x.month === m &&
        (x.indicatorId === cee?.id || x.indicatorId === gee?.id) && x.sourceType !== 'document_extraction'
    );
    if (manual) {
      return res.status(409).json({ error: `Já existe lançamento ${manual.sourceType === 'manual' ? 'manual' : 'importado'} de energia para ${String(m).padStart(2, '0')}/${y}. Corrija pelo lançamento mensal.` });
    }

    const before = `${doc.consumption ?? '-'} kWh / R$ ${doc.amount ?? '-'} (${doc.competence ?? '-'})`;
    Object.assign(doc, {
      consumption: k,
      amount: a,
      unit: 'kWh',
      competence: comp,
      indicatorId: cee?.id,
      status: 'PROCESSADO' as const,
      validatedAt: new Date().toISOString(),
      validatedBy: user?.username,
      reviewReasons: []
    });
    const measurements = energyMeasurementsFor(
      {
        organizationId: doc.organizationId,
        indicators: db.indicators,
        measurements: db.measurements.filter(x => x.organizationId === doc.organizationId),
        documents: db.documents
      },
      comp,
      user?.username || ''
    );
    for (const meas of measurements) {
      const i = db.measurements.findIndex(x => x.id === meas.id);
      if (i >= 0) db.measurements[i] = meas; else db.measurements.push(meas);
    }
    logAudit(
      user?.username || '',
      user?.displayName || '',
      'VALIDACAO',
      'DOCUMENT',
      doc.id,
      before,
      `${k} kWh / R$ ${a} (${comp})`,
      'Leitura da fatura confirmada pelo usuário.',
      'Leitura de faturas de energia'
    );
    await storage.saveNow();
    res.json({ success: true, document: doc, measurements });
  });

  // POST /api/chat and /api/ai/chat - Query AI assistant with Gemini API, RAG, and On-Premise Local AI
  const handleChatRequest = async (req: Request, res: Response) => {
    const {
      query,
      year = 2026,
      orgId = 'org-sjrr',
      conversationHistory = []
    } = req.body;
    // Provedor e endereço da IA são do servidor; só o administrador pode testar outro endpoint/modelo
    const isAdmin = currentUser()?.role === 'ADMIN';
    const requested = req.body.provider;
    const provider = requested === 'heuristic' || (isAdmin && (requested === 'local' || requested === 'gemini'))
      ? requested
      : defaultAIProvider();
    const localConfig = isAdmin && req.body.localConfig?.endpoint ? req.body.localConfig : undefined;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Mensagem vazia.' });
    }

    const org = db.organizations.find(o => o.id === orgId) || db.organizations[0];
    const scoped = scopeFor(org.id);

    try {
      const responseMessage = await executeRAGChatQuery({
        query: query.trim(),
        conversationHistory,
        provider,
        localConfig,
        context: {
          organizationName: org.name,
          organizationId: org.id,
          year: Number(year),
          indicators: db.indicators,
          measurements: scoped.measurements,
          targets: scoped.targets,
          actionPlans: db.actionPlans.filter(a => (a.organizationId || LEGACY_DEFAULT_ORG_ID) === org.id),
          documents: db.documents,
          alerts: db.alerts.filter(a => !a.organizationId || a.organizationId === org.id)
        }
      });

      return res.json(responseMessage);
    } catch (err: any) {
      console.error('[API] Erro ao processar chat:', err);
      return res.status(500).json({ error: 'Não foi possível processar a pergunta. Tente novamente.' });
    }
  };

  // Configuração pública da IA (sem segredos)
  router.get('/ai/config', (_req: Request, res: Response) => {
    res.json(publicAIConfig());
  });

  router.post('/chat', requireLogin, handleChatRequest);
  router.post('/ai/chat', requireLogin, handleChatRequest);

  // POST /api/ai/test-local - Test connectivity to on-premise Local AI endpoint (Ollama/vLLM)
  router.post('/ai/test-local', requireRole('ADMIN'), async (req: Request, res: Response) => {
    const { endpoint, model, apiKey, temperature } = req.body;
    try {
      const result = await testLocalAIConnection({
        endpoint: endpoint || 'http://localhost:11434/v1',
        model: model || 'llama3.3',
        apiKey,
        temperature
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: `Falha no teste de conexão: ${err?.message || 'Erro inesperado'}`
      });
    }
  });

  // GET /api/annual-report/history - 5-year historical series for charts & compliance
  router.get('/annual-report/history', (req: Request, res: Response) => {
    const year = Number(req.query.year) || 2026;
    const orgId = (req.query.orgId as string) || LEGACY_DEFAULT_ORG_ID;
    const scoped = scopeFor(orgId);
    const fiveYearSeries = buildFiveYearHistoricalSeries(db.indicators, scoped.measurements, scoped.targets, year);
    const summaryStats = getFiveYearSummaryStats(fiveYearSeries);
    const rollingYears = Array.from({ length: 5 }, (_, i) => year - 4 + i);

    res.json({
      year,
      historicalYears: rollingYears,
      fiveYearSeries,
      summaryStats
    });
  });

  // POST /api/annual-report/generate - Generate annual follow-up report via LLM (Gemini 3.8 Flash)
  router.post('/annual-report/generate', requireLogin, async (req: Request, res: Response) => {
    const { year = 2026, orgId = 'org-sjrr', customFocus } = req.body;
    const org = db.organizations.find(o => o.id === orgId) || db.organizations[0];
    const scoped = scopeFor(org.id);

    const fiveYearSeries = buildFiveYearHistoricalSeries(db.indicators, scoped.measurements, scoped.targets, Number(year));

    try {
      const generated = await generateGeminiAnnualReport({
        organizationName: org.name,
        year: Number(year),
        customFocus,
        indicators: db.indicators,
        measurements: scoped.measurements,
        targets: scoped.targets,
        actionPlans: db.actionPlans.filter(a => (a.organizationId || LEGACY_DEFAULT_ORG_ID) === org.id),
        alerts: db.alerts.filter(a => !a.organizationId || a.organizationId === org.id),
        fiveYearSeries,
        provider: defaultAIProvider()
      });

      logAudit(
        'usr-1',
        'Dr. Roberto Magalhães',
        'CRIACAO',
        'DOCUMENT',
        `rel-anual-${year}`,
        undefined,
        `Relatório Anual ${year} Gerado`,
        `Geração assistida por Inteligência Artificial (Modelo: ${generated.aiModel})`,
        'Módulo de Relatórios'
      );

      res.json({
        ...generated,
        fiveYearComparisons: fiveYearSeries
      });
    } catch (err: any) {
      console.error('[API] Erro ao gerar relatório anual com LLM:', err);
      res.status(500).json({
        error: 'Falha na geração do relatório anual.',
        details: err?.message || 'Erro interno no servidor'
      });
    }
  });

  // POST /api/action-plans - Update or create action
  router.post('/action-plans', requireRole('ADMIN', 'MASTER'), (req: Request, res: Response) => {
    const { action } = req.body;
    if (!action || !action.title) {
      return res.status(400).json({ error: 'Dados da ação incompletos.' });
    }

    const existingIdx = db.actionPlans.findIndex(a => a.id === action.id);
    const actionOrgId: string =
      (existingIdx >= 0 ? db.actionPlans[existingIdx].organizationId : action.organizationId) || LEGACY_DEFAULT_ORG_ID;
    if (consolidatedWriteError(actionOrgId)) {
      return res.status(400).json({ error: consolidatedWriteError(actionOrgId) });
    }
    if (!canManageOrg(currentUser(), actionOrgId)) {
      return res.status(403).json({ error: 'Somente o master do órgão (ou o administrador) altera o plano de ação.' });
    }
    if (existingIdx >= 0) {
      db.actionPlans[existingIdx] = { ...db.actionPlans[existingIdx], ...action, organizationId: actionOrgId };
      logAudit(
        'usr-1',
        'Dr. Roberto Magalhães',
        'ALTERACAO',
        'ACTION_PLAN',
        action.id,
        undefined,
        `Status: ${action.status}, Progresso: ${action.percentageComplete}%`,
        'Atualização do Plano de Ação Anual',
        'Módulo do Plano de Ação'
      );
    } else {
      const newAction = {
        ...action,
        id: `act-${Date.now()}`,
        organizationId: actionOrgId
      };
      db.actionPlans.push(newAction);
      logAudit(
        'usr-1',
        'Dr. Roberto Magalhães',
        'CRIACAO',
        'ACTION_PLAN',
        newAction.id,
        undefined,
        newAction.title,
        'Inclusão de nova ação estruturante no Plano de Ação',
        'Módulo do Plano de Ação'
      );
    }

    storage.scheduleSave();
    res.json({ success: true, actionPlans: db.actionPlans });
  });

  // POST /api/targets - Create or update PLS indicator target
  router.post('/targets', requireRole('ADMIN', 'MASTER'), (req: Request, res: Response) => {
    const {
      target,
      reason,
      userId = 'usr-1',
      userName = 'Dr. Roberto Magalhães'
    } = req.body;

    if (!target || !target.indicatorId || (target.targetMode !== 'PERCENTUAL' && target.targetValue === undefined)) {
      return res.status(400).json({ error: 'Dados da meta incompletos (indicador e valor da meta, ou percentual e ano-base).' });
    }

    const year = Number(target.year) || 2026;
    const targetOrgId: string = target.organizationId || LEGACY_DEFAULT_ORG_ID;
    const writeError = consolidatedWriteError(targetOrgId);
    if (writeError) {
      return res.status(400).json({ error: writeError });
    }
    if (!canManageOrg(currentUser(), targetOrgId)) {
      return res.status(403).json({ error: 'Somente o master do órgão (ou o administrador) altera metas.' });
    }

    // Meta numérica ou percentual sobre a linha de base (teto ou piso)
    const targetInd = db.indicators.find(i => i.id === target.indicatorId);
    if (!targetInd) return res.status(404).json({ error: 'Indicador não encontrado.' });
    if (targetInd.themeId === 'theme-1') {
      return res.status(400).json({ error: 'Variáveis gerais são base de cálculo e não recebem meta.' });
    }
    const mode: 'NUMERICA' | 'PERCENTUAL' = target.targetMode === 'PERCENTUAL' ? 'PERCENTUAL' : 'NUMERICA';
    const limit: 'TETO' | 'PISO' = target.limitKind === 'PISO' ? 'PISO' : 'TETO';
    target.targetMode = mode;
    target.limitKind = limit;
    if (mode === 'PERCENTUAL') {
      const pct = Number(target.percentChange);
      const baseYear = Number(target.baselineYear);
      if (!Number.isFinite(pct) || pct <= -100 || pct > 1000) {
        return res.status(400).json({ error: 'Informe um percentual válido (maior que −100%).' });
      }
      if (!Number.isInteger(baseYear) || baseYear >= year) {
        return res.status(400).json({ error: 'O ano-base deve ser anterior ao exercício da meta.' });
      }
      const resolved = resolveTarget(
        { ...target, percentChange: pct, baselineYear: baseYear, year, organizationId: targetOrgId } as any,
        targetInd,
        db.measurements.filter(m => orgIdOf(m) === targetOrgId)
      );
      if (resolved.baselineMissing) {
        return res.status(400).json({ error: `Não há dado de ${targetInd.acronym || targetInd.name} em ${baseYear} para este órgão: escolha outro ano-base ou use meta numérica.` });
      }
      target.percentChange = pct;
      target.baselineYear = baseYear;
      target.baselineValue = resolved.baselineValue;
      target.targetValue = resolved.targetValue;
      target.reductionPercentage = pct;
    } else {
      if (!Number.isFinite(Number(target.targetValue))) {
        return res.status(400).json({ error: 'Informe o valor numérico da meta.' });
      }
      delete target.percentChange;
    }
    target.targetType = legacyTargetType(mode, limit, target.percentChange);
    delete target.baselineMissing;

    const existingIdx = db.targets.findIndex(
      t =>
        t.indicatorId === target.indicatorId &&
        t.year === year &&
        (t.organizationId || LEGACY_DEFAULT_ORG_ID) === targetOrgId
    );

    let updatedTarget: any;

    if (existingIdx >= 0) {
      const oldTarget = db.targets[existingIdx];
      updatedTarget = {
        ...oldTarget,
        ...target,
        year,
        targetValue: Number(target.targetValue),
        baselineValue: target.baselineValue !== undefined ? Number(target.baselineValue) : oldTarget.baselineValue
      };
      if (mode === 'NUMERICA') {
        delete updatedTarget.percentChange;
        delete updatedTarget.reductionPercentage;
      }
      db.targets[existingIdx] = updatedTarget;

      const ind = db.indicators.find(i => i.id === target.indicatorId);
      logAudit(
        userId,
        userName,
        'ALTERACAO',
        'TARGET',
        updatedTarget.id,
        `Meta: ${oldTarget.targetValue} ${oldTarget.targetUnit || ind?.unit}, Baseline: ${oldTarget.baselineValue}`,
        `Meta: ${updatedTarget.targetValue} ${updatedTarget.targetUnit || ind?.unit}, Baseline: ${updatedTarget.baselineValue}`,
        reason || 'Alteração manual de meta informada pelo gestor no sistema.',
        'Módulo de Gestão de Metas'
      );
    } else {
      const ind = db.indicators.find(i => i.id === target.indicatorId);
      updatedTarget = {
        ...target,
        id: target.id || `target-${targetOrgId}-${target.indicatorId}-${year}-${Date.now()}`,
        organizationId: targetOrgId,
        year,
        targetValue: Number(target.targetValue),
        targetUnit: target.targetUnit || ind?.unit || 'unidades',
        baselineValue: Number(target.baselineValue) || 0
      };
      db.targets.push(updatedTarget);

      logAudit(
        userId,
        userName,
        'CRIACAO',
        'TARGET',
        updatedTarget.id,
        undefined,
        `Meta: ${updatedTarget.targetValue} ${updatedTarget.targetUnit}`,
        reason || 'Definição inicial de meta para o indicador no ciclo.',
        'Módulo de Gestão de Metas'
      );
    }

    // Metas pertencem ao órgão: não são mais copiadas para o indicador (catálogo global).
    storage.scheduleSave();
    res.json({ success: true, target: updatedTarget, targets: scopeTargets(targetOrgId, db.targets), persisted: true });
  });

  // DELETE /api/targets/:id - Remove PLS indicator target
  router.delete('/targets/:id', requireRole('ADMIN', 'MASTER'), (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      indicatorId = req.query.indicatorId as string,
      year = req.query.year ? Number(req.query.year) : 2026,
      reason = req.query.reason as string,
      organizationId = (req.query.orgId as string) || LEGACY_DEFAULT_ORG_ID,
      userId = 'usr-1',
      userName = 'Dr. Roberto Magalhães'
    } = req.body || {};

    if (!canManageOrg(currentUser(), organizationId)) {
      return res.status(403).json({ error: 'Somente o master do órgão (ou o administrador) altera metas.' });
    }
    const targetIndex = db.targets.findIndex(t => {
      if ((t.organizationId || LEGACY_DEFAULT_ORG_ID) !== organizationId) return false;
      if (id && id !== 'undefined' && id !== ':id' && id !== 'by-indicator' && t.id === id) return true;
      if (indicatorId && year && t.indicatorId === indicatorId && t.year === Number(year)) return true;
      return false;
    });

    let removedTarget: any = null;
    if (targetIndex >= 0) {
      removedTarget = db.targets.splice(targetIndex, 1)[0];
    }

    const effIndicatorId = removedTarget?.indicatorId || indicatorId;
    const ind = db.indicators.find(i => i.id === effIndicatorId);

    if (!removedTarget && !ind) {
      return res.status(404).json({ error: 'Meta ou indicador não encontrado para exclusão.' });
    }

    logAudit(
      userId,
      userName,
      'EXCLUSAO',
      'TARGET',
      removedTarget?.id || `target-${effIndicatorId}-${year}`,
      `Meta do exercício ${year}: ${removedTarget?.targetValue ?? ind?.targetValue2026 ?? ''} ${removedTarget?.targetUnit || ind?.unit || ''}`,
      undefined,
      reason || 'Exclusão de meta do indicador homologada pelo gestor.',
      'Módulo de Gestão de Metas'
    );

    storage.scheduleSave();
    res.json({ success: true, removedTarget, targets: scopeTargets(organizationId, db.targets), persisted: true });
  });

  return router;
}
