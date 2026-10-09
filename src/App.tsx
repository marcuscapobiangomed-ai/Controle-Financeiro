import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import { Navbar, NavTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { InvestmentsView } from './components/InvestmentsView';
import { BudgetsAndGoalsView } from './components/BudgetsAndGoalsView';
import { ReportsView } from './components/ReportsView';
import { TransactionModal } from './components/TransactionModal';
import { InvestmentModal } from './components/InvestmentModal';
import { DividendModal } from './components/DividendModal';
import { BackupModal } from './components/BackupModal';
import { AccountModal } from './components/AccountModal';
import { ImportStatementModal } from './components/ImportStatementModal';
import { OnboardingModal } from './components/OnboardingModal';
import { useFinance } from './context/FinanceContext';
import { Transaction, InvestmentAsset } from './types/finance';

const CapitalControlContent: React.FC = () => {
  const { isOnboardingDone } = useFinance();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);

  const [isInvModalOpen, setIsInvModalOpen] = useState(false);
  const [invToEdit, setInvToEdit] = useState<InvestmentAsset | null>(null);

  const [isDivModalOpen, setIsDivModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState<boolean>(() => !isOnboardingDone);

  // Handlers
  const handleOpenNewTransaction = () => {
    setTxToEdit(null);
    setIsTxModalOpen(true);
  };

  const handleEditTransaction = (tx: Transaction) => {
    setTxToEdit(tx);
    setIsTxModalOpen(true);
  };

  const handleOpenNewInvestment = () => {
    setInvToEdit(null);
    setIsInvModalOpen(true);
  };

  const handleEditInvestment = (inv: InvestmentAsset) => {
    setInvToEdit(inv);
    setIsInvModalOpen(true);
  };

  const handleOpenDividend = () => {
    setIsDivModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Top Bar Contract compliant Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenTransactionModal={handleOpenNewTransaction}
        onOpenInvestmentModal={handleOpenNewInvestment}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenOnboardingModal={() => setIsOnboardingModalOpen(true)}
      />

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            onOpenTransactionModal={handleOpenNewTransaction}
            onOpenInvestmentModal={handleOpenNewInvestment}
            onOpenDividendModal={handleOpenDividend}
            onOpenAccountModal={() => setIsAccountModalOpen(true)}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            onNavigateToTransactions={() => setActiveTab('transactions')}
            onNavigateToInvestments={() => setActiveTab('investments')}
            onNavigateToReports={() => setActiveTab('reports')}
            onOpenOnboardingModal={() => setIsOnboardingModalOpen(true)}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsView
            onOpenNewTransaction={handleOpenNewTransaction}
            onEditTransaction={handleEditTransaction}
            onOpenImportModal={() => setIsImportModalOpen(true)}
          />
        )}

        {activeTab === 'investments' && (
          <InvestmentsView
            onOpenNewInvestment={handleOpenNewInvestment}
            onEditInvestment={handleEditInvestment}
            onOpenNewDividend={handleOpenDividend}
          />
        )}

        {activeTab === 'reports' && <ReportsView />}

        {activeTab === 'budgets' && <BudgetsAndGoalsView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            CapitalControl · Gestão Financeira Pessoal & Investimentos
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="hover:text-slate-200 transition-colors"
            >
              Visão Geral
            </button>
            <span>·</span>
            <button
              onClick={() => setActiveTab('transactions')}
              className="hover:text-slate-200 transition-colors"
            >
              Transações
            </button>
            <span>·</span>
            <button
              onClick={() => setActiveTab('investments')}
              className="hover:text-slate-200 transition-colors"
            >
              Carteira
            </button>
            <span>·</span>
            <button
              onClick={() => setActiveTab('reports')}
              className="hover:text-slate-200 transition-colors"
            >
              Relatórios
            </button>
            <span>·</span>
            <button
              onClick={() => setActiveTab('budgets')}
              className="hover:text-slate-200 transition-colors"
            >
              Metas & Limites
            </button>
            <span>·</span>
            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="hover:text-emerald-400 transition-colors"
            >
              Backup & Exportar
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        transactionToEdit={txToEdit}
      />

      <InvestmentModal
        isOpen={isInvModalOpen}
        onClose={() => setIsInvModalOpen(false)}
        assetToEdit={invToEdit}
      />

      <DividendModal
        isOpen={isDivModalOpen}
        onClose={() => setIsDivModalOpen(false)}
      />

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onOpenOnboarding={() => setIsOnboardingModalOpen(true)}
      />

      <ImportStatementModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      <OnboardingModal
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <FinanceProvider>
        <CapitalControlContent />
      </FinanceProvider>
    </AuthProvider>
  );
}
