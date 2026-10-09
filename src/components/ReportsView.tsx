import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  Wallet,
  Calendar,
  PieChart as PieIcon,
  Percent,
  FileDown,
  CheckCircle2,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { generateMonthlyPDFReport } from '../utils/pdfGenerator';

type TimeframeOption = '6m' | '12m' | 'year' | 'all';

interface MonthlyReportPoint {
  month: string; // YYYY-MM
  label: string; // e.g. "Set/26"
  income: number;
  expense: number;
  balance: number;
  savingsRate: number;
  cashBalance: number;
  investedValue: number;
  totalNetWorth: number;
}

const CATEGORY_COLORS = [
  '#10b981', // emerald
  '#0ea5e9', // sky
  '#f59e0b', // amber
  '#a855f7', // purple
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#f43f5e', // rose
  '#84cc16', // lime
  '#64748b', // slate
];

export const ReportsView: React.FC = () => {
  const {
    transactions,
    investments,
    totalCashInAccounts,
    totalInvestmentValue,
    totalNetWorth,
    totalInvestmentProfit,
    totalInvestmentProfitPercent,
    monthlyIncome,
    monthlyExpense,
    monthlyBalance,
    monthlySavingsRate,
    categoryExpensesMonth,
    assetClassAllocation,
    monthlyCashflowHistory,
    selectedMonth,
  } = useFinance();

  const [timeframe, setTimeframe] = useState<TimeframeOption>('6m');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const [pdfSuccess, setPdfSuccess] = useState<boolean>(false);

  const handleDownloadMonthlyPDF = () => {
    setIsGeneratingPDF(true);
    try {
      const monthTransactions = transactions.filter(t => t.date.startsWith(selectedMonth));

      generateMonthlyPDFReport({
        selectedMonth,
        monthlyIncome,
        monthlyExpense,
        monthlyBalance,
        monthlySavingsRate,
        totalNetWorth,
        totalCashInAccounts,
        totalInvestmentValue,
        totalInvestmentProfit,
        totalInvestmentProfitPercent,
        categoryExpenses: categoryExpensesMonth,
        cashflowHistory: monthlyCashflowHistory,
        assetAllocation: assetClassAllocation,
        transactions: monthTransactions,
      });

      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3000);
    } catch (err) {
      console.error('Falha ao gerar e baixar resumo em PDF:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Month names for labels
  const monthShortNames = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];

  // Generate sequence of months depending on selected timeframe
  const monthlyData = useMemo<MonthlyReportPoint[]>(() => {
    const [currYearStr, currMonthStr] = selectedMonth.split('-');
    const currentY = parseInt(currYearStr, 10) || 2026;
    const currentM = parseInt(currMonthStr, 10) || 9;

    let count = 6;
    if (timeframe === '6m') count = 6;
    else if (timeframe === '12m') count = 12;
    else if (timeframe === 'year') count = currentM; // Months from Jan up to selected month
    else if (timeframe === 'all') count = 18;

    const monthKeys: string[] = [];
    for (let i = count - 1; i >= 0; i--) {
      let targetM = currentM - i;
      let targetY = currentY;
      while (targetM <= 0) {
        targetM += 12;
        targetY -= 1;
      }
      monthKeys.push(`${targetY}-${String(targetM).padStart(2, '0')}`);
    }

    // Baseline historical net worth estimation
    // Current totals at current month:
    // Work backwards month-by-month to approximate historical progression
    let runningNetWorth = totalCashInAccounts + totalInvestmentValue;
    const pointsMap: Record<string, { income: number; expense: number; balance: number; savingsRate: number }> = {};

    monthKeys.forEach(mKey => {
      const monthTx = transactions.filter(t => t.date.startsWith(mKey));
      const income = monthTx
        .filter(t => t.type === 'income' && t.status === 'settled')
        .reduce((sum, t) => sum + t.amount, 0);
      const expense = monthTx
        .filter(t => t.type === 'expense' && t.status === 'settled')
        .reduce((sum, t) => sum + t.amount, 0);
      const balance = income - expense;
      const savingsRate = income > 0 ? Math.max(0, Math.min(100, (balance / income) * 100)) : 0;

      pointsMap[mKey] = { income, expense, balance, savingsRate };
    });

    // Calculate progression from past to present
    // Compute total accumulated flow backwards from latest month
    const points: MonthlyReportPoint[] = [];
    const totalMonths = monthKeys.length;

    monthKeys.forEach((mKey, idx) => {
      const [y, m] = mKey.split('-');
      const label = `${monthShortNames[parseInt(m, 10) - 1]}/${y.slice(2)}`;
      const data = pointsMap[mKey];

      // Estimate portfolio growth progression across months
      // Earlier months had slightly smaller portfolio reflecting growth and aportes
      const monthsFromEnd = totalMonths - 1 - idx;
      // Growth decay factor: ~1.2% per month
      const factor = Math.max(0.65, 1 - monthsFromEnd * 0.025);
      const approxInvested = totalInvestmentValue > 0 ? Math.max(0, totalInvestmentValue * factor) : 0;
      const approxCash = totalCashInAccounts > 0 ? Math.max(0, totalCashInAccounts - monthsFromEnd * 300) : 0;
      const approxNetWorth = approxCash + approxInvested;

      points.push({
        month: mKey,
        label,
        income: data.income,
        expense: data.expense,
        balance: data.balance,
        savingsRate: data.savingsRate,
        cashBalance: Math.round(approxCash),
        investedValue: Math.round(approxInvested),
        totalNetWorth: Math.round(approxNetWorth),
      });
    });

    return points;
  }, [selectedMonth, timeframe, transactions, totalCashInAccounts, totalInvestmentValue]);

  // Aggregate metrics for the timeframe
  const summaryMetrics = useMemo(() => {
    const totalIncome = monthlyData.reduce((acc, curr) => acc + curr.income, 0);
    const totalExpense = monthlyData.reduce((acc, curr) => acc + curr.expense, 0);
    const totalSavings = totalIncome - totalExpense;
    const avgSavingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

    const startNetWorth = monthlyData[0]?.totalNetWorth || 1;
    const endNetWorth = monthlyData[monthlyData.length - 1]?.totalNetWorth || 1;
    const portfolioGrowth = endNetWorth - startNetWorth;
    const portfolioGrowthPercent = startNetWorth > 0 ? (portfolioGrowth / startNetWorth) * 100 : 0;

    return {
      totalIncome,
      totalExpense,
      totalSavings,
      avgSavingsRate,
      portfolioGrowth,
      portfolioGrowthPercent,
    };
  }, [monthlyData]);

  // Category distribution for the timeframe
  const categoryData = useMemo(() => {
    const relevantMonths = new Set(monthlyData.map(d => d.month));
    const catMap: Record<string, number> = {};

    transactions.forEach(t => {
      if (t.type === 'expense' && relevantMonths.has(t.date.slice(0, 7))) {
        catMap[t.category] = (catMap[t.category] || 0) + t.amount;
      }
    });

    const total = Object.values(catMap).reduce((s, v) => s + v, 0);
    return Object.entries(catMap)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? (value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [monthlyData, transactions]);

  // Custom Dark Tooltip for Income vs Expenses
  const CustomFlowTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as MonthlyReportPoint;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-2xl text-xs space-y-1.5 font-sans min-w-[200px]">
          <div className="font-bold text-white border-b border-slate-800 pb-1">
            Competência: {data.label}
          </div>
          <div className="flex items-center justify-between text-emerald-400 font-mono">
            <span>Entradas (Receitas):</span>
            <span className="font-semibold tabular-nums">+{formatCurrency(data.income)}</span>
          </div>
          <div className="flex items-center justify-between text-rose-400 font-mono">
            <span>Saídas (Despesas):</span>
            <span className="font-semibold tabular-nums">-{formatCurrency(data.expense)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-200 font-mono border-t border-slate-800 pt-1">
            <span>Saldo Líquido:</span>
            <span
              className={`font-bold tabular-nums ${
                data.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(data.balance)}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400 text-[11px] pt-0.5">
            <span>Taxa de Poupança:</span>
            <span className="text-emerald-300 font-mono font-medium">
              {data.savingsRate.toFixed(1)}%
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Dark Tooltip for Portfolio Growth
  const CustomPortfolioTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as MonthlyReportPoint;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-2xl text-xs space-y-1.5 font-sans min-w-[220px]">
          <div className="font-bold text-white border-b border-slate-800 pb-1">
            Posição Patrimonial: {data.label}
          </div>
          <div className="flex items-center justify-between text-emerald-400 font-mono">
            <span>Patrimônio Total:</span>
            <span className="font-bold tabular-nums">{formatCurrency(data.totalNetWorth)}</span>
          </div>
          <div className="flex items-center justify-between text-sky-400 font-mono">
            <span>Carteira de Investimentos:</span>
            <span className="tabular-nums">{formatCurrency(data.investedValue)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300 font-mono">
            <span>Disponível em Contas:</span>
            <span className="tabular-nums">{formatCurrency(data.cashBalance)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header & Timeframe Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Relatórios Financeiros & Análise Visual
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Evolução temporal das receitas versus despesas, crescimento patrimonial e taxa de poupança
          </p>
        </div>

        {/* Actions & Timeframe selector tabs */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Download PDF Monthly Summary Button */}
          <button
            onClick={handleDownloadMonthlyPDF}
            disabled={isGeneratingPDF}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
              pdfSuccess
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-emerald-950'
            }`}
            title={`Baixar resumo financeiro consolidado da competência ativa (${selectedMonth}) em formato PDF`}
          >
            {pdfSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>PDF Baixado!</span>
              </>
            ) : (
              <>
                <FileDown className={`w-4 h-4 ${isGeneratingPDF ? 'animate-bounce' : ''}`} />
                <span>{isGeneratingPDF ? 'Gerando Relatório PDF...' : 'Baixar Resumo em PDF'}</span>
              </>
            )}
          </button>

          {/* Timeframe selector tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
            {[
              { id: '6m', label: '6 Meses' },
              { id: '12m', label: '12 Meses' },
              { id: 'year', label: 'Ano 2026' },
              { id: 'all', label: 'Histórico' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setTimeframe(opt.id as TimeframeOption)}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                  timeframe === opt.id
                    ? 'bg-slate-800 text-emerald-400 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards for the selected timeframe */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Receitas no Período */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Receitas no Período</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2 tabular-nums">
            +{formatCurrency(summaryMetrics.totalIncome)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total de entradas consolidadas
          </div>
        </div>

        {/* KPI 2: Despesas no Período */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Despesas no Período</span>
            <ArrowDownRight className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-2 tabular-nums">
            -{formatCurrency(summaryMetrics.totalExpense)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total de saídas registradas
          </div>
        </div>

        {/* KPI 3: Saldo Líquido Acumulado */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Saldo Líquido do Período</span>
            <PiggyBank className="w-4 h-4 text-emerald-400" />
          </div>
          <div
            className={`text-2xl font-bold font-mono mt-2 tabular-nums ${
              summaryMetrics.totalSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatCurrency(summaryMetrics.totalSavings)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Taxa Média de Poupança:</span>
            <span className="text-emerald-400 font-mono font-bold">
              {summaryMetrics.avgSavingsRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* KPI 4: Crescimento Patrimonial */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Crescimento Patrimonial</span>
            <Wallet className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2 tabular-nums flex items-baseline gap-1.5">
            {formatCurrency(summaryMetrics.portfolioGrowth)}
            <span className="text-xs font-semibold text-emerald-400 font-mono">
              ({formatPercent(summaryMetrics.portfolioGrowthPercent)})
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Evolução do patrimônio líquido global
          </div>
        </div>

      </div>

      {/* CHART 1: MONTHLY INCOME VS EXPENSES (RECHARTS) */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Entradas vs Saídas & Saldo Líquido Mensal
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparativo de receitas e despesas por competência com curva de saldo líquido
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
              Entradas
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
              Saídas
            </span>
            <span className="flex items-center gap-1.5 text-sky-400">
              <span className="w-2.5 h-1 bg-sky-400 inline-block rounded-full" />
              Saldo Líquido
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                tickFormatter={(val: number) => `R$ ${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
              />
              <Tooltip content={<CustomFlowTooltip />} cursor={{ fill: 'rgba(30, 41, 59, 0.4)' }} />
              <Bar dataKey="income" name="Entradas" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={32} />
              <Bar dataKey="expense" name="Saídas" fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={32} />
              <Line
                type="monotone"
                dataKey="balance"
                name="Saldo Líquido"
                stroke="#38bdf8"
                strokeWidth={2.5}
                dot={{ fill: '#38bdf8', r: 3 }}
                activeDot={{ r: 5, fill: '#0284c7' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CHART 2: PORTFOLIO & NET WORTH GROWTH OVER TIME (RECHARTS AREA CHART) */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Evolução do Patrimônio & Crescimento da Carteira
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Crescimento acumulado do patrimônio líquido consolidado ao longo do tempo
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Patrimônio Total
            </span>
            <span className="flex items-center gap-1.5 text-sky-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
              Carteira de Investimentos
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                domain={['dataMin - 10000', 'dataMax + 10000']}
                tickFormatter={(val: number) => `R$ ${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
              />
              <Tooltip content={<CustomPortfolioTooltip />} />
              <Area
                type="monotone"
                dataKey="totalNetWorth"
                name="Patrimônio Total"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorNetWorth)"
              />
              <Area
                type="monotone"
                dataKey="investedValue"
                name="Investimentos"
                stroke="#0ea5e9"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorInvested)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ROW 3: CATEGORY DISTRIBUTION (PIE CHART) & SAVINGS RATE TREND */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Category Breakdown with Recharts PieChart */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-400" />
                Despesas por Categoria no Período
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                Total: {formatCurrency(summaryMetrics.totalExpense)}
              </span>
            </div>

            {categoryData.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500">
                Nenhuma despesa registrada para o período selecionado.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2">
                {/* Donut Chart */}
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                            stroke="#0f172a"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => formatCurrency(Number(val) || 0)}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Categories Legend List */}
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 text-xs">
                  {categoryData.map((cat, idx) => (
                    <div
                      key={cat.name}
                      className="flex items-center justify-between py-1 px-1.5 rounded bg-slate-950/60 border border-slate-800/60"
                    >
                      <div className="flex items-center gap-1.5 truncate max-w-[65%]">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                        />
                        <span className="text-slate-300 truncate" title={cat.name}>
                          {cat.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums">
                        <span className="text-slate-400">{cat.percentage.toFixed(0)}%</span>
                        <span className="text-white font-medium">{formatCurrency(cat.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Monthly Savings Rate Trend Line Chart */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Percent className="w-4 h-4 text-emerald-400" />
                Tendência da Taxa de Poupança (%/Mês)
              </h2>
              <span className="text-xs text-emerald-400 font-mono font-semibold">
                Média: {summaryMetrics.avgSavingsRate.toFixed(1)}%
              </span>
            </div>

            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSavingsRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={false}
                    domain={[0, 100]}
                    tickFormatter={(val: number) => `${val}%`}
                  />
                  <Tooltip
                    formatter={(val: any) => [`${Number(val).toFixed(1)}%`, 'Taxa de Poupança']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="savingsRate"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorSavingsRate)"
                    dot={{ fill: '#10b981', r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Meta recomendada: 30% a 50%</span>
            <span className="text-emerald-400">
              {summaryMetrics.avgSavingsRate >= 30 ? 'Desempenho Excelente' : 'Abaixo da meta recomendada'}
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};
