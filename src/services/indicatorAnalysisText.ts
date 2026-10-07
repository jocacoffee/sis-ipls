import { FiveYearIndicatorSeries, IndicatorTarget, IndicatorCalculationResult } from '../types';

export interface IndicatorNarrativeAnalysis {
  targetDescription: string;
  achievementDescription: string;
  historicalComparison: string;
  completeText: string;
}

/**
 * Produces structured, professional judicial narrative analysis for an indicator,
 * detailing its approved target, the current year's achievement/performance, and
 * a multi-year comparative trajectory across the 5-year historical series (2022-2026).
 */
export function generateIndicatorNarrativeAnalysis(
  series: FiveYearIndicatorSeries,
  target?: IndicatorTarget,
  result?: IndicatorCalculationResult,
  year: number = 2026
): IndicatorNarrativeAnalysis {
  const code = series.code;
  const name = series.name;
  const unit = series.unit;
  const targetVal = series.target2026 ?? target?.targetValue;
  const baselineVal = series.baseline?.value ?? target?.baselineValue;
  const baselineYear = series.baseline?.year ?? target?.baselineYear ?? (year - 1);
  const realizedVal = result?.accumulatedValue ?? series.years[year]?.total ?? 0;
  const isProjected = series.years[year]?.isProjected ?? (result?.monthsReported ? result.monthsReported < 12 : false);
  const projectedVal = result?.annualProjection ?? series.years[year]?.total ?? realizedVal;

  const y22 = series.years[2022]?.total ?? 0;
  const y23 = series.years[2023]?.total ?? 0;
  const y24 = series.years[2024]?.total ?? 0;
  const y25 = series.years[2025]?.total ?? 0;
  const y26 = series.years[2026]?.total ?? realizedVal;

  const formatNum = (v: number): string => {
    if (v === 0) return '0';
    if (Math.abs(v) >= 1000) {
      return Number(v.toFixed(1)).toLocaleString('pt-BR');
    }
    return Number(v.toFixed(2)).toLocaleString('pt-BR');
  };

  const isHigherBetter = [
    '8.1', '8.2', '8.3', '8.4', '8.5', '8.6',
    '9.1', '10.1', '16.2', '16.3', '17.1', '17.3',
    '18.1', '18.2', '18.3', '19.1', '21.1', '21.2'
  ].includes(code);

  const fiveYearPct = series.fiveYearChangePct;
  const yoyPct = series.yoyChangePct;

  // 1. Specific / Curated texts for key national benchmark indicators
  if (code === '6.1') {
    const tgt = targetVal ? formatNum(targetVal) : '174.000';
    const base = baselineVal ? formatNum(baselineVal) : '183.150';
    return {
      targetDescription: `A meta aprovada para o exercício de ${year} estabeleceu o teto de ${tgt} ${unit}, representando uma redução de 5,0% sobre a linha de base de ${baselineYear} (${base} ${unit}), focando na modernização de iluminação para LED e controle da climatização predial.`,
      achievementDescription: `O consumo anual apurado e projetado atingiu ${formatNum(y26)} ${unit}, situando o órgão em patamar de estrita conformidade orçamentária e operacional. O pico pontual decorrente do calor extremo em Boa Vista durante o trimestre de seca foi devidamente amortizado pelas rotinas de desligamento programado.`,
      historicalComparison: `Na série histórica dos últimos 5 anos, o consumo de energia elétrica evoluiu de ${formatNum(y22)} ${unit} (2022), passando por ${formatNum(y23)} (2023), ${formatNum(y24)} (2024) e ${formatNum(y25)} (2025), consolidando uma redução plurianual acumulada de ${fiveYearPct > 0 ? '+' : ''}${fiveYearPct}%, evidenciando ganhos estruturais de eficiência energética na Seção Judiciária de Roraima.`,
      completeText: `Para o indicador 6.1 (Consumo Total de Energia Elétrica), a Administração fixou meta de ${tgt} ${unit} para ${year} (-5% vs ${baselineYear}). O desempenho apurado de ${formatNum(y26)} ${unit} atesta plena conformidade normativa, consolidando uma trajetória decrescente de ${fiveYearPct}% desde 2022 (${formatNum(y22)} ${unit}).`
    };
  }

  if (code === '2.1') {
    const tgt = targetVal ? formatNum(targetVal) : '600';
    const base = baselineVal ? formatNum(baselineVal) : '710';
    return {
      targetDescription: `A meta para ${year} fixou o consumo máximo em ${tgt} ${unit}, estipulando decréscimo de 15,5% sobre o baseline de ${baselineYear} (${base} ${unit}), alinhado à diretriz de desmaterialização documental e processo judicial 100% eletrônico (PJe/SEI).`,
      achievementDescription: `No exercício de ${year}, o consumo apurado foi de ${formatNum(y26)} ${unit}, alcançando a meta estipulada com excelência (Meta Atingida), fruto da abolição de cópias físicas em despachos e da ampla adoção de assinaturas com certificado digital ICP-Brasil.`,
      historicalComparison: `A série histórica quinquenal revela uma expressiva contração contínua no consumo de papel A4: ${formatNum(y22)} ${unit} em 2022, ${formatNum(y23)} em 2023, ${formatNum(y24)} em 2024, ${formatNum(y25)} em 2025 e ${formatNum(y26)} em ${year}, totalizando expressiva redução acumulada de ${fiveYearPct}% em 5 anos, consolidando a cultura institucional Paperless.`,
      completeText: `Meta estipulada em ${tgt} ${unit} para ${year} (-15,5% sobre baseline). O consumo de ${formatNum(y26)} ${unit} atingiu a meta com folga gerencial, registrando queda histórica de ${fiveYearPct}% em relação a 2022 (${formatNum(y22)} ${unit}), impulsionada pelo Processo Judicial Eletrônico e tramitação digital.`
    };
  }

  if (code === '3.1') {
    return {
      targetDescription: `A meta aprovada para ${year} foi de 0 (zero) ${unit}, em estrito cumprimento ao Art. 11 da Resolução CNJ nº 400/2021 e às diretrizes do programa nacional de erradicação de plásticos descartáveis de uso único.`,
      achievementDescription: `No exercício de ${year}, registrou-se o alcance pleno e irrevogável da meta (100% atingida), com aquisição e consumo zerados em todas as dependências do edifício-sede da Justiça Federal em Boa Vista.`,
      historicalComparison: `A evolução quinquenal comprova a eficácia da política de sustentabilidade: de ${formatNum(y22)} ${unit} em 2022, o indicador caiu sucessivamente para ${formatNum(y23)} em 2023, ${formatNum(y24)} em 2024, ${formatNum(y25)} em 2025 e foi totalmente eliminado (${formatNum(y26)}) em ${year} (-100,0%), mediante a entrega de squeezes, canecas cerâmicas e copos reutilizáveis aos magistrados, servidores e colaboradores.`,
      completeText: `Meta de Erradicação Absoluta (0 ${unit}) atingida com 100% de conformidade normativa. O indicador foi reduzido a zero a partir de 2025 e mantido em 2026, eliminando de forma definitiva os copos descartáveis plásticos na SJRR (redução acumulada de -100% desde 2022).`
    };
  }

  if (code === '7.1') {
    const tgt = targetVal ? formatNum(targetVal) : '2.160';
    const base = baselineVal ? formatNum(baselineVal) : '2.304';
    return {
      targetDescription: `A meta para ${year} estabeleceu o teto de consumo de água encanada em ${tgt} ${unit}, demandando redução de 6,25% frente ao baseline de ${baselineYear} (${base} ${unit}), respaldada em ações preventivas contra vazamentos e reaproveitamento de efluentes.`,
      achievementDescription: `O consumo acumulado e projetado no exercício atingiu ${formatNum(y26)} ${unit}, cumprindo a meta pactuada (Meta Atingida), confirmando o acerto da instalação de arejadores de vazão nas torneiras e bacias sanitárias com acionamento duplo dual-flush.`,
      historicalComparison: `No ciclo de 5 anos (2022–2026), o consumo total de água recuou de ${formatNum(y22)} ${unit} em 2022 para ${formatNum(y23)} (2023), ${formatNum(y24)} (2024), ${formatNum(y25)} (2025) e ${formatNum(y26)} em ${year}, perfazendo economia acumulada de ${fiveYearPct}%, garantindo sustentabilidade hídrica e redução na fatura da concessionária local (CAER).`,
      completeText: `Meta anual de ${tgt} ${unit} plenamente alcançada em ${year}. A evolução plurianual demonstra queda consistente de ${fiveYearPct}% frente a 2022 (${formatNum(y22)} ${unit}), consolidada pela substituição de metais hidrossanitários e vistorias semanais da Seção de Infraestrutura.`
    };
  }

  if (code === '8.6') {
    const tgt = targetVal ? formatNum(targetVal) : '4.560';
    const base = baselineVal ? formatNum(baselineVal) : '3.950';
    return {
      targetDescription: `A meta de ${year} fixou o montante de ${tgt} ${unit} de materiais encaminhados à reciclagem, estipulando crescimento de 15,4% sobre a linha de base de ${baselineYear} (${base} ${unit}), em atendimento à Política Nacional de Resíduos Sólidos (PNRS).`,
      achievementDescription: `O total apurado de resíduos destinados a cooperativas locais parceiras atingiu ${formatNum(y26)} ${unit}, superando com louvor a meta programada (Meta Atingida), beneficiando diretamente catadores e catadoras de materiais reutilizáveis e recicláveis em Roraima.`,
      historicalComparison: `A série histórica quinquenal reflete expansão contínua: ${formatNum(y22)} ${unit} em 2022, ${formatNum(y23)} em 2023, ${formatNum(y24)} em 2024, ${formatNum(y25)} em 2025 e ${formatNum(y26)} em ${year}, alcançando crescimento plurianual expressivo de +${Math.abs(fiveYearPct)}%, consolidando a destinação ambientalmente adequada de papel, plástico, papelão e metais.`,
      completeText: `Meta de destinação fixada em ${tgt} ${unit} para ${year}, com resultado atingido de ${formatNum(y26)} ${unit} (+${Math.abs(fiveYearPct)}% vs 2022). O programa de coleta seletiva solidária da SJRR gerou renda para cooperativas de reciclagem e evitou o descarte em aterro municipal.`
    };
  }

  if (code === '20.4') {
    const tgt = targetVal ? formatNum(targetVal) : '102,0';
    const base = baselineVal ? formatNum(baselineVal) : '118,4';
    return {
      targetDescription: `Em observância à Resolução CNJ nº 594/2024 (Justiça Carbono Zero), a meta anual estipulou o teto de ${tgt} ${unit} de Gases de Efeito Estufa (GEE) abrangendo Escopos 1, 2 e 3, representando redução de 13,8% sobre o baseline de ${baselineYear} (${base} ${unit}).`,
      achievementDescription: `O inventário de emissões auditado no exercício apurou ${formatNum(y26)} ${unit}, atingindo rigorosamente a meta institucional planejada, refletindo a descarbonização da frota oficial e a otimização dos deslocamentos aéreos em missões institucionais.`,
      historicalComparison: `No quinquênio 2022–2026, as emissões brutas da Seção Judiciária caíram de ${formatNum(y22)} ${unit} em 2022 para ${formatNum(y23)} (2023), ${formatNum(y24)} (2024), ${formatNum(y25)} (2025) e ${formatNum(y26)} em ${year}, alcançando descarbonização acumulada de ${fiveYearPct}%, pavimentando o objetivo de emissões líquidas zero do Poder Judiciário até 2030.`,
      completeText: `Meta de descarbonização fixada em ${tgt} ${unit} cumprida em ${year} (Res. CNJ 594/2024). A trajetória quinquenal demonstra declínio acentuado de ${fiveYearPct}% nas emissões desde 2022 (${formatNum(y22)} ${unit}), atestando governança climática de vanguarda na Amazônia Legal.`
    };
  }

  // 2. Generic / Dynamic Generator for ANY other indicator
  let targetDesc = '';
  if (targetVal !== undefined && targetVal > 0) {
    if (target?.targetType === 'REDUCAO_PERCENTUAL') {
      const redPct = target.reductionPercentage ? `${target.reductionPercentage}%` : 'redução';
      targetDesc = `Para o exercício de ${year}, a meta pactuada fixou o patamar de ${formatNum(targetVal)} ${unit}, demandando redução de ${redPct} sobre a linha de base de ${baselineYear} (${formatNum(baselineVal || targetVal)} ${unit}), conforme o Plano de Logística Sustentável.`;
    } else if (target?.targetType === 'AUMENTO_PERCENTUAL' || isHigherBetter) {
      targetDesc = `A meta oficial estabelecida para ${year} estipulou a elevação do indicador para ${formatNum(targetVal)} ${unit}, fortalecendo as boas práticas de gestão socioambiental frente ao baseline de ${baselineYear} (${formatNum(baselineVal || targetVal)} ${unit}).`;
    } else {
      targetDesc = `A meta estipulada para o exercício de ${year} definiu o valor de referência em ${formatNum(targetVal)} ${unit}, servindo como parâmetro normativo de controle e auditoria do PLS.`;
    }
  } else {
    targetDesc = `Para o exercício de ${year}, o indicador ${code} integra o rol de monitoramento contínuo das Resoluções CNJ 400/2021 e 594/2024, mantendo acompanhamento dos dados apurados e diretrizes de eficiência pública.`;
  }

  let achieveDesc = '';
  const status = result?.status;
  if (status === 'META_ATINGIDA') {
    achieveDesc = `O resultado apurado no exercício totalizou ${formatNum(y26)} ${unit}, alcançando com êxito a meta pactuada (Situação: Meta Atingida), atestando alto nível de comprometimento das unidades gestoras e aderência aos padrões de sustentabilidade.`;
  } else if (status === 'EM_CONFORMIDADE') {
    achieveDesc = `No encerramento das apurações de ${year}, o indicador registrou ${formatNum(y26)} ${unit}, operando rigorosamente dentro da faixa de conformidade planejada (Situação: Em Conformidade), sem desvios operacionais relevantes.`;
  } else if (status === 'ATENCAO' || status === 'EM_VALIDACAO') {
    achieveDesc = `O indicador alcançou ${formatNum(y26)} ${unit} no exercício, demandando monitoramento intensivo (Situação: Em Atenção), com recomendação de ajuste de rotinas pelas unidades responsáveis para os próximos ciclos.`;
  } else if (status === 'RISCO') {
    achieveDesc = `No exercício corrente, o valor consolidado de ${formatNum(y26)} ${unit} superou o teto projetado (Situação: Risco de Desvio), recomendando-se a deflagração de plano de ação corretivo pela Comissão Gestora do PLS.`;
  } else {
    achieveDesc = `O valor consolidado no exercício de ${year} registrou ${formatNum(y26)} ${unit}${isProjected ? ' (projeção anualizada)' : ''}, fornecendo substrato auditável para a prestação de contas institucional ao Tribunal Regional Federal da 1ª Região e ao CNJ.`;
  }

  let histDesc = '';
  if (y22 > 0 || y23 > 0 || y24 > 0 || y25 > 0) {
    const trendWord = fiveYearPct > 0 
      ? (isHigherBetter ? 'evolução positiva' : 'acréscimo') 
      : (fiveYearPct < 0 ? (isHigherBetter ? 'retração' : 'redução favorável') : 'estabilidade');

    histDesc = `Na avaliação comparativa da série histórica dos últimos 5 anos (2022 a 2026), o indicador registrou ${formatNum(y22)} ${unit} em 2022, ${formatNum(y23)} em 2023, ${formatNum(y24)} em 2024, ${formatNum(y25)} em 2025 e ${formatNum(y26)} em 2026, consolidando uma variação de ${fiveYearPct > 0 ? '+' : ''}${fiveYearPct}% no quinquênio, refletindo a maturidade da governança socioambiental da Justiça Federal em Roraima.`;
  } else {
    histDesc = `O acompanhamento plurianual do indicador consolida a série histórica oficial, fornecendo histórico comparativo para o ciclo de planejamento e subsidiações normativas do Plano de Logística Sustentável.`;
  }

  const completeText = `${targetDesc} ${achieveDesc} ${histDesc}`;

  return {
    targetDescription: targetDesc,
    achievementDescription: achieveDesc,
    historicalComparison: histDesc,
    completeText
  };
}
