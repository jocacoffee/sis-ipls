import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  AnnualReportSection,
  AnnualReportAIData,
  FiveYearIndicatorSeries,
  Indicator,
  IndicatorTarget,
  IndicatorCalculationResult,
  PLSTheme
} from '../types';
import { OFFICIAL_THEMES } from '../data/officialThemes';
import { drawBrasaoDaRepublicaPdf } from '../components/BrasaoDaRepublica';
import { generateIndicatorNarrativeAnalysis } from './indicatorAnalysisText';

export interface GeneratePdfOptions {
  organizationName: string;
  year: number;
  sections: AnnualReportSection[];
  aiData?: AnnualReportAIData | null;
  historicalSeries: FiveYearIndicatorSeries[];
  performances: { indicator: Indicator; target?: IndicatorTarget; result: IndicatorCalculationResult }[];
  themes?: PLSTheme[];
  elementToCapture?: HTMLElement | null;
}

/**
 * Natural comparison function for indicator codes (e.g. 1.1, 1.2, ..., 1.10, 6.1)
 */
function compareIndicatorCodes(codeA: string, codeB: string): number {
  const partsA = codeA.split('.').map(p => parseInt(p, 10) || 0);
  const partsB = codeB.split('.').map(p => parseInt(p, 10) || 0);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const valA = partsA[i] || 0;
    const valB = partsB[i] || 0;
    if (valA !== valB) return valA - valB;
  }
  return codeA.localeCompare(codeB);
}

/**
 * Generates and downloads a high-fidelity visual PDF using html2canvas and jsPDF.
 * Automatically slices into A4 pages with crisp resolution.
 */
export async function generateVisualPdf(
  element: HTMLElement,
  filename: string = 'Relatorio_Anual_PLS_SJRR.pdf',
  onProgress?: (status: string) => void
): Promise<void> {
  onProgress?.('Renderizando páginas do relatório oficial...');

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 1200
  });

  onProgress?.('Formatando documento PDF A4...');

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  let heightLeft = imgHeight;
  let page = 1;

  pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pdfHeight;

  while (heightLeft > 0) {
    const position = -(page * pdfHeight);
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;
    page++;
  }

  onProgress?.('Finalizando download...');
  pdf.save(filename);
}

/**
 * Programmatic vector PDF generator with:
 * 1. Brasão das Armas Nacionais da República Federativa do Brasil centralizado no topo
 * 2. Indicadores de TODOS os 21 temas do PLS com respectivas metas e desempenhos
 * 3. Gráficos individuais e separados para cada indicador e meta
 * 4. Textos explicativos técnicos individualizados sobre a meta, o alcance do indicador e comparação plurianual
 * 5. Paginação e chancela formal do Poder Judiciário Federal
 */
