import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Globe, Check } from 'lucide-react';

export const LanguageSelector = ({ variant = 'pill', className = '' }) => {
  const { language, changeLanguage, availableLanguages } = useLanguage();

  if (variant === 'pill') {
    return (
      <div
        className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-full bg-slate-100/90 dark:bg-slate-800/90 p-1 border border-slate-200 dark:border-slate-700/80 shadow-2xs ${className}`}
        role="group"
        aria-label="Language Selector"
      >
        <div className="flex items-center pl-2 pr-1 text-slate-400 dark:text-slate-500 shrink-0">
          <Globe className="h-4 w-4" />
        </div>
        {availableLanguages.map((lang) => {
          const isActive = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => changeLanguage(lang.code)}
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
              title={lang.label}
              aria-pressed={isActive}
            >
              <span>{lang.nativeLabel}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'buttons') {
    return (
      <div className={`grid grid-cols-3 gap-1.5 ${className}`}>
        {availableLanguages.map((lang) => {
          const isActive = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => changeLanguage(lang.code)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                isActive
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 font-bold ring-2 ring-amber-500/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
              aria-pressed={isActive}
            >
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold leading-tight">{lang.nativeLabel}</span>
                {isActive && <Check className="h-3 w-3 text-amber-600 dark:text-amber-400" />}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{lang.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Fallback to select dropdown
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <Globe className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
      <select
        value={language}
        onChange={(e) => changeLanguage(e.target.value)}
        className="appearance-none pl-8 pr-7 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        aria-label="Select Language"
      >
        {availableLanguages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeLabel} ({lang.label})
          </option>
        ))}
      </select>
    </div>
  );
};
