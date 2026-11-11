/**
 * Textos do Relatório Anual montados a partir dos dados do órgão selecionado
 * (seção judiciária, TRF1 2º grau ou consolidado da 1ª Região).
 * Só usa números que estão no sistema; quando não há dado, diz isso.
 */
import type {
  ActionPlan,
  AnnualReportSection,
  IDSComplement,
  Indicator,
  IndicatorCalculationResult,
  IndicatorMeasurement,
  IndicatorTarget,
  Organization
} from '../types';
import { calculateCNJIDS, scopeForOrganization } from './idsCalculator';

export const TRF1_2G_ORG_ID = 'org-trf1-2g';

/** Rótulos institucionais do órgão (cabeçalho, assinatura, nome de arquivo). */
export function reportOrgLabels(org: Organization | undefined, organizationName: string) {
  const acronym = (org?.acronym || organizationName || 'iPLS').trim();
  const fileTag = acronym.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'iPLS';
  if (org?.isConsolidated) {
    return {
      acronym,
      fileTag,
      letterhead: 'JUSTIÇA FEDERAL DA 1ª REGIÃO — CONSOLIDADO REGIONAL',
      scopeText: 'da Justiça Federal da 1ª Região (consolidado das seções judiciárias e do TRF1 2º grau)',
      directionRole: 'Diretoria-Geral — TRF1'
    };
  }
  if (org?.id === TRF1_2G_ORG_ID) {
    return {
      acronym,
      fileTag,
      letterhead: 'TRIBUNAL REGIONAL FEDERAL DA 1ª REGIÃO — 2º GRAU',
      scopeText: 'do Tribunal Regional Federal da 1ª Região (2º grau)',
      directionRole: 'Diretoria-Geral — TRF1'
    };
  }
  const name = org?.name || organizationName;
  return {
    acronym,
    fileTag,
    letterhead: `JUSTIÇA FEDERAL — ${name.toUpperCase()}`,
    scopeText: `da ${name}`,
    directionRole: `Direção do Foro — ${acronym}`
  };
}

type Performance = { indicator: Indicator; target?: IndicatorTarget; result: IndicatorCalculationResult };

