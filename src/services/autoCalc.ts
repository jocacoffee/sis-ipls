import type { Indicator, IndicatorMeasurement } from '../types';

/**
 * Cálculo automático dos indicadores derivados (Res. CNJ nº 400/2021).
 *
 * Os indicadores com `automaticCalculation` são obtidos da fórmula oficial a partir das
 * variáveis lançadas pelo órgão (ex.: CRE = CEE / m²Total). Não aceitam lançamento manual.
 *
 * - Indicador MENSAL: um valor por mês. Variáveis mensais entram com o valor do mês;
 *   variáveis anuais (área, força de trabalho) entram com o valor do exercício.
 * - Indicador ANUAL: um valor no exercício (mês 12), com as variáveis totalizadas no ano.
 * - Somas aceitam parcelas ausentes (contam como zero, desde que haja ao menos uma);
 *   multiplicação e divisão exigem todos os termos e divisor diferente de zero.
 * - Sem dados suficientes, mantém-se o valor histórico importado (se houver).
 *
 * A função é idempotente: valores calculados antes (id "auto__…") são descartados e refeitos.
 */

export const AUTO_ID_PREFIX = 'auto__';

export const isAutoIndicator = (ind?: Pick<Indicator, 'automaticCalculation' | 'formula'> | null): boolean =>
  !!ind && !!ind.automaticCalculation && !!ind.formula;

// ---------------------------------------------------------------------------------------------
// Fórmulas: análise sintática (sem eval)

type Node =
  | { k: 'num'; v: number }
  | { k: 'var'; id: string }
  | { k: 'neg'; a: Node }
  | { k: 'op'; op: '+' | '-' | '*' | '/'; a: Node; b: Node };

const norm = (s: string) => s.toLowerCase().replace(/[\s_\-]/g, '');

function tokenize(expr: string): string[] | null {
  const tokens: string[] = [];
  const re = /\s*(?:(\d+(?:[.,]\d+)?)|([A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ0-9_²³]*)|([+\-*/×÷()]))/y;
  let pos = 0;
  while (pos < expr.length) {
    if (/^\s*$/.test(expr.slice(pos))) break;
    re.lastIndex = pos;
    const m = re.exec(expr);
    if (!m) return null;
    tokens.push(m[1] ?? m[2] ?? m[3]);
    pos = re.lastIndex;
  }
  return tokens;
}

function parse(tokens: string[], resolve: (name: string) => string | null): Node | null {
  let i = 0;
  let ok = true;
  const peek = () => tokens[i];
  const expr = (): Node => {
    let a = term();
    while (peek() === '+' || peek() === '-') {
      const op = tokens[i++] as '+' | '-';
      a = { k: 'op', op, a, b: term() };
    }
    return a;
  };
  const term = (): Node => {
    let a = factor();
    while (peek() === '*' || peek() === '/' || peek() === '×' || peek() === '÷') {
      const t = tokens[i++];
      a = { k: 'op', op: t === '*' || t === '×' ? '*' : '/', a, b: factor() };
    }
    return a;
  };
  const factor = (): Node => {
    const t = tokens[i++];
    if (t === undefined) { ok = false; return { k: 'num', v: 0 }; }
    if (t === '-') return { k: 'neg', a: factor() };
    if (t === '(') {
      const n = expr();
      if (tokens[i++] !== ')') ok = false;
      return n;
    }
    if (/^\d/.test(t)) return { k: 'num', v: Number(t.replace(',', '.')) };
    if (/^[+*/×÷)]$/.test(t)) { ok = false; return { k: 'num', v: 0 }; }
    const id = resolve(t);
    if (!id) ok = false;
    return { k: 'var', id: id || '' };
  };
  const n = expr();
  return ok && i === tokens.length ? n : null;
}

