export type OrganizationType = 'SECAO_JUDICIARIA' | 'TRIBUNAL' | 'CONSELHO';

export interface Organization {
  id: string;
  name: string;
  acronym: string;
  type: OrganizationType;
  parentOrganizationId?: string;
  active: boolean;
  uf: string;
  totalFloorAreaM2: number;
  totalMagistratesStaff: number;
}

export type UserRole = 
  | 'ADMIN' 
  | 'GESTOR_PLS' 
  | 'RESPONSAVEL_INDICADOR' 
  | 'CONSULTOR' 
  | 'AUDITOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
  avatarUrl?: string;
}

export interface PLSCycle {
  id: string;
  organizationId: string;
  title: string;
  cycle: string;
  startDate: string;
  endDate: string;
  status: 'VIGENTE' | 'ENCERRADO' | 'EM_REVISAO';
  normativeBase: string[];
}

export interface PLSTheme {
  id: string;
  code: string;
  name: string;
  icon: string;
  description: string;
  cnjCategory: string;
  displayOrder: number;
}

export type TargetType = 
  | 'REDUCAO_PERCENTUAL' 
  | 'AUMENTO_PERCENTUAL' 
  | 'LIMITE_MAXIMO' 
  | 'LIMITE_MINIMO' 
  | 'ABSOLUTA' 
  | 'FAIXA_ACEITAVEL';

export type TargetDirection = 'MENOR_MELHOR' | 'MAIOR_MELHOR';

export type IndicatorPeriodicity = 'MENSAL' | 'ANUAL';

export type IndicatorDataType = 
  | 'QUANTIDADE' 
  | 'VALOR_MONETARIO' 
  | 'PERCENTUAL' 
  | 'INDICE' 
  | 'BOOLEAN' 
  | 'TEXTO';

export type IndicatorType = 'INPUT' | 'CALCULATED' | 'EXTERNAL';

export type IndicatorCategory = 'OFICIAL_CNJ' | 'INSTITUCIONAL';

export interface Indicator {
  id: string; // Identificador técnico único (ex: "indicator-6-1")
  organizationId: string;
  code: string; // Código normativo oficial do Anexo da Res. CNJ 400 (ex: "6.1")
  acronym?: string; // Sigla oficial (ex: "CEE", "CA", "MagP", "TMR")
  name: string; // Nome oficial (ex: "Consumo de energia elétrica")
  description: string;
  themeId: string;
  unit: string;
  periodicity: IndicatorPeriodicity;
  dataType: IndicatorDataType;
  indicatorType: IndicatorType;
  category: IndicatorCategory;
  formula?: string;
  formulaDescription?: string;
  dependencies?: string[]; // Códigos dos indicadores dependentes (ex: ["6.1", "1.17"])
  targetType?: TargetType;
  targetDirection?: TargetDirection;
  cnjIndicatorCode?: string; // Alias para compatibilidade com conectores
  requiresPlsJudInput: boolean;
  automaticCalculation: boolean;
  active: boolean;
  startValidity: string;
  endValidity?: string;
  normativeReference?: string;
  normativeVersion?: string;
  responsibleUnit?: string;
  defaultMonthlyTarget?: number;
  targetValue2026?: number;
  baselineYear?: number;
  baselineValue?: number;
}

export type TargetCriticality = 'CRITICA' | 'NAO_CRITICA';
export type TargetCapability = 'CONSERVADORA' | 'MODERADA' | 'DESAFIADORA';

export interface IndicatorTarget {
  id: string;
  organizationId: string;
  indicatorId: string;
  year: number;
  targetValue: number;
  targetUnit: string;
  targetType: TargetType;
  baselineValue: number;
  baselineYear: number;
  reductionPercentage?: number;
  notes?: string;
  plsMetaNumber?: number;
  criticality?: TargetCriticality;
  capability?: TargetCapability;
  longTermTarget?: string;
  responsibleGroup?: string;
  responsibleUnit?: string;
  referenceYear?: number;
  referenceValue?: number;
  formula?: string;
  normativeUpdateNotes?: string;
}

export type SourceType = 
  | 'manual' 
  | 'spreadsheet' 
  | 'API' 
  | 'SEI' 
  | 'document_extraction' 
  | 'imported' 
  | 'calculated';

