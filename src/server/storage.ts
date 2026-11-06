import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PgStore } from './pgStore';
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
  InconsistencyAlert,
  IDSComplement
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
  idsComplements: IDSComplement[];
  lastSavedAt: string;
}

/** Normaliza uma base parcial (coleções ausentes recebem o seed; Tema 1 é sempre ANUAL). */
function normalizeDatabase(parsed: Partial<AppDatabase>): { db: AppDatabase; wasFixed: boolean } {
  let wasFixed = false;
  const indicators = (parsed.indicators || [...INITIAL_INDICATORS]).map(ind => {
    if (ind.themeId === 'theme-1' && ind.periodicity !== 'ANUAL') {
      wasFixed = true;
      return { ...ind, periodicity: 'ANUAL' as const };
    }
    return ind;
  });
  const db: AppDatabase = {
    organizations: parsed.organizations || [...INITIAL_ORGANIZATIONS],
    users: parsed.users || [...INITIAL_USERS],
    plsCycles: parsed.plsCycles || [...INITIAL_PLS_CYCLES],
    themes: parsed.themes || [...INITIAL_THEMES],
    indicators,
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
    idsComplements: parsed.idsComplements || [],
    lastSavedAt: parsed.lastSavedAt || new Date().toISOString()
  };
  return { db, wasFixed };
}

/** Lê data/database.json (ou o seed padrão, se o arquivo não existir). */
export function readJsonDatabase(): { db: AppDatabase; fromFile: boolean; wasFixed: boolean } {
  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) as Partial<AppDatabase>;
      return { ...normalizeDatabase(parsed), fromFile: true };
    }
  } catch (err) {
    console.warn('[StorageEngine] Erro ao ler data/database.json; usando seed padrão:', err);
  }
  return { ...normalizeDatabase({}), fromFile: false };
}

/**
 * Armazenamento do iPLS.
 * - Com DATABASE_URL: PostgreSQL (schema "ipls"), gravando só as diferenças em transação.
 * - Sem DATABASE_URL: arquivo data/database.json (modo autônomo/desenvolvimento).
 */
class StorageEngine {
  private db: AppDatabase | null = null;
  private pg: PgStore | null = null;
  private saveTimeout: NodeJS.Timeout | null = null;
  private saveChain: Promise<void> = Promise.resolve();
  public backend: 'json' | 'postgres' = 'json';

  /** Deve ser chamado (e aguardado) antes de criar as rotas da API. */
  async init(): Promise<void> {
    const url = process.env.DATABASE_URL;
    if (!url) {
      const { db, fromFile, wasFixed } = readJsonDatabase();
      this.db = db;
      console.log(`[StorageEngine] Modo arquivo: data/database.json (${db.measurements.length} medições).`);
      if (!fromFile || wasFixed) this.persistJson(db);
      return;
    }

    this.backend = 'postgres';
    this.pg = new PgStore(url);
    await this.pg.migrate();
    if (await this.pg.isEmpty()) {
      const { db, fromFile } = readJsonDatabase();
      await this.pg.persist(db, { replaceAll: true });
      console.log(
        `[StorageEngine] PostgreSQL vazio: base inicial importada de ${fromFile ? 'data/database.json' : 'seed padrão'} ` +
        `(${db.measurements.length} medições).`
      );
    }
    const { db, wasFixed } = normalizeDatabase(await this.pg.load());
    this.db = db;
    if (wasFixed) await this.saveNow();
    console.log(`[StorageEngine] Modo PostgreSQL: ${db.organizations.length} órgãos, ${db.measurements.length} medições.`);
  }

  private persistJson(dbState: AppDatabase) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      dbState.lastSavedAt = new Date().toISOString();
      fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf-8');
      console.log(`[StorageEngine] Base persistida no disco com sucesso (${dbState.measurements.length} medições).`);
    } catch (e) {
      console.error('[StorageEngine] Falha ao persistir no disco:', e);
      throw e;
    }
  }

  /** Grava em segundo plano após 400 ms sem novas alterações. */
  public scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      this.saveNow().catch(err => console.error('[StorageEngine] Falha na gravação agendada:', err));
    }, 400);
  }

  public getDatabase(): AppDatabase {
    if (!this.db) throw new Error('StorageEngine não inicializado: chame storage.init() antes.');
    return this.db;
  }

  /**
   * Grava imediatamente. As gravações são enfileiradas (nunca concorrentes);
   * a promessa só resolve depois do COMMIT no PostgreSQL ou da escrita do arquivo.
   */
  public saveNow(): Promise<void> {
    const run = async () => {
      const db = this.getDatabase();
      db.lastSavedAt = new Date().toISOString();
      if (this.pg) {
        const r = await this.pg.persist(db);
        if (r.upserted || r.deleted) {
          console.log(`[StorageEngine] PostgreSQL: ${r.upserted} gravado(s), ${r.deleted} excluído(s).`);
        }
      } else {
        this.persistJson(db);
      }
    };
    const next = this.saveChain.then(run, run);
    this.saveChain = next.catch(() => undefined);
    return next;
  }
}

export const storage = new StorageEngine();
