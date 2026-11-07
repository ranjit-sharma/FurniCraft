import React from 'react';

export const Badge = ({ children, variant = 'default', size = 'md', className = '' }) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
      case 'APPROVED':
      case 'P':
      case 'AVAILABLE':
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800';
      case 'warning':
      case 'SUBMITTED':
      case 'PENDING':
      case 'HALF':
      case 'P1/5':
      case 'IN_PROGRESS':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800';
      case 'danger':
      case 'CRITICAL':
      case 'REJECTED':
      case 'ABSENT':
      case 'LOST':
      case 'DAMAGED':
        return 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800';
      case 'HIGH':
        return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/60 dark:text-amber-200 dark:border-amber-700';
      case 'MEDIUM':
        return 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-800';
      case 'LOW':
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      case 'ARCHIVED':
        return 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700';
      case 'ON_HOLD':
        return 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/70 dark:text-orange-300 dark:border-orange-800';
      case 'PLANNED':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800';
      case 'info':
      case 'PP':
      case 'ISSUED':
      case 'FINALIZED':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800';
      case 'indigo':
      case 'P2/5':
      case '2.5':
      case '2.5x':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800';
      case 'purple':
      case 'PPP':
      case '3':
      case '3x':
      case 'LEAVE':
      case 'CORRECTION_REQUESTED':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium border rounded-md ${getVariantStyles()} ${sizeStyles} ${className}`}
    >
      {children}
    </span>
  );
};
