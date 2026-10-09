import React, { useState } from 'react';
import {
  Target,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatPercent, formatDate } from '../utils/formatters';
import { ExpenseCategory, FinancialGoal } from '../types/finance';

export const BudgetsAndGoalsView: React.FC = () => {
  const {
    budgets,
    updateBudget,
    goals,
    addGoal,
    updateGoal,
    deleteGoal,
    categoryExpensesMonth,
    selectedMonth,
  } = useFinance();

  // Editing budget state
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editLimitStr, setEditLimitStr] = useState<string>('');

  // New/Edit Goal state
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<FinancialGoal | null>(null);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTargetStr, setGoalTargetStr] = useState('');
  const [goalCurrentStr, setGoalCurrentStr] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [goalCategory, setGoalCategory] = useState<'reserva' | 'patrimonio' | 'viagem' | 'sonho'>('patrimonio');
  const [goalFormError, setGoalFormError] = useState<string | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<FinancialGoal | null>(null);

  // Quick Deposit modal state
  const [depositGoal, setDepositGoal] = useState<FinancialGoal | null>(null);
  const [depositAmountStr, setDepositAmountStr] = useState('');
  const [depositFormError, setDepositFormError] = useState<string | null>(null);

  // Map expenses for quick lookup
  const expenseMap = new Map<string, number>();
  categoryExpensesMonth.forEach(c => expenseMap.set(c.category, c.amount));

  const handleStartEditBudget = (cat: ExpenseCategory, currentLimit: number) => {
    setEditingCategory(cat);
    setEditLimitStr(currentLimit.toString());
  };

  const handleSaveBudget = (cat: ExpenseCategory) => {
    const val = parseFloat(editLimitStr.replace(',', '.'));
    if (!isNaN(val) && val >= 0) {
      updateBudget(cat, val);
    }
    setEditingCategory(null);
  };

  const handleOpenGoalModal = (g?: FinancialGoal) => {
    setGoalFormError(null);
    if (g) {
      setGoalToEdit(g);
      setGoalTitle(g.title);
      setGoalTargetStr(g.targetAmount.toString());
      setGoalCurrentStr(g.currentAmount.toString());
      setGoalDeadline(g.deadline || '');
      setGoalCategory(g.category);
    } else {
      setGoalToEdit(null);
      setGoalTitle('');
      setGoalTargetStr('');
      setGoalCurrentStr('');
      setGoalDeadline('2027-12-31');
      setGoalCategory('patrimonio');
    }
    setIsGoalModalOpen(true);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    setGoalFormError(null);
    const target = parseFloat(goalTargetStr.replace(',', '.'));
    const current = parseFloat(goalCurrentStr.replace(',', '.') || '0');

    if (!goalTitle.trim()) {
      setGoalFormError('Informe o título da meta.');
      return;
    }
    if (isNaN(target) || target <= 0) {
      setGoalFormError('Informe um valor alvo válido.');
      return;
    }

    if (goalToEdit) {
      updateGoal({
        ...goalToEdit,
        title: goalTitle.trim(),
        targetAmount: target,
        currentAmount: isNaN(current) ? 0 : current,
        deadline: goalDeadline || undefined,
        category: goalCategory,
      });
    } else {
      addGoal({
        title: goalTitle.trim(),
        targetAmount: target,
        currentAmount: isNaN(current) ? 0 : current,
        deadline: goalDeadline || undefined,
        category: goalCategory,
      });
    }

    setIsGoalModalOpen(false);
  };

  const handleApplyDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    setDepositFormError(null);
    if (!depositGoal) return;
    const amount = parseFloat(depositAmountStr.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      setDepositFormError('Informe um valor de aporte válido.');
      return;
    }

    updateGoal({
      ...depositGoal,
      currentAmount: depositGoal.currentAmount + amount,
    });

    setDepositGoal(null);
    setDepositAmountStr('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* SECTION 1: METAS FINANCEIRAS DE LONGO PRAZO */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-400" />
              Metas de Patrimônio & Objetivos
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Planejamento para reserva de emergência, conquistas e independência financeira
            </p>
          </div>

          <button
            onClick={() => handleOpenGoalModal()}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded transition-colors flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Meta
          </button>
        </div>

        {/* Goals Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {goals.map(goal => {
            const progress = (goal.currentAmount / goal.targetAmount) * 100;
            const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);

            return (
              <div
                key={goal.id}
                className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white">
                      {goal.title}
                    </h3>
                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenGoalModal(goal)}
                        title="Editar meta"
                        className="p-1 text-slate-400 hover:text-white rounded"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setGoalToDelete(goal)}
                        title="Excluir meta"
                        className="p-1 text-slate-400 hover:text-rose-400 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-xs text-slate-400">Progresso</span>
                    <span className="font-mono text-emerald-400 font-bold text-sm tabular-nums">
                      {progress.toFixed(1)}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                    <div
                      style={{ width: `${Math.min(progress, 100)}%` }}
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    />
                  </div>

                  <div className="mt-3 space-y-1 text-xs font-mono">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400 font-sans">Acumulado:</span>
                      <span className="tabular-nums font-semibold">
                        {formatCurrency(goal.currentAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="font-sans">Alvo:</span>
                      <span className="tabular-nums">
                        {formatCurrency(goal.targetAmount)}
                      </span>
                    </div>
                    {remaining > 0 ? (
                      <div className="flex items-center justify-between text-amber-400/90 text-[11px] pt-1 border-t border-slate-800">
                        <span className="font-sans">Faltam:</span>
                        <span className="tabular-nums">
                          {formatCurrency(remaining)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-emerald-400 text-[11px] pt-1 border-t border-slate-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Meta Atingida!
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">
                    {goal.deadline ? `Prazo: ${formatDate(goal.deadline)}` : 'Sem prazo fixo'}
                  </span>
                  <button
                    onClick={() => {
                      setDepositGoal(goal);
                      setDepositAmountStr('');
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-medium rounded transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Aportar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: TETO DE GASTOS / ORÇAMENTOS POR CATEGORIA */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-sky-400" />
              Limites & Tetos de Gastos no Mês
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Monitore o consumo por categoria em relação ao seu orçamento estipulado para {selectedMonth}
            </p>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgets.map(b => {
              const spent = expenseMap.get(b.category) || 0;
              const percent = b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0;
              const isOver = percent > 100;
              const isWarning = percent >= 80 && percent <= 100;
              const isEditing = editingCategory === b.category;

              let barColor = 'bg-emerald-500';
              if (isOver) barColor = 'bg-rose-500';
              else if (isWarning) barColor = 'bg-amber-500';

              return (
                <div
                  key={b.category}
                  className="p-3.5 bg-slate-950 rounded-lg border border-slate-800/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">
                      {b.category}
                    </span>
                    <div className="flex items-center gap-2">
                      {isOver && (
                        <span className="text-[10px] text-rose-400 flex items-center gap-0.5">
                          <AlertTriangle className="w-3 h-3" />
                          Estourado
                        </span>
                      )}
                      <span className="text-xs font-mono font-bold text-slate-300 tabular-nums">
                        {percent.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min(percent, 100)}%` }}
                      className={`h-full ${barColor} rounded-full transition-all duration-300`}
                    />
                  </div>

                  {/* Numbers & Edit */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="font-mono text-slate-400">
                      Gasto:{' '}
                      <span className="text-white font-semibold tabular-nums">
                        {formatCurrency(spent)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 font-mono">
                      <span className="text-slate-400">Teto:</span>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="50"
                            value={editLimitStr}
                            onChange={e => setEditLimitStr(e.target.value)}
                            className="w-20 px-1.5 py-0.5 bg-slate-900 border border-emerald-500 rounded text-xs text-white"
                          />
                          <button
                            onClick={() => handleSaveBudget(b.category)}
                            className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px]"
                          >
                            OK
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEditBudget(b.category, b.monthlyLimit)}
                          title="Clique para alterar limite"
                          className="hover:underline text-slate-300 tabular-nums"
                        >
                          {formatCurrency(b.monthlyLimit)}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Goal Add/Edit Modal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6">
            <h3 className="text-base font-semibold text-white mb-4">
              {goalToEdit ? 'Editar Meta Financeira' : 'Criar Nova Meta Financeira'}
            </h3>
            {goalFormError && (
              <div className="mb-3 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded text-rose-300 text-xs">
                {goalFormError}
              </div>
            )}
            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Título da Meta
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Reserva de Emergência, Aporte 2026, Casa Própria"
                  value={goalTitle}
                  onChange={e => setGoalTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Valor Alvo (R$)
                  </label>
                  <input
                    type="number"
                    step="100"
                    min="1"
                    required
                    placeholder="30000"
                    value={goalTargetStr}
                    onChange={e => setGoalTargetStr(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Valor Inicial (R$)
                  </label>
                  <input
                    type="number"
                    step="100"
                    placeholder="0"
                    value={goalCurrentStr}
                    onChange={e => setGoalCurrentStr(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Prazo Desejado
                  </label>
                  <input
                    type="date"
                    value={goalDeadline}
                    onChange={e => setGoalDeadline(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Categoria
                  </label>
                  <select
                    value={goalCategory}
                    onChange={e => setGoalCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="reserva">Reserva de Emergência</option>
                    <option value="patrimonio">Patrimônio / Independência</option>
                    <option value="viagem">Viagem & Férias</option>
                    <option value="sonho">Aquisição / Sonho Pessoal</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded border border-slate-700 hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded transition-colors shadow-sm"
                >
                  Salvar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Deposit to Goal Modal */}
      {depositGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6">
            <h3 className="text-base font-semibold text-white mb-2">
              Aporte na Meta
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Adicionar valor acumulado à meta: <strong className="text-white">{depositGoal.title}</strong>
            </p>
            {depositFormError && (
              <div className="mb-3 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded text-rose-300 text-xs">
                {depositFormError}
              </div>
            )}
            <form onSubmit={handleApplyDeposit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Valor do Aporte (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  autoFocus
                  placeholder="500,00"
                  value={depositAmountStr}
                  onChange={e => setDepositAmountStr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDepositGoal(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded transition-colors"
                >
                  Confirmar Aporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Goal Deletion */}
      {goalToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">
              Excluir Meta Financeira
            </h3>
            <p className="text-xs text-slate-300">
              Deseja realmente excluir a meta <strong className="text-white">"{goalToDelete.title}"</strong>?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setGoalToDelete(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded border border-slate-700 hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteGoal(goalToDelete.id);
                  setGoalToDelete(null);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded transition-colors"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
