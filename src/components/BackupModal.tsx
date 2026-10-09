import React, { useState } from 'react';
import {
  X,
  Download,
  Upload,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  Cloud,
  LogIn,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ isOpen, onClose }) => {
  const {
    exportAllData,
    importAllData,
    exportTransactionsCSV,
    clearMockData,
    resetToInitialData,
    isDemoData,
  } = useFinance();
  const { user, signIn, signOut } = useAuth();
  const [jsonInput, setJsonInput] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmDemoOpen, setConfirmDemoOpen] = useState(false);

  if (!isOpen) return null;

  const handleImport = () => {
    if (!jsonInput.trim()) {
      setImportStatus('Por favor, cole o código JSON do seu backup.');
      return;
    }

    const success = importAllData(jsonInput);
    if (success) {
      setImportStatus('Dados restaurados com sucesso!');
      setTimeout(() => {
        onClose();
        setImportStatus(null);
      }, 1200);
    } else {
      setImportStatus('Falha ao importar: formato JSON inválido ou incompatível.');
    }
  };

  const handleExecuteClear = async () => {
    setConfirmClearOpen(false);
    await clearMockData();
    onClose();
  };

  const handleExecuteLoadDemo = async () => {
    setConfirmDemoOpen(false);
    await resetToInitialData();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-emerald-400" />
            <h2 className="text-base font-semibold text-white">
              Banco de Dados & Sincronização
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Section 0: Firebase Cloud Database Status */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white">
                  Banco de Dados Cloud Firestore
                </span>
              </div>
              <span
                className={`text-[11px] px-2 py-0.5 rounded font-mono font-medium ${
                  user
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {user ? 'Sincronizado na Nuvem' : 'Modo Offline / Local'}
              </span>
            </div>

            {user ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-300">
                  Conectado como <strong className="text-white">{user.email}</strong>. Suas
                  entradas, saídas, investimentos e metas estão protegidos e salvos em tempo real no
                  Firestore.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400 font-mono">
                    ID: {user.uid.slice(0, 12)}...
                  </span>
                  <button
                    onClick={() => signOut()}
                    className="px-2.5 py-1 text-xs text-rose-300 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 rounded transition-colors flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Desconectar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-xs text-slate-400">
                  Conecte sua conta Google para salvar com segurança todas as suas finanças no banco
                  de dados na nuvem e acessá-las de qualquer lugar.
                </p>
                <button
                  onClick={() => signIn()}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <LogIn className="w-4 h-4" />
                  Conectar com Google & Salvar na Nuvem
                </button>
              </div>
            )}
          </div>

          {/* Section 1: Export section */}
          <div>
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Exportar Arquivo Local
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Guarde uma cópia física em seu computador ou analise os lançamentos em planilhas
              (Excel / Google Sheets).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={exportAllData}
                className="py-2.5 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded text-xs font-medium text-slate-200 flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                Baixar Backup (.json)
              </button>

              <button
                type="button"
                onClick={exportTransactionsCSV}
                className="py-2.5 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded text-xs font-medium text-slate-200 flex items-center justify-center gap-2 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-sky-400" />
                Exportar Transações (.csv)
              </button>
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* Section 2: Import section */}
          <div>
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Restaurar Backup (.json)
            </h3>
            <p className="text-xs text-slate-400 mb-2">
              Cole abaixo o conteúdo do arquivo JSON exportado anteriormente:
            </p>
            <textarea
              rows={3}
              value={jsonInput}
              onChange={e => setJsonInput(e.target.value)}
              placeholder="Cole aqui o texto JSON do arquivo de backup..."
              className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-emerald-500 placeholder-slate-600"
            />
            {importStatus && (
              <div
                className={`mt-2 text-xs flex items-center gap-1.5 ${
                  importStatus.includes('sucesso') ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {importStatus.includes('sucesso') && <CheckCircle2 className="w-4 h-4" />}
                {importStatus}
              </div>
            )}
            <button
              type="button"
              onClick={handleImport}
              className="mt-2 py-2 px-4 bg-emerald-700 hover:bg-emerald-600 rounded text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Restaurar Dados do Backup
            </button>
          </div>

          <hr className="border-slate-800" />

          {/* Clean wipe / Demo switch */}
          <div className="pt-1 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-rose-300">
                  {isDemoData ? 'Remover Dados Mockados' : 'Zerar todos os registros'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {isDemoData
                    ? 'Remove todos os lançamentos fictícios para manter apenas seus dados reais'
                    : 'Limpa todas as transações e investimentos fictícios'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                className="py-1.5 px-3 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/80 rounded text-xs font-medium text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDemoData ? 'Tirar Mocks' : 'Limpar Tudo'}
              </button>
            </div>

            {confirmClearOpen && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg space-y-2">
                <p className="text-xs text-rose-200">
                  Tem certeza? Esta ação removerá lançamentos e ativos de teste para manter apenas seus dados reais.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExecuteClear}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold"
                  >
                    Confirmar Limpeza
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearOpen(false)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {!isDemoData && (
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-300">
                    Modo Demonstração (Opcional)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Carregar dados de exemplo com ações, CDBs e relatórios para explorar
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmDemoOpen(true)}
                  className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  Carregar Demo
                </button>
              </div>
            )}

            {confirmDemoOpen && (
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-lg space-y-2">
                <p className="text-xs text-amber-200">
                  Deseja carregar dados de exemplo? Seus registros atuais serão substituídos pelo modelo demo.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExecuteLoadDemo}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold"
                  >
                    Confirmar Carregamento
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDemoOpen(false)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
