import React from 'react';
import { AlertTriangle, RotateCcw, Home, WifiOff } from 'lucide-react';
import { errorText } from '../../api/client';

// A lazy-loaded page chunk failed to download (offline, or a new deploy replaced old files).
const isChunkLoadError = (error) =>
  /Loading chunk|dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(
    `${error?.name} ${error?.message}`
  );

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
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
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const chunkError = isChunkLoadError(this.state.error);
    const Icon = chunkError ? WifiOff : AlertTriangle;
    const btn =
      'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition cursor-pointer';

    return (
      <div className="min-h-[360px] flex items-center justify-center p-4 sm:p-6" role="alert">
        <div className="w-full max-w-md rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-900 p-6 shadow-xl text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
            <Icon className="h-7 w-7" />
          </div>

          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              {this.props.title || errorText(chunkError ? 'chunkTitle' : 'pageCrashTitle')}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {errorText(chunkError ? 'chunkBody' : 'pageCrashBody')}
            </p>
          </div>

          {/* Technical details are for developers only */}
          {import.meta.env.DEV && (
            <p className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-3 text-left text-xs font-mono text-rose-700 break-words">
              {this.state.error?.message}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-center">
            <button type="button" onClick={this.handleGoHome} className={`${btn} border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700`}>
              <Home className="h-4 w-4" />
              {errorText('goHome')}
            </button>
            <button
              type="button"
              onClick={chunkError ? this.handleReload : this.handleReset}
              className={`${btn} bg-amber-600 text-white hover:bg-amber-700`}
            >
              <RotateCcw className="h-4 w-4" />
              {errorText(chunkError ? 'reload' : 'tryAgain')}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
