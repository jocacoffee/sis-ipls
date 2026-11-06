import React, { useState, useEffect, useMemo } from 'react';
import {
  Organization,
  UserRole,
  Indicator,
  IndicatorMeasurement,
  IndicatorTarget,
  PLSTheme,
  ActionPlan,
  PLSDocument,
  EmissionSource,
  GHGCalculation,
  PLSJudMapping,
  SEIConnector,
  AuditLog,
  InconsistencyAlert,
  IndicatorCalculationResult,
  IDSComplement
} from './types';
import {
  INITIAL_ORGANIZATIONS,
  INITIAL_USERS,
  INITIAL_THEMES,
  INITIAL_INDICATORS,
  INITIAL_TARGETS,
  INITIAL_DOCUMENTS,
  INITIAL_ACTION_PLANS,
  INITIAL_EMISSION_SOURCES,
  INITIAL_GHG_CALCULATIONS,
  INITIAL_PLS_JUD_MAPPINGS,
  INITIAL_SEI_CONNECTORS,
  INITIAL_AUDIT_LOGS,
  INITIAL_ALERTS
} from './data/seedData';
import { calculateIndicatorPerformance, detectMeasurementInconsistencies } from './services/calculationEngine';
import { extractDataFromDocument } from './services/documentExtractor';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { IndicatorsView } from './components/IndicatorsView';
import { TargetsView } from './components/TargetsView';
import { DocumentsView } from './components/DocumentsView';
import { ActionPlanView } from './components/ActionPlanView';
import { ChatView } from './components/ChatView';
import { AnnualReportView } from './components/AnnualReportView';
import { GHGInventoryView } from './components/GHGInventoryView';
import { IntegrationsView } from './components/IntegrationsView';
import { YearComparisonView } from './components/YearComparisonView';
import { AuditLogView } from './components/AuditLogView';
import { IndicatorDetailModal } from './components/IndicatorDetailModal';
import { EditIndicatorModal } from './components/EditIndicatorModal';
import { DataIngestionModal } from './components/DataIngestionModal';
import { SpreadsheetImportModal } from './components/SpreadsheetImportModal';
import { ReplicateGeneralVariablesModal } from './components/ReplicateGeneralVariablesModal';
import { GENERAL_VARIABLE_INDICATOR_IDS } from './utils/generalVariablesUtils';
import { PanelLeftOpen, PanelLeftClose, Building2, FileSpreadsheet, Maximize2 } from 'lucide-react';
import {
  STORAGE_KEYS,
  loadLocalData,
  loadIndicatorsData,
  saveLocalData,
  mergeMeasurements,
  syncMeasurementsToServer
} from './services/storageSync';
import {
  getSystemAvailableYears,
  getPlsCycleForYear,
  getAllAvailableCycles,
  getYearsForCycle,
  getCycleFromYear,
  getCycleInfo
} from './utils/yearUtils';
import { isConsolidatedOrg, orgDenominators, orgIdOf } from './services/orgScope';
import { AuthUser, canEnterData, canManageTargets, canManageUsers, fetchCurrentUser, logout } from './services/authClient';
import { PermissionsView } from './components/PermissionsView';
import { LoginModal } from './components/LoginModal';

// Cache local separado por órgão (evita misturar séries de unidades diferentes)
const measurementsCacheKey = (orgId: string) => `${STORAGE_KEYS.MEASUREMENTS}__${orgId}`;
const targetsCacheKey = (orgId: string) => `${STORAGE_KEYS.TARGETS}__${orgId}`;
const DEFAULT_ORG_ID = 'org-sjrr';
const CONSOLIDATED_WRITE_MESSAGE =
  'O consolidado da 1ª Região é calculado a partir dos órgãos e não aceita lançamentos. Selecione um órgão para lançar ou editar dados.';

