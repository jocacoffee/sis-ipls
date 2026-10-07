import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  FileText,
  Database,
  BookOpen,
  HelpCircle,
  TrendingUp,
  AlertCircle,
  Copy,
  Check,
  Building2,
  RefreshCw,
  CornerDownLeft,
  Settings,
  Server,
  Cpu,
  Zap,
  Globe,
  Wifi,
  WifiOff,
  CheckCircle2,
  XCircle,
  Loader2,
  Sliders,
  ChevronDown,
  Info
} from 'lucide-react';
import {
  ChatMessage,
  Indicator,
  IndicatorMeasurement,
  IndicatorTarget,
  ActionPlan,
  PLSDocument,
  InconsistencyAlert,
  AIProviderMode,
  LocalAIConfig
} from '../types';
import { queryInstitutionalAI } from '../services/aiService';

interface ChatViewProps {
  organizationName: string;
  organizationId: string;
  selectedYear: number;
  indicators: Indicator[];
  measurements: IndicatorMeasurement[];
  targets: IndicatorTarget[];
  actionPlans: ActionPlan[];
  documents: PLSDocument[];
  alerts: InconsistencyAlert[];
  initialQuery?: string;
  onClearInitialQuery?: () => void;
}

const DEFAULT_LOCAL_CONFIG: LocalAIConfig = {
  endpoint: 'http://localhost:11434/v1',
  model: 'llama3.3',
  apiKey: '',
  temperature: 0.2
};

