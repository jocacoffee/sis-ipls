/**
 * Catálogo de ferramentas do iPLS para agentes de IA (somente leitura).
 *
 * As mesmas ferramentas são usadas:
 *  - pelo chat do iPLS, com o modelo local chamando funções (agent/chatAgent.ts);
 *  - pelo servidor MCP (agent/mcpServer.ts), para LM Studio e outros assistentes.
 *
 * Expõem apenas o que o iPLS já mostra a visitantes: indicadores, medições, metas, alertas,
 * planos de ação e IDS. Não expõem trilha de auditoria, documentos, usuários nem permissões,
 * e nenhuma ferramenta grava dados.
 */
import { storage } from '../storage';
import type { Indicator, Organization } from '../../types';
import {
  isConsolidatedOrg,
  orgDenominators,
  orgIdOf,
  scopeMeasurements,
  scopeTargets
} from '../../services/orgScope';
import { resolveTarget } from '../../services/targets';
import { calculateIndicatorPerformance, detectMeasurementInconsistencies } from '../../services/calculationEngine';
import { isAutoIndicator } from '../../services/autoCalc';
import { acceptsMonthlyEntry } from '../../services/periodicity';
import { calculateCNJIDS } from '../../services/idsCalculator';
import { computeGHGInventory, GHGYearInventory, hasGHGData, ISOLATED_SYSTEM_UNTIL, sinFactorFor, sumGHGInventories, TREES_PER_TCO2E } from '../../services/ghgInventory';

export interface ToolDefinition {
  name: string;
  description: string;
  /** JSON Schema dos argumentos (formato aceito pela API da OpenAI e pelo MCP). */
  parameters: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
  handler: (args: Record<string, unknown>) => unknown;
}

export class ToolError extends Error {}

// ------------------------------------------------------------------------------------ apoio

const db = () => storage.getDatabase();
const currentYear = () => new Date().getFullYear();
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const r = (v: number | null | undefined, d = 2) =>
  v === null || v === undefined || !Number.isFinite(v) ? null : Number(v.toFixed(Math.abs(v) >= 100 ? 0 : d));
const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[\s_\-²]/g, '');

const ORG_PARAM = {
  type: 'string',
  description: 'Órgão: sigla (ex.: SJRR, SJBA, TRF1-2G) ou "TRF1" para o consolidado da 1ª Região.'
};
const IND_PARAM = { type: 'string', description: 'Indicador: código (ex.: 6.1) ou sigla (ex.: CEE, CRE, FTT).' };
const YEAR_PARAM = { type: 'integer', description: 'Exercício (ano), ex.: 2026. Padrão: ano atual.' };

function findOrg(value: unknown): Organization {
  const all = db().organizations;
  const v = String(value ?? '').trim();
  if (!v) throw new ToolError('Informe o órgão (sigla, ex.: SJRR).');
  const n = norm(v);
  const consolidatedAliases = ['trf1', '1regiao', 'consolidado', 'regiao', 'jf1', 'orgtrf1'];
  const hit =
    all.find(o => o.id === v) ||
    all.find(o => norm(o.acronym) === n) ||
    (consolidatedAliases.includes(n) ? all.find(o => o.isConsolidated) : undefined) ||
    all.find(o => norm(o.name).includes(n));
  if (!hit) throw new ToolError(`Órgão "${v}" não encontrado. Use listar_orgaos para ver as siglas.`);
  return hit;
}

function findIndicator(value: unknown): Indicator {
  const v = String(value ?? '').trim();
  if (!v) throw new ToolError('Informe o indicador (código, ex.: 6.1, ou sigla, ex.: CEE).');
  const n = norm(v);
  const all = db().indicators;
  const hit =
    all.find(i => i.code === v || i.id === v) ||
    all.find(i => i.acronym && norm(i.acronym) === n) ||
    all.find(i => norm(i.name) === n);
  if (hit) return hit;
  const partial = all.filter(i => norm(i.name).includes(n));
  if (partial.length === 1) return partial[0];
  throw new ToolError(
    partial.length > 1
      ? `Indicador "${v}" é ambíguo: ${partial.slice(0, 6).map(i => `${i.code} ${i.acronym || ''}`).join(', ')}.`
      : `Indicador "${v}" não encontrado. Use buscar_indicadores.`
  );
}

