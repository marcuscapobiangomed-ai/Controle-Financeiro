import React, { useMemo, useState } from 'react';
import {
  Plus,
  TrendingUp,
  Download,
  RotateCcw,
  Calendar,
  Cloud,
  LogIn,
  LogOut,
  Building2,
  Upload,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';

export type NavTab = 'dashboard' | 'transactions' | 'investments' | 'reports' | 'budgets';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenTransactionModal: () => void;
  onOpenInvestmentModal: () => void;
  onOpenBackupModal: () => void;
  onOpenAccountModal: () => void;
  onOpenImportModal: () => void;
  onOpenOnboardingModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenTransactionModal,
  onOpenInvestmentModal,
  onOpenBackupModal,
  onOpenAccountModal,
  onOpenImportModal,
  onOpenOnboardingModal,
}) => {
  const {
    selectedMonth,
    setSelectedMonth,
    resetToInitialData,
    clearMockData,
    isDemoData,
    transactions,
    isOffline,
    isCloudSyncing,
    lastSyncAt,
  } = useFinance();
  const { user, signIn, signOut, loading: authLoading } = useAuth();
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const navItems: { id: NavTab; label: string }[] = [
    { id: 'dashboard', label: 'Visão Geral' },
    { id: 'transactions', label: 'Transações' },
    { id: 'investments', label: 'Investimentos' },
    { id: 'reports', label: 'Relatórios' },
    { id: 'budgets', label: 'Metas & Limites' },
  ];

  // Dynamic available months from transactions and current date
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();

    // Current real month
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');
    monthSet.add(`${curYear}-${curMonth}`);

    if (selectedMonth) monthSet.add(selectedMonth);

    // Common recent reference months
    monthSet.add('2026-09');
    monthSet.add('2026-08');
    monthSet.add('2026-07');

    transactions.forEach(t => {
      if (t.date && t.date.length >= 7) {
        monthSet.add(t.date.slice(0, 7));
      }
    });

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];

    return Array.from(monthSet)
      .sort((a, b) => b.localeCompare(a))
      .map(key => {
        const [y, m] = key.split('-');
        const monthIndex = parseInt(m, 10) - 1;
        const name = monthNames[monthIndex] || m;
        return {
          key,
          label: `${name} ${y}`,
        };
      });
  }, [transactions, selectedMonth]);

  const handleClearMock = () => {
    setShowConfirmClear(true);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Zone 1: Wordmark & Month Selector */}
          <div className="flex items-center gap-4 lg:gap-6 shrink-0">
            <span
              onClick={() => setActiveTab('dashboard')}
              className="text-lg font-bold tracking-tight text-white cursor-pointer select-none hover:text-emerald-400 transition-colors"
            >
              CapitalControl
            </span>

            {/* Quick month selector */}
            <div className="hidden md:flex items-center gap-2 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-xs text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Mês:</span>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                aria-label="Mês de competência"
                className="bg-transparent text-emerald-400 font-mono font-medium focus:outline-none cursor-pointer"
              >
                {availableMonths.map(m => (
                  <option key={m.key} value={m.key} className="bg-slate-900 text-white">
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none py-1">
            {navItems.map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-slate-800 text-emerald-400'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Actions & Cloud Auth */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* If on mock/demo data, quick-action to remove mocks */}
            {isDemoData && (
              <button
                type="button"
                onClick={handleClearMock}
                title="Limpar dados mockados de exemplo e começar com seus dados reais"
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 rounded transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Tirar Mocks</span>
              </button>
            )}

            {/* Manage Accounts / Onboarding shortcut */}
            {onOpenOnboardingModal && (
              <button
                type="button"
                onClick={onOpenOnboardingModal}
                title="Configurar Meus Bancos, Saldos, Faturas e Limites (Assistente Inicial)"
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded transition-all shadow-sm cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden xl:inline">Assistente Bancos</span>
                <span className="xl:hidden">Bancos IA</span>
              </button>
            )}

            {/* Manage Accounts shortcut */}
            <button
              onClick={onOpenAccountModal}
              title="Gerenciar Contas & Bancos Reais"
              className="p-1.5 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded transition-colors flex items-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xl:inline text-xs font-medium">Bancos</span>
            </button>

            {/* Import Statement shortcut */}
            <button
              onClick={onOpenImportModal}
              title="Importar Extrato Bancário Real (OFX / CSV)"
              className="p-1.5 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden xl:inline text-xs font-medium">Importar</span>
            </button>

            {/* New Transaction */}
            <button
              onClick={onOpenTransactionModal}
              title="Nova Transação (Receita ou Despesa)"
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm shadow-emerald-950"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nova Transação</span>
              <span className="sm:hidden">Lançar</span>
            </button>

            {/* New Investment */}
            <button
              onClick={onOpenInvestmentModal}
              title="Novo Ativo ou Aporte"
              className="hidden md:flex px-2.5 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded transition-colors items-center gap-1.5 whitespace-nowrap"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Investimento</span>
            </button>

            {/* Cloud Database, Offline Cache & Auth Status */}
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-800">
              {isOffline && (
                <div
                  title={`Sem conexão à internet. Operando com dados do cache local (localStorage). Sincronizará com a nuvem quando reconectar.${
                    lastSyncAt ? ` Última sincronização: ${new Date(lastSyncAt).toLocaleTimeString('pt-BR')}` : ''
                  }`}
                  className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded text-xs text-amber-300 shadow-sm"
                >
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline text-[11px] font-medium">Cache Offline</span>
                </div>
              )}

              {isCloudSyncing && !isOffline && (
                <div
                  title="Sincronizando dados com o Firestore..."
                  className="flex items-center gap-1 bg-slate-900 border border-slate-700 px-2 py-1 rounded text-[11px] text-slate-300"
                >
                  <RotateCcw className="w-3 h-3 text-emerald-400 animate-spin" />
                  <span className="hidden sm:inline">Salvando...</span>
                </div>
              )}

              {authLoading ? (
                <div className="w-6 h-6 rounded-full border border-slate-700 animate-pulse bg-slate-800" />
              ) : user ? (
                <div className="flex items-center gap-1.5">
                  <div
                    title={`Conectado ao Firestore como ${user.email}. Seus dados estão salvos no Firestore e em cache no localStorage.`}
                    className="flex items-center gap-1.5 bg-slate-900 border border-emerald-500/40 px-2 py-1 rounded text-xs text-slate-200"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <Cloud className="w-3.5 h-3.5 text-emerald-400 hidden sm:inline" />
                    <span className="text-[11px] font-medium text-emerald-400 max-w-[80px] truncate">
                      {user.displayName?.split(' ')[0] || 'Nuvem'}
                    </span>
                  </div>

                  <button
                    onClick={() => signOut()}
                    title="Desconectar do Firebase"
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => signIn()}
                  title="Conectar com o Google para salvar dados no Firebase Firestore"
                  className="px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded transition-all flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Salvar na Nuvem</span>
                  <span className="sm:hidden">Entrar</span>
                </button>
              )}

              {/* Utility buttons */}
              <button
                onClick={onOpenBackupModal}
                title="Backup, Exportar e Importar Dados"
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded transition-colors"
                aria-label="Backup e exportação de dados"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowConfirmReset(true)}
                title="Recarregar dados de exemplo (demo)"
                className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-900 rounded transition-colors cursor-pointer"
                aria-label="Restaurar dados de exemplo"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal: Remover Mock Data */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">
              Remover Dados de Demonstração
            </h3>
            <p className="text-xs text-slate-300">
              Deseja remover todos os lançamentos e dados de exemplo (mockados) para começar com seus dados financeiros reais?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmClear(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded border border-slate-700 hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowConfirmClear(false);
                  await clearMockData();
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded transition-colors"
              >
                Sim, Remover Mocks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Recarregar Dados Demo */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">
              Recarregar Modo Demonstração
            </h3>
            <p className="text-xs text-slate-300">
              Deseja recarregar os dados de demonstração (mockados)? Isso substituirá os registros atuais pelos exemplos.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmReset(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded border border-slate-700 hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmReset(false);
                  resetToInitialData();
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded transition-colors"
              >
                Recarregar Demo
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
