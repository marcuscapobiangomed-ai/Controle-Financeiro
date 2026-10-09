import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { parseOFX, parseCSV, ParsedStatementTransaction } from '../utils/statementParser';

interface ImportStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportStatementModal: React.FC<ImportStatementModalProps> = ({ isOpen, onClose }) => {
  const { accounts, addTransactions } = useFinance();

  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => accounts[0]?.id || '');
  const [parsedList, setParsedList] = useState<ParsedStatementTransaction[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSuccessCount(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = event => {
      const content = event.target?.result as string;
      if (!content) {
        setErrorMsg('Arquivo vazio ou ilegível.');
        return;
      }

      let parsed: ParsedStatementTransaction[] = [];
      if (file.name.toLowerCase().endsWith('.ofx') || content.includes('<OFX>') || content.includes('<STMTTRN>')) {
        parsed = parseOFX(content);
      } else {
        parsed = parseCSV(content);
      }

      if (parsed.length === 0) {
        setErrorMsg('Não foi possível identificar transações no arquivo. Verifique se é um extrato OFX ou CSV válido.');
      } else {
        setParsedList(parsed);
      }
    };

    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (parsedList.length === 0) return;
    setIsProcessing(true);

    const targetAccount = selectedAccountId || accounts[0]?.id || 'acc_1';

    const txToImport = parsedList.map(item => ({
      type: item.type,
      description: item.description,
      amount: item.amount,
      date: item.date,
      category: item.category,
      accountId: targetAccount,
      status: 'settled' as const,
      notes: item.notes || `Extrato ${fileName}`,
    }));

    await addTransactions(txToImport);

    setSuccessCount(txToImport.length);
    setIsProcessing(false);
    setTimeout(() => {
      onClose();
      setParsedList([]);
      setSuccessCount(null);
      setFileName('');
    }, 1200);
  };

  const totalInflow = parsedList.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalOutflow = parsedList.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-semibold text-white">
                Importar Extrato Bancário Real
              </h2>
              <span className="text-[11px] text-slate-400">
                Suporta extratos bancários .OFX e .CSV (Nubank, Itaú, Bradesco, Inter, Santander, BB, etc.)
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {/* Target Account selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-slate-950 p-3.5 rounded-lg border border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Destinar para qual Conta:
              </label>
              <select
                value={selectedAccountId}
                onChange={e => setSelectedAccountId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.institution})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Selecione o arquivo de extrato:
              </label>
              <input
                type="file"
                accept=".ofx,.csv,.txt"
                onChange={handleFileUpload}
                className="w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800/80 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successCount !== null && (
            <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-800/80 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Sucesso! {successCount} lançamentos foram integrados à sua base de dados.</span>
            </div>
          )}

          {/* Parsed List Preview */}
          {parsedList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
                <span>
                  Lançamentos encontrados: <strong>{parsedList.length}</strong> ({fileName})
                </span>
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span className="text-emerald-400">+{formatCurrency(totalInflow)}</span>
                  <span className="text-rose-400">-{formatCurrency(totalOutflow)}</span>
                </div>
              </div>

              {/* Table preview */}
              <div className="border border-slate-800 rounded-lg max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 sticky top-0 border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="py-2 px-3 font-medium">Data</th>
                      <th className="py-2 px-3 font-medium">Descrição</th>
                      <th className="py-2 px-3 font-medium">Categoria Sugerida</th>
                      <th className="py-2 px-3 font-medium text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {parsedList.slice(0, 30).map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                          {formatDate(t.date)}
                        </td>
                        <td className="py-2 px-3 font-sans text-white truncate max-w-xs">
                          {t.description}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-300">
                          {t.category}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-bold whitespace-nowrap ${
                            t.type === 'income' ? 'text-emerald-400' : 'text-slate-100'
                          }`}
                        >
                          {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedList.length > 30 && (
                <div className="text-[11px] text-slate-400 text-center">
                  Exibindo as primeiras 30 de {parsedList.length} transações que serão importadas.
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded border border-slate-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={parsedList.length === 0 || isProcessing}
              onClick={handleConfirmImport}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              {isProcessing
                ? 'Sincronizando...'
                : `Confirmar e Importar ${parsedList.length > 0 ? `(${parsedList.length})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
