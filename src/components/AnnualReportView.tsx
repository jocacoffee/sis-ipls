import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BookOpen,
  Download,
  Printer,
  Sparkles,
  Edit3,
  CheckCircle,
  FileText,
  Building,
  Target,
  AlertTriangle,
  Save,
  Check,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  BarChart3,
  ShieldCheck,
  Award,
  Zap,
  Info,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  FileDown,
  Loader2,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  Droplet,
  Trash2,
  CloudFog,
  Car
} from 'lucide-react';
import {
  Indicator,
  IndicatorMeasurement,
  IndicatorTarget,
  ActionPlan,
  IndicatorCalculationResult,
  AnnualReportSection,
  AnnualReportAIData,
  FiveYearIndicatorSeries,
  PLSTheme
} from '../types';
import { OFFICIAL_THEMES } from '../data/officialThemes';
import { buildFiveYearHistoricalSeries } from '../services/historicalAnalytics';
import { HistoricalCharts } from './HistoricalCharts';
import { generateVisualPdf, generateProgrammaticPdf } from '../services/pdfGenerator';
import { BrasaoDaRepublica } from './BrasaoDaRepublica';
import { generateIndicatorNarrativeAnalysis } from '../services/indicatorAnalysisText';

interface AnnualReportViewProps {
  organizationName: string;
  selectedYear: number;
  indicators: Indicator[];
  measurements: IndicatorMeasurement[];
  targets: IndicatorTarget[];
  themes?: PLSTheme[];
  actionPlans: ActionPlan[];
  performances: { indicator: Indicator; target?: IndicatorTarget; result: IndicatorCalculationResult }[];
  onOpenSpreadsheetImport?: () => void;
}

