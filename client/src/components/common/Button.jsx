import React from 'react';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled = false,
  onClick,
  className = '',
  icon: Icon,
  title,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-amber-700 hover:bg-amber-800 text-white shadow-sm shadow-amber-900/10 focus:ring-amber-500';
      case 'secondary':
        return 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-slate-400';
      case 'outline': {
        const border = className.includes('border-') ? '' : 'border border-slate-300 dark:border-slate-700';
        const bg = className.includes('bg-') ? '' : 'hover:bg-slate-50 dark:hover:bg-slate-800';
        const text = className.includes('text-') ? '' : 'text-slate-700 dark:text-slate-300';
        return `${border} ${bg} ${text} focus:ring-amber-500`.trim();
      }
      case 'outline-light':
      case 'outline-white':
        return 'border-2 border-white/70 bg-white/10 hover:bg-white/20 text-white hover:text-white shadow-xs focus:ring-white/50 backdrop-blur-xs font-bold';
      case 'outline-amber':
        return 'border-2 border-amber-400/80 bg-amber-950/60 hover:bg-amber-800/80 text-amber-100 hover:text-white shadow-xs focus:ring-amber-400 font-bold';
      case 'outline-purple':
        return 'border-2 border-purple-400/80 bg-purple-950/60 hover:bg-purple-800/80 text-purple-100 hover:text-white shadow-xs focus:ring-purple-400 font-bold';
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus:ring-rose-500';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm focus:ring-emerald-500';
      default:
        return 'bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'xs':
        return 'px-2 py-1 text-xs rounded-md gap-1';
      case 'sm':
        return 'px-3 py-1.5 min-h-9 text-xs rounded-lg gap-1.5';
      case 'lg':
        return 'px-5 py-2.5 min-h-12 text-base rounded-xl gap-2.5';
      default:
        // 44px tall on phones (minimum comfortable tap target), tighter on desktop
        return 'px-4 py-2 min-h-11 sm:min-h-10 text-sm rounded-xl gap-2';
    }
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      title={title}
      className={`inline-flex items-center justify-center font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${getVariantStyles()} ${getSizeStyles()} ${className}`}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
      ) : Icon ? (
        <Icon className="h-4 w-4 shrink-0" />
      ) : null}
      {children}
    </button>
  );
};