function compile(ind: Indicator, indicators: Indicator[]): Node | null {
  const rhs = (ind.formula || '').split('=').slice(-1)[0];
  const tokens = tokenize(rhs);
  if (!tokens || tokens.length === 0) return null;
  const deps = new Set(ind.dependencies || []);
  const pool = indicators.filter(i => i.id !== ind.id);
  const preferred = pool.filter(i => deps.has(i.code));
  const resolve = (name: string) => {
    const n = norm(name);
    const hit = (list: Indicator[]) => list.filter(i => i.acronym && norm(i.acronym) === n);
    const a = hit(preferred);
    if (a.length === 1) return a[0].id;
    const b = hit(pool);
    return b.length === 1 ? b[0].id : null;
  };
  return parse(tokens, resolve);
}

const compiledCache = new Map<string, Node | null>();

/** Árvore da fórmula do indicador (null se a fórmula não puder ser interpretada). */
export function compiledFormula(ind: Indicator, indicators: Indicator[]): Node | null {
  const key = `${ind.id}|${ind.formula}|${(ind.dependencies || []).join(',')}|${indicators.length}`;
  if (!compiledCache.has(key)) {
    const node = compile(ind, indicators);
    if (!node && typeof console !== 'undefined') {
      console.warn(`[autoCalc] Fórmula não interpretada para ${ind.code} ${ind.acronym || ''}: ${ind.formula}`);
    }
    compiledCache.set(key, node);
  }
  return compiledCache.get(key)!;
}

/** Indicadores usados na fórmula (ids). */
export function formulaInputs(ind: Indicator, indicators: Indicator[]): string[] {
  const out = new Set<string>();
  const walk = (n: Node | null) => {
    if (!n) return;
    if (n.k === 'var') out.add(n.id);
    else if (n.k === 'neg') walk(n.a);
    else if (n.k === 'op') { walk(n.a); walk(n.b); }
  };
  walk(compiledFormula(ind, indicators));
  return [...out];
}

function evaluate(n: Node, get: (id: string) => number | null): number | null {
  switch (n.k) {
    case 'num': return n.v;
    case 'var': return get(n.id);
    case 'neg': {
      const a = evaluate(n.a, get);
      return a === null ? null : -a;
    }
    case 'op': {
      const a = evaluate(n.a, get);
      const b = evaluate(n.b, get);
      if (n.op === '+' || n.op === '-') {
        if (a === null && b === null) return null;
        return n.op === '+' ? (a ?? 0) + (b ?? 0) : (a ?? 0) - (b ?? 0);
      }
      if (a === null || b === null) return null;
      if (n.op === '*') return a * b;
      return b === 0 ? null : a / b;
    }
  }
}

const round = (v: number) => Number(v.toPrecision(12));

// ---------------------------------------------------------------------------------------------

type PeriodInputs = { value: number | null; inputs: Record<string, number | null> };

const periodKey = (indId: string, year: number, month: number) => `${indId}|${year}|${month}`;

/**
 * Devolve as medições com os indicadores automáticos calculados.
 * `measurements` deve ser de um único órgão (o consolidado usa `consolidateAutoCalculations`).
 */
export function applyAutoCalculations(
  measurements: IndicatorMeasurement[],
  indicators: Indicator[]
): IndicatorMeasurement[] {
  return computeAuto(measurements, indicators).measurements;
}

