import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Plus,
  DollarSign,
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Coins,
  Calculator,
  Percent,
  Zap,
  ShieldCheck,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { InvestmentAsset, AssetClass } from '../types/finance';
import { CompoundInterestCalculator } from './CompoundInterestCalculator';
import { CdiSimulatorModal } from './CdiSimulatorModal';
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatDate,
  getAssetClassLabel,
  getAssetClassShortLabel,
} from '../utils/formatters';
import {
  calculateCdiAccruedValue,
  CURRENT_CDI_ANNUAL_DEFAULT,
} from '../utils/cdiCalculations';

interface InvestmentsViewProps {
  onOpenNewInvestment: () => void;
  onEditInvestment: (asset: InvestmentAsset) => void;
  onOpenNewDividend: () => void;
}

export const InvestmentsView: React.FC<InvestmentsViewProps> = ({
  onOpenNewInvestment,
  onEditInvestment,
  onOpenNewDividend,
}) => {
  const {
    investments,
    dividends,
    totalInvestedCost,
    totalInvestmentValue,
    totalInvestmentProfit,
    totalInvestmentProfitPercent,
    totalDividendsReceived,
    cdiScheduleInfo,
    deleteInvestment,
    deleteDividend,
    addInvestment,
  } = useFinance();

  const [activeSubtab, setActiveSubtab] = useState<'portfolio' | 'dividends' | 'simulator'>('portfolio');
  const [selectedClass, setSelectedClass] = useState<'all' | AssetClass>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCdiModalOpen, setIsCdiModalOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<InvestmentAsset | null>(null);
  const [dividendToDelete, setDividendToDelete] = useState<{ id: string; ticker: string } | null>(null);

  // Filtered assets
  const filteredAssets = useMemo(() => {
    return investments.filter(inv => {
      if (selectedClass !== 'all' && inv.assetClass !== selectedClass) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesName = inv.name.toLowerCase().includes(q);
        const matchesTicker = inv.ticker.toLowerCase().includes(q);
        const matchesInst = inv.institution.toLowerCase().includes(q);
        const matchesNotes = (inv.notes || '').toLowerCase().includes(q);
        if (!matchesName && !matchesTicker && !matchesInst && !matchesNotes) return false;
      }
      return true;
    });
  }, [investments, selectedClass, searchTerm]);

  // Total in daily liquidity / fixed income
  const fixedIncomeStats = useMemo(() => {
    const rfAssets = investments.filter(
      i => i.assetClass === 'renda_fixa' || i.assetClass === 'reserva_emergencia' || i.benchmarkType === 'cdi'
    );
    const totalCurrent = rfAssets.reduce((sum, i) => sum + i.quantity * i.currentPrice, 0);
    const totalCost = rfAssets.reduce((sum, i) => sum + i.quantity * i.averagePrice, 0);
    const dailyLiquidity = rfAssets
      .filter(i => i.liquidity === 'daily' || i.assetClass === 'reserva_emergencia')
      .reduce((sum, i) => sum + i.quantity * i.currentPrice, 0);

    return {
      count: rfAssets.length,
      totalCurrent,
      totalCost,
      dailyLiquidity,
    };
  }, [investments]);

  const handleDeleteAsset = (asset: InvestmentAsset) => {
    setAssetToDelete(asset);
  };

  const handleDeleteDividend = (id: string, ticker: string) => {
    setDividendToDelete({ id, ticker });
  };

  const handleApplyFromCdiSim = (data: {
    name: string;
    ticker: string;
    institution: string;
    amount: number;
    cdiPercent: number;
    startDate: string;
    maturityDate?: string;
  }) => {
    addInvestment({
      name: data.name,
      ticker: data.ticker,
      assetClass: 'renda_fixa',
      institution: data.institution,
      quantity: 1,
      averagePrice: data.amount,
      currentPrice: data.amount,
      benchmarkType: 'cdi',
      benchmarkRate: data.cdiPercent,
      liquidity: 'daily',
      acquisitionDate: data.startDate,
      maturityDate: data.maturityDate,
      baseCdiRate: CURRENT_CDI_ANNUAL_DEFAULT,
      notes: `Aplicação com liquidez diária a ${data.cdiPercent}% do CDI criada via simulador`,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Carteira de Investimentos</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Acompanhe a rentabilidade dos seus ativos, CDI de liquidez diária e fluxo de dividendos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick CDI Simulator Trigger */}
          <button
            onClick={() => setIsCdiModalOpen(true)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-400 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm hover:border-emerald-400"
            title="Comparar e Simular 100%, 120%, 140% do CDI"
          >
            <Percent className="w-3.5 h-3.5 text-emerald-400" />
            <span>Simulador CDI</span>
          </button>

          <button
            onClick={() => setActiveSubtab('simulator')}
            className={`px-3 py-1.5 border text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeSubtab === 'simulator'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-slate-300'
            }`}
            title="Abrir Simulador de Juros Compostos a longo prazo"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Juros Compostos</span>
          </button>

          <button
            onClick={onOpenNewDividend}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-emerald-400 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <DollarSign className="w-3.5 h-3.5" />
            Lançar Provento
          </button>

          <button
            onClick={onOpenNewInvestment}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Ativo
          </button>
        </div>
      </div>

      {/* 11h B3 Automatic CDI Accrual Status Banner */}
      <div className="p-3.5 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-sky-950/40 rounded-xl border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-white">
                Rendimento dos Investimentos Atualizado Automaticamente
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Diariamente às 11:00 (B3/CETIP)
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Última apuração incorporada: <strong className="text-emerald-300">{cdiScheduleInfo.lastAccrualText}</strong> • Próxima atualização: <strong className="text-sky-300">{cdiScheduleInfo.nextAccrualText}</strong>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 self-end sm:self-center text-[11px] font-mono text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <span>CDI Base: <strong className="text-white">{CURRENT_CDI_ANNUAL_DEFAULT}% a.a.</strong></span>
          <span className="text-slate-600">•</span>
          <span>Dia útil: <strong className="text-emerald-400">+{cdiScheduleInfo.dailyRatePercent.toFixed(4)}%/dia</strong></span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Posição Atual */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Patrimônio Investido</span>
          <div className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">
            {formatCurrency(totalInvestmentValue)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {investments.length} ativos em carteira
          </div>
        </div>

        {/* KPI 2: Reserva e Liquidez Diária */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Liquidez Imediata / Diária</span>
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
            {formatCurrency(fixedIncomeStats.dailyLiquidity)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Disponível para resgate imediato
          </div>
        </div>

        {/* KPI 3: Ganho de Capital */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Rentabilidade Global</span>
          <div
            className={`text-2xl font-bold font-mono mt-1 tabular-nums flex items-baseline gap-1.5 ${
              totalInvestmentProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatPercent(totalInvestmentProfitPercent)}
            <span className="text-xs font-normal text-slate-400">
              ({formatCurrency(totalInvestmentProfit)})
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Variação de cotações e juros
          </div>
        </div>

        {/* KPI 4: Total de Proventos Recebidos */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">Proventos Recebidos</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
            {formatCurrency(totalDividendsReceived)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Dividendos, JCP e FIIs creditados
          </div>
        </div>

      </div>

      {/* Subtab Segmented Control: Ativos vs Proventos vs Simulador */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg w-fit">
        <button
          onClick={() => setActiveSubtab('portfolio')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeSubtab === 'portfolio'
              ? 'bg-slate-800 text-emerald-400 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          Ativos da Carteira ({investments.length})
        </button>
        <button
          onClick={() => setActiveSubtab('dividends')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeSubtab === 'dividends'
              ? 'bg-slate-800 text-emerald-400 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          Histórico de Proventos ({dividends.length})
        </button>
        <button
          onClick={() => setActiveSubtab('simulator')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeSubtab === 'simulator'
              ? 'bg-slate-800 text-emerald-400 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          Simulação de Juros Compostos
        </button>
      </div>

      {/* SUBTAB 1: PORTFOLIO VIEW */}
      {activeSubtab === 'portfolio' && (
        <div className="space-y-4">
          
          {/* Class Filters and Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
            {/* Filter buttons */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedClass('all')}
                className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  selectedClass === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos
              </button>
              {(
                [
                  'renda_fixa',
                  'reserva_emergencia',
                  'acoes_br',
                  'fiis',
                  'internacional',
                  'cripto',
                ] as AssetClass[]
              ).map(cls => (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                    selectedClass === cls
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {getAssetClassShortLabel(cls)}
                </button>
              ))}
            </div>

            {/* Quick search */}
            <input
              type="text"
              placeholder="Filtrar por nome, ticker ou CDI..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="py-1 px-3 bg-slate-950 border border-slate-800 rounded-md text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 sm:w-64"
            />
          </div>

          {/* High Density Assets Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                    <th className="py-3 px-4 font-medium">Ativo / Código</th>
                    <th className="py-3 px-4 font-medium">Indexador & Liquidez</th>
                    <th className="py-3 px-4 font-medium">Custodiante</th>
                    <th className="py-3 px-4 font-medium text-right">Qtd</th>
                    <th className="py-3 px-4 font-medium text-right">Preço Médio</th>
                    <th className="py-3 px-4 font-medium text-right">Cotação Atual</th>
                    <th className="py-3 px-4 font-medium text-right">Total Investido</th>
                    <th className="py-3 px-4 font-medium text-right">Posição Atual</th>
                    <th className="py-3 px-4 font-medium text-right">Rentabilidade</th>
                    <th className="py-3 px-4 font-medium text-center w-16">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="p-3 bg-slate-800/60 rounded-full w-12 h-12 mx-auto flex items-center justify-center text-emerald-400 border border-slate-700">
                            <TrendingUp className="w-6 h-6" />
                          </div>
                          <div className="text-sm font-semibold text-white">
                            {investments.length === 0 ? 'Nenhum investimento cadastrado na carteira' : 'Nenhum ativo encontrado para este filtro'}
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {investments.length === 0
                              ? 'Adicione suas aplicações com liquidez diária (CDB 100%, 120%, 140% do CDI, LCI/LCA), Ações, FIIs ou Cripto para acompanhar seu patrimônio real e rentabilidade.'
                              : 'Tente alterar a classe de ativos ou o termo de busca pesquisado.'}
                          </p>
                          {investments.length === 0 && (
                            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                              <button
                                onClick={onOpenNewInvestment}
                                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Adicionar Investimento
                              </button>
                              <button
                                onClick={() => setIsCdiModalOpen(true)}
                                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                Simular CDB 120%/140% CDI
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map(inv => {
                      let effectiveCurrentPrice = inv.currentPrice;
                      if (inv.benchmarkType === 'cdi' && inv.acquisitionDate && inv.benchmarkRate && inv.averagePrice > 0) {
                        const sim = calculateCdiAccruedValue({
                          principal: inv.quantity * inv.averagePrice,
                          multiplierPercent: inv.benchmarkRate,
                          startDateStr: inv.acquisitionDate,
                          cdiAnnualPercent: inv.baseCdiRate || CURRENT_CDI_ANNUAL_DEFAULT,
                        });
                        if (sim && sim.grossAmount > 0 && inv.quantity > 0) {
                          effectiveCurrentPrice = Math.max(inv.currentPrice, sim.grossAmount / inv.quantity);
                        }
                      }

                      const investedTotal = inv.quantity * inv.averagePrice;
                      const currentTotal = inv.quantity * effectiveCurrentPrice;
                      const profit = currentTotal - investedTotal;
                      const profitPct = investedTotal > 0 ? (profit / investedTotal) * 100 : 0;

                      // CDI badge info
                      const isCdiAsset = inv.benchmarkType === 'cdi' || (inv.notes && inv.notes.includes('CDI'));
                      const cdiRateText = inv.benchmarkRate ? `${inv.benchmarkRate}% CDI` : null;

                      return (
                        <tr
                          key={inv.id}
                          className="hover:bg-slate-800/40 transition-colors group"
                        >
                          {/* Asset Name & Ticker */}
                          <td className="py-3 px-4 font-medium text-slate-200">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-white text-xs">
                                {inv.ticker}
                              </span>
                              <span className="text-slate-300 font-normal">
                                {inv.name}
                              </span>
                            </div>
                            {inv.notes && (
                              <div className="text-[11px] text-slate-400 font-normal truncate max-w-xs">
                                {inv.notes}
                              </div>
                            )}
                          </td>

                          {/* Benchmark / Liquidity */}
                          <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {cdiRateText ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-semibold text-[10px] border border-emerald-500/30">
                                  {cdiRateText}
                                </span>
                              ) : inv.benchmarkType ? (
                                <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono text-[10px]">
                                  {inv.benchmarkType.toUpperCase()}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">
                                  {getAssetClassShortLabel(inv.assetClass)}
                                </span>
                              )}

                              {inv.liquidity === 'daily' && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-medium border border-amber-500/30 flex items-center gap-0.5">
                                  <Zap className="w-2.5 h-2.5" />
                                  Diária
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Institution */}
                          <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                            {inv.institution}
                          </td>

                          {/* Quantity */}
                          <td className="py-3 px-4 text-right font-mono text-slate-300 tabular-nums">
                            {inv.quantity >= 1
                              ? formatNumber(inv.quantity, inv.quantity % 1 === 0 ? 0 : 2)
                              : inv.quantity.toString()}
                          </td>

                          {/* Average Price */}
                          <td className="py-3 px-4 text-right font-mono text-slate-300 tabular-nums">
                            {formatCurrency(inv.averagePrice)}
                          </td>

                          {/* Current Price */}
                          <td className="py-3 px-4 text-right font-mono text-slate-200 tabular-nums font-medium">
                            {formatCurrency(inv.currentPrice)}
                          </td>

                          {/* Total Invested */}
                          <td className="py-3 px-4 text-right font-mono text-slate-400 tabular-nums">
                            {formatCurrency(investedTotal)}
                          </td>

                          {/* Current Total */}
                          <td className="py-3 px-4 text-right font-mono text-white font-bold tabular-nums">
                            {formatCurrency(currentTotal)}
                          </td>

                          {/* Profit */}
                          <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                            <div
                              className={`font-semibold flex items-center justify-end gap-1 ${
                                profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {profit >= 0 ? (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowDownRight className="w-3.5 h-3.5" />
                              )}
                              <span>{formatPercent(profitPct)}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {formatCurrency(profit)}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => onEditInvestment(inv)}
                                title="Editar ativo"
                                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteAsset(inv)}
                                title="Excluir ativo"
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
        </div>
      )}

      {/* SUBTAB 2: DIVIDENDS VIEW */}
      {activeSubtab === 'dividends' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/90 p-4 rounded-xl border border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Extrato de Proventos & Dividendos
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Rendimentos de FIIs, dividendos de ações e cupons de renda fixa creditados
              </p>
            </div>
            <div className="font-mono text-sm font-bold text-emerald-400 tabular-nums">
              Total Acumulado: {formatCurrency(totalDividendsReceived)}
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                    <th className="py-3 px-4 font-medium">Data</th>
                    <th className="py-3 px-4 font-medium">Ativo</th>
                    <th className="py-3 px-4 font-medium">Tipo de Provento</th>
                    <th className="py-3 px-4 font-medium">Observações</th>
                    <th className="py-3 px-4 font-medium text-right">Valor Creditado</th>
                    <th className="py-3 px-4 font-medium text-center w-16">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {dividends.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Nenhum provento registrado ainda. Clique em "Lançar Provento" acima.
                      </td>
                    </tr>
                  ) : (
                    dividends.map(div => {
                      const typeLabel =
                        div.type === 'rendimento_fii'
                          ? 'Rendimento FII (Isento)'
                          : div.type === 'dividendo'
                          ? 'Dividendo de Ações'
                          : div.type === 'jcp'
                          ? 'Juros sobre Capital Próprio'
                          : 'Juros Renda Fixa';

                      return (
                        <tr
                          key={div.id}
                          className="hover:bg-slate-800/40 transition-colors group"
                        >
                          <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                            {formatDate(div.date)}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-400 whitespace-nowrap">
                            {div.assetTicker}
                          </td>
                          <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                            {typeLabel}
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {div.notes || '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 tabular-nums whitespace-nowrap">
                            +{formatCurrency(div.amount)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleDeleteDividend(div.id, div.assetTicker)}
                              title="Excluir lançamento de provento"
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: COMPOUND INTEREST SIMULATOR */}
      {activeSubtab === 'simulator' && (
        <CompoundInterestCalculator currentPortfolioValue={totalInvestmentValue} />
      )}

      {/* MODAL SIMULADOR CDI */}
      <CdiSimulatorModal
        isOpen={isCdiModalOpen}
        onClose={() => setIsCdiModalOpen(false)}
        onApplyToPortfolio={handleApplyFromCdiSim}
      />

      {/* Confirmation Modal: Excluir Ativo */}
      {assetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">
              Remover Ativo da Carteira
            </h3>
            <p className="text-xs text-slate-300">
              Deseja realmente remover o ativo <strong className="text-white">"{assetToDelete.name} ({assetToDelete.ticker})"</strong> da sua carteira de investimentos?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAssetToDelete(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded border border-slate-700 hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteInvestment(assetToDelete.id);
                  setAssetToDelete(null);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded transition-colors"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Excluir Provento */}
      {dividendToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">
              Remover Provento Registrado
            </h3>
            <p className="text-xs text-slate-300">
              Deseja remover o provento registrado de <strong className="text-white">{dividendToDelete.ticker}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDividendToDelete(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded border border-slate-700 hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteDividend(dividendToDelete.id);
                  setDividendToDelete(null);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded transition-colors"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
