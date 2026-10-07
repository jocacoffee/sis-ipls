import React, { useState } from 'react';
import {
  Sun,
  Moon,
  Bell,
  Search,
  Menu,
  ShieldCheck,
  Building2,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Organization, UserRole, InconsistencyAlert } from '../types';
import { ActiveTab } from './Sidebar';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  organizations: Organization[];
  selectedOrgId: string;
  setSelectedOrgId: (id: string) => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  alerts: InconsistencyAlert[];
  onToggleMobileSidebar: () => void;
  onOpenChatWithQuery: (q: string) => void;
}

const TAB_TITLES: Record<ActiveTab, { title: string; subtitle: string; category: string }> = {
  dashboard: {
    title: 'Visão Geral',
    subtitle: 'Gestão inteligente do Plano de Logística Sustentável',
    category: 'iPLS'
  },
  indicators: {
    title: 'Indicadores PLS',
    subtitle: 'Catálogo de métricas, metas e conformidade normativa',
    category: 'iPLS'
  },
  targets: {
    title: 'Metas & Projeções',
    subtitle: 'Acompanhamento de metas do ciclo e limites operacionais',
    category: 'Gestão'
  },
  'data-ingestion': {
    title: 'Coleta de Dados',
    subtitle: 'Lançamentos mensais e alimentação da base',
    category: 'Gestão'
  },
  documents: {
    title: 'Documentos & Faturas',
    subtitle: 'Evidências comprobatórias, faturas e extração OCR',
    category: 'iPLS'
  },
  'action-plans': {
    title: 'Plano de Ação',
    subtitle: 'Iniciativas estruturantes e monitoramento de execução',
    category: 'iPLS'
  },
  'year-comparison': {
    title: 'Comparativo de Anos',
    subtitle: 'Análise multianual de desempenho e séries históricas',
    category: 'Sistema'
  },
  chat: {
    title: 'Inteligência do PLS',
    subtitle: 'Pergunte aos dados, documentos e indicadores do PLS',
    category: 'iPLS'
  },
  reports: {
    title: 'Relatório Anual',
    subtitle: 'Consolidação analítica de sustentabilidade e conformidade CNJ',
    category: 'iPLS'
  },
  ghg: {
    title: 'Inventário de GEE',
    subtitle: 'Programa Justiça Carbono Zero — Resolução CNJ nº 594/2024',
    category: 'Sistema'
  },
  integrations: {
    title: 'Integrações',
    subtitle: 'Conectores SEI e transmissão de dados ao PLS-Jud (CNJ)',
    category: 'Sistema'
  },
  audit: {
    title: 'Auditoria & Qualidade',
    subtitle: 'Logs de rastreabilidade e validação de consistência',
    category: 'Sistema'
  }
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  organizations,
  selectedOrgId,
  setSelectedOrgId,
  currentRole,
  setCurrentRole,
  alerts,
  onToggleMobileSidebar,
  onOpenChatWithQuery
}) => {
  const { theme, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const currentOrg = organizations.find(o => o.id === selectedOrgId) || organizations[0];
  const pageInfo = TAB_TITLES[activeTab] || {
    title: 'iPLS',
    subtitle: 'Gestão de Logística Sustentável',
    category: 'Sistema'
  };

  const activeAlerts = alerts.filter(a => !a.resolved);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md transition-colors duration-200 sm:px-6 lg:px-8 dark:border-slate-800/80 dark:bg-slate-900/90">
      {/* Left zone: Mobile toggle & Breadcrumb context */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleMobileSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          aria-label="Abrir menu lateral"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <span className="truncate">{pageInfo.category}</span>
            <span>/</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {pageInfo.title}
            </span>
          </div>
          <h1 className="truncate text-sm font-bold text-slate-900 dark:text-white sm:text-base">
            {pageInfo.title}
          </h1>
        </div>
      </div>

      {/* Center/Right zone: Org Indicator, Actions, Theme Toggle, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Organization Badge (Interactive Popover) */}
        <div className="relative hidden md:block">
          <button
            onClick={() => setShowOrgDropdown(!showOrgDropdown)}
            className="flex items-center gap-2 rounded-lg border border-slate-200/90 bg-slate-50/70 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Building2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {currentOrg.acronym}
            </span>
            <span className="text-slate-400 hidden xl:inline">· Ciclo 2021-2026</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {showOrgDropdown && (
            <div className="absolute right-0 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50">
              <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Selecione a Unidade
              </div>
              <div className="space-y-1 mt-1">
                {organizations.map(org => (
                  <button
                    key={org.id}
                    onClick={() => {
                      setSelectedOrgId(org.id);
                      setShowOrgDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors ${
                      org.id === selectedOrgId
                        ? 'bg-emerald-50 text-emerald-800 font-semibold dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{org.name}</span>
                    <span className="font-mono text-[10px] text-slate-400">{org.uf}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick AI Assistant Trigger */}
        <button
          onClick={() => setActiveTab('chat')}
          className="hidden sm:flex items-center gap-1.5 rounded-lg border border-emerald-200/90 bg-emerald-50/70 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100/80 transition-colors shadow-2xs dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
          title="Perguntar à Inteligência Artificial do PLS"
        >
          <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Inteligência</span>
        </button>

        {/* Notification / Inconsistency Center */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label="Notificações e Inconsistências"
          >
            <Bell className="h-4 w-4" />
            {activeAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow-xs">
                {activeAlerts.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900 z-50 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    Inconsistências & Alertas ({activeAlerts.length})
                  </h3>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                {activeAlerts.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    <CheckCircle2 className="mx-auto mb-1.5 h-6 w-6 text-emerald-500" />
                    Nenhuma inconsistência detectada na base de dados.
                  </div>
                ) : (
                  activeAlerts.map(alert => (
                    <div
                      key={alert.id}
                      className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-2.5 text-xs transition-colors dark:border-amber-900/60 dark:bg-amber-950/30"
                    >
                      <div className="font-semibold text-amber-900 dark:text-amber-200">
                        {alert.type}
                      </div>
                      <p className="mt-0.5 text-[11px] text-amber-800 dark:text-amber-300/90 leading-tight">
                        {alert.message}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-mono">
                          Mês {alert.month}
                        </span>
                        <button
                          onClick={() => {
                            setShowNotifications(false);
                            onOpenChatWithQuery(`Explique a inconsistência detectada: ${alert.message}`);
                          }}
                          className="text-[10px] font-bold text-amber-700 hover:underline dark:text-amber-400"
                        >
                          Investigar com IA →
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle (☀️ Claro ↔ 🌙 Escuro) */}
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors dark:border-slate-800 dark:text-amber-400 dark:hover:bg-slate-800 dark:hover:text-amber-300"
          title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
          aria-label="Alternar tema claro e escuro"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-slate-600" />
          )}
        </button>

        {/* User Profile / Role Badge */}
        <div className="relative">
          <button
            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
            className="flex items-center gap-2 rounded-lg border border-slate-200/90 bg-slate-50/70 p-1.5 sm:px-2.5 sm:py-1.5 text-xs text-left hover:bg-slate-100 transition-colors dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[11px] shrink-0">
              RM
            </div>
            <div className="hidden sm:block text-left">
              <div className="font-semibold text-slate-900 dark:text-slate-100 leading-none text-xs">
                Dr. Roberto Magalhães
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium leading-none mt-0.5">
                {currentRole === 'GESTOR_PLS' ? 'Gestor do PLS' : currentRole}
              </div>
            </div>
            <ChevronDown className="h-3 w-3 text-slate-400 hidden sm:block" />
          </button>

          {showRoleDropdown && (
            <div className="absolute right-0 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Alternar Papel (RBAC)
              </div>
              <div className="space-y-1 mt-1">
                {(
                  [
                    ['GESTOR_PLS', 'Gestor do PLS (Edição/Validação)'],
                    ['ADMIN', 'Administrador (Total)'],
                    ['RESPONSAVEL_INDICADOR', 'Resp. Indicador (Coleta)'],
                    ['CONSULTOR', 'Consultor (Consulta/Chat)'],
                    ['AUDITOR', 'Auditor (Somente Leitura)']
                  ] as const
                ).map(([role, label]) => (
                  <button
                    key={role}
                    onClick={() => {
                      setCurrentRole(role as UserRole);
                      setShowRoleDropdown(false);
                    }}
                    className={`w-full rounded-lg px-2 py-1.5 text-xs text-left transition-colors ${
                      role === currentRole
                        ? 'bg-emerald-50 text-emerald-800 font-semibold dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
