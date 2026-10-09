import React, { useState } from 'react';
import {
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  PlusCircle,
  PiggyBank,
  ChevronRight,
  Building2,
  Sparkles,
  Trash2,
  Upload,
  Plus,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatPercent, formatDate, getRecurrenceLabel } from '../utils/formatters';
import {
  CashFlowBarChart,
  CategoryExpenseList,
  AssetAllocationVisual,
} from './Charts';
import { AIAdvisorSection } from './AIAdvisorSection';

interface DashboardViewProps {
  onOpenTransactionModal: () => void;
  onOpenInvestmentModal: () => void;
  onOpenDividendModal: () => void;
  onOpenAccountModal: () => void;
  onOpenImportModal: () => void;
  onNavigateToTransactions: () => void;
  onNavigateToInvestments: () => void;
  onNavigateToReports: () => void;
  onOpenOnboardingModal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenTransactionModal,
  onOpenInvestmentModal,
  onOpenDividendModal,
  onOpenAccountModal,
  onOpenImportModal,
  onNavigateToTransactions,
  onNavigateToInvestments,
  onNavigateToReports,
  onOpenOnboardingModal,
}) => {
  const {
    totalNetWorth,
    totalCashInAccounts,
    totalInvestmentValue,
    totalInvestmentProfit,
    totalInvestmentProfitPercent,
    monthlyIncome,
    monthlyExpense,
    monthlyBalance,
    monthlySavingsRate,
    pendingExpensesMonth,
    categoryExpensesMonth,
    assetClassAllocation,
    monthlyCashflowHistory,
    transactions,
    accounts,
    accountBalances,
    investments,
    toggleTransactionStatus,
    selectedMonth,
    isDemoData,
    clearMockData,
  } = useFinance();

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearingMocks, setIsClearingMocks] = useState(false);

  const handleConfirmClear = async () => {
    setIsClearingMocks(true);
    try {
      await clearMockData();
      setShowClearConfirm(false);
    } catch (err) {
      console.error('Falha ao limpar dados mockados:', err);
    } finally {
      setIsClearingMocks(false);
    }
  };

  // Recent 6 transactions
  const recentTransactions = transactions.slice(0, 6);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Real Data Onboarding Banner when in Demo Mode */}
      {isDemoData && (
        <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-sky-950/50 border border-emerald-500/30 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white">
                  Pronto para integrar seus dados financeiros reais?
                </h2>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Modo Demo
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Você está visualizando lançamentos de demonstração. Remova os dados mockados com um clique para cadastrar seus bancos, lançar seu extrato real (OFX/CSV) e sincronizar tudo com o Firestore.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {onOpenOnboardingModal && (
              <button
                onClick={onOpenOnboardingModal}
                className="px-3.5 py-2 text-xs font-semibold text-emerald-300 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Configurar Meus Bancos (Assistente)
              </button>
            )}
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-950" />
              Tirar Dados Mockados
            </button>
            <button
              onClick={onOpenImportModal}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              Importar Extrato OFX/CSV
            </button>
            <button
              onClick={onOpenAccountModal}
              className="px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              Cadastrar Bancos
            </button>
          </div>
        </div>
      )}

      {/* Top Banner KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Patrimônio Líquido */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Patrimônio Líquido</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-white font-mono tabular-nums">
              {formatCurrency(totalNetWorth)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
              <span>Em contas: {formatCurrency(totalCashInAccounts)}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Investido: {formatCurrency(totalInvestmentValue)}</span>
            <span className="text-emerald-400 font-mono font-medium">
              {formatPercent(totalInvestmentProfitPercent)} total
            </span>
          </div>
        </div>

        {/* KPI 2: Carteira de Investimentos */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Investimentos Totais</span>
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-white font-mono tabular-nums">
              {formatCurrency(totalInvestmentValue)}
            </div>
            <div
              className={`mt-1 flex items-center gap-1.5 text-xs font-mono ${
                totalInvestmentProfit > 0
                  ? 'text-emerald-400'
                  : totalInvestmentProfit < 0
                  ? 'text-rose-400'
                  : 'text-slate-400'
              }`}
            >
              {totalInvestmentProfit > 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : totalInvestmentProfit < 0 ? (
                <ArrowDownRight className="w-3.5 h-3.5" />
              ) : null}
              <span>
                {totalInvestmentProfit >= 0 ? 'Lucro: ' : 'Prejuízo: '}
                {totalInvestmentProfit > 0 ? '+' : ''}
                {formatCurrency(totalInvestmentProfit)}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <button
              onClick={onNavigateToInvestments}
              className="text-sky-400 hover:text-sky-300 font-medium inline-flex items-center gap-1"
            >
              Ver carteira completa
              <ChevronRight className="w-3 h-3" />
            </button>
            <button
              onClick={onOpenDividendModal}
              className="text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-0.5"
            >
              + Proventos
            </button>
          </div>
        </div>

        {/* KPI 3: Entradas & Saídas do Mês */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Fluxo Mensal</span>
            <span className="text-[11px] text-slate-400 font-mono">
              {selectedMonth}
            </span>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                Receitas:
              </span>
              <span className="font-mono text-emerald-400 font-semibold tabular-nums">
                {formatCurrency(monthlyIncome)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                Despesas:
              </span>
              <span className="font-mono text-rose-400 font-semibold tabular-nums">
                {formatCurrency(monthlyExpense)}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] flex items-center justify-between">
            <span className="text-slate-400">Saldo do Mês:</span>
            <span
              className={`font-mono font-bold tabular-nums ${
                monthlyBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(monthlyBalance)}
            </span>
          </div>
        </div>

        {/* KPI 4: Taxa de Poupança & Aportes */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Taxa de Poupança</span>
            <PiggyBank className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-emerald-400 font-mono tabular-nums">
              {monthlySavingsRate.toFixed(1)}%
            </div>
            <div className="mt-1 text-xs text-slate-400">
              da renda preservada no mês
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>A pagar pendente:</span>
            <span className="font-mono text-amber-400 tabular-nums">
              {formatCurrency(pendingExpensesMonth)}
            </span>
          </div>
        </div>
      </div>

      {/* Gemini AI Financial Advisor Section */}
      <AIAdvisorSection />

      {/* Main Row: Cash Flow Chart & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Cash Flow Evolution */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white">
              Fluxo de Caixa Mensal
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Competência ativa: {selectedMonth}
            </span>
          </div>
          <CashFlowBarChart data={monthlyCashflowHistory} />
        </div>

        {/* Right 1 Col: Category Expenses */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">
                Despesas por Categoria
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {formatCurrency(monthlyExpense)}
              </span>
            </div>
            {categoryExpensesMonth.length > 0 ? (
              <CategoryExpenseList categories={categoryExpensesMonth} />
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhuma despesa registrada no mês selecionado.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-center">
            <button
              onClick={onNavigateToReports}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1"
            >
              Ver relatório analítico de despesas
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Asset Allocation & Accounts Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Asset Allocation */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Distribuição da Carteira de Investimentos
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Alocação percentual por classe de ativos
              </p>
            </div>
            <button
              onClick={onOpenInvestmentModal}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded transition-colors flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              Novo Aporte
            </button>
          </div>

          {investments.length > 0 ? (
            <AssetAllocationVisual allocations={assetClassAllocation} />
          ) : (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <p>Nenhum ativo cadastrado na carteira.</p>
              <button
                onClick={onOpenInvestmentModal}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Cadastrar Primeiro Ativo
              </button>
            </div>
          )}
        </div>

        {/* Right 1 Col: Bank Accounts Snapshot */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Contas & Disponibilidades
              </h3>
              <div className="text-xs font-mono text-emerald-400 font-semibold tabular-nums">
                {formatCurrency(totalCashInAccounts)}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {onOpenOnboardingModal && (
                <button
                  onClick={onOpenOnboardingModal}
                  title="Configurar meus bancos, saldos, faturas e limites no assistente inicial"
                  className="px-2 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-xs font-medium rounded transition-colors flex items-center gap-1 border border-emerald-500/30 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span className="hidden sm:inline">Assistente</span>
                </button>
              )}
              <button
                onClick={onOpenAccountModal}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded transition-colors flex items-center gap-1 border border-slate-700"
              >
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                Gerenciar
              </button>
            </div>
          </div>

          <div className="space-y-2.5 flex-1">
            {accounts.length > 0 ? (
              accounts.map(acc => {
                const balance = accountBalances[acc.id] ?? acc.initialBalance;
                return (
                  <div
                    key={acc.id}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        style={{ backgroundColor: acc.color }}
                        className="w-2.5 h-9 rounded-sm shrink-0"
                      />
                      <div className="truncate">
                        <div className="text-xs font-semibold text-slate-200 truncate">
                          {acc.name}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                          <span>{acc.institution}</span>
                          {acc.creditLimit !== undefined && acc.creditLimit > 0 && (
                            <span className="text-[10px] text-sky-400 font-mono">
                              • Limite: {formatCurrency(acc.creditLimit)}
                            </span>
                          )}
                          {acc.dueDay !== undefined && (
                            <span className="text-[10px] text-amber-400 font-mono">
                              (Vence dia {acc.dueDay})
                            </span>
                          )}
                        </div>
                        {acc.currentInvoice !== undefined && acc.currentInvoice > 0 && (
                          <div className="text-[10px] text-rose-400 font-mono font-medium">
                            Fatura atual: {formatCurrency(acc.currentInvoice)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-white tabular-nums">
                        {formatCurrency(balance)}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase">
                        {acc.type === 'checking'
                          ? 'Corrente'
                          : acc.type === 'investment'
                          ? 'Investimento'
                          : acc.type === 'credit_card'
                          ? 'Cartão'
                          : acc.type === 'savings'
                          ? 'Poupança'
                          : 'Dinheiro'}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 space-y-2">
                <p>Nenhuma conta bancária cadastrada.</p>
                <button
                  onClick={onOpenAccountModal}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs"
                >
                  Adicionar Conta
                </button>
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              {accounts.length} contas ativas
            </span>
            <button
              onClick={onOpenTransactionModal}
              className="text-emerald-400 hover:text-emerald-300 font-medium"
            >
              + Nova Transação
            </button>
          </div>
        </div>
      </div>

      {/* Row 3: Recent Transactions High-Density Table */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Últimas Movimentações Registradas
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Clique no ícone de status para efetivar ou alternar pendência
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenImportModal}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors flex items-center gap-1 border border-slate-700"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              Importar Extrato
            </button>
            <button
              onClick={onOpenTransactionModal}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded transition-colors flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Lançar
            </button>
            <button
              onClick={onNavigateToTransactions}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors flex items-center gap-1"
            >
              Ver todas ({transactions.length})
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Transactions Table or Empty State */}
        {recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="pb-2.5 font-medium">Data</th>
                  <th className="pb-2.5 font-medium">Descrição</th>
                  <th className="pb-2.5 font-medium">Categoria</th>
                  <th className="pb-2.5 font-medium">Conta</th>
                  <th className="pb-2.5 font-medium text-center">Status</th>
                  <th className="pb-2.5 font-medium text-right">Valor (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentTransactions.map(tx => {
                  const acc = accounts.find(a => a.id === tx.accountId);
                  const isIncome = tx.type === 'income';

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-2.5 font-mono text-slate-400 whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>
                      <td className="py-2.5 font-medium text-slate-200">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isIncome ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                          />
                          <span className="truncate max-w-xs">{tx.description}</span>
                          {tx.recurrence && tx.recurrence !== 'none' && (
                            <span className="text-[10px] text-emerald-400 font-medium bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                              {getRecurrenceLabel(tx.recurrence)}
                              {tx.recurrenceIndex && tx.recurrenceTotalCount
                                ? ` (${tx.recurrenceIndex}/${tx.recurrenceTotalCount})`
                                : ''}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 text-slate-400 truncate max-w-[140px]">
                        {tx.category}
                      </td>
                      <td className="py-2.5 text-slate-400 whitespace-nowrap">
                        {acc?.name || 'Geral'}
                      </td>
                      <td className="py-2.5 text-center whitespace-nowrap">
                        <button
                          onClick={() => toggleTransactionStatus(tx.id)}
                          title="Clique para alternar status"
                          className="inline-flex items-center gap-1 text-[11px] transition-colors"
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
                      <td
                        className={`py-2.5 text-right font-mono font-semibold tabular-nums whitespace-nowrap ${
                          isIncome ? 'text-emerald-400' : 'text-slate-100'
                        }`}
                      >
                        {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center text-xs text-slate-400 space-y-3 bg-slate-950/40 rounded-lg border border-slate-800/60">
            <p>Nenhuma transação registrada ainda.</p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={onOpenTransactionModal}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Lançar Primeira Transação
              </button>
              <button
                onClick={onOpenImportModal}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded font-medium flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5 text-sky-400" />
                Importar Extrato OFX/CSV
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Clear Mock Data In-App Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Remover Dados de Exemplo?</h3>
                <p className="text-xs text-slate-400">Limpar demonstração e começar com dados reais</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Esta ação apagará todas as transações, proventos, metas e investimentos fictícios de demonstração.
              Seus bancos cadastrados permanecerão intactos para você importar seu extrato real (OFX/CSV) ou lançar novas movimentações.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isClearingMocks}
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isClearingMocks}
                onClick={handleConfirmClear}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-rose-950 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isClearingMocks ? 'Limpando dados...' : 'Sim, Remover Dados Mockados'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
