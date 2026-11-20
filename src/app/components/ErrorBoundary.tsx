import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    window.dispatchEvent(new CustomEvent('pilamanager:notification', {
      detail: { id: crypto.randomUUID(), type: 'error', message: `Erro inesperado: ${error.message}` },
    }));
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F3F7F9] p-6">
        <section className="w-full max-w-md rounded-2xl border border-[#DCE6EC] bg-white p-8 text-center shadow-xl">
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-[#D95C5C]" />
          <h1 className="mb-2 text-xl font-semibold text-[#1A3047]">Nao foi possivel carregar esta tela</h1>
          <p className="mb-5 text-sm text-[#62758A]">A aplicacao continuou protegida. Recarregue a pagina ou volte para a tela inicial.</p>
          <button type="button" className="rounded-xl bg-[#087F8C] px-5 py-3 text-sm font-semibold text-white" onClick={() => window.location.reload()}>
            Recarregar
          </button>
        </section>
      </main>
    );
  }
}
