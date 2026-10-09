import React, { useState } from 'react';
import {
  Sparkles,
  Building2,
  CreditCard,
  Wallet,
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  ShieldCheck,
  ArrowRight,
  Info,
  X,
} from 'lucide-react';
import { Account } from '../types/finance';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency } from '../utils/formatters';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BankPreset {
  name: string;
  institution: string;
  defaultType: Account['type'];
  color: string;
  hasCardByDefault?: boolean;
}

const PRESET_BANKS: BankPreset[] = [
  { name: 'Nubank', institution: 'Nubank', defaultType: 'checking', color: '#8A05BE', hasCardByDefault: true },
  { name: 'Itaú', institution: 'Itaú Unibanco', defaultType: 'checking', color: '#EC7000', hasCardByDefault: true },
  { name: 'Bradesco', institution: 'Bradesco', defaultType: 'checking', color: '#CC092F', hasCardByDefault: true },
  { name: 'Banco Inter', institution: 'Banco Inter', defaultType: 'checking', color: '#FF7A00', hasCardByDefault: true },
  { name: 'Santander', institution: 'Santander', defaultType: 'checking', color: '#E60000', hasCardByDefault: true },
  { name: 'Banco do Brasil', institution: 'Banco do Brasil', defaultType: 'checking', color: '#003882', hasCardByDefault: true },
  { name: 'Caixa Econômica', institution: 'Caixa Econômica', defaultType: 'checking', color: '#005CA9', hasCardByDefault: false },
  { name: 'C6 Bank', institution: 'C6 Bank', defaultType: 'checking', color: '#242424', hasCardByDefault: true },
  { name: 'XP Investimentos', institution: 'XP Investimentos', defaultType: 'investment', color: '#000000', hasCardByDefault: true },
  { name: 'BTG Pactual', institution: 'BTG Pactual', defaultType: 'investment', color: '#0D2040', hasCardByDefault: true },
  { name: 'Nomad', institution: 'Nomad', defaultType: 'checking', color: '#E6B022', hasCardByDefault: true },
  { name: 'Mercado Pago', institution: 'Mercado Pago', defaultType: 'checking', color: '#009EE3', hasCardByDefault: true },
  { name: 'Carteira / Dinheiro', institution: 'Dinheiro Físico', defaultType: 'cash', color: '#10b981', hasCardByDefault: false },
];

export interface ConfiguredAccountDraft {
  tempId: string;
  name: string;
  institution: string;
  type: Account['type'];
  color: string;
  balanceStr: string;
  hasCreditCard: boolean;
  creditLimitStr: string;
  currentInvoiceStr: string;
  closingDay: number;
  dueDay: number;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const { setupInitialAccounts, setIsOnboardingDone } = useFinance();

  const [step, setStep] = useState<'welcome' | 'configure' | 'summary'>('welcome');
  const [selectedPresets, setSelectedPresets] = useState<string[]>(['Nubank']);
  const [accountsDraft, setAccountsDraft] = useState<ConfiguredAccountDraft[]>([
    {
      tempId: 'draft_1',
      name: 'Nubank Principal',
      institution: 'Nubank',
      type: 'checking',
      color: '#8A05BE',
      balanceStr: '0,00',
      hasCreditCard: true,
      creditLimitStr: '0,00',
      currentInvoiceStr: '0,00',
      closingDay: 20,
      dueDay: 27,
    },
  ]);

  // State for adding custom unlisted banks in Step 1
  const [customBankName, setCustomBankName] = useState('');
  const [customBankType, setCustomBankType] = useState<Account['type']>('checking');
  const [customBankHasCard, setCustomBankHasCard] = useState(true);
  const [isCustomFormOpen, setIsCustomFormOpen] = useState(false);

