import React from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Target,
  FileSpreadsheet,
  FileText,
  ListTodo,
  TrendingUp,
  MessageSquare,
  BookOpen,
  Leaf,
  Network,
  Users,
  ShieldCheck,
  Building2,
  UserCheck,
  Calendar,
  Layers,
  PanelLeftClose
} from 'lucide-react';
import { Organization } from '../types';
import { AuthUser, ROLE_LABEL } from '../services/authClient';
import {
  getAllAvailableCycles,
  getYearsForCycle,
  getCycleInfo,
  getCycleFromYear
} from '../utils/yearUtils';

export type ActiveTab =
  | 'dashboard'
  | 'indicators'
  | 'targets'
  | 'data-ingestion'
  | 'documents'
  | 'action-plans'
  | 'year-comparison'
  | 'chat'
  | 'reports'
  | 'ghg'
  | 'integrations'
  | 'audit'
  | 'users';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  organizations: Organization[];
  selectedOrgId: string;
  setSelectedOrgId: (id: string) => void;
  authUser: AuthUser | null;
  canEdit: boolean;
  onLogin: () => void;
  onLogout: () => void;
  showUsersTab?: boolean;
  /** Mostra os módulos em construção (perfil dev). */
  showDevTabs?: boolean;
  activeAlertsCount: number;
  pendingValidationCount: number;
  selectedYear?: number;
  setSelectedYear?: (year: number) => void;
  selectedCycle?: string;
  setSelectedCycle?: (cycle: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  organizations,
  selectedOrgId,
  setSelectedOrgId,
  authUser,
  canEdit,
  onLogin,
  onLogout,
  showUsersTab = false,
  showDevTabs = false,
  activeAlertsCount,
  pendingValidationCount,
  selectedYear = 2026,
  setSelectedYear,
  selectedCycle,
  setSelectedCycle,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const currentOrg = organizations.find(o => o.id === selectedOrgId) || organizations[0];
  const currentYear = selectedYear ?? 2026;
  const effectiveCycle = selectedCycle || getCycleFromYear(currentYear);
  const cycleInfo = getCycleInfo(effectiveCycle);
  const cycleYears = getYearsForCycle(effectiveCycle);
  const availableCycles = getAllAvailableCycles();

  const handleCycleSelect = (newCycle: string) => {
    if (setSelectedCycle) {
      setSelectedCycle(newCycle);
    }
    if (setSelectedYear) {
      const years = getYearsForCycle(newCycle);
      if (!years.includes(currentYear)) {
        // If current calendar year is in the new cycle, select it, otherwise the first year of the cycle
        const cal = new Date().getFullYear();
        setSelectedYear(years.includes(cal) ? cal : years[0]);
      }
    }
  };

  const navItems: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    isAi?: boolean;
    highlight?: string;
    badge?: string;
    badgeColor?: string;
    beta?: boolean;
    dev?: boolean;
  }[] = [
    { id: 'dashboard', label: 'Painel Executivo', icon: LayoutDashboard },
    { id: 'indicators', label: 'Indicadores PLS', icon: BarChart3 },
    { id: 'targets', label: 'Metas & Projeções', icon: Target },
    { id: 'data-ingestion', label: 'Coleta de Dados', icon: FileSpreadsheet },
    ...(showDevTabs
      ? [{
          id: 'documents',
          label: 'Documentos & OCR',
          icon: FileText,
          badge: pendingValidationCount > 0 ? `${pendingValidationCount}` : undefined,
          badgeColor: 'bg-blue-600',
          dev: true
        }]
      : []),
    { id: 'action-plans', label: 'Plano de Ação', icon: ListTodo },
    { id: 'year-comparison', label: 'Comparar Anos', icon: TrendingUp },
    { id: 'chat', label: 'Chat IA & Apoio', icon: MessageSquare, isAi: true, beta: true },
    { id: 'reports', label: 'Relatório Anual', icon: BookOpen, beta: true },
    { id: 'ghg', label: 'Inventário GEE', icon: Leaf, highlight: 'Carbono Zero' },
    ...(showDevTabs ? [{ id: 'integrations', label: 'Integrações (SEI / CNJ)', icon: Network, dev: true }] : []),
    {
      id: 'audit',
      label: 'Auditoria & Qualidade',
      icon: ShieldCheck,
      badge: activeAlertsCount > 0 ? `${activeAlertsCount}` : undefined,
      badgeColor: 'bg-amber-600'
    },
    ...(showUsersTab ? [{ id: 'users', label: 'Usuários e Permissões', icon: Users }] : [])
  ];

  return (
    <aside
      className={`w-68 bg-slate-900 text-slate-200 flex flex-col flex-shrink-0 h-screen sticky top-0 border-r border-slate-800 select-none transition-all duration-300 ease-in-out z-30 ${
        isCollapsed ? '-ml-68 pointer-events-none opacity-0 invisible' : 'ml-0 opacity-100 visible'
      }`}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md font-bold text-lg">
              ⚖️
            </div>
            <div>
              <div className="text-[10px] font-semibold tracking-wider text-emerald-400 uppercase">
                Poder Judiciário Federal
              </div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-baseline gap-1">
                <span className="text-emerald-400 font-extrabold text-lg">iPLS</span>
                <span className="text-slate-300 font-semibold text-xs tracking-wide">Inteligente</span>
              </h1>
            </div>
          </div>

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Ocultar barra lateral (Ctrl+B)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Ocultar barra lateral"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Multi-Tenant Organization Selector */}
        <div className="mt-3.5 pt-3 border-t border-slate-800/80">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            Órgão Jurisdicional
          </label>
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="w-full bg-slate-800/90 text-xs font-medium text-slate-100 rounded-md border border-slate-700 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.acronym} — {org.name}
              </option>
            ))}
          </select>
          {/* Ciclo Oficial CNJ (Resolução nº 400/2021) */}
          <div className="mt-3 pt-2.5 border-t border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3 h-3 text-emerald-400" />
                Ciclo do PLS (CNJ)
              </label>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold border ${
                  cycleInfo.status === 'VIGENTE'
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {cycleInfo.status === 'VIGENTE' ? 'Vigente' : 'Previsto'}
              </span>
            </div>
            <select
              value={effectiveCycle}
              onChange={(e) => handleCycleSelect(e.target.value)}
              className="w-full bg-slate-800/90 text-xs font-semibold text-slate-100 rounded-md border border-slate-700 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer hover:border-slate-600 transition-colors"
              title="Selecione o Ciclo Oficial do PLS"
            >
              {availableCycles.map(c => (
                <option key={c.cycle} value={c.cycle}>
                  {c.cycleNumber}º Ciclo ({c.cycle}) {c.status === 'VIGENTE' ? '• Vigente' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Anos do Ciclo Correspondente */}
          {setSelectedYear && (
            <div className="mt-2.5 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-400" />
                  Exercício Ativo ({cycleInfo.cycleNumber}º Ciclo)
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">{currentYear}</span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {cycleYears.map(y => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setSelectedYear(y)}
                    className={`py-1 rounded text-[11px] font-mono font-bold transition-all text-center cursor-pointer ${
                      currentYear === y
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                    title={`Visualizar dados do exercício de ${y} (${cycleInfo.cycleNumber}º Ciclo ${cycleInfo.cycle})`}
                  >
                    {String(y).slice(2)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        <div className="px-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Módulos Principais
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as ActiveTab)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? 'text-white' : item.isAi ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {item.beta && (
                  <span
                    title="Módulo em fase de testes"
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border ${
                      isActive ? 'bg-white/20 text-white border-white/40' : 'bg-amber-900/50 text-amber-300 border-amber-700/60'
                    }`}
                  >
                    Beta
                  </span>
                )}
                {item.dev && (
                  <span
                    title="Visível só para o perfil de desenvolvimento"
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border ${
                      isActive ? 'bg-white/20 text-white border-white/40' : 'bg-violet-900/50 text-violet-300 border-violet-700/60'
                    }`}
                  >
                    Dev
                  </span>
                )}
                {item.highlight && !isActive && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-semibold border border-emerald-700/50">
                    {item.highlight}
                  </span>
                )}
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full text-white ${
                      item.badgeColor || 'bg-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Sessão do usuário (login no AD da 1ª Região) */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
          <UserCheck className="w-3.5 h-3.5 text-teal-400" />
          Acesso
        </label>
        {authUser ? (
          <div className="space-y-1.5">
            <div className="text-xs text-slate-100 font-semibold truncate" title={authUser.username}>
              {authUser.displayName}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {ROLE_LABEL[authUser.role]}{authUser.dev ? ' · Dev' : ''} · {authUser.username}
            </div>
            <div className={`text-[10px] font-semibold ${canEdit ? 'text-emerald-400' : 'text-amber-300'}`}>
              {canEdit ? 'Pode lançar dados neste órgão' : 'Somente consulta neste órgão'}
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="w-full text-[11px] font-semibold rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 py-1"
            >
              Sair
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="text-[11px] text-slate-300">Visitante: consulta aos painéis sem login.</div>
            <button
              type="button"
              onClick={onLogin}
              className="w-full text-[11px] font-semibold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white py-1.5"
            >
              Entrar para lançar dados
            </button>
          </div>
        )}

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="mt-2.5 w-full flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-semibold border border-slate-700/60 transition-colors"
            title="Ocultar barra lateral para ampliar área de visualização dos dados (Ctrl+B)"
          >
            <PanelLeftClose className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ocultar Barra Lateral</span>
            <kbd className="px-1 py-0.2 text-[9px] font-mono bg-slate-900 text-slate-400 rounded border border-slate-700">
              Ctrl+B
            </kbd>
          </button>
        )}
      </div>
    </aside>
  );
};
