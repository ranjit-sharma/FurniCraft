import React from 'react';

export const Badge = ({ children, variant = 'default', size = 'md', className = '' }) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
      case 'APPROVED':
      case 'P':
      case 'AVAILABLE':
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'warning':
      case 'SUBMITTED':
      case 'PENDING':
      case 'HALF':
      case 'P1/5':
      case 'IN_PROGRESS':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'danger':
      case 'CRITICAL':
      case 'REJECTED':
      case 'ABSENT':
      case 'LOST':
      case 'DAMAGED':
        return 'bg-rose-50 text-rose-800 border-rose-300';
      case 'HIGH':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'MEDIUM':
        return 'bg-sky-50 text-sky-800 border-sky-300';
      case 'LOW':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'ARCHIVED':
        return 'bg-slate-100 text-slate-600 border-slate-300';
      case 'ON_HOLD':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'PLANNED':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'info':
      case 'PP':
      case 'ISSUED':
      case 'FINALIZED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'purple':
      case 'CORRECTION_REQUESTED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
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