  const [stepError, setStepError] = useState<string | null>(null);
  const [clearMocksOption, setClearMocksOption] = useState(true);
  const [createInvoiceTxOption, setCreateInvoiceTxOption] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  // Toggle bank preset selection in step 1
  const togglePreset = (preset: BankPreset) => {
    setStepError(null);
    const isSelected = selectedPresets.includes(preset.name);
    if (isSelected) {
      if (accountsDraft.length <= 1) {
        setStepError('Mantenha pelo menos um banco ou conta selecionada para continuar.');
        return;
      }
      setSelectedPresets(prev => prev.filter(p => p !== preset.name));
      setAccountsDraft(prev => prev.filter(a => a.institution !== preset.institution && a.name !== preset.name));
    } else {
      setSelectedPresets(prev => [...prev, preset.name]);
      const newDraft: ConfiguredAccountDraft = {
        tempId: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        name: `${preset.name} Principal`,
        institution: preset.institution,
        type: preset.defaultType,
        color: preset.color,
        balanceStr: '0,00',
        hasCreditCard: !!preset.hasCardByDefault,
        creditLimitStr: preset.hasCardByDefault ? '3000,00' : '0,00',
        currentInvoiceStr: '0,00',
        closingDay: 20,
        dueDay: 27,
      };
      setAccountsDraft(prev => [...prev, newDraft]);
    }
  };

  // Add custom bank with name provided by user
  const handleConfirmAddCustom = () => {
    setStepError(null);
    if (!customBankName.trim()) {
      setStepError('Digite o nome do seu banco ou instituição (ex: Sicoob, Sicredi, Safra, Sofisa...).');
      return;
    }

    const bankName = customBankName.trim();
    const tempId = `draft_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    const newDraft: ConfiguredAccountDraft = {
      tempId,
      name: `${bankName} Principal`,
      institution: bankName,
      type: customBankType,
      color: '#0ea5e9',
      balanceStr: '0,00',
      hasCreditCard: customBankHasCard || customBankType === 'credit_card',
      creditLimitStr: customBankHasCard || customBankType === 'credit_card' ? '3000,00' : '0,00',
      currentInvoiceStr: '0,00',
      closingDay: 15,
      dueDay: 22,
    };

    setAccountsDraft(prev => [...prev, newDraft]);
    setSelectedPresets(prev => [...prev, bankName]);
    setCustomBankName('');
    setIsCustomFormOpen(false);
  };

  // Add another account in step 2
  const handleAddDraftInStep2 = () => {
    setStepError(null);
    const tempId = `draft_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    const newDraft: ConfiguredAccountDraft = {
      tempId,
      name: 'Minha Conta',
      institution: 'Novo Banco / Instituição',
      type: 'checking',
      color: '#0ea5e9',
      balanceStr: '0,00',
      hasCreditCard: false,
      creditLimitStr: '0,00',
      currentInvoiceStr: '0,00',
      closingDay: 15,
      dueDay: 22,
    };
    setAccountsDraft(prev => [...prev, newDraft]);
  };

  const handleRemoveDraft = (tempId: string) => {
    setStepError(null);
    if (accountsDraft.length <= 1) {
      setStepError('Mantenha pelo menos uma conta configurada.');
      return;
    }
    const target = accountsDraft.find(a => a.tempId === tempId);
    if (target) {
      setSelectedPresets(prev => prev.filter(p => p !== target.institution && p !== target.name));
    }
    setAccountsDraft(prev => prev.filter(a => a.tempId !== tempId));
  };

  const updateDraft = (tempId: string, updates: Partial<ConfiguredAccountDraft>) => {
    setAccountsDraft(prev => prev.map(a => (a.tempId === tempId ? { ...a, ...updates } : a)));
  };

  // Parse draft numbers
  const parseCurrency = (val: string) => {
    if (!val) return 0;
    const clean = val.replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
    return parseFloat(clean) || 0;
  };

