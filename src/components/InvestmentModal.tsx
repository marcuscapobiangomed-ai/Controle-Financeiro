import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  TrendingUp,
  Percent,
  Calendar,
  Sparkles,
  Info,
  Clock,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { InvestmentAsset, AssetClass } from '../types/finance';
import { useFinance } from '../context/FinanceContext';
import {
  CURRENT_CDI_ANNUAL_DEFAULT,
  calculateCdiAccruedValue,
} from '../utils/cdiCalculations';
import { formatCurrency, formatPercent } from '../utils/formatters';

interface InvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetToEdit?: InvestmentAsset | null;
}

const ASSET_CLASSES: { id: AssetClass; label: string }[] = [
  { id: 'renda_fixa', label: 'Renda Fixa (CDB, LCI/LCA, Tesouro Direto)' },
  { id: 'reserva_emergencia', label: 'Reserva de Emergência / Liquidez Diária' },
  { id: 'acoes_br', label: 'Ações Brasileiras (B3)' },
  { id: 'fiis', label: 'Fundos Imobiliários (FIIs)' },
  { id: 'internacional', label: 'Internacional (ETFs globais, BDRs)' },
  { id: 'cripto', label: 'Criptoativos (Bitcoin, Ethereum, etc.)' },
];

const CDI_QUICK_PRESETS = [
  { label: '100% CDI', value: 100, desc: 'NuConta, Inter, Selic' },
  { label: '110% CDI', value: 110, desc: 'Sofisa, Promocional' },
  { label: '120% CDI', value: 120, desc: 'PagBank, Mercado Pago, Daycoval' },
  { label: '130% CDI', value: 130, desc: 'Bancos Digitais & Parceiros' },
  { label: '140% CDI', value: 140, desc: 'XP, Genial, Boas-vindas' },
  { label: '150% CDI', value: 150, desc: 'Super CDB Promocional' },
];

