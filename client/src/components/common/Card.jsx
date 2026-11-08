import React from 'react';

export const Card = ({ children, className = '', title, subtitle, action }) => {
  return (
    <div className={`rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm transition-all hover:shadow-md ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="min-w-0">
            {title && <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">{title}</h3>}
            {subtitle && <div className="text-xs text-slate-700 dark:text-slate-400 mt-0.5">{subtitle}</div>}
          </div>
          {action && <div className="shrink-0 max-w-full grow sm:grow-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
