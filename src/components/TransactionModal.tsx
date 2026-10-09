import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ArrowDownRight,
  ArrowUpRight,
  Repeat,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
  Check,
} from 'lucide-react';
import {
  Transaction,
  TransactionType,
  RecurrenceInterval,
  IncomeCategory,
  ExpenseCategory,
} from '../types/finance';
import { useFinance } from '../context/FinanceContext';
import {
  formatCurrency,
  formatDate,
  addIntervalToDate,
  getRecurrenceLabel,
} from '../utils/formatters';
import {
  classifyTransactionCategory,
  ClassificationResult,
} from '../utils/aiClassifier';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionToEdit?: Transaction | null;
}

const INCOME_CATEGORIES: IncomeCategory[] = [
  'Salário & Proventos',
  'Freelance & Consultoria',
  'Dividendos & Rendimentos',
  'Venda de Ativos',
  'Reembolsos',
  'Outras Receitas',
];

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Moradia & Contas',
  'Alimentação & Supermercado',
  'Transporte & Combustível',
  'Saúde & Farmácia',
  'Educação & Cursos',
  'Lazer & Restaurantes',
  'Assinaturas & Serviços',
  'Compras & Pessoal',
  'Aporte / Poupança',
  'Outras Despesas',
];

const RECURRENCE_OPTIONS: { id: RecurrenceInterval; label: string; desc: string }[] = [
  { id: 'none', label: 'Única', desc: 'Não se repete' },
  { id: 'weekly', label: 'Semanal', desc: 'A cada 7 dias' },
  { id: 'biweekly', label: 'Quinzenal', desc: 'A cada 14 dias' },
  { id: 'monthly', label: 'Mensal', desc: 'Todo mês' },
  { id: 'quarterly', label: 'Trimestral', desc: 'A cada 3 meses' },
  { id: 'yearly', label: 'Anual', desc: 'A cada ano' },
];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  transactionToEdit,
}) => {
  const { accounts, addTransaction, addTransactions, updateTransaction, transactions } = useFinance();

  const [formError, setFormError] = useState<string | null>(null);
  const [type, setType] = useState<TransactionType>('expense');
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [accountId, setAccountId] = useState<string>('');
  const [status, setStatus] = useState<'settled' | 'pending'>('settled');
  const [notes, setNotes] = useState('');

  // Recurrence configuration
  const [recurrence, setRecurrence] = useState<RecurrenceInterval>('none');
  const [repetitionsCount, setRepetitionsCount] = useState<number>(12);
  const [markFuturePending, setMarkFuturePending] = useState<boolean>(true);
  const [addInstallmentSuffix, setAddInstallmentSuffix] = useState<boolean>(true);
  const [showSchedulePreview, setShowSchedulePreview] = useState<boolean>(false);

  // Edit group behavior
  const [updateGroupOption, setUpdateGroupOption] = useState<'only_this' | 'future_all'>('only_this');

  // AI Gemini Classification state
  const [isClassifying, setIsClassifying] = useState<boolean>(false);
  const [suggestedClassification, setSuggestedClassification] = useState<ClassificationResult | null>(null);
  const [isAiApplied, setIsAiApplied] = useState<boolean>(false);

  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setDescription(transactionToEdit.description);
      setAmountStr(transactionToEdit.amount.toString());
      setDate(transactionToEdit.date);
      setCategory(transactionToEdit.category);
      setAccountId(transactionToEdit.accountId);
      setStatus(transactionToEdit.status);
      setNotes(transactionToEdit.notes || '');
      setRecurrence(transactionToEdit.recurrence || 'none');
      setRepetitionsCount(transactionToEdit.recurrenceTotalCount || 1);
      setUpdateGroupOption('only_this');
      setShowSchedulePreview(false);
      setSuggestedClassification(null);
      setIsAiApplied(false);
    } else {
      setType('expense');
      setDescription('');
      setAmountStr('');
      setDate(new Date().toISOString().split('T')[0]);
      setCategory(EXPENSE_CATEGORIES[0]);
      setAccountId(accounts[0]?.id || '');
      setStatus('settled');
      setNotes('');
      setRecurrence('none');
      setRepetitionsCount(12);
      setMarkFuturePending(true);
      setAddInstallmentSuffix(true);
      setShowSchedulePreview(false);
      setSuggestedClassification(null);
      setIsAiApplied(false);
    }
  }, [transactionToEdit, isOpen, accounts]);

  // AI Category Classifier trigger
  const handleManualClassify = async (textToClassify?: string) => {
    const text = textToClassify !== undefined ? textToClassify : description;
    if (!text || text.trim().length < 2) return;

    setIsClassifying(true);
    try {
      const result = await classifyTransactionCategory(text, type);
      if (result) {
        setSuggestedClassification(result);
        // Automatically apply the suggestion
        if (result.suggestedType && result.suggestedType !== type) {
          setType(result.suggestedType);
        }
        setCategory(result.category);
        setIsAiApplied(true);
      }
    } catch (err) {
      console.warn('Erro ao classificar com Gemini:', err);
    } finally {
      setIsClassifying(false);
    }
  };

  const applySuggestedCategory = (res: ClassificationResult) => {
    if (res.suggestedType && res.suggestedType !== type) {
      setType(res.suggestedType);
    }
    setCategory(res.category);
    setIsAiApplied(true);
  };

  // Automatic debounced Gemini suggestion as user types
  useEffect(() => {
    if (!isOpen || transactionToEdit) return;
    const cleanDesc = description.trim();
    if (cleanDesc.length < 3) {
      setSuggestedClassification(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsClassifying(true);
      try {
        const result = await classifyTransactionCategory(cleanDesc, type);
        if (result) {
          setSuggestedClassification(result);
        }
      } catch (err) {
        console.warn('Falha na sugestão automática:', err);
      } finally {
        setIsClassifying(false);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [description, type, isOpen, transactionToEdit]);

  // Adjust default repetitions when recurrence changes
  const handleRecurrenceChange = (newInterval: RecurrenceInterval) => {
    setRecurrence(newInterval);
    if (newInterval === 'weekly') {
      setRepetitionsCount(prev => (prev === 12 || prev === 1 ? 4 : prev));
    } else if (newInterval === 'biweekly') {
      setRepetitionsCount(prev => (prev === 12 || prev === 1 ? 6 : prev));
    } else if (newInterval === 'monthly') {
      setRepetitionsCount(prev => (prev === 4 || prev === 1 ? 12 : prev));
    } else if (newInterval === 'quarterly') {
      setRepetitionsCount(prev => (prev === 12 || prev === 1 ? 4 : prev));
    } else if (newInterval === 'yearly') {
      setRepetitionsCount(prev => (prev > 5 ? 3 : prev));
    }
  };

  // When type changes, ensure valid category
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'income') {
      setCategory(INCOME_CATEGORIES[0]);
    } else {
      setCategory(EXPENSE_CATEGORIES[0]);
    }
  };

  // Live schedule calculations
  const scheduleDates = useMemo(() => {
    if (recurrence === 'none' || repetitionsCount <= 1 || !date) {
      return [];
    }
    const dates: string[] = [];
    for (let i = 0; i < Math.min(repetitionsCount, 60); i++) {
      dates.push(addIntervalToDate(date, recurrence, i));
    }
    return dates;
  }, [date, recurrence, repetitionsCount]);

  const parsedAmount = parseFloat(amountStr.replace(',', '.')) || 0;
  const totalScheduleAmount = parsedAmount * (recurrence === 'none' ? 1 : repetitionsCount);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Por favor, insira um valor válido maior que zero.');
      return;
    }
    if (!description.trim()) {
      setFormError('Por favor, informe a descrição da transação.');
      return;
    }

    const cleanDescription = description.trim();
    const targetAccountId = accountId || accounts[0]?.id || 'acc_1';

    // EDITING EXISTING TRANSACTION
    if (transactionToEdit) {
      if (
        transactionToEdit.recurrenceGroupId &&
        updateGroupOption === 'future_all'
      ) {
        // Update this and all future transactions in the same group
        const groupTransactions = transactions.filter(
          t => t.recurrenceGroupId === transactionToEdit.recurrenceGroupId
        );

        groupTransactions.forEach(item => {
          if (item.date >= transactionToEdit.date) {
            updateTransaction({
              ...item,
              amount: parsedAmount,
              category,
              accountId: targetAccountId,
              notes: notes.trim() || undefined,
            });
          }
        });
      } else {
        // Update single transaction
        updateTransaction({
          ...transactionToEdit,
          type,
          description: cleanDescription,
          amount: parsedAmount,
          date,
          category,
          accountId: targetAccountId,
          status,
          recurrence,
          notes: notes.trim() || undefined,
        });
      }

      onClose();
      return;
    }

    // CREATING NEW TRANSACTION
    if (recurrence !== 'none' && repetitionsCount > 1) {
      const groupId = `rec_grp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const txList: Omit<Transaction, 'id' | 'createdAt'>[] = [];

      for (let i = 0; i < repetitionsCount; i++) {
        const itemDate = addIntervalToDate(date, recurrence, i);
        // First occurrence respects selected status; future ones are pending if markFuturePending is true
        const itemStatus: 'settled' | 'pending' =
          i === 0 ? status : markFuturePending ? 'pending' : status;

        const itemDesc = addInstallmentSuffix
          ? `${cleanDescription} (${i + 1}/${repetitionsCount})`
          : cleanDescription;

        txList.push({
          type,
          description: itemDesc,
          amount: parsedAmount,
          date: itemDate,
          category,
          accountId: targetAccountId,
          status: itemStatus,
          recurrence,
          recurrenceGroupId: groupId,
          recurrenceIndex: i + 1,
          recurrenceTotalCount: repetitionsCount,
          notes: notes.trim() || undefined,
        });
      }

      addTransactions(txList);
    } else {
      // Single transaction
      addTransaction({
        type,
        description: cleanDescription,
        amount: parsedAmount,
        date,
        category,
        accountId: targetAccountId,
        status,
        recurrence: recurrence === 'none' ? undefined : recurrence,
        notes: notes.trim() || undefined,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-white">
              {transactionToEdit ? 'Editar Transação' : 'Nova Transação'}
            </h2>
            {recurrence !== 'none' && (
              <span className="text-[11px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1 font-medium">
                <Repeat className="w-3 h-3" />
                {getRecurrenceLabel(recurrence)}
              </span>
            )}
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
          
          {/* If editing an existing recurring transaction */}
          {transactionToEdit?.recurrenceGroupId && (
            <div className="p-3 bg-slate-950 border border-emerald-500/30 rounded-lg text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Info className="w-4 h-4 shrink-0" />
                <span>
                  Transação Recorrente{' '}
                  {transactionToEdit.recurrenceIndex && transactionToEdit.recurrenceTotalCount
                    ? `(Ocorrência ${transactionToEdit.recurrenceIndex} de ${transactionToEdit.recurrenceTotalCount})`
                    : ''}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="updateGroup"
                    checked={updateGroupOption === 'only_this'}
                    onChange={() => setUpdateGroupOption('only_this')}
                    className="text-emerald-500 focus:ring-0"
                  />
                  <span>Atualizar apenas este lançamento</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="updateGroup"
                    checked={updateGroupOption === 'future_all'}
                    onChange={() => setUpdateGroupOption('future_all')}
                    className="text-emerald-500 focus:ring-0"
                  />
                  <span>Aplicar a todas as parcelas futuras</span>
                </label>
              </div>
            </div>
          )}

          {/* Type Selector Segmented Control */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Tipo de Operação
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`py-2 px-3 text-xs font-semibold rounded flex items-center justify-center gap-2 transition-colors ${
                  type === 'income'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-300" />
                Entrada (Receita)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`py-2 px-3 text-xs font-semibold rounded flex items-center justify-center gap-2 transition-colors ${
                  type === 'expense'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-rose-300" />
                Saída (Despesa)
              </button>
            </div>
          </div>

          {/* Description & Value */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-400">
                  Descrição
                </label>
                <button
                  type="button"
                  onClick={() => handleManualClassify()}
                  disabled={isClassifying || !description.trim()}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1 disabled:opacity-40 transition-colors cursor-pointer"
                  title="Classificar categoria automaticamente com a IA Gemini"
                >
                  <Sparkles className={`w-3 h-3 ${isClassifying ? 'animate-spin' : ''}`} />
                  <span>{isClassifying ? 'Classificando com IA...' : 'Classificar com IA'}</span>
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="ex: Mensalidade Academia, Aluguel, Internet, Salário"
                value={description}
                onChange={e => {
                  setDescription(e.target.value);
                  setIsAiApplied(false);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Valor {recurrence !== 'none' ? 'por parcela' : ''} (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0,00"
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono tabular-nums placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* AI Category Suggestion Banner */}
          {suggestedClassification && (
            <div className="p-2.5 sm:px-3 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-xs flex items-center justify-between gap-2 transition-all">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1 rounded bg-indigo-500/20 text-indigo-400 shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="truncate text-slate-300">
                  <span>Sugestão da IA: </span>
                  <strong className="text-indigo-300 font-semibold">{suggestedClassification.category}</strong>
                  {suggestedClassification.reasoning && (
                    <span className="text-[11px] text-slate-400 ml-1.5 hidden sm:inline">
                      • {suggestedClassification.reasoning}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {category === suggestedClassification.category ? (
                  <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    <Check className="w-3 h-3" /> Aplicada
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => applySuggestedCategory(suggestedClassification)}
                    className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                  >
                    <span>Aplicar</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Date & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Data do {recurrence !== 'none' ? '1º Lançamento' : 'Lançamento'}
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-400">
                  Categoria
                </label>
                {isAiApplied && (
                  <span className="text-[10px] text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono font-medium">
                    <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                    Sugerido por IA
                  </span>
                )}
              </div>
              <select
                value={category}
                onChange={e => {
                  setCategory(e.target.value);
                  setIsAiApplied(false);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {(type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Account & Initial Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Conta / Instituição
              </label>
              <select
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.institution})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Situação {recurrence !== 'none' ? '(1º lançamento)' : ''}
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as 'settled' | 'pending')}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="settled">Efetivado (Já realizado / Pago)</option>
                <option value="pending">Pendente (A pagar / Agendado)</option>
              </select>
            </div>
          </div>

          {/* RECURRING FEATURE SECTION */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white">
                  Frequência & Recorrência
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Lançamentos repetitivos automáticos
              </span>
            </div>

            {/* Recurrence Intervals Pills */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {RECURRENCE_OPTIONS.map(opt => {
                const isSelected = recurrence === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleRecurrenceChange(opt.id)}
                    className={`py-2 px-2 text-center rounded border transition-all ${
                      isSelected
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-semibold shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs">{opt.label}</div>
                    <div className="text-[9px] opacity-75 truncate">{opt.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* If Recurring Interval is Active, show detailed options */}
            {recurrence !== 'none' && !transactionToEdit && (
              <div className="pt-3 border-t border-slate-800/80 space-y-3">
                
                {/* Repetitions count & Quick Presets */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-300">
                      Número de repetições / ocorrências:
                    </label>
                    <div className="flex items-center gap-1">
                      {[3, 6, 12, 24].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setRepetitionsCount(num)}
                          className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                            repetitionsCount === num
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {num}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={2}
                      max={48}
                      value={repetitionsCount}
                      onChange={e => setRepetitionsCount(parseInt(e.target.value, 10))}
                      className="flex-1 accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <div className="w-16">
                      <input
                        type="number"
                        min={2}
                        max={60}
                        value={repetitionsCount}
                        onChange={e => setRepetitionsCount(Math.max(2, Math.min(60, parseInt(e.target.value, 10) || 2)))}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-center font-mono text-xs text-white font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Flags */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={markFuturePending}
                      onChange={e => setMarkFuturePending(e.target.checked)}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    <span>Lançar repetições futuras como pendentes</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={addInstallmentSuffix}
                      onChange={e => setAddInstallmentSuffix(e.target.checked)}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    <span>Identificar parcela no título (ex: 1/{repetitionsCount})</span>
                  </label>
                </div>

                {/* Live Recurring Preview Box */}
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-200">
                      <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
                      <span>
                        Resumo: <strong>{repetitionsCount} ocorrências</strong> {getRecurrenceLabel(recurrence).toLowerCase()}
                      </span>
                    </div>
                    <div className="font-mono text-emerald-400 font-bold tabular-nums">
                      Total: {formatCurrency(totalScheduleAmount)}
                    </div>
                  </div>

                  {scheduleDates.length > 0 && (
                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span>
                        De <strong>{formatDate(scheduleDates[0])}</strong> até{' '}
                        <strong>{formatDate(scheduleDates[scheduleDates.length - 1])}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSchedulePreview(!showSchedulePreview)}
                        className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-0.5"
                      >
                        {showSchedulePreview ? 'Ocultar datas' : 'Ver cronograma'}
                        {showSchedulePreview ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Expandable schedule dates list */}
                  {showSchedulePreview && (
                    <div className="mt-2 pt-2 border-t border-slate-800 max-h-36 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                      {scheduleDates.map((itemDate, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-0.5 px-1.5 rounded bg-slate-950/60 text-slate-300"
                        >
                          <span>
                            {idx + 1}ª parcela: {formatDate(itemDate)}
                          </span>
                          <span className="text-slate-400">
                            {idx === 0
                              ? status === 'settled'
                                ? 'Efetivado'
                                : 'Pendente'
                              : markFuturePending
                              ? 'Pendente (Previsto)'
                              : status === 'settled'
                              ? 'Efetivado'
                              : 'Pendente'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Observações / Tags (Opcional)
            </label>
            <input
              type="text"
              placeholder="ex: Contrato nº 1234, débito automático, notas adicionais..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <div className="text-xs text-slate-400 font-mono">
              {recurrence !== 'none' && !transactionToEdit ? (
                <span>
                  {repetitionsCount}x {formatCurrency(parsedAmount)} ={' '}
                  <strong className="text-white">{formatCurrency(totalScheduleAmount)}</strong>
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
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
                {transactionToEdit
                  ? 'Salvar Alterações'
                  : recurrence !== 'none' && repetitionsCount > 1
                  ? `Gerar ${repetitionsCount} Lançamentos`
                  : 'Adicionar Transação'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
