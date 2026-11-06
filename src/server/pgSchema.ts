/**
 * Esquema PostgreSQL do iPLS (schema "ipls").
 *
 * Cada tabela tem colunas tipadas para chaves, filtros e regras de integridade
 * (chaves estrangeiras, unicidade, CHECKs) e a coluna "data" (jsonb) com o
 * registro completo da aplicação, para não perder campos opcionais.
 *
 * É idempotente: executado a cada inicialização do servidor.
 */
export const PG_SCHEMA_VERSION = 2;

export const PG_SCHEMA_SQL = `
CREATE SCHEMA IF NOT EXISTS ipls;

CREATE TABLE IF NOT EXISTS ipls.meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ipls.organizations (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  acronym               TEXT NOT NULL,
  type                  TEXT NOT NULL,
  parent_id             TEXT,
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  uf                    TEXT,
  is_consolidated       BOOLEAN NOT NULL DEFAULT FALSE,
  jurisdiction_area_km2 NUMERIC,
  position              INTEGER NOT NULL DEFAULT 0,
  data                  JSONB NOT NULL,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ipls.themes (
  id         TEXT PRIMARY KEY,
  code       TEXT NOT NULL,
  name       TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ipls.indicators (
  id            TEXT PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  acronym       TEXT,
  name          TEXT NOT NULL,
  theme_id      TEXT NOT NULL REFERENCES ipls.themes(id) ON DELETE RESTRICT,
  unit          TEXT NOT NULL,
  periodicity   TEXT NOT NULL CHECK (periodicity IN ('MENSAL', 'ANUAL')),
  data_type     TEXT NOT NULL,
  consolidation TEXT CHECK (consolidation IN ('SOMA', 'NENHUMA')),
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  position      INTEGER NOT NULL DEFAULT 0,
  data          JSONB NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ipls.measurements (
  id                TEXT PRIMARY KEY,
  organization_id   TEXT NOT NULL REFERENCES ipls.organizations(id) ON DELETE RESTRICT,
  indicator_id      TEXT NOT NULL REFERENCES ipls.indicators(id) ON DELETE RESTRICT,
  year              INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  month             INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  value             NUMERIC NOT NULL,
  unit              TEXT,
  source_type       TEXT,
  validation_status TEXT,
  position          INTEGER NOT NULL DEFAULT 0,
  data              JSONB NOT NULL,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_measurement_period UNIQUE (organization_id, indicator_id, year, month)
);
CREATE INDEX IF NOT EXISTS ix_measurements_org_year ON ipls.measurements (organization_id, year);

CREATE TABLE IF NOT EXISTS ipls.targets (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES ipls.organizations(id) ON DELETE RESTRICT,
  indicator_id    TEXT NOT NULL REFERENCES ipls.indicators(id) ON DELETE RESTRICT,
  year            INTEGER NOT NULL,
  target_value    NUMERIC NOT NULL,
  position        INTEGER NOT NULL DEFAULT 0,
  data            JSONB NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_target_org_indicator_year UNIQUE (organization_id, indicator_id, year)
);

CREATE TABLE IF NOT EXISTS ipls.ids_complements (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES ipls.organizations(id) ON DELETE RESTRICT,
  year            INTEGER NOT NULL,
  field           TEXT NOT NULL CHECK (field IN ('ftt','mtotal','areakm','redgee3','tmr','gcgraf','pservcf','pdesembpf')),
  value           NUMERIC NOT NULL,
  position        INTEGER NOT NULL DEFAULT 0,
  data            JSONB NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ids_complement UNIQUE (organization_id, year, field)
);

CREATE TABLE IF NOT EXISTS ipls.alerts (
  id              TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES ipls.organizations(id) ON DELETE RESTRICT,
  indicator_id    TEXT,
  year            INTEGER,
  month           INTEGER,
  type            TEXT,
  severity        TEXT,
  resolved        BOOLEAN NOT NULL DEFAULT FALSE,
  position        INTEGER NOT NULL DEFAULT 0,
  data            JSONB NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ipls.audit_logs (
  id              TEXT PRIMARY KEY,
  organization_id TEXT,
  logged_at       TIMESTAMPTZ,
  action          TEXT,
  entity_type     TEXT,
  entity_id       TEXT,
  position        INTEGER NOT NULL DEFAULT 0,
  data            JSONB NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_audit_logs_logged_at ON ipls.audit_logs (logged_at DESC);

CREATE TABLE IF NOT EXISTS ipls.user_permissions (
  id              TEXT PRIMARY KEY,           -- login normalizado (usuario@dominio)
  role            TEXT NOT NULL CHECK (role IN ('ADMIN', 'MASTER', 'PREENCHEDOR')),
  organization_id TEXT REFERENCES ipls.organizations(id) ON DELETE RESTRICT,
  expires_at      DATE,
  granted_by      TEXT NOT NULL,
  position        INTEGER NOT NULL DEFAULT 0,
  data            JSONB NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_permission_org CHECK (role = 'ADMIN' OR organization_id IS NOT NULL)
);

-- Demais coleções (usuários, ciclos, documentos, planos de ação, GEE, conectores…)
CREATE TABLE IF NOT EXISTS ipls.app_records (
  id              TEXT PRIMARY KEY,           -- "<coleção>:<id do registro>"
  collection      TEXT NOT NULL,
  record_id       TEXT NOT NULL,
  organization_id TEXT,
  position        INTEGER NOT NULL DEFAULT 0,
  data            JSONB NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_app_record UNIQUE (collection, record_id)
);
`;