interface BuildArgs {
  organization?: Organization;
  organizationName: string;
  year: number;
  indicators: Indicator[];
  measurements: IndicatorMeasurement[];
  performances: Performance[];
  actionPlans: ActionPlan[];
  idsComplements?: IDSComplement[];
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const fmt = (v: number, digits = 0) => v.toLocaleString('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
const fmtPct = (v: number) => `${v > 0 ? '+' : ''}${v.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;

/** Indicadores-chave somáveis usados nos destaques (grupos de siglas somadas). */
const KEY_GROUPS: { label: string; acronyms: string[]; unit: string; lowerIsBetter: boolean }[] = [
  { label: 'Energia elétrica (CEE)', acronyms: ['CEE'], unit: 'kWh', lowerIsBetter: true },
  { label: 'Água (CA)', acronyms: ['CA'], unit: 'm³', lowerIsBetter: true },
  { label: 'Papel próprio (CPP)', acronyms: ['CPP'], unit: 'resmas', lowerIsBetter: true },
  { label: 'Copos descartáveis (CC)', acronyms: ['CC'], unit: 'centos', lowerIsBetter: true },
  { label: 'Impressões (QI)', acronyms: ['QI'], unit: 'impressões', lowerIsBetter: true },
  { label: 'Combustíveis (CG + CE + CD)', acronyms: ['CG', 'CE', 'CD'], unit: 'litros', lowerIsBetter: true },
  { label: 'Quilometragem da frota (Km)', acronyms: ['Km'], unit: 'km', lowerIsBetter: true }
];

export function buildAnnualReportSections(args: BuildArgs): AnnualReportSection[] {
  const { organization, organizationName, year, indicators, measurements, performances, actionPlans } = args;
  const labels = reportOrgLabels(organization, organizationName);
  const byAcronym = new Map(indicators.filter(i => i.acronym).map(i => [i.acronym!, i]));

  const idsOf = (acronyms: string[]) =>
    new Set(acronyms.map(a => byAcronym.get(a)?.id).filter((x): x is string => Boolean(x)));
  const sum = (ids: Set<string>, y: number, upToMonth = 12) =>
    measurements
      .filter(m => ids.has(m.indicatorId) && m.year === y && m.month <= upToMonth)
      .reduce((a, m) => a + Number(m.value || 0), 0);
  const has = (ids: Set<string>, y: number) => measurements.some(m => ids.has(m.indicatorId) && m.year === y);

  // Exercício parcial: último mês com dado nos indicadores mensais do ano
  const monthlyIds = new Set(indicators.filter(i => i.periodicity === 'MENSAL').map(i => i.id));
  const lastMonth = measurements
    .filter(m => m.year === year && monthlyIds.has(m.indicatorId))
    .reduce((a, m) => Math.max(a, m.month), 0);
  const partial = lastMonth > 0 && lastMonth < 12;
  const yearRows = measurements.filter(m => m.year === year);
  const indicatorsWithData = new Set(yearRows.map(m => m.indicatorId)).size;
  const manualRows = yearRows.filter(m => m.sourceType === 'manual').length;

  // ---------- 1. Apresentação
  const s1 =
    `O presente Relatório Anual de Acompanhamento do Plano de Logística Sustentável (PLS) apresenta o desempenho socioambiental ${labels.scopeText} no exercício de ${year}, em observância ao Art. 22 da Resolução CNJ nº 400/2021 e às diretrizes do Programa Justiça Carbono Zero (Resolução CNJ nº 594/2024).\n\n` +
    `Os números deste relatório são os registrados no iPLS para ${labels.acronym}` +
    (organization?.isConsolidated ? ', obtidos pela soma das unidades nos indicadores somáveis' : '') +
    '. Percentuais, razões e índices não são somados entre unidades.';

  // ---------- 2. Metodologia
  const s2 =
    `Os dados provêm dos lançamentos realizados no iPLS (mensais ou anuais, conforme a periodicidade de cada indicador) e da carga inicial do Painel Unificado de Sustentabilidade da JF1, com a fonte anual do CNJ para as variáveis do IDS.\n\n` +
    (yearRows.length
      ? `No exercício de ${year}, ${fmt(indicatorsWithData)} indicadores têm lançamentos para ${labels.acronym}` +
        (partial ? `, com dados mensais até ${MONTHS[lastMonth - 1]} (exercício em curso)` : '') +
        (manualRows ? `; ${fmt(manualRows)} lançamentos foram feitos diretamente no sistema` : '') +
        '. Cada inclusão ou alteração fica registrada na trilha de auditoria.'
      : `Ainda não há lançamentos de ${year} para ${labels.acronym}.`);

  // ---------- 3. Desempenho do ano
  const yearLines: string[] = [];
  for (const g of KEY_GROUPS) {
    const ids = idsOf(g.acronyms);
    if (!ids.size || !has(ids, year)) continue;
    // Compara até o último mês com dado deste indicador no ano (mesmo período do ano anterior)
    const groupLast = measurements
      .filter(m => ids.has(m.indicatorId) && m.year === year)
      .reduce((a, m) => Math.max(a, m.month), 0);
    const cmpMonth = groupLast || 12;
    const cur = sum(ids, year, cmpMonth);
    const prev = sum(ids, year - 1, cmpMonth);
    const delta = prev > 0 ? ((cur - prev) / prev) * 100 : null;
    const period = cmpMonth < 12 ? `jan–${MONTHS[cmpMonth - 1].slice(0, 3)}` : '';
    yearLines.push(
      `• ${g.label}: ${fmt(cur)} ${g.unit}${period ? ` (${period})` : ''}` +
      (delta !== null ? `, ${fmtPct(delta)} em relação a ${year - 1}${period ? ' no mesmo período' : ''}` : '')
    );
  }
  const evaluated = performances.filter(p => !['SEM_META', 'VARIAVEL_GERAL', 'SEM_DADOS'].includes(p.result.status));
  const met = evaluated.filter(p => p.result.status === 'META_ATINGIDA' || p.result.status === 'EM_CONFORMIDADE').length;
  const attention = evaluated.filter(p => p.result.status === 'ATENCAO').length;
  const risk = evaluated.filter(p => p.result.status === 'RISCO');
  const s3 =
    (yearLines.length
      ? `Principais consumos de ${labels.acronym} em ${year}${partial ? ' (exercício em curso)' : ''}:\n${yearLines.join('\n')}` +
        (organization?.isConsolidated && partial
          ? '\n\nNo consolidado, o total do exercício em curso soma apenas as unidades que já lançaram os dados; enquanto houver unidades sem lançamento, as reduções em relação ao ano anterior aparecem maiores do que são.'
          : '')
      : `Não há dados de consumo de ${year} para ${labels.acronym} nos indicadores principais.`) +
    '\n\n' +
    (evaluated.length
      ? `Das ${evaluated.length} metas avaliadas no exercício, ${met} estão atingidas ou em conformidade, ${attention} em atenção e ${risk.length} em risco` +
        (risk.length ? ` (${risk.slice(0, 5).map(p => p.indicator.acronym || p.indicator.name).join(', ')}${risk.length > 5 ? '...' : ''})` : '') +
        '.'
      : `Não há metas cadastradas para ${labels.acronym} em ${year}; por isso, o cumprimento de metas não é avaliado neste exercício.`);

  // ---------- 4. Série histórica (últimos 5 anos)
  const firstYear = year - 4;
  const lastFullYear = partial ? year - 1 : year;
  const histLines: string[] = [];
  let improved = 0;
  let worsened = 0;
  for (const g of KEY_GROUPS) {
    const ids = idsOf(g.acronyms);
    if (!ids.size) continue;
    let base = 0;
    for (let y = firstYear; y <= lastFullYear; y++) {
      if (has(ids, y)) { base = y; break; }
    }
    if (!base || base >= lastFullYear) continue;
    const a = sum(ids, base);
    const b = sum(ids, lastFullYear);
    if (a <= 0) continue;
    const d = ((b - a) / a) * 100;
    if ((d < 0) === g.lowerIsBetter && Math.abs(d) >= 0.5) improved++;
    else if (Math.abs(d) >= 0.5) worsened++;
    histLines.push(`• ${g.label}: de ${fmt(a)} ${g.unit} em ${base} para ${fmt(b)} ${g.unit} em ${lastFullYear} (${fmtPct(d)})`);
  }
  const s4 = histLines.length
    ? `Evolução dos principais indicadores de ${labels.acronym} entre ${firstYear} e ${lastFullYear}${partial ? ` (${year} ainda em curso)` : ''}, conforme os gráficos deste capítulo:\n${histLines.join('\n')}`
    : `Não há série histórica suficiente para ${labels.acronym} nos indicadores principais entre ${firstYear} e ${lastFullYear}.`;

  // ---------- 5. Plano de ação
  const plans = organization?.isConsolidated
    ? actionPlans
    : actionPlans.filter(p => !p.organizationId || p.organizationId === organization?.id);
  const count = (s: string) => plans.filter(p => p.status === s).length;
  const s5 = plans.length
    ? `O plano de ação de ${labels.acronym} tem ${plans.length} ações cadastradas: ${count('CONCLUIDA')} concluídas, ${count('EM_ANDAMENTO')} em andamento, ${count('NAO_INICIADA')} não iniciadas, ${count('ATRASADA')} atrasadas e ${count('SUSPENSA')} suspensas.`
    : `Não há ações do plano de ação cadastradas no iPLS para ${labels.acronym}. As ações devem ser registradas no módulo Planos de Ação para constar deste relatório.`;

  // ---------- 6. Justiça Carbono Zero
  const ghgInds = indicators.filter(i =>
    i.themeId === 'theme-20' || /GEE|emiss/i.test(`${i.acronym || ''} ${i.name}`)
  );
  const ghgLines = ghgInds
    .map(i => {
      const rows = yearRows.filter(m => m.indicatorId === i.id);
      if (!rows.length) return null;
      const v = rows.reduce((a, m) => a + Number(m.value || 0), 0);
      return `• ${i.name}${i.acronym ? ` (${i.acronym})` : ''}: ${fmt(v, 2)} ${i.unit || ''}`.trim();
    })
    .filter((x): x is string => Boolean(x))
    .slice(0, 8);
  const s6 = ghgLines.length
    ? `Indicadores relacionados ao inventário e à redução de emissões de GEE registrados para ${labels.acronym} em ${year}:\n${ghgLines.join('\n')}`
    : `Não há dados de emissões de GEE lançados para ${labels.acronym} em ${year}. O inventário anual (Escopos 1, 2 e 3) exigido pela Resolução CNJ nº 594/2024 deve ser registrado no iPLS.`;

  // ---------- 7. Conclusão (IDS)
  const context = { indicators, complements: args.idsComplements || [], organization };
  const scope = scopeForOrganization(organization);
  const ids = calculateCNJIDS(measurements, year, { scope, context });
  const idsPrev = calculateCNJIDS(measurements, year - 1, { scope, context });
  const idsText = ids.hasScore
    ? `O Índice de Desempenho de Sustentabilidade (IDS) estimado para ${labels.acronym} em ${year} é de ${fmt(ids.idsScore, 1)}% (${ids.classification.label}), com ${ids.coverage.available} de ${ids.coverage.total} indicadores com dados` +
      (idsPrev.hasScore ? `, ante ${fmt(idsPrev.idsScore, 1)}% em ${year - 1}` : '') +
      '. A estimativa usa faixas de referência provisórias até a divulgação dos limites nacionais pelo CNJ.'
    : `Não há dados suficientes para estimar o IDS de ${labels.acronym} em ${year}.`;
  const s7 =
    idsText +
    (histLines.length
      ? `\n\nNa série histórica, ${improved} dos ${histLines.length} indicadores principais evoluíram favoravelmente e ${worsened} pioraram.`
      : '') +
    (risk.length
      ? ` Recomenda-se priorizar no próximo exercício os indicadores com meta em risco: ${risk.slice(0, 5).map(p => p.indicator.name).join('; ')}.`
      : ' Recomenda-se manter o lançamento mensal regular e cadastrar metas para os indicadores sem meta definida.');

  return [
    { id: 1, title: '1. Apresentação e Compromisso Institucional', category: 'INSTITUCIONAL', statusBadge: labels.acronym, content: s1 },
    { id: 2, title: '2. Metodologia de Coleta e Integridade dos Dados', category: 'METODOLOGIA', statusBadge: `${fmt(indicatorsWithData)} indicadores com dados`, content: s2 },
    { id: 3, title: `3. Desempenho e Metas do Exercício (${year})`, category: 'DESEMPENHO', statusBadge: evaluated.length ? `${evaluated.length} metas avaliadas` : 'Sem metas cadastradas', content: s3 },
    { id: 4, title: `4. Série Histórica dos Últimos 5 Anos (${firstYear} a ${year})`, category: 'HISTORICO', statusBadge: 'Série quinquenal', content: s4 },
    { id: 5, title: '5. Execução do Plano de Ação', category: 'PLANO_ACAO', statusBadge: plans.length ? `${plans.length} ações` : 'Sem ações cadastradas', content: s5 },
    { id: 6, title: '6. Programa Justiça Carbono Zero (Resolução CNJ nº 594/2024)', category: 'DESCARBONIZACAO', statusBadge: 'CNJ 594/2024', content: s6 },
    { id: 7, title: '7. Conclusão e Recomendações', category: 'CONCLUSAO', statusBadge: ids.hasScore ? `IDS ${fmt(ids.idsScore, 1)}%` : 'IDS n.d.', content: s7 }
  ];
}
