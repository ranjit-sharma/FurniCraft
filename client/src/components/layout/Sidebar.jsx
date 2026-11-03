import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { BrandLogo } from '../common/BrandLogo';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  CalendarCheck2,
  Calculator,
  Wrench,
  Receipt,
  FileSpreadsheet,
  ShieldAlert,
  AlertCircle,
  HelpCircle,
  IndianRupee,
  Search,
  X,
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, isOwner, isThekedar } = useAuth();
  const { t } = useLanguage();
  const { isDark } = useTheme();

  const getNavLinks = () => {
    if (isThekedar) {
      return [
        { to: '/', label: t('nav.thekedarDashboard', 'Thekedar Dashboard'), icon: LayoutDashboard },
        { to: '/projects', label: t('nav.furnitureProjects', 'Furniture Projects'), icon: FolderKanban },
        { to: '/workers', label: t('nav.workersAndWages', 'Workers & Wages'), icon: Users },
        { to: '/attendance', label: t('nav.attendanceApprovals', 'Attendance & Approvals'), icon: CalendarCheck2 },
        { to: '/transactions/search', label: t('nav.transactionSearch', 'Transaction Search'), icon: Search },
        { to: '/tools', label: t('nav.toolTracking', 'Tool Tracking & Issues'), icon: Wrench },
        { to: '/expenses', label: t('nav.expenses', 'Project Money Received'), icon: IndianRupee },
        { to: '/disputes', label: t('nav.workerDisputes', 'Worker Disputes'), icon: AlertCircle },
      ];
    }

    // Owner / Admin
    return [
      { to: '/', label: t('nav.executiveDashboard', 'Executive Dashboard'), icon: LayoutDashboard },
      { to: '/members', label: t('nav.members', 'Whole Members & Visits'), icon: Users },
      { to: '/projects', label: t('nav.allProjects', 'All Projects'), icon: FolderKanban },
      { to: '/thekedars', label: t('nav.thekedarRecords', 'Thekedar Records'), icon: Users },
      { to: '/audit', label: t('nav.audit', 'Security & Audit Logs'), icon: ShieldAlert },
      { to: '/disputes', label: t('nav.disputes', 'Disputes Resolution'), icon: AlertCircle },
    ];
  };

  const links = getNavLinks();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-200 ease-in-out md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:self-start md:translate-x-0 shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto px-4 py-5">
          {/* Sidebar Brand Header: Visible only on mobile/small screens; hidden on desktop */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 md:hidden">
            <BrandLogo size="sm" variant={isDark ? 'dark' : 'light'} />
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden transition-colors"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

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
                  onClick={() => onClose && onClose()}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 font-semibold shadow-xs'
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

          {/* Furniture Industry Tag */}
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
    </>
  );
};