export function App() {
  // Core state
  const [organizations, setOrganizations] = useState<Organization[]>(INITIAL_ORGANIZATIONS);
  const [selectedOrgId, setSelectedOrgId] = useState<string>(DEFAULT_ORG_ID);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  useEffect(() => {
    fetchCurrentUser().then(u => {
      setAuthUser(u);
      // Gestor entra direto no próprio órgão
      if (u?.organizationId && (u.role === 'MASTER' || u.role === 'PREENCHEDOR')) setSelectedOrgId(u.organizationId);
    });
  }, []);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Relational data store with dual-layer localStorage caching
  const [themes] = useState<PLSTheme[]>(INITIAL_THEMES);
  const [indicators, setIndicators] = useState<Indicator[]>(() =>
    loadIndicatorsData(INITIAL_INDICATORS)
  );
  const [editingIndicator, setEditingIndicator] = useState<Indicator | null>(null);
  const [targets, setTargets] = useState<IndicatorTarget[]>(() =>
    loadLocalData(targetsCacheKey(DEFAULT_ORG_ID), INITIAL_TARGETS)
  );
  const [measurements, setMeasurements] = useState<IndicatorMeasurement[]>(() =>
    loadLocalData<IndicatorMeasurement[]>(measurementsCacheKey(DEFAULT_ORG_ID), [])
  );
  const [documents, setDocuments] = useState<PLSDocument[]>(INITIAL_DOCUMENTS);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>(() =>
    loadLocalData(STORAGE_KEYS.ACTION_PLANS, INITIAL_ACTION_PLANS)
  );
  const [emissionSources] = useState<EmissionSource[]>(INITIAL_EMISSION_SOURCES);
  const [ghgCalculations, setGhgCalculations] = useState<GHGCalculation[]>(INITIAL_GHG_CALCULATIONS);
  const [plsJudMappings, setPlsJudMappings] = useState<PLSJudMapping[]>(INITIAL_PLS_JUD_MAPPINGS);
  const [seiConnectors, setSeiConnectors] = useState<SEIConnector[]>(INITIAL_SEI_CONNECTORS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() =>
    loadLocalData(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS)
  );
  const [alerts, setAlerts] = useState<InconsistencyAlert[]>(INITIAL_ALERTS);
  const [idsComplements, setIdsComplements] = useState<IDSComplement[]>([]);

  // Modals state
  const [selectedIndicatorForDetail, setSelectedIndicatorForDetail] = useState<Indicator | null>(null);
  const [targetToEdit, setTargetToEdit] = useState<{ indicatorId: string; target?: IndicatorTarget } | null>(null);
  const [isDataIngestionOpen, setIsDataIngestionOpen] = useState<boolean>(false);
  const [preselectedIndicatorId, setPreselectedIndicatorId] = useState<string | undefined>(undefined);
  const [preselectedMonth, setPreselectedMonth] = useState<number | undefined>(undefined);
  const [isSpreadsheetImportOpen, setIsSpreadsheetImportOpen] = useState<boolean>(false);
  const [isReplicateModalOpen, setIsReplicateModalOpen] = useState<boolean>(false);

  // Chat pre-filled query
  const [chatInitialQuery, setChatInitialQuery] = useState<string | undefined>(undefined);

  // Collapsible sidebar state (persisted in localStorage)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() =>
    loadLocalData('ipls_sidebar_collapsed', false)
  );

  // Selected cycle state (synchronized with selectedYear and persisted in localStorage)
  const [selectedCycle, setSelectedCycle] = useState<string>(() => {
    return loadLocalData('ipls_selected_cycle', getCycleFromYear(selectedYear));
  });

  const allCycles = useMemo(() => {
    return getAllAvailableCycles();
  }, []);

  const activeCycleInfo = useMemo(() => {
    return getCycleInfo(selectedCycle);
  }, [selectedCycle]);

  // Ao selecionar o ciclo, os anos visíveis na tela são SOMENTE os anos daquele ciclo correspondente
  const currentCycleYears = useMemo(() => {
    return getYearsForCycle(selectedCycle);
  }, [selectedCycle]);

  const handleSelectCycle = (newCycle: string) => {
    setSelectedCycle(newCycle);
    saveLocalData('ipls_selected_cycle', newCycle);
    const years = getYearsForCycle(newCycle);
    if (!years.includes(selectedYear)) {
      const curCalYear = new Date().getFullYear();
      const nextYear = years.includes(curCalYear) ? curCalYear : years[0];
      setSelectedYear(nextYear);
    }
  };

  const handleSelectYear = (year: number) => {
    setSelectedYear(year);
    const cycleForYear = getCycleFromYear(year);
    if (cycleForYear !== selectedCycle) {
      setSelectedCycle(cycleForYear);
      saveLocalData('ipls_selected_cycle', cycleForYear);
    }
  };

  // Dynamic forward-compatible years
  const availableSystemYears = useMemo(() => {
    return getSystemAvailableYears(measurements, targets, selectedYear);
  }, [measurements, targets, selectedYear]);

  // Handler para replicação de Variáveis Gerais (Tema 1) de exercícios anteriores
  const handleConfirmReplication = (
    newMeasurements: IndicatorMeasurement[],
    fromYear: number,
    toYear: number
  ) => {
    if (!ensureCanEdit()) return;
    setMeasurements(prev => {
      // Filtrar eventuais variáveis gerais existentes em toYear e anexar as novas
      const filtered = prev.filter(
        m => !(m.year === toYear && GENERAL_VARIABLE_INDICATOR_IDS.includes(m.indicatorId))
      );
      const updated = [...filtered, ...newMeasurements];
      saveLocalData(measurementsCacheKey(selectedOrgId), updated);
      syncMeasurementsToServer(newMeasurements);
      return updated;
    });

    const newAuditLog: AuditLog = {
      id: `log-rep-gv-${Date.now()}`,
      organizationId: selectedOrgId,
      userId: 'usr-1',
      userName: 'Gestor do PLS',
      action: 'ALTERACAO',
      timestamp: new Date().toISOString(),
      entityType: 'MEASUREMENT',
      entityId: `gv-${toYear}`,
      newValue: `Replicação das variáveis institucionais (FTT, Área e Pessoal) a partir de ${fromYear}.`,
      reason: `Replicação de variáveis institucionais para o exercício ${toYear}.`,
      source: 'iPLS-Core'
    };
    setAuditLogs(prev => {
      const updated = [newAuditLog, ...prev];
      saveLocalData(STORAGE_KEYS.AUDIT_LOGS, updated);
      return updated;
    });
  };

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      saveLocalData('ipls_sidebar_collapsed', next);
      return next;
    });
  };

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar visibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleToggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Synchronize with API on mount and protect user-imported data
  useEffect(() => {
    // Ao trocar de órgão, exibe imediatamente o cache daquele órgão (nunca o de outro)
    setMeasurements(loadLocalData<IndicatorMeasurement[]>(measurementsCacheKey(selectedOrgId), []));
    setTargets(loadLocalData<IndicatorTarget[]>(targetsCacheKey(selectedOrgId), []));

    fetch(`/api/bootstrap?year=${selectedYear}&orgId=${selectedOrgId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.organizations) && data.organizations.length > 0) {
          const sorted = [...data.organizations].sort(
            (a: Organization, b: Organization) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999)
          );
          setOrganizations(sorted);
        }
        if (data.indicators) {
          const normalized = data.indicators.map((ind: Indicator) => {
            if (ind.themeId === 'theme-1' && ind.periodicity !== 'ANUAL') {
              return { ...ind, periodicity: 'ANUAL' as const };
            }
            return ind;
          });
          setIndicators(normalized);
          saveLocalData(STORAGE_KEYS.INDICATORS, normalized);
        }
        if (data.targets) {
          setTargets(data.targets);
          saveLocalData(targetsCacheKey(selectedOrgId), data.targets);
        }
        if (data.measurements) {
          // O servidor (banco) é a fonte da verdade: o cache local só acelera a abertura
          // e nunca é reenviado (isso ressuscitaria dados apagados ou corrigidos por outros).
          setMeasurements(data.measurements);
          saveLocalData(measurementsCacheKey(selectedOrgId), data.measurements);
        }
        if (data.documents) setDocuments(data.documents);
        if (data.actionPlans) {
          setActionPlans(data.actionPlans);
          saveLocalData(STORAGE_KEYS.ACTION_PLANS, data.actionPlans);
        }
        if (data.auditLogs) {
          setAuditLogs(data.auditLogs);
          saveLocalData(STORAGE_KEYS.AUDIT_LOGS, data.auditLogs);
        }
        if (data.alerts) setAlerts(data.alerts);
        setIdsComplements(Array.isArray(data.idsComplements) ? data.idsComplements : []);
      })
      .catch(err => {
        console.log('[iPLS] Servidor inicializando ou modo autônomo ativo:', err);
      });
  }, [selectedYear, selectedOrgId]);

  // Dynamic calculations for all indicators in selected year (dados do órgão selecionado)
  const orgDenoms = orgDenominators(selectedOrgId, organizations);
  const isConsolidatedView = isConsolidatedOrg(selectedOrgId, organizations);
  const canEdit = canEnterData(authUser, selectedOrgId, isConsolidatedView);
  const canManage = canManageTargets(authUser, selectedOrgId, isConsolidatedView);

  /**
   * Verifica a permissão antes de abrir/gravar algo; se não houver, explica ou abre o login.
   * - data: medições e documentos (preenchedor, master, administrador);
   * - manage: metas e plano de ação (master, administrador);
   * - admin: catálogo de indicadores (administrador).
   */
  const ensureCanEdit = (kind: 'data' | 'manage' | 'admin' = 'data'): boolean => {
    if (!authUser) {
      setIsLoginOpen(true);
      return false;
    }
    if (kind === 'admin') {
      if (authUser.role !== 'ADMIN') {
        window.alert('Somente o administrador regional altera o catálogo de indicadores.');
        return false;
      }
      return true;
    }
    if (isConsolidatedView) {
      window.alert(CONSOLIDATED_WRITE_MESSAGE);
      return false;
    }
    if (authUser.role === 'LEITOR') {
      window.alert('Seu usuário tem acesso apenas para consulta. Peça acesso ao master de sustentabilidade do seu órgão.');
      return false;
    }
    if (kind === 'manage' && !canManage) {
      window.alert(
        authUser.role === 'PREENCHEDOR'
          ? 'Metas e plano de ação são alterados somente pelo master do órgão.'
          : 'Você só pode alterar metas e plano de ação do seu próprio órgão.'
      );
      return false;
    }
    if (kind === 'data' && !canEdit) {
      window.alert('Você só pode lançar e alterar dados do seu próprio órgão.');
      return false;
    }
    return true;
  };
  const indicatorPerformances = indicators.map(ind => {
    const target = targets.find(t => t.indicatorId === ind.id && t.year === selectedYear);
    return {
      indicator: ind,
      target,
      result: calculateIndicatorPerformance(ind, measurements, target, selectedYear, orgDenoms.areaM2, orgDenoms.ftt)
    };
  });

  // Re-evaluate inconsistencies whenever measurements change
  useEffect(() => {
    const detected = detectMeasurementInconsistencies(indicators, measurements, selectedYear);
    setAlerts(prev => {
      const merged = [...prev];
      detected.forEach(d => {
        if (!merged.some(m => m.id === d.id || (m.indicatorId === d.indicatorId && m.month === d.month && m.type === d.type))) {
          merged.push(d);
        }
      });
      return merged;
    });
  }, [measurements, selectedYear, indicators]);

  // Current Org Name
  const currentOrg = organizations.find(o => o.id === selectedOrgId) || organizations[0];

  // Quick Open Chat
  const handleOpenChatWithQuery = (query: string) => {
    setChatInitialQuery(query);
    setActiveTab('chat');
  };

  // Open Data Ingestion Modal
  const handleOpenDataIngestion = (indicatorId?: string, month?: number) => {
    if (!ensureCanEdit()) return;
    setPreselectedIndicatorId(indicatorId);
    setPreselectedMonth(month);
    setIsDataIngestionOpen(true);
  };

  // Update indicator definition, periodicity, and metadata
  const handleUpdateIndicator = async (updatedIndicator: Indicator, reason?: string) => {
    if (!ensureCanEdit('admin')) return;
    // 1. Post to API
    try {
      await fetch(`/api/indicators/${updatedIndicator.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updatedIndicator,
          reason,
          userId: 'usr-1',
          userName: 'Dr. Roberto Magalhães'
        })
      });
    } catch (e) {
      console.warn('[iPLS] Servidor offline ou em transição, mantendo persistência local:', e);
    }

    // 2. Update local state
    setIndicators(prev => {
      const copy = prev.map(ind => ind.id === updatedIndicator.id ? updatedIndicator : ind);
      saveLocalData(STORAGE_KEYS.INDICATORS, copy);
      return copy;
    });

    // 3. Update detail modal state if currently open
    setSelectedIndicatorForDetail(prev => {
      if (prev && prev.id === updatedIndicator.id) {
        return updatedIndicator;
      }
      return prev;
    });

    // 4. Log audit entry locally
    const auditEntry: AuditLog = {
      id: `audit-${Date.now()}`,
      organizationId: selectedOrgId,
      userId: 'usr-1',
      userName: 'Dr. Roberto Magalhães',
      action: 'ALTERACAO',
      timestamp: new Date().toISOString(),
      entityType: 'INDICATOR',
      entityId: updatedIndicator.id,
      indicatorCode: updatedIndicator.code,
      newValue: `${updatedIndicator.name} [${updatedIndicator.periodicity}]`,
      reason: reason || `Alteração da definição/periodicidade da variável ${updatedIndicator.code}`,
      source: 'Módulo de Gestão Metodológica'
    };
    setAuditLogs(prev => {
      const updated = [auditEntry, ...prev];
      saveLocalData(STORAGE_KEYS.AUDIT_LOGS, updated);
      return updated;
    });
  };

  // Save manual measurement
  const handleSaveMeasurement = async (data: {
    indicatorId: string;
    year: number;
    month: number;
    value: number;
    unit: string;
    sourceType: any;
    sourceReference: string;
    processNumber: string;
    notes: string;
    reason?: string;
  }) => {
    if (!ensureCanEdit()) return;
    // 1. Post to API (a tela só é atualizada se o servidor confirmar a gravação)
    try {
      const res = await fetch('/api/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, organizationId: selectedOrgId })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        window.alert(err.error || `Falha ao gravar (HTTP ${res.status}).`);
        return;
      }
    } catch (e) {
      window.alert('Falha de conexão com o servidor. O lançamento não foi gravado.');
      return;
    }

    // 2. Update local state
    const existingIndex = measurements.findIndex(
      m => m.indicatorId === data.indicatorId && m.year === data.year && m.month === data.month
    );

    let updatedMeasurement: IndicatorMeasurement;
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      const oldVal = measurements[existingIndex];
      updatedMeasurement = {
        ...oldVal,
        value: data.value,
        unit: data.unit,
        sourceType: data.sourceType,
        sourceReference: data.sourceReference,
        processNumber: data.processNumber,
        notes: data.notes,
        validationStatus: 'VALIDADO',
        validatedBy: 'usr-1',
        validatedAt: now,
        updatedAt: now
      };

      setMeasurements(prev => {
        const copy = [...prev];
        copy[existingIndex] = updatedMeasurement;
        saveLocalData(measurementsCacheKey(selectedOrgId), copy);
        return copy;
      });

      // Audit Log
      const auditEntry: AuditLog = {
        id: `audit-${Date.now()}`,
        organizationId: selectedOrgId,
        userId: 'usr-1',
        userName: 'Dr. Roberto Magalhães',
        action: 'ALTERACAO',
        timestamp: now,
        entityType: 'MEASUREMENT',
        entityId: updatedMeasurement.id,
        indicatorCode: indicators.find(i => i.id === data.indicatorId)?.code,
        previousValue: `${oldVal.value} ${oldVal.unit}`,
        newValue: `${data.value} ${data.unit}`,
        reason: data.reason || 'Atualização informada pelo gestor.',
        source: 'Módulo de Entrada Manual'
      };
      setAuditLogs(prev => {
        const updated = [auditEntry, ...prev];
        saveLocalData(STORAGE_KEYS.AUDIT_LOGS, updated);
        return updated;
      });
    } else {
      updatedMeasurement = {
        id: `m-${data.indicatorId}-${data.year}-${data.month}-${Date.now()}`,
        indicatorId: data.indicatorId,
        organizationId: selectedOrgId,
        year: data.year,
        month: data.month,
        value: data.value,
        unit: data.unit,
        sourceType: data.sourceType,
        sourceReference: data.sourceReference,
        processNumber: data.processNumber,
        validationStatus: 'VALIDADO',
        validatedBy: 'usr-1',
        validatedAt: now,
        confidenceScore: 100,
        notes: data.notes,
        createdAt: now,
        updatedAt: now
      };

      setMeasurements(prev => {
        const updated = [...prev, updatedMeasurement];
        saveLocalData(measurementsCacheKey(selectedOrgId), updated);
        return updated;
      });

      // Audit Log
      const auditEntry: AuditLog = {
        id: `audit-${Date.now()}`,
        organizationId: selectedOrgId,
        userId: 'usr-1',
        userName: 'Dr. Roberto Magalhães',
        action: 'CRIACAO',
        timestamp: now,
        entityType: 'MEASUREMENT',
        entityId: updatedMeasurement.id,
        indicatorCode: indicators.find(i => i.id === data.indicatorId)?.code,
        newValue: `${data.value} ${data.unit}`,
        reason: data.reason || 'Lançamento manual de competência.',
        source: 'Módulo de Entrada Manual'
      };
      setAuditLogs(prev => {
        const updated = [auditEntry, ...prev];
        saveLocalData(STORAGE_KEYS.AUDIT_LOGS, updated);
        return updated;
      });
    }
  };

  // Import batch of measurements from spreadsheet
  const handleImportBatch = (newMeasurements: Partial<IndicatorMeasurement>[]) => {
    if (!ensureCanEdit()) return;
    const formatted: IndicatorMeasurement[] = newMeasurements.map((item, idx) => ({
      id: item.id || `m-imp-${item.year || selectedYear}-${item.month || 1}-${item.indicatorId}-${Date.now()}-${idx}`,
      indicatorId: item.indicatorId!,
      organizationId: item.organizationId || selectedOrgId,
      year: item.year || selectedYear,
      month: item.month !== undefined ? item.month : 1,
      value: Number(item.value) || 0,
      unit: item.unit || 'unidades',
      sourceType: 'spreadsheet',
      sourceReference: item.sourceReference || 'Importação de Planilha',
      processNumber: item.processNumber || '0001245-88.2026.4.01.8012',
      validationStatus: 'VALIDADO',
      confidenceScore: 100,
      notes: item.notes || `Importado de planilha (${item.year})`,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    if (isConsolidatedView && formatted.some(m => m.organizationId === selectedOrgId)) {
      window.alert(CONSOLIDATED_WRITE_MESSAGE);
      return;
    }

    // O estado local guarda apenas o órgão selecionado; os demais seguem só para o servidor
    setMeasurements(prev => {
      const merged = mergeMeasurements(prev, formatted.filter(m => m.organizationId === selectedOrgId));
      saveLocalData(measurementsCacheKey(selectedOrgId), merged);
      return merged;
    });

    // Synchronize directly with backend server for disk database persistence
    syncMeasurementsToServer(formatted, 'Carga em lote via planilha de série histórica');

    const auditEntry: AuditLog = {
      id: `audit-${Date.now()}`,
      organizationId: selectedOrgId,
      userId: 'usr-1',
      userName: 'Dr. Roberto Magalhães',
      action: 'IMPORTACAO',
      timestamp: new Date().toISOString(),
      entityType: 'MEASUREMENT',
      entityId: `batch-${Date.now()}`,
      newValue: `${formatted.length} medições da série histórica importadas e persistidas com sucesso`,
      reason: 'Carga em lote via arquivo de planilha de almoxarifado/faturamento.',
      source: 'Módulo de Importação de Planilhas'
    };
    setAuditLogs(prev => {
      const updated = [auditEntry, ...prev];
      saveLocalData(STORAGE_KEYS.AUDIT_LOGS, updated);
      return updated;
    });
  };

  // Upload and OCR document
  const handleUploadDocument = async (fileData: { fileName: string; fileType: any; textSnippet?: string }) => {
    if (!ensureCanEdit()) return;
    const extracted = extractDataFromDocument(fileData.fileName, fileData.textSnippet);

    const newDoc: PLSDocument = {
      id: `doc-${Date.now()}`,
      organizationId: selectedOrgId,
      title: extracted.supplier,
      fileName: fileData.fileName,
      fileType: fileData.fileType,
      competence: extracted.competence,
      indicatorId: extracted.detectedIndicatorId,
      processNumber: extracted.detectedProcessNumber,
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

    setDocuments(prev => [newDoc, ...prev]);

    // Also register an entry in measurements if valid
    const [y, m] = extracted.competence.split('-').map(Number);
    const newMeasurement: IndicatorMeasurement = {
      id: `m-${extracted.detectedIndicatorId}-${y}-${m}-${Date.now()}`,
      indicatorId: extracted.detectedIndicatorId,
      organizationId: selectedOrgId,
      year: y,
      month: m,
      value: extracted.consumptionValue,
      unit: extracted.consumptionUnit,
      sourceType: 'document_extraction',
      sourceReference: extracted.invoiceNumber,
      processNumber: extracted.detectedProcessNumber,
      sourceDocumentId: newDoc.id,
      validationStatus: extracted.requiresHumanReview ? 'PENDENTE' : 'VALIDADO',
      confidenceScore: extracted.confidenceScore,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setMeasurements(prev => {
      const idx = prev.findIndex(
        item => item.indicatorId === newMeasurement.indicatorId && item.year === y && item.month === m
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newMeasurement;
        return copy;
      }
      return [...prev, newMeasurement];
    });

    // Audit log
    const auditEntry: AuditLog = {
      id: `audit-${Date.now()}`,
      organizationId: selectedOrgId,
      userId: 'usr-3',
      userName: 'Eng. Carlos Mendonça',
      action: 'EXTRAÇÃO_OCR',
      timestamp: new Date().toISOString(),
      entityType: 'DOCUMENT',
      entityId: newDoc.id,
      newValue: `${newDoc.title} (${newDoc.consumption} ${newDoc.unit})`,
      reason: `Extração automática OCR do documento. Confiança: ${extracted.confidenceScore}%.`,
      source: 'Módulo de Gestão Documental'
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
  };

  // Validate document
  const handleValidateDocument = async (documentId: string, approvedValue?: number) => {
    if (!ensureCanEdit()) return;
    setDocuments(prev =>
      prev.map(d => {
        if (d.id === documentId) {
          return {
            ...d,
            status: 'PROCESSADO',
            validatedAt: new Date().toISOString(),
            validatedBy: 'usr-1',
            consumption: approvedValue !== undefined ? approvedValue : d.consumption
          };
        }
        return d;
      })
    );

    // Update associated measurement
    const doc = documents.find(d => d.id === documentId);
    if (doc && doc.indicatorId && doc.competence) {
      const [y, m] = doc.competence.split('-').map(Number);
      setMeasurements(prev =>
        prev.map(item => {
          if (item.indicatorId === doc.indicatorId && item.year === y && item.month === m) {
            return {
              ...item,
              validationStatus: 'VALIDADO',
              validatedBy: 'usr-1',
              validatedAt: new Date().toISOString(),
              value: approvedValue !== undefined ? approvedValue : item.value
            };
          }
          return item;
        })
      );
    }

    const auditEntry: AuditLog = {
      id: `audit-${Date.now()}`,
      organizationId: selectedOrgId,
      userId: 'usr-1',
      userName: 'Dr. Roberto Magalhães',
      action: 'VALIDACAO',
      timestamp: new Date().toISOString(),
      entityType: 'DOCUMENT',
      entityId: documentId,
      previousValue: 'Status: PENDENTE_VALIDACAO',
      newValue: 'Status: PROCESSADO (Atesto Homologado)',
      reason: 'Validação manual do atesto de conformidade aprovada pelo gestor.',
      source: 'Módulo de Gestão Documental'
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
  };

  // Save action plan item with API persistence and audit log
  const handleSaveActionPlan = async (action: Partial<ActionPlan>) => {
    if (!ensureCanEdit('manage')) return;
    // 1. Post to API
    try {
      await fetch('/api/action-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
    } catch (e) {
      console.warn('[iPLS] Offline fallback ao salvar plano de ação:', e);
    }

    // 2. Update local state
    let targetActionId = action.id;
    setActionPlans(prev => {
      const idx = prev.findIndex(a => a.id === action.id);
      let updated: ActionPlan[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = { ...updated[idx], ...action } as ActionPlan;
      } else {
        const newAct: ActionPlan = {
          ...action,
          id: action.id || `act-${Date.now()}`,
          organizationId: selectedOrgId
        } as ActionPlan;
        targetActionId = newAct.id;
        updated = [...prev, newAct];
      }
      saveLocalData(STORAGE_KEYS.ACTION_PLANS, updated);
      return updated;
    });

    // 3. Add to Audit Logs
    const auditEntry: AuditLog = {
      id: `audit-${Date.now()}`,
      organizationId: selectedOrgId,
      userId: 'usr-1',
      userName: 'Dr. Roberto Magalhães',
      action: action.id ? 'ALTERACAO' : 'CRIACAO',
      timestamp: new Date().toISOString(),
      entityType: 'ACTION_PLAN',
      entityId: targetActionId || `act-${Date.now()}`,
      newValue: `${action.title} (Progresso: ${action.percentageComplete}%, Status: ${action.status})`,
      reason: 'Atualização do Plano de Ação Socioambiental no sistema.',
      source: 'Módulo do Plano de Ação'
    };
    setAuditLogs(prev => {
      const updated = [auditEntry, ...prev];
      saveLocalData(STORAGE_KEYS.AUDIT_LOGS, updated);
      return updated;
    });
  };

  // Save or update PLS indicator target with API persistence and audit log
  const handleSaveTarget = async (targetData: Partial<IndicatorTarget>, reason?: string) => {
    if (!ensureCanEdit('manage')) return;
    const year = targetData.year || selectedYear;
    if (isConsolidatedView) {
      window.alert(CONSOLIDATED_WRITE_MESSAGE);
      return;
    }

    // 1. Post to API (a tela só é atualizada se o servidor confirmar a gravação)
    try {
      const res = await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: { ...targetData, year, organizationId: selectedOrgId },
          reason
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        window.alert(err.error || `Falha ao gravar a meta (HTTP ${res.status}).`);
        return;
      }
    } catch (e) {
      window.alert('Falha de conexão com o servidor. A meta não foi gravada.');
      return;
    }

    // 2. Update local state
    setTargets(prev => {
      const idx = prev.findIndex(t => t.indicatorId === targetData.indicatorId && t.year === year);
      let updated: IndicatorTarget[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = { ...updated[idx], ...targetData, year } as IndicatorTarget;
      } else {
        const ind = indicators.find(i => i.id === targetData.indicatorId);
        const newTarget: IndicatorTarget = {
          id: targetData.id || `target-${targetData.indicatorId}-${year}-${Date.now()}`,
          organizationId: selectedOrgId,
          indicatorId: targetData.indicatorId!,
          year,
          targetValue: Number(targetData.targetValue) || 0,
          targetUnit: targetData.targetUnit || ind?.unit || 'unidades',
          targetType: targetData.targetType || 'REDUCAO_PERCENTUAL',
          baselineValue: Number(targetData.baselineValue) || 0,
          baselineYear: targetData.baselineYear || 2025,
          reductionPercentage: targetData.reductionPercentage,
          notes: targetData.notes
        };
        updated = [...prev, newTarget];
      }
      saveLocalData(targetsCacheKey(selectedOrgId), updated);
      return updated;
    });

    // 3. Metas pertencem ao órgão; o indicador (catálogo global) não guarda meta própria

    // 4. Add to Audit Logs
    const ind = indicators.find(i => i.id === targetData.indicatorId);
    const auditEntry: AuditLog = {
      id: `audit-${Date.now()}`,
      organizationId: selectedOrgId,
      userId: 'usr-1',
      userName: 'Dr. Roberto Magalhães',
      action: 'ALTERACAO',
      timestamp: new Date().toISOString(),
      entityType: 'TARGET',
      entityId: targetData.id || `target-${targetData.indicatorId}`,
      indicatorCode: ind?.code,
      newValue: `Meta: ${targetData.targetValue} ${targetData.targetUnit || ind?.unit}, Baseline: ${targetData.baselineValue}`,
      reason: reason || 'Alteração manual de meta do PLS realizada no painel.',
      source: 'Módulo de Gestão de Metas'
    };
    setAuditLogs(prev => {
      const updated = [auditEntry, ...prev];
      saveLocalData(STORAGE_KEYS.AUDIT_LOGS, updated);
      return updated;
    });
  };

  // Delete PLS indicator target with API persistence and audit log
  const handleDeleteTarget = async (targetId: string, indicatorId: string, year: number, reason?: string) => {
    if (!ensureCanEdit('manage')) return;
    // 1. Call API
    try {
      await fetch(`/api/targets/${encodeURIComponent(targetId || 'by-indicator')}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indicatorId, year, reason, organizationId: selectedOrgId })
      });
    } catch (e) {
      console.warn('[iPLS] Offline fallback ao excluir meta:', e);
    }

    // 2. Remove from targets state & localStorage
    setTargets(prev => {
      const updated = prev.filter(t => {
        if (targetId && t.id === targetId) return false;
        if (t.indicatorId === indicatorId && t.year === year) return false;
        return true;
      });
      saveLocalData(targetsCacheKey(selectedOrgId), updated);
      return updated;
    });

    // 4. Record in Audit Logs
    const ind = indicators.find(i => i.id === indicatorId);
    const auditEntry: AuditLog = {
      id: `audit-${Date.now()}`,
      organizationId: selectedOrgId,
      userId: 'usr-1',
      userName: 'Dr. Roberto Magalhães',
      action: 'EXCLUSAO',
      timestamp: new Date().toISOString(),
      entityType: 'TARGET',
      entityId: targetId || `target-${indicatorId}`,
      indicatorCode: ind?.code,
      previousValue: `Meta do exercício ${year}`,
      reason: reason || 'Exclusão de meta do indicador homologada pelo gestor.',
      source: 'Módulo de Gestão de Metas'
    };
    setAuditLogs(prev => {
      const updated = [auditEntry, ...prev];
      saveLocalData(STORAGE_KEYS.AUDIT_LOGS, updated);
      return updated;
    });
  };

  const pendingValidationCount = measurements.filter(m => m.validationStatus === 'PENDENTE').length;
  const activeAlertsCount = alerts.filter(a => !a.resolved).length;

  const TAB_LABELS: Record<ActiveTab, string> = {
    dashboard: 'Painel Executivo',
    indicators: 'Indicadores PLS',
    targets: 'Metas & Projeções',
    'data-ingestion': 'Coleta de Dados',
    documents: 'Documentos & OCR',
    'action-plans': 'Plano de Ação',
    'year-comparison': 'Comparar Anos',
    chat: 'Chat IA & Apoio',
    reports: 'Relatório Anual Quinquenal',
    ghg: 'Inventário GEE',
    integrations: 'Integrações (SEI / CNJ)',
    audit: 'Auditoria & Qualidade',
    users: 'Usuários e Permissões'
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 font-sans text-slate-900">
      {/* Collapsible Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        organizations={organizations}
        selectedOrgId={selectedOrgId}
        setSelectedOrgId={setSelectedOrgId}
        authUser={authUser}
        canEdit={canEdit}
        onLogin={() => setIsLoginOpen(true)}
        showUsersTab={canManageUsers(authUser)}
        onLogout={async () => {
          await logout();
          setAuthUser(null);
          if (activeTab === 'users') setActiveTab('dashboard');
        }}
        activeAlertsCount={activeAlertsCount}
        pendingValidationCount={pendingValidationCount}
        selectedYear={selectedYear}
        setSelectedYear={handleSelectYear}
        selectedCycle={selectedCycle}
        setSelectedCycle={handleSelectCycle}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-6 lg:p-8 transition-all duration-300">
        {/* Sticky Top Control Bar (Allows hiding/showing sidebar to optimize data viewing area) */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-200 shadow-xs sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleSidebar}
              title={isSidebarCollapsed ? "Expandir barra lateral (Ctrl+B)" : "Ocultar barra lateral para maximizar área de dados (Ctrl+B)"}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all hover:scale-[1.02] ${
                isSidebarCollapsed
                  ? 'bg-slate-900 hover:bg-slate-800 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300/80'
              }`}
            >
              {isSidebarCollapsed ? (
                <>
                  <PanelLeftOpen className="w-4 h-4 text-emerald-400" />
                  <span>Mostrar Menu Lateral</span>
                </>
              ) : (
                <>
                  <PanelLeftClose className="w-4 h-4 text-emerald-600" />
                  <span>Ocultar Menu (Ampliar Visão)</span>
                </>
              )}
              <kbd className={`hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono rounded border ${
                isSidebarCollapsed ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-500 border-slate-200'
              }`}>
                Ctrl+B
              </kbd>
            </button>

            <div className="h-4 w-px bg-slate-200" />

            <div className="flex items-center gap-2 text-xs">
              <span className="font-extrabold text-emerald-600 tracking-tight text-sm">iPLS</span>
              <span className="text-slate-300">/</span>
              <span className="font-bold text-slate-800">{TAB_LABELS[activeTab] || activeTab}</span>
              {isSidebarCollapsed && (
                <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                  <Maximize2 className="w-3 h-3" />
                  Visão Expandida (100%)
                </span>
              )}
            </div>
          </div>

          {/* Quick Context, Import Spreadsheet Button & Year Switcher */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => ensureCanEdit() && setIsSpreadsheetImportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition-colors shadow-2xs"
              title="Importar planilha de dados da série histórica com persistência permanente"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Importar Planilha</span>
            </button>

            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-semibold text-slate-700">{currentOrg.acronym}</span>
            </div>

            {/* Seletor Oficial do Ciclo PLS (CNJ) */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1 hidden md:inline">Ciclo:</span>
              <select
                value={selectedCycle}
                onChange={(e) => handleSelectCycle(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 px-2.5 py-1 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer hover:border-emerald-300 transition-colors shadow-2xs"
                title="Selecione o Ciclo do PLS (Resolução CNJ nº 400/2021)"
              >
                {allCycles.map(c => (
                  <option key={c.cycle} value={c.cycle}>
                    {c.label} {c.status === 'VIGENTE' ? '• Vigente' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Anos do Ciclo Selecionado - Mostra SOMENTE os anos daquele ciclo */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider px-1.5 hidden lg:inline">
                Anos do {activeCycleInfo.cycleNumber}º Ciclo:
              </span>
              <div className="flex items-center gap-1">
                {currentCycleYears.map(y => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => handleSelectYear(y)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      selectedYear === y
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                    title={`Visualizar dados do exercício de ${y} (${activeCycleInfo.cycleNumber}º Ciclo ${activeCycleInfo.cycle})`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        {activeTab === 'dashboard' && (
          <DashboardView
            organization={currentOrg}
            idsComplements={idsComplements}
            organizationLabel={currentOrg ? `${currentOrg.acronym} — ${currentOrg.name}` : undefined}
            indicators={indicators}
            measurements={measurements}
            targets={targets}
            themes={themes}
            actionPlans={actionPlans}
            alerts={alerts}
            performances={indicatorPerformances}
            selectedYear={selectedYear}
            setSelectedYear={handleSelectYear}
            onOpenDataIngestion={handleOpenDataIngestion}
            onOpenSpreadsheetImport={() => { if (ensureCanEdit()) setIsSpreadsheetImportOpen(true); }}
            onOpenDocumentUpload={() => setActiveTab('documents')}
            onOpenChatWithQuery={handleOpenChatWithQuery}
            onSelectIndicator={setSelectedIndicatorForDetail}
            onOpenReplicateModal={() => { if (ensureCanEdit()) setIsReplicateModalOpen(true); }}
          />
        )}

        {activeTab === 'indicators' && (
          <IndicatorsView
            indicators={indicators}
            themes={themes}
            targets={targets}
            performances={indicatorPerformances}
            selectedYear={selectedYear}
            onSelectIndicator={setSelectedIndicatorForDetail}
            onOpenDataIngestion={handleOpenDataIngestion}
            onOpenChatWithQuery={handleOpenChatWithQuery}
            onEditIndicator={ind => { if (ensureCanEdit('admin')) setEditingIndicator(ind); }}
            onOpenReplicateModal={() => { if (ensureCanEdit()) setIsReplicateModalOpen(true); }}
          />
        )}

        {activeTab === 'targets' && (
          <TargetsView
            indicators={indicators}
            targets={targets}
            themes={themes}
            performances={indicatorPerformances}
            selectedYear={selectedYear}
            onSelectIndicator={setSelectedIndicatorForDetail}
            onOpenChatWithQuery={handleOpenChatWithQuery}
            onSaveTarget={handleSaveTarget}
            onDeleteTarget={handleDeleteTarget}
            initialEditingTarget={targetToEdit}
            onClearInitialEditingTarget={() => setTargetToEdit(null)}
          />
        )}

        {activeTab === 'data-ingestion' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Módulo de Coleta e Ingestão de Dados</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lance manualmente medições mensais ou faça upload de planilhas CSV/Excel estruturadas.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenDataIngestion()}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                >
                  + Lançamento Manual
                </button>
                <button
                  onClick={() => ensureCanEdit() && setIsSpreadsheetImportOpen(true)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200"
                >
                  Importar Planilha CSV
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Últimas Medições Registradas na Base</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Exercício/Mês</th>
                      <th className="py-2.5 px-3">Indicador</th>
                      <th className="py-2.5 px-3 text-right">Valor Medido</th>
                      <th className="py-2.5 px-3">Origem</th>
                      <th className="py-2.5 px-3">Processo SEI</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {measurements.slice(-15).reverse().map(m => {
                      const ind = indicators.find(i => i.id === m.indicatorId);
                      return (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-sans font-medium">{m.month}/{m.year}</td>
                          <td className="py-2 px-3 font-sans text-slate-900 font-semibold">{ind?.code} — {ind?.name}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">{m.value.toLocaleString('pt-BR')} {m.unit}</td>
                          <td className="py-2 px-3 font-sans capitalize text-slate-600">{m.sourceType}</td>
                          <td className="py-2 px-3 font-sans text-slate-500 truncate max-w-[140px]">{m.processNumber || '—'}</td>
                          <td className="py-2 px-3 text-center font-sans">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              m.validationStatus === 'VALIDADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {m.validationStatus}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-sans">
                            <button
                              onClick={() => handleOpenDataIngestion(m.indicatorId, m.month)}
                              className="text-indigo-600 hover:text-indigo-800 font-semibold text-[11px]"
                            >
                              Retificar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <DocumentsView
            documents={documents}
            indicators={indicators}
            onUploadDocument={handleUploadDocument}
            onValidateDocument={handleValidateDocument}
          />
        )}

        {activeTab === 'action-plans' && (
          <ActionPlanView
            actionPlans={actionPlans}
            indicators={indicators}
            selectedYear={selectedYear}
            onSaveAction={handleSaveActionPlan}
          />
        )}

        {activeTab === 'year-comparison' && (
          <YearComparisonView
            organization={currentOrg}
            idsComplements={idsComplements}
            indicators={indicators}
            measurements={measurements}
            themes={themes}
          />
        )}

        {activeTab === 'chat' && (
          <ChatView
            organizationName={currentOrg.name}
            organizationId={selectedOrgId}
            selectedYear={selectedYear}
            indicators={indicators}
            measurements={measurements}
            targets={targets}
            actionPlans={actionPlans}
            documents={documents}
            alerts={alerts}
            initialQuery={chatInitialQuery}
            onClearInitialQuery={() => setChatInitialQuery(undefined)}
          />
        )}

        {activeTab === 'reports' && (
          <AnnualReportView
            organizationName={currentOrg.name}
            selectedYear={selectedYear}
            indicators={indicators}
            measurements={measurements}
            targets={targets}
            themes={themes}
            actionPlans={actionPlans}
            performances={indicatorPerformances}
            onOpenSpreadsheetImport={() => { if (ensureCanEdit()) setIsSpreadsheetImportOpen(true); }}
          />
        )}

        {activeTab === 'ghg' && (
          <GHGInventoryView
            sources={emissionSources}
            calculations={ghgCalculations}
            selectedYear={selectedYear}
          />
        )}

        {activeTab === 'integrations' && (
          <IntegrationsView
            seiConnectors={seiConnectors}
            plsJudMappings={plsJudMappings}
            indicators={indicators}
            onSyncSEI={id => {
              setSeiConnectors(prev =>
                prev.map(c => c.id === id ? { ...c, status: 'SINCRONIZADO', lastSyncDate: new Date().toISOString() } : c)
              );
            }}
            onTransmitPLSJud={id => {
              setPlsJudMappings(prev =>
                prev.map(m => m.id === id ? { ...m, status: 'CONFIRMADO', lastTransmissionDate: new Date().toISOString().split('T')[0] } : m)
              );
            }}
          />
        )}

        {activeTab === 'users' && authUser && canManageUsers(authUser) && (
          <PermissionsView authUser={authUser} organizations={organizations} />
        )}

        {activeTab === 'audit' && (
          <AuditLogView
            auditLogs={auditLogs}
            alerts={alerts}
            indicators={indicators}
            measurements={measurements}
            onOpenDataIngestion={handleOpenDataIngestion}
            onOpenDocuments={() => setActiveTab('documents')}
          />
        )}
      </main>

      {/* Modals */}
      {selectedIndicatorForDetail && (
        <IndicatorDetailModal
          indicator={selectedIndicatorForDetail}
          target={targets.find(t => t.indicatorId === selectedIndicatorForDetail.id && t.year === selectedYear)}
          result={indicatorPerformances.find(p => p.indicator.id === selectedIndicatorForDetail.id)!.result}
          measurements={measurements}
          documents={documents}
          actionPlans={actionPlans}
          onClose={() => setSelectedIndicatorForDetail(null)}
          onOpenDataIngestion={handleOpenDataIngestion}
          onOpenChatWithQuery={handleOpenChatWithQuery}
          onEditIndicator={ind => { if (ensureCanEdit('admin')) setEditingIndicator(ind); }}
          onOpenEditTarget={(ind, tgt) => {
            setSelectedIndicatorForDetail(null);
            setTargetToEdit({ indicatorId: ind.id, target: tgt });
            setActiveTab('targets');
          }}
        />
      )}

      {editingIndicator && (
        <EditIndicatorModal
          indicator={editingIndicator}
          theme={themes.find(t => t.id === editingIndicator.themeId)}
          onClose={() => setEditingIndicator(null)}
          onSave={(updated, reason) => handleUpdateIndicator(updated, reason)}
        />
      )}

      {isDataIngestionOpen && (
        <DataIngestionModal
          indicators={indicators}
          measurements={measurements}
          preselectedIndicatorId={preselectedIndicatorId}
          preselectedMonth={preselectedMonth}
          selectedYear={selectedYear}
          onClose={() => setIsDataIngestionOpen(false)}
          onSave={handleSaveMeasurement}
        />
      )}

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoggedIn={u => {
          setAuthUser(u);
          setIsLoginOpen(false);
          if (u.organizationId && (u.role === 'MASTER' || u.role === 'PREENCHEDOR')) setSelectedOrgId(u.organizationId);
        }}
      />

      {isSpreadsheetImportOpen && (
        <SpreadsheetImportModal
          indicators={indicators}
          selectedYear={selectedYear}
          selectedOrgId={selectedOrgId}
          onClose={() => setIsSpreadsheetImportOpen(false)}
          onImportBatch={handleImportBatch}
        />
      )}

      {isReplicateModalOpen && (
        <ReplicateGeneralVariablesModal
          isOpen={isReplicateModalOpen}
          onClose={() => setIsReplicateModalOpen(false)}
          targetYear={selectedYear}
          availableYears={availableSystemYears}
          measurements={measurements}
          indicators={indicators}
          onConfirmReplication={handleConfirmReplication}
        />
      )}
    </div>
  );
}

export default App;