function computeAuto(
  measurements: IndicatorMeasurement[],
  indicators: Indicator[]
): { measurements: IndicatorMeasurement[]; periods: Map<string, PeriodInputs> } {
  const periods = new Map<string, PeriodInputs>();
  const autos = indicators.filter(isAutoIndicator);
  if (autos.length === 0) return { measurements, periods };
  const autoIds = new Set(autos.map(i => i.id));
  const byId = new Map(indicators.map(i => [i.id, i]));

  // Valores lançados (e históricos importados) por indicador → ano → mês
  const base: IndicatorMeasurement[] = [];
  const stored = new Map<string, Map<number, IndicatorMeasurement[]>>();
  for (const m of measurements) {
    if (m.id.startsWith(AUTO_ID_PREFIX)) continue;
    base.push(m);
    let years = stored.get(m.indicatorId);
    if (!years) stored.set(m.indicatorId, (years = new Map()));
    const list = years.get(m.year);
    if (list) list.push(m); else years.set(m.year, [m]);
  }
  const years = [...new Set(base.map(m => m.year))].sort();

  const isMonthlySeries = (ind: Indicator, list: IndicatorMeasurement[]) =>
    ind.periodicity === 'MENSAL' || list.some(m => m.isMonthlyEntry);
  const annualOf = (list: IndicatorMeasurement[]) => (list.find(m => m.month === 12) || list[list.length - 1]).value;

  let fallbacks = new Set<string>();

  /** Valor lançado: mês específico (série mensal) ou total do exercício (month = null). */
  const storedValue = (indId: string, year: number, month: number | null): number | null => {
    const list = stored.get(indId)?.get(year);
    const ind = byId.get(indId);
    if (month !== null && ind && ind.periodicity === 'ANUAL' && !(list && isMonthlySeries(ind, list))) {
      // Variável anual (área, força de trabalho) num indicador mensal: valor do exercício.
      // Se ainda não informada (ou zerada), vale a do último exercício informado (até 5 anos antes).
      const current = list && list.length ? annualOf(list) : null;
      if (current) return current;
      for (let y = year - 1; y >= year - 5; y--) {
        const prev = stored.get(indId)?.get(y);
        if (prev && prev.length && !prev.some(m => m.isMonthlyEntry) && annualOf(prev)) {
          fallbacks.add(`${ind.acronym || ind.code} de ${y}`);
          return annualOf(prev);
        }
      }
      return current;
    }
    if (!list || list.length === 0) return null;
    if (month !== null && ind && isMonthlySeries(ind, list)) {
      const hit = list.find(m => m.month === month);
      return hit ? hit.value : null;
    }
    return list.reduce((s, m) => s + m.value, 0);
  };

  const memo = new Map<string, { v: number | null; notes: string[]; inputs: Record<string, number | null> }>();
  const visiting = new Set<string>();

  /** Valor calculado de um indicador automático (null = sem dados suficientes). */
  const computed = (ind: Indicator, year: number, month: number | null): number | null => {
    const key = `${ind.id}|${year}|${month}`;
    const hit = memo.get(key);
    if (hit) {
      hit.notes.forEach(n => fallbacks.add(n));
      return hit.v;
    }
    if (visiting.has(key)) return null; // fórmula circular
    visiting.add(key);
    const outer = fallbacks;
    fallbacks = new Set();
    const node = compiledFormula(ind, indicators);
    const inputs: Record<string, number | null> = {};
    let value: number | null = null;
    if (node) {
      const v = evaluate(node, id => (inputs[id] = valueOf(id, year, month)));
      value = v !== null && Number.isFinite(v) ? round(v) : null;
    }
    const notes = [...fallbacks];
    fallbacks = outer;
    notes.forEach(n => fallbacks.add(n));
    visiting.delete(key);
    memo.set(key, { v: value, notes, inputs });
    return value;
  };

  /** Valor de qualquer indicador no período (calculado, se automático; senão o lançado). */
  const valueOf = (indId: string, year: number, month: number | null): number | null => {
    const ind = byId.get(indId);
    if (ind && autoIds.has(indId)) {
      if (ind.periodicity === 'MENSAL') {
        if (month !== null) return computed(ind, year, month) ?? storedValue(indId, year, month);
        // Total do exercício de um indicador mensal calculado: soma dos meses
        let sum = 0; let any = false;
        for (let mm = 1; mm <= 12; mm++) {
          const v = computed(ind, year, mm) ?? storedValue(indId, year, mm);
          if (v !== null) { sum += v; any = true; }
        }
        return any ? sum : null;
      }
      return computed(ind, year, null) ?? storedValue(indId, year, null);
    }
    return storedValue(indId, year, month);
  };

  const now = new Date().toISOString();
  const result: IndicatorMeasurement[] = [];
  const orgId = base[0]?.organizationId;

  for (const m of base) {
    if (!autoIds.has(m.indicatorId)) result.push(m);
  }

  for (const ind of autos) {
    for (const year of years) {
      const months = ind.periodicity === 'MENSAL' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [12];
      for (const month of months) {
        const period = ind.periodicity === 'MENSAL' ? month : null;
        const v = computed(ind, year, period);
        const entry = memo.get(`${ind.id}|${year}|${period}`)!;
        if (v === null) {
          // Sem dados para calcular: preserva o histórico importado
          result.push(...(stored.get(ind.id)?.get(year)?.filter(m =>
            ind.periodicity === 'MENSAL' ? m.month === month : true
          ) || []));
          continue;
        }
        periods.set(periodKey(ind.id, year, month), { value: v, inputs: entry.inputs });
        result.push(autoRecord(ind, orgId, year, month, v, now,
          entry.notes.length ? `Ainda sem valor no exercício; usado: ${entry.notes.join(', ')}.` : undefined));
      }
    }
  }
  return { measurements: result, periods };
}

