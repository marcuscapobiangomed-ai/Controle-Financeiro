export type TransactionType = 'income' | 'expense';

export type IncomeCategory =
  | 'Salário & Proventos'
  | 'Freelance & Consultoria'
  | 'Dividendos & Rendimentos'
  | 'Venda de Ativos'
  | 'Reembolsos'
  | 'Outras Receitas';

export type ExpenseCategory =
  | 'Moradia & Contas'
  | 'Alimentação & Supermercado'
  | 'Transporte & Combustível'
  | 'Saúde & Farmácia'
  | 'Educação & Cursos'
  | 'Lazer & Restaurantes'
  | 'Assinaturas & Serviços'
  | 'Compras & Pessoal'
  | 'Aporte / Poupança'
  | 'Outras Despesas';

export type AssetClass =
  | 'renda_fixa'
  | 'acoes_br'
  | 'fiis'
  | 'internacional'
  | 'cripto'
  | 'reserva_emergencia';

export type RecurrenceInterval =
  | 'none'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export interface Account {
  id: string;
  name: string;
  institution: string;
  type: 'checking' | 'investment' | 'credit_card' | 'cash' | 'savings';
  initialBalance: number;
  color: string;
  // Campos adicionais de cartão de crédito e faturas
  creditLimit?: number; // Limite total do cartão (R$)
  currentInvoice?: number; // Valor da fatura atual em aberto (R$)
  closingDay?: number; // Dia de fechamento da fatura (1 a 31)
  dueDay?: number; // Dia de vencimento da fatura (1 a 31)
}

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  category: string;
  accountId: string;
  status: 'settled' | 'pending';
  recurrence?: RecurrenceInterval;
  recurrenceGroupId?: string;
  recurrenceIndex?: number;
  recurrenceTotalCount?: number;
  notes?: string;
  createdAt: string;
}

export interface InvestmentAsset {
  id: string;
  name: string;
  ticker: string;
  assetClass: AssetClass;
  institution: string; // Corretora / Banco
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  notes?: string;
  updatedAt: string;

  // Campos específicos de Renda Fixa & Liquidez
  liquidity?: 'daily' | 'maturity' | 'd_plus_1' | 'd_plus_30' | 'd_plus_90' | 'custom';
  benchmarkType?: 'cdi' | 'ipca' | 'prefixado' | 'selic' | 'outros';
  benchmarkRate?: number; // Ex: 100, 110, 120, 140 para % do CDI; ou 6.5 para IPCA + 6.5% ou % a.a. prefixado
  additionalRate?: number; // Ex: taxa adicional caso IPCA + X% ou CDI + X%
  acquisitionDate?: string; // Data da aplicação (YYYY-MM-DD)
  maturityDate?: string; // Data de vencimento (YYYY-MM-DD), se houver
  lastAccrualCalculationDate?: string; // Data do último cálculo de rendimento
  baseCdiRate?: number; // Taxa CDI base a.a. usada para projeção/cálculo (ex: 10.50% a.a.)
}

export interface DividendRecord {
  id: string;
  assetId: string;
  assetTicker: string;
  date: string;
  amount: number;
  type: 'dividendo' | 'jcp' | 'rendimento_fii' | 'juros_rf';
  notes?: string;
}

export interface BudgetLimit {
  category: ExpenseCategory;
  monthlyLimit: number;
}

export interface FinancialGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  category: 'reserva' | 'patrimonio' | 'viagem' | 'sonho';
}