export const AnnualReportView: React.FC<AnnualReportViewProps> = ({
  organizationName,
  selectedYear,
  indicators,
  measurements,
  targets,
  themes,
  actionPlans,
  performances,
  onOpenSpreadsheetImport
}) => {
  const reportThemes = useMemo(() => {
    return themes && themes.length > 0 ? themes : OFFICIAL_THEMES;
  }, [themes]);

  const [isEditingSection, setIsEditingSection] = useState<number | null>(null);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [customFocus, setCustomFocus] = useState<string>('PADRAO_CNJ');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [aiReportData, setAiReportData] = useState<AnnualReportAIData | null>(null);
  const reportContainerRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfStatusMessage, setPdfStatusMessage] = useState<string>('');
  const [pdfSuccess, setPdfSuccess] = useState<boolean>(false);
  const [pdfDropdownOpen, setPdfDropdownOpen] = useState<boolean>(false);
  const [indicatorSearch, setIndicatorSearch] = useState<string>('');
  const [activeThemeCategory, setActiveThemeCategory] = useState<string>('ALL');

  // Compute 5-year historical series from real measurements
  const [historicalSeries, setHistoricalSeries] = useState<FiveYearIndicatorSeries[]>(() =>
    buildFiveYearHistoricalSeries(indicators, measurements, targets, selectedYear)
  );

  useEffect(() => {
    setHistoricalSeries(buildFiveYearHistoricalSeries(indicators, measurements, targets, selectedYear));
  }, [indicators, measurements, targets, selectedYear]);

  // Initial standard report sections (conforming to CNJ Res. 400/2021 & 594/2024)
  const [sections, setSections] = useState<AnnualReportSection[]>([
    {
      id: 1,
      title: '1. Apresentação e Compromisso Institucional',
      category: 'INSTITUCIONAL',
      statusBadge: 'Auditado',
      content: `O presente Relatório Anual de Acompanhamento do Plano de Logística Sustentável (PLS) consolida o desempenho socioambiental da ${organizationName} no exercício de ${selectedYear}, em estrita observância ao Art. 22 da Resolução CNJ nº 400/2021 e às diretrizes do Programa Justiça Carbono Zero instituído pela Resolução CNJ nº 594/2024.\n\nEste documento atesta o compromisso permanente da Direção do Foro, da Comissão Gestora do PLS e de todo o corpo funcional com a sustentabilidade, a eficiência do gasto público, o combate ao desperdício e a transição ecológica no âmbito da Justiça Federal de Roraima.`
    },
    {
      id: 2,
      title: '2. Metodologia de Coleta, Auditoria e Integridade dos Dados',
      category: 'METODOLOGIA',
      statusBadge: 'Conformidade 100%',
      content: `A apuração dos indicadores adota integração direta com os sistemas corporativos do TRF1 e da SJRR, integrando dados extraídos mensalmente do Sistema Eletrônico de Informações (SEI), faturas das concessionárias de serviços públicos (Roraima Energia S.A. e CAER), relatórios telemétricos de outsourcing de impressão, registros de almoxarifado e manifestos de destinação de resíduos sólidos emitidos pela associação parceira Terra Viva.\n\nTodos os lançamentos são auditados e validados por fiscais técnicos de contrato e pela Comissão Gestora do PLS, assegurando higidez, rastreabilidade e integridade comprobatória antes da consolidação.`
    },
    {
      id: 3,
      title: `3. Avaliação de Desempenho e Metas do Ano Corrente (${selectedYear})`,
      category: 'DESEMPENHO',
      statusBadge: 'Metas Auditadas',
      content: `No exercício de ${selectedYear}, as metas de redução de consumo de papel A4 e copos descartáveis atingiram índices históricos de conformidade, destacando-se a erradicação absoluta (100%) no uso de copos plásticos descartáveis no edifício-sede.\n\nO consumo de energia elétrica apresentou desempenho favorável na maior parte do exercício, registrando um pico pontual na competência de agosto de 2026 (21.450 kWh) em decorrência de severas intempéries térmicas na capital Boa Vista e avaria temporária no chiller principal de climatização, prontamente solucionada mediante manutenção corretiva da Seção de Infraestrutura.`
    },
    {
      id: 4,
      title: '4. Avaliação Comparativa da Série Histórica dos Últimos 5 Anos (2022 a 2026)',
      category: 'HISTORICO',
      statusBadge: 'Série Quinquenal',
      content: `A avaliação comparativa da série histórica dos últimos 5 anos (2022–2026), detalhada nos gráficos deste capítulo, evidencia uma evolução estrutural altamente positiva na governança socioambiental da Seção Judiciária de Roraima.\n\nObserva-se queda sustentada na intensidade energética e hídrica, redução drástica no consumo de papel A4 com a expansão de processos 100% eletrônicos, eliminação permanente de itens plásticos de uso único e significativo incremento no volume de resíduos reciclados encaminhados para cooperativas locais de catadores.`
    },
    {
      id: 5,
      title: '5. Execução do Plano de Ação Socioambiental e Desafios Estruturais',
      category: 'PLANO_ACAO',
      statusBadge: '14 Ações em Gestão',
      content: `O Plano de Ação Socioambiental da SJRR abrange 14 iniciativas estruturantes alinhadas aos eixos temáticos do PLS. Destacam-se o retrofit de luminárias para tecnologia LED (100% concluído), a consolidação do Programa Edifício Resíduo Zero Plástico e as diretrizes do Guia de Contratações Sustentáveis nas novas licitações regidas pela Lei nº 14.133/2021.\n\nPermanecem em curso as ações prioritárias de modernização dos chillers centrais e a transição definitiva para telefonia VoIP em nuvem, garantindo a redução definitiva de linhas analógicas legadas.`
    },
    {
      id: 6,
      title: '6. Balanço do Programa Justiça Carbono Zero (Resolução CNJ nº 594/2024)',
      category: 'DESCARBONIZACAO',
      statusBadge: 'CNJ 594/2024',
      content: `Em estrito atendimento à Resolução CNJ nº 594/2024, a SJRR mantém inventário anual de emissões de Gases de Efeito Estufa (GEE) abrangendo os Escopos 1, 2 e 3. Em 2026, as emissões totais projetam 102,0 tCO2e (0,31 tCO2e per capita), representando uma expressiva descarbonização acumulada de 35,6% frente a 2022.\n\nForam implementadas também medidas de compensação florestal com espécies amazônicas nativas, pavimentando a meta do Poder Judiciário de atingir emissões líquidas zero até 2030.`
    },
    {
      id: 7,
      title: '7. Conclusão, Recomendações e Diretrizes para o Próximo Exercício',
      category: 'CONCLUSAO',
      statusBadge: 'Diretrizes 2027',
      content: `Os resultados consolidados no exercício de ${selectedYear} e ao longo do quinquênio 2022–2026 demonstram solidez gerencial e alto grau de conformidade normativa da Seção Judiciária de Roraima.\n\nPara o próximo ciclo de planejamento, recomenda-se a expansão de usinas fotovoltaicas em áreas de estacionamento, o monitoramento predial automatizado por sensores IoT e a elevação progressiva de critérios ambientais nas aquisições públicas da Justiça Federal.`
    }
  ]);

  const handleUpdateContent = (id: number, newText: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, content: newText } : s));
  };

  const handleDownloadCompletePdf = () => {
    setIsGeneratingPdf(true);
    setPdfStatusMessage('Gerando PDF oficial completo com todos os 21 temas, metas e gráficos...');
    try {
      generateProgrammaticPdf({
        organizationName,
        year: selectedYear,
        sections,
        aiData: aiReportData,
        historicalSeries,
        performances,
        themes: reportThemes
      });
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 4000);
    } catch (err: any) {
      console.error('[PDF] Erro ao gerar PDF completo:', err);
      alert(`Falha ao gerar PDF completo: ${err.message || 'Erro inesperado'}`);
    } finally {
      setIsGeneratingPdf(false);
      setPdfStatusMessage('');
      setPdfDropdownOpen(false);
    }
  };

  const handleDownloadVisualPdf = async () => {
    if (!reportContainerRef.current) return;
    setIsGeneratingPdf(true);
    setPdfStatusMessage('Capturando layout completo e gráficos do relatório...');
    try {
      await generateVisualPdf(
        reportContainerRef.current,
        `Relatorio_Anual_PLS_${selectedYear}_SJRR.pdf`,
        (status) => setPdfStatusMessage(status)
      );
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 4000);
    } catch (err) {
      console.warn('[PDF] Falha na captura visual, gerando PDF estruturado completo:', err);
      generateProgrammaticPdf({
        organizationName,
        year: selectedYear,
        sections,
        aiData: aiReportData,
        historicalSeries,
        performances,
        themes: reportThemes
      });
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 4000);
    } finally {
      setIsGeneratingPdf(false);
      setPdfStatusMessage('');
      setPdfDropdownOpen(false);
    }
  };

  const handleDownloadProgrammaticPdf = () => {
    handleDownloadCompletePdf();
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.warn('[Print] window.print restrito no navegador/iframe. Baixando PDF diretamente:', err);
      handleDownloadCompletePdf();
    }
  };

  const handleExportMarkdown = () => {
    let md = `# RELATÓRIO ANUAL DE ACOMPANHAMENTO DO PLANO DE LOGÍSTICA SUSTENTÁVEL (PLS)\n`;
    md += `**Órgão:** ${organizationName}\n`;
    md += `**Exercício de Referência:** ${selectedYear}\n`;
    md += `**Normativas de Referência:** Resolução CNJ nº 400/2021 (Art. 22) e Resolução CNJ nº 594/2024 (Justiça Carbono Zero)\n`;
    if (aiReportData) {
      md += `**Modelo de IA:** ${aiReportData.aiModel} · Gerado em: ${new Date(aiReportData.generatedAt).toLocaleString('pt-BR')}\n`;
    }
    md += `\n---\n\n`;

    if (aiReportData?.executiveSummary) {
      md += `## SUMÁRIO EXECUTIVO DA ADMINISTRAÇÃO\n\n${aiReportData.executiveSummary}\n\n`;
    }

    if (aiReportData?.keyAchievements && aiReportData.keyAchievements.length > 0) {
      md += `### Principais Conquistas Quinquenais (2022-2026)\n\n`;
      aiReportData.keyAchievements.forEach(a => {
        md += `- ${a}\n`;
      });
      md += `\n`;
    }

    sections.forEach(s => {
      md += `## ${s.title}\n\n${s.content}\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Relatorio_Anual_PLS_${selectedYear}_SJRR.md`;
    a.click();
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  // Trigger server-side Gemini LLM generation
  const handleGenerateWithAI = async () => {
    setIsGeneratingAI(true);
    setShowGenerateModal(false);

    let focusPrompt = '';
    if (customFocus === 'DESCARBONIZACAO') {
      focusPrompt = 'Ênfase máxima na Descarbonização, Inventário de GEE e Programa Justiça Carbono Zero da Resolução CNJ nº 594/2024';
    } else if (customFocus === 'ORCAMENTO') {
      focusPrompt = 'Ênfase máxima na Economicidade, Eficiência de Custos e Contratações Sustentáveis (Lei 14.133/2021)';
    } else if (customFocus === 'PERSONALIZADO') {
      focusPrompt = customPrompt || 'Abordagem customizada para a Direção do Foro';
    } else {
      focusPrompt = 'Padrão Completo de Auditoria CNJ (Resoluções CNJ nº 400/2021 e nº 594/2024)';
    }

    try {
      const response = await fetch('/api/annual-report/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedYear,
          orgId: 'org-sjrr',
          customFocus: focusPrompt
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.statusText}`);
      }

      const data: AnnualReportAIData = await response.json();
      setAiReportData(data);

      if (data.sections && data.sections.length > 0) {
        setSections(data.sections);
      }

      if (data.fiveYearComparisons && data.fiveYearComparisons.length > 0) {
        setHistoricalSeries(data.fiveYearComparisons);
      }
    } catch (err) {
      console.error('[AnnualReportView] Erro ao gerar com LLM:', err);
      // Fallback: local recalculation of 5-year series
      const freshSeries = buildFiveYearHistoricalSeries(indicators, measurements, targets, selectedYear);
      setHistoricalSeries(freshSeries);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 print:p-0 print:space-y-4">
      {/* Executive Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-colors print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Prestação de Contas Normativa — Art. 22 Res. CNJ 400/2021 & Res. CNJ 594/2024</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Relatório Anual de Cumprimento do PLS-SJRR
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Consolidação analítica de sustentabilidade, série histórica de 5 anos e geração assistida por IA
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* AI Generator Button */}
          <button
            onClick={() => setShowGenerateModal(true)}
            disabled={isGeneratingAI}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-xs shadow-emerald-600/25 transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isGeneratingAI ? 'animate-spin' : ''}`} />
            <span>{isGeneratingAI ? 'Gerando com IA...' : 'Gerar Relatório com IA'}</span>
          </button>

          <button
            onClick={handleExportMarkdown}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors border border-slate-200"
          >
            {exportSuccess ? <Check className="w-4 h-4 text-emerald-600" /> : <Download className="w-4 h-4 text-slate-600" />}
            <span>{exportSuccess ? 'Baixado!' : 'Exportar Markdown'}</span>
          </button>

          {/* PDF Download Button with Dropdown Options */}
          <div className="relative">
            <div className="inline-flex rounded-xl shadow-xs">
              <button
                onClick={handleDownloadCompletePdf}
                disabled={isGeneratingPdf}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-l-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors disabled:opacity-50"
                title="Baixar PDF Oficial completo com todos os 21 temas, metas e gráficos vetoriais"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                ) : pdfSuccess ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <FileDown className="w-4 h-4 text-emerald-400" />
                )}
                <span>
                  {pdfSuccess ? 'PDF Baixado!' : (isGeneratingPdf ? 'Gerando...' : 'Baixar PDF Oficial Completo')}
                </span>
              </button>

              <button
                onClick={() => setPdfDropdownOpen(prev => !prev)}
                className="px-2 py-2 rounded-r-xl bg-slate-800 hover:bg-slate-700 text-white text-xs border-l border-slate-700 transition-colors"
                title="Opções de PDF e Impressão"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Dropdown Menu */}
            {pdfDropdownOpen && (
              <div className="absolute right-0 mt-1 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs animate-in fade-in">
                <button
                  onClick={handleDownloadCompletePdf}
                  className="w-full text-left px-3 py-2.5 hover:bg-emerald-50/60 flex items-start gap-2.5 text-slate-800 font-medium transition-colors"
                >
                  <FileDown className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>PDF Oficial Completo</span>
                      <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] rounded font-bold">Recomendado</span>
                    </div>
                    <div className="text-[11px] text-slate-500">21 temas, todas as metas e gráficos quinquenais</div>
                  </div>
                </button>

                <button
                  onClick={handleDownloadVisualPdf}
                  className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-start gap-2.5 text-slate-800 font-medium border-t border-slate-100 transition-colors"
                >
                  <FileText className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900">PDF Visual (Captura de Tela)</div>
                    <div className="text-[11px] text-slate-500">Captura exata da página A4 renderizada</div>
                  </div>
                </button>

                <button
                  onClick={handlePrint}
                  className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-start gap-2.5 text-slate-800 font-medium border-t border-slate-100 transition-colors"
                >
                  <Printer className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900">Imprimir no Navegador</div>
                    <div className="text-[11px] text-slate-500">Diálogo de impressão nativo (Ctrl+P)</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating PDF Generation Progress Toast */}
      {isGeneratingPdf && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 z-50 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 border border-slate-700">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <span>{pdfStatusMessage || 'Gerando documento PDF...'}</span>
        </div>
      )}

      {/* Generation Status Banner if AI Generated */}
      {aiReportData && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-950">
                  Relatório Consolidado via Inteligência Artificial
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold font-mono">
                  {aiReportData.aiModel}
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                Redação técnica alinhada aos dados auditados do exercício de {selectedYear} e à série histórica dos últimos 5 anos (2022–2026).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-emerald-800 shrink-0 font-medium">
            <span>Gerado em: {new Date(aiReportData.generatedAt).toLocaleTimeString('pt-BR')}</span>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="px-2.5 py-1 rounded-lg bg-white text-emerald-800 font-semibold text-xs border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              Regenerar
            </button>
          </div>
        </div>
      )}

      {/* AI Executive Highlights Cards (Screen & Print) */}
      {aiReportData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
          {/* Executive Summary */}
          <div className="md:col-span-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Sumário Executivo da Direção</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed text-justify whitespace-pre-wrap font-sans">
              {aiReportData.executiveSummary}
            </p>
          </div>

          {/* Key Achievements */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Principais Conquistas Quinquenais</span>
            </div>
            <ul className="space-y-1.5 text-xs text-emerald-950">
              {aiReportData.keyAchievements.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Critical Alerts Audited */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Pontos de Atenção & Desvios</span>
            </div>
            <ul className="space-y-1.5 text-xs text-amber-950">
              {aiReportData.criticalAlerts.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Priority Recommendations */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Recomendações Prioritárias</span>
            </div>
            <ul className="space-y-1.5 text-xs text-indigo-950">
              {aiReportData.priorityRecommendations.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Formal Printable Document Layout */}
      <div
        ref={reportContainerRef}
        id="annual-report-printable-area"
        className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-xs space-y-8 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0"
      >
        {/* Document Formal Header with Centralized Brasão da República */}
        <div className="flex flex-col items-center justify-center text-center pb-6 border-b border-slate-200">
          <BrasaoDaRepublica size={96} showSubtitle={false} className="mb-2" />
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-slate-700">
            República Federativa do Brasil
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight mt-1">
            PODER JUDICIÁRIO FEDERAL
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wider mt-0.5">
            JUSTIÇA FEDERAL — SEÇÃO JUDICIÁRIA DE RORAIMA
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            COMISSÃO PERMANENTE DE GESTÃO SOCIOAMBIENTAL DO PLS
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-4 tracking-tight">
            RELATÓRIO ANUAL DE ACOMPANHAMENTO E CUMPRIMENTO DO PLS
          </h1>
          <div className="text-xs font-medium text-slate-500 mt-1 font-mono">
            EXERCÍCIO DE REFERÊNCIA: <strong className="text-slate-800">{selectedYear}</strong> · CICLO 2021-2026
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Art. 22 da Resolução CNJ nº 400/2021 & Resolução CNJ nº 594/2024 (Justiça Carbono Zero)
          </div>
        </div>

        {/* Embedded Summary Table of Current Year Audited Results by Theme */}
        <div className="rounded-2xl bg-slate-50 p-4 sm:p-5 border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm uppercase tracking-wide">
                Quadro Consolidado de Indicadores de Todos os 21 Temas e Metas ({selectedYear})
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Demonstrativo exaustivo de metas auditadas, valores acumulados e projeção anual por eixo temático
              </p>
            </div>

            {/* Quick Search Filter (Screen Only) */}
            <div className="relative print:hidden min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={indicatorSearch}
                onChange={e => setIndicatorSearch(e.target.value)}
                placeholder="Buscar por código ou tema..."
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Grouped by Themes */}
          <div className="space-y-5">
            {reportThemes.map(theme => {
              const themeItems = performances
                .filter(p => {
                  const matchesTheme = p.indicator.themeId === theme.id || p.indicator.code.startsWith(`${theme.code}.`);
                  if (!matchesTheme) return false;
                  if (!indicatorSearch.trim()) return true;
                  const q = indicatorSearch.toLowerCase();
                  return (
                    p.indicator.code.toLowerCase().includes(q) ||
                    p.indicator.name.toLowerCase().includes(q) ||
                    theme.name.toLowerCase().includes(q)
                  );
                })
                .sort((a, b) => {
                  const partsA = a.indicator.code.split('.').map(p => parseInt(p, 10) || 0);
                  const partsB = b.indicator.code.split('.').map(p => parseInt(p, 10) || 0);
                  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
                    if ((partsA[i] || 0) !== (partsB[i] || 0)) return (partsA[i] || 0) - (partsB[i] || 0);
                  }
                  return a.indicator.code.localeCompare(b.indicator.code);
                });

              if (themeItems.length === 0) return null;

              return (
                <div key={theme.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                  {/* Theme Header Banner */}
                  <div className="px-3.5 py-2 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold text-[10px]">
                        Tema {theme.code}
                      </span>
                      <span className="font-bold text-slate-900 text-xs">
                        {theme.name}
                      </span>
                      <span className="text-[10px] text-slate-500 hidden sm:inline">
                        ({theme.cnjCategory})
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {themeItems.length} {themeItems.length === 1 ? 'indicador' : 'indicadores'}
                    </span>
                  </div>

                  {/* Theme Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="border-b border-slate-200 font-semibold text-slate-600 bg-slate-50/50">
                        <tr>
                          <th className="py-2 px-2.5 w-14">Cód.</th>
                          <th className="py-2 px-2">Indicador</th>
                          <th className="py-2 px-2 text-right">Unid.</th>
                          <th className="py-2 px-2 text-right">Baseline</th>
                          <th className="py-2 px-2 text-right">Meta {selectedYear}</th>
                          <th className="py-2 px-2 text-right">Realizado</th>
                          <th className="py-2 px-2 text-right">Projeção</th>
                          <th className="py-2 px-2 text-center">Situação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {themeItems.map(item => {
                          let badgeBg = 'bg-slate-100 text-slate-700';
                          if (item.result.status === 'META_ATINGIDA') badgeBg = 'bg-emerald-100 text-emerald-800 font-bold';
                          else if (item.result.status === 'EM_CONFORMIDADE') badgeBg = 'bg-teal-100 text-teal-800';
                          else if (item.result.status === 'ATENCAO' || item.result.status === 'EM_VALIDACAO') badgeBg = 'bg-amber-100 text-amber-800';
                          else if (item.result.status === 'RISCO') badgeBg = 'bg-red-100 text-red-800 font-bold';

                          return (
                            <tr key={item.indicator.id} className="hover:bg-slate-50/60">
                              <td className="py-1.5 px-2.5 font-bold text-slate-800">{item.indicator.code}</td>
                              <td className="py-1.5 px-2 font-sans text-slate-900">{item.indicator.name}</td>
                              <td className="py-1.5 px-2 text-right text-slate-500">{item.indicator.unit}</td>
                              <td className="py-1.5 px-2 text-right text-slate-500 tabular-nums">
                                {item.result.baselineValue > 0 ? item.result.baselineValue.toLocaleString('pt-BR') : '—'}
                              </td>
                              <td className="py-1.5 px-2 text-right font-semibold text-slate-700 tabular-nums">
                                {item.result.targetValue !== undefined ? item.result.targetValue.toLocaleString('pt-BR') : '—'}
                              </td>
                              <td className="py-1.5 px-2 text-right font-bold text-slate-900 tabular-nums">
                                {item.result.accumulatedValue !== undefined ? item.result.accumulatedValue.toLocaleString('pt-BR') : '0'}
                              </td>
                              <td className="py-1.5 px-2 text-right font-semibold text-emerald-700 tabular-nums">
                                {item.result.annualProjection !== undefined ? Math.round(item.result.annualProjection).toLocaleString('pt-BR') : '—'}
                              </td>
                              <td className="py-1.5 px-2 text-center font-sans">
                                <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] ${badgeBg}`}>
                                  {item.result.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* MANDATED 5-YEAR HISTORICAL COMPARISON CHARTS SECTION     */}
        {/* ======================================================== */}
        <div className="space-y-5 pt-4 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wide">
                <BarChart3 className="w-4 h-4" />
                <span>Capítulo 4 — Painel Comparativo Quinquenal (2022 a 2026)</span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                Gráficos de Comparação com os Últimos 5 Anos da Série Histórica
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evolução comparativa quinquenal em conformidade com o Art. 22, II da Res. CNJ 400/2021 e Res. CNJ 594/2024
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                Série 2022–2026
              </span>
              {onOpenSpreadsheetImport && (
                <button
                  type="button"
                  onClick={onOpenSpreadsheetImport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                  title="Importar ou atualizar planilha com os dados históricos oficiais"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Importar Planilha da Série Histórica
                </button>
              )}
            </div>
          </div>

          {/* Individual Separated Chart Cards with Dedicated Explanatory Texts */}
          <div className="space-y-4">
            {historicalSeries.map(series => {
              const years = [2022, 2023, 2024, 2025, 2026];
              const values = years.map(yr => series.years[yr]?.total || 0);
              const targetVal = series.target2026 || 0;
              const maxVal = Math.max(...values, targetVal, 1);
              const isPositive = series.direction === 'MELHORA';
              const targetObj = targets.find(t => t.indicatorId === series.indicatorId && t.year === selectedYear);
              const perf = performances.find(p => p.indicator.id === series.indicatorId || p.indicator.code === series.code);
              const narrative = generateIndicatorNarrativeAnalysis(series, targetObj, perf?.result, selectedYear);

              let statusBadgeBg = 'bg-teal-100 text-teal-800 border-teal-200';
              let statusLabel = 'Em Conformidade';
              if (perf?.result?.status === 'META_ATINGIDA') {
                statusBadgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold';
                statusLabel = 'Meta Atingida';
              } else if (perf?.result?.status === 'ATENCAO') {
                statusBadgeBg = 'bg-amber-100 text-amber-800 border-amber-200';
                statusLabel = 'Em Atenção';
              } else if (perf?.result?.status === 'RISCO') {
                statusBadgeBg = 'bg-red-100 text-red-800 border-red-200 font-bold';
                statusLabel = 'Risco de Desvio';
              }

              return (
                <div
                  key={series.indicatorId || series.code}
                  className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs transition-all hover:border-slate-300"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-700 text-white font-mono font-bold text-xs shadow-2xs">
                        {series.code}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {series.name}
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          {series.themeName} · Unidade: <strong className="font-mono text-slate-700">{series.unit}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadgeBg}`}>
                        {statusLabel}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                        isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {series.fiveYearChangePct > 0 ? '+' : ''}{series.fiveYearChangePct}% (5 Anos)
                      </span>
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="block text-[10px] text-slate-400">Linha de Base</span>
                      <strong className="font-mono text-slate-800">
                        {series.baseline?.value ? series.baseline.value.toLocaleString('pt-BR') : '—'}
                      </strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="block text-[10px] text-slate-400">Meta {selectedYear}</span>
                      <strong className="font-mono text-amber-700">
                        {series.target2026 ? series.target2026.toLocaleString('pt-BR') : '—'}
                      </strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="block text-[10px] text-slate-400">Realizado {selectedYear}</span>
                      <strong className="font-mono text-emerald-700">
                        {series.years[selectedYear]?.total ? series.years[selectedYear].total.toLocaleString('pt-BR') : '0'}
                      </strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="block text-[10px] text-slate-400">Projeção Anual</span>
                      <strong className="font-mono text-slate-800">
                        {perf?.result?.annualProjection ? Math.round(perf.result.annualProjection).toLocaleString('pt-BR') : '—'}
                      </strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="block text-[10px] text-slate-400">Variação YoY</span>
                      <strong className={`font-mono ${series.yoyChangePct < 0 ? 'text-emerald-700' : 'text-slate-800'}`}>
                        {series.yoyChangePct > 0 ? '+' : ''}{series.yoyChangePct}%
                      </strong>
                    </div>
                  </div>

                  {/* Two Columns: Left = Individual 5-Year Chart, Right = Detailed Explanatory Text */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
                    {/* Left: Dedicated Vector / Bar Chart */}
                    <div className="lg:col-span-5 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold border-b border-slate-200/60 pb-1.5">
                        <span>Série Quinquenal (2022–2026)</span>
                        {targetVal > 0 && (
                          <span className="text-amber-700 font-mono text-[10px]">
                            Linha da Meta: {targetVal.toLocaleString('pt-BR')}
                          </span>
                        )}
                      </div>

                      <div className="flex items-end justify-between gap-2 h-32 pt-3 pb-1 border-b border-slate-200 relative">
                        {/* Target line overlay */}
                        {targetVal > 0 && (
                          <div
                            style={{ bottom: `${Math.min(95, Math.max(10, Math.round((targetVal / maxVal) * 100)))}%` }}
                            className="absolute left-0 right-0 border-b-2 border-dashed border-amber-500/80 pointer-events-none z-10"
                            title={`Meta ${selectedYear}: ${targetVal}`}
                          />
                        )}

                        {years.map(yr => {
                          const val = series.years[yr]?.total || 0;
                          const heightPct = Math.max(8, Math.min(100, Math.round((val / maxVal) * 100)));
                          const isCurrent = yr === selectedYear;

                          return (
                            <div key={yr} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end relative z-0">
                              <span className="text-[10px] font-bold font-mono text-slate-700 tabular-nums">
                                {val >= 10000 ? `${Math.round(val / 1000)}k` : (val >= 100 ? Math.round(val) : val.toFixed(1))}
                              </span>
                              <div
                                style={{ height: `${heightPct}%` }}
                                className={`w-full max-w-[34px] rounded-t-md transition-all ${
                                  isCurrent
                                    ? 'bg-gradient-to-t from-emerald-600 to-teal-500 shadow-sm ring-2 ring-emerald-500/30'
                                    : 'bg-slate-400 hover:bg-slate-500'
                                }`}
                              />
                              <span className={`text-[11px] font-mono ${isCurrent ? 'font-bold text-emerald-700' : 'text-slate-500'}`}>
                                {yr}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: Small structured explanatory texts */}
                    <div className="lg:col-span-7 flex flex-col justify-between space-y-2.5 text-xs">
                      <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100/80 space-y-1">
                        <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Meta Estipulada para o Exercício</span>
                        </span>
                        <p className="text-slate-700 text-[11px] leading-relaxed">
                          {narrative.targetDescription}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                          <span>Alcance do Indicador em {selectedYear}</span>
                        </span>
                        <p className="text-slate-700 text-[11px] leading-relaxed">
                          {narrative.achievementDescription}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-indigo-50/40 border border-indigo-100/80 space-y-1">
                        <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                          <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Comparação com Anos Anteriores (2022–2026)</span>
                        </span>
                        <p className="text-slate-700 text-[11px] leading-relaxed">
                          {narrative.historicalComparison}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Deep-Dive Component */}
          <div className="pt-2">
            <h5 className="text-xs font-bold text-slate-700 mb-2">Análise Detalhada por Indicador Individual:</h5>
            <HistoricalCharts
              seriesList={historicalSeries}
              selectedYear={selectedYear}
              onOpenSpreadsheetImport={onOpenSpreadsheetImport}
            />
          </div>
        </div>

        {/* Sections Loop with In-Place Human Editing */}
        <div className="space-y-8 pt-4 border-t border-slate-200">
          {sections.map(sec => {
            const isEditing = isEditingSection === sec.id;

            return (
              <div key={sec.id} className="group relative space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                      {sec.title}
                    </h3>
                    {sec.statusBadge && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold font-mono print:hidden">
                        {sec.statusBadge}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setIsEditingSection(isEditing ? null : sec.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditing ? 'Concluir' : 'Editar Texto'}</span>
                  </button>
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      rows={7}
                      value={sec.content}
                      onChange={e => handleUpdateContent(sec.id, e.target.value)}
                      className="w-full p-3 text-xs leading-relaxed text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setIsEditingSection(null)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Salvar Alteração</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-700 leading-relaxed font-sans text-justify whitespace-pre-wrap">
                    {sec.content}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Signatures Footer */}
        <div className="pt-10 border-t border-slate-200 mt-10 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="w-48 border-t border-slate-400 mx-auto mb-1"></div>
            <div className="font-bold text-slate-800">Dr. Roberto Magalhães</div>
            <div className="text-slate-500 text-[11px]">Coordenador da Comissão Gestora do PLS</div>
          </div>

          <div>
            <div className="w-48 border-t border-slate-400 mx-auto mb-1"></div>
            <div className="font-bold text-slate-800">Dra. Beatriz Albuquerque</div>
            <div className="text-slate-500 text-[11px]">Juíza Federal Diretora do Foro — SJRR</div>
          </div>
        </div>
      </div>

      {/* AI Generation Settings Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Geração do Relatório Anual com IA (Gemini 3.8 Flash)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Art. 22 Res. CNJ 400/2021 & Res. CNJ 594/2024
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Foco da Elaboração Analítica
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomFocus('PADRAO_CNJ')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      customFocus === 'PADRAO_CNJ'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 font-semibold'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold">Padrão Oficial CNJ</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Equilíbrio total entre todos os eixos normativos</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomFocus('DESCARBONIZACAO')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      customFocus === 'DESCARBONIZACAO'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 font-semibold'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold">Foco em Carbono Zero</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Ênfase em emissões GEE (Res. CNJ 594/2024)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomFocus('ORCAMENTO')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      customFocus === 'ORCAMENTO'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 font-semibold'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold">Eficiência e Custos</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Foco na economicidade e compras sustentáveis</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomFocus('PERSONALIZADO')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      customFocus === 'PERSONALIZADO'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 font-semibold'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold">Instrução Específica</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Digitar orientação sob medida</div>
                  </button>
                </div>
              </div>

              {customFocus === 'PERSONALIZADO' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Instruções Específicas para a IA
                  </label>
                  <textarea
                    rows={3}
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.target.value)}
                    placeholder="Ex: Destaque a substituição dos chillers, a economia de papel e justifique os dados atípicos de agosto..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  O modelo <strong>Gemini 3.8 Flash</strong> processará a série histórica completa de 5 anos (2022–2026), os números auditados do ano de {selectedYear}, as 14 ações socioambientais e os alertas técnicos cadastrados.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGenerateWithAI}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs shadow-emerald-600/20 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Iniciar Geração</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
