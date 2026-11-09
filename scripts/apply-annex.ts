/**
 * Alinha o catálogo de indicadores ao Anexo da Res. CNJ nº 400/2021 (redação 2024/2025)
 * e grava em cada indicador a referência oficial (definição, unidade, periodicidade,
 * fórmula, variáveis), usada nos textos de ajuda da interface.
 *
 * Correções:
 *  - ServCI da planilha (servidores capacitados para inventários, variável do CultGEE1)
 *    estava gravado no 19.16 ServCI (servidores indígenas em chefia): vai para ServCInv.
 *  - RDC: item 21.1, em percentual (antes 21.2, em R$); ANT (fora do Anexo) passa a 21.9.
 *  - GOT é o item 13.15 do Anexo; VHib (variável VAltH do RedGEE4) passa a 13.16.
 *
 * Idempotente. Execute com o iPLS PARADO:
 *   DATABASE_URL=... npx tsx scripts/apply-annex.ts      (PostgreSQL)
 *   npx tsx scripts/apply-annex.ts                       (data/database.json)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { storage } from '../src/server/storage';
import type { AnnexInfo, Indicator } from '../src/types';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ref = JSON.parse(fs.readFileSync(path.join(root, 'data/reference/anexo-res400.json'), 'utf-8')) as {
  source: string;
  indicators: Record<string, AnnexInfo>;
};

await storage.init();
const db = storage.getDatabase();
const log: string[] = [];
const byAcr = (a: string) => db.indicators.find(i => i.acronym === a);

// 1. ServCInv: capacitados para inventário (dados que estavam no 19.16)
let servInv = byAcr('ServCInv');
if (!servInv) {
  const used = db.indicators.filter(i => i.themeId === 'theme-20').map(i => Number(i.code.split('.')[1]) || 0);
  servInv = {
    id: 'indicator-20-servci-inv',
    organizationId: 'org-sjrr',
    code: `20.${Math.max(...used) + 1}`,
    acronym: 'ServCInv',
    name: 'Servidores(as) capacitados(as) para elaborar inventários de emissões',
    description: 'Total de servidores que, ao final do período-base, estavam capacitados para elaborar inventários de emissões.',
    themeId: 'theme-20',
    unit: 'servidores(as)',
    periodicity: 'ANUAL',
    dataType: 'QUANTIDADE',
    indicatorType: 'INPUT',
    category: 'OFICIAL_CNJ',
    requiresPlsJudInput: true,
    automaticCalculation: false,
    active: true,
    startValidity: '2021-01-01',
    consolidation: 'SOMA'
  } as Indicator;
  db.indicators.push(servInv);
  log.push(`Criado ${servInv.code} ServCInv`);
}
const servCI = byAcr('ServCI');
if (servCI) {
  let moved = 0;
  for (const m of db.measurements) {
    if (m.indicatorId === servCI.id && (m.notes || '').startsWith('Planilha')) {
      m.indicatorId = servInv.id;
      m.unit = servInv.unit;
      moved++;
    }
  }
  for (const a of db.alerts) {
    if (a.indicatorId === servCI.id) {
      a.indicatorId = servInv.id;
      a.indicatorName = `${servInv.code} — ${servInv.name} (ServCInv)`;
    }
  }
  if (moved) log.push(`${moved} medições movidas de 19.16 ServCI para ServCInv`);
}
await storage.saveNow();

// 2. RDC 21.1 em percentual; ANT para 21.9 (em duas gravações, por causa do código único)
const ant = byAcr('ANT');
const rdc = byAcr('RDC');
if (ant && ant.code !== '21.9') {
  ant.code = '21.9';
  await storage.saveNow();
  log.push('ANT → 21.9');
}
if (rdc && (rdc.code !== '21.1' || rdc.unit !== '%')) {
  rdc.code = '21.1';
  rdc.unit = '%';
  rdc.dataType = 'PERCENTUAL';
  rdc.consolidation = 'NENHUMA';
  rdc.name = 'Redução de custos decorrentes da adoção de novas tecnologias ou processos';
  await storage.saveNow();
  log.push('RDC → 21.1 (%)');
}

// 3. GOT 13.15 e VHib 13.16 (três gravações para não colidir códigos)
const got = byAcr('GOT');
const vhib = byAcr('VHib');
if (got && vhib && got.code !== '13.15') {
  vhib.code = '13.16-tmp';
  await storage.saveNow();
  got.code = '13.15';
  await storage.saveNow();
  vhib.code = '13.16';
  await storage.saveNow();
  log.push('GOT → 13.15; VHib → 13.16');
}

// 4. Referência oficial em cada indicador
const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
let withRef = 0;
const outside: string[] = [];
for (const ind of db.indicators) {
  const info =
    ref.indicators[ind.acronym || ''] ||
    (ind.name.toLowerCase().startsWith('uso de energia') ? ref.indicators['Uso de energia alternativa'] : undefined);
  if (!info) continue;
  ind.annex = info;
  if (info.kind === 'ITEM') {
    ind.description = cap(info.definition) || ind.description;
    ind.normativeReference = `Res. CNJ nº 400/2021, Anexo, item ${info.item}`;
    withRef++;
  } else if (info.kind === 'VARIAVEL') {
    ind.description = cap(info.definition) || ind.description;
    ind.normativeReference = `Res. CNJ nº 400/2021, Anexo, variável ${info.acronym} do item ${info.item} (${info.parent?.acronym})`;
    withRef++;
  } else {
    ind.normativeReference = 'Indicador local do iPLS (não consta do Anexo da Res. CNJ nº 400/2021)';
    outside.push(`${ind.code} ${ind.acronym}`);
  }
}
await storage.saveNow();

console.log(log.join('\n'));
console.log(`Referência do Anexo gravada em ${withRef} indicadores. Fora do Anexo: ${outside.join(', ')}`);
process.exit(0);
