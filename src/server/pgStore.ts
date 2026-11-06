/**
 * Persistência do iPLS em PostgreSQL.
 *
 * A aplicação continua trabalhando com o modelo em memória (AppDatabase). Este
 * módulo carrega o banco na inicialização e, a cada gravação, envia ao
 * PostgreSQL apenas o que mudou (inclusões, alterações e exclusões), numa única
 * transação. Se a transação falhar, nada é gravado e a próxima gravação tenta
 * de novo a partir do último estado confirmado.
 */
import pg from 'pg';
import { PG_SCHEMA_SQL, PG_SCHEMA_VERSION } from './pgSchema';
import type { AppDatabase } from './storage';

type Row = Record<string, unknown>;
type ColType = 'text' | 'integer' | 'numeric' | 'boolean' | 'date' | 'timestamptz' | 'jsonb';

interface TableSpec {
  table: string;
  /** Lê os registros da coleção correspondente. */
  rows: (db: AppDatabase) => { key: string; obj: any; extra?: Row }[];
  columns: [string, ColType, (obj: any, extra?: Row) => unknown][];
  /** Ordem de carga. */
  orderBy: string;
}

const RECORD_COLLECTIONS = [
  'users', 'plsCycles', 'documents', 'actionPlans', 'emissionSources',
  'ghgCalculations', 'plsJudMappings', 'seiConnectors'
] as const;
type RecordCollection = (typeof RECORD_COLLECTIONS)[number];

const num = (v: unknown) => (v === undefined || v === null || v === '' ? null : Number(v));

/** Tabelas em ordem de dependência (pais antes dos filhos). */
const TABLES: TableSpec[] = [
  {
    table: 'organizations',
    rows: db => db.organizations.map(o => ({ key: o.id, obj: o })),
    columns: [
      ['name', 'text', o => o.name],
      ['acronym', 'text', o => o.acronym],
      ['type', 'text', o => o.type],
      ['parent_id', 'text', o => o.parentOrganizationId ?? null],
      ['active', 'boolean', o => o.active !== false],
      ['uf', 'text', o => o.uf ?? null],
      ['is_consolidated', 'boolean', o => !!o.isConsolidated],
      ['jurisdiction_area_km2', 'numeric', o => num(o.jurisdictionAreaKm2)]
    ],
    orderBy: 'position, id'
  },
  {
    table: 'themes',
    rows: db => db.themes.map(t => ({ key: t.id, obj: t })),
    columns: [
      ['code', 'text', t => t.code],
      ['name', 'text', t => t.name]
    ],
    orderBy: 'position, id'
  },
  {
    table: 'indicators',
    rows: db => db.indicators.map(i => ({ key: i.id, obj: i })),
    columns: [
      ['code', 'text', i => i.code],
      ['acronym', 'text', i => i.acronym ?? null],
      ['name', 'text', i => i.name],
      ['theme_id', 'text', i => i.themeId],
      ['unit', 'text', i => i.unit],
      ['periodicity', 'text', i => i.periodicity],
      ['data_type', 'text', i => i.dataType],
      ['consolidation', 'text', i => i.consolidation ?? null],
      ['active', 'boolean', i => i.active !== false]
    ],
    orderBy: 'position, id'
  },
  {
    table: 'measurements',
    rows: db => db.measurements.map(m => ({ key: m.id, obj: m })),
    columns: [
      ['organization_id', 'text', m => m.organizationId || 'org-sjrr'],
      ['indicator_id', 'text', m => m.indicatorId],
      ['year', 'integer', m => m.year],
      ['month', 'integer', m => m.month],
      ['value', 'numeric', m => m.value],
      ['unit', 'text', m => m.unit ?? null],
      ['source_type', 'text', m => m.sourceType ?? null],
      ['validation_status', 'text', m => m.validationStatus ?? null]
    ],
    orderBy: 'position, id'
  },
  {
    table: 'targets',
    rows: db => db.targets.map(t => ({ key: t.id, obj: t })),
    columns: [
      ['organization_id', 'text', t => t.organizationId || 'org-sjrr'],
      ['indicator_id', 'text', t => t.indicatorId],
      ['year', 'integer', t => t.year],
      ['target_value', 'numeric', t => t.targetValue]
    ],
    orderBy: 'position, id'
  },
  {
    table: 'ids_complements',
    rows: db =>
      (db.idsComplements || []).map(c => ({ key: `${c.organizationId}__${c.year}__${c.field}`, obj: c })),
    columns: [
      ['organization_id', 'text', c => c.organizationId],
      ['year', 'integer', c => c.year],
      ['field', 'text', c => c.field],
      ['value', 'numeric', c => c.value]
    ],
    orderBy: 'position, id'
  },
  {
    table: 'user_permissions',
    rows: db => (db.userPermissions || []).map(p => ({ key: p.username, obj: p })),
    columns: [
      ['role', 'text', p => p.role],
      ['organization_id', 'text', p => p.organizationId ?? null],
      ['expires_at', 'date', p => p.expiresAt ?? null],
      ['granted_by', 'text', p => p.grantedBy]
    ],
    orderBy: 'position, id'
  },
  {
    table: 'alerts',
    rows: db => db.alerts.map(a => ({ key: a.id, obj: a })),
    columns: [
      ['organization_id', 'text', a => a.organizationId ?? null],
      ['indicator_id', 'text', a => a.indicatorId ?? null],
      ['year', 'integer', a => a.year ?? null],
      ['month', 'integer', a => a.month ?? null],
      ['type', 'text', a => a.type ?? null],
      ['severity', 'text', a => a.severity ?? null],
      ['resolved', 'boolean', a => !!a.resolved]
    ],
    orderBy: 'position, id'
  },
  {
    table: 'audit_logs',
    rows: db => db.auditLogs.map(a => ({ key: a.id, obj: a })),
    columns: [
      ['organization_id', 'text', a => a.organizationId ?? null],
      ['logged_at', 'timestamptz', a => a.timestamp ?? null],
      ['action', 'text', a => a.action ?? null],
      ['entity_type', 'text', a => a.entityType ?? null],
      ['entity_id', 'text', a => a.entityId ?? null]
    ],
    orderBy: 'logged_at DESC NULLS LAST, id'
  },
  {
    table: 'app_records',
    rows: db =>
      RECORD_COLLECTIONS.flatMap(col =>
        ((db as any)[col] as any[] || []).map(r => ({ key: `${col}:${r.id}`, obj: r, extra: { collection: col } }))
      ),
    columns: [
      ['collection', 'text', (_r, extra) => extra?.collection],
      ['record_id', 'text', r => String(r.id)],
      ['organization_id', 'text', r => r.organizationId ?? null]
    ],
    orderBy: 'collection, position, id'
  }
];

