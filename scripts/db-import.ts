/**
 * Importa data/database.json para o PostgreSQL (schema "ipls"), substituindo o
 * conteúdo atual numa única transação, e confere contagens e somas.
 *
 * Uso (com o servidor do iPLS PARADO, para que a memória dele não sobrescreva a carga):
 *   DATABASE_URL=postgresql://... npx tsx scripts/db-import.ts [--force]
 *
 * Sem --force, só importa se o banco estiver vazio.
 */
import { PgStore } from '../src/server/pgStore';
import { readJsonDatabase } from '../src/server/storage';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Defina DATABASE_URL.');
  process.exit(1);
}
const force = process.argv.includes('--force');

const store = new PgStore(url);
try {
  await store.migrate();
  if (!(await store.isEmpty()) && !force) {
    console.error('O banco já tem dados. Use --force para substituir tudo pelo conteúdo de data/database.json.');
    process.exit(1);
  }
  const { db, fromFile } = readJsonDatabase();
  if (!fromFile) {
    console.error('data/database.json não encontrado.');
    process.exit(1);
  }
  const r = await store.persist(db, { replaceAll: true });
  const stats = await store.stats();

  const expected: Record<string, number> = {
    organizations: db.organizations.length,
    themes: db.themes.length,
    indicators: db.indicators.length,
    measurements: db.measurements.length,
    targets: db.targets.length,
    ids_complements: db.idsComplements.length,
    alerts: db.alerts.length,
    audit_logs: db.auditLogs.length
  };
  const errors: string[] = [];
  for (const [t, n] of Object.entries(expected)) {
    if (stats[t] !== n) errors.push(`${t}: ${stats[t]} no banco, esperado ${n}`);
  }
  const sum = db.measurements.reduce((a, m) => a + m.value, 0);
  if (Math.abs(stats.measurements_value_sum - sum) > 0.01) {
    errors.push(`Soma das medições: ${stats.measurements_value_sum} no banco, esperado ${sum}`);
  }

  console.log(`Registros gravados: ${r.upserted}`);
  console.table(Object.entries(expected).map(([t, n]) => ({ tabela: t, json: n, postgres: stats[t] })));
  if (errors.length) {
    console.error('✗ Divergências:\n  ' + errors.join('\n  '));
    process.exit(1);
  }
  console.log(`✓ Importação conferida (soma das medições: ${sum.toFixed(2)}).`);
} finally {
  await store.close();
}