function year(value: unknown): number {
  if (value === undefined || value === null || value === '') return currentYear();
  const y = Number(value);
  if (!Number.isInteger(y) || y < 2015 || y > 2100) throw new ToolError(`Ano inválido: ${value}.`);
  return y;
}

/** Medições, metas e denominadores do órgão (com cálculo automático e consolidado). */
function scopeOf(org: Organization) {
  const d = db();
  const measurements = scopeMeasurements(org.id, d.measurements, d.indicators, d.organizations);
  const targets = scopeTargets(org.id, d.targets).map(t =>
    resolveTarget(t, d.indicators.find(i => i.id === t.indicatorId), measurements)
  );
  return { measurements, targets, ...orgDenominators(org.id, d.organizations) };
}

function performance(org: Organization, ind: Indicator, y: number, scoped = scopeOf(org)) {
  const target = scoped.targets.find(t => t.indicatorId === ind.id && t.year === y);
  return { target, result: calculateIndicatorPerformance(ind, scoped.measurements, target, y, scoped.areaM2, scoped.ftt) };
}

const indicatorSummary = (i: Indicator) => ({
  codigo: i.code,
  sigla: i.acronym || null,
  nome: i.name,
  unidade: i.unit,
  periodicidade: i.periodicity,
  preenchimento: isAutoIndicator(i)
    ? 'cálculo automático'
    : i.periodicity === 'MENSAL'
      ? 'mensal'
      : i.allowMonthlyEntry
        ? 'anual ou mês a mês'
        : 'anual'
});

const STATUS_LABEL: Record<string, string> = {
  EM_CONFORMIDADE: 'em conformidade',
  META_ATINGIDA: 'meta atingida',
  ATENCAO: 'atenção',
  RISCO: 'risco',
  SEM_DADOS: 'sem dados',
  SEM_META: 'sem meta cadastrada',
  VARIAVEL_GERAL: 'variável geral (sem meta)'
};

const activeParts = (orgs: Organization[]) => orgs.filter(o => !o.isConsolidated && o.active !== false);

/** Tipo do órgão em linguagem clara (evita o modelo confundir o 2º Grau com o consolidado). */
const orgKind = (o: Organization) =>
  o.isConsolidated ? 'consolidado da 1ª Região (soma dos órgãos)' : o.type === 'SECAO_JUDICIARIA' ? 'seção judiciária (1º Grau)' : 'TRF1 — 2º Grau (Tribunal da 1ª Região; não é a 2ª Região)';

// -------------------------------------------------------------------------------- ferramentas

