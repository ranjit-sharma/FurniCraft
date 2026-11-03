import React from 'react';

/**
 * Standard page title row used on every screen: title + one-line subtitle on the left,
 * actions on the right (desktop) or as full-width buttons underneath (phone).
 */
export const PageHeader = ({ title, subtitle, actions, badge }) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">{title}</h2>
        {badge}
      </div>
      {subtitle && <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2 [&>*]:flex-1 [&>*]:justify-center sm:[&>*]:flex-none">{actions}</div>}
  </div>
);
