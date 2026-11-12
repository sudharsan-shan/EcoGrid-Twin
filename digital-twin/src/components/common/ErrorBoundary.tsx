import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

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
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-red-950/20 border border-red-500/30 rounded-xl text-center min-h-[200px]">
          <AlertTriangle className="w-8 h-8 text-red-400 mb-2" />
          <h4 className="text-sm font-semibold text-red-200">
            {this.props.fallbackTitle || 'Component Error'}
          </h4>
          <p className="text-xs text-red-400/80 font-mono mt-1 max-w-md break-words">
            {this.state.error?.message || 'An unexpected rendering error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 px-3 py-1 bg-red-900/40 hover:bg-red-900/60 text-red-300 text-xs rounded border border-red-500/40 transition-colors"
          >
            Retry Component
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