export const TOOLS: ToolDefinition[] = [
  {
    name: 'listar_orgaos',
    description: 'Lista os órgãos da 1ª Região no iPLS (seções judiciárias, 2º Grau e o consolidado regional), com sigla e tipo.',
    parameters: { type: 'object', properties: {} },
    handler: () =>
      db().organizations.map(o => ({
        sigla: o.acronym,
        nome: o.name,
        tipo: orgKind(o),
        ativo: o.active !== false
      }))
  },
  {
    name: 'buscar_indicadores',
    description:
      'Procura indicadores do PLS (Res. CNJ 400/2021) por palavra, tema ou forma de preenchimento. Use para descobrir o código/sigla antes de consultar valores.',
    parameters: {
      type: 'object',
      properties: {
        texto: { type: 'string', description: 'Palavra no nome, código ou sigla (ex.: energia, água, combustível, 6.1).' },
        tema: { type: 'integer', description: 'Número do tema (1 a 21).' },
        preenchimento: { type: 'string', enum: ['mensal', 'anual', 'automatico'], description: 'Filtra pela forma de preenchimento.' }
      }
    },
    handler: args => {
      const d = db();
      const q = args.texto ? norm(String(args.texto)) : '';
      const tema = args.tema ? `theme-${Number(args.tema)}` : null;
      const list = d.indicators.filter(i => {
        if (i.active === false) return false;
        if (tema && i.themeId !== tema) return false;
        if (args.preenchimento === 'automatico' && !isAutoIndicator(i)) return false;
        if (args.preenchimento === 'mensal' && (isAutoIndicator(i) || !acceptsMonthlyEntry(i))) return false;
        if (args.preenchimento === 'anual' && (isAutoIndicator(i) || i.periodicity !== 'ANUAL')) return false;
        if (q) {
          const theme = d.themes.find(t => t.id === i.themeId);
          return [i.code, i.acronym || '', i.name, theme?.name || ''].some(s => norm(s).includes(q));
        }
        return true;
      });
      return {
        total: list.length,
        indicadores: list.slice(0, 40).map(i => ({
          ...indicatorSummary(i),
          tema: d.themes.find(t => t.id === i.themeId)?.name,
          ...(isAutoIndicator(i) ? { formula: i.formula } : {})
        })),
        ...(list.length > 40 ? { aviso: 'Mostrando 40; refine a busca.' } : {})
      };
    }
  },
  {
    name: 'consultar_indicador',
    description:
      'Valores de um indicador para um órgão e exercício: definição, valor de cada mês (ou anual), total, meta e situação. No consolidado TRF1, informa quantos órgãos preencheram cada mês.',
    parameters: {
      type: 'object',
      properties: { orgao: ORG_PARAM, indicador: IND_PARAM, ano: YEAR_PARAM },
      required: ['orgao', 'indicador']
    },
    handler: args => {
      const org = findOrg(args.orgao);
      const ind = findIndicator(args.indicador);
      const y = year(args.ano);
      const scoped = scopeOf(org);
      const list = scoped.measurements.filter(m => m.indicatorId === ind.id && m.year === y).sort((a, b) => a.month - b.month);
      const { target, result } = performance(org, ind, y, scoped);
      const monthly = ind.periodicity === 'MENSAL' || list.some(m => m.isMonthlyEntry);
      const consolidated = isConsolidatedOrg(org.id, db().organizations);
      const expected = activeParts(db().organizations).length;
      return {
        orgao: org.acronym,
        tipo_orgao: orgKind(org),
        ano: y,
        indicador: { ...indicatorSummary(ind), definicao: ind.description, ...(ind.formula ? { formula: ind.formula } : {}) },
        valores: monthly
          ? list.map(m => ({
              mes: MESES[m.month - 1],
              valor: r(m.value, 4),
              ...(consolidated && m.reportingOrgIds ? { orgaos_informantes: `${m.reportingOrgIds.length} de ${expected}` } : {}),
              ...(m.notes && m.sourceType === 'calculated' && !consolidated ? { obs: m.notes } : {})
            }))
          : list.map(m => ({ anual: r(m.value, 4), ...(consolidated && m.reportingOrgIds ? { orgaos_informantes: `${m.reportingOrgIds.length} de ${expected}` } : {}) })),
        meses_informados: monthly ? result.monthsReported : undefined,
        total_no_exercicio: list.length ? r(result.accumulatedValue, 4) : null,
        ...(monthly && result.monthsReported > 0 && result.monthsReported < 12 ? { projecao_12_meses: r(result.annualProjection, 4) } : {}),
        meta: target ? r(result.targetValue, 4) : null,
        situacao: STATUS_LABEL[result.status] || result.status,
        motivo: result.statusReason,
        ...(list.length === 0 ? { aviso: 'Sem valores informados neste exercício.' } : {})
      };
    }
  },
  {
    name: 'situacao_indicadores',
    description:
      'Panorama dos indicadores de um órgão no exercício: realizado, meta e situação (em conformidade, atenção, risco, sem dados, sem meta). Use para perguntas como "quais indicadores estão em risco?".',
    parameters: {
      type: 'object',
      properties: {
        orgao: ORG_PARAM,
        ano: YEAR_PARAM,
        situacao: {
          type: 'string',
          enum: ['risco', 'atencao', 'conformidade', 'sem_dados', 'sem_meta', 'todas'],
          description: 'Filtra pela situação (padrão: todas com meta cadastrada).'
        },
        tema: { type: 'integer', description: 'Número do tema (1 a 21), opcional.' }
      },
      required: ['orgao']
    },
    handler: args => {
      const org = findOrg(args.orgao);
      const y = year(args.ano);
      const scoped = scopeOf(org);
      const want = String(args.situacao || '');
      const match: Record<string, string[]> = {
        risco: ['RISCO'],
        atencao: ['ATENCAO'],
        conformidade: ['EM_CONFORMIDADE', 'META_ATINGIDA'],
        sem_dados: ['SEM_DADOS'],
        sem_meta: ['SEM_META']
      };
      const rows = db().indicators
        .filter(i => i.active !== false && (!args.tema || i.themeId === `theme-${Number(args.tema)}`))
        .map(i => ({ i, ...performance(org, i, y, scoped) }))
        .filter(x =>
          want && want !== 'todas' ? (match[want] || []).includes(x.result.status) : !!x.target || want === 'todas'
        );
      const count = (s: string[]) => rows.filter(x => s.includes(x.result.status)).length;
      return {
        orgao: org.acronym,
        ano: y,
        resumo: {
          risco: count(['RISCO']),
          atencao: count(['ATENCAO']),
          conformidade: count(['EM_CONFORMIDADE', 'META_ATINGIDA']),
          sem_dados: count(['SEM_DADOS'])
        },
        indicadores: rows.slice(0, 35).map(x => ({
          codigo: x.i.code,
          sigla: x.i.acronym,
          nome: x.i.name,
          unidade: x.i.unit,
          realizado: x.result.monthsReported ? r(x.result.accumulatedValue, 4) : null,
          meses: x.i.periodicity === 'MENSAL' ? x.result.monthsReported : undefined,
          meta: x.target ? r(x.result.targetValue, 4) : null,
          situacao: STATUS_LABEL[x.result.status] || x.result.status
        })),
        ...(rows.length > 35 ? { aviso: `Mostrando 35 de ${rows.length}; filtre por situação ou tema.` } : {})
      };
    }
  },
  {
    name: 'comparar_anos',
    description: 'Total de um indicador em cada exercício de um intervalo de anos, para um órgão (evolução histórica).',
    parameters: {
      type: 'object',
      properties: {
        orgao: ORG_PARAM,
        indicador: IND_PARAM,
        ano_inicial: { type: 'integer', description: 'Primeiro ano (padrão: 2021).' },
        ano_final: { type: 'integer', description: 'Último ano (padrão: ano atual).' }
      },
      required: ['orgao', 'indicador']
    },
    handler: args => {
      const org = findOrg(args.orgao);
      const ind = findIndicator(args.indicador);
      const from = args.ano_inicial ? year(args.ano_inicial) : 2021;
      const to = year(args.ano_final);
      if (to < from || to - from > 15) throw new ToolError('Intervalo de anos inválido.');
      const scoped = scopeOf(org);
      const anos = [];
      for (let y = from; y <= to; y++) {
        const res = performance(org, ind, y, scoped).result;
        anos.push({
          ano: y,
          total: res.monthsReported ? r(res.accumulatedValue, 4) : null,
          ...(ind.periodicity === 'MENSAL' ? { meses_informados: res.monthsReported } : {})
        });
      }
      return { orgao: org.acronym, indicador: indicatorSummary(ind), anos };
    }
  },
  {
    name: 'comparar_orgaos',
    description:
      'Compara um indicador entre todos os órgãos da 1ª Região (seções e 2º Grau). Com um ano: total de cada órgão. ' +
      'Com ano_inicial e ano_final: série anual de cada órgão, variação % de um ano para o outro e a maior alta — use para ' +
      'perguntas como "quem teve salto/queda de consumo em 2024".',
    parameters: {
      type: 'object',
      properties: {
        indicador: IND_PARAM,
        ano: { ...YEAR_PARAM, description: 'Ano único (se não informar intervalo).' },
        ano_inicial: { type: 'integer', description: 'Primeiro ano do intervalo (ex.: 2021).' },
        ano_final: { type: 'integer', description: 'Último ano do intervalo (ex.: 2025).' },
        ano_destaque: {
          type: 'integer',
          description: 'Opcional: ordena os órgãos pela variação deste ano em relação ao anterior (ex.: 2024 para "salto em 2024").'
        }
      },
      required: ['indicador']
    },
    handler: args => {
      const ind = findIndicator(args.indicador);
      const orgs = db().organizations.filter(o => !o.isConsolidated);
      const monthly = ind.periodicity === 'MENSAL';
      if (!args.ano_inicial && !args.ano_final) {
        const y = year(args.ano);
        const linhas = orgs
          .map(o => {
            const res = performance(o, ind, y).result;
            return {
              orgao: o.acronym,
              tipo: orgKind(o),
              total: res.monthsReported ? r(res.accumulatedValue, 4) : null,
              ...(monthly ? { meses_informados: res.monthsReported } : {})
            };
          })
          .filter(l => l.total !== null || orgs.find(o => o.acronym === l.orgao)?.active !== false);
        return { indicador: indicatorSummary(ind), ano: y, orgaos: linhas };
      }

      const from = args.ano_inicial ? year(args.ano_inicial) : 2021;
      const to = args.ano_final ? year(args.ano_final) : currentYear();
      if (to <= from || to - from > 10) throw new ToolError('Intervalo de anos inválido (até 10 anos).');
      const destaque = args.ano_destaque ? year(args.ano_destaque) : null;
      if (destaque && (destaque <= from || destaque > to)) throw new ToolError('ano_destaque deve estar dentro do intervalo (e não ser o primeiro ano).');
      const pct = (a: number | null, b: number | null) => (a && b !== null && a > 0 ? Number((((b - a) / a) * 100).toFixed(1)) : null);
      const linhas = orgs
        .map(o => {
          const scoped = scopeOf(o);
          const serie: Record<string, number | null> = {};
          const meses: Record<string, number> = {};
          for (let y = from; y <= to; y++) {
            const res = performance(o, ind, y, scoped).result;
            serie[y] = res.monthsReported ? r(res.accumulatedValue, 4) : null;
            if (monthly && res.monthsReported && res.monthsReported < 12) meses[y] = res.monthsReported;
          }
          const variacao: Record<string, number | null> = {};
          let maior: { ano: number; pct: number } | null = null;
          for (let y = from + 1; y <= to; y++) {
            // Só compara anos completos (anos parciais distorcem a variação)
            const v = meses[y] || meses[y - 1] ? null : pct(serie[y - 1], serie[y]);
            variacao[y] = v;
            if (v !== null && (!maior || v > maior.pct)) maior = { ano: y, pct: v };
          }
          return {
            orgao: o.acronym,
            tipo: orgKind(o),
            ...(destaque ? { variacao_no_ano_destaque_pct: variacao[destaque] ?? null } : {}),
            totais: serie,
            variacao_pct_sobre_ano_anterior: variacao,
            maior_alta: maior,
            ...(Object.keys(meses).length ? { anos_parciais_meses_informados: meses } : {})
          };
        })
        .filter(l => Object.values(l.totais).some(v => v !== null));
      if (destaque) {
        linhas.sort((a, b) => ((b as any).variacao_no_ano_destaque_pct ?? -Infinity) - ((a as any).variacao_no_ano_destaque_pct ?? -Infinity));
      }
      const now = new Date();
      const anosCompletos = Array.from({ length: to - from + 1 }, (_, k) => from + k).filter(y => y < now.getFullYear());
      return {
        indicador: indicatorSummary(ind),
        anos: `${from}–${to}`,
        anos_completos: anosCompletos,
        ...(to >= now.getFullYear() ? { ano_em_andamento: now.getFullYear() } : {}),
        ...(destaque ? { ordenado_por: `variação de ${destaque} sobre ${destaque - 1} (maior primeiro)` } : {}),
        observacao: 'Variação só entre anos completos para o órgão; anos com meses faltando aparecem em anos_parciais_meses_informados.',
        orgaos: linhas
      };
    }
  },
  {
    name: 'pendencias_preenchimento',
    description:
      'Quem ainda não preencheu os indicadores mensais (lançados pelo órgão) até um mês do exercício. Sem indicador: resumo por órgão. Com indicador: meses faltantes de cada órgão.',
    parameters: {
      type: 'object',
      properties: {
        ano: YEAR_PARAM,
        ate_mes: { type: 'integer', description: 'Considera os meses de 1 até este (padrão: último mês encerrado).' },
        indicador: { ...IND_PARAM, description: 'Opcional: restringe a um indicador.' },
        orgao: { ...ORG_PARAM, description: 'Opcional: restringe a um órgão.' }
      }
    },
    handler: args => {
      const d = db();
      const y = year(args.ano);
      const now = new Date();
      const defaultMonth = y < now.getFullYear() ? 12 : Math.max(1, now.getMonth());
      const upTo = args.ate_mes ? Math.min(12, Math.max(1, Number(args.ate_mes))) : defaultMonth;
      const inds = args.indicador
        ? [findIndicator(args.indicador)]
        : d.indicators.filter(i => i.active !== false && i.periodicity === 'MENSAL' && !isAutoIndicator(i));
      const orgs = args.orgao ? [findOrg(args.orgao)].filter(o => !o.isConsolidated) : activeParts(d.organizations);
      if (orgs.length === 0) throw new ToolError('Escolha uma seção judiciária ou o 2º Grau (o consolidado não recebe lançamentos).');
      const filled = new Set(
        d.measurements.filter(m => m.year === y && m.month <= upTo).map(m => `${orgIdOf(m)}|${m.indicatorId}|${m.month}`)
      );
      const months = Array.from({ length: upTo }, (_, k) => k + 1);
      const porOrgao = orgs.map(o => {
        const faltas = inds
          .map(i => ({ i, meses: months.filter(mo => !filled.has(`${o.id}|${i.id}|${mo}`)) }))
          .filter(x => x.meses.length > 0);
        const total = inds.length * months.length;
        const faltando = faltas.reduce((s, x) => s + x.meses.length, 0);
        return {
          orgao: o.acronym,
          tipo: orgKind(o),
          preenchido: `${total - faltando} de ${total} (indicador × mês)`,
          ...(args.indicador
            ? { meses_faltantes: (faltas[0]?.meses || []).map(mo => MESES[mo - 1]) }
            : { indicadores_com_falta: faltas.slice(0, 8).map(x => `${x.i.code} ${x.i.acronym || ''} (${x.meses.length} mês/meses)`) })
        };
      });
      return { ano: y, ate_mes: MESES[upTo - 1], indicadores_considerados: inds.length, orgaos: porOrgao };
    }
  },
  {
    name: 'planos_de_acao',
    description: 'Ações do Plano de Ação do PLS de um órgão (título, situação, percentual concluído, prazo, responsável).',
    parameters: {
      type: 'object',
      properties: { orgao: ORG_PARAM, texto: { type: 'string', description: 'Opcional: palavra no título.' } },
      required: ['orgao']
    },
    handler: args => {
      const org = findOrg(args.orgao);
      const q = args.texto ? norm(String(args.texto)) : '';
      const list = db().actionPlans.filter(
        a => (isConsolidatedOrg(org.id, db().organizations) || (a.organizationId || 'org-sjrr') === org.id) && (!q || norm(a.title).includes(q))
      );
      return {
        orgao: org.acronym,
        total: list.length,
        acoes: list.slice(0, 25).map(a => ({
          titulo: a.title,
          situacao: a.status,
          concluido_pct: a.percentageComplete,
          prazo: a.endDate,
          responsavel: a.responsibleUnit,
          indicadores: a.relatedIndicatorIds.map(id => db().indicators.find(i => i.id === id)?.code).filter(Boolean)
        }))
      };
    }
  },
  {
    name: 'alertas',
    description: 'Alertas de inconsistência dos dados de um órgão no exercício (picos de consumo, meses faltantes, valores estranhos).',
    parameters: { type: 'object', properties: { orgao: ORG_PARAM, ano: YEAR_PARAM }, required: ['orgao'] },
    handler: args => {
      const org = findOrg(args.orgao);
      const y = year(args.ano);
      const d = db();
      const dynamic = detectMeasurementInconsistencies(d.indicators, scopeOf(org).measurements, y);
      const stored = d.alerts.filter(a => !a.resolved && a.year === y && (!a.organizationId || a.organizationId === org.id));
      const rank = (s: string) => (s === 'CRITICA' ? 0 : s === 'ATENCAO' ? 1 : 2);
      const list = [...dynamic, ...stored].sort((a, b) => rank(a.severity) - rank(b.severity));
      return {
        orgao: org.acronym,
        ano: y,
        total: list.length,
        alertas: list.slice(0, 20).map(a => ({
          gravidade: a.severity,
          indicador: a.indicatorName,
          mes: a.month ? MESES[a.month - 1] : undefined,
          mensagem: a.message,
          acao_sugerida: a.suggestedAction
        }))
      };
    }
  },
  {
    name: 'ids',
    description: 'Índice de Desempenho de Sustentabilidade (IDS) do CNJ calculado pelo iPLS para um órgão e exercício, com a cobertura de indicadores.',
    parameters: { type: 'object', properties: { orgao: ORG_PARAM, ano: YEAR_PARAM }, required: ['orgao'] },
    handler: args => {
      const org = findOrg(args.orgao);
      const y = year(args.ano);
      const d = db();
      const res = calculateCNJIDS(scopeOf(org).measurements, y, {
        context: {
          indicators: d.indicators,
          complements: (d.idsComplements || []).filter(c => c.organizationId === org.id),
          organization: org
        }
      });
      return {
        orgao: org.acronym,
        ano: y,
        ids: res.hasScore ? r(res.idsScore, 3) : null,
        indicadores_com_dados: `${res.coverage.available} de ${res.coverage.total}`,
        regua:
          res.benchmark.status === 'OFICIAL'
            ? `limites nacionais oficiais de ${res.benchmark.limitsYear} (base do CNJ)`
            : res.benchmark.status === 'ULTIMO_BALANCO'
              ? `limites nacionais de ${res.benchmark.limitsYear} (último Balanço; os do ano saem depois)`
              : 'faixas provisórias',
        ...(res.published ? { ids_publicado_cnj: res.published.value, fonte_publicado: res.published.source } : {}),
        ...(org.type === 'SECAO_JUDICIARIA' ? { observacao: 'O CNJ não calcula IDS por seção; valor para comparação interna.' } : {}),
        notas_por_indicador: res.subIndicators.map(s => ({
          indicador: s.name,
          valor: s.available ? r(s.rawValue, 3) : null,
          unidade: s.unit,
          nota_0a1: r(s.normalizedValue, 3),
          peso: r(s.ahpWeight, 3),
          pontos_no_ids: s.contributionPoints
        })),
        observacoes: res.notes,
        ...(res.hasScore ? {} : { aviso: 'Dados insuficientes para calcular o IDS.' })
      };
    }
  },

  {
    name: 'inventario_gee',
    description:
      'Inventário de emissões de gases de efeito estufa (GHG Protocol) do órgão: escopos 1, 2 e 3, total, fontes ' +
      '(gasolina, etanol, diesel, gases refrigerantes, energia elétrica, viagens aéreas) com dado de atividade, fator e tCO2e, ' +
      'emissões evitadas pela geração própria, avisos e a série dos anos. Use para perguntas sobre emissões, carbono, ' +
      'descarbonização, neutralidade e o Programa Justiça Carbono Zero (Resolução CNJ 594/2024).',
    parameters: {
      type: 'object',
      properties: { orgao: ORG_PARAM, ano: YEAR_PARAM },
      required: ['orgao']
    },
    handler: args => {
      const org = findOrg(args.orgao);
      const y = year(args.ano);
      const d = db();
      const parts = org.isConsolidated ? activeParts(d.organizations).map(o => o.id) : [org.id];
      const scoped = parts.map(id => ({ id, ms: scopeMeasurements(id, d.measurements, d.indicators, d.organizations) }));
      const inventory = (yy: number): GHGYearInventory => {
        const inv = scoped.map(p => computeGHGInventory(p.ms, d.indicators, yy, p.id));
        return inv.length === 1 ? inv[0] : sumGHGInventories(inv, yy);
      };
      const years = [...new Set(scoped.flatMap(p => p.ms.map(m => m.year)))].filter(v => v >= 2021).sort((a, b) => a - b);
      const series = years.map(inventory).filter(hasGHGData);
      const inv = inventory(y);
      const t = (v: number | null) => r(v, 2);
      const travel = (d.travelStats || []).filter(s => s.year === y && parts.includes(s.organizationId));
      const routes: Record<string, { trips: number; t: number }> = {};
      for (const s of travel) for (const [k, v] of Object.entries(s.byRoute)) {
        const x = (routes[k] ||= { trips: 0, t: 0 });
        x.trips += v.trips;
        x.t += v.t;
      }
      // Órgão que saiu de sistema isolado para o SIN: mostra o efeito da troca de fator no escopo 2
      const contexto: string[] = [];
      const energy = inv.lines.find(l => l.key === 'energia');
      for (const id of parts) {
        const iso = ISOLATED_SYSTEM_UNTIL[id];
        if (!iso) continue;
        const now = sinFactorFor(currentYear());
        if (y <= iso.until && energy?.activity && now.value != null && !org.isConsolidated) {
          contexto.push(
            `${iso.label}: a partir de ${iso.until + 1} o órgão é atendido pelo SIN. O mesmo consumo de ${y} ` +
              `(${Math.round(energy.activity).toLocaleString('pt-BR')} kWh) emitiria cerca de ${r((energy.activity / 1000) * now.value, 1)} tCO2e ` +
              `com o fator do SIN (${now.value} tCO2/MWh, ${now.refYear}), contra ${r(inv.scope2, 1)} tCO2e no sistema isolado: ` +
              'essa redução do escopo 2 acontece sem ação do órgão e deve ser descontada antes de planejar as demais.'
          );
        } else if (y <= iso.until) {
          contexto.push(`${iso.label}: a partir de ${iso.until + 1} o fator de energia passa a ser o do SIN, muito menor.`);
        }
      }
      return {
        orgao: org.acronym,
        tipo: orgKind(org),
        ano: y,
        ...(contexto.length ? { contexto } : {}),
        exercicio_parcial: inv.energyMonths > 0 && inv.energyMonths < 12 ? `exercício incompleto: energia lançada em ${inv.energyMonths} meses (total de meses do ano: 12)` : undefined,
        escopo1_tCO2e: t(inv.scope1),
        escopo2_tCO2e: t(inv.scope2),
        escopo3_tCO2e: t(inv.scope3),
        total_tCO2e: t(inv.total),
        arvores_equivalentes: inv.total ? Math.round(inv.total * TREES_PER_TCO2E) : null,
        co2_biogenico_t: t(inv.biogenic),
        fontes: inv.lines
          .filter(l => l.activity != null || l.tCO2e != null)
          .map(l => ({
            escopo: l.scope,
            fonte: l.source,
            atividade: r(l.activity, 0),
            unidade: l.activityUnit,
            fator: l.factor == null ? null : Number(l.factor.toPrecision(4)),
            unidade_fator: l.factorUnit,
            tCO2e: t(l.tCO2e),
            ...(l.excluded ? { fora_do_total: true } : {}),
            ...(l.warning ? { aviso: l.warning } : {})
          })),
        geracao_propria: inv.injectedKwh
          ? { energia_injetada_kWh: r(inv.injectedKwh, 0), emissoes_evitadas_tCO2: t(inv.avoidedTCO2e), observacao: 'informativo; não abate o escopo 2' }
          : undefined,
        viagens_trajetos_de_maior_emissao: Object.entries(routes)
          .sort((a, b) => b[1].t - a[1].t)
          .slice(0, 5)
          .map(([k, v]) => ({ trajeto: k, trechos: v.trips, tCO2e: t(v.t) })),
        informado_ao_cnj: { escopos1e2_tCO2e: t(inv.reported12), escopo3_tCO2e: t(inv.scope3Reported) },
        avisos: inv.warnings,
        serie: series.map(s => ({ ano: s.year, escopo1: t(s.scope1), escopo2: t(s.scope2), escopo3: t(s.scope3), total: t(s.total) })),
        metodologia: 'GHG Protocol (Ferramenta 2024.0.2); escopo 2 por localização (fator do SIN/MCTI ou do sistema isolado); escopo 3 = viagens aéreas.'
      };
    }
  }
];

/** Executa uma ferramenta pelo nome, com argumentos já decodificados. Erros viram {erro}. */
export function runTool(name: string, args: unknown): { ok: boolean; result: unknown } {
  const tool = TOOLS.find(t => t.name === name);
  if (!tool) return { ok: false, result: { erro: `Ferramenta desconhecida: ${name}` } };
  try {
    const a = args && typeof args === 'object' ? (args as Record<string, unknown>) : {};
    return { ok: true, result: tool.handler(a) };
  } catch (err: any) {
    const msg = err instanceof ToolError ? err.message : `Falha ao consultar: ${err?.message || err}`;
    if (!(err instanceof ToolError)) console.error(`[Agente] Erro na ferramenta ${name}:`, err);
    return { ok: false, result: { erro: msg } };
  }
}
