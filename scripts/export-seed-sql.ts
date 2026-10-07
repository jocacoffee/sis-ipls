import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');
const SCHEMA_FILE = path.resolve(DATA_DIR, 'schema.sql');
const OUTPUT_SQL = path.resolve(DATA_DIR, 'init-db.sql');

function escapeSql(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

function generateInitSql() {
  const schemaContent = fs.readFileSync(SCHEMA_FILE, 'utf-8');
  const dbData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));

  let sql = schemaContent + '\n\n-- ============================================================================\n-- CARGA DE DADOS INICIAIS (SEED DATA DA SJRR)\n-- ============================================================================\n\n';

  // Organizations
  if (dbData.organizations?.length) {
    sql += '-- 1. Organizações\n';
    for (const org of dbData.organizations) {
      sql += `INSERT INTO organizations (id, name, acronym, sphere, jurisdiction, headquarters_address) VALUES (${escapeSql(org.id)}, ${escapeSql(org.name)}, ${escapeSql(org.acronym)}, ${escapeSql(org.sphere)}, ${escapeSql(org.jurisdiction)}, ${escapeSql(org.headquartersAddress)}) ON CONFLICT (id) DO NOTHING;\n`;
    }
    sql += '\n';
  }

  // Users
  if (dbData.users?.length) {
    sql += '-- 2. Usuários\n';
    for (const u of dbData.users) {
      sql += `INSERT INTO users (id, organization_id, name, email, role, unit, active) VALUES (${escapeSql(u.id)}, ${escapeSql(u.organizationId)}, ${escapeSql(u.name)}, ${escapeSql(u.email)}, ${escapeSql(u.role)}, ${escapeSql(u.unit)}, ${escapeSql(u.active)}) ON CONFLICT (id) DO NOTHING;\n`;
    }
    sql += '\n';
  }

  // Themes
  if (dbData.themes?.length) {
    sql += '-- 3. Eixos Temáticos\n';
    for (const t of dbData.themes) {
      sql += `INSERT INTO themes (id, code, name, description, icon, color, cnj_category) VALUES (${escapeSql(t.id)}, ${escapeSql(t.code)}, ${escapeSql(t.name)}, ${escapeSql(t.description)}, ${escapeSql(t.icon)}, ${escapeSql(t.color)}, ${escapeSql(t.cnjCategory)}) ON CONFLICT (id) DO NOTHING;\n`;
    }
    sql += '\n';
  }

  // Indicators
  if (dbData.indicators?.length) {
    sql += '-- 4. Indicadores Oficiais\n';
    for (const ind of dbData.indicators) {
      sql += `INSERT INTO indicators (id, theme_id, code, name, acronym, unit, description, calculation_method, aggregation_type, desired_trend, cnj_indicator_code, data_source_type, active) VALUES (${escapeSql(ind.id)}, ${escapeSql(ind.themeId)}, ${escapeSql(ind.code)}, ${escapeSql(ind.name)}, ${escapeSql(ind.acronym)}, ${escapeSql(ind.unit)}, ${escapeSql(ind.description)}, ${escapeSql(ind.calculationMethod)}, ${escapeSql(ind.aggregationType)}, ${escapeSql(ind.desiredTrend)}, ${escapeSql(ind.cnjIndicatorCode)}, ${escapeSql(ind.dataSourceType)}, ${escapeSql(ind.active)}) ON CONFLICT (id) DO NOTHING;\n`;
    }
    sql += '\n';
  }

  // Targets
  if (dbData.targets?.length) {
    sql += '-- 5. Metas Institucionais\n';
    for (const tg of dbData.targets) {
      sql += `INSERT INTO targets (id, organization_id, indicator_id, year, baseline_year, baseline_value, target_value, target_unit, target_type, reduction_percentage, notes) VALUES (${escapeSql(tg.id)}, ${escapeSql(tg.organizationId)}, ${escapeSql(tg.indicatorId)}, ${escapeSql(tg.year)}, ${escapeSql(tg.baselineYear)}, ${escapeSql(tg.baselineValue)}, ${escapeSql(tg.targetValue)}, ${escapeSql(tg.targetUnit)}, ${escapeSql(tg.targetType)}, ${escapeSql(tg.reductionPercentage)}, ${escapeSql(tg.notes)}) ON CONFLICT (id) DO NOTHING;\n`;
    }
    sql += '\n';
  }

  // Measurements
  if (dbData.measurements?.length) {
    sql += '-- 6. Medições Mensais Auditadas\n';
    for (const m of dbData.measurements) {
      sql += `INSERT INTO measurements (id, organization_id, indicator_id, year, month, value, unit, source_type, source_reference, process_number, validation_status, notes) VALUES (${escapeSql(m.id)}, ${escapeSql(m.organizationId)}, ${escapeSql(m.indicatorId)}, ${escapeSql(m.year)}, ${escapeSql(m.month)}, ${escapeSql(m.value)}, ${escapeSql(m.unit)}, ${escapeSql(m.sourceType)}, ${escapeSql(m.sourceReference)}, ${escapeSql(m.processNumber)}, ${escapeSql(m.validationStatus)}, ${escapeSql(m.notes)}) ON CONFLICT (id) DO NOTHING;\n`;
    }
    sql += '\n';
  }

  // Action Plans
  if (dbData.actionPlans?.length) {
    sql += '-- 7. Planos de Ação\n';
    for (const a of dbData.actionPlans) {
      sql += `INSERT INTO action_plans (id, organization_id, title, description, theme_code, responsible_unit, status, percentage_complete, budget_allocated, budget_executed) VALUES (${escapeSql(a.id)}, ${escapeSql(a.organizationId)}, ${escapeSql(a.title)}, ${escapeSql(a.description)}, ${escapeSql(a.themeCode)}, ${escapeSql(a.responsibleUnit)}, ${escapeSql(a.status)}, ${escapeSql(a.percentageComplete)}, ${escapeSql(a.budgetAllocated)}, ${escapeSql(a.budgetExecuted)}) ON CONFLICT (id) DO NOTHING;\n`;
    }
    sql += '\n';
  }

  fs.writeFileSync(OUTPUT_SQL, sql, 'utf-8');
  console.log(`[SQL Exporter] Script SQL gerado com sucesso em ${OUTPUT_SQL} (${sql.length} bytes).`);
}

generateInitSql();
