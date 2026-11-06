/**
 * Carga dos dados reais do Painel Unificado de Sustentabilidade (JF da 1ª Região)
 * no banco do iPLS (data/database.json).
 *
 * Uso:
 *   npx tsx scripts/load-pls-data.ts [--dir data/import/pls-jf1] [--dry-run]
 *
 * Arquivos esperados em --dir (gerados a partir da planilha):
 *   dados_sustentabilidade.json, fonte_anual_bruta.csv, totais_controle.csv
 *
 * O que faz:
 *   1. Faz backup do database.json atual em data/backups/.
 *   2. Remove os dados de demonstração (medições, metas, alertas e cálculos de GEE fictícios).
 *   3. Cadastra os 16 órgãos (14 ativos, SJMG inativo e o consolidado da 1ª Região).
 *   4. Associa os 120 indicadores da planilha ao catálogo e cria os que não existem.
 *   5. Carrega as medições (mensais; anuais no mês 12; percentuais na escala 0–100).
 *   6. Confere contagens e somas com totais_controle.csv e o consolidado regional.
 *      Só grava se tudo conferir. É idempotente: pode ser executado de novo.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  Indicator,
  IndicatorDataType,
  IndicatorMeasurement,
  InconsistencyAlert,
  Organization,
  AuditLog
} from '../src/types';
import { buildConsolidatedMeasurements, CONSOLIDATED_ORG_ID } from '../src/services/orgScope';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_FILE = path.join(ROOT, 'data', 'database.json');

const args = process.argv.slice(2);
const argValue = (name: string, def: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const SRC_DIR = path.resolve(ROOT, argValue('--dir', 'data/import/pls-jf1'));
const DRY_RUN = args.includes('--dry-run');
const SOURCE_REF = 'Painel Unificado de Sustentabilidade JF1 (planilha corrigida)';

// ---------------------------------------------------------------- leitura
interface SrcOrg { id: string; nome: string; tipo: string; uf: string; ativo: boolean; codigo_origem: string }
interface SrcInd {
  codigo: string; nome: string; tema: string; unidade: string; tipo_valor: string;
  periodicidade: 'mensal' | 'anual'; consolidacao: 'soma' | 'nenhuma'; campo_fonte: string; ordem: number;
}
interface SrcMensal { orgao_id: string; indicador: string; ano: number; mes: number; valor: number; origem: string }
interface SrcAnual { orgao_id: string; indicador: string; ano: number; valor: number; origem: string }
interface SrcAlerta {
  severidade: 'alta' | 'media' | 'baixa'; tipo: string; tabela: string; orgao_id: string | null;
  indicador: string | null; ano: number | null; mes: number | null; valor: unknown; descricao: string;
}

function readCsv(file: string): Record<string, string>[] {
  const text = fs.readFileSync(file, 'utf-8').replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows.filter(r => r.length > 1 || r[0] !== '');
  return body.map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

const bundle = JSON.parse(fs.readFileSync(path.join(SRC_DIR, 'dados_sustentabilidade.json'), 'utf-8')) as {
  orgaos: SrcOrg[]; indicadores: SrcInd[]; valores_mensais: SrcMensal[]; valores_anuais: SrcAnual[]; alertas: SrcAlerta[];
};
const fonte = readCsv(path.join(SRC_DIR, 'fonte_anual_bruta.csv'));
const controle = readCsv(path.join(SRC_DIR, 'totais_controle.csv'));
const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
const now = new Date().toISOString();

// ---------------------------------------------------------------- 1. órgãos
const ORG_NAMES: Record<string, [string, string]> = {
  TRF1: ['org-trf1', '1ª Região — Consolidado'],
  TRF1_2G: ['org-trf1-2g', 'Tribunal Regional Federal da 1ª Região — 2º Grau'],
  SJAC: ['org-sjac', 'Seção Judiciária do Acre'],
  SJAM: ['org-sjam', 'Seção Judiciária do Amazonas'],
  SJAP: ['org-sjap', 'Seção Judiciária do Amapá'],
  SJBA: ['org-sjba', 'Seção Judiciária da Bahia'],
  SJDF: ['org-sjdf', 'Seção Judiciária do Distrito Federal'],
  SJGO: ['org-sjgo', 'Seção Judiciária de Goiás'],
  SJMA: ['org-sjma', 'Seção Judiciária do Maranhão'],
  SJMT: ['org-sjmt', 'Seção Judiciária de Mato Grosso'],
  SJPA: ['org-sjpa', 'Seção Judiciária do Pará'],
  SJPI: ['org-sjpi', 'Seção Judiciária do Piauí'],
  SJRO: ['org-sjro', 'Seção Judiciária de Rondônia'],
  SJRR: ['org-sjrr', 'Seção Judiciária de Roraima'],
  SJTO: ['org-sjto', 'Seção Judiciária do Tocantins'],
  SJMG: ['org-sjmg', 'Seção Judiciária de Minas Gerais (até 2021)']
};
const orgId = (srcId: string) => {
  const m = ORG_NAMES[srcId];
  if (!m) throw new Error(`Órgão sem mapeamento: ${srcId}`);
  return m[0];
};

// Área e força de trabalho: último valor positivo até 2023 (em 2024–2025 a fonte zera a área
// e muda a metodologia da FTT; ver alertas_qualidade.csv)
const fonteNum = (src: string, campo: string): number => {
  const vals = fonte
    .filter(r => r.orgao_id === src && r.campo === campo && r.valor !== '' && Number(r.ano) <= 2023)
    .map(r => ({ ano: Number(r.ano), v: Number(r.valor) }))
    .filter(x => x.v > 0)
    .sort((a, b) => b.ano - a.ano);
  return vals[0]?.v ?? 0;
};

const organizations: Organization[] = bundle.orgaos.map((o, idx) => {
  const [id, name] = ORG_NAMES[o.id];
  const consolidated = o.id === 'TRF1';
  const existing = (db.organizations as Organization[]).find(e => e.id === id);
  return {
    ...(existing || {}),
    id,
    name,
    acronym: o.id === 'TRF1_2G' ? 'TRF1-2G' : o.id,
    type: o.id.startsWith('SJ') ? 'SECAO_JUDICIARIA' : 'TRIBUNAL',
    ...(consolidated ? {} : { parentOrganizationId: CONSOLIDATED_ORG_ID }),
    active: consolidated ? true : o.ativo,
    uf: o.uf,
    totalFloorAreaM2: Math.round(fonteNum(o.id, 'mtotal')) || existing?.totalFloorAreaM2 || 0,
    totalMagistratesStaff: Math.round(fonteNum(o.id, 'ftt')) || existing?.totalMagistratesStaff || 0,
    isConsolidated: consolidated,
    displayOrder: idx
  } as Organization;
});
if (organizations.some(o => o.isConsolidated && o.id !== CONSOLIDATED_ORG_ID)) {
  throw new Error('O consolidado deve usar o id org-trf1.');
}
const orgByCode = new Map(bundle.orgaos.map(o => [o.id, orgId(o.id)]));

// ---------------------------------------------------------------- 2. indicadores
const indicators: Indicator[] = (db.indicators as Indicator[]).map(i => ({ ...i }));
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9²]/g, '');
const byAcronym = new Map<string, Indicator>();
indicators.forEach(i => i.acronym && byAcronym.set(norm(i.acronym), i));
// Siglas que diferem entre a planilha e o catálogo do iPLS
const ALIAS: Record<string, string> = {
  DEl: 'DEI/DEl',
  'm² Cont': 'm²Cont',
  GEEComp: 'GEE-Comp',
  GEE3: 'GEE-Esc3'
};
// Tema do iPLS para os indicadores que serão criados
const NEW_THEME: Record<string, string> = {
  VHib: 'theme-13', GOT: 'theme-13', TMC: 'theme-8',
  CEEs: 'theme-6', CEEe: 'theme-6', CEEm: 'theme-6', CEEg: 'theme-6', CEEo: 'theme-6',
  IEEs: 'theme-6', IEEe: 'theme-6', IEEm: 'theme-6', IEEg: 'theme-6', IEEo: 'theme-6',
  AIncent: 'theme-21'
};
const nextCode = (themeId: string) => {
  const t = themeId.replace('theme-', '');
  const used = indicators.filter(i => i.themeId === themeId).map(i => Number(i.code.split('.')[1]) || 0);
  return `${t}.${Math.max(0, ...used) + 1}`;
};
const dataTypeFor = (s: SrcInd): IndicatorDataType =>
  s.unidade === 'R$' ? 'VALOR_MONETARIO'
    : s.unidade === '%' ? 'PERCENTUAL'
    : s.tipo_valor === 'codigo' || s.unidade.includes('/') ? 'INDICE'
    : 'QUANTIDADE';

const indBySrc = new Map<string, Indicator>();
const created: string[] = [];
for (const s of bundle.indicadores) {
  let ind = byAcronym.get(norm(ALIAS[s.codigo] || s.codigo));
  if (!ind) {
    const themeId = NEW_THEME[s.codigo] || 'theme-20';
    const code = nextCode(themeId);
    ind = {
      id: `indicator-${code.replace('.', '-')}`,
      organizationId: 'org-sjrr',
      code,
      acronym: s.codigo,
      name: s.nome,
      description: `${s.nome} (tema de origem: ${s.tema}).`,
      themeId,
      unit: s.unidade,
      periodicity: s.periodicidade === 'mensal' ? 'MENSAL' : 'ANUAL',
      dataType: dataTypeFor(s),
      indicatorType: 'INPUT',
      category: 'OFICIAL_CNJ',
      requiresPlsJudInput: true,
      automaticCalculation: false,
      active: true,
      startValidity: '2021-01-01',
      normativeReference: `Painel PLS JF1 — campo "${s.campo_fonte}" da fonte anual CNJ`,
      consolidation: s.consolidacao === 'soma' ? 'SOMA' : 'NENHUMA'
    };
    if (indicators.some(i => i.id === ind!.id)) throw new Error(`Id duplicado: ${ind.id}`);
    indicators.push(ind);
    byAcronym.set(norm(s.codigo), ind);
    created.push(`${s.codigo} → ${code}`);
  }
  ind.consolidation = s.consolidacao === 'soma' ? 'SOMA' : 'NENHUMA';
  // Periodicidade segue a planilha oficial (ex.: kWhI é mensal)
  ind.periodicity = s.periodicidade === 'mensal' ? 'MENSAL' : 'ANUAL';
  indBySrc.set(s.codigo, ind);
}
// Metas passam a ser por órgão: remove as metas de demonstração gravadas no catálogo
for (const i of indicators) {
  delete i.targetValue2026;
  delete i.baselineValue;
  delete i.baselineYear;
}

// ---------------------------------------------------------------- 3. medições
const isPct = (ind: Indicator) => ind.dataType === 'PERCENTUAL';
const toAppValue = (ind: Indicator, v: number) => (isPct(ind) ? Number((v * 100).toFixed(8)) : v);
const measurements: IndicatorMeasurement[] = [];
const keys = new Set<string>();
const push = (org: string, ind: Indicator, year: number, month: number, value: number, note: string) => {
  const key = `${org}__${ind.id}__${year}__${month}`;
  if (keys.has(key)) throw new Error(`Medição duplicada: ${key}`);
  keys.add(key);
  measurements.push({
    id: `pls-${org.replace('org-', '')}-${ind.id.replace('indicator-', '')}-${year}-${String(month).padStart(2, '0')}`,
    indicatorId: ind.id,
    organizationId: org,
    year,
    month,
    value,
    unit: ind.unit,
    sourceType: 'imported',
    sourceReference: SOURCE_REF,
    validationStatus: 'VALIDADO',
    confidenceScore: 100,
    notes: note,
    createdAt: now,
    updatedAt: now
  });
};
for (const r of bundle.valores_mensais) {
  const ind = indBySrc.get(r.indicador)!;
  push(orgByCode.get(r.orgao_id)!, ind, r.ano, r.mes, toAppValue(ind, r.valor), `Planilha: ${r.origem}`);
}
for (const r of bundle.valores_anuais) {
  const ind = indBySrc.get(r.indicador)!;
  push(orgByCode.get(r.orgao_id)!, ind, r.ano, 12, toAppValue(ind, r.valor), 'Planilha: entrada anual (lançada no mês 12)');
}
// Complementos da fonte anual CNJ: indicadores anuais do iPLS que não estão no catálogo da
// planilha (ex.: FTT, área, magistrados, terceirizados). Exclui o total TRF1 (é calculado)
// e a SJMG (fora da 1ª Região nos consolidados anuais).
const fonteLoaded = new Map<string, number>();
const planilhaIds = new Set([...indBySrc.values()].map(i => i.id));
const FONTE_ALIAS: Record<string, string> = { mtotal: 'm²Total' };
for (const r of fonte) {
  if (r.valor === '' || r.orgao_id === 'TRF1' || r.orgao_id === 'SJMG') continue;
  const ind = byAcronym.get(norm(FONTE_ALIAS[r.campo] || r.campo));
  if (!ind || ind.periodicity !== 'ANUAL' || planilhaIds.has(ind.id)) continue;
  push(orgByCode.get(r.orgao_id)!, ind, Number(r.ano), 12, toAppValue(ind, Number(r.valor)),
    'Fonte anual CNJ (lançada no mês 12)');
  fonteLoaded.set(ind.acronym!, (fonteLoaded.get(ind.acronym!) || 0) + 1);
}

// ---------------------------------------------------------------- 4. alertas de qualidade
const SEV: Record<string, InconsistencyAlert['severity']> = { alta: 'CRITICA', media: 'ATENCAO', baixa: 'INFO' };
const TYPE: Record<string, InconsistencyAlert['type']> = {
  valor_atipico: 'SPIKE', salto_anual: 'SPIKE', zero_em_serie: 'SPIKE',
  lacuna_mensal: 'MISSING', valor_invalido: 'MISSING', percentual_acima_100: 'UNIT_MISMATCH'
};
const alerts: InconsistencyAlert[] = bundle.alertas
  .filter(a => a.indicador && a.ano && a.orgao_id && indBySrc.has(a.indicador) && TYPE[a.tipo])
  .map((a, i) => {
    const ind = indBySrc.get(a.indicador!)!;
    return {
      id: `pls-alerta-${i + 1}`,
      organizationId: orgByCode.get(a.orgao_id!),
      indicatorId: ind.id,
      indicatorName: `${ind.code} — ${ind.name} (${ind.acronym})`,
      month: a.mes ?? 12,
      year: a.ano!,
      type: TYPE[a.tipo],
      severity: SEV[a.severidade],
      message: a.descricao,
      detectedValue: typeof a.valor === 'number' ? a.valor : String(a.valor ?? ''),
      suggestedAction: 'Confirmar o valor com a unidade responsável e corrigir na origem, se necessário.',
      createdAt: now,
      resolved: false
    };
  });

// ---------------------------------------------------------------- 5. conferência
const errors: string[] = [];
const rawValue = (m: IndicatorMeasurement) => {
  const ind = indicators.find(i => i.id === m.indicatorId)!;
  return isPct(ind) ? m.value / 100 : m.value;
};
const srcIdOf = new Map([...indBySrc.entries()].map(([k, v]) => [v.id, k]));
const tally = new Map<string, { n: number; s: number }>();
for (const m of measurements) {
  if (m.notes?.startsWith('Fonte anual')) continue;
  const table = m.notes?.includes('entrada anual') ? 'valores_anuais' : 'valores_mensais';
  for (const k of [`${table}|*|*`, `${table}|${srcIdOf.get(m.indicatorId)}|${m.year}`]) {
    const t = tally.get(k) || { n: 0, s: 0 };
    t.n++; t.s += rawValue(m);
    tally.set(k, t);
  }
}
let checked = 0;
for (const c of controle) {
  if (c.tabela !== 'valores_mensais' && c.tabela !== 'valores_anuais') continue;
  const t = tally.get(`${c.tabela}|${c.indicador}|${c.ano}`) || { n: 0, s: 0 };
  checked++;
  if (t.n !== Number(c.registros)) errors.push(`${c.tabela} ${c.indicador} ${c.ano}: ${t.n} registros, esperado ${c.registros}`);
  if (Math.abs(t.s - Number(c.soma_valor)) > 0.01) errors.push(`${c.tabela} ${c.indicador} ${c.ano}: soma ${t.s.toFixed(4)}, esperado ${c.soma_valor}`);
}
// Consolidado regional mensal deve ser a soma dos órgãos
const consolidated = buildConsolidatedMeasurements(measurements, indicators);
const expected = new Map<string, number>();
for (const r of bundle.valores_mensais) {
  const k = `${indBySrc.get(r.indicador)!.id}__${r.ano}__${r.mes}`;
  expected.set(k, (expected.get(k) || 0) + r.valor);
}
for (const [k, v] of expected) {
  const [id, y, mm] = k.split('__');
  const c = consolidated.find(x => x.indicatorId === id && x.year === Number(y) && x.month === Number(mm));
  if (!c || Math.abs(c.value - v) > 0.01) errors.push(`Consolidado ${k}: ${c?.value} ≠ ${v}`);
}
for (const o of organizations) {
  if (!o.isConsolidated && !measurements.some(m => m.organizationId === o.id)) errors.push(`Órgão sem dados: ${o.id}`);
}

console.log(`Órgãos: ${organizations.length} | Indicadores: ${indicators.length} (criados ${created.length})`);
console.log(`Criados: ${created.join(', ')}`);
console.log(`Medições: ${measurements.length} (planilha mensal ${bundle.valores_mensais.length}, anual ${bundle.valores_anuais.length}, fonte anual ${measurements.length - bundle.valores_mensais.length - bundle.valores_anuais.length})`);
console.log(`Complementos da fonte anual: ${[...fonteLoaded.entries()].map(([k, v]) => `${k}(${v})`).join(' ')}`);
console.log(`Alertas importados: ${alerts.length}`);
console.log(`Conferência: ${checked} linhas de controle + ${expected.size} consolidados mensais`);
if (errors.length) {
  console.error(`\n✗ ${errors.length} divergência(s). Nada foi gravado.`);
  errors.slice(0, 30).forEach(e => console.error('  ' + e));
  process.exit(1);
}
console.log('✓ Conferência sem divergências.');

if (DRY_RUN) {
  console.log('(--dry-run) Nada foi gravado.');
  process.exit(0);
}

// ---------------------------------------------------------------- 6. gravação
const backupDir = path.join(ROOT, 'data', 'backups');
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(backupDir, `database.antes-carga-${now.replace(/[:.]/g, '-')}.json`);
fs.copyFileSync(DB_FILE, backupFile);

const audit: AuditLog = {
  id: `audit-carga-pls-${Date.now()}`,
  organizationId: CONSOLIDATED_ORG_ID,
  userId: 'usr-1',
  userName: 'Carga automatizada',
  action: 'IMPORTACAO',
  timestamp: now,
  entityType: 'MEASUREMENT',
  entityId: 'carga-pls-jf1',
  previousValue: `${db.measurements.length} medições de demonstração`,
  newValue: `${measurements.length} medições reais de ${organizations.length - 1} órgãos`,
  reason: `Carga inicial do ${SOURCE_REF}. Dados de demonstração removidos (backup: ${path.basename(backupFile)}).`,
  source: 'scripts/load-pls-data.ts'
};

const out = {
  ...db,
  organizations,
  indicators,
  targets: [],
  measurements,
  ghgCalculations: [],
  alerts,
  auditLogs: [audit, ...db.auditLogs],
  lastSavedAt: now
};
fs.writeFileSync(DB_FILE, JSON.stringify(out, null, 2), 'utf-8');
console.log(`Backup: ${path.relative(ROOT, backupFile)}`);
console.log(`Gravado: ${path.relative(ROOT, DB_FILE)}`);