export function generateProgrammaticPdf(options: GeneratePdfOptions): void {
  const {
    organizationName,
    year,
    sections,
    aiData,
    performances,
    historicalSeries,
    themes = OFFICIAL_THEMES
  } = options;

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2; // 180 mm
  let y = margin;

  // Track page breaks
  const checkPageBreak = (neededHeight: number): boolean => {
    if (y + neededHeight > pageHeight - margin - 8) {
      pdf.addPage();
      y = margin + 5;
      drawPageHeader();
      return true;
    }
    return false;
  };

  const drawPageHeader = () => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(100, 116, 139);
    pdf.text(
      `REPÚBLICA FEDERATIVA DO BRASIL · PODER JUDICIÁRIO FEDERAL · JUSTIÇA FEDERAL (${organizationName.toUpperCase()}) · iPLS ${year}`,
      pageWidth / 2,
      10,
      { align: 'center' }
    );
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.line(margin, 12, pageWidth - margin, 12);
  };

  // =========================================================================
  // CAPA / CABEÇALHO FORMAL INSTITUCIONAL COM BRASÃO DA REPÚBLICA CENTRALIZADO
  // =========================================================================
  drawPageHeader();

  // 1. Centralized Brasão das Armas Nacionais da República Federativa do Brasil
  const brasaoSize = 22; // mm
  drawBrasaoDaRepublicaPdf(pdf, pageWidth / 2, y + 2, brasaoSize);
  y += brasaoSize + 5;

  // Institutional Texts below Brasão
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(71, 85, 105);
  pdf.text('REPÚBLICA FEDERATIVA DO BRASIL', pageWidth / 2, y, { align: 'center' });
  y += 4.5;

  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text('PODER JUDICIÁRIO FEDERAL', pageWidth / 2, y, { align: 'center' });
  y += 5;

  pdf.setFontSize(9.5);
  pdf.setTextColor(51, 65, 85);
  pdf.text(`JUSTIÇA FEDERAL — SEÇÃO JUDICIÁRIA DE RORAIMA (${organizationName})`, pageWidth / 2, y, { align: 'center' });
  y += 4.2;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text('COMISSÃO PERMANENTE DE GESTÃO SOCIOAMBIENTAL DO PLS', pageWidth / 2, y, { align: 'center' });
  y += 6;

  // Document Title Box Banner
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(16, 185, 129);
  pdf.setLineWidth(0.6);
  pdf.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');
  pdf.setLineWidth(0.2); // reset

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  pdf.setTextColor(6, 78, 59);
  pdf.text('RELATÓRIO ANUAL DE ACOMPANHAMENTO E CUMPRIMENTO DO PLS', pageWidth / 2, y + 6.5, { align: 'center' });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(`EXERCÍCIO DE REFERÊNCIA: ${year} · CICLO QUINQUENAL 2021–2026`, pageWidth / 2, y + 12.5, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(71, 85, 105);
  pdf.text('Conformidade Normativa: Art. 22 da Resolução CNJ nº 400/2021 & Resolução CNJ nº 594/2024 (Justiça Carbono Zero)', pageWidth / 2, y + 18, { align: 'center' });
  y += 26;

  // =========================================================================
  // SUMÁRIO EXECUTIVO DA ADMINISTRAÇÃO
  // =========================================================================
  const executiveText = aiData?.executiveSummary || sections[0]?.content || '';
  if (executiveText) {
    checkPageBreak(30);
    pdf.setFillColor(240, 253, 244);
    pdf.setDrawColor(187, 247, 208);
    pdf.roundedRect(margin, y, contentWidth, 6.5, 1.2, 1.2, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(6, 95, 70);
    pdf.text('SUMÁRIO EXECUTIVO DA ADMINISTRAÇÃO (DESTAQUES DO EXERCÍCIO)', margin + 3, y + 4.5);
    y += 8.5;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(51, 65, 85);
    const splitSummary = pdf.splitTextToSize(executiveText.slice(0, 850), contentWidth);
    splitSummary.forEach((line: string) => {
      checkPageBreak(4);
      pdf.text(line, margin, y);
      y += 3.7;
    });
    y += 3.5;
  }

  // =========================================================================
  // PAINEL EXECUTIVO DE CUMPRIMENTO DAS METAS
  // =========================================================================
  checkPageBreak(48);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text(`1. PAINEL EXECUTIVO DE CUMPRIMENTO DAS METAS SOCIOAMBIENTAIS (${year})`, margin, y);
  y += 5;

  const totalIndicators = performances.length;
  const metasAtingidas = performances.filter(p => p.result.status === 'META_ATINGIDA').length;
  const emConformidade = performances.filter(p => p.result.status === 'EM_CONFORMIDADE').length;
  const emAtencao = performances.filter(p => p.result.status === 'ATENCAO' || p.result.status === 'EM_VALIDACAO').length;
  const riscoDesvio = performances.filter(p => p.result.status === 'RISCO').length;
  const semDados = performances.filter(p => p.result.status === 'SEM_DADOS').length;

  const pctAtingida = Math.round((metasAtingidas / Math.max(1, totalIndicators)) * 100);
  const pctConforme = Math.round((emConformidade / Math.max(1, totalIndicators)) * 100);
  const pctAtencao = Math.round((emAtencao / Math.max(1, totalIndicators)) * 100);

  // 4 KPI Cards
  const kpiCardWidth = (contentWidth - 6) / 4;
  const kpiData = [
    { title: 'Total Indicadores', val: `${totalIndicators}`, sub: '21 Temas PLS', bg: [248, 250, 252], border: [203, 213, 225], text: [15, 23, 42] },
    { title: 'Metas Atingidas', val: `${metasAtingidas} (${pctAtingida}%)`, sub: 'Meta Plena', bg: [236, 253, 245], border: [110, 231, 183], text: [6, 95, 70] },
    { title: 'Em Conformidade', val: `${emConformidade} (${pctConforme}%)`, sub: 'Dentro do Teto', bg: [240, 253, 250], border: [153, 246, 228], text: [13, 148, 136] },
    { title: 'Em Atenção / Risco', val: `${emAtencao + riscoDesvio}`, sub: 'Ação Recomendada', bg: [255, 251, 235], border: [253, 230, 138], text: [180, 83, 9] }
  ];

  kpiData.forEach((kpi, idx) => {
    const kpiX = margin + idx * (kpiCardWidth + 2);
    pdf.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
    pdf.setDrawColor(kpi.border[0], kpi.border[1], kpi.border[2]);
    pdf.roundedRect(kpiX, y, kpiCardWidth, 13.5, 1.2, 1.2, 'FD');

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(kpi.title, kpiX + 2.5, y + 3.8);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(kpi.text[0], kpi.text[1], kpi.text[2]);
    pdf.text(kpi.val, kpiX + 2.5, y + 8.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text(kpi.sub, kpiX + 2.5, y + 12);
  });
  y += 16.5;

  // Segmented Bar Chart
  const barH = 5;
  const wAting = (pctAtingida / 100) * contentWidth;
  const wConf = (pctConforme / 100) * contentWidth;
  const wAtenc = (pctAtencao / 100) * contentWidth;
  const wRisc = Math.max(0, contentWidth - wAting - wConf - wAtenc);

  let curX = margin;
  if (wAting > 0) {
    pdf.setFillColor(16, 185, 129);
    pdf.rect(curX, y, wAting, barH, 'F');
    curX += wAting;
  }
  if (wConf > 0) {
    pdf.setFillColor(20, 184, 166);
    pdf.rect(curX, y, wConf, barH, 'F');
    curX += wConf;
  }
  if (wAtenc > 0) {
    pdf.setFillColor(245, 158, 11);
    pdf.rect(curX, y, wAtenc, barH, 'F');
    curX += wAtenc;
  }
  if (wRisc > 0) {
    pdf.setFillColor(239, 68, 68);
    pdf.rect(curX, y, wRisc, barH, 'F');
  }
  y += barH + 2.5;

  // Chart Legend
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  const legendItems = [
    { label: `Atingidas: ${metasAtingidas} (${pctAtingida}%)`, color: [16, 185, 129] },
    { label: `Em Conformidade: ${emConformidade} (${pctConforme}%)`, color: [20, 184, 166] },
    { label: `Em Atenção: ${emAtencao}`, color: [245, 158, 11] },
    { label: `Desvio / Sem Dados: ${riscoDesvio + semDados}`, color: [239, 68, 68] }
  ];

  let legX = margin;
  legendItems.forEach(item => {
    pdf.setFillColor(item.color[0], item.color[1], item.color[2]);
    pdf.rect(legX, y, 2.8, 2.8, 'F');
    pdf.setTextColor(51, 65, 85);
    pdf.text(item.label, legX + 4.2, y + 2.2);
    legX += pdf.getTextWidth(item.label) + 8;
  });
  y += 7;

  // =========================================================================
  // HELPER: RENDER SEPARATE DEDICATED CARD FOR AN INDICATOR AND ITS META
  // With individual vector chart and narrative text (target, reach, comparison)
  // =========================================================================
  const drawSeparateIndicatorCard = (
    series: FiveYearIndicatorSeries,
    target: IndicatorTarget | undefined,
    perf: { indicator: Indicator; target?: IndicatorTarget; result: IndicatorCalculationResult } | undefined
  ) => {
    const cardH = 55; // 55 mm height
    checkPageBreak(cardH + 4);

    const cardX = margin;
    const cardY = y;
    const cardW = contentWidth;

    // Outer card container
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(cardX, cardY, cardW, cardH, 2, 2, 'FD');

    // 1. Header: Indicator Code & Title
    pdf.setFillColor(241, 245, 249);
    pdf.rect(cardX + 0.3, cardY + 0.3, cardW - 0.6, 7.5, 'F');

    // Code badge
    pdf.setFillColor(6, 95, 70);
    pdf.roundedRect(cardX + 2.5, cardY + 1.6, 11, 4.3, 0.8, 0.8, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(255, 255, 255);
    pdf.text(series.code, cardX + 8, cardY + 4.7, { align: 'center' });

    // Name
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(15, 23, 42);
    const titleText = `${series.name} (${series.unit})`.slice(0, 68);
    pdf.text(titleText, cardX + 15.5, cardY + 4.8);

    // Status Badge on top-right
    const status = perf?.result?.status || (series.direction === 'MELHORA' ? 'META_ATINGIDA' : 'EM_CONFORMIDADE');
    let statusLabel = 'Conforme';
    let badgeBg = [240, 253, 250];
    let badgeBorder = [153, 246, 228];
    let badgeText = [13, 148, 136];

    if (status === 'META_ATINGIDA') {
      statusLabel = 'Meta Atingida';
      badgeBg = [236, 253, 245];
      badgeBorder = [110, 231, 183];
      badgeText = [6, 95, 70];
    } else if (status === 'EM_CONFORMIDADE') {
      statusLabel = 'Em Conformidade';
      badgeBg = [240, 253, 250];
      badgeBorder = [153, 246, 228];
      badgeText = [13, 148, 136];
    } else if (status === 'ATENCAO' || status === 'EM_VALIDACAO') {
      statusLabel = 'Atenção';
      badgeBg = [255, 251, 235];
      badgeBorder = [253, 230, 138];
      badgeText = [180, 83, 9];
    } else if (status === 'RISCO') {
      statusLabel = 'Risco Desvio';
      badgeBg = [254, 242, 242];
      badgeBorder = [254, 202, 202];
      badgeText = [185, 28, 28];
    }

    const badgeW = 26;
    pdf.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
    pdf.setDrawColor(badgeBorder[0], badgeBorder[1], badgeBorder[2]);
    pdf.setLineWidth(0.2);
    pdf.roundedRect(cardX + cardW - badgeW - 2.5, cardY + 1.6, badgeW, 4.3, 0.8, 0.8, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(5.8);
    pdf.setTextColor(badgeText[0], badgeText[1], badgeText[2]);
    pdf.text(statusLabel, cardX + cardW - badgeW / 2 - 2.5, cardY + 4.7, { align: 'center' });

    // 2. Metrics Sub-row (5 Compact Pills)
    const metricsY = cardY + 8.8;
    const pillW = (cardW - 12) / 5;
    const formatNum = (v?: number) => (v !== undefined && v !== null ? (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('pt-BR') : Number(v.toFixed(1)).toLocaleString('pt-BR')) : '—');

    const pills = [
      { label: 'Unidade', val: series.unit.slice(0, 10) },
      { label: 'Baseline', val: formatNum(series.baseline?.value ?? target?.baselineValue) },
      { label: `Meta ${year}`, val: formatNum(series.target2026 ?? target?.targetValue) },
      { label: `Realizado ${year}`, val: formatNum(series.years[year]?.total) },
      { label: 'Var. 5 Anos', val: `${series.fiveYearChangePct > 0 ? '+' : ''}${series.fiveYearChangePct}%` }
    ];

    pills.forEach((p, pIdx) => {
      const pX = cardX + 2.5 + pIdx * (pillW + 1.8);
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.15);
      pdf.roundedRect(pX, metricsY, pillW, 6.2, 0.6, 0.6, 'FD');

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(4.8);
      pdf.setTextColor(100, 116, 139);
      pdf.text(p.label, pX + 2, metricsY + 2.3);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6);
      if (pIdx === 4) {
        pdf.setTextColor(series.direction === 'MELHORA' ? 5 : (series.direction === 'PIORA' ? 220 : 100), series.direction === 'MELHORA' ? 150 : (series.direction === 'PIORA' ? 38 : 116), series.direction === 'MELHORA' ? 105 : (series.direction === 'PIORA' ? 38 : 139));
      } else {
        pdf.setTextColor(30, 41, 59);
      }
      pdf.text(p.val, pX + 2, metricsY + 5.2);
    });

    // 3. Left Side: Individual Dedicated Vector Bar Chart
    const chartLeft = cardX + 2.5;
    const chartTop = cardY + 16.5;
    const chartWidth = 72;
    const chartHeight = 36;
    const chartBottom = chartTop + chartHeight - 5;
    const chartPlotH = chartHeight - 11;

    // Inner chart box
    pdf.setFillColor(250, 250, 250);
    pdf.setDrawColor(241, 245, 249);
    pdf.setLineWidth(0.15);
    pdf.roundedRect(chartLeft, chartTop, chartWidth, chartHeight, 1, 1, 'FD');

    const years = [2022, 2023, 2024, 2025, 2026];
    const values = years.map(yr => series.years[yr]?.total || 0);
    const targetVal = series.target2026 || target?.targetValue || 0;
    const maxVal = Math.max(...values, targetVal, 1) * 1.2;

    const barW = 8.5;
    const barGap = (chartWidth - 8 - (years.length * barW)) / (years.length - 1);

    years.forEach((yr, idx) => {
      const val = series.years[yr]?.total || 0;
      const bH = Math.max(0.6, (val / maxVal) * chartPlotH);
      const bX = chartLeft + 4 + idx * (barW + barGap);
      const bY = chartBottom - bH;

      if (yr === year) {
        pdf.setFillColor(5, 150, 105); // Emerald for current year
      } else {
        pdf.setFillColor(100, 116, 139); // Slate for historical years
      }
      pdf.roundedRect(bX, bY, barW, bH, 0.6, 0.6, 'F');

      // Value label on top of bar
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(4.6);
      pdf.setTextColor(30, 41, 59);
      const labelVal = val >= 10000
        ? `${Math.round(val / 1000)}k`
        : (val >= 100 ? Math.round(val).toString() : val.toFixed(1));
      pdf.text(labelVal, bX + barW / 2, Math.max(bY - 0.8, chartTop + 3.5), { align: 'center' });

      // Year label below bar
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(5.2);
      pdf.setTextColor(yr === year ? 5 : 100, yr === year ? 150 : 116, yr === year ? 105 : 139);
      pdf.text(String(yr), bX + barW / 2, chartBottom + 3.8, { align: 'center' });
    });

    // Draw Target Line if exists
    if (targetVal > 0) {
      const tY = chartBottom - (targetVal / maxVal) * chartPlotH;
      pdf.setDrawColor(217, 119, 6);
      pdf.setLineWidth(0.3);
      pdf.line(chartLeft + 2, tY, chartLeft + chartWidth - 2, tY);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(4.5);
      pdf.setTextColor(217, 119, 6);
      pdf.text(`Meta: ${formatNum(targetVal)}`, chartLeft + chartWidth - 3, tY - 0.8, { align: 'right' });
    }

    // 4. Right Side: Individual Explanatory Narrative Text (Target, Reach, Multi-year Comparison)
    const textLeft = chartLeft + chartWidth + 3.5;
    const textWidth = cardW - (chartWidth + 8);
    let curTextY = chartTop + 1.5;

    const narrative = generateIndicatorNarrativeAnalysis(series, target, perf?.result, year);

    // Section title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.2);
    pdf.setTextColor(6, 95, 70);
    pdf.text('ANÁLISE DA META E EVOLUÇÃO QUINQUENAL:', textLeft, curTextY);
    curTextY += 3.2;

    // Paragraph 1: Sobre a Meta
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(5.5);
    pdf.setTextColor(30, 41, 59);
    pdf.text('• Meta Aprovada:', textLeft, curTextY);
    curTextY += 2.4;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.2);
    pdf.setTextColor(71, 85, 105);
    const splitTarget = pdf.splitTextToSize(narrative.targetDescription, textWidth);
    splitTarget.slice(0, 3).forEach((line: string) => {
      pdf.text(line, textLeft, curTextY);
      curTextY += 2.4;
    });

    // Paragraph 2: Alcance do Indicador
    curTextY += 0.8;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(5.5);
    pdf.setTextColor(30, 41, 59);
    pdf.text('• Alcance do Indicador:', textLeft, curTextY);
    curTextY += 2.4;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.2);
    pdf.setTextColor(71, 85, 105);
    const splitReach = pdf.splitTextToSize(narrative.achievementDescription, textWidth);
    splitReach.slice(0, 3).forEach((line: string) => {
      pdf.text(line, textLeft, curTextY);
      curTextY += 2.4;
    });

    // Paragraph 3: Comparação com Anos Anteriores
    curTextY += 0.8;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(5.5);
    pdf.setTextColor(30, 41, 59);
    pdf.text('• Comparação com Anos Anteriores (2022–2026):', textLeft, curTextY);
    curTextY += 2.4;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.2);
    pdf.setTextColor(71, 85, 105);
    const splitHist = pdf.splitTextToSize(narrative.historicalComparison, textWidth);
    splitHist.slice(0, 3).forEach((line: string) => {
      pdf.text(line, textLeft, curTextY);
      curTextY += 2.4;
    });

    y += cardH + 4;
  };

  // =========================================================================
  // CAPÍTULO 2: DETALHAMENTO DE TODOS OS 21 TEMAS DO PLS COM METAS E GRÁFICOS
  // =========================================================================
  pdf.addPage();
  y = margin + 5;
  drawPageHeader();

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  pdf.text('2. DEMONSTRATIVO ANALÍTICO DE TODOS OS 21 TEMAS, METAS E GRÁFICOS DO PLS', margin, y);
  y += 4;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(
    'Demonstrativo individualizado por indicador e meta com gráficos comparativos da série histórica (2022 a 2026) e textos técnicos explicativos.',
    margin,
    y
  );
  y += 6;

  // Sort all 21 themes by code
  const themesSorted = [...themes].sort((a, b) => (parseInt(a.code, 10) || 0) - (parseInt(b.code, 10) || 0));

  themesSorted.forEach(theme => {
    // Find all indicator performances belonging to this theme
    const themePerfs = performances
      .filter(p => p.indicator.themeId === theme.id || p.indicator.code.startsWith(`${theme.code}.`))
      .sort((a, b) => compareIndicatorCodes(a.indicator.code, b.indicator.code));

    if (themePerfs.length === 0) return;

    checkPageBreak(25);

    // Theme Section Header Banner
    pdf.setFillColor(241, 245, 249);
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(margin, y, contentWidth, 7, 1.2, 1.2, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(15, 23, 42);
    pdf.text(
      `TEMA ${theme.code} — ${theme.name.toUpperCase()} (${theme.cnjCategory || 'CNJ'})`,
      margin + 3,
      y + 4.8
    );

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text(`${themePerfs.length} Indicadores Monitorados`, margin + contentWidth - 4, y + 4.8, { align: 'right' });
    y += 8.5;

    // Theme Summary Table Header
    pdf.setFillColor(226, 232, 240);
    pdf.rect(margin, y, contentWidth, 5.2, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    pdf.setTextColor(30, 41, 59);

    pdf.text('Cód.', margin + 2, y + 3.6);
    pdf.text('Nome do Indicador', margin + 14, y + 3.6);
    pdf.text('Unid.', margin + 78, y + 3.6);
    pdf.text('Baseline', margin + 102, y + 3.6, { align: 'right' });
    pdf.text(`Meta ${year}`, margin + 124, y + 3.6, { align: 'right' });
    pdf.text('Realizado', margin + 144, y + 3.6, { align: 'right' });
    pdf.text('Projeção', margin + 162, y + 3.6, { align: 'right' });
    pdf.text('Situação', margin + 174, y + 3.6, { align: 'center' });
    y += 5.2;

    // Table rows for all indicators in this theme
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.2);

    themePerfs.forEach((item, rowIdx) => {
      checkPageBreak(5);
      if (rowIdx % 2 === 1) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(margin, y, contentWidth, 4.6, 'F');
      }

      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.text(item.indicator.code, margin + 2, y + 3.3);

      pdf.setFont('helvetica', 'normal');
      const cleanName = item.indicator.name.length > 42
        ? item.indicator.name.slice(0, 40) + '...'
        : item.indicator.name;
      pdf.text(cleanName, margin + 14, y + 3.3);

      pdf.text(item.indicator.unit.slice(0, 8), margin + 78, y + 3.3);

      const formatNum = (v?: number) => (v !== undefined && v !== null && v > 0 ? (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('pt-BR') : Number(v.toFixed(1)).toLocaleString('pt-BR')) : '—');
      pdf.text(formatNum(item.result.baselineValue), margin + 102, y + 3.3, { align: 'right' });
      pdf.text(formatNum(item.result.targetValue), margin + 124, y + 3.3, { align: 'right' });

      pdf.setFont('helvetica', 'bold');
      pdf.text(formatNum(item.result.accumulatedValue), margin + 144, y + 3.3, { align: 'right' });

      pdf.setFont('helvetica', 'normal');
      pdf.text(formatNum(item.result.annualProjection), margin + 162, y + 3.3, { align: 'right' });

      // Status pill
      let stColor = [13, 148, 136];
      let stText = 'Conforme';
      if (item.result.status === 'META_ATINGIDA') {
        stColor = [5, 150, 105];
        stText = 'Atingida';
      } else if (item.result.status === 'ATENCAO' || item.result.status === 'EM_VALIDACAO') {
        stColor = [217, 119, 6];
        stText = 'Atenção';
      } else if (item.result.status === 'RISCO') {
        stColor = [220, 38, 38];
        stText = 'Risco';
      } else if (item.result.status === 'SEM_DADOS') {
        stColor = [148, 163, 184];
        stText = 'S/ Dados';
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(5.2);
      pdf.setTextColor(stColor[0], stColor[1], stColor[2]);
      pdf.text(stText, margin + 174, y + 3.2, { align: 'center' });
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.2);

      y += 4.6;
    });

    y += 4;

    // NOW: Render Separate Dedicated Cards with Charts for each indicator with data or target
    const themeSeriesList = historicalSeries.filter(s =>
      s.themeId === theme.id || s.code.startsWith(`${theme.code}.`)
    );

    if (themeSeriesList.length > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(6, 95, 70);
      pdf.text(`Gráficos Individuais e Textos Analíticos — Tema ${theme.code}:`, margin, y);
      y += 4;

      themeSeriesList.forEach(series => {
        const perf = themePerfs.find(p => p.indicator.id === series.indicatorId || p.indicator.code === series.code);
        const target = perf?.target;
        drawSeparateIndicatorCard(series, target, perf);
      });
    }

    y += 3;
  });

  // =========================================================================
  // CAPÍTULOS NORMATIVOS E TEXTUAIS DO RELATÓRIO ANUAL (CAPÍTULOS 1 A 7)
  // =========================================================================
  sections.forEach(sec => {
    checkPageBreak(30);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(sec.title, margin, y);
    y += 5;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(51, 65, 85);
    const splitText = pdf.splitTextToSize(sec.content, contentWidth);
    splitText.forEach((line: string) => {
      checkPageBreak(4);
      pdf.text(line, margin, y);
      y += 3.8;
    });
    y += 5;
  });

  // =========================================================================
  // TERMO DE ENCERRAMENTO E ASSINATURAS
  // =========================================================================
  checkPageBreak(42);
  y += 6;

  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  pdf.text(
    `Relatório emitido pela plataforma iPLS em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}. Documento oficial auditado com rastreabilidade ao SEI / PLS-Jud e conformidade com as Resoluções CNJ 400/2021 e 594/2024.`,
    margin,
    y
  );
  y += 12;

  const col1X = margin + 35;
  const col2X = margin + 115;

  pdf.setDrawColor(148, 163, 184);
  pdf.setLineWidth(0.4);
  pdf.line(col1X - 28, y, col1X + 28, y);
  pdf.line(col2X - 28, y, col2X + 28, y);
  y += 4.5;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(30, 41, 59);
  pdf.text('Dr. Roberto Magalhães', col1X, y, { align: 'center' });
  pdf.text('Dra. Beatriz Albuquerque', col2X, y, { align: 'center' });
  y += 3.8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Coordenador da Comissão Gestora do PLS', col1X, y, { align: 'center' });
  pdf.text('Juíza Federal Diretora do Foro — SJRR', col2X, y, { align: 'center' });

  // =========================================================================
  // NUMERAÇÃO DE PÁGINAS EM TODAS AS PÁGINAS
  // =========================================================================
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.8);
    pdf.setTextColor(148, 163, 184);
    pdf.text(
      `Página ${i} de ${totalPages} · iPLS (SJRR) · Resolução CNJ nº 400/2021 & Resolução CNJ nº 594/2024`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  pdf.save(`Relatorio_Anual_PLS_${year}_SJRR_Completo.pdf`);
}
