import React, { useState } from 'react';
import { X, Building2, Plus, Edit2, Trash2, Check, Wallet, CreditCard, Sparkles } from 'lucide-react';
import { Account } from '../types/finance';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency } from '../utils/formatters';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOnboarding?: () => void;
}

const COMMON_INSTITUTIONS = [
  'Nubank',
  'Itaú Unibanco',
  'Bradesco',
  'Banco Inter',
  'Santander',
  'Banco do Brasil',
  'Caixa Econômica',
  'C6 Bank',
  'XP Investimentos',
  'BTG Pactual',
  'Nomad',
  'Mercado Pago',
  'Clear Corretora',
  'Binance',
  'Outro Banco / Carteira',
];

const COLOR_PRESETS = [
  '#8A05BE', // Nubank purple
  '#EC7000', // Itaú orange
  '#CC092F', // Bradesco red
  '#FF7A00', // Inter orange
  '#E60000', // Santander red
  '#003882', // BB blue
  '#005CA9', // Caixa blue
  '#10b981', // Emerald green
  '#0ea5e9', // Sky blue
  '#000000', // XP black
  '#0D2040', // BTG navy
  '#f59e0b', // Amber gold
];

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, onOpenOnboarding }) => {
  const { accounts, addAccount, updateAccount, deleteAccount, accountBalances } = useFinance();

  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form inputs
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState(COMMON_INSTITUTIONS[0]);
  const [customInstitution, setCustomInstitution] = useState('');
  const [type, setType] = useState<Account['type']>('checking');
  const [initialBalanceStr, setInitialBalanceStr] = useState('0');
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [creditLimitStr, setCreditLimitStr] = useState('0,00');
  const [currentInvoiceStr, setCurrentInvoiceStr] = useState('0,00');
  const [closingDay, setClosingDay] = useState<number>(20);
  const [dueDay, setDueDay] = useState<number>(27);

  if (!isOpen) return null;

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setName('');
    setInstitution(COMMON_INSTITUTIONS[0]);
    setCustomInstitution('');
    setType('checking');
    setInitialBalanceStr('0,00');
    setColor(COLOR_PRESETS[0]);
    setCreditLimitStr('0,00');
    setCurrentInvoiceStr('0,00');
    setClosingDay(20);
    setDueDay(27);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (acc: Account) => {
    setEditingAccount(acc);
    setName(acc.name);
    if (COMMON_INSTITUTIONS.includes(acc.institution)) {
      setInstitution(acc.institution);
      setCustomInstitution('');
    } else {
      setInstitution('Outro Banco / Carteira');
      setCustomInstitution(acc.institution);
    }
    setType(acc.type);
    setInitialBalanceStr(acc.initialBalance.toString());
    setColor(acc.color || COLOR_PRESETS[0]);
    setCreditLimitStr(acc.creditLimit !== undefined ? acc.creditLimit.toString() : '0,00');
    setCurrentInvoiceStr(acc.currentInvoice !== undefined ? acc.currentInvoice.toString() : '0,00');
    setClosingDay(acc.closingDay || 20);
    setDueDay(acc.dueDay || 27);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const balance = parseFloat(initialBalanceStr.replace(/\./g, '').replace(',', '.')) || 0;
    const creditLimit = parseFloat(creditLimitStr.replace(/\./g, '').replace(',', '.')) || 0;
    const currentInvoice = parseFloat(currentInvoiceStr.replace(/\./g, '').replace(',', '.')) || 0;

    if (!name.trim()) {
      setFormError('Informe o nome da conta.');
      return;
    }

    const finalInstitution =
      institution === 'Outro Banco / Carteira'
        ? customInstitution.trim() || 'Outro Banco'
        : institution;

    if (editingAccount) {
      updateAccount({
        ...editingAccount,
        name: name.trim(),
        institution: finalInstitution,
        type,
        initialBalance: balance,
        color,
        creditLimit: type === 'credit_card' || creditLimit > 0 ? creditLimit : undefined,
        currentInvoice: type === 'credit_card' || currentInvoice > 0 ? currentInvoice : undefined,
        closingDay: type === 'credit_card' || creditLimit > 0 ? closingDay : undefined,
        dueDay: type === 'credit_card' || creditLimit > 0 ? dueDay : undefined,
      });
    } else {
      addAccount({
        name: name.trim(),
        institution: finalInstitution,
        type,
        initialBalance: balance,
        color,
        creditLimit: type === 'credit_card' || creditLimit > 0 ? creditLimit : undefined,
        currentInvoice: type === 'credit_card' || currentInvoice > 0 ? currentInvoice : undefined,
        closingDay: type === 'credit_card' || creditLimit > 0 ? closingDay : undefined,
        dueDay: type === 'credit_card' || creditLimit > 0 ? dueDay : undefined,
      });
    }

    setIsFormOpen(false);
  };

  const handleDelete = (id: string) => {
    if (accounts.length <= 1) {
      setFormError('Você precisa manter pelo menos uma conta ativa para gerenciar suas movimentações.');
      return;
    }
    deleteAccount(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-semibold text-white">
              Minhas Contas & Bancos
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {/* List of existing accounts */}
          {!isFormOpen ? (
            <div className="space-y-4">
              {/* Onboarding Wizard shortcut banner */}
              {onOpenOnboarding && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">
                        Assistente de Bancos, Saldos & Faturas
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        Configure todos os seus bancos, cartões, limites e vencimentos passo a passo
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenOnboarding();
                    }}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors shrink-0 shadow-sm"
                  >
                    Abrir Assistente
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Gerencie seus bancos, cartões e contas para integrar seu dinheiro real
                </span>
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova Conta
                </button>
              </div>

              <div className="space-y-2.5">
                {accounts.map(acc => {
                  const currentBalance = accountBalances[acc.id] ?? acc.initialBalance;
                  return (
                    <div
                      key={acc.id}
                      className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          style={{ backgroundColor: acc.color }}
                          className="w-3 h-10 rounded-sm shrink-0"
                        />
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {acc.name}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                            <span>{acc.institution}</span>
                            <span>•</span>
                            <span className="uppercase text-[10px] text-slate-400 font-medium">
                              {acc.type === 'checking'
                                ? 'Corrente'
                                : acc.type === 'savings'
                                ? 'Poupança / Reserva'
                                : acc.type === 'investment'
                                ? 'Investimentos'
                                : acc.type === 'credit_card'
                                ? 'Cartão de Crédito'
                                : 'Dinheiro'}
                            </span>
                            {acc.creditLimit !== undefined && acc.creditLimit > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-[10px] text-sky-400 font-mono">
                                  Limite: {formatCurrency(acc.creditLimit)}
                                </span>
                              </>
                            )}
                            {acc.dueDay !== undefined && (
                              <span className="text-[10px] text-amber-400 font-mono">
                                (Vence dia {acc.dueDay})
                              </span>
                            )}
                          </div>
                          {acc.currentInvoice !== undefined && acc.currentInvoice > 0 && (
                            <div className="text-[11px] text-rose-400 font-mono mt-0.5">
                              Fatura atual: {formatCurrency(acc.currentInvoice)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs font-mono font-bold text-white tabular-nums">
                            {formatCurrency(currentBalance)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Inicial: {formatCurrency(acc.initialBalance)}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEdit(acc)}
                            title="Editar conta"
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {deleteConfirmId === acc.id ? (
                            <div className="flex items-center gap-1 bg-rose-950/90 border border-rose-500/40 p-1 rounded text-[11px] z-10">
                              <span className="text-rose-300 font-semibold px-1">Excluir?</span>
                              <button
                                type="button"
                                onClick={() => handleDelete(acc.id)}
                                className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold"
                              >
                                Sim
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(acc.id)}
                              title="Excluir conta"
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Form to add or edit an account */
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-white">
                  {editingAccount ? 'Editar Conta Bancária' : 'Cadastrar Nova Conta'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Voltar à lista
                </button>
              </div>

              {formError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
                  <span>{formError}</span>
                  <button
                    type="button"
                    onClick={() => setFormError(null)}
                    className="text-rose-400 hover:text-white text-xs font-bold"
                  >
                    ×
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Nome da Conta (ex: Conta Principal, Nubank Dia a Dia, Reserva BTG)
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Conta Corrente Principal"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Instituição / Banco
                  </label>
                  <select
                    value={institution}
                    onChange={e => {
                      setInstitution(e.target.value);
                      if (e.target.value !== 'Outro Banco / Carteira') {
                        setCustomInstitution('');
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    {COMMON_INSTITUTIONS.map(inst => (
                      <option key={inst} value={inst}>
                        {inst}
                      </option>
                    ))}
                  </select>

                  {institution === 'Outro Banco / Carteira' && (
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Nome do Banco (ex: Sicoob, Sicredi, Safra...)"
                        value={customInstitution}
                        onChange={e => setCustomInstitution(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Tipo de Conta
                  </label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="checking">Conta Corrente</option>
                    <option value="savings">Poupança / Reserva</option>
                    <option value="investment">Conta Investimentos</option>
                    <option value="credit_card">Cartão de Crédito</option>
                    <option value="cash">Carteira / Dinheiro Físico</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Saldo Atual / Inicial nesta Conta (R$)
                </label>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={initialBalanceStr}
                  onChange={e => setInitialBalanceStr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Informe o saldo real que você tem hoje para que seu patrimônio reflita a realidade.
                </span>
              </div>

              {/* Credit card & Invoice section */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-3">
                <div className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Cartão de Crédito, Fatura & Vencimento</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Limite de Crédito (R$)
                    </label>
                    <input
                      type="text"
                      placeholder="0,00"
                      value={creditLimitStr}
                      onChange={e => setCreditLimitStr(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-rose-400 mb-1">
                      Fatura Atual Aberta (R$)
                    </label>
                    <input
                      type="text"
                      placeholder="0,00"
                      value={currentInvoiceStr}
                      onChange={e => setCurrentInvoiceStr(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-rose-300 font-mono focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Dia de Fechamento da Fatura
                    </label>
                    <select
                      value={closingDay}
                      onChange={e => setClosingDay(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>
                          Dia {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-amber-400 mb-1">
                      Dia de Vencimento da Fatura
                    </label>
                    <select
                      value={dueDay}
                      onChange={e => setDueDay(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>
                          Dia {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Color presets */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Cor de Identificação
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PRESETS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className="w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                    >
                      {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded border border-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded transition-colors shadow-sm"
                >
                  {editingAccount ? 'Salvar Alterações' : 'Criar Conta'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