export const InvestmentModal: React.FC<InvestmentModalProps> = ({
  isOpen,
  onClose,
  assetToEdit,
}) => {
  const { addInvestment, updateInvestment } = useFinance();

  const [formError, setFormError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [assetClass, setAssetClass] = useState<AssetClass>('renda_fixa');
  const [institution, setInstitution] = useState('Nubank');
  const [quantityStr, setQuantityStr] = useState('1');
  const [averagePriceStr, setAveragePriceStr] = useState('');
  const [currentPriceStr, setCurrentPriceStr] = useState('');
  const [notes, setNotes] = useState('');

  // Fixed Income / CDI specific fields
  const [isFixedIncomeMode, setIsFixedIncomeMode] = useState(true);
  const [benchmarkType, setBenchmarkType] = useState<'cdi' | 'ipca' | 'prefixado' | 'selic' | 'outros'>('cdi');
  const [benchmarkRateStr, setBenchmarkRateStr] = useState('120'); // Ex: 120% do CDI
  const [liquidity, setLiquidity] = useState<'daily' | 'maturity' | 'd_plus_1' | 'd_plus_30' | 'd_plus_90' | 'custom'>('daily');
  const [acquisitionDate, setAcquisitionDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [maturityDate, setMaturityDate] = useState('');
  const [autoCalculateAccrual, setAutoCalculateAccrual] = useState(true);
  const [customCdiRateStr, setCustomCdiRateStr] = useState(CURRENT_CDI_ANNUAL_DEFAULT.toString());

  useEffect(() => {
    if (assetToEdit) {
      setName(assetToEdit.name);
      setTicker(assetToEdit.ticker);
      setAssetClass(assetToEdit.assetClass);
      setInstitution(assetToEdit.institution);
      setQuantityStr(assetToEdit.quantity.toString());
      setAveragePriceStr(assetToEdit.averagePrice.toString());
      setCurrentPriceStr(assetToEdit.currentPrice.toString());
      setNotes(assetToEdit.notes || '');

      const isRf = assetToEdit.assetClass === 'renda_fixa' || assetToEdit.assetClass === 'reserva_emergencia';
      setIsFixedIncomeMode(isRf || !!assetToEdit.benchmarkType);
      setBenchmarkType(assetToEdit.benchmarkType || 'cdi');
      setBenchmarkRateStr(assetToEdit.benchmarkRate !== undefined ? assetToEdit.benchmarkRate.toString() : '120');
      setLiquidity(assetToEdit.liquidity || 'daily');
      setAcquisitionDate(assetToEdit.acquisitionDate || new Date().toISOString().split('T')[0]);
      setMaturityDate(assetToEdit.maturityDate || '');
      setCustomCdiRateStr((assetToEdit.baseCdiRate || CURRENT_CDI_ANNUAL_DEFAULT).toString());
      setAutoCalculateAccrual(false); // Manter valores salvos pelo usuário ao editar
    } else {
      setName('');
      setTicker('');
      setAssetClass('renda_fixa');
      setInstitution('Nubank');
      setQuantityStr('1');
      setAveragePriceStr('');
      setCurrentPriceStr('');
      setNotes('');
      setIsFixedIncomeMode(true);
      setBenchmarkType('cdi');
      setBenchmarkRateStr('120');
      setLiquidity('daily');
      setAcquisitionDate(new Date().toISOString().split('T')[0]);
      setMaturityDate('');
      setAutoCalculateAccrual(true);
      setCustomCdiRateStr(CURRENT_CDI_ANNUAL_DEFAULT.toString());
    }
  }, [assetToEdit, isOpen]);

  // Synchronize isFixedIncomeMode with assetClass
  useEffect(() => {
    if (assetClass === 'renda_fixa' || assetClass === 'reserva_emergencia') {
      setIsFixedIncomeMode(true);
    }
  }, [assetClass]);

  // Helper numbers
  const qty = parseFloat(quantityStr.replace(',', '.')) || 0;
  const avgPrice = parseFloat(averagePriceStr.replace(',', '.')) || 0;
  const principalAmount = qty * avgPrice;
  const bRate = parseFloat(benchmarkRateStr.replace(',', '.')) || 100;
  const cdiAnnual = parseFloat(customCdiRateStr.replace(',', '.')) || CURRENT_CDI_ANNUAL_DEFAULT;

  // Real-time accrual simulation
  const cdiSim = useMemo(() => {
    if (!isFixedIncomeMode || benchmarkType !== 'cdi' || principalAmount <= 0 || !acquisitionDate) {
      return null;
    }
    return calculateCdiAccruedValue({
      principal: principalAmount,
      multiplierPercent: bRate,
      startDateStr: acquisitionDate,
      cdiAnnualPercent: cdiAnnual,
    });
  }, [isFixedIncomeMode, benchmarkType, principalAmount, bRate, acquisitionDate, cdiAnnual]);

  // Automatically update current price if autoCalculateAccrual is enabled
  useEffect(() => {
    if (autoCalculateAccrual && cdiSim && cdiSim.grossAmount > 0 && qty > 0) {
      const estimatedPricePerUnit = cdiSim.grossAmount / qty;
      setCurrentPriceStr(estimatedPricePerUnit.toFixed(2));
    }
  }, [autoCalculateAccrual, cdiSim, qty]);

  // Handle quick CDI preset click
  const handleSelectCdiPreset = (percent: number) => {
    setBenchmarkRateStr(percent.toString());
    setBenchmarkType('cdi');
    if (!name || name.startsWith('CDB ')) {
      setName(`CDB ${percent}% CDI Liquidez Diária`);
    }
    if (!ticker || ticker.startsWith('CDB-')) {
      setTicker(`CDB-${percent}`);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const curPrice = currentPriceStr.trim()
      ? parseFloat(currentPriceStr.replace(',', '.'))
      : avgPrice;

    if (!name.trim()) {
      setFormError('Informe o nome do ativo.');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setFormError('Informe uma quantidade válida.');
      return;
    }
    if (isNaN(avgPrice) || avgPrice < 0) {
      setFormError('Informe o valor aplicado ou preço médio válido.');
      return;
    }

    const payload: Partial<InvestmentAsset> = {
      name: name.trim(),
      ticker: ticker.trim().toUpperCase() || (isFixedIncomeMode ? `CDB-${bRate}` : name.slice(0, 6).toUpperCase()),
      assetClass,
      institution: institution.trim(),
      quantity: qty,
      averagePrice: avgPrice,
      currentPrice: isNaN(curPrice) ? avgPrice : curPrice,
      notes: notes.trim() || undefined,
    };

    if (isFixedIncomeMode) {
      payload.benchmarkType = benchmarkType;
      payload.benchmarkRate = bRate;
      payload.liquidity = liquidity;
      payload.acquisitionDate = acquisitionDate;
      if (maturityDate) payload.maturityDate = maturityDate;
      payload.baseCdiRate = cdiAnnual;
      payload.lastAccrualCalculationDate = new Date().toISOString().split('T')[0];
    }

    if (assetToEdit) {
      updateInvestment({
        ...(payload as InvestmentAsset),
        id: assetToEdit.id,
        updatedAt: new Date().toISOString(),
      });
    } else {
      addInvestment(payload as Omit<InvestmentAsset, 'id' | 'updatedAt'>);
    }

    onClose();
  };

  const handleSetQuickPastDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    setAcquisitionDate(d.toISOString().split('T')[0]);
    setAutoCalculateAccrual(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-semibold text-white">
              {assetToEdit ? 'Editar Ativo de Investimento' : 'Novo Ativo na Carteira'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex items-center justify-between">
              <span>{formError}</span>
              <button
                type="button"
                onClick={() => setFormError(null)}
                className="text-rose-400 hover:text-rose-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Quick CDI Helper Banner if creating new asset */}
          {!assetToEdit && (
            <div className="p-3.5 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-sky-950/40 rounded-xl border border-emerald-500/30">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Atalhos Rápidos: Renda Fixa & Liquidez Diária (% CDI)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  CDI Ref: {CURRENT_CDI_ANNUAL_DEFAULT}% a.a.
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {CDI_QUICK_PRESETS.map(preset => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handleSelectCdiPreset(preset.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                      benchmarkType === 'cdi' && bRate === preset.value
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                        : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-emerald-500/50'
                    }`}
                    title={preset.desc}
                  >
                    <div>{preset.label}</div>
                    <div className="text-[9px] font-normal opacity-75 truncate">{preset.desc.split(' ')[0]}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Asset Class & Institution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Classe do Ativo
              </label>
              <select
                value={assetClass}
                onChange={e => {
                  const val = e.target.value as AssetClass;
                  setAssetClass(val);
                  setIsFixedIncomeMode(val === 'renda_fixa' || val === 'reserva_emergencia');
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {ASSET_CLASSES.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Instituição / Corretora / Banco
              </label>
              <input
                type="text"
                required
                placeholder="ex: Nubank, Inter, XP, BTG, Sofisa, PagBank"
                value={institution}
                onChange={e => setInstitution(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Name & Ticker */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Nome do Investimento
              </label>
              <input
                type="text"
                required
                placeholder="ex: CDB 120% CDI Liquidez Diária, Tesouro Selic, WEG"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Código / Ticker
              </label>
              <input
                type="text"
                placeholder="ex: CDB-120, NUB-100, WEGE3"
                value={ticker}
                onChange={e => setTicker(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono uppercase placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* EXPANDED SECTION: CONFIGURAÇÃO DE RENDA FIXA & CDI */}
          {isFixedIncomeMode && (
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Parâmetros de Rentabilidade & Liquidez
                </span>
                <span className="text-[11px] text-slate-400">
                  Cálculo automático de rendimento pós-fixado
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Indexador / Benchmark */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Indexador (Benchmark)
                  </label>
                  <select
                    value={benchmarkType}
                    onChange={e => setBenchmarkType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="cdi">% do CDI (Pós-fixado)</option>
                    <option value="selic">% da Taxa Selic</option>
                    <option value="ipca">IPCA + Taxa Pré</option>
                    <option value="prefixado">Prefixado (% a.a.)</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>

                {/* Taxa do Indexador (% CDI ou % a.a.) */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    {benchmarkType === 'cdi'
                      ? 'Percentual do CDI (%)'
                      : benchmarkType === 'ipca'
                      ? 'Taxa Adicional IPCA+ (%)'
                      : 'Taxa Contratada (%)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder={benchmarkType === 'cdi' ? '120' : '10.5'}
                      value={benchmarkRateStr}
                      onChange={e => setBenchmarkRateStr(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-3 pr-8 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-mono">
                      {benchmarkType === 'cdi' ? '% CDI' : '%'}
                    </span>
                  </div>
                </div>

                {/* Regra de Liquidez */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Liquidez do Resgate
                  </label>
                  <select
                    value={liquidity}
                    onChange={e => setLiquidity(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="daily">Liquidez Diária (D+0)</option>
                    <option value="d_plus_1">D+1 (1 dia útil)</option>
                    <option value="d_plus_30">D+30 (30 dias)</option>
                    <option value="d_plus_90">D+90 (90 dias)</option>
                    <option value="maturity">Apenas no Vencimento</option>
                  </select>
                </div>
              </div>

              {/* Datas de Aplicação e Vencimento */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    Data do Aporte / Aplicação
                  </label>
                  <input
                    type="date"
                    required
                    value={acquisitionDate}
                    onChange={e => setAcquisitionDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <button
                      type="button"
                      onClick={() => handleSetQuickPastDate(0)}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      Hoje
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuickPastDate(30)}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      -30d
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuickPastDate(60)}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      -60d
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuickPastDate(90)}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      -90d
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuickPastDate(180)}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      -180d
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuickPastDate(365)}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      -1 ano
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Data de Vencimento (Opcional)
                  </label>
                  <input
                    type="date"
                    value={maturityDate}
                    onChange={e => setMaturityDate(e.target.value)}
                    placeholder="Sem vencimento"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    CDI Anual Base (% a.a.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={customCdiRateStr}
                    onChange={e => setCustomCdiRateStr(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    placeholder="10.65"
                  />
                </div>
              </div>

              {/* SIMULAÇÃO EM TEMPO REAL DE CDI */}
              {cdiSim && principalAmount > 0 && (
                <div className="p-3 bg-slate-900/90 rounded-lg border border-emerald-500/20 text-xs space-y-2 mt-2">
                  <div className="flex items-center justify-between text-emerald-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Rentabilidade Estimada ({bRate}% do CDI):
                    </span>
                    <span className="font-mono font-bold">
                      {(cdiSim.effectiveAnnualRate).toFixed(2)}% ao ano
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                    <div className="bg-slate-950/70 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Dias Úteis Decorridos</span>
                      <span className="font-mono text-white font-semibold">
                        {cdiSim.businessDays} dias ({cdiSim.calendarDays} corridos)
                      </span>
                    </div>

                    <div className="bg-slate-950/70 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Rendimento Bruto</span>
                      <span className="font-mono text-emerald-400 font-semibold">
                        +{formatCurrency(cdiSim.grossYield)}
                      </span>
                    </div>

                    <div className="bg-slate-950/70 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">IR Regressivo Estimado</span>
                      <span className="font-mono text-amber-400 font-semibold">
                        {(cdiSim.irRate * 100).toFixed(1)}% (-{formatCurrency(cdiSim.irAmount)})
                      </span>
                    </div>

                    <div className="bg-slate-950/70 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Saldo Líquido Estimado</span>
                      <span className="font-mono text-white font-bold">
                        {formatCurrency(cdiSim.netAmount)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoCalculateAccrual}
                        onChange={e => setAutoCalculateAccrual(e.target.checked)}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-950"
                      />
                      <span>Atualizar cotação atual automaticamente com o rendimento acumulado</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quantity, Average Price & Current Price */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                {isFixedIncomeMode ? 'Cotas ou Quantidade' : 'Quantidade (Cotas/Ações)'}
              </label>
              <input
                type="number"
                step="any"
                min="0.000001"
                required
                placeholder="1"
                value={quantityStr}
                onChange={e => setQuantityStr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                {isFixedIncomeMode ? 'Valor Aportado / Inicial (R$)' : 'Preço Médio (R$)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="1000,00"
                value={averagePriceStr}
                onChange={e => setAveragePriceStr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                {isFixedIncomeMode ? 'Saldo Atual Acumulado (R$)' : 'Cotação Atual (R$)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Igual ao médio"
                value={currentPriceStr}
                onChange={e => {
                  setCurrentPriceStr(e.target.value);
                  setAutoCalculateAccrual(false);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Estimated Totals Preview */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex justify-between items-center text-slate-300">
            <div>
              Total Investido:{' '}
              <span className="font-mono text-white font-semibold">
                R${' '}
                {(
                  (parseFloat(quantityStr.replace(',', '.')) || 0) *
                  (parseFloat(averagePriceStr.replace(',', '.')) || 0)
                ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              Posição Atual:{' '}
              <span className="font-mono text-emerald-400 font-semibold">
                R${' '}
                {(
                  (parseFloat(quantityStr.replace(',', '.')) || 0) *
                  (parseFloat(currentPriceStr.replace(',', '.') || averagePriceStr.replace(',', '.')) || 0)
                ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Observações / Informações Adicionais (Opcional)
            </label>
            <input
              type="text"
              placeholder="ex: Coberto pelo FGC até R$ 250 mil, resgate imediato via app..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm"
            >
              {assetToEdit ? 'Atualizar Ativo' : 'Adicionar Ativo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