const BATCH = 2000;

export class PgStore {
  private pool: pg.Pool;
  /** Último estado confirmado no banco: tabela → (id → JSON). */
  private snapshot = new Map<string, Map<string, string>>();

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString, max: 5 });
  }

  async migrate(): Promise<void> {
    await this.pool.query(PG_SCHEMA_SQL);
    await this.pool.query(
      `INSERT INTO ipls.meta (key, value) VALUES ('schema_version', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [String(PG_SCHEMA_VERSION)]
    );
  }

  async isEmpty(): Promise<boolean> {
    const r = await this.pool.query('SELECT (SELECT count(*) FROM ipls.organizations) + (SELECT count(*) FROM ipls.indicators) AS n');
    return Number(r.rows[0].n) === 0;
  }

  /** Carrega todo o banco para o modelo em memória. */
  async load(): Promise<AppDatabase> {
    const out: any = {};
    for (const spec of TABLES) {
      const r = await this.pool.query(`SELECT id, data${spec.table === 'app_records' ? ', collection' : ''} FROM ipls.${spec.table} ORDER BY ${spec.orderBy}`);
      const snap = new Map<string, string>();
      if (spec.table === 'app_records') {
        RECORD_COLLECTIONS.forEach(c => (out[c] = []));
        for (const row of r.rows) {
          (out[row.collection as RecordCollection] ||= []).push(row.data);
          snap.set(row.id, JSON.stringify(row.data));
        }
      } else {
        const key = TABLE_TO_COLLECTION[spec.table];
        out[key] = r.rows.map(row => {
          snap.set(row.id, JSON.stringify(row.data));
          return row.data;
        });
      }
      this.snapshot.set(spec.table, snap);
    }
    const meta = await this.pool.query(`SELECT value FROM ipls.meta WHERE key = 'last_saved_at'`);
    out.lastSavedAt = meta.rows[0]?.value || new Date().toISOString();
    return out as AppDatabase;
  }

  /**
   * Grava as diferenças em relação ao último estado confirmado.
   * Com `replaceAll`, apaga tudo e regrava (usado na importação inicial).
   */
  async persist(db: AppDatabase, opts: { replaceAll?: boolean } = {}): Promise<{ upserted: number; deleted: number }> {
    const plans = TABLES.map(spec => {
      const prev = opts.replaceAll ? new Map<string, string>() : this.snapshot.get(spec.table) || new Map();
      const next = new Map<string, string>();
      const changed: Row[] = [];
      spec.rows(db).forEach(({ key, obj, extra }, position) => {
        const json = JSON.stringify(obj);
        if (next.has(key)) throw new Error(`Chave duplicada em ${spec.table}: ${key}`);
        next.set(key, json);
        if (prev.get(key) !== json) {
          const row: Row = { id: key, position, data: obj };
          for (const [col, , get] of spec.columns) row[col] = get(obj, extra);
          changed.push(row);
        }
      });
      const removed = [...prev.keys()].filter(k => !next.has(k));
      return { spec, next, changed, removed };
    });

    const client = await this.pool.connect();
    let upserted = 0;
    let deleted = 0;
    try {
      await client.query('BEGIN');
      if (opts.replaceAll) {
        await client.query(`TRUNCATE ${[...TABLES].reverse().map(t => `ipls.${t.table}`).join(', ')}`);
      }
      // Exclusões: filhos antes dos pais
      for (const p of [...plans].reverse()) {
        for (let i = 0; i < p.removed.length; i += BATCH) {
          const ids = p.removed.slice(i, i + BATCH);
          const r = await client.query(`DELETE FROM ipls.${p.spec.table} WHERE id = ANY($1::text[])`, [ids]);
          deleted += r.rowCount || 0;
        }
      }
      // Inclusões/alterações: pais antes dos filhos
      for (const p of plans) {
        if (!p.changed.length) continue;
        const cols = ['id', ...p.spec.columns.map(c => c[0]), 'position', 'data'];
        const types: Record<string, ColType> = { id: 'text', position: 'integer', data: 'jsonb' };
        p.spec.columns.forEach(([c, t]) => (types[c] = t));
        const sql =
          `INSERT INTO ipls.${p.spec.table} (${cols.join(', ')}, updated_at)
           SELECT ${cols.join(', ')}, now() FROM jsonb_to_recordset($1::jsonb) AS x(${cols.map(c => `${c} ${types[c]}`).join(', ')})
           ON CONFLICT (id) DO UPDATE SET ${cols.filter(c => c !== 'id').map(c => `${c} = EXCLUDED.${c}`).join(', ')}, updated_at = now()`;
        for (let i = 0; i < p.changed.length; i += BATCH) {
          const batch = p.changed.slice(i, i + BATCH);
          await client.query(sql, [JSON.stringify(batch)]);
          upserted += batch.length;
        }
      }
      await client.query(
        `INSERT INTO ipls.meta (key, value) VALUES ('last_saved_at', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [db.lastSavedAt || new Date().toISOString()]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
    // Só após o COMMIT o novo estado passa a ser a referência
    plans.forEach(p => this.snapshot.set(p.spec.table, p.next));
    return { upserted, deleted };
  }

  /** Contagens e soma de valores, para conferência. */
  async stats(): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    for (const spec of TABLES) {
      const r = await this.pool.query(`SELECT count(*) AS n FROM ipls.${spec.table}`);
      out[spec.table] = Number(r.rows[0].n);
    }
    const s = await this.pool.query('SELECT COALESCE(sum(value), 0) AS s FROM ipls.measurements');
    out.measurements_value_sum = Number(s.rows[0].s);
    return out;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

const TABLE_TO_COLLECTION: Record<string, keyof AppDatabase> = {
  organizations: 'organizations',
  themes: 'themes',
  indicators: 'indicators',
  measurements: 'measurements',
  targets: 'targets',
  ids_complements: 'idsComplements',
  user_permissions: 'userPermissions',
  alerts: 'alerts',
  audit_logs: 'auditLogs'
};
