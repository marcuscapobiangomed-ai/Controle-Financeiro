import React, { useState } from 'react';
import { X, DollarSign } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

interface DividendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DividendModal: React.FC<DividendModalProps> = ({ isOpen, onClose }) => {
  const { investments, addDividend } = useFinance();

  const [assetId, setAssetId] = useState(() => investments[0]?.id || '');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [amountStr, setAmountStr] = useState('');
  const [type, setType] = useState<'rendimento_fii' | 'dividendo' | 'jcp' | 'juros_rf'>('rendimento_fii');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const amountNum = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      setFormError('Informe um valor de provento válido maior que zero.');
      return;
    }

    const selectedAsset = investments.find(i => i.id === assetId);
    const ticker = selectedAsset ? selectedAsset.ticker : 'PROVENTO';

    addDividend({
      assetId: assetId || (investments[0]?.id || 'inv_custom'),
      assetTicker: ticker,
      date,
      amount: amountNum,
      type,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-semibold text-white">
              Lançar Provento / Rendimento
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Ativo Correspondente
            </label>
            <select
              value={assetId}
              onChange={e => setAssetId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {investments.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.ticker} - {inv.name} ({inv.institution})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Data do Pagamento
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Valor Recebido (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0,00"
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Tipo de Rendimento
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="rendimento_fii">Rendimento de FII (Isento de IR)</option>
              <option value="dividendo">Dividendo de Ações (Isento)</option>
              <option value="jcp">Juros sobre Capital Próprio (JCP)</option>
              <option value="juros_rf">Juros Semestrais Renda Fixa</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Observações (ex: valor por cota)
            </label>
            <input
              type="text"
              placeholder="ex: R$ 0,11 por cota"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded border border-slate-800">
            * Este provento será contabilizado nos seus rendimentos e adicionado automaticamente como entrada nas transações do mês.
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded transition-colors shadow-sm"
            >
              Confirmar Provento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
