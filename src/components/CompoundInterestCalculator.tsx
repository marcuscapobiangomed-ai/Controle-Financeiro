import React, { useState, useMemo } from 'react';
import {
  Calculator,
  TrendingUp,
  DollarSign,
  Calendar,
  Percent,
  Sparkles,
  ArrowUpRight,
  Coins,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { formatCurrency, formatPercent } from '../utils/formatters';

interface CompoundInterestCalculatorProps {
  currentPortfolioValue?: number;
}

interface YearlyPoint {
  year: number;
  month: number;
  investedCapital: number;
  totalInterest: number;
  yearlyInterest: number;
  accumulatedTotal: number;
}

export const CompoundInterestCalculator: React.FC<CompoundInterestCalculatorProps> = ({
  currentPortfolioValue = 0,
}) => {
  // User Inputs
  const [initialDepositStr, setInitialDepositStr] = useState<string>(() => {
    return currentPortfolioValue > 0
      ? currentPortfolioValue.toFixed(2).replace('.', ',')
      : '0,00';
  });
  const [monthlyContributionStr, setMonthlyContributionStr] = useState<string>('500,00');
  const [interestRateStr, setInterestRateStr] = useState<string>('10,50');
  const [ratePeriod, setRatePeriod] = useState<'yearly' | 'monthly'>('yearly');
  const [timePeriod, setTimePeriod] = useState<number>(10);
  const [timeUnit, setTimeUnit] = useState<'years' | 'months'>('years');
  const [showEvolutionTable, setShowEvolutionTable] = useState<boolean>(false);

  // Helper to parse localized Brazilian float input
  const parseNum = (val: string): number => {
    if (!val) return 0;
    const clean = val.replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
    return parseFloat(clean) || 0;
  };

  const initialDeposit = parseNum(initialDepositStr);
  const monthlyContribution = parseNum(monthlyContributionStr);
  const inputRate = parseNum(interestRateStr);

  // Convert given rate to effective monthly interest rate
  const monthlyRate = useMemo(() => {
    if (inputRate <= 0) return 0;
    if (ratePeriod === 'monthly') {
      return inputRate / 100;
    }
    // (1 + i_ano) = (1 + i_mes)^12  =>  i_mes = (1 + i_ano)^(1/12) - 1
    return Math.pow(1 + inputRate / 100, 1 / 12) - 1;
  }, [inputRate, ratePeriod]);

  // Total months of simulation
  const totalMonths = useMemo(() => {
    if (timeUnit === 'years') {
      return Math.max(1, Math.min(600, timePeriod * 12)); // Cap at 50 years
    }
    return Math.max(1, Math.min(600, timePeriod));
  }, [timePeriod, timeUnit]);

  // Simulation calculation
  const { timeline, finalTotal, totalInvested, totalInterest, monthlyPassiveIncome } = useMemo(() => {
    const points: YearlyPoint[] = [];
    let currentBalance = initialDeposit;
    let totalDeposited = initialDeposit;
    let previousYearBalance = initialDeposit;

    // Month 0
    points.push({
      year: 0,
      month: 0,
      investedCapital: initialDeposit,
      totalInterest: 0,
      yearlyInterest: 0,
      accumulatedTotal: initialDeposit,
    });

    for (let m = 1; m <= totalMonths; m++) {
      // Interest earned in this month
      const interestEarned = currentBalance * monthlyRate;
      currentBalance += interestEarned + monthlyContribution;
      totalDeposited += monthlyContribution;

      // Record annual milestones or the very last month
      if (m % 12 === 0 || m === totalMonths) {
        const yearNumber = Math.ceil(m / 12);
        const yearlyInterest = currentBalance - previousYearBalance - monthlyContribution * (m % 12 === 0 ? 12 : m % 12);
        previousYearBalance = currentBalance;

        points.push({
          year: yearNumber,
          month: m,
          investedCapital: totalDeposited,
          totalInterest: Math.max(0, currentBalance - totalDeposited),
          yearlyInterest: Math.max(0, yearlyInterest),
          accumulatedTotal: currentBalance,
        });
      }
    }

    const calculatedTotal = currentBalance;
    const calculatedInvested = totalDeposited;
    const calculatedInterest = Math.max(0, calculatedTotal - calculatedInvested);
    // Potential passive monthly income using the same monthly rate
    const estimatedPassiveMonthly = calculatedTotal * monthlyRate;

    return {
      timeline: points,
      finalTotal: calculatedTotal,
      totalInvested: calculatedInvested,
      totalInterest: calculatedInterest,
      monthlyPassiveIncome: estimatedPassiveMonthly,
    };
  }, [initialDeposit, monthlyContribution, monthlyRate, totalMonths]);

  // Rate presets
  const handleApplyPreset = (rate: number, period: 'yearly' | 'monthly') => {
    setInterestRateStr(rate.toString().replace('.', ','));
    setRatePeriod(period);
  };

  const investedPercent = finalTotal > 0 ? (totalInvested / finalTotal) * 100 : 100;
  const interestPercent = finalTotal > 0 ? (totalInterest / finalTotal) * 100 : 0;

  // Max value for SVG chart scaling
  const maxAccumulated = Math.max(...timeline.map(p => p.accumulatedTotal), 1);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Simulador de Juros Compostos
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Projeção Patrimonial
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Projete a força do efeito bola de neve a partir de aportes e rentabilidade estimada
            </p>
          </div>
        </div>

        {currentPortfolioValue > 0 && (
          <button
            type="button"
            onClick={() => setInitialDepositStr(currentPortfolioValue.toFixed(2).replace('.', ','))}
            className="text-xs text-emerald-400 hover:text-emerald-300 bg-slate-950 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            title="Importar o patrimônio atual dos seus investimentos cadastrados"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Usar Carteira Atual ({formatCurrency(currentPortfolioValue)})</span>
          </button>
        )}
      </div>

      {/* Grid of Inputs & Parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Input 1: Aporte Inicial */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 space-y-2">
          <label className="block text-[11px] font-semibold text-slate-300">
            Aporte Inicial (R$)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-xs font-mono text-slate-500">R$</span>
            <input
              type="text"
              value={initialDepositStr}
              onChange={e => setInitialDepositStr(e.target.value)}
              placeholder="0,00"
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex items-center gap-1 pt-0.5">
            {[1000, 5000, 10000].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setInitialDepositStr(val.toString().replace('.', ','))}
                className="text-[10px] px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded border border-slate-800 transition-colors"
              >
                +{val >= 1000 ? `${val / 1000}k` : val}
              </button>
            ))}
          </div>
        </div>

        {/* Input 2: Aporte Mensal */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 space-y-2">
          <label className="block text-[11px] font-semibold text-slate-300">
            Aporte Mensal Recorrente (R$)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-xs font-mono text-slate-500">R$</span>
            <input
              type="text"
              value={monthlyContributionStr}
              onChange={e => setMonthlyContributionStr(e.target.value)}
              placeholder="0,00"
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex items-center gap-1 pt-0.5">
            {[0, 300, 500, 1000].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setMonthlyContributionStr(val.toString().replace('.', ','))}
                className="text-[10px] px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded border border-slate-800 transition-colors"
              >
                {val === 0 ? 'Sem aporte' : `R$ ${val}`}
              </button>
            ))}
          </div>
        </div>

        {/* Input 3: Taxa de Juros */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-slate-300">
              Taxa de Rentabilidade
            </label>
            <div className="flex items-center text-[10px] bg-slate-900 p-0.5 rounded border border-slate-800">
              <button
                type="button"
                onClick={() => setRatePeriod('yearly')}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  ratePeriod === 'yearly' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'
                }`}
              >
                % a.a.
              </button>
              <button
                type="button"
                onClick={() => setRatePeriod('monthly')}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  ratePeriod === 'monthly' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'
                }`}
              >
                % a.m.
              </button>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              value={interestRateStr}
              onChange={e => setInterestRateStr(e.target.value)}
              placeholder="10,00"
              className="w-full pl-3 pr-8 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
            />
            <span className="absolute right-3 top-2 text-xs font-mono text-slate-500">%</span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pt-0.5">
            <button
              type="button"
              onClick={() => handleApplyPreset(10.65, 'yearly')}
              className="text-[9px] px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded border border-slate-800 whitespace-nowrap"
              title="100% do CDI (10.65% a.a.)"
            >
              100% CDI
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(12.78, 'yearly')}
              className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30 whitespace-nowrap font-medium"
              title="120% do CDI (12.78% a.a.)"
            >
              120% CDI
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(14.91, 'yearly')}
              className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30 whitespace-nowrap font-medium"
              title="140% do CDI (14.91% a.a.)"
            >
              140% CDI
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(12.0, 'yearly')}
              className="text-[9px] px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded border border-slate-800 whitespace-nowrap"
              title="Ações/Fundos"
            >
              Bolsa (12%)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(0.85, 'monthly')}
              className="text-[9px] px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded border border-slate-800 whitespace-nowrap"
              title="FIIs médio mensal"
            >
              FII (0.85% a.m.)
            </button>
          </div>
        </div>

        {/* Input 4: Prazo Estimado */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-slate-300">
              Prazo de Acúmulo
            </label>
            <div className="flex items-center text-[10px] bg-slate-900 p-0.5 rounded border border-slate-800">
              <button
                type="button"
                onClick={() => setTimeUnit('years')}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  timeUnit === 'years' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'
                }`}
              >
                Anos
              </button>
              <button
                type="button"
                onClick={() => setTimeUnit('months')}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  timeUnit === 'months' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'
                }`}
              >
                Meses
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={timeUnit === 'years' ? 50 : 600}
              value={timePeriod}
              onChange={e => setTimePeriod(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-20 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
            />
            <span className="text-xs text-slate-400">
              {timeUnit === 'years'
                ? timePeriod === 1
                  ? 'ano (12 meses)'
                  : `${timePeriod} anos (${timePeriod * 12} meses)`
                : `${timePeriod} meses`}
            </span>
          </div>

          <div className="flex items-center gap-1 pt-0.5">
            {[1, 5, 10, 20, 30].map(y => (
              <button
                key={y}
                type="button"
                onClick={() => {
                  setTimeUnit('years');
                  setTimePeriod(y);
                }}
                className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                  timeUnit === 'years' && timePeriod === y
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                }`}
              >
                {y}a
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards: Simulation Results */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Acumulado */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 to-slate-950 border border-emerald-500/30">
          <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Valor Final Acumulado
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">
            {formatCurrency(finalTotal)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total bruto ao fim de {totalMonths} meses
          </div>
        </div>

        {/* Card 2: Total Investido (Do seu bolso) */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-sky-400" />
            Total Investido (Aportes)
          </div>
          <div className="text-xl font-bold font-mono text-sky-300 mt-1 tabular-nums">
            {formatCurrency(totalInvested)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Representa {investedPercent.toFixed(1)}% do valor final
          </div>
        </div>

        {/* Card 3: Juros Compostos (Efeito bola de neve) */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <Coins className="w-3.5 h-3.5" />
            Total Ganho em Juros
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
            +{formatCurrency(totalInterest)}
          </div>
          <div className="text-[11px] text-emerald-300/80 mt-1">
            Representa {interestPercent.toFixed(1)}% do valor final
          </div>
        </div>

        {/* Card 4: Renda Passiva Estimada */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Renda Mensal Estimada
          </div>
          <div className="text-xl font-bold font-mono text-amber-300 mt-1 tabular-nums">
            ~{formatCurrency(monthlyPassiveIncome)}/mês
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Potencial saque mensal perpétuo
          </div>
        </div>
      </div>

      {/* Visual Composition Proportion Bar */}
      <div className="space-y-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800/80">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            <span className="text-slate-300 font-medium">Capital Aportado:</span>
            <span className="text-sky-400 font-mono font-bold">
              {formatCurrency(totalInvested)} ({investedPercent.toFixed(1)}%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-slate-300 font-medium">Juros Acumulados:</span>
            <span className="text-emerald-400 font-mono font-bold">
              +{formatCurrency(totalInterest)} ({interestPercent.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Dual Color Progress Bar */}
        <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${Math.max(1, investedPercent)}%` }}
            className="h-full bg-sky-500 transition-all duration-300"
            title={`Capital Próprio: ${formatCurrency(totalInvested)}`}
          />
          <div
            style={{ width: `${Math.max(0, interestPercent)}%` }}
            className="h-full bg-emerald-500 transition-all duration-300"
            title={`Juros Compostos: ${formatCurrency(totalInterest)}`}
          />
        </div>
      </div>

      {/* Visual Evolution Graphic (Bar chart projection) */}
      <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            Curva de Crescimento Patrimonial ao Longo do Tempo
          </span>
          <span className="text-[11px] text-slate-400">
            Escala anual consolidada
          </span>
        </div>

        {/* Responsive Mini Bar Timeline */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-2 pt-4 items-end min-h-[140px]">
          {timeline.slice(1).map((pt, idx, arr) => {
            // Keep sampled bars if there are many years
            const step = Math.max(1, Math.floor(arr.length / 10));
            if (idx % step !== 0 && idx !== arr.length - 1) return null;

            const heightPercent = Math.min(100, Math.max(8, (pt.accumulatedTotal / maxAccumulated) * 100));
            const investedRatio = pt.accumulatedTotal > 0 ? (pt.investedCapital / pt.accumulatedTotal) * 100 : 100;
            const interestRatio = 100 - investedRatio;

            return (
              <div key={pt.year} className="flex flex-col items-center gap-1.5 group">
                <div className="text-[9px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity truncate max-w-full">
                  {formatCurrency(pt.accumulatedTotal)}
                </div>

                {/* Stacked Vertical Bar */}
                <div
                  style={{ height: `${heightPercent}px` }}
                  className="w-full max-w-[28px] rounded-t-sm flex flex-col justify-end overflow-hidden bg-slate-800 transition-all group-hover:brightness-125"
                  title={`Ano ${pt.year}: Total ${formatCurrency(pt.accumulatedTotal)} (Aportado: ${formatCurrency(pt.investedCapital)} | Juros: ${formatCurrency(pt.totalInterest)})`}
                >
                  <div
                    style={{ height: `${interestRatio}%` }}
                    className="w-full bg-emerald-500"
                  />
                  <div
                    style={{ height: `${investedRatio}%` }}
                    className="w-full bg-sky-500"
                  />
                </div>

                <span className="text-[10px] font-mono text-slate-400">
                  Ano {pt.year}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Toggle Evolution Table */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowEvolutionTable(!showEvolutionTable)}
          className="w-full py-2 px-3 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-xs text-slate-300 font-semibold flex items-center justify-between transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            Ver Tabela Detalhada Ano a Ano ({timeline.length - 1} marcos)
          </span>
          {showEvolutionTable ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showEvolutionTable && (
          <div className="mt-3 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm animate-in fade-in duration-150">
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900 text-slate-400 sticky top-0">
                    <th className="py-2.5 px-3 font-medium">Ano / Período</th>
                    <th className="py-2.5 px-3 font-medium text-right">Total Aportado</th>
                    <th className="py-2.5 px-3 font-medium text-right">Juros no Ano</th>
                    <th className="py-2.5 px-3 font-medium text-right">Juros Acumulados</th>
                    <th className="py-2.5 px-3 font-medium text-right">Saldo Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {timeline.slice(1).map(pt => (
                    <tr key={pt.year} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-2 px-3 text-slate-300 font-sans font-medium">
                        Ano {pt.year} <span className="text-[10px] text-slate-500 font-mono">({pt.month} meses)</span>
                      </td>
                      <td className="py-2 px-3 text-right text-sky-400 tabular-nums">
                        {formatCurrency(pt.investedCapital)}
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-400/90 tabular-nums">
                        +{formatCurrency(pt.yearlyInterest)}
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-400 font-bold tabular-nums">
                        +{formatCurrency(pt.totalInterest)}
                      </td>
                      <td className="py-2 px-3 text-right text-white font-bold tabular-nums">
                        {formatCurrency(pt.accumulatedTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
