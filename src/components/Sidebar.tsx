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
  ShieldCheck,
  Building2,
  UserCheck,
  Calendar,
  PanelLeftClose
} from 'lucide-react';
import { Organization, UserRole } from '../types';

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
  | 'audit';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  organizations: Organization[];
  selectedOrgId: string;
  setSelectedOrgId: (id: string) => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  activeAlertsCount: number;
  pendingValidationCount: number;
  selectedYear?: number;
  setSelectedYear?: (year: number) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  organizations,
  selectedOrgId,
  setSelectedOrgId,
  currentRole,
  setCurrentRole,
  activeAlertsCount,
  pendingValidationCount,
  selectedYear = 2026,
  setSelectedYear,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const currentOrg = organizations.find(o => o.id === selectedOrgId) || organizations[0];

  const navItems = [
    { id: 'dashboard', label: 'Painel Executivo', icon: LayoutDashboard },
    { id: 'indicators', label: 'Indicadores PLS', icon: BarChart3 },
    { id: 'targets', label: 'Metas & Projeções', icon: Target },
    { id: 'data-ingestion', label: 'Coleta de Dados', icon: FileSpreadsheet },
    {
      id: 'documents',
      label: 'Documentos & OCR',
      icon: FileText,
      badge: pendingValidationCount > 0 ? `${pendingValidationCount}` : undefined,
      badgeColor: 'bg-blue-600'
    },
    { id: 'action-plans', label: 'Plano de Ação', icon: ListTodo },
    { id: 'year-comparison', label: 'Comparar Anos', icon: TrendingUp },
    { id: 'chat', label: 'Chat IA & Apoio', icon: MessageSquare, isAi: true },
    { id: 'reports', label: 'Relatório Anual', icon: BookOpen, highlight: 'IA / 5 Anos' },
    { id: 'ghg', label: 'Inventário GEE', icon: Leaf, highlight: 'Carbono Zero' },
    { id: 'integrations', label: 'Integrações (SEI / CNJ)', icon: Network },
    {
      id: 'audit',
      label: 'Auditoria & Qualidade',
      icon: ShieldCheck,
      badge: activeAlertsCount > 0 ? `${activeAlertsCount}` : undefined,
      badgeColor: 'bg-amber-600'
    }
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
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
            <span>Ciclo: PLS 2021-2026</span>
            <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
              Vigente
            </span>
          </div>

          {/* Quick Active Year Buttons (2021-2026) */}
          {setSelectedYear && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-400" />
                  Exercício Ativo
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">{selectedYear}</span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {[2021, 2022, 2023, 2024, 2025, 2026].map(y => (
                  <button
                    key={y}
                    onClick={() => setSelectedYear(y)}
                    className={`py-1 rounded text-[11px] font-mono font-bold transition-all text-center ${
                      selectedYear === y
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                    title={`Visualizar dados do exercício de ${y}`}
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

      {/* Footer Role Switcher & RBAC */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
          <UserCheck className="w-3.5 h-3.5 text-teal-400" />
          Perfil de Acesso (RBAC)
        </label>
        <select
          value={currentRole}
          onChange={(e) => setCurrentRole(e.target.value as UserRole)}
          className="w-full bg-slate-900 text-xs text-slate-200 rounded-md border border-slate-800 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
        >
          <option value="GESTOR_PLS">Gestor do PLS (Edição/Validação)</option>
          <option value="ADMIN">Administrador (Total)</option>
          <option value="RESPONSAVEL_INDICADOR">Resp. Indicador (Coleta)</option>
          <option value="CONSULTOR">Consultor (Consulta/Chat)</option>
          <option value="AUDITOR">Auditor (Somente Leitura)</option>
        </select>
        <div className="mt-2 text-[10px] text-slate-400 leading-tight">
          Sessão segura vinculada ao SEI e Portaria CNJ nº 400/2021.
        </div>

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
