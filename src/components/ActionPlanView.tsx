import React, { useState } from 'react';
import {
  ListTodo,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Edit2,
  Search,
  Filter,
  Check,
  Zap,
  Building,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Scale,
  FileText,
  Tag
} from 'lucide-react';
import { ActionPlan, Indicator, ActionStatus, PriorityLevel } from '../types';

interface ActionPlanViewProps {
  actionPlans: ActionPlan[];
  indicators: Indicator[];
  selectedYear: number;
  onSaveAction: (action: Partial<ActionPlan>) => void;
}

export const ActionPlanView: React.FC<ActionPlanViewProps> = ({
  actionPlans,
  indicators,
  selectedYear,
  onSaveAction
}) => {
  const [editingAction, setEditingAction] = useState<Partial<ActionPlan> | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterEixo, setFilterEixo] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract unique eixos
  const eixos = Array.from(
    new Set(actionPlans.map(a => a.eixoTematico).filter((e): e is string => Boolean(e)))
  );

  const filteredActions = actionPlans.filter(act => {
    if (filterStatus !== 'ALL' && act.status !== filterStatus) return false;
    if (filterEixo !== 'ALL' && act.eixoTematico !== filterEixo) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        act.title.toLowerCase().includes(q) ||
        act.responsibleUnit.toLowerCase().includes(q) ||
        act.responsibleUser.toLowerCase().includes(q) ||
        (act.eixoTematico && act.eixoTematico.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAction || !editingAction.title) return;
    onSaveAction(editingAction);
    setEditingAction(null);
  };

  const getStatusBadge = (status: ActionStatus) => {
    switch (status) {
      case 'CONCLUIDA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Concluída
          </span>
        );
      case 'ATRASADA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Atrasada
          </span>
        );
      case 'EM_ANDAMENTO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
            <Clock className="w-3 h-3 text-blue-600" />
            Em Andamento
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Não Iniciada
          </span>
        );
    }
  };

  const getPriorityBadge = (p: PriorityLevel) => {
    switch (p) {
      case 'CRITICA':
        return <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">Crítica</span>;
      case 'ALTA':
        return <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Alta</span>;
      case 'MEDIA':
        return <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">Média</span>;
      default:
        return <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">Baixa</span>;
    }
  };

  const totalActions = actionPlans.length;
  const completedActions = actionPlans.filter(a => a.status === 'CONCLUIDA').length;
  const ongoingActions = actionPlans.filter(a => a.status === 'EM_ANDAMENTO').length;
  const criticalActions = actionPlans.filter(a => a.priority === 'CRITICA' || a.priority === 'ALTA').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-colors">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <ListTodo className="w-3.5 h-3.5" />
            <span>Plano de Ação Socioambiental · Seção Judiciária de Roraima (Ciclo 2021–2026)</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Plano de Ação do PLS-SJRR & Eixos Temáticos
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhamento de 14 iniciativas estruturantes, atualizadas às Resoluções CNJ 400/2021, 550/2024, 594/2024 e Nova Lei 14.133/2021
          </p>
        </div>

        <button
          onClick={() =>
            setEditingAction({
              year: selectedYear,
              title: '',
              description: '',
              responsibleUnit: 'Secretaria Administrativa (SECAD)',
              responsibleUser: 'Dr. Roberto Magalhães',
              startDate: `${selectedYear}-01-15`,
              endDate: `${selectedYear}-12-31`,
              status: 'EM_ANDAMENTO',
              percentageComplete: 20,
              priority: 'MEDIA',
              relatedIndicatorIds: ['indicator-6-1'],
              eixoTematico: 'Eficiência Operacional',
              normativeReference: 'Resolução CNJ nº 400/2021',
              expectedImpact: ''
            })
          }
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs shadow-emerald-600/20 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Ação</span>
        </button>
      </div>

      {/* Resumo Rápido em Cards Claros */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total de Ações</span>
            <ListTodo className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-slate-900">{totalActions}</span>
            <span className="text-xs text-slate-500">ações no plano</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Distribuídas em 14 eixos temáticos</p>
        </div>

        <div className="rounded-2xl border border-emerald-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
            <span>Ações Concluídas</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-emerald-700">{completedActions}</span>
            <span className="text-xs text-emerald-600 font-medium">entregues 100%</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Descarte zero e hidráulica</p>
        </div>

        <div className="rounded-2xl border border-blue-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-blue-700 font-medium">
            <span>Em Execução</span>
            <Clock className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-blue-700">{ongoingActions}</span>
            <span className="text-xs text-blue-600 font-medium">em andamento</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Com marcos no exercício {selectedYear}</p>
        </div>

        <div className="rounded-2xl border border-amber-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-700 font-medium">
            <span>Alta Prioridade & Críticas</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-amber-700">{criticalActions}</span>
            <span className="text-xs text-amber-600 font-medium">ações de impacto</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Climatização, Carbono Zero e Licitações</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, responsável ou eixo..."
            className="w-full rounded-xl bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Filtro por Eixo Temático */}
          <select
            value={filterEixo}
            onChange={e => setFilterEixo(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Todos os Eixos Temáticos</option>
            {eixos.map(eixo => (
              <option key={eixo} value={eixo}>
                {eixo}
              </option>
            ))}
          </select>

          {/* Filtro por Status */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Todos os Status ({filteredActions.length})</option>
            <option value="EM_ANDAMENTO">Em Andamento</option>
            <option value="CONCLUIDA">Concluídas</option>
            <option value="ATRASADA">Atrasadas</option>
            <option value="NAO_INICIADA">Não Iniciadas</option>
          </select>
        </div>
      </div>

      {/* Cards do Plano de Ação */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredActions.map(action => {
          const linkedInds = indicators.filter(i => action.relatedIndicatorIds.includes(i.id));

          return (
            <div
              key={action.id}
              className={`rounded-2xl border bg-white p-5 shadow-xs flex flex-col justify-between transition-all duration-200 hover:shadow-md ${
                action.status === 'ATRASADA'
                  ? 'border-rose-200/90 hover:border-rose-300'
                  : action.status === 'CONCLUIDA'
                  ? 'border-emerald-200/90 hover:border-emerald-300'
                  : 'border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(action.status)}
                    {getPriorityBadge(action.priority)}
                    {action.eixoTematico && (
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5 text-emerald-600" />
                        {action.eixoTematico}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setEditingAction(action)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Editar ação"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="font-bold text-slate-900 text-sm mt-1">
                  {action.title}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {action.description}
                </p>

                {/* Normative Reference & Inconsistency Note */}
                {(action.normativeReference || action.inconsistencyNote) && (
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] space-y-1">
                    {action.normativeReference && (
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Scale className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span><strong>Base Normativa:</strong> {action.normativeReference}</span>
                      </div>
                    )}
                    {action.inconsistencyNote && (
                      <div className="flex items-center gap-1.5 text-emerald-800">
                        <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span><strong>Atualização Aplicada:</strong> {action.inconsistencyNote}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Barra de Progresso Sofisticada */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1 font-semibold">
                    <span className="text-slate-500">Progresso da Ação</span>
                    <span className="font-mono text-emerald-600 font-bold tabular-nums">
                      {action.percentageComplete}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        action.status === 'CONCLUIDA'
                          ? 'bg-emerald-500'
                          : action.status === 'ATRASADA'
                          ? 'bg-rose-500'
                          : 'bg-emerald-600'
                      }`}
                      style={{ width: `${action.percentageComplete}%` }}
                    />
                  </div>
                </div>

                {/* Linked Indicators */}
                {linkedInds.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                      Metas / Indicadores Vinculados:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {linkedInds.map(ind => (
                        <span
                          key={ind.id}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                        >
                          {ind.code} — {ind.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {action.expectedImpact && (
                  <div className="mt-3 text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/60">
                    <strong className="text-slate-800">Impacto Estimado:</strong> {action.expectedImpact}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-700">
                    {action.responsibleUnit}
                  </span>{' '}
                  · {action.responsibleUser}
                </div>
                <div className="font-mono text-slate-500">
                  Prazo: {action.endDate}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Editor Modal */}
      {editingAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 animate-in fade-in duration-150 max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {editingAction.id ? 'Editar Ação do Plano Socioambiental' : 'Nova Ação no Plano de Ação'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Vincule responsáveis, prazos, eixos e metas do PLS-SJRR
            </p>

            <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Título da Ação *
                </label>
                <input
                  type="text"
                  required
                  value={editingAction.title || ''}
                  onChange={e => setEditingAction({ ...editingAction, title: e.target.value })}
                  placeholder="Ex: Instalação de Usina Fotovoltaica"
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Descrição
                </label>
                <textarea
                  rows={2}
                  value={editingAction.description || ''}
                  onChange={e => setEditingAction({ ...editingAction, description: e.target.value })}
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Eixo Temático
                  </label>
                  <input
                    type="text"
                    value={editingAction.eixoTematico || ''}
                    onChange={e => setEditingAction({ ...editingAction, eixoTematico: e.target.value })}
                    placeholder="Ex: Energia Elétrica"
                    className="w-full rounded-xl bg-slate-50 border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Referência Normativa
                  </label>
                  <input
                    type="text"
                    value={editingAction.normativeReference || ''}
                    onChange={e => setEditingAction({ ...editingAction, normativeReference: e.target.value })}
                    placeholder="Ex: Resolução CNJ nº 594/2024"
                    className="w-full rounded-xl bg-slate-50 border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Unidade Responsável
                  </label>
                  <input
                    type="text"
                    value={editingAction.responsibleUnit || ''}
                    onChange={e => setEditingAction({ ...editingAction, responsibleUnit: e.target.value })}
                    className="w-full rounded-xl bg-slate-50 border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Responsável
                  </label>
                  <input
                    type="text"
                    value={editingAction.responsibleUser || ''}
                    onChange={e => setEditingAction({ ...editingAction, responsibleUser: e.target.value })}
                    className="w-full rounded-xl bg-slate-50 border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editingAction.status || 'EM_ANDAMENTO'}
                    onChange={e => setEditingAction({ ...editingAction, status: e.target.value as ActionStatus })}
                    className="w-full rounded-xl bg-slate-50 border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="NAO_INICIADA">Não Iniciada</option>
                    <option value="EM_ANDAMENTO">Em Andamento</option>
                    <option value="CONCLUIDA">Concluída</option>
                    <option value="ATRASADA">Atrasada</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Progresso (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editingAction.percentageComplete ?? 0}
                    onChange={e => setEditingAction({ ...editingAction, percentageComplete: Number(e.target.value) })}
                    className="w-full rounded-xl bg-slate-50 border border-slate-300 p-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={editingAction.priority || 'MEDIA'}
                    onChange={e => setEditingAction({ ...editingAction, priority: e.target.value as PriorityLevel })}
                    className="w-full rounded-xl bg-slate-50 border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="BAIXA">Baixa</option>
                    <option value="MEDIA">Média</option>
                    <option value="ALTA">Alta</option>
                    <option value="CRITICA">Crítica</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Impacto Esperado
                </label>
                <input
                  type="text"
                  value={editingAction.expectedImpact || ''}
                  onChange={e => setEditingAction({ ...editingAction, expectedImpact: e.target.value })}
                  placeholder="Ex: Redução de 15% nos custos de energia"
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingAction(null)}
                  className="rounded-xl px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