function autoRecord(
  ind: Indicator, orgId: string | undefined, year: number, month: number, value: number, now: string, notes?: string
): IndicatorMeasurement {
  return {
    id: `${AUTO_ID_PREFIX}${ind.id}__${year}__${month}`,
    indicatorId: ind.id,
    organizationId: orgId,
    year,
    month,
    value,
    unit: ind.unit,
    sourceType: 'calculated',
    sourceReference: `Cálculo automático: ${ind.formula}`,
    validationStatus: 'VALIDADO',
    confidenceScore: 100,
    ...(notes ? { notes } : {}),
    createdAt: now,
    updatedAt: now
  } as IndicatorMeasurement;
}

/**
 * Indicadores automáticos do consolidado regional: a fórmula é aplicada sobre a soma das
 * variáveis, considerando em cada período apenas os órgãos que têm todas as variáveis
 * (senão, ex.: QI de 12 órgãos ÷ FTT de 1 órgão daria uma razão sem sentido).
 */
export function consolidateAutoCalculations(
  measurementsByOrg: IndicatorMeasurement[][],
  indicators: Indicator[],
  consolidatedOrgId: string
): IndicatorMeasurement[] {
  const agg = new Map<string, { orgs: number; sums: Record<string, number | null> }>();
  for (const list of measurementsByOrg) {
    const { periods } = computeAuto(list, indicators);
    for (const [key, p] of periods) {
      let a = agg.get(key);
      if (!a) agg.set(key, (a = { orgs: 0, sums: {} }));
      a.orgs++;
      for (const [id, v] of Object.entries(p.inputs)) {
        if (v === null) { if (!(id in a.sums)) a.sums[id] = null; continue; }
        a.sums[id] = (a.sums[id] ?? 0) + v;
      }
    }
  }
  const byId = new Map(indicators.map(i => [i.id, i]));
  const now = new Date().toISOString();
  const out: IndicatorMeasurement[] = [];
  for (const [key, a] of agg) {
    const [indId, y, mo] = key.split('|');
    const ind = byId.get(indId);
    const node = ind && compiledFormula(ind, indicators);
    if (!ind || !node) continue;
    const v = evaluate(node, id => a.sums[id] ?? null);
    if (v === null || !Number.isFinite(v)) continue;
    out.push(autoRecord(ind, consolidatedOrgId, Number(y), Number(mo), round(v), now,
      `Consolidado: fórmula aplicada à soma das variáveis de ${a.orgs} órgão(s) com dados completos.`));
  }
  return out;
}
