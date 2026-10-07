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
import { queryInstitutionalAI } from '../services/aiService';
import { extractDataFromDocument } from '../services/documentExtractor';
import { IndicatorMeasurement, AuditLog, PLSDocument, InconsistencyAlert } from '../types';

export function createApiRouter() {
  const router = express.Router();
  const db = storage.getDatabase();

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
    const entry: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      organizationId: 'org-sjrr',
      userId,
      userName,
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
    const orgId = (req.query.orgId as string) || 'org-sjrr';

    // Recalculate indicator metrics
    const indicatorPerformances = db.indicators.map(ind => {
      const target = db.targets.find(t => t.indicatorId === ind.id && t.year === year);
      return {
        indicator: ind,
        target,
        result: calculateIndicatorPerformance(ind, db.measurements, target, year)
      };
    });

    // Detect inconsistencies
    const dynamicAlerts = detectMeasurementInconsistencies(db.indicators, db.measurements, year);
    const allAlerts = [...db.alerts];
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
      targets: db.targets,
      measurements: db.measurements,
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

  // GET /api/analytics/indicators
  router.get('/analytics/indicators', (req: Request, res: Response) => {
    const year = Number(req.query.year) || 2026;
    const results = db.indicators.map(ind => {
      const target = db.targets.find(t => t.indicatorId === ind.id && t.year === year);
      return calculateIndicatorPerformance(ind, db.measurements, target, year);
    });
    res.json(results);
  });

  // POST /api/measurements - Add or update measurement with validation, audit & disk persistence
  router.post('/measurements', (req: Request, res: Response) => {
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
      userId = 'usr-1',
      userName = 'Dr. Roberto Magalhães'
    } = req.body;

    if (!indicatorId || !year || !month || value === undefined) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes (indicatorId, year, month, value).' });
    }

    const ind = db.indicators.find(i => i.id === indicatorId);
    if (!ind) {
      return res.status(404).json({ error: 'Indicador não encontrado.' });
    }

    const existingIndex = db.measurements.findIndex(
      m => m.indicatorId === indicatorId && m.year === Number(year) && m.month === Number(month)
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
        organizationId: 'org-sjrr',
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

    storage.saveNow();
    res.json({ success: true, measurement, persisted: true });
  });

  // POST /api/measurements/batch - Ingest batch of measurements from spreadsheet (2021-2025)
  router.post('/measurements/batch', (req: Request, res: Response) => {
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
    const now = new Date().toISOString();

    items.forEach((item, idx) => {
      if (!item.indicatorId || item.value === undefined) return;
      const year = Number(item.year) || 2026;
      const month = item.month !== undefined ? Number(item.month) : 1;
      const val = Number(item.value);

      const existingIndex = db.measurements.findIndex(
        m => m.indicatorId === item.indicatorId && m.year === year && m.month === month
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

    storage.saveNow();
    res.json({
      success: true,
      totalProcessed: items.length,
      insertedCount,
      updatedCount,
      totalInDatabase: db.measurements.length,
      persisted: true
    });
  });

  // POST /api/documents/upload - Upload and simulate OCR
  router.post('/documents/upload', (req: Request, res: Response) => {
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
  router.post('/documents/:id/validate', (req: Request, res: Response) => {
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
      provider = 'gemini',
      localConfig,
      conversationHistory = []
    } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Mensagem vazia.' });
    }

    const org = db.organizations.find(o => o.id === orgId) || db.organizations[0];

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
          measurements: db.measurements,
          targets: db.targets,
          actionPlans: db.actionPlans,
          documents: db.documents,
          alerts: db.alerts
        }
      });

      return res.json(responseMessage);
    } catch (err: any) {
      console.error('[API] Erro ao processar chat RAG:', err);
      // Fallback: grounded deterministic institutional reasoning engine
      const fallbackAnswer = await queryInstitutionalAI(query, {
        organizationName: org.name,
        organizationId: org.id,
        year: Number(year),
        indicators: db.indicators,
        measurements: db.measurements,
        targets: db.targets,
        actionPlans: db.actionPlans,
        documents: db.documents,
        alerts: db.alerts
      });
      return res.json(fallbackAnswer);
    }
  };

  router.post('/chat', handleChatRequest);
  router.post('/ai/chat', handleChatRequest);

  // POST /api/ai/test-local - Test connectivity to on-premise Local AI endpoint (Ollama/vLLM)
  router.post('/ai/test-local', async (req: Request, res: Response) => {
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
    const orgId = (req.query.orgId as string) || 'org-sjrr';
    const fiveYearSeries = buildFiveYearHistoricalSeries(db.indicators, db.measurements, db.targets, year);
    const summaryStats = getFiveYearSummaryStats(fiveYearSeries);

    res.json({
      year,
      historicalYears: [2022, 2023, 2024, 2025, 2026],
      fiveYearSeries,
      summaryStats
    });
  });

  // POST /api/annual-report/generate - Generate annual follow-up report via LLM (Gemini 3.8 Flash)
  router.post('/annual-report/generate', async (req: Request, res: Response) => {
    const { year = 2026, orgId = 'org-sjrr', customFocus } = req.body;
    const org = db.organizations.find(o => o.id === orgId) || db.organizations[0];

    const fiveYearSeries = buildFiveYearHistoricalSeries(db.indicators, db.measurements, db.targets, Number(year));

    try {
      const generated = await generateGeminiAnnualReport({
        organizationName: org.name,
        year: Number(year),
        customFocus,
        indicators: db.indicators,
        measurements: db.measurements,
        targets: db.targets,
        actionPlans: db.actionPlans,
        alerts: db.alerts,
        fiveYearSeries
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
  router.post('/action-plans', (req: Request, res: Response) => {
    const { action } = req.body;
    if (!action || !action.title) {
      return res.status(400).json({ error: 'Dados da ação incompletos.' });
    }

    const existingIdx = db.actionPlans.findIndex(a => a.id === action.id);
    if (existingIdx >= 0) {
      db.actionPlans[existingIdx] = { ...db.actionPlans[existingIdx], ...action };
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
        organizationId: 'org-sjrr'
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
  router.post('/targets', (req: Request, res: Response) => {
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
    const existingIdx = db.targets.findIndex(
      t => t.indicatorId === target.indicatorId && t.year === year
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
        id: target.id || `target-${target.indicatorId}-${year}-${Date.now()}`,
        organizationId: 'org-sjrr',
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

    storage.scheduleSave();
    res.json({ success: true, target: updatedTarget, targets: db.targets, persisted: true });
  });

  return router;
}
