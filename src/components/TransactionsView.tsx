import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  FileSpreadsheet,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Repeat,
  Upload,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { Transaction, TransactionType, RecurrenceInterval } from '../types/finance';
import { formatCurrency, formatDate, getRecurrenceLabel } from '../utils/formatters';

interface TransactionsViewProps {
  onOpenNewTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onOpenImportModal: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  onOpenNewTransaction,
  onEditTransaction,
  onOpenImportModal,
}) => {
  const {
    transactions,
    accounts,
    deleteTransaction,
    deleteRecurringGroup,
    toggleTransactionStatus,
    exportTransactionsCSV,
    selectedMonth,
  } = useFinance();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [periodFilter, setPeriodFilter] = useState<'current_month' | 'all' | 'pending'>('current_month');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [recurrenceFilter, setRecurrenceFilter] = useState<'all' | 'any_recurring' | 'single' | RecurrenceInterval>('all');
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);

  // Available categories from actual transactions
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => set.add(t.category));
    return Array.from(set).sort();
  }, [transactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Search
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesDesc = tx.description.toLowerCase().includes(query);
        const matchesCat = tx.category.toLowerCase().includes(query);
        const matchesNotes = tx.notes ? tx.notes.toLowerCase().includes(query) : false;
        if (!matchesDesc && !matchesCat && !matchesNotes) return false;
      }

      // Type
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

      // Period / Status preset
      if (periodFilter === 'current_month') {
        if (!tx.date.startsWith(selectedMonth)) return false;
      } else if (periodFilter === 'pending') {
        if (tx.status !== 'pending') return false;
      }

      // Category
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;

      // Account
      if (accountFilter !== 'all' && tx.accountId !== accountFilter) return false;

      // Recurrence filter
      if (recurrenceFilter === 'any_recurring') {
        if (!tx.recurrence || tx.recurrence === 'none') return false;
      } else if (recurrenceFilter === 'single') {
        if (tx.recurrence && tx.recurrence !== 'none') return false;
      } else if (recurrenceFilter !== 'all') {
        if (tx.recurrence !== recurrenceFilter) return false;
      }

      return true;
    });
  }, [
    transactions,
    searchTerm,
    typeFilter,
    periodFilter,
    categoryFilter,
    accountFilter,
    recurrenceFilter,
    selectedMonth,
  ]);

  // Totals for filtered view
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });
    return {
      income,
      expense,
      balance: income - expense,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  const handleDelete = (tx: Transaction) => {
    setTxToDelete(tx);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Entradas & Saídas
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro detalhado de fluxo de caixa, despesas fixas, recorrentes (semanal/mensal) e receitas
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenImportModal}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-medium rounded transition-colors flex items-center gap-1.5"
            title="Importar extrato bancário de arquivo OFX ou CSV"
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            Importar Extrato
          </button>
          <button
            onClick={exportTransactionsCSV}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 text-xs font-medium rounded transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
            Exportar CSV
          </button>
          <button
            onClick={onOpenNewTransaction}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Transação
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por descrição, notas..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Period filter */}
          <div>
            <select
              value={periodFilter}
              onChange={e => setPeriodFilter(e.target.value as any)}
              className="w-full py-1.5 px-2.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="current_month">Mês Atual ({selectedMonth})</option>
              <option value="pending">Apenas Pendentes</option>
              <option value="all">Todas as Datas</option>
            </select>
          </div>

          {/* Type filter */}
          <div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className="w-full py-1.5 px-2.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Todos os Tipos</option>
              <option value="income">Apenas Entradas (Receitas)</option>
              <option value="expense">Apenas Saídas (Despesas)</option>
            </select>
          </div>

          {/* Recurrence Filter */}
          <div>
            <select
              value={recurrenceFilter}
              onChange={e => setRecurrenceFilter(e.target.value as any)}
              className="w-full py-1.5 px-2.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-emerald-500 truncate"
            >
              <option value="all">Todas Recorrências</option>
              <option value="any_recurring">Apenas Recorrentes</option>
              <option value="weekly">Semanal</option>
              <option value="biweekly">Quinzenal</option>
              <option value="monthly">Mensal</option>
              <option value="quarterly">Trimestral</option>
              <option value="yearly">Anual</option>
              <option value="single">Apenas Únicas</option>
            </select>
          </div>

          {/* Category filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-emerald-500 truncate"
            >
              <option value="all">Todas Categorias</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Summary Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Exibindo <strong>{summary.count}</strong> movimentações
            </span>
          </div>

          <div className="flex items-center gap-4 font-mono">
            <span className="text-emerald-400">
              Entradas: +{formatCurrency(summary.income)}
            </span>
            <span className="text-rose-400">
              Saídas: -{formatCurrency(summary.expense)}
            </span>
            <span
              className={`font-semibold ${
                summary.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              Saldo: {formatCurrency(summary.balance)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Transactions Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                <th className="py-3 px-4 font-medium">Data</th>
                <th className="py-3 px-4 font-medium">Descrição</th>
                <th className="py-3 px-4 font-medium">Recorrência</th>
                <th className="py-3 px-4 font-medium">Categoria</th>
                <th className="py-3 px-4 font-medium">Conta/Banco</th>
                <th className="py-3 px-4 font-medium text-center">Status</th>
                <th className="py-3 px-4 font-medium text-right">Valor (R$)</th>
                <th className="py-3 px-4 font-medium text-center w-20">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <p className="text-slate-400 text-xs sm:text-sm">
                        {transactions.length === 0
                          ? 'Nenhuma transação cadastrada ainda. Comece lançando suas receitas/despesas reais ou importando seu extrato bancário.'
                          : 'Nenhuma movimentação encontrada para os filtros selecionados.'}
                      </p>
                      {transactions.length === 0 ? (
                        <div className="flex items-center justify-center gap-2 pt-1">
                          <button
                            onClick={onOpenNewTransaction}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Nova Transação
                          </button>
                          <button
                            onClick={onOpenImportModal}
                            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5"
                          >
                            <Upload className="w-3.5 h-3.5 text-sky-400" />
                            Importar Extrato
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setTypeFilter('all');
                            setPeriodFilter('all');
                            setCategoryFilter('all');
                            setAccountFilter('all');
                            setRecurrenceFilter('all');
                          }}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded border border-slate-700"
                        >
                          Limpar Filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => {
                  const acc = accounts.find(a => a.id === tx.accountId);
                  const isIncome = tx.type === 'income';
                  const isRecurring = tx.recurrence && tx.recurrence !== 'none';

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Date */}
                      <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 font-medium text-slate-200">
                        <div className="flex items-center gap-2">
                          <span
                            className={`p-1 rounded shrink-0 ${
                              isIncome
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-rose-500/10 text-rose-400'
                            }`}
                          >
                            {isIncome ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            )}
                          </span>
                          <div>
                            <span className="text-white font-medium">
                              {tx.description}
                            </span>
                            {tx.notes && (
                              <div className="text-[11px] text-slate-400 font-normal">
                                {tx.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Recurrence Column */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isRecurring ? (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-slate-950 text-emerald-400 border border-slate-800 px-2 py-0.5 rounded font-mono">
                            <Repeat className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>{getRecurrenceLabel(tx.recurrence)}</span>
                            {tx.recurrenceIndex && tx.recurrenceTotalCount && (
                              <span className="text-slate-400 text-[10px]">
                                ({tx.recurrenceIndex}/{tx.recurrenceTotalCount})
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                        {tx.category}
                      </td>

                      {/* Account */}
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <span
                            style={{ backgroundColor: acc?.color || '#64748b' }}
                            className="w-2 h-2 rounded-full inline-block"
                          />
                          {acc?.name || 'Conta Geral'}
                        </span>
                      </td>

                      {/* Status toggle */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => toggleTransactionStatus(tx.id)}
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded cursor-pointer transition-colors"
                          title="Clique para alternar entre Efetivado e Pendente"
                        >
                          {tx.status === 'settled' ? (
                            <span className="text-emerald-400 inline-flex items-center gap-1 hover:text-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Efetivado
                            </span>
                          ) : (
                            <span className="text-amber-400 inline-flex items-center gap-1 hover:text-amber-300">
                              <Clock className="w-3.5 h-3.5" />
                              Pendente
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Amount */}
                      <td
                        className={`py-3 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                          isIncome ? 'text-emerald-400' : 'text-slate-100'
                        }`}
                      >
                        {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEditTransaction(tx)}
                            title="Editar transação"
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(tx)}
                            title={
                              tx.recurrenceGroupId
                                ? 'Excluir transação ou grupo recorrente'
                                : 'Excluir transação'
                            }
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Transaction Deletion */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">
              Excluir Transação
            </h3>
            <p className="text-xs text-slate-300">
              Deseja realmente excluir o lançamento <strong className="text-white">"{txToDelete.description}"</strong> ({formatCurrency(txToDelete.amount)})?
            </p>

            {txToDelete.recurrenceGroupId ? (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 p-2 rounded">
                  Esta transação faz parte de um grupo de repetição ({getRecurrenceLabel(txToDelete.recurrence)}).
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (txToDelete.recurrenceGroupId) {
                        deleteRecurringGroup(txToDelete.recurrenceGroupId);
                      }
                      setTxToDelete(null);
                    }}
                    className="w-full py-2 px-3 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-600 rounded transition-colors text-center"
                  >
                    Excluir TODAS deste grupo recorrente
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteTransaction(txToDelete.id);
                      setTxToDelete(null);
                    }}
                    className="w-full py-2 px-3 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition-colors text-center"
                  >
                    Excluir APENAS este lançamento pontual
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxToDelete(null)}
                    className="w-full py-1.5 px-3 text-xs text-slate-400 hover:text-white transition-colors text-center"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setTxToDelete(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded border border-slate-700 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteTransaction(txToDelete.id);
                    setTxToDelete(null);
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded transition-colors"
                >
                  Sim, Excluir
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
