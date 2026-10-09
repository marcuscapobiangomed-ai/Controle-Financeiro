import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import {
  Account,
  Transaction,
  InvestmentAsset,
  DividendRecord,
  BudgetLimit,
  FinancialGoal,
  ExpenseCategory,
  AssetClass,
} from '../types/finance';
import {
  INITIAL_ACCOUNTS,
  INITIAL_TRANSACTIONS,
  INITIAL_INVESTMENTS,
  INITIAL_DIVIDENDS,
  INITIAL_BUDGETS,
  INITIAL_GOALS,
} from '../data/mockData';
import {
  isMockAccount,
  isMockInvestment,
  isMockTransaction,
  isMockDividend,
  isMockGoal,
  MOCK_ACCOUNT_IDS,
  MOCK_INVESTMENT_IDS,
} from '../utils/mockDetector';
import {
  calculateCdiAccruedValue,
  CURRENT_CDI_ANNUAL_DEFAULT,
  getCdiAccrualScheduleInfo,
  getEffectiveCdiAccrualDate,
} from '../utils/cdiCalculations';

interface FinanceContextType {
  accounts: Account[];
  transactions: Transaction[];
  investments: InvestmentAsset[];
  dividends: DividendRecord[];
  budgets: BudgetLimit[];
  goals: FinancialGoal[];
  selectedMonth: string; // YYYY-MM
  setSelectedMonth: (month: string) => void;

  // CDI 11h Auto-Accrual Schedule Info
  cdiScheduleInfo: {
    lastAccrualText: string;
    nextAccrualText: string;
    isUpdatedToday: boolean;
    effectiveDate: string;
    dailyRatePercent: number;
  };

  // Cloud & Offline status
  isCloudSyncing: boolean;
  isCloudActive: boolean;
  isOffline: boolean;
  lastSyncAt: string | null;

  // Real data vs Demo status
  isDemoData: boolean;
  clearMockData: () => Promise<void>;
  isOnboardingDone: boolean;
  setIsOnboardingDone: (done: boolean) => void;
  setupInitialAccounts: (
    accountsList: Omit<Account, 'id'>[],
    options: { clearMocks: boolean; createInvoiceTransactions: boolean }
  ) => Promise<void>;

  // Account actions
  addAccount: (acc: Omit<Account, 'id'>) => void;
  updateAccount: (acc: Account) => void;
  deleteAccount: (id: string) => void;

  // Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  addTransactions: (txList: Omit<Transaction, 'id' | 'createdAt'>[]) => void;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  deleteRecurringGroup: (groupId: string) => void;
  toggleTransactionStatus: (id: string) => void;

  addInvestment: (inv: Omit<InvestmentAsset, 'id' | 'updatedAt'>) => void;
  updateInvestment: (inv: InvestmentAsset) => void;
  deleteInvestment: (id: string) => void;

  addDividend: (div: Omit<DividendRecord, 'id'>) => void;
  deleteDividend: (id: string) => void;

  updateBudget: (category: ExpenseCategory, monthlyLimit: number) => void;

  addGoal: (goal: Omit<FinancialGoal, 'id'>) => void;
  updateGoal: (goal: FinancialGoal) => void;
  deleteGoal: (id: string) => void;

  resetToInitialData: () => void;
  clearAllData: () => void;
  exportAllData: () => void;
  importAllData: (jsonData: string) => boolean;
  exportTransactionsCSV: () => void;

  // Computed metrics
  accountBalances: Record<string, number>;
  totalCashInAccounts: number;
  totalInvestedCost: number;
  totalInvestmentValue: number;
  totalInvestmentProfit: number;
  totalInvestmentProfitPercent: number;
  totalNetWorth: number;

  monthlyIncome: number;
  monthlyExpense: number;
  monthlyBalance: number;
  monthlySavingsRate: number;
  pendingExpensesMonth: number;

