import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Sun, Moon, Monitor, Check } from 'lucide-react';

export const ThemeSelector = ({ variant = 'buttons', className = '' }) => {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();

  const themeOptions = [
    {
      id: 'light',
      label: t('profile.themeLight', 'Light'),
      subtext: t('profile.themeLightDesc', 'Bright'),
      icon: Sun,
      color: 'text-amber-500',
    },
    {
      id: 'dark',
      label: t('profile.themeDark', 'Dark'),
      subtext: t('profile.themeDarkDesc', 'Slate'),
      icon: Moon,
      color: 'text-blue-400',
    },
    {
      id: 'system',
      label: t('profile.themeSystem', 'System'),
      subtext: t('profile.themeSystemDesc', 'Auto OS'),
      icon: Monitor,
      color: 'text-slate-500 dark:text-slate-400',
    },
  ];

  if (variant === 'pill') {
    return (
      <div
        className={`inline-flex items-center rounded-xl bg-slate-100 dark:bg-slate-800/90 p-1 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs ${className}`}
        role="group"
        aria-label="Theme Selector"
      >
        {themeOptions.map((opt) => {
          const isActive = theme === opt.id;
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
              title={opt.label}
              aria-pressed={isActive}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Default 'buttons' grid variant for dropdown menus
  return (
    <div className={`grid grid-cols-3 gap-1.5 ${className}`} role="group" aria-label="Theme Selector">
      {themeOptions.map((opt) => {
        const isActive = theme === opt.id;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
              isActive
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 font-bold ring-2 ring-amber-500/20 shadow-xs'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
            aria-pressed={isActive}
            title={`${opt.label} Mode`}
          >
            <div className="flex items-center gap-1">
              <Icon className={`h-3.5 w-3.5 ${opt.color}`} />
              <span className="text-xs font-bold leading-tight">{opt.label}</span>
              {isActive && <Check className="h-3 w-3 text-amber-600 dark:text-amber-400" />}
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              {opt.subtext}
            </span>
          </button>
        );
      })}
    </div>
  );
};
