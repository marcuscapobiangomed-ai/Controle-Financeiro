import React, { useState } from 'react';
import {
  X,
  TrendingUp,
  Percent,
  Calendar,
  Sparkles,
  Info,
  Building2,
  Clock,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import {
  CURRENT_CDI_ANNUAL_DEFAULT,
  calculateCdiAccruedValue,
} from '../utils/cdiCalculations';
import { formatCurrency, formatPercent } from '../utils/formatters';

interface CdiSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToPortfolio?: (data: {
    name: string;
    ticker: string;
    institution: string;
    amount: number;
    cdiPercent: number;
    startDate: string;
    maturityDate?: string;
  }) => void;
}

export const CdiSimulatorModal: React.FC<CdiSimulatorModalProps> = ({
  isOpen,
  onClose,
  onApplyToPortfolio,
}) => {
  const [amountStr, setAmountStr] = useState('10000,00');
  const [cdiPercent, setCdiPercent] = useState<number>(120);
  const [cdiAnnualRate, setCdiAnnualRate] = useState<number>(CURRENT_CDI_ANNUAL_DEFAULT);
  const [institution, setInstitution] = useState('Nubank');
  const [monthsTerm, setMonthsTerm] = useState<number>(12);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const principal = parseFloat(amountStr.replace(/\./g, '').replace(',', '.')) || 0;

  // Calculate target date based on months
  const start = new Date(startDate);
  const targetDate = new Date(start);
  targetDate.setMonth(targetDate.getMonth() + monthsTerm);
  const targetDateStr = targetDate.toISOString().split('T')[0];

  const simulation = calculateCdiAccruedValue({
    principal,
    multiplierPercent: cdiPercent,
    startDateStr: startDate,
    targetDateStr: targetDateStr,
    cdiAnnualPercent: cdiAnnualRate,
  });

  // Comparison benchmarks
  const simPoupança = (() => {
    // Poupança ~ 6.17% a.a. + TR (~ 6.5% a.a.) isento de IR
    const rateAnnual = 0.065;
    const rateMonthly = Math.pow(1 + rateAnnual, 1 / 12) - 1;
    const finalVal = principal * Math.pow(1 + rateMonthly, monthsTerm);
    const profit = finalVal - principal;
    return { finalVal, profit };
  })();

  const simCdi100 = calculateCdiAccruedValue({
    principal,
    multiplierPercent: 100,
    startDateStr: startDate,
    targetDateStr: targetDateStr,
    cdiAnnualPercent: cdiAnnualRate,
  });

  const handleApply = () => {
    if (onApplyToPortfolio && principal > 0) {
      onApplyToPortfolio({
        name: `CDB ${cdiPercent}% CDI Liquidez Diária`,
        ticker: `CDB-${cdiPercent}`,
        institution,
        amount: principal,
        cdiPercent,
        startDate,
        maturityDate: targetDateStr,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-semibold text-white">
                Simulador de CDB & Liquidez Diária (% do CDI)
              </h2>
              <p className="text-[11px] text-slate-400">
                Compare 100%, 120%, 140% do CDI com a Poupança e veja o rendimento líquido
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Valor do Aporte Inicial (R$)
              </label>
              <input
                type="text"
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Rentabilidade (% do CDI)
              </label>
              <div className="flex items-center gap-1.5">
                {[100, 110, 120, 140].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setCdiPercent(pct)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                      cdiPercent === pct
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Prazo de Investimento
              </label>
              <select
                value={monthsTerm}
                onChange={e => setMonthsTerm(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value={1}>1 Mês (Curto Prazo)</option>
                <option value={3}>3 Meses (Trimestral)</option>
                <option value={6}>6 Meses (Semestral)</option>
                <option value={12}>12 Meses (1 Ano)</option>
                <option value={24}>24 Meses (2 Anos)</option>
                <option value={36}>36 Meses (3 Anos)</option>
              </select>
            </div>
          </div>

          {/* Quick CDI Custom Slider */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Ajuste Fino de Taxa CDI:</span>
              <span className="font-mono text-emerald-400 font-bold">{cdiPercent}% do CDI ({((cdiAnnualRate * cdiPercent) / 100).toFixed(2)}% a.a. bruta)</span>
            </div>
            <input
              type="range"
              min="80"
              max="200"
              step="1"
              value={cdiPercent}
              onChange={e => setCdiPercent(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Simulation Outcome Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: Seu CDB Escolhido */}
            <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-bl">
                {cdiPercent}% CDI
              </div>
              <span className="text-xs text-emerald-300 font-semibold block">
                Valor Líquido Final
              </span>
              <div className="text-xl font-bold font-mono text-white mt-1 tabular-nums">
                {formatCurrency(simulation.netAmount)}
              </div>
              <div className="text-xs text-emerald-400 font-mono mt-1">
                +{formatCurrency(simulation.netYield)} líquido
              </div>
              <div className="text-[10px] text-slate-400 mt-2 border-t border-emerald-500/20 pt-2 space-y-0.5">
                <div>Bruto: {formatCurrency(simulation.grossAmount)}</div>
                <div>IR ({(simulation.irRate * 100).toFixed(1)}%): -{formatCurrency(simulation.irAmount)}</div>
              </div>
            </div>

            {/* Card 2: 100% do CDI (Referência Comum) */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-xs text-slate-400 font-medium block">
                CDB 100% CDI Padrão
              </span>
              <div className="text-xl font-bold font-mono text-slate-200 mt-1 tabular-nums">
                {formatCurrency(simCdi100.netAmount)}
              </div>
              <div className="text-xs text-slate-300 font-mono mt-1">
                +{formatCurrency(simCdi100.netYield)} líquido
              </div>
              <div className="text-[10px] text-slate-400 mt-2 border-t border-slate-800/80 pt-2 space-y-0.5">
                <div>Diferença: {cdiPercent > 100 ? `+${formatCurrency(simulation.netYield - simCdi100.netYield)}` : '0'}</div>
                <div>IR: -{formatCurrency(simCdi100.irAmount)}</div>
              </div>
            </div>

            {/* Card 3: Poupança Antiga */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <span className="text-xs text-slate-400 font-medium block">
                Caderneta de Poupança
              </span>
              <div className="text-xl font-bold font-mono text-slate-300 mt-1 tabular-nums">
                {formatCurrency(simPoupança.finalVal)}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-1">
                +{formatCurrency(simPoupança.profit)} (Isento)
              </div>
              <div className="text-[10px] text-emerald-400 mt-2 border-t border-slate-800/80 pt-2 space-y-0.5 font-medium">
                <div>Vantagem do seu CDB:</div>
                <div>+{formatCurrency(simulation.netYield - simPoupança.profit)} a mais!</div>
              </div>
            </div>
          </div>

          {/* Details & Taxes Explanation */}
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-emerald-400" />
              Regras e Proteção FGC:
            </div>
            <p>
              • Aplicações em CDB contam com a proteção do <strong>Fundo Garantidor de Créditos (FGC)</strong> até R$ 250.000 por CPF e por instituição.
            </p>
            <p>
              • A tabela regressiva de IR aplica {(simulation.irRate * 100).toFixed(1)}% sobre o rendimento bruto ({simulation.calendarDays} dias corridos estimados).
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors"
          >
            Fechar
          </button>

          {onApplyToPortfolio && (
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
            >
              <span>Adicionar este CDB à Minha Carteira</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