  categoryExpensesMonth: { category: string; amount: number; percentage: number }[];
  assetClassAllocation: {
    assetClass: AssetClass;
    currentValue: number;
    investedValue: number;
    profit: number;
    percentage: number;
  }[];
  monthlyCashflowHistory: {
    month: string;
    label: string;
    income: number;
    expense: number;
    balance: number;
  }[];
  totalDividendsReceived: number;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ACCOUNTS: 'capital_control_accounts_v1',
  TRANSACTIONS: 'capital_control_transactions_v1',
  INVESTMENTS: 'capital_control_investments_v1',
  DIVIDENDS: 'capital_control_dividends_v1',
  BUDGETS: 'capital_control_budgets_v1',
  GOALS: 'capital_control_goals_v1',
  LAST_SYNC: 'capital_control_last_sync_v1',
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const defaultCleanAccount: Account = useMemo(
    () => ({
      id: 'acc_principal',
      name: 'Conta Principal',
      institution: 'Meu Banco',
      type: 'checking',
      initialBalance: 0,
      color: '#10b981',
    }),
    []
  );

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);

  // Offline detection & Last Sync tracking
  const [isOffline, setIsOffline] = useState<boolean>(() => !navigator.onLine);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  });

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Active CDI 11h accrual timer: triggers automatic recomputation at 11:00 AM every business day
  const [accrualTimestamp, setAccrualTimestamp] = useState<number>(() => Date.now());

  useEffect(() => {
    // Check every 30 seconds to catch the 11:00 AM threshold in real-time
    const timer = setInterval(() => {
      setAccrualTimestamp(Date.now());
    }, 30000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setAccrualTimestamp(Date.now());
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const cdiScheduleInfo = useMemo(() => {
    return getCdiAccrualScheduleInfo(new Date(accrualTimestamp));
  }, [accrualTimestamp]);

  const hasClearedMocksRef = useRef<boolean>(
    localStorage.getItem('capital_control_cleared_mock_v1') === 'true'
  );

  const [isOnboardingDone, setIsOnboardingDoneState] = useState<boolean>(() => {
    return localStorage.getItem('capital_control_onboarding_done_v1') === 'true';
  });

  const setIsOnboardingDone = (done: boolean) => {
    setIsOnboardingDoneState(done);
    if (done) {
      localStorage.setItem('capital_control_onboarding_done_v1', 'true');
    } else {
      localStorage.removeItem('capital_control_onboarding_done_v1');
    }
  };

  const [accounts, setAccounts] = useState<Account[]>(() => {
    const hasCleared = localStorage.getItem('capital_control_cleared_mock_v1') === 'true';
    const saved = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    if (saved) {
      try {
        const parsed: Account[] = JSON.parse(saved);
        if (hasCleared) {
          const nonMock = parsed.filter(a => !isMockAccount(a));
          if (nonMock.length > 0) return nonMock;
        } else if (parsed.length > 0) {
          return parsed;
        }
      } catch {}
    }
    return hasCleared ? [defaultCleanAccount] : INITIAL_ACCOUNTS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const hasCleared = localStorage.getItem('capital_control_cleared_mock_v1') === 'true';
    const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (saved) {
      try {
        const parsed: Transaction[] = JSON.parse(saved);
        if (hasCleared) {
          return parsed.filter(t => !isMockTransaction(t));
        } else if (parsed.length > 0) {
          return parsed;
        }
      } catch {}
    }
    return hasCleared ? [] : INITIAL_TRANSACTIONS;
  });

  const [investments, setInvestments] = useState<InvestmentAsset[]>(() => {
    const hasCleared = localStorage.getItem('capital_control_cleared_mock_v1') === 'true';
    const saved = localStorage.getItem(STORAGE_KEYS.INVESTMENTS);
    if (saved) {
      try {
        const parsed: InvestmentAsset[] = JSON.parse(saved);
        if (hasCleared) {
          return parsed.filter(i => !isMockInvestment(i));
        } else if (parsed.length > 0) {
          return parsed;
        }
      } catch {}
    }
    return hasCleared ? [] : INITIAL_INVESTMENTS;
  });

  const [dividends, setDividends] = useState<DividendRecord[]>(() => {
    const hasCleared = localStorage.getItem('capital_control_cleared_mock_v1') === 'true';
    const saved = localStorage.getItem(STORAGE_KEYS.DIVIDENDS);
    if (saved) {
      try {
        const parsed: DividendRecord[] = JSON.parse(saved);
        if (hasCleared) {
          return parsed.filter(d => !isMockDividend(d));
        } else if (parsed.length > 0) {
          return parsed;
        }
      } catch {}
    }
    return hasCleared ? [] : INITIAL_DIVIDENDS;
  });

  const [budgets, setBudgets] = useState<BudgetLimit[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BUDGETS);
    if (saved) {
      try {
        const parsed: BudgetLimit[] = JSON.parse(saved);
        if (parsed.length > 0) return parsed;
      } catch {}
    }
    return INITIAL_BUDGETS;
  });

  const [goals, setGoals] = useState<FinancialGoal[]>(() => {
    const hasCleared = localStorage.getItem('capital_control_cleared_mock_v1') === 'true';
    const saved = localStorage.getItem(STORAGE_KEYS.GOALS);
    if (saved) {
      try {
        const parsed: FinancialGoal[] = JSON.parse(saved);
        if (hasCleared) {
          return parsed.filter(g => !isMockGoal(g));
        } else if (parsed.length > 0) {
          return parsed;
        }
      } catch {}
    }
    return hasCleared ? [] : INITIAL_GOALS;
  });

  const isDemoData = useMemo(() => {
    return (
      accounts.some(isMockAccount) ||
      investments.some(isMockInvestment) ||
      transactions.some(isMockTransaction)
    );
  }, [accounts, investments, transactions]);

  // Continuous local cache persistence (ensures instant offline availability)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
    } catch (e) {
      console.warn('Falha ao salvar contas no cache local:', e);
    }
  }, [accounts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    } catch (e) {
      console.warn('Falha ao salvar transações no cache local:', e);
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.INVESTMENTS, JSON.stringify(investments));
    } catch (e) {
      console.warn('Falha ao salvar investimentos no cache local:', e);
    }
  }, [investments]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DIVIDENDS, JSON.stringify(dividends));
    } catch (e) {
      console.warn('Falha ao salvar proventos no cache local:', e);
    }
  }, [dividends]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
    } catch (e) {
      console.warn('Falha ao salvar limites no cache local:', e);
    }
  }, [budgets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
    } catch (e) {
      console.warn('Falha ao salvar metas no cache local:', e);
    }
  }, [goals]);

  // Record successful sync timestamp in cache
  const recordSyncSuccess = () => {
    const syncTimestamp = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, syncTimestamp);
    } catch {}
    setLastSyncAt(syncTimestamp);
  };

  // FIRESTORE REAL-TIME SYNCHRONIZATION
  useEffect(() => {
    if (!user) return;

    setIsCloudSyncing(true);

    const userId = user.uid;

    // Check user profile for clearedMockData preference
    const unsubUser = onSnapshot(doc(db, 'users', userId), docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.clearedMockData === true) {
          hasClearedMocksRef.current = true;
          localStorage.setItem('capital_control_cleared_mock_v1', 'true');
        }
        if (data.onboardingDone === true) {
          setIsOnboardingDoneState(true);
          localStorage.setItem('capital_control_onboarding_done_v1', 'true');
        }
      }
    });

    // Subscriptions
    const unsubAccounts = onSnapshot(
      collection(db, 'users', userId, 'accounts'),
      async snapshot => {
        if (snapshot.empty) {
          if (!hasClearedMocksRef.current) {
            const batch = writeBatch(db);
            INITIAL_ACCOUNTS.forEach(a => batch.set(doc(db, 'users', userId, 'accounts', a.id), a));
            batch.commit().catch(() => {});
            setAccounts(INITIAL_ACCOUNTS);
            try {
              localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(INITIAL_ACCOUNTS));
              recordSyncSuccess();
            } catch {}
          } else {
            await setDoc(doc(db, 'users', userId, 'accounts', defaultCleanAccount.id), defaultCleanAccount);
            setAccounts([defaultCleanAccount]);
            try {
              localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify([defaultCleanAccount]));
              recordSyncSuccess();
            } catch {}
          }
        } else {
          const list: Account[] = [];
          const mockDocsToDelete: any[] = [];
          snapshot.forEach(d => {
            const acc = d.data() as Account;
            if (hasClearedMocksRef.current && isMockAccount(acc)) {
              mockDocsToDelete.push(d.ref);
            } else {
              list.push(acc);
            }
          });

          // Background purge of mock accounts ONLY when user has chosen to clear mocks
          if (hasClearedMocksRef.current && mockDocsToDelete.length > 0) {
            const b = writeBatch(db);
            mockDocsToDelete.forEach(ref => b.delete(ref));
            b.commit().catch(e => console.warn('Erro ao expurgar mock accounts do Firestore:', e));
          }

          const finalAccounts = list.length > 0 ? list : (hasClearedMocksRef.current ? [defaultCleanAccount] : INITIAL_ACCOUNTS);
          setAccounts(finalAccounts);
          try {
            localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(finalAccounts));
            recordSyncSuccess();
          } catch {}
        }
        setIsCloudSyncing(false);
      },
      err => {
        console.warn('Erro ao escutar contas do Firestore (usando cache local):', err);
        setIsCloudSyncing(false);
      }
    );

    const unsubTransactions = onSnapshot(
      collection(db, 'users', userId, 'transactions'),
      async snapshot => {
        if (snapshot.empty) {
          if (!hasClearedMocksRef.current) {
            const batch = writeBatch(db);
            INITIAL_TRANSACTIONS.forEach(t => batch.set(doc(db, 'users', userId, 'transactions', t.id), t));
            batch.commit().catch(() => {});
            setTransactions(INITIAL_TRANSACTIONS);
            try {
              localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
              recordSyncSuccess();
            } catch {}
          } else {
            setTransactions([]);
            try {
              localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
              recordSyncSuccess();
            } catch {}
          }
        } else {
          const list: Transaction[] = [];
          const mockDocsToDelete: any[] = [];
          snapshot.forEach(d => {
            const tx = d.data() as Transaction;
            if (hasClearedMocksRef.current && isMockTransaction(tx)) {
              mockDocsToDelete.push(d.ref);
            } else {
              list.push(tx);
            }
          });

          if (hasClearedMocksRef.current && mockDocsToDelete.length > 0) {
            const b = writeBatch(db);
            mockDocsToDelete.forEach(ref => b.delete(ref));
            b.commit().catch(e => console.warn('Erro ao expurgar mock transactions do Firestore:', e));
          }

          // Sort by date descending
          list.sort((a, b) => b.date.localeCompare(a.date));
          setTransactions(list);
          try {
            localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(list));
            recordSyncSuccess();
          } catch {}
        }
      },
      err => console.warn('Erro ao escutar transações do Firestore (usando cache local):', err)
    );

    const unsubInvestments = onSnapshot(
      collection(db, 'users', userId, 'investments'),
      async snapshot => {
        if (snapshot.empty) {
          if (!hasClearedMocksRef.current) {
            const batch = writeBatch(db);
            INITIAL_INVESTMENTS.forEach(i => batch.set(doc(db, 'users', userId, 'investments', i.id), i));
            batch.commit().catch(() => {});
            setInvestments(INITIAL_INVESTMENTS);
            try {
              localStorage.setItem(STORAGE_KEYS.INVESTMENTS, JSON.stringify(INITIAL_INVESTMENTS));
              recordSyncSuccess();
            } catch {}
          } else {
            setInvestments([]);
            try {
              localStorage.setItem(STORAGE_KEYS.INVESTMENTS, JSON.stringify([]));
              recordSyncSuccess();
            } catch {}
          }
        } else {
          const list: InvestmentAsset[] = [];
          const mockDocsToDelete: any[] = [];
          snapshot.forEach(d => {
            const inv = d.data() as InvestmentAsset;
            if (hasClearedMocksRef.current && isMockInvestment(inv)) {
              mockDocsToDelete.push(d.ref);
            } else {
              list.push(inv);
            }
          });

          if (hasClearedMocksRef.current && mockDocsToDelete.length > 0) {
            const b = writeBatch(db);
            mockDocsToDelete.forEach(ref => b.delete(ref));
            b.commit().catch(e => console.warn('Erro ao expurgar mock investments do Firestore:', e));
          }

          setInvestments(list);
          try {
            localStorage.setItem(STORAGE_KEYS.INVESTMENTS, JSON.stringify(list));
            recordSyncSuccess();
          } catch {}
        }
      },
      err => console.warn('Erro ao escutar investimentos do Firestore (usando cache local):', err)
    );

    const unsubDividends = onSnapshot(
      collection(db, 'users', userId, 'dividends'),
      async snapshot => {
        if (snapshot.empty) {
          if (!hasClearedMocksRef.current) {
            const batch = writeBatch(db);
            INITIAL_DIVIDENDS.forEach(d => batch.set(doc(db, 'users', userId, 'dividends', d.id), d));
            batch.commit().catch(() => {});
            setDividends(INITIAL_DIVIDENDS);
            try {
              localStorage.setItem(STORAGE_KEYS.DIVIDENDS, JSON.stringify(INITIAL_DIVIDENDS));
              recordSyncSuccess();
            } catch {}
          } else {
            setDividends([]);
            try {
              localStorage.setItem(STORAGE_KEYS.DIVIDENDS, JSON.stringify([]));
              recordSyncSuccess();
            } catch {}
          }
        } else {
          const list: DividendRecord[] = [];
          const mockDocsToDelete: any[] = [];
          snapshot.forEach(d => {
            const div = d.data() as DividendRecord;
            if (hasClearedMocksRef.current && isMockDividend(div)) {
              mockDocsToDelete.push(d.ref);
            } else {
              list.push(div);
            }
          });

          if (hasClearedMocksRef.current && mockDocsToDelete.length > 0) {
            const b = writeBatch(db);
            mockDocsToDelete.forEach(ref => b.delete(ref));
            b.commit().catch(e => console.warn('Erro ao expurgar mock dividends do Firestore:', e));
          }

          list.sort((a, b) => b.date.localeCompare(a.date));
          setDividends(list);
          try {
            localStorage.setItem(STORAGE_KEYS.DIVIDENDS, JSON.stringify(list));
            recordSyncSuccess();
          } catch {}
        }
      },
      err => console.warn('Erro ao escutar proventos do Firestore (usando cache local):', err)
    );

    const unsubBudgets = onSnapshot(
      collection(db, 'users', userId, 'budgets'),
      async snapshot => {
        if (snapshot.empty) {
          if (!hasClearedMocksRef.current) {
            const batch = writeBatch(db);
            INITIAL_BUDGETS.forEach((b, idx) => batch.set(doc(db, 'users', userId, 'budgets', `b_${idx}`), b));
            batch.commit().catch(() => {});
            setBudgets(INITIAL_BUDGETS);
            try {
              localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(INITIAL_BUDGETS));
              recordSyncSuccess();
            } catch {}
          } else {
            setBudgets([]);
            try {
              localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify([]));
              recordSyncSuccess();
            } catch {}
          }
        } else {
          const list: BudgetLimit[] = [];
          snapshot.forEach(d => list.push(d.data() as BudgetLimit));
          setBudgets(list);
          try {
            localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(list));
            recordSyncSuccess();
          } catch {}
        }
      },
      err => console.warn('Erro ao escutar limites do Firestore (usando cache local):', err)
    );

    const unsubGoals = onSnapshot(
      collection(db, 'users', userId, 'goals'),
      async snapshot => {
        if (snapshot.empty) {
          if (!hasClearedMocksRef.current) {
            const batch = writeBatch(db);
            INITIAL_GOALS.forEach(g => batch.set(doc(db, 'users', userId, 'goals', g.id), g));
            batch.commit().catch(() => {});
            setGoals(INITIAL_GOALS);
            try {
              localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(INITIAL_GOALS));
              recordSyncSuccess();
            } catch {}
          } else {
            setGoals([]);
            try {
              localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify([]));
              recordSyncSuccess();
            } catch {}
          }
        } else {
          const list: FinancialGoal[] = [];
          const mockDocsToDelete: any[] = [];
          snapshot.forEach(d => {
            const g = d.data() as FinancialGoal;
            if (hasClearedMocksRef.current && isMockGoal(g)) {
              mockDocsToDelete.push(d.ref);
            } else {
              list.push(g);
            }
          });

          if (hasClearedMocksRef.current && mockDocsToDelete.length > 0) {
            const b = writeBatch(db);
            mockDocsToDelete.forEach(ref => b.delete(ref));
            b.commit().catch(e => console.warn('Erro ao expurgar mock goals do Firestore:', e));
          }

          setGoals(list);
          try {
            localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(list));
            recordSyncSuccess();
          } catch {}
        }
      },
      err => console.warn('Erro ao escutar metas do Firestore (usando cache local):', err)
    );

    return () => {
      unsubUser();
      unsubAccounts();
      unsubTransactions();
      unsubInvestments();
      unsubDividends();
      unsubBudgets();
      unsubGoals();
    };
  }, [user]);

  // ACTIONS (WITH FIRESTORE CLOUD PERSISTENCE & LOCAL CACHE GUARANTEE)
  const addTransaction = async (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = {
      ...tx,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    // Optimistic local state update (immediately cached in localStorage)
    setTransactions(prev => [newTx, ...prev]);

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'transactions', newTx.id), newTx);
      } catch (err) {
        console.warn('Erro ao salvar transação no Firestore (mantido no cache local):', err);
      }
    }
  };

  const addTransactions = async (txList: Omit<Transaction, 'id' | 'createdAt'>[]) => {
    const now = Date.now();
    const newTxs: Transaction[] = txList.map((tx, idx) => ({
      ...tx,
      id: `tx_${now}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    }));

    // Optimistic local state update (immediately cached in localStorage)
    setTransactions(prev => [...newTxs, ...prev]);

    if (user) {
      try {
        const batch = writeBatch(db);
        newTxs.forEach(t => {
          const ref = doc(db, 'users', user.uid, 'transactions', t.id);
          batch.set(ref, t);
        });
        await batch.commit();
      } catch (err) {
        console.warn('Erro ao salvar lote de transações no Firestore (mantido no cache local):', err);
      }
    }
  };

  const updateTransaction = async (updatedTx: Transaction) => {
    setTransactions(prev => prev.map(t => (t.id === updatedTx.id ? updatedTx : t)));

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'transactions', updatedTx.id), updatedTx);
      } catch (err) {
        console.warn('Erro ao atualizar transação no Firestore (mantido no cache local):', err);
      }
    }
  };

  const deleteTransaction = async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));

    if (user) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'transactions', id));
      } catch (err) {
        console.warn('Erro ao excluir transação no Firestore (mantido no cache local):', err);
      }
    }
  };

  const deleteRecurringGroup = async (groupId: string) => {
    setTransactions(prev => prev.filter(t => t.recurrenceGroupId !== groupId));

    if (user) {
      try {
        const itemsToDelete = transactions.filter(t => t.recurrenceGroupId === groupId);
        const batch = writeBatch(db);
        itemsToDelete.forEach(t => {
          batch.delete(doc(db, 'users', user.uid, 'transactions', t.id));
        });
        await batch.commit();
      } catch (err) {
        console.warn('Erro ao excluir grupo recorrente no Firestore (mantido no cache local):', err);
      }
    }
  };

  const toggleTransactionStatus = async (id: string) => {
    const target = transactions.find(t => t.id === id);
    if (!target) return;
    const updated: Transaction = {
      ...target,
      status: target.status === 'settled' ? 'pending' : 'settled',
    };

    setTransactions(prev => prev.map(t => (t.id === id ? updated : t)));

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'transactions', id), updated);
      } catch (err) {
        console.warn('Erro ao alternar status da transação no Firestore (mantido no cache local):', err);
      }
    }
  };

  const addInvestment = async (inv: Omit<InvestmentAsset, 'id' | 'updatedAt'>) => {
    const newInv: InvestmentAsset = {
      ...inv,
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      updatedAt: new Date().toISOString(),
    };

    setInvestments(prev => [...prev, newInv]);

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'investments', newInv.id), newInv);
      } catch (err) {
        console.warn('Erro ao salvar investimento no Firestore (mantido no cache local):', err);
      }
    }
  };

  const updateInvestment = async (updatedInv: InvestmentAsset) => {
    const payload: InvestmentAsset = {
      ...updatedInv,
      updatedAt: new Date().toISOString(),
    };

    setInvestments(prev => prev.map(i => (i.id === updatedInv.id ? payload : i)));

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'investments', payload.id), payload);
      } catch (err) {
        console.warn('Erro ao atualizar investimento no Firestore (mantido no cache local):', err);
      }
    }
  };

  const deleteInvestment = async (id: string) => {
    setInvestments(prev => prev.filter(i => i.id !== id));
    setDividends(prev => prev.filter(d => d.assetId !== id));

    if (user) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'investments', id));
      } catch (err) {
        console.warn('Erro ao excluir investimento no Firestore (mantido no cache local):', err);
      }
    }
  };

  const addDividend = async (div: Omit<DividendRecord, 'id'>) => {
    const newDiv: DividendRecord = {
      ...div,
      id: `div_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };

    setDividends(prev => [newDiv, ...prev]);

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'dividends', newDiv.id), newDiv);
      } catch (err) {
        console.warn('Erro ao salvar provento no Firestore (mantido no cache local):', err);
      }
    }

    // Auto-create an income transaction
    const targetAccount = accounts.find(a => a.type === 'investment') || accounts[0];
    if (targetAccount) {
      addTransaction({
        type: 'income',
        description: `Provento / Dividendo: ${newDiv.assetTicker}`,
        amount: newDiv.amount,
        date: newDiv.date,
        category: 'Dividendos & Rendimentos',
        accountId: targetAccount.id,
        status: 'settled',
        notes: newDiv.notes || `Rendimento registrado via carteira`,
      });
    }
  };

  const deleteDividend = async (id: string) => {
    setDividends(prev => prev.filter(d => d.id !== id));

    if (user) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'dividends', id));
      } catch (err) {
        console.warn('Erro ao excluir provento do Firestore (mantido no cache local):', err);
      }
    }
  };

  const updateBudget = async (category: ExpenseCategory, monthlyLimit: number) => {
    setBudgets(prev => {
      const exists = prev.some(b => b.category === category);
      if (exists) {
        return prev.map(b => (b.category === category ? { ...b, monthlyLimit } : b));
      }
      return [...prev, { category, monthlyLimit }];
    });

    if (user) {
      try {
        const id = `b_${category.replace(/[^a-zA-Z0-9]/g, '_')}`;
        await setDoc(doc(db, 'users', user.uid, 'budgets', id), { category, monthlyLimit });
      } catch (err) {
        console.warn('Erro ao salvar orçamento no Firestore (mantido no cache local):', err);
      }
    }
  };

  const addGoal = async (goal: Omit<FinancialGoal, 'id'>) => {
    const newGoal: FinancialGoal = {
      ...goal,
      id: `goal_${Date.now()}`,
    };

    setGoals(prev => [...prev, newGoal]);

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'goals', newGoal.id), newGoal);
      } catch (err) {
        console.warn('Erro ao salvar meta no Firestore (mantido no cache local):', err);
      }
    }
  };

  const updateGoal = async (updatedGoal: FinancialGoal) => {
    setGoals(prev => prev.map(g => (g.id === updatedGoal.id ? updatedGoal : g)));

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'goals', updatedGoal.id), updatedGoal);
      } catch (err) {
        console.warn('Erro ao atualizar meta no Firestore (mantido no cache local):', err);
      }
    }
  };

  const deleteGoal = async (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));

    if (user) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'goals', id));
      } catch (err) {
        console.warn('Erro ao excluir meta do Firestore (mantido no cache local):', err);
      }
    }
  };

  // Account Actions
  const addAccount = async (acc: Omit<Account, 'id'>) => {
    const newAcc: Account = {
      ...acc,
      id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };

    setAccounts(prev => [...prev, newAcc]);

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'accounts', newAcc.id), newAcc);
      } catch (err) {
        console.warn('Erro ao adicionar conta no Firestore (mantido no cache local):', err);
      }
    }
  };

  const updateAccount = async (updatedAcc: Account) => {
    setAccounts(prev => prev.map(a => (a.id === updatedAcc.id ? updatedAcc : a)));

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'accounts', updatedAcc.id), updatedAcc);
      } catch (err) {
        console.warn('Erro ao atualizar conta no Firestore (mantido no cache local):', err);
      }
    }
  };

  const deleteAccount = async (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));

    if (user) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'accounts', id));
      } catch (err) {
        console.warn('Erro ao excluir conta do Firestore (mantido no cache local):', err);
      }
    }
  };

  const clearMockData = async () => {
    hasClearedMocksRef.current = true;
    localStorage.setItem('capital_control_cleared_mock_v1', 'true');
    localStorage.setItem('capital_control_onboarding_done_v1', 'true');

    // Keep existing custom accounts created by user, eliminate all mock accounts (acc_1, acc_2, acc_3, acc_4)
    const realAccounts = accounts.filter(a => !isMockAccount(a));
    const cleanDefaultAccounts: Account[] =
      realAccounts.length > 0
        ? realAccounts
        : [defaultCleanAccount];

    // Filter out any mock investments, keeping only real ones (or empty)
    const realInvestments = investments.filter(i => !isMockInvestment(i));
    const realTransactions = transactions.filter(t => !isMockTransaction(t));
    const realDividends = dividends.filter(d => !isMockDividend(d));
    const realGoals = goals.filter(g => !isMockGoal(g));

    setAccounts(cleanDefaultAccounts);
    setTransactions(realTransactions);
    setInvestments(realInvestments);
    setDividends(realDividends);
    setGoals(realGoals);

    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(cleanDefaultAccounts));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(realTransactions));
    localStorage.setItem(STORAGE_KEYS.INVESTMENTS, JSON.stringify(realInvestments));
    localStorage.setItem(STORAGE_KEYS.DIVIDENDS, JSON.stringify(realDividends));
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(realGoals));

    if (user) {
      try {
        // Mark user profile as cleared mock
        await setDoc(
          doc(db, 'users', user.uid),
          {
            clearedMockData: true,
            isDemoData: false,
            onboardingDone: true,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        // Delete mock collections in Firestore
        const deleteCol = async (colName: string, isMockPredicate?: (d: any) => boolean) => {
          try {
            const snap = await getDocs(collection(db, 'users', user.uid, colName));
            if (!snap.empty) {
              const b = writeBatch(db);
              let delCount = 0;
              snap.forEach(d => {
                if (!isMockPredicate || isMockPredicate({ id: d.id, ...d.data() })) {
                  b.delete(d.ref);
                  delCount++;
                }
              });
              if (delCount > 0) await b.commit();
            }
          } catch (e) {
            console.warn(`Erro ao limpar ${colName} do Firestore:`, e);
          }
        };

        await Promise.all([
          deleteCol('accounts', isMockAccount),
          deleteCol('transactions', isMockTransaction),
          deleteCol('investments', isMockInvestment),
          deleteCol('dividends', isMockDividend),
          deleteCol('goals', isMockGoal),
        ]);

        // Keep or sync clean accounts in Firestore
        const bAcc = writeBatch(db);
        cleanDefaultAccounts.forEach(a => {
          bAcc.set(doc(db, 'users', user.uid, 'accounts', a.id), a);
        });
        await bAcc.commit();
      } catch (err) {
        console.error('Erro ao limpar dados mockados no Firestore:', err);
      }
    }

    // Update selectedMonth to current real month
    const now = new Date();
    setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  };

  const setupInitialAccounts = async (
    accountsList: Omit<Account, 'id'>[],
    options: { clearMocks: boolean; createInvoiceTransactions: boolean }
  ) => {
    hasClearedMocksRef.current = true;
    const timestamp = Date.now();
    const newAccounts: Account[] = accountsList.map((acc, idx) => ({
      ...acc,
      id: `acc_${timestamp}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
    }));

    let nextTransactions: Transaction[] = options.clearMocks ? [] : [...transactions];
    const nextInvestments: InvestmentAsset[] = options.clearMocks ? [] : [...investments];
    const nextDividends: DividendRecord[] = options.clearMocks ? [] : [...dividends];
    const nextGoals: FinancialGoal[] = options.clearMocks ? [] : [...goals];

    // If option to create current invoice pending transactions is enabled
    if (options.createInvoiceTransactions) {
      const now = new Date();
      const curYear = now.getFullYear();
      const curMonth = String(now.getMonth() + 1).padStart(2, '0');

      newAccounts.forEach((acc, idx) => {
        if (acc.currentInvoice && acc.currentInvoice > 0) {
          const due = acc.dueDay ? Math.min(28, Math.max(1, acc.dueDay)) : 10;
          const dateStr = `${curYear}-${curMonth}-${String(due).padStart(2, '0')}`;
          const invoiceTx: Transaction = {
            id: `tx_${timestamp}_inv_${idx}`,
            type: 'expense',
            description: `Fatura Cartão: ${acc.name}`,
            amount: acc.currentInvoice,
            date: dateStr,
            category: 'Moradia & Contas',
            accountId: acc.id,
            status: 'pending',
            notes: `Fatura cadastrada no assistente inicial. Fechamento dia ${acc.closingDay || '—'}, Vencimento dia ${acc.dueDay || due}.`,
            createdAt: new Date().toISOString(),
          };
          nextTransactions.unshift(invoiceTx);
        }
      });
    }

    setAccounts(newAccounts);
    setTransactions(nextTransactions);
    setInvestments(nextInvestments);
    setDividends(nextDividends);
    setGoals(nextGoals);

    if (options.clearMocks) {
      localStorage.setItem('capital_control_cleared_mock_v1', 'true');
    }

    setIsOnboardingDoneState(true);
    localStorage.setItem('capital_control_onboarding_done_v1', 'true');

    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(newAccounts));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(nextTransactions));
    localStorage.setItem(STORAGE_KEYS.INVESTMENTS, JSON.stringify(nextInvestments));
    localStorage.setItem(STORAGE_KEYS.DIVIDENDS, JSON.stringify(nextDividends));
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(nextGoals));

    // Update selectedMonth to current month
    const now = new Date();
    setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

    if (user) {
      try {
        // Delete all old collections if clearMocks is true using getDocs
        if (options.clearMocks) {
          const deleteCol = async (colName: string) => {
            try {
              const snap = await getDocs(collection(db, 'users', user.uid, colName));
              if (!snap.empty) {
                const b = writeBatch(db);
                snap.forEach(d => b.delete(d.ref));
                await b.commit();
              }
            } catch (e) {
              console.warn(`Erro ao limpar ${colName}:`, e);
            }
          };

          await Promise.all([
            deleteCol('accounts'),
            deleteCol('transactions'),
            deleteCol('investments'),
            deleteCol('dividends'),
            deleteCol('goals'),
          ]);
        } else {
          // Clear old accounts only
          try {
            const snap = await getDocs(collection(db, 'users', user.uid, 'accounts'));
            if (!snap.empty) {
              const b = writeBatch(db);
              snap.forEach(d => b.delete(d.ref));
              await b.commit();
            }
          } catch (e) {
            console.warn('Erro ao limpar contas antigas:', e);
          }
        }

        const batch = writeBatch(db);
        newAccounts.forEach(a => batch.set(doc(db, 'users', user.uid, 'accounts', a.id), a));

        if (options.createInvoiceTransactions) {
          nextTransactions
            .filter(t => t.id.startsWith(`tx_${timestamp}_inv_`))
            .forEach(t => batch.set(doc(db, 'users', user.uid, 'transactions', t.id), t));
        }

        batch.set(
          doc(db, 'users', user.uid),
          {
            clearedMockData: options.clearMocks,
            onboardingDone: true,
            isDemoData: !options.clearMocks,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        await batch.commit();
      } catch (err) {
        console.warn('Erro ao sincronizar setup inicial no Firestore:', err);
      }
    }
  };

  const resetToInitialData = async () => {
    hasClearedMocksRef.current = false;
    localStorage.removeItem('capital_control_cleared_mock_v1');
    localStorage.removeItem('capital_control_onboarding_done_v1');
    localStorage.setItem('capital_control_demo_mode_active', 'true');
    setIsOnboardingDoneState(false);

    setAccounts(INITIAL_ACCOUNTS);
    setTransactions(INITIAL_TRANSACTIONS);
    setInvestments(INITIAL_INVESTMENTS);
    setDividends(INITIAL_DIVIDENDS);
    setBudgets(INITIAL_BUDGETS);
    setGoals(INITIAL_GOALS);
    const now = new Date();
    setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(INITIAL_ACCOUNTS));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
    localStorage.setItem(STORAGE_KEYS.INVESTMENTS, JSON.stringify(INITIAL_INVESTMENTS));
    localStorage.setItem(STORAGE_KEYS.DIVIDENDS, JSON.stringify(INITIAL_DIVIDENDS));
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(INITIAL_BUDGETS));
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(INITIAL_GOALS));

    if (user) {
      try {
        const batch = writeBatch(db);
        // Mark profile as demo
        batch.set(
          doc(db, 'users', user.uid),
          { clearedMockData: false, isDemoData: true, onboardingDone: false, updatedAt: new Date().toISOString() },
          { merge: true }
        );
        // Seed fresh default data into Firestore
        INITIAL_ACCOUNTS.forEach(a => batch.set(doc(db, 'users', user.uid, 'accounts', a.id), a));
        INITIAL_TRANSACTIONS.forEach(t => batch.set(doc(db, 'users', user.uid, 'transactions', t.id), t));
        INITIAL_INVESTMENTS.forEach(i => batch.set(doc(db, 'users', user.uid, 'investments', i.id), i));
        INITIAL_DIVIDENDS.forEach(d => batch.set(doc(db, 'users', user.uid, 'dividends', d.id), d));
        INITIAL_BUDGETS.forEach((b, idx) => batch.set(doc(db, 'users', user.uid, 'budgets', `b_${idx}`), b));
        INITIAL_GOALS.forEach(g => batch.set(doc(db, 'users', user.uid, 'goals', g.id), g));
        await batch.commit();
      } catch (err) {
        console.warn('Erro ao restaurar dados de exemplo no Firestore:', err);
      }
    }
  };

  const clearAllData = async () => {
    await clearMockData();
  };

  const exportAllData = () => {
    const backup = {
      accounts,
      transactions,
      investments,
      dividends,
      budgets,
      goals,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_financas_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importAllData = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.transactions && parsed.investments) {
        if (Array.isArray(parsed.accounts)) setAccounts(parsed.accounts);
        if (Array.isArray(parsed.transactions)) setTransactions(parsed.transactions);
        if (Array.isArray(parsed.investments)) setInvestments(parsed.investments);
        if (Array.isArray(parsed.dividends)) setDividends(parsed.dividends);
        if (Array.isArray(parsed.budgets)) setBudgets(parsed.budgets);
        if (Array.isArray(parsed.goals)) setGoals(parsed.goals);

        // If user is connected to cloud, also sync batch to Firestore
        if (user) {
          const batch = writeBatch(db);
          if (Array.isArray(parsed.accounts)) {
            parsed.accounts.forEach((a: Account) => batch.set(doc(db, 'users', user.uid, 'accounts', a.id), a));
          }
          if (Array.isArray(parsed.transactions)) {
            parsed.transactions.forEach((t: Transaction) => batch.set(doc(db, 'users', user.uid, 'transactions', t.id), t));
          }
          if (Array.isArray(parsed.investments)) {
            parsed.investments.forEach((i: InvestmentAsset) => batch.set(doc(db, 'users', user.uid, 'investments', i.id), i));
          }
          batch.commit().catch(e => console.error('Erro ao sincronizar importação no Firestore:', e));
        }

        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const exportTransactionsCSV = () => {
    const headers = ['Data', 'Tipo', 'Descrição', 'Valor (R$)', 'Categoria', 'Conta', 'Status', 'Observações'];
    const rows = transactions.map(t => {
      const acc = accounts.find(a => a.id === t.accountId);
      return [
        t.date,
        t.type === 'income' ? 'Entrada' : 'Saída',
        `"${t.description.replace(/"/g, '""')}"`,
        t.amount.toFixed(2),
        `"${t.category}"`,
        `"${acc ? acc.name : ''}"`,
        t.status === 'settled' ? 'Efetivado' : 'Pendente',
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transacoes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Computations
  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    accounts.forEach(a => {
      balances[a.id] = a.initialBalance;
    });

    transactions.forEach(t => {
      if (t.status === 'settled' && balances[t.accountId] !== undefined) {
        if (t.type === 'income') {
          balances[t.accountId] += t.amount;
        } else {
          balances[t.accountId] -= t.amount;
        }
      }
    });

    return balances;
  }, [accounts, transactions]);

  const totalCashInAccounts = useMemo(() => {
    return Object.values(accountBalances).reduce((acc, curr) => acc + curr, 0);
  }, [accountBalances]);

  const totalInvestedCost = useMemo(() => {
    return investments.reduce((sum, inv) => sum + inv.quantity * inv.averagePrice, 0);
  }, [investments]);

  const totalInvestmentValue = useMemo(() => {
    return investments.reduce((sum, inv) => {
      let unitPrice = inv.currentPrice;
      if (
        inv.benchmarkType === 'cdi' &&
        inv.acquisitionDate &&
        inv.benchmarkRate &&
        inv.averagePrice > 0
      ) {
        const sim = calculateCdiAccruedValue({
          principal: inv.quantity * inv.averagePrice,
          multiplierPercent: inv.benchmarkRate,
          startDateStr: inv.acquisitionDate,
          targetDateStr: cdiScheduleInfo.effectiveDate,
          cdiAnnualPercent: inv.baseCdiRate || CURRENT_CDI_ANNUAL_DEFAULT,
        });
        if (sim && sim.grossAmount > 0 && inv.quantity > 0) {
          const accruedPrice = sim.grossAmount / inv.quantity;
          unitPrice = Math.max(inv.currentPrice, accruedPrice);
        }
      }
      return sum + inv.quantity * unitPrice;
    }, 0);
  }, [investments, cdiScheduleInfo.effectiveDate]);

  const totalInvestmentProfit = useMemo(() => {
    return totalInvestmentValue - totalInvestedCost;
  }, [totalInvestmentValue, totalInvestedCost]);

  const totalInvestmentProfitPercent = useMemo(() => {
    if (totalInvestedCost <= 0) return 0;
    return (totalInvestmentProfit / totalInvestedCost) * 100;
  }, [totalInvestmentProfit, totalInvestedCost]);

  const totalNetWorth = useMemo(() => {
    return totalCashInAccounts + totalInvestmentValue;
  }, [totalCashInAccounts, totalInvestmentValue]);

  // Selected Month calculations
  const monthTransactions = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  const monthlyIncome = useMemo(() => {
    return monthTransactions
      .filter(t => t.type === 'income' && t.status === 'settled')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  const monthlyExpense = useMemo(() => {
    return monthTransactions
      .filter(t => t.type === 'expense' && t.status === 'settled')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  const pendingExpensesMonth = useMemo(() => {
    return monthTransactions
      .filter(t => t.type === 'expense' && t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [monthTransactions]);

  const monthlyBalance = useMemo(() => {
    return monthlyIncome - monthlyExpense;
  }, [monthlyIncome, monthlyExpense]);

  const monthlySavingsRate = useMemo(() => {
    if (monthlyIncome <= 0) return 0;
    const rate = ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100;
    return rate > 100 ? 100 : rate;
  }, [monthlyIncome, monthlyExpense]);

  const categoryExpensesMonth = useMemo(() => {
    const expensesByCategory: Record<string, number> = {};
    let totalExp = 0;

    monthTransactions.forEach(t => {
      if (t.type === 'expense') {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
        totalExp += t.amount;
      }
    });

    return Object.entries(expensesByCategory)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExp > 0 ? (amount / totalExp) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthTransactions]);

  const assetClassAllocation = useMemo(() => {
    const classMap: Record<AssetClass, { current: number; invested: number }> = {
      renda_fixa: { current: 0, invested: 0 },
      acoes_br: { current: 0, invested: 0 },
      fiis: { current: 0, invested: 0 },
      internacional: { current: 0, invested: 0 },
      cripto: { current: 0, invested: 0 },
      reserva_emergencia: { current: 0, invested: 0 },
    };

    investments.forEach(inv => {
      let unitPrice = inv.currentPrice;
      if (
        inv.benchmarkType === 'cdi' &&
        inv.acquisitionDate &&
        inv.benchmarkRate &&
        inv.averagePrice > 0
      ) {
        const sim = calculateCdiAccruedValue({
          principal: inv.quantity * inv.averagePrice,
          multiplierPercent: inv.benchmarkRate,
          startDateStr: inv.acquisitionDate,
          targetDateStr: cdiScheduleInfo.effectiveDate,
          cdiAnnualPercent: inv.baseCdiRate || CURRENT_CDI_ANNUAL_DEFAULT,
        });
        if (sim && sim.grossAmount > 0 && inv.quantity > 0) {
          const accruedPrice = sim.grossAmount / inv.quantity;
          unitPrice = Math.max(inv.currentPrice, accruedPrice);
        }
      }
      const cur = inv.quantity * unitPrice;
      const invst = inv.quantity * inv.averagePrice;
      if (classMap[inv.assetClass]) {
        classMap[inv.assetClass].current += cur;
        classMap[inv.assetClass].invested += invst;
      }
    });

    const totalVal = Object.values(classMap).reduce((s, c) => s + c.current, 0);

    return (Object.keys(classMap) as AssetClass[]).map(cls => {
      const data = classMap[cls];
      const profit = data.current - data.invested;
      return {
        assetClass: cls,
        currentValue: data.current,
        investedValue: data.invested,
        profit,
        percentage: totalVal > 0 ? (data.current / totalVal) * 100 : 0,
      };
    });
  }, [investments, cdiScheduleInfo.effectiveDate]);

  const monthlyCashflowHistory = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const y = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);

    const monthKeys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      let targetM = m - i;
      let targetY = y;
      while (targetM <= 0) {
        targetM += 12;
        targetY -= 1;
      }
      monthKeys.push(`${targetY}-${String(targetM).padStart(2, '0')}`);
    }

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    return monthKeys.map(key => {
      const [ky, km] = key.split('-');
      const label = `${monthNames[parseInt(km, 10) - 1]}/${ky.slice(2)}`;
      const inMonth = transactions.filter(t => t.date.startsWith(key));
      const inc = inMonth.filter(t => t.type === 'income' && t.status === 'settled').reduce((s, t) => s + t.amount, 0);
      const exp = inMonth.filter(t => t.type === 'expense' && t.status === 'settled').reduce((s, t) => s + t.amount, 0);
      return {
        month: key,
        label,
        income: inc,
        expense: exp,
        balance: inc - exp,
      };
    });
  }, [transactions, selectedMonth]);

  const totalDividendsReceived = useMemo(() => {
    return dividends.reduce((s, d) => s + d.amount, 0);
  }, [dividends]);

  return (
    <FinanceContext.Provider
      value={{
        accounts,
        transactions,
        investments,
        dividends,
        budgets,
        goals,
        selectedMonth,
        setSelectedMonth,

        cdiScheduleInfo,

        isCloudSyncing,
        isCloudActive: !!user,
        isOffline,
        lastSyncAt,

        isDemoData,
        clearMockData,
        isOnboardingDone,
        setIsOnboardingDone,
        setupInitialAccounts,

        addAccount,
        updateAccount,
        deleteAccount,

        addTransaction,
        addTransactions,
        updateTransaction,
        deleteTransaction,
        deleteRecurringGroup,
        toggleTransactionStatus,

        addInvestment,
        updateInvestment,
        deleteInvestment,

        addDividend,
        deleteDividend,

        updateBudget,

        addGoal,
        updateGoal,
        deleteGoal,

        resetToInitialData,
        clearAllData,
        exportAllData,
        importAllData,
        exportTransactionsCSV,

        accountBalances,
        totalCashInAccounts,
        totalInvestedCost,
        totalInvestmentValue,
        totalInvestmentProfit,
        totalInvestmentProfitPercent,
        totalNetWorth,

        monthlyIncome,
        monthlyExpense,
        monthlyBalance,
        monthlySavingsRate,
        pendingExpensesMonth,

        categoryExpensesMonth,
        assetClassAllocation,
        monthlyCashflowHistory,
        totalDividendsReceived,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
