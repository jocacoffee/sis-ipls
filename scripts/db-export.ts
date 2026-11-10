/**
 * Exporta o conteúdo atual do PostgreSQL para data/database.json, que é a base inicial
 * importada automaticamente quando o iPLS sobe com um banco vazio (ex.: novo servidor).
 *
 * Uso:
 *   DATABASE_URL=postgresql://... npx tsx scripts/db-export.ts [--com-auditoria]
 *
 * Por padrão, não leva o histórico de auditoria, as permissões delegadas nem os
 * campos com login/nome de usuário (validatedBy, createdBy...): o novo servidor começa com histórico limpo e os
 * administradores definidos em IPLS_ADMINS.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PgStore } from '../src/server/pgStore';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Defina DATABASE_URL.');
  process.exit(1);
}
const keepAudit = process.argv.includes('--com-auditoria');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data', 'database.json');

const store = new PgStore(url);
try {
  const db = await store.load();
  if (!keepAudit) {
    db.auditLogs = [];
    db.userPermissions = [];
    // Logins e nomes de quem lançou ou validou registros também ficam de fora
    const USER_FIELDS = ['validatedBy', 'createdBy', 'updatedBy', 'userId', 'userName'];
    for (const value of Object.values(db)) {
      if (!Array.isArray(value)) continue;
      for (const rec of value as Record<string, unknown>[]) {
        if (rec && typeof rec === 'object') for (const f of USER_FIELDS) delete rec[f];
      }
    }
  }
  db.lastSavedAt = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(db, null, 2), 'utf-8');
  const sum = db.measurements.reduce((a, m) => a + Number(m.value || 0), 0);
  console.log(
    `data/database.json exportado: ${db.organizations.length} órgãos, ${db.indicators.length} indicadores, ` +
    `${db.measurements.length} medições (soma ${sum.toFixed(2)}), ${db.targets.length} metas, ` +
    `${db.idsComplements?.length ?? 0} complementos do IDS, ${db.auditLogs.length} registros de auditoria.`
  );
} finally {
  await store.close();
}
