/**
 * Relatório do IDS por órgão e exercício, calculado a partir do data/database.json.
 * Uso: npx tsx scripts/ids-report.ts [ano]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scopeMeasurements } from '../src/services/orgScope';
import { calculateCNJIDS } from '../src/services/idsCalculator';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = JSON.parse(fs.readFileSync(path.join(root, 'data', 'database.json'), 'utf-8'));
const onlyYear = process.argv[2] ? Number(process.argv[2]) : undefined;
const years = onlyYear ? [onlyYear] : [2021, 2022, 2023, 2024, 2025, 2026];

console.log(['Órgão', ...years.map(String)].join('\t'));
for (const org of db.organizations) {
  const ms = scopeMeasurements(org.id, db.measurements, db.indicators, db.organizations);
  const complements = (db.idsComplements || []).filter((c: any) => c.organizationId === org.id);
  const cells = years.map(y => {
    const r = calculateCNJIDS(ms, y, { context: { indicators: db.indicators, complements, organization: org } });
    return r.hasScore ? `${r.idsScore.toFixed(1)}% (${r.coverage.available}/${r.coverage.total})` : 'n.d.';
  });
  console.log([org.acronym, ...cells].join('\t'));
}

if (onlyYear) {
  for (const org of db.organizations) {
    const ms = scopeMeasurements(org.id, db.measurements, db.indicators, db.organizations);
    const complements = (db.idsComplements || []).filter((c: any) => c.organizationId === org.id);
    const r = calculateCNJIDS(ms, onlyYear, { context: { indicators: db.indicators, complements, organization: org } });
    console.log(`\n${org.acronym} ${onlyYear}: ${r.hasScore ? r.idsScore + '%' : 'n.d.'}`);
    r.subIndicators.forEach(s =>
      console.log(`  ${s.key.padEnd(11)} ${s.available ? s.rawValue.toFixed(3).padStart(14) + ' ' + s.unit + ' → ' + s.normalizedValue.toFixed(3) : 'n.d. — ' + s.note}`)
    );
    r.notes.forEach(n => console.log('  * ' + n));
  }
}
