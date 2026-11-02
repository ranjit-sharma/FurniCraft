import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || 'An unexpected rendering error occurred';

      return (
        <div className="min-h-[360px] flex items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-6 shadow-xl text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 shadow-sm">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {this.props.title || 'Page Display Issue'}
              </h2>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                We encountered an issue rendering this section of the workspace. Your data is secure and undamaged.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Technical Context
              </span>
              <p className="text-xs font-mono text-rose-700 font-semibold break-words">
                {errorMessage}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Go to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
