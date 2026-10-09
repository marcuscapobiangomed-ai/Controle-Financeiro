import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  PiggyBank,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  ArrowRight,
  RotateCw,
  Target,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Percent,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatPercent } from '../utils/formatters';

export interface KeyInsight {
  title: string;
  description: string;
  type: 'positive' | 'warning' | 'opportunity';
}

export interface SavingsSuggestion {
  category: string;
  potentialMonthlySavings: number;
  suggestion: string;
  impact: 'Alto' | 'Médio' | 'Baixo';
}

export interface InvestmentReallocation {
  assetClass: string;
  currentPercentage: number;
  targetPercentage: number;
  action: 'Aumentar Aporte' | 'Manter' | 'Reduzir Alocação' | 'Rebalancear';
  rationale: string;
}

export interface FinancialAnalysisResult {
  summary: string;
  healthScore: number;
  healthStatus: 'Excelente' | 'Saudável' | 'Atenção' | 'Crítico';
  keyInsights: KeyInsight[];
  savingsSuggestions: SavingsSuggestion[];
  investmentReallocations: InvestmentReallocation[];
  nextBestAction: string;
  analyzedAt?: string;
}

const STORAGE_KEY_ANALYSIS = 'capital_control_gemini_analysis_v1';

export const AIAdvisorSection: React.FC = () => {
  const {
    totalNetWorth,
    totalCashInAccounts,
    monthlyIncome,
    monthlyExpense,
    monthlySavingsRate,
    categoryExpensesMonth,
    assetClassAllocation,
    transactions,
    accounts,
    goals,
  } = useFinance();

  const [analysis, setAnalysis] = useState<FinancialAnalysisResult | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ANALYSIS);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'savings' | 'investments' | 'insights'>('savings');
  const [isExpanded, setIsExpanded] = useState(true);

  // Save to localStorage whenever analysis updates
  useEffect(() => {
    if (analysis) {
      try {
        localStorage.setItem(STORAGE_KEY_ANALYSIS, JSON.stringify(analysis));
      } catch (err) {
        console.warn('Falha ao salvar análise no localStorage:', err);
      }
    }
  }, [analysis]);

  const handleRunAnalysis = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Prepare financial payload
      const payload = {
        totalNetWorth,
        totalCashInAccounts,
        monthlyIncome,
        monthlyExpense,
        monthlySavingsRate,
        categoryExpenses: categoryExpensesMonth.slice(0, 8),
        assetClassAllocation: assetClassAllocation.map(a => ({
          assetClass: a.assetClass,
          currentValue: a.currentValue,
          investedValue: a.investedValue,
          profit: a.profit,
          percentage: Number(a.percentage.toFixed(1)),
        })),
        recentTransactions: transactions.slice(0, 15).map(t => ({
          type: t.type,
          description: t.description,
          amount: t.amount,
          category: t.category,
          date: t.date,
          recurrence: t.recurrence,
        })),
        accounts: accounts.map(a => ({
          name: a.name,
          institution: a.institution,
          type: a.type,
          initialBalance: a.initialBalance,
        })),
        goals: goals.map(g => ({
          title: g.title,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
        })),
      };

      const response = await fetch('/api/ai/financial-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP ${response.status}`);
      }

      const data: FinancialAnalysisResult = await response.json();
      data.analyzedAt = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      setAnalysis(data);
    } catch (err: any) {
      console.error('Erro na chamada da API Gemini:', err);
      setError(
        err.message || 'Não foi possível processar a análise no momento. Tente novamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (score >= 60) return 'text-sky-400 border-sky-500/40 bg-sky-500/10';
    if (score >= 40) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  };

  const totalEstimatedMonthlySavings = analysis?.savingsSuggestions?.reduce(
    (acc, curr) => acc + (curr.potentialMonthlySavings || 0),
    0
  ) || 0;

  return (
    <div className="rounded-xl bg-slate-900/90 border border-slate-800 shadow-md overflow-hidden transition-all">
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Análise Financeira Inteligente (Gemini AI)
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-medium border border-indigo-500/30">
                IA Ativa
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Diagnóstico de hábitos de consumo, oportunidades de economia e realocação de investimentos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={handleRunAnalysis}
            disabled={isLoading}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-sm shadow-indigo-950 cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Analisando...' : analysis ? 'Atualizar Análise' : 'Gerar Análise com IA'}</span>
          </button>

          {analysis && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-slate-400 hover:text-white rounded bg-slate-800/60 hover:bg-slate-800 transition-colors"
              title={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="m-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* State: No analysis yet */}
      {!analysis && !isLoading && (
        <div className="p-8 text-center space-y-4">
          <div className="max-w-md mx-auto space-y-2">
            <p className="text-sm font-medium text-slate-200">
              Obtenha um diagnóstico completo do seu patrimônio com a inteligência artificial do Gemini
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              O modelo analisará seu fluxo de caixa, proporção de despesas por categoria e diversificação da sua carteira para sugerir onde cortar gastos supérfluos e como balancear seus aportes.
            </p>
          </div>
          <button
            onClick={handleRunAnalysis}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-2 transition-all shadow-md"
          >
            <Sparkles className="w-4 h-4" />
            Executar Diagnóstico Financeiro
          </button>
        </div>
      )}

      {/* State: Loading Skeleton */}
      {isLoading && (
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-800 animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-1/3 bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-slate-800/60 rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="h-24 bg-slate-800/40 rounded-lg animate-pulse" />
            <div className="h-24 bg-slate-800/40 rounded-lg animate-pulse" />
            <div className="h-24 bg-slate-800/40 rounded-lg animate-pulse" />
          </div>
          <div className="text-center text-xs text-indigo-300 font-mono pt-2">
            ✦ O Gemini está processando seu fluxo de caixa e carteira de ativos...
          </div>
        </div>
      )}

      {/* State: Analysis Result Available */}
      {analysis && !isLoading && (
        <div className="p-4 sm:p-5 space-y-5">
          {/* Health Score & Executive Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center">
            {/* Health Score Card */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-4 lg:col-span-1">
              <div
                className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center font-mono shrink-0 shadow-sm ${getScoreColor(
                  analysis.healthScore
                )}`}
              >
                <span className="text-lg font-bold">{analysis.healthScore}</span>
                <span className="text-[9px] uppercase tracking-wider font-sans -mt-1">Pontos</span>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-medium">Saúde Financeira</div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {analysis.healthStatus}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Baseado em Selic e taxa de poupança
                </div>
              </div>
            </div>

            {/* Summary Text Card */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 lg:col-span-3 flex flex-col justify-between">
              <div>
                <div className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Diagnóstico Executivo
                </div>
                <p className="text-xs sm:text-sm text-slate-200 mt-1.5 leading-relaxed">
                  {analysis.summary}
                </p>
              </div>

              {analysis.nextBestAction && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-start gap-2 text-xs">
                  <Target className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-emerald-400">Próximo Passo Recomendado: </span>
                    <span className="text-slate-300">{analysis.nextBestAction}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Expandable detailed tabs */}
          {isExpanded && (
            <div className="space-y-4 pt-1">
              {/* Tab Navigation */}
              <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <button
                  onClick={() => setActiveTab('savings')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                    activeTab === 'savings'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <PiggyBank className="w-3.5 h-3.5" />
                  <span>Oportunidades de Economia</span>
                  {analysis.savingsSuggestions?.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
                      {analysis.savingsSuggestions.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('investments')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                    activeTab === 'investments'
                      ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Realocação de Investimentos</span>
                  {analysis.investmentReallocations?.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-300 text-[10px]">
                      {analysis.investmentReallocations.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('insights')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                    activeTab === 'insights'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>Insights Comportamentais</span>
                </button>
              </div>

              {/* Tab 1: Savings Suggestions */}
              {activeTab === 'savings' && (
                <div className="space-y-3">
                  {totalEstimatedMonthlySavings > 0 && (
                    <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Potencial Total de Economia Mensal Identificado:
                      </span>
                      <span className="font-mono text-emerald-400 font-bold text-sm">
                        + {formatCurrency(totalEstimatedMonthlySavings)} / mês
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {analysis.savingsSuggestions?.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">
                              {item.category}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                item.impact === 'Alto'
                                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                  : item.impact === 'Médio'
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              Impacto {item.impact}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                            {item.suggestion}
                          </p>
                        </div>

                        {item.potentialMonthlySavings > 0 && (
                          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                            <span className="text-slate-400">Economia estimada:</span>
                            <span className="font-mono text-emerald-400 font-bold">
                              {formatCurrency(item.potentialMonthlySavings)} / mês
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 2: Investment Reallocations */}
              {activeTab === 'investments' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {analysis.investmentReallocations?.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">
                              {item.assetClass}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded font-mono ${
                                item.action === 'Aumentar Aporte'
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : item.action === 'Reduzir Alocação'
                                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                  : 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                              }`}
                            >
                              {item.action}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 my-2 text-xs font-mono">
                            <div className="text-slate-400">
                              Atual: <strong className="text-white">{item.currentPercentage}%</strong>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                            <div className="text-slate-400">
                              Alvo Sugerido: <strong className="text-emerald-400">{item.targetPercentage}%</strong>
                            </div>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed mt-1">
                            {item.rationale}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Behavioral Insights */}
              {activeTab === 'insights' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {analysis.keyInsights?.map((insight, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-lg bg-slate-950 border ${
                        insight.type === 'positive'
                          ? 'border-emerald-500/30'
                          : insight.type === 'warning'
                          ? 'border-amber-500/30'
                          : 'border-sky-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold mb-1.5">
                        {insight.type === 'positive' && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        {insight.type === 'warning' && (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        {insight.type === 'opportunity' && (
                          <Lightbulb className="w-3.5 h-3.5 text-sky-400" />
                        )}
                        <span
                          className={
                            insight.type === 'positive'
                              ? 'text-emerald-300'
                              : insight.type === 'warning'
                              ? 'text-amber-300'
                              : 'text-sky-300'
                          }
                        >
                          {insight.title}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {insight.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer info */}
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                <span>
                  ✦ Análise processada pelo modelo Google Gemini com foco em finanças e economia pessoal brasileira.
                </span>
                {analysis.analyzedAt && (
                  <span>Última análise às {analysis.analyzedAt}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