  // Metrics computation for preview
  const totalBalances = accountsDraft.reduce((sum, a) => sum + parseCurrency(a.balanceStr), 0);
  const totalInvoices = accountsDraft.reduce((sum, a) => {
    if (a.type === 'credit_card' || a.hasCreditCard) {
      return sum + parseCurrency(a.currentInvoiceStr);
    }
    return sum;
  }, 0);
  const totalLimits = accountsDraft.reduce((sum, a) => {
    if (a.type === 'credit_card' || a.hasCreditCard) {
      return sum + parseCurrency(a.creditLimitStr);
    }
    return sum;
  }, 0);
  const initialNetWorth = totalBalances - totalInvoices;

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      const finalAccounts: Omit<Account, 'id'>[] = accountsDraft.map(draft => {
        const balance = parseCurrency(draft.balanceStr);
        const limit = parseCurrency(draft.creditLimitStr);
        const invoice = parseCurrency(draft.currentInvoiceStr);

        return {
          name: draft.name.trim() || 'Conta Principal',
          institution: draft.institution.trim() || 'Banco',
          type: draft.type,
          initialBalance: balance,
          color: draft.color || '#10b981',
          creditLimit: draft.hasCreditCard || draft.type === 'credit_card' ? limit : undefined,
          currentInvoice: draft.hasCreditCard || draft.type === 'credit_card' ? invoice : undefined,
          closingDay: draft.hasCreditCard || draft.type === 'credit_card' ? draft.closingDay : undefined,
          dueDay: draft.hasCreditCard || draft.type === 'credit_card' ? draft.dueDay : undefined,
        };
      });

      await setupInitialAccounts(finalAccounts, {
        clearMocks: clearMocksOption,
        createInvoiceTransactions: createInvoiceTxOption,
      });