export type ValidationStatus = 'VALIDADO' | 'PENDENTE' | 'REJEITADO';

export interface IndicatorMeasurement {
  id: string;
  indicatorId: string;
  organizationId: string;
  year: number;
  month: number; // 1-12
  value: number;
  unit: string;
  sourceType: SourceType;
  sourceDocumentId?: string;
  sourceReference?: string;
  processNumber?: string;
  extractionMethod?: string;
  validationStatus: ValidationStatus;
  validatedBy?: string;
  validatedAt?: string;
  confidenceScore?: number; // 0-100
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentType = 
  | 'FATURA' 
  | 'NOTA_FISCAL' 
  | 'ATESTO' 
  | 'CONTRATO' 
  | 'RELATORIO' 
  | 'NORMATIVO' 
  | 'PROCESSO_SEI';

export interface PLSDocument {
  id: string;
  organizationId: string;
  title: string;
  fileName: string;
  fileType: DocumentType;
  competence?: string; // YYYY-MM
  indicatorId?: string;
  processNumber?: string;
  supplier?: string;
  amount?: number;
  consumption?: number;
  unit?: string;
  status: 'PROCESSADO' | 'PENDENTE_VALIDACAO' | 'ERRO';
  extractionConfidence: number; // 0-100
  relatedDocumentIds?: string[];
  fileSize: string;
  uploadedAt: string;
  validatedAt?: string;
  validatedBy?: string;
  rawTextSnippet?: string;
  ocrConfidence?: number;
}

export type ActionStatus = 'NAO_INICIADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'ATRASADA' | 'SUSPENSA';
export type PriorityLevel = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export interface ActionPlan {
  id: string;
  organizationId: string;
  year: number;
  title: string;
  description: string;
  responsibleUnit: string;
  responsibleUser: string;
  startDate: string;
  endDate: string;
  status: ActionStatus;
  percentageComplete: number;
  priority: PriorityLevel;
  relatedIndicatorIds: string[];
  expectedImpact: string;
  evidenceNotes?: string;
  actionType?: 'PROJETO' | 'ACAO_CONTINUA' | 'ACAO';
  grupoExecutivo?: string;
  eixoTematico?: string;
  normativeReference?: string;
  inconsistencyNote?: string;
  etapas?: string[];
  odsAssociated?: number[];
  statusHistory?: { date: string; note: string; status: ActionStatus }[];
}

export interface NormativeInconsistency {
  id: string;
  theme: string;
  indicatorCode?: string;
  originalTextPLS: string;
  normativeConflict: string;
  lawOrResolution: string;
  severity: 'ALTA' | 'MEDIA' | 'CRITICA';
  systemAdjustment: string;
  status: 'ATUALIZADO' | 'CONFORME';
}

export type IndicatorStatus = 
  | 'EM_CONFORMIDADE' 
  | 'ATENCAO' 
  | 'RISCO' 
  | 'META_ATINGIDA' 
  | 'SEM_DADOS' 
  | 'EM_VALIDACAO';

export interface IndicatorCalculationResult {
  indicatorId: string;
  year: number;
  monthsReported: number;
  accumulatedValue: number;
  monthlyAverage: number;
  baselineValue: number;
  targetValue: number;
  annualProjection: number;
  fulfillmentPercentage: number;
  distanceToTarget: number;
  requiredMonthlyRunRate: number;
  status: IndicatorStatus;
  statusReason: string;
  yoyVariationPercent?: number; // Accumulated vs same period last year
  yoyAbsoluteVariation?: number;
  monthlyValues: (number | null)[]; // 12 elements
}

export interface InconsistencyAlert {
  id: string;
  indicatorId: string;
  indicatorName: string;
  month: number;
  year: number;
  type: 'SPIKE' | 'MISSING' | 'NEGATIVE' | 'UNIT_MISMATCH' | 'UNVALIDATED_DOC';
  severity: 'CRITICA' | 'ATENCAO' | 'INFO';
  message: string;
  detectedValue: number | string;
  referenceValue?: number | string;
  suggestedAction: string;
  createdAt: string;
  resolved: boolean;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  userId: string;
  userName: string;
  action: 'CRIACAO' | 'ALTERACAO' | 'EXCLUSAO' | 'VALIDACAO' | 'IMPORTACAO' | 'EXTRAÇÃO_OCR';
  timestamp: string;
  entityType: 'MEASUREMENT' | 'INDICATOR' | 'TARGET' | 'DOCUMENT' | 'ACTION_PLAN' | 'GHG';
  entityId: string;
  indicatorCode?: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  source: string;
}

export interface EmissionSource {
  id: string;
  scope: 1 | 2 | 3;
  name: string;
  category: string;
  activityUnit: string;
  emissionFactor: number; // kg CO2e per unit
  factorSource: string;
  factorYear: number;
}

export interface GHGCalculation {
  id: string;
  organizationId: string;
  year: number;
  sourceId: string;
  sourceName: string;
  scope: 1 | 2 | 3;
  activityData: number;
  activityUnit: string;
  emissionFactor: number;
  factorSource: string;
  calculatedCO2eTons: number;
  evidenceDocumentId?: string;
}

export interface PLSJudMapping {
  id: string;
  indicatorId: string;
  indicatorName: string;
  cnjCode: string;
  cnjFieldName: string;
  unit: string;
  periodicity: string;
  sendRule: string;
  status: 'NAO_ENVIADO' | 'PREPARADO' | 'AGUARDANDO_VALIDACAO' | 'ENVIADO' | 'CONFIRMADO' | 'ERRO' | 'RETIFICACAO';
  lastTransmissionDate?: string;
  receiptProtocol?: string;
}

export interface SEIConnector {
  id: string;
  processNumber: string;
  description: string;
  expectedDocumentType: DocumentType;
  periodicity: IndicatorPeriodicity;
  indicatorId: string;
  indicatorName: string;
  active: boolean;
  lastSyncDate?: string;
  lastFoundDocNumber?: string;
  status: 'ATIVO' | 'SINCRONIZADO' | 'PENDENTE';
}

export interface RAGDocumentChunk {
  id: string;
  documentTitle: string;
  documentType: DocumentType;
  organizationId: string;
  year: number;
  themeCode?: string;
  indicatorCode?: string;
  section: string;
  content: string;
  sourceReference: string;
  metadata: Record<string, string | number>;
}

export type AIProviderMode = 'gemini' | 'local' | 'heuristic';

export interface LocalAIConfig {
  endpoint: string;
  model: string;
  apiKey?: string;
  temperature?: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  sources?: {
    title: string;
    reference: string;
    type: 'DADO_ESTRUTURADO' | 'DOCUMENTO' | 'NORMATIVA' | 'PROCESSO_SEI';
    details?: string;
  }[];
  indicatorsMentioned?: string[];
  suggestedQuestions?: string[];
  isProjection?: boolean;
  providerUsed?: AIProviderMode;
  modelUsed?: string;
}

export interface HistoricalYearData {
  year: number;
  total: number;
  monthlyAverage?: number;
  perCapita?: number;
  perSquareMeter?: number;
  target?: number;
  monthsReported: number;
  isProjected?: boolean;
}

export interface FiveYearIndicatorSeries {
  indicatorId: string;
  code: string;
  name: string;
  acronym?: string;
  unit: string;
  themeId: string;
  themeName: string;
  years: Record<number, HistoricalYearData>;
  fiveYearChangePct: number; // 2026 vs 2022
  yoyChangePct: number; // 2026 vs 2025
  direction: 'MELHORA' | 'PIORA' | 'ESTAVEL';
  target2026?: number;
  baseline?: { year: number; value: number };
}

export interface AnnualReportSection {
  id: number;
  title: string;
  content: string;
  category?: 'INSTITUCIONAL' | 'METODOLOGIA' | 'DESEMPENHO' | 'HISTORICO' | 'PLANO_ACAO' | 'DESCARBONIZACAO' | 'CONCLUSAO';
  isAiGenerated?: boolean;
  statusBadge?: string;
}

export interface AnnualReportAIData {
  sections: AnnualReportSection[];
  executiveSummary: string;
  keyAchievements: string[];
  criticalAlerts: string[];
  priorityRecommendations: string[];
  historicalHighlights: string[];
  generatedAt: string;
  aiModel: string;
  fiveYearComparisons?: FiveYearIndicatorSeries[];
}
