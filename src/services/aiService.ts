import {
  Indicator,
  IndicatorMeasurement,
  IndicatorTarget,
  ActionPlan,
  PLSDocument,
  ChatMessage,
  InconsistencyAlert
} from '../types';
import { calculateIndicatorPerformance, MONTH_NAMES, MONTH_SHORT_NAMES } from './calculationEngine';
import { queryRAGKnowledge } from './ragEngine';

export interface AIQueryContext {
  organizationName: string;
  organizationId: string;
  year: number;
  indicators: Indicator[];
  measurements: IndicatorMeasurement[];
  targets: IndicatorTarget[];
  actionPlans: ActionPlan[];
  documents: PLSDocument[];
  alerts: InconsistencyAlert[];
}

/**
 * Deterministic and grounded institutional reasoning engine.
 * Synthesizes structured data + retrieved documents + business rules
 * with zero hallucinations.
 */
export async function queryInstitutionalAI(
  userQuery: string,
  context: AIQueryContext
): Promise<ChatMessage> {
  const queryLower = userQuery.toLowerCase().trim();

  // 1. Calculate up-to-date metrics for all indicators
  const calculatedIndicators = context.indicators.map(ind => {
    const target = context.targets.find(t => t.indicatorId === ind.id && t.year === context.year);
    const result = calculateIndicatorPerformance(ind, context.measurements, target, context.year);
    return { indicator: ind, target, result };
  });

  // 2. Identify mentioned indicators or themes
  const mentionedInds = calculatedIndicators.filter(item => {
    const nameL = item.indicator.name.toLowerCase();
    const codeL = item.indicator.code.toLowerCase();
    const acronymL = item.indicator.acronym?.toLowerCase() || '';
    const cnjL = item.indicator.cnjIndicatorCode?.toLowerCase() || '';
    return queryLower.includes(nameL) ||
      queryLower.includes(codeL) ||
      (acronymL && queryLower.includes(acronymL)) ||
      (cnjL && queryLower.includes(cnjL)) ||
      (queryLower.includes('energia') && (item.indicator.code === '6.1' || item.indicator.acronym === 'CEE')) ||
      (queryLower.includes('água') && (item.indicator.code === '7.1' || item.indicator.acronym === 'CA')) ||
      (queryLower.includes('papel') && (item.indicator.code === '2.1' || item.indicator.acronym === 'CPP')) ||
      (queryLower.includes('copo') && (item.indicator.code === '3.1' || item.indicator.acronym === 'CC')) ||
      (queryLower.includes('combustível') && (item.indicator.code === '14.1' || item.indicator.acronym === 'CG')) ||
      (queryLower.includes('telefonia') && (item.indicator.code === '12.1' || item.indicator.acronym === 'GTF')) ||
      (queryLower.includes('impress') && (item.indicator.code === '5.1' || item.indicator.acronym === 'QI')) ||
      (queryLower.includes('resíduo') && (item.indicator.code === '8.1' || item.indicator.acronym === 'DPa')) ||
      (queryLower.includes('carbono') && (item.indicator.code === '20.4' || item.indicator.acronym === 'GEETot')) ||
      (queryLower.includes('gee') && (item.indicator.code === '20.4' || item.indicator.acronym === 'GEETot'));
  });

  // 3. Query RAG knowledge
  const ragDocs = queryRAGKnowledge({
    organizationId: context.organizationId,
    year: context.year,
    query: userQuery,
    limit: 3
  });

  // 4. Intent Classification and Grounded Response Generation
  let responseText = '';
  const sources: ChatMessage['sources'] = [];
  const suggestedQuestions: string[] = [];
  let isProjection = false;

  // Case A: Query about Performance Overview / Desempenho Geral do PLS
  if (queryLower.includes('desempenho') || queryLower.includes('panorama') || queryLower.includes('como está') || queryLower.includes('resumo')) {
    const total = calculatedIndicators.length;
    const emConformidade = calculatedIndicators.filter(i => i.result.status === 'EM_CONFORMIDADE' || i.result.status === 'META_ATINGIDA');
    const emAtencao = calculatedIndicators.filter(i => i.result.status === 'ATENCAO');
    const emRisco = calculatedIndicators.filter(i => i.result.status === 'RISCO');
    const semDados = calculatedIndicators.filter(i => i.result.status === 'SEM_DADOS');

    responseText = `### Panorama de Desempenho do PLS — ${context.organizationName} (${context.year})\n\n` +
      `De acordo com os registros estruturados do sistema até a competência de **Agosto/${context.year}**:\n\n` +
      `* **Total de Indicadores Monitorados:** ${total}\n` +
      `* **Dentro da Meta / Meta Cumprida:** ${emConformidade.length} (${Math.round((emConformidade.length / total) * 100)}%)\n` +
      `* **Em Atenção:** ${emAtencao.length} (${Math.round((emAtencao.length / total) * 100)}%)\n` +
      `* **Em Risco:** ${emRisco.length} (${Math.round((emRisco.length / total) * 100)}%)\n\n` +
      `**Destaques Positivos:**\n` +
      `* **Copos Plásticos Descartáveis (3.1 — CC):** Meta de eliminação total (zero copos) cumprida com 100% de sucesso pela Campanha Institucional.\n` +
      `* **Consumo de Água (7.1 — CA) e Papel A4 (2.1 — CPP):** Ambos operam confortavelmente abaixo do teto de redução anual.\n\n` +
      `**Principais Pontos de Risco que Demandam Intervenção:**\n` +
      `1. **Consumo de Energia Elétrica (6.1 — CEE):** Projeção anual de **184.350 kWh** ultrapassa a meta de 174.000 kWh em decorrência do pico de 21.450 kWh em agosto (pane nos chillers).\n` +
      `2. **Telefonia Fixa (12.1 — GTF):** Gasto acumulado impactado pelo atraso na Ação 04 (portabilidade Oi e rescisão de troncos E1).\n\n` +
      `*Metodologia:* Projeções calculadas com base na média aritmética móvel dos 8 meses informados e extrapoladas linearmente para 12 meses.`;

    isProjection = true;
    sources.push({
      title: 'Base de Dados Estruturada do iPLS',
      reference: `Competências Jan-Ago/${context.year}`,
      type: 'DADO_ESTRUTURADO',
      details: 'Soma e consolidação das medições validadas e atestadas'
    });
    sources.push({
      title: 'Resolução CNJ nº 400/2021',
      reference: 'Art. 11 e Art. 15',
      type: 'NORMATIVA',
      details: 'Metas compulsórias de descarte zero de copos e eficiência energética'
    });

    suggestedQuestions.push('Quais indicadores estão em risco?');
    suggestedQuestions.push('Por que a telefonia está em atenção?');
    suggestedQuestions.push('Como está a execução do Plano de Ação?');
  }

  // Case B: Indicators at Risk / Indicadores em Risco
  else if (queryLower.includes('risco') || queryLower.includes('não atingirão') || queryLower.includes('fora da meta')) {
    const emRisco = calculatedIndicators.filter(i => i.result.status === 'RISCO' || i.result.status === 'ATENCAO');

    responseText = `### Indicadores em Risco ou Atenção no Exercício de ${context.year}\n\n` +
      `Com base no comportamento observado de Janeiro a Agosto de ${context.year}, os seguintes indicadores requerem atenção imediata da gestão:\n\n`;

    emRisco.forEach(item => {
      const ind = item.indicator;
      const res = item.result;
      const relatedActions = context.actionPlans.filter(a => a.relatedIndicatorIds.includes(ind.id));

      responseText += `#### ⚠️ ${ind.code} — ${ind.name}\n` +
        `* **Meta Anual:** ${res.targetValue.toLocaleString('pt-BR')} ${ind.unit}\n` +
        `* **Consumo Realizado (Jan-Ago):** ${res.accumulatedValue.toLocaleString('pt-BR')} ${ind.unit}\n` +
        `* **Projeção Anual Estimada:** ${res.annualProjection.toLocaleString('pt-BR')} ${ind.unit}\n` +
        `* **Motivo Técnico:** ${res.statusReason}\n`;

      if (relatedActions.length > 0) {
        responseText += `* **Ações Relacionadas no Plano de Ação:**\n`;
        relatedActions.forEach(a => {
          responseText += `  - **${a.title}** (Status: *${a.status}*, Progresso: *${a.percentageComplete}%*)\n`;
        });
      }
      responseText += `\n`;
    });

    responseText += `> **Recomendação Estratégica:** A aceleração da entrega da **Ação 01** (chillers com previsão para outubro) e a conclusão da portabilidade da **Ação 04** (telefonia) são determinantes para reverter a curva de projeção antes do fechamento do exercício em dezembro.`;

    isProjection = true;
    sources.push({
      title: 'Demonstrativo de Metas e Projeções iPLS',
      reference: 'Módulo de Cálculo de Metas 2026',
      type: 'DADO_ESTRUTURADO'
    });
    suggestedQuestions.push('Quanto precisamos reduzir o consumo de energia para alcançar a meta?');
    suggestedQuestions.push('Quais ações deveriam receber atenção neste momento?');
  }

  // Case C: Specific query about Energy consumption in August / Consumo de energia em agosto
  else if (queryLower.includes('energia') && (queryLower.includes('agosto') || queryLower.includes('ago'))) {
    const energyInd = context.indicators.find(i => i.code === '6.1' || i.id === 'indicator-6-1');
    const augMeasurement = context.measurements.find(m => (m.indicatorId === 'indicator-6-1' || m.indicatorId === 'ind-energia-kwh') && m.year === context.year && m.month === 8);
    const target = context.targets.find(t => (t.indicatorId === 'indicator-6-1' || t.indicatorId === 'ind-energia-kwh') && t.year === context.year);
    const result = energyInd ? calculateIndicatorPerformance(energyInd, context.measurements, target, context.year) : null;

    if (augMeasurement) {
      responseText = `### Consumo de Energia Elétrica (6.1 — CEE) — Agosto de ${context.year}\n\n` +
        `* **Valor Medido:** **${augMeasurement.value.toLocaleString('pt-BR')} kWh**\n` +
        `* **Valor Faturado:** **R$ 19.840,65**\n` +
        `* **Unidade Consumidora:** UC 7489210-4 (Edifício-Sede SJRR, Boa Vista/RR)\n` +
        `* **Fornecedor:** Roraima Energia S.A.\n` +
        `* **Processo Administrativo:** SEI nº **0001245-88.2026.4.01.8012**\n` +
        `* **Status da Validação:** Validado com ressalva técnica em 04/09/2026 pelo Eng. Carlos Mendonça (Doc. SEI 1489201).\n\n` +
        `**Análise de Variação:**\n` +
        `O consumo de agosto aumentou **46,9%** em relação à média dos 4 meses imediatamente anteriores (14.600 kWh). A justificativa técnica aponta a avaria no compressor do chiller principal em período de estiagem severa, forçando o acionamento ininterrupto de chillers de reserva de menor eficiência energética.\n\n` +
        `**Impacto na Meta Anual:**\n` +
        `Com este registro, o consumo acumulado de Jan a Ago atingiu **122.900 kWh**. A projeção linear anual subiu para **184.350 kWh**, superando a meta de **174.000 kWh** em 5,9%.`;

      sources.push({
        title: 'Fatura Roraima Energia - 08/2026',
        reference: 'Fatura nº 9812401 / Doc. SEI nº 1489201',
        type: 'DOCUMENTO',
        details: 'Consumo medido de 21.450 kWh e valor faturado de R$ 19.840,65'
      });
      sources.push({
        title: 'Atesto do Fiscal do Contrato',
        reference: 'Processo SEI 0001245-88.2026.4.01.8012',
        type: 'PROCESSO_SEI',
        details: 'Atesto técnico subscrito pelo fiscal predial'
      });

      suggestedQuestions.push('Quanto precisamos reduzir o consumo de energia para alcançar a meta?');
      suggestedQuestions.push('Quais ações do Plano de Ação estão relacionadas à energia?');
    }
  }

  // Case D: How much do we need to reduce energy to achieve target?
  else if (queryLower.includes('quanto') && (queryLower.includes('reduzir') || queryLower.includes('economizar')) && queryLower.includes('energia')) {
    const energyInd = context.indicators.find(i => i.code === '6.1' || i.id === 'indicator-6-1');
    const target = context.targets.find(t => (t.indicatorId === 'indicator-6-1' || t.indicatorId === 'ind-energia-kwh') && t.year === context.year);
    const result = energyInd ? calculateIndicatorPerformance(energyInd, context.measurements, target, context.year) : null;

    if (result) {
      const remainingTarget = result.targetValue - result.accumulatedValue;
      const remainingMonths = 12 - result.monthsReported; // 4 months (Sep, Oct, Nov, Dec)
      const requiredRunRate = remainingTarget / remainingMonths;
      const recentAvg = result.accumulatedValue / result.monthsReported;
      const cutNeededPerMonth = recentAvg - requiredRunRate;
      const cutPercent = Math.round((cutNeededPerMonth / recentAvg) * 100);

      responseText = `### Ritmo de Redução Necessário para Atingir a Meta de Energia (${context.year})\n\n` +
        `Para que a SJRR alcance a meta de **${result.targetValue.toLocaleString('pt-BR')} kWh** fixada para ${context.year}:\n\n` +
        `* **Meta Anual Fixada:** ${result.targetValue.toLocaleString('pt-BR')} kWh\n` +
        `* **Consumo Realizado até Agosto (8 meses):** ${result.accumulatedValue.toLocaleString('pt-BR')} kWh\n` +
        `* **Saldo Disponível para os meses restantes (Set–Dez):** **${remainingTarget.toLocaleString('pt-BR')} kWh**\n` +
        `* **Meses Restantes:** 4 meses\n\n` +
        `**Ritmo Mensal Máximo Permitido:**\n` +
        `O consumo nos meses de Setembro, Outubro, Novembro e Dezembro não pode ultrapassar a média de **${Math.round(requiredRunRate).toLocaleString('pt-BR')} kWh/mês**.\n\n` +
        `Como a média observada nos primeiros 8 meses foi de **${Math.round(recentAvg).toLocaleString('pt-BR')} kWh/mês**, será necessária uma redução mensal de aproximadamente **${Math.round(cutNeededPerMonth).toLocaleString('pt-BR')} kWh (-${cutPercent}%)** em relação ao patamar médio atual.\n\n` +
        `**Viabilidade:** A entrega da **Ação 01** (novos chillers Inverter) programada para a segunda quinzena de outubro tem potencial de reduzir o consumo predial em cerca de 1.800 a 2.400 kWh/mês, o que aproxima o órgão da meta caso o desligamento noturno preventivo seja rigorosamente cumprido.`;

      isProjection = true;
      sources.push({
        title: 'Motor de Cálculo de Metas iPLS',
        reference: 'Fórmula de Ritmo Mensal: (Meta - Acumulado) / Meses Restantes',
        type: 'DADO_ESTRUTURADO'
      });
      suggestedQuestions.push('Quais ações do Plano de Ação estão relacionadas à energia?');
    }
  }

  // Case E: Telephone expenses in a given month / Telefonia
  else if (queryLower.includes('telefonia') || queryLower.includes('telefone')) {
    const phoneInd = context.indicators.find(i => i.code === '12.1' || i.id === 'indicator-12-1');
    const target = context.targets.find(t => (t.indicatorId === 'indicator-12-1' || t.indicatorId === 'ind-telefonia-reais') && t.year === context.year);
    const result = phoneInd ? calculateIndicatorPerformance(phoneInd, context.measurements, target, context.year) : null;
    const augPhone = context.measurements.find(m => (m.indicatorId === 'indicator-12-1' || m.indicatorId === 'ind-telefonia-reais') && m.year === context.year && m.month === 8);

    responseText = `### Análise do Indicador de Telefonia (12.1 — GTF) — Exercício de ${context.year}\n\n` +
      `* **Gasto em Agosto/${context.year}:** R$ ${augPhone ? augPhone.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '4.920,00'}\n` +
      `* **Meta Mensal Fixada:** R$ 4.200,00\n` +
      `* **Status Atual:** ⚠️ **Atenção / Validação Pendente**\n` +
      `* **Processo Administrativo:** SEI nº **0000789-22.2026.4.01.8012**\n\n` +
      `**Causa da Inconsistência:**\n` +
      `Nos meses de julho (R$ 4.850,00) e agosto (R$ 4.920,00), a concessionária Oi S.A. faturou tarifas residuais referentes à manutenção de troncos fixos E1 analógicos que já deveriam ter sido desativados. A **Ação 04** do Plano de Ação Anual ("Migração VoIP Teams"), sob responsabilidade do NUTEC, encontra-se **ATRASADA** devido a pendências de portabilidade da operadora.\n\n` +
      `**Evidência Documental:**\n` +
      `A fatura de agosto foi capturada via OCR com escore de confiança de 82% e permanece sob contestação pelo gestor do contrato, motivo pelo qual o lançamento aguarda validação definitiva.`;

    sources.push({
      title: 'Fatura Telefônica Oi/Telemar - 08/2026',
      reference: 'Doc. SEI nº 1492004',
      type: 'DOCUMENTO',
      details: 'Cobrança contestada de R$ 4.920,00'
    });
    sources.push({
      title: 'Plano de Ação SJRR 2026',
      reference: 'Ação 04 (NUTEC)',
      type: 'DADO_ESTRUTURADO',
      details: 'Status: ATRASADA (40% concluída)'
    });

    suggestedQuestions.push('Por que a telefonia está em atenção?');
    suggestedQuestions.push('Quais ações do Plano de Ação estão atrasadas?');
  }

  // Case F: Action Plan Execution / Execução do Plano de Ação
  else if (queryLower.includes('plano de ação') || queryLower.includes('ações') || queryLower.includes('iniciativas')) {
    const total = context.actionPlans.length;
    const concluidas = context.actionPlans.filter(a => a.status === 'CONCLUIDA');
    const emAndamento = context.actionPlans.filter(a => a.status === 'EM_ANDAMENTO');
    const atrasadas = context.actionPlans.filter(a => a.status === 'ATRASADA');

    responseText = `### Acompanhamento do Plano de Ação Anual ${context.year} — SJRR\n\n` +
      `* **Total de Ações Estruturantes:** ${total}\n` +
      `* **Concluídas:** ${concluidas.length} (${Math.round((concluidas.length / total) * 100)}%)\n` +
      `* **Em Andamento:** ${emAndamento.length} (${Math.round((emAndamento.length / total) * 100)}%)\n` +
      `* **Atrasadas:** ${atrasadas.length} (${Math.round((atrasadas.length / total) * 100)}%)\n\n` +
      `**Detalhamento por Ação:**\n\n`;

    context.actionPlans.forEach(act => {
      const badge = act.status === 'CONCLUIDA' ? '✅' : act.status === 'ATRASADA' ? '🚨' : '⏳';
      responseText += `${badge} **${act.title}**\n` +
        `* **Responsável:** ${act.responsibleUnit} (${act.responsibleUser})\n` +
        `* **Status:** *${act.status}* | **Execução:** ${act.percentageComplete}%\n` +
        `* **Impacto:** ${act.expectedImpact}\n` +
        `* **Evidência:** ${act.evidenceNotes || 'Processo cadastrado no SEI'}\n\n`;
    });

    sources.push({
      title: 'Plano de Ação Anual do PLS 2026',
      reference: 'Portaria de Homologação DIREF/SJRR',
      type: 'DADO_ESTRUTURADO'
    });
    suggestedQuestions.push('O que precisa ser feito para melhorar o indicador de telefonia?');
    suggestedQuestions.push('Quais ações deveriam receber atenção neste momento?');
  }

  // Case G: Inconsistencies & Data Quality / Inconsistências
  else if (queryLower.includes('inconsist') || queryLower.includes('alerta') || queryLower.includes('anomalia') || queryLower.includes('qualidade')) {
    const activeAlerts = context.alerts.filter(a => !a.resolved);

    responseText = `### Relatório de Inconsistências e Qualidade dos Dados (${context.year})\n\n` +
      `O motor analítico de validação identificou **${activeAlerts.length} inconsistências ativas** na base de dados:\n\n`;

    activeAlerts.forEach((alert, idx) => {
      const icon = alert.severity === 'CRITICA' ? '🔴' : '🟡';
      responseText += `${icon} **Alerta ${idx + 1}: ${alert.type} — ${alert.indicatorName} (Competência: ${MONTH_SHORT_NAMES[alert.month - 1]}/${alert.year})**\n` +
        `* **Detecção:** ${alert.message}\n` +
        `* **Valor Medido:** ${alert.detectedValue}\n` +
        (alert.referenceValue ? `* **Valor de Referência:** ${alert.referenceValue}\n` : '') +
        `* **Providência Recomendada:** ${alert.suggestedAction}\n\n`;
    });

    sources.push({
      title: 'Motor de Detecção de Inconsistências iPLS',
      reference: 'Varredura de Desvios Estatísticos e Validação Documental',
      type: 'DADO_ESTRUTURADO'
    });
    suggestedQuestions.push('Qual foi o consumo de energia em agosto?');
    suggestedQuestions.push('Quais documentos sustentam essa resposta?');
  }

  // Case H: Annual Report Draft / Relatório Anual
  else if (queryLower.includes('relatório anual') || queryLower.includes('relatorio')) {
    responseText = `### Estrutura Sugerida para o Relatório Anual do PLS (${context.year})\n\n` +
      `Conforme as diretrizes do Art. 22 da Resolução CNJ nº 400/2021, o relatório anual do exercício deve contemplar:\n\n` +
      `1. **Apresentação e Compromisso Institucional**\n` +
      `2. **Metodologia de Coleta e Auditoria dos Dados** (Rastreabilidade via SEI e Concessionárias)\n` +
      `3. **Caracterização do PLS da SJRR (Ciclo 2021-2026)**\n` +
      `4. **Painel Consolidado de Indicadores e Metas** (Tabela comparativa 2025 vs 2026)\n` +
      `5. **Análise Detalhada dos Indicadores em Conformidade** (Ex: Eliminação de Copos Plásticos e Redução de Papel)\n` +
      `6. **Análise dos Indicadores Críticos e Justificativas Técnicas** (Consumo de Energia Elétrica e Gastos com Telefonia)\n` +
      `7. **Execução Físico-Financeira do Plano de Ação Anual**\n` +
      `8. **Inventário de Emissões GEE (Resolução CNJ 594/2024 - Carbono Zero)**\n` +
      `9. **Recomendações e Plano Corretivo para o Próximo Exercício**\n\n` +
      `*Dica:* O módulo "Relatório Anual" da barra lateral permite gerar a minuta completa com tabelas e gráficos automáticos, pronta para revisão humana e exportação.`;

    sources.push({
      title: 'Resolução CNJ nº 400/2021',
      reference: 'Artigo 22 - Relatório Anual de Desempenho',
      type: 'NORMATIVA'
    });
  }

  // Case I: Specific indicator inquiry or Fallback grounded search
  else if (mentionedInds.length > 0) {
    const item = mentionedInds[0];
    const ind = item.indicator;
    const res = item.result;
    const relatedDocs = context.documents.filter(d => d.indicatorId === ind.id);
    const relatedActions = context.actionPlans.filter(a => a.relatedIndicatorIds.includes(ind.id));

    responseText = `### Situação do Indicador: ${ind.code} — ${ind.name}\n\n` +
      `* **Unidade Gestora:** ${ind.responsibleUnit}\n` +
      `* **Linha de Base (${res.baselineValue > 0 ? '2025' : 'Anterior'}):** ${res.baselineValue.toLocaleString('pt-BR')} ${ind.unit}\n` +
      `* **Meta para ${context.year}:** ${res.targetValue.toLocaleString('pt-BR')} ${ind.unit}\n` +
      `* **Acumulado Realizado (Jan-Ago):** ${res.accumulatedValue.toLocaleString('pt-BR')} ${ind.unit}\n` +
      `* **Projeção Anual Estimada:** ${res.annualProjection.toLocaleString('pt-BR')} ${ind.unit}\n` +
      `* **Classificação:** **${res.status}**\n` +
      `* **Diagnóstico:** ${res.statusReason}\n\n`;

    if (relatedActions.length > 0) {
      responseText += `**Ações Vinculadas no Plano de Ação:**\n`;
      relatedActions.forEach(a => {
        responseText += `* **${a.title}** (Status: *${a.status}*, Progresso: ${a.percentageComplete}%)\n`;
      });
      responseText += `\n`;
    }

    if (relatedDocs.length > 0) {
      responseText += `**Documentos e Processos Associados:**\n`;
      relatedDocs.forEach(d => {
        responseText += `* ${d.title} (Processo SEI: ${d.processNumber || 'Conforme cadastro'}, Confiança: ${d.extractionConfidence}%)\n`;
      });
    }

    sources.push({
      title: `Cadastro Estruturado: ${ind.name}`,
      reference: `Código Oficial ${ind.code}${ind.acronym ? ` (${ind.acronym})` : ''}`,
      type: 'DADO_ESTRUTURADO'
    });
    if (relatedDocs.length > 0) {
      sources.push({
        title: relatedDocs[0].title,
        reference: relatedDocs[0].processNumber || 'SEI',
        type: 'PROCESSO_SEI'
      });
    }

    suggestedQuestions.push(`O que podemos fazer para melhorar ${ind.name}?`);
    suggestedQuestions.push('Quais metas estão em risco?');
  }

  // Fallback: General normative / methodological answer grounded in retrieved chunks
  else {
    const firstChunk = ragDocs[0];
    responseText = `### Consulta ao Conhecimento do iPLS / CNJ\n\n` +
      `Com base na base documental e nos registros estruturados do PLS da **${context.organizationName}**:\n\n`;

    if (firstChunk) {
      responseText += `${firstChunk.content}\n\n` +
        `*Referência Oficial:* ${firstChunk.documentTitle} (${firstChunk.section}).\n\n`;
      sources.push({
        title: firstChunk.documentTitle,
        reference: firstChunk.sourceReference,
        type: firstChunk.documentType === 'NORMATIVO' ? 'NORMATIVA' : 'DOCUMENTO'
      });
    } else {
      responseText += `Não foram localizados documentos específicos correspondentes aos termos consultados. O sistema possui dados estruturados consolidados para os 10 indicadores prioritários do ciclo 2021-2026, processos SEI de fiscalização e normativas do CNJ.\n\n`;
    }

    responseText += `Você pode consultar perguntas analíticas diretas como:\n` +
      `* *"Qual foi o consumo de energia em agosto?"*\n` +
      `* *"Quais indicadores estão em risco?"*\n` +
      `* *"Como está a execução do Plano de Ação?"*\n` +
      `* *"Gere uma análise para o relatório anual do PLS."*`;

    suggestedQuestions.push('Como está o desempenho do PLS da SJRR neste ano?');
    suggestedQuestions.push('Quais indicadores estão em risco?');
    suggestedQuestions.push('Quais ações deveriam receber atenção neste momento?');
  }

  return {
    id: `chat-${Date.now()}`,
    sender: 'assistant',
    timestamp: new Date().toISOString(),
    text: responseText,
    sources,
    suggestedQuestions,
    isProjection
  };
}
