import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  ShieldAlert,
  IndianRupee,
  Search,
  HardHat,
} from 'lucide-react';

// Shared by the desktop Sidebar and the mobile BottomNav (which shows up to 5 as bottom tabs).
export const useNavLinks = () => {
  const { isThekedar } = useAuth();
  const { t } = useLanguage();

  if (isThekedar) {
    return [
      { to: '/', label: t('nav.thekedarDashboard', 'Thekedar Dashboard'), short: t('navShort.home', 'Home'), icon: LayoutDashboard },
      { to: '/projects', label: t('nav.furnitureProjects', 'Furniture Projects'), short: t('navShort.projects', 'Projects'), icon: FolderKanban },
      { to: '/workers', label: t('nav.workersAndWages', 'Workers & Wages'), short: t('navShort.workers', 'Workers'), icon: Users },
      { to: '/expenses', label: t('nav.expenses', 'Project Money Received'), short: t('navShort.money', 'Money'), icon: IndianRupee },
      { to: '/transactions/search', label: t('nav.transactionSearch', 'Transaction Search'), short: t('navShort.payments', 'Payments'), icon: Search },
    ];
  }

  // Owner / Admin
  return [
    { to: '/', label: t('nav.executiveDashboard', 'Executive Dashboard'), short: t('navShort.home', 'Home'), icon: LayoutDashboard },
    { to: '/members', label: t('nav.members', 'Whole Members & Visits'), short: t('navShort.members', 'Members'), icon: Users },
    { to: '/projects', label: t('nav.allProjects', 'All Projects'), short: t('navShort.projects', 'Projects'), icon: FolderKanban },
    { to: '/thekedars', label: t('nav.thekedarRecords', 'Thekedar Records'), short: t('navShort.thekedars', 'Thekedars'), icon: HardHat },
    { to: '/audit', label: t('nav.audit', 'Security & Audit Logs'), short: t('navShort.audit', 'Audit'), icon: ShieldAlert },
  ];
};

// Desktop only (>= 1024px); tablets & phones use Drawer + BottomNav.
export const Sidebar = () => {
  const { t } = useLanguage();
  const links = useNavLinks();

  return (
    <aside className="hidden lg:flex sticky top-16 z-30 h-[calc(100dvh-4rem)] w-64 shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="flex flex-col flex-1 overflow-y-auto px-4 py-5">
        <div className="mb-3 px-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t('nav.navigation', 'Navigation')}
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto pt-6">
          <div className="rounded-xl border border-amber-200/60 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/30 p-3.5 text-xs text-amber-900 dark:text-amber-200">
            <div className="font-semibold text-amber-950 dark:text-amber-100 mb-0.5">{t('sidebar.craftScope', 'Modern Craft Scope')}</div>
            <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/80">
              {t('sidebar.craftScopeDesc', 'Modular kitchens, wardrobes, TV units, workstations, and custom cabinetry.')}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
