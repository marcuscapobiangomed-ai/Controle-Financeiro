import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou erro:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[280px] p-6 rounded-2xl bg-slate-900/90 border border-rose-500/30 flex flex-col items-center justify-center text-center space-y-4 my-4">
          <div className="p-3 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {this.props.fallbackTitle || 'Ocorreu uma instabilidade na renderização visual'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              {this.state.error?.message?.includes('removeChild')
                ? 'A transição de elementos visuais encontrou uma divergência no DOM. Clique abaixo para recarregar esta visualização.'
                : this.state.error?.message || 'Houve um erro temporário no carregamento dos dados.'}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-lg shadow-emerald-950"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recarregar Visualização</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