export const ChatView: React.FC<ChatViewProps> = ({
  organizationName,
  organizationId,
  selectedYear,
  indicators,
  measurements,
  targets,
  actionPlans,
  documents,
  alerts,
  initialQuery,
  onClearInitialQuery
}) => {
  // AI Provider & Local AI settings
  const [providerMode, setProviderMode] = useState<AIProviderMode>(() => {
    const saved = localStorage.getItem('ipls_ai_provider');
    return (saved as AIProviderMode) || 'gemini';
  });

  const [localConfig, setLocalConfig] = useState<LocalAIConfig>(() => {
    try {
      const saved = localStorage.getItem('ipls_local_ai_config');
      return saved ? JSON.parse(saved) : DEFAULT_LOCAL_CONFIG;
    } catch {
      return DEFAULT_LOCAL_CONFIG;
    }
  });

  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
    models?: string[];
  } | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      timestamp: new Date().toISOString(),
      text: `Olá! Eu sou a **Inteligência Artificial Analítica do PLS**, assistente oficial de governança e sustentabilidade da **${organizationName}**.\n\nMinhas análises combinam o **conhecimento normativo do CNJ (Resoluções nº 400/2021 e nº 594/2024)**, faturas e processos do SEI, o inventário de GEE e todas as medições auditadas dos 21 temas do PLS.\n\nVocê pode alternar entre a **API do Gemini (Nuvem com RAG)** e a **IA Local (On-Premise na rede da SJRR)** nos seletores acima.\n\nComo posso apoiar sua análise hoje?`,
      suggestedQuestions: [
        'Como está o panorama geral de metas do PLS da SJRR?',
        'Qual foi o consumo de energia elétrica em agosto e a causa do pico?',
        'Qual é o balanço de copos plásticos descartáveis na SJRR?',
        'Como está a conformidade da Resolução CNJ 594/2024 (Justiça Carbono Zero)?',
        'Quais são os principais riscos e ações prioritárias no momento?'
      ],
      providerUsed: 'gemini',
      modelUsed: 'Google Gemini 3.8 Flash (RAG Ativo)'
    }
  ]);

  const [inputQuery, setInputQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Save provider choice in localStorage
  useEffect(() => {
    localStorage.setItem('ipls_ai_provider', providerMode);
  }, [providerMode]);

  // Save localConfig in localStorage
  useEffect(() => {
    localStorage.setItem('ipls_local_ai_config', JSON.stringify(localConfig));
  }, [localConfig]);

  // Execute initial query if passed from other views
  useEffect(() => {
    if (initialQuery && initialQuery.trim().length > 0) {
      handleSendMessage(initialQuery);
      if (onClearInitialQuery) onClearInitialQuery();
    }
  }, [initialQuery]);

  const handleTestLocalConnection = async () => {
    setTestingConnection(true);
    setConnectionTestResult(null);
    try {
      const res = await fetch('/api/ai/test-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localConfig)
      });
      const data = await res.json();
      setConnectionTestResult(data);
    } catch (err: any) {
      setConnectionTestResult({
        success: false,
        message: `Falha de rede ao testar endpoint: ${err?.message || 'Host inacessível'}`
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    const q = textToSend.trim();
    if (!q || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toISOString(),
      text: q
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInputQuery('');
    setIsLoading(true);

    try {
      // Build conversation history for context
      const conversationHistory = nextHistory
        .filter(m => m.id !== 'welcome')
        .slice(-6)
        .map(m => ({
          role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.text
        }));

      // Call server endpoint with RAG + Gemini / Local AI
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          year: selectedYear,
          orgId: organizationId,
          provider: providerMode,
          localConfig,
          conversationHistory
        })
      });

      if (res.ok) {
        const aiResponse: ChatMessage = await res.json();
        setMessages(prev => [...prev, aiResponse]);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn('[ChatView] Erro ao chamar servidor, acionando fallback institucional offline:', err);
      try {
        const fallbackResponse = await queryInstitutionalAI(q, {
          organizationName,
          organizationId,
          year: selectedYear,
          indicators,
          measurements,
          targets,
          actionPlans,
          documents,
          alerts
        });
        setMessages(prev => [
          ...prev,
          {
            ...fallbackResponse,
            providerUsed: 'heuristic',
            modelUsed: 'Motor Analítico Offline SJRR'
          }
        ]);
      } catch (fallbackErr) {
        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toISOString(),
          text: 'Ocorreu um erro ao consultar os dados estruturados do PLS. Por favor, tente novamente.',
          providerUsed: providerMode
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden transition-colors dark:border-slate-800/80 dark:bg-slate-900">
      {/* Header com Seletor de IA (Gemini RAG vs IA Local SJRR) */}
      <div className="p-4 sm:px-6 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-xs">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Inteligência do PLS
              </h3>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                RAG Normativo & Auditado
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Análise com Gemini Cloud API e suporte a IA Local (On-Premise na SJRR)
            </p>
          </div>
        </div>

        {/* Engine Switcher & Local Settings Button */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Provider Toggle Pill */}
          <div className="flex items-center rounded-xl bg-slate-200/70 dark:bg-slate-800 p-0.5 border border-slate-300/60 dark:border-slate-700 text-xs">
            <button
              onClick={() => setProviderMode('gemini')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                providerMode === 'gemini'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Utiliza a API Google Gemini com RAG completo"
            >
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              <span>Gemini Nuvem</span>
            </button>

            <button
              onClick={() => setProviderMode('local')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                providerMode === 'local'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Utiliza o servidor de IA local nas dependências da SJRR (Ollama / Rede Local)"
            >
              <Server className="w-3.5 h-3.5 text-amber-500" />
              <span>IA Local (SJRR)</span>
            </button>

            <button
              onClick={() => setProviderMode('heuristic')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                providerMode === 'heuristic'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Motor determinístico interno (100% offline)"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-500" />
              <span>Offline</span>
            </button>
          </div>

          {/* Config Local AI Button */}
          <button
            onClick={() => setShowConfigModal(true)}
            className="p-2 rounded-xl border border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1 text-xs font-semibold shadow-2xs"
            title="Configurar IA Local para uso nas dependências da SJRR"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Configurar IA Local</span>
          </button>
        </div>
      </div>

      {/* Active Mode Notice Banner */}
      <div className="px-4 py-2 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-2">
          {providerMode === 'gemini' && (
            <>
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span><strong>Modo Gemini API (RAG Ativo):</strong> Análise com <em>gemini-3.8-flash</em> cruzando Resoluções CNJ 400/2021 e 594/2024 com dados reais de {selectedYear}.</span>
            </>
          )}
          {providerMode === 'local' && (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span><strong>Modo IA Local SJRR:</strong> Conectando em <code>{localConfig.endpoint}</code> (Modelo: <strong>{localConfig.model}</strong>) com RAG institucional injetado.</span>
            </>
          )}
          {providerMode === 'heuristic' && (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span><strong>Modo Offline Interno:</strong> Motor de inferência e cálculo relacional sem conexão externa.</span>
            </>
          )}
        </div>

        <span className="font-mono text-[10px] text-slate-400 hidden md:inline">
          {organizationName} · {selectedYear}
        </span>
      </div>

      {/* Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map(msg => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-3xl ${
                isUser ? 'ml-auto' : 'mr-auto'
              }`}
            >
              <div
                className={`p-4 sm:p-5 rounded-3xl text-xs leading-relaxed ${
                  isUser
                    ? 'bg-emerald-600 text-white rounded-br-xs shadow-xs font-medium'
                    : 'bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 rounded-bl-xs shadow-xs'
                }`}
              >
                {/* Provider / Model Badge if available */}
                {!isUser && msg.modelUsed && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/60 text-[10px]">
                    <span className="flex items-center gap-1 font-semibold text-emerald-800 dark:text-emerald-300">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      {msg.modelUsed}
                    </span>
                    {msg.providerUsed === 'gemini' && (
                      <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold dark:bg-blue-950 dark:text-blue-300">
                        Google Gemini
                      </span>
                    )}
                    {msg.providerUsed === 'local' && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold dark:bg-amber-950 dark:text-amber-300">
                        IA Local SJRR
                      </span>
                    )}
                  </div>
                )}

                {/* Text Content */}
                <div className="whitespace-pre-wrap font-sans">
                  {msg.text.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="mb-2.5 last:mb-0">
                      {paragraph.split('**').map((chunk, j) =>
                        j % 2 === 1 ? (
                          <strong key={j} className={isUser ? 'text-white font-bold' : 'text-slate-900 dark:text-white font-bold'}>
                            {chunk}
                          </strong>
                        ) : (
                          chunk
                        )
                      )}
                    </p>
                  ))}
                </div>

                {/* Evidence & Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Evidências e Fontes Utilizadas:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((s, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] shadow-2xs"
                        >
                          {s.type === 'DADO_ESTRUTURADO' && <Database className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                          {s.type === 'DOCUMENTO' && <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
                          {s.type === 'NORMATIVA' && <BookOpen className="w-3 h-3 text-purple-600 dark:text-purple-400" />}
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{s.title}:</span>
                          <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px]">{s.reference}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Questions */}
                {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Perguntas Recomendadas:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestedQuestions.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(q)}
                          className="text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl transition-colors text-left"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Timestamp & Copy */}
              <div className="mt-1 flex items-center gap-2 px-2 text-[10px] text-slate-400">
                <span>{new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                {!isUser && (
                  <button
                    onClick={() => handleCopyText(msg.id, msg.text)}
                    className="hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 ml-1"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600 font-semibold">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md">
            <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
            <div className="text-xs text-slate-600 dark:text-slate-300">
              {providerMode === 'gemini' && 'Consultando API do Gemini com RAG normativo do CNJ e medições do PLS...'}
              {providerMode === 'local' && `Processando na IA Local da SJRR (${localConfig.model})...`}
              {providerMode === 'heuristic' && 'Analisando banco de dados relacional e normativas do CNJ...'}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3.5 sm:p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage(inputQuery);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={e => setInputQuery(e.target.value)}
            placeholder="Pergunte sobre consumo, metas, relatórios, faturas ou ações estruturantes..."
            className="flex-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
          />

          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </form>
      </div>

      {/* Modal de Configuração de IA Local para as Dependências da SJRR */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Configurar IA Local (SJRR)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Execução on-premise nas dependências e rede interna da Justiça Federal
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowConfigModal(false)}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Endpoint URL */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Endpoint da IA Local (Compatível com OpenAI / Ollama / vLLM):
                </label>
                <input
                  type="text"
                  value={localConfig.endpoint}
                  onChange={e => setLocalConfig(prev => ({ ...prev, endpoint: e.target.value }))}
                  placeholder="http://localhost:11434/v1 ou http://10.x.x.x:11434/v1"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Exemplos: <code>http://localhost:11434/v1</code> (Ollama padrão), <code>http://192.168.1.50:11434/v1</code> ou endereço do servidor de IA da SJRR.
                </span>
              </div>

              {/* Model Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome do Modelo:
                  </label>
                  <input
                    type="text"
                    value={localConfig.model}
                    onChange={e => setLocalConfig(prev => ({ ...prev, model: e.target.value }))}
                    placeholder="llama3.3, mistral, deepseek-r1..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Temperatura (0.0 a 1.0):
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={localConfig.temperature ?? 0.2}
                    onChange={e => setLocalConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0.2 }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Bearer Token / API Key if required */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Chave / Token de Acesso (Opcional):
                </label>
                <input
                  type="password"
                  value={localConfig.apiKey || ''}
                  onChange={e => setLocalConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="Deixe em branco se o Ollama não requerer autenticação"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Informative Security & Offline Note */}
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 p-3.5 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                  <strong>Privacidade Absoluta e Soberania de Dados:</strong> No modo de IA Local, nenhuma pergunta ou dado de auditoria sai das instalações da Seção Judiciária de Roraima. As inferências ocorrem 100% no hardware interno do TRF1/SJRR com injeção do RAG institucional.
                </div>
              </div>

              {/* Connection Test Results */}
              {connectionTestResult && (
                <div
                  className={`rounded-2xl p-3.5 border flex items-start gap-2.5 ${
                    connectionTestResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
                      : 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/40 dark:border-red-800 dark:text-red-200'
                  }`}
                >
                  {connectionTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="text-[11px] leading-relaxed">
                    <span className="font-semibold block">{connectionTestResult.message}</span>
                    {connectionTestResult.latencyMs && (
                      <span className="text-[10px] opacity-80 block mt-0.5">
                        Latência aferida: <strong>{connectionTestResult.latencyMs}ms</strong>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleTestLocalConnection}
                disabled={testingConnection}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {testingConnection ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                    <span>Testando...</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-amber-600" />
                    <span>Testar Conexão</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setProviderMode('local');
                    setShowConfigModal(false);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  Salvar e Usar IA Local
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