      setIsOnboardingDone(true);
      onClose();
    } catch (err) {
      console.error('Falha ao concluir configuração inicial:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    setIsOnboardingDone(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with Progress Steps */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Assistente de Primeiro Uso · CapitalControl
              </h2>
              <p className="text-[11px] text-slate-400">
                Configure seus bancos, saldos, faturas e limites em poucos passos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Step Pills */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium">
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] ${
                  step === 'welcome'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                    : 'text-slate-400'
                }`}
              >
                1. Instituições
              </span>
              <span className="text-slate-600">→</span>
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] ${
                  step === 'configure'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                    : 'text-slate-400'
                }`}
              >
                2. Saldos & Faturas
              </span>
              <span className="text-slate-600">→</span>
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] ${
                  step === 'summary'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                    : 'text-slate-400'
                }`}
              >
                3. Conclusão
              </span>
            </div>

            <button
              onClick={handleSkip}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Pular assistente por enquanto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {stepError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between animate-in fade-in duration-150">
              <span>{stepError}</span>
              <button
                type="button"
                onClick={() => setStepError(null)}
                className="text-rose-400 hover:text-white text-xs font-bold"
              >
                ×
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: WELCOME & SELECT INSTITUTIONS */}
          {/* ========================================================================= */}
          {step === 'welcome' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="text-center max-w-xl mx-auto space-y-2 py-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Building2 className="w-3.5 h-3.5" /> Bem-vindo(a) ao seu novo centro financeiro
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Quais bancos e instituições você utiliza no seu dia a dia?
                </h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  Clique para marcar suas instituições ou adicione seus bancos não listados. No próximo passo você informará os saldos e faturas.
                </p>
              </div>

              {/* Grid of Bank Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-2">
                {PRESET_BANKS.map(preset => {
                  const isSelected = selectedPresets.includes(preset.name);
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => togglePreset(preset)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer relative group ${
                        isSelected
                          ? 'bg-slate-800/90 border-emerald-500/60 shadow-sm shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div
                          style={{ backgroundColor: preset.color }}
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                        />
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors">
                          {preset.name}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {preset.hasCardByDefault ? 'Conta & Cartão' : 'Conta / Reserva'}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* Render any Custom Unlisted Banks added by user */}
                {accountsDraft
                  .filter(
                    a =>
                      !PRESET_BANKS.some(
                        p => p.name === a.institution || p.institution === a.institution
                      )
                  )
                  .map(custom => (
                    <div
                      key={custom.tempId}
                      className="p-3 rounded-xl border bg-slate-800/90 border-sky-500/60 shadow-sm flex flex-col justify-between relative group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div
                          style={{ backgroundColor: custom.color }}
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveDraft(custom.tempId)}
                          title="Remover este banco"
                          className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white truncate">
                          {custom.institution}
                        </div>
                        <div className="text-[10px] text-sky-400 mt-0.5 flex items-center gap-1">
                          <span>Personalizado</span>
                          <span>•</span>
                          <span>{custom.hasCreditCard ? 'C/ Cartão' : 'Conta'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Custom Bank Addition Section */}
              {!isCustomFormOpen ? (
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800/80">
                  <span className="text-xs text-slate-400">
                    {accountsDraft.length}{' '}
                    {accountsDraft.length === 1
                      ? 'instituição selecionada'
                      : 'instituições selecionadas'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomFormOpen(true);
                      setStepError(null);
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Outro Banco Não Listado (ex: Sicoob, Sicredi, Safra...)
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      Cadastrar Banco ou Instituição Não Listada
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCustomFormOpen(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Nome da Instituição ou Banco
                      </label>
                      <input
                        type="text"
                        value={customBankName}
                        onChange={e => setCustomBankName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleConfirmAddCustom();
                          }
                        }}
                        placeholder="ex: Sicoob, Sicredi, Safra, Sofisa, PagBank, Will Bank..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Tipo de Conta
                      </label>
                      <select
                        value={customBankType}
                        onChange={e => setCustomBankType(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="checking">Conta Corrente</option>
                        <option value="savings">Poupança / Reserva</option>
                        <option value="investment">Investimento</option>
                        <option value="credit_card">Cartão de Crédito</option>
                        <option value="cash">Dinheiro Físico</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                    <label className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={customBankHasCard}
                        onChange={e => setCustomBankHasCard(e.target.checked)}
                        className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                      />
                      <span>Possuo cartão de crédito neste banco</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleConfirmAddCustom}
                      className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-sm self-end sm:self-auto cursor-pointer"
                    >
                      Adicionar à Minha Lista
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: CONFIGURE BALANCES, INVOICES, LIMITS & DUE DATES */}
          {/* ========================================================================= */}
          {step === 'configure' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    2. Informe os Saldos, Faturas e Vencimentos
                  </h3>
                  <p className="text-xs text-slate-400">
                    Edite os nomes dos bancos, informe os saldos atuais e configure faturas e limites
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddDraftInStep2}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-700 self-start sm:self-auto cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  Adicionar Outro Banco
                </button>
              </div>

              {/* Draft List */}
              <div className="space-y-4">
                {accountsDraft.map((acc, index) => {
                  return (
                    <div
                      key={acc.tempId}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 shadow-sm space-y-3.5 transition-all"
                    >
                      {/* Top Bar of Draft Card */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            style={{ backgroundColor: acc.color }}
                            className="w-3 h-3 rounded-full shrink-0"
                          />
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            Banco / Conta #{index + 1}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDraft(acc.tempId)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                          title="Remover esta conta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Row 1: Institution Name, Account Nickname & Type */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-400 mb-1">
                            Nome da Instituição / Banco
                          </label>
                          <input
                            type="text"
                            value={acc.institution}
                            onChange={e => updateDraft(acc.tempId, { institution: e.target.value })}
                            placeholder="ex: Nubank, Sicoob, Sicredi, Safra..."
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-400 mb-1">
                            Apelido / Nome da Conta
                          </label>
                          <input
                            type="text"
                            value={acc.name}
                            onChange={e => updateDraft(acc.tempId, { name: e.target.value })}
                            placeholder="ex: Conta Principal, Salário..."
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-400 mb-1">
                            Tipo de Conta
                          </label>
                          <select
                            value={acc.type}
                            onChange={e => {
                              const newType = e.target.value as Account['type'];
                              updateDraft(acc.tempId, {
                                type: newType,
                                hasCreditCard: newType === 'credit_card' ? true : acc.hasCreditCard,
                              });
                            }}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                          >
                            <option value="checking">Conta Corrente</option>
                            <option value="savings">Poupança / Reserva</option>
                            <option value="investment">Conta Investimentos</option>
                            <option value="credit_card">Cartão de Crédito</option>
                            <option value="cash">Dinheiro Físico / Carteira</option>
                          </select>
                        </div>
                      </div>

                      {/* Row 2: Account Balance */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                        <div>
                          <label className="block text-[11px] font-medium text-emerald-400 mb-1">
                            Saldo Atual Disponível em Conta (R$)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1.5 text-xs text-slate-500 font-mono">R$</span>
                            <input
                              type="text"
                              value={acc.balanceStr}
                              onChange={e => updateDraft(acc.tempId, { balanceStr: e.target.value })}
                              placeholder="0,00"
                              className="w-full pl-8 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>

                        {/* Credit card toggle if checking/savings */}
                        {acc.type !== 'credit_card' && (
                          <div className="pt-4 sm:pt-2 flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`check_card_${acc.tempId}`}
                              checked={acc.hasCreditCard}
                              onChange={e => updateDraft(acc.tempId, { hasCreditCard: e.target.checked })}
                              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                            />
                            <label
                              htmlFor={`check_card_${acc.tempId}`}
                              className="text-xs text-slate-300 cursor-pointer select-none flex items-center gap-1.5"
                            >
                              <CreditCard className="w-3.5 h-3.5 text-sky-400" />
                              <span>Possuo cartão de crédito neste banco</span>
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Row 3: Credit Card Sub-panel (if hasCreditCard or credit_card type) */}
                      {(acc.hasCreditCard || acc.type === 'credit_card') && (
                        <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-2.5 text-xs">
                          <div className="flex items-center gap-1.5 text-sky-400 font-semibold text-[11px]">
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Dados do Cartão de Crédito & Fatura</span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {/* Limite Total */}
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">
                                Limite de Crédito
                              </label>
                              <input
                                type="text"
                                value={acc.creditLimitStr}
                                onChange={e => updateDraft(acc.tempId, { creditLimitStr: e.target.value })}
                                placeholder="R$ 5.000,00"
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                              />
                            </div>

                            {/* Fatura Atual Aberta */}
                            <div>
                              <label className="block text-[10px] text-rose-400 font-medium mb-1">
                                Fatura Atual Aberta
                              </label>
                              <input
                                type="text"
                                value={acc.currentInvoiceStr}
                                onChange={e => updateDraft(acc.tempId, { currentInvoiceStr: e.target.value })}
                                placeholder="R$ 1.200,00"
                                className="w-full bg-slate-950 border border-rose-500/30 rounded px-2 py-1 text-xs text-rose-300 font-mono focus:outline-none focus:border-rose-500"
                              />
                            </div>

                            {/* Dia de Fechamento */}
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">
                                Dia do Fechamento
                              </label>
                              <select
                                value={acc.closingDay}
                                onChange={e => updateDraft(acc.tempId, { closingDay: parseInt(e.target.value, 10) })}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-500"
                              >
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                  <option key={day} value={day}>
                                    Dia {day}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Dia de Vencimento */}
                            <div>
                              <label className="block text-[10px] text-amber-400 font-medium mb-1">
                                Dia do Vencimento
                              </label>
                              <select
                                value={acc.dueDay}
                                onChange={e => updateDraft(acc.tempId, { dueDay: parseInt(e.target.value, 10) })}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-500"
                              >
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                  <option key={day} value={day}>
                                    Dia {day}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Live Consolidated Total Bar */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Total em Saldo/Caixa</span>
                  <strong className="text-emerald-400 font-mono font-bold text-sm">
                    {formatCurrency(totalBalances)}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Faturas Abertas</span>
                  <strong className="text-rose-400 font-mono font-bold text-sm">
                    {formatCurrency(totalInvoices)}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Limite Total Aprovado</span>
                  <strong className="text-sky-400 font-mono font-bold text-sm">
                    {formatCurrency(totalLimits)}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Saldo Líquido Inicial</span>
                  <strong
                    className={`font-mono font-bold text-sm ${
                      initialNetWorth >= 0 ? 'text-white' : 'text-rose-400'
                    }`}
                  >
                    {formatCurrency(initialNetWorth)}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: SUMMARY & FINAL CONFIRMATION */}
          {/* ========================================================================= */}
          {step === 'summary' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="text-center max-w-lg mx-auto space-y-1.5 py-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" /> Tudo pronto para começar!
                </span>
                <h3 className="text-lg font-bold text-white">
                  Revisão dos Seus Bancos & Carteira Real
                </h3>
                <p className="text-xs text-slate-400">
                  Verifique os dados consolidados antes de gravar sua configuração definitiva
                </p>
              </div>

              {/* Accounts Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {accountsDraft.map(acc => {
                  const bal = parseCurrency(acc.balanceStr);
                  const inv = parseCurrency(acc.currentInvoiceStr);
                  const lim = parseCurrency(acc.creditLimitStr);

                  return (
                    <div
                      key={acc.tempId}
                      className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          style={{ backgroundColor: acc.color }}
                          className="w-2.5 h-8 rounded-sm shrink-0"
                        />
                        <div className="truncate">
                          <div className="font-semibold text-white truncate">{acc.name}</div>
                          <div className="text-[10px] text-slate-400">{acc.institution}</div>
                          {(acc.hasCreditCard || acc.type === 'credit_card') && (
                            <div className="text-[10px] text-sky-400 flex items-center gap-1 mt-0.5">
                              <span>Fatura: {formatCurrency(inv)}</span>
                              <span>•</span>
                              <span>Vence dia {acc.dueDay}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-emerald-400">{formatCurrency(bal)}</div>
                        {(acc.hasCreditCard || acc.type === 'credit_card') && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Limite: {formatCurrency(lim)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Options check */}
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3 text-xs">
                <div className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="opt_clear_mocks"
                    checked={clearMocksOption}
                    onChange={e => setClearMocksOption(e.target.checked)}
                    className="mt-0.5 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="opt_clear_mocks" className="cursor-pointer">
                    <strong className="text-white block font-semibold">
                      Limpar dados de exemplo (mockados) e iniciar 100% com meus dados reais
                    </strong>
                    <span className="text-[11px] text-slate-400">
                      Remove as transações e investimentos demonstrativos para que seu painel mostre apenas seus números verdadeiros.
                    </span>
                  </label>
                </div>

                {totalInvoices > 0 && (
                  <div className="flex items-start gap-2.5 cursor-pointer select-none pt-2 border-t border-slate-900">
                    <input
                      type="checkbox"
                      id="opt_create_invoices"
                      checked={createInvoiceTxOption}
                      onChange={e => setCreateInvoiceTxOption(e.target.checked)}
                      className="mt-0.5 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="opt_create_invoices" className="cursor-pointer">
                      <strong className="text-sky-300 block font-semibold">
                        Lançar faturas em aberto como despesas pendentes deste mês
                      </strong>
                      <span className="text-[11px] text-slate-400">
                        Agenda o valor de {formatCurrency(totalInvoices)} automaticamente nos dias de vencimento informados para controle do fluxo de caixa.
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Step Navigation */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div>
            {step !== 'welcome' ? (
              <button
                type="button"
                onClick={() => setStep(step === 'summary' ? 'configure' : 'welcome')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Voltar
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                Configurar mais tarde
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === 'welcome' && (
              <button
                type="button"
                onClick={() => setStep('configure')}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-emerald-950 cursor-pointer"
              >
                <span>Avançar para Saldos & Faturas</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 'configure' && (
              <button
                type="button"
                onClick={() => setStep('summary')}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-emerald-950 cursor-pointer"
              >
                <span>Revisar e Finalizar</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 'summary' && (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleFinish}
                className="px-6 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-emerald-950 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4 text-slate-950" />
                <span>{isSaving ? 'Gravando Contas...' : 'Concluir e Ir para Meu Painel'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
