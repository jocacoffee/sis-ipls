import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Organization,
  User,
  PLSCycle,
  PLSTheme,
  Indicator,
  IndicatorTarget,
  IndicatorMeasurement,
  PLSDocument,
  ActionPlan,
  EmissionSource,
  GHGCalculation,
  PLSJudMapping,
  SEIConnector,
  AuditLog,
  InconsistencyAlert
} from '../types';
import {
  INITIAL_ORGANIZATIONS,
  INITIAL_USERS,
  INITIAL_PLS_CYCLES,
  INITIAL_THEMES,
  INITIAL_INDICATORS,
  INITIAL_TARGETS,
  INITIAL_MEASUREMENTS,
  INITIAL_DOCUMENTS,
  INITIAL_ACTION_PLANS,
  INITIAL_EMISSION_SOURCES,
  INITIAL_GHG_CALCULATIONS,
  INITIAL_PLS_JUD_MAPPINGS,
  INITIAL_SEI_CONNECTORS,
  INITIAL_AUDIT_LOGS,
  INITIAL_ALERTS
} from '../data/seedData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');

export interface AppDatabase {
  organizations: Organization[];
  users: User[];
  plsCycles: PLSCycle[];
  themes: PLSTheme[];
  indicators: Indicator[];
  targets: IndicatorTarget[];
  measurements: IndicatorMeasurement[];
  documents: PLSDocument[];
  actionPlans: ActionPlan[];
  emissionSources: EmissionSource[];
  ghgCalculations: GHGCalculation[];
  plsJudMappings: PLSJudMapping[];
  seiConnectors: SEIConnector[];
  auditLogs: AuditLog[];
  alerts: InconsistencyAlert[];
  lastSavedAt: string;
}

class StorageEngine {
  private db: AppDatabase;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.db = this.loadInitial();
  }

  private loadInitial(): AppDatabase {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<AppDatabase>;
        console.log(`[StorageEngine] Base de dados carregada do disco (${parsed.measurements?.length || 0} medições).`);
        return {
          organizations: parsed.organizations || [...INITIAL_ORGANIZATIONS],
          users: parsed.users || [...INITIAL_USERS],
          plsCycles: parsed.plsCycles || [...INITIAL_PLS_CYCLES],
          themes: parsed.themes || [...INITIAL_THEMES],
          indicators: parsed.indicators || [...INITIAL_INDICATORS],
          targets: parsed.targets || [...INITIAL_TARGETS],
          measurements: parsed.measurements || [...INITIAL_MEASUREMENTS],
          documents: parsed.documents || [...INITIAL_DOCUMENTS],
          actionPlans: parsed.actionPlans || [...INITIAL_ACTION_PLANS],
          emissionSources: parsed.emissionSources || [...INITIAL_EMISSION_SOURCES],
          ghgCalculations: parsed.ghgCalculations || [...INITIAL_GHG_CALCULATIONS],
          plsJudMappings: parsed.plsJudMappings || [...INITIAL_PLS_JUD_MAPPINGS],
          seiConnectors: parsed.seiConnectors || [...INITIAL_SEI_CONNECTORS],
          auditLogs: parsed.auditLogs || [...INITIAL_AUDIT_LOGS],
          alerts: parsed.alerts || [...INITIAL_ALERTS],
          lastSavedAt: parsed.lastSavedAt || new Date().toISOString()
        };
      }
    } catch (err) {
      console.warn('[StorageEngine] Erro ao ler base existente; inicializando com seed padrão:', err);
    }

    // Default Seed
    const initialDb: AppDatabase = {
      organizations: [...INITIAL_ORGANIZATIONS],
      users: [...INITIAL_USERS],
      plsCycles: [...INITIAL_PLS_CYCLES],
      themes: [...INITIAL_THEMES],
      indicators: [...INITIAL_INDICATORS],
      targets: [...INITIAL_TARGETS],
      measurements: [...INITIAL_MEASUREMENTS],
      documents: [...INITIAL_DOCUMENTS],
      actionPlans: [...INITIAL_ACTION_PLANS],
      emissionSources: [...INITIAL_EMISSION_SOURCES],
      ghgCalculations: [...INITIAL_GHG_CALCULATIONS],
      plsJudMappings: [...INITIAL_PLS_JUD_MAPPINGS],
      seiConnectors: [...INITIAL_SEI_CONNECTORS],
      auditLogs: [...INITIAL_AUDIT_LOGS],
      alerts: [...INITIAL_ALERTS],
      lastSavedAt: new Date().toISOString()
    };

    this.persistSync(initialDb);
    return initialDb;
  }

  private persistSync(dbState: AppDatabase) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      dbState.lastSavedAt = new Date().toISOString();
      fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf-8');
      console.log(`[StorageEngine] Base persistida no disco com sucesso (${dbState.measurements.length} medições).`);
    } catch (e) {
      console.error('[StorageEngine] Falha ao persistir no disco:', e);
    }
  }

  public scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.persistSync(this.db);
      this.saveTimeout = null;
    }, 400);
  }

  public getDatabase(): AppDatabase {
    return this.db;
  }

  public saveNow() {
    this.persistSync(this.db);
  }
}

export const storage = new StorageEngine();
