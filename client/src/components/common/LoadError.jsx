import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { errorText } from '../../api/client';

/** Inline notice for a screen whose data failed to load, with a retry button. Renders nothing when there is no error. */
export const LoadError = ({ message, onRetry }) => {
  if (!message) return null;
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-4 sm:flex-row sm:items-center animate-fade-in">
      <div className="flex flex-1 items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
        <p className="text-sm font-medium text-rose-900 dark:text-rose-200">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700 transition"
        >
          <RotateCcw className="h-4 w-4" />
          {errorText('tryAgain')}
        </button>
      )}
    </div>
  );
};
