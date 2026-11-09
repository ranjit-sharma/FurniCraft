import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MoreHorizontal, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Modal } from '../common/Modal';
import { LanguageSelector } from '../common/LanguageSelector';
import { useNavLinks } from './Sidebar';

const tabClass = (active) =>
  `flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[3.5rem] px-0.5 text-[10px] sm:text-[11px] font-semibold transition-colors active:scale-95 min-w-0 select-none ${
    active ? 'text-amber-700 dark:text-amber-400 font-bold' : 'text-slate-500 dark:text-slate-400'
  }`;

// Phone-only tab bar: up to 5 links as tabs; with more than 5, the first 4 plus a "More" bottom sheet.
export const BottomNav = () => {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const links = useNavLinks();
  const tabs = links.length <= 5 ? links : links.slice(0, 4);
  const more = links.length <= 5 ? [] : links.slice(4);
  const moreActive = more.some((l) => pathname.startsWith(l.to));

  return (
    <>
      <nav
        aria-label={t('nav.navigation', 'Navigation')}
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      >
        {tabs.map(({ to, short, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => tabClass(isActive)}>
            {({ isActive }) => (
              <>
                <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-amber-100 dark:bg-amber-950/70' : ''}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="truncate max-w-full text-center leading-tight">{short}</span>
              </>
            )}
          </NavLink>
        ))}
        {more.length > 0 && (
        <button type="button" onClick={() => setMoreOpen(true)} className={tabClass(moreActive)} aria-haspopup="dialog">
          <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${moreActive ? 'bg-amber-100 dark:bg-amber-950/70' : ''}`}>
            <MoreHorizontal className="h-5 w-5" />
          </span>
          <span className="truncate max-w-full text-center leading-tight">{t('navShort.more', 'More')}</span>
        </button>
        )}
      </nav>

      <Modal isOpen={moreOpen} onClose={() => setMoreOpen(false)} title={t('navShort.more', 'More')}>
        <div className="-mx-1 flex flex-col gap-1">
          {more.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMoreOpen(false)}
              className={({ isActive }) =>
                `flex min-h-[3.25rem] items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors active:bg-slate-100 dark:active:bg-slate-800 ${
                  isActive ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200' : 'text-slate-700 dark:text-slate-200'
                }`
              }
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="flex-1">{label}</span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </NavLink>
          ))}
          {/* Quick Language Preference in Mobile Bottom Sheet */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2 px-1">
              {t('common.language', 'Language')}
            </span>
            <LanguageSelector variant="buttons" />
          </div>
        </div>
      </Modal>
    </>
  );
};
