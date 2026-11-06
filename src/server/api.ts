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
import { extractDataFromDocument } from '../services/documentExtractor';
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

export function createApiRouter() {
  const router = express.Router();
  const db = storage.getDatabase();

  /** Dados do órgão selecionado: medições próprias (ou consolidadas) e metas. */
  const scopeFor = (orgId: string) => ({
    measurements: scopeMeasurements(orgId, db.measurements, db.indicators, db.organizations),
    targets: scopeTargets(orgId, db.targets),
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
      documents: db.documents,
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

    const existingIndex = db.measurements.findIndex(
      m =>
        m.indicatorId === indicatorId &&
        m.year === Number(year) &&
        m.month === Number(month) &&
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
        month: Number(month),
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
          processNumber: item.processNumber || db.measurements[existingIndex].processNumber || '0001245-88.2026.4.01.8012',
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
          processNumber: item.processNumber || '0001245-88.2026.4.01.8012',
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

  // POST /api/documents/upload - Upload and simulate OCR
  router.post('/documents/upload', requireRole('ADMIN', 'MASTER', 'PREENCHEDOR'), (req: Request, res: Response) => {
    const { fileName, fileType, title, indicatorId, processNumber, textSnippet } = req.body;

    const extracted = extractDataFromDocument(fileName || 'documento.pdf', textSnippet);

    const newDoc: PLSDocument = {
      id: `doc-${Date.now()}`,
      organizationId: 'org-sjrr',
      title: title || extracted.supplier,
      fileName: fileName || 'fatura.pdf',
      fileType: fileType || 'FATURA',
      competence: extracted.competence,
      indicatorId: indicatorId || extracted.detectedIndicatorId,
      processNumber: processNumber || extracted.detectedProcessNumber,
      supplier: extracted.supplier,
      amount: extracted.totalAmount,
      consumption: extracted.consumptionValue,
      unit: extracted.consumptionUnit,
      status: extracted.requiresHumanReview ? 'PENDENTE_VALIDACAO' : 'PROCESSADO',
      extractionConfidence: extracted.confidenceScore,
      fileSize: '1.2 MB',
      uploadedAt: new Date().toISOString(),
      ocrConfidence: extracted.confidenceScore,
      rawTextSnippet: extracted.rawText
    };

    db.documents.unshift(newDoc);

    logAudit(
      'usr-3',
      'Eng. Carlos Mendonça',
      'EXTRAÇÃO_OCR',
      'DOCUMENT',
      newDoc.id,
      undefined,
      `${newDoc.title} (${newDoc.consumption} ${newDoc.unit})`,
      `Upload e leitura automática via OCR. Índice de confiança: ${extracted.confidenceScore}%.`,
      'Pipeline de Ingestão de Documentos'
    );

    storage.scheduleSave();
    res.json({ success: true, document: newDoc, extracted });
  });

  // POST /api/documents/:id/validate - Validate extracted document
  router.post('/documents/:id/validate', requireRole('ADMIN', 'MASTER', 'PREENCHEDOR'), (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId = 'usr-1', userName = 'Dr. Roberto Magalhães', approvedValue } = req.body;

    const docIndex = db.documents.findIndex(d => d.id === id);
    if (docIndex < 0) {
      return res.status(404).json({ error: 'Documento não encontrado.' });
    }

    const doc = db.documents[docIndex];
    doc.status = 'PROCESSADO';
    doc.validatedAt = new Date().toISOString();
    doc.validatedBy = userId;
    if (approvedValue !== undefined) {
      doc.consumption = Number(approvedValue);
    }

    // Also update any pending measurement associated with this document
    if (doc.indicatorId && doc.competence) {
      const [y, m] = doc.competence.split('-').map(Number);
      const mIdx = db.measurements.findIndex(
        item => item.indicatorId === doc.indicatorId && item.year === y && item.month === m
      );
      if (mIdx >= 0) {
        db.measurements[mIdx].validationStatus = 'VALIDADO';
        db.measurements[mIdx].validatedBy = userId;
        db.measurements[mIdx].validatedAt = new Date().toISOString();
        if (approvedValue !== undefined) {
          db.measurements[mIdx].value = Number(approvedValue);
        }
      }
    }

    logAudit(
      userId,
      userName,
      'VALIDACAO',
      'DOCUMENT',
      doc.id,
      'Status: PENDENTE_VALIDACAO',
      'Status: PROCESSADO',
      'Validação manual do atesto e faturamento aprovada pelo fiscal/gestor.',
      'Módulo de Gestão Documental'
    );

    storage.scheduleSave();
    res.json({ success: true, document: doc });
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

    if (!target || !target.indicatorId || target.targetValue === undefined) {
      return res.status(400).json({ error: 'Dados da meta incompletos (indicatorId e targetValue são obrigatórios).' });
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
