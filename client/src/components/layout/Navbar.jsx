import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { LogOut, Phone, Mail, CheckCircle2, Globe, Sun, Moon, Monitor, Menu, X } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { LanguageSelector } from '../common/LanguageSelector';
import { ThemeSelector } from '../common/ThemeSelector';
import { useNavLinks } from './Sidebar';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { language, t } = useLanguage();
  const { theme, resolvedTheme, isDark } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const profileRef = useRef(null);
  const links = useNavLinks();

  // Close drawer on escape key and lock body scroll
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [drawerOpen]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'THEKEDAR':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'WORKER':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getRoleGradient = (role) => {
    switch (role) {
      case 'OWNER':
        return 'from-purple-600 to-indigo-800 text-white';
      case 'THEKEDAR':
        return 'from-amber-600 to-amber-800 text-white';
      case 'WORKER':
        return 'from-emerald-600 to-teal-800 text-white';
      default:
        return 'from-slate-700 to-slate-900 text-white';
    }
  };

  const getRoleDescription = (role) => {
    switch (role) {
      case 'OWNER':
        return t('profile.ownerDesc', 'Executive Business Owner');
      case 'THEKEDAR':
        return t('profile.thekedarDesc', 'Contractor & Site Supervisor');
      case 'WORKER':
        return t('profile.workerDesc', 'Craftsman & Site Worker');
      default:
        return t('profile.furnicraftUser', 'FurniCraft User');
    }
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <>
      <header className="sticky top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] md:h-16 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 px-3 sm:px-4 md:px-6 pt-[env(safe-area-inset-top)] backdrop-blur-md transition-colors">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {user && (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <BrandLogo size="sm" variant={isDark ? 'dark' : 'light'} className="sm:hidden" />
          <BrandLogo size="md" variant={isDark ? 'dark' : 'light'} className="hidden sm:flex" />
        </div>

        {/* Right: Profile Icon Toggler */}
        {user && (
        <div className="relative" ref={profileRef}>
          {/* Round Profile Toggler Button */}
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className={`group relative flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-full border-2 transition-all focus:outline-none cursor-pointer ${
              profileOpen
                ? 'border-blue-600 dark:border-blue-500 ring-4 ring-blue-500/20 shadow-md scale-105'
                : 'border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md hover:scale-105'
            }`}
            aria-expanded={profileOpen}
            aria-label="User profile toggler"
          >
            {/* Fully Round Avatar Circle */}
            <div
              className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br ${getRoleGradient(
                user.role
              )} font-black text-sm text-white shadow-inner`}
            >
              <i className="fa-solid fa-user text-sm md:text-base"></i>
            </div>
          </button>

          {/* Profile Dropdown Menu */}
          {profileOpen && (
            <div className="absolute right-0 mt-2.5 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] origin-top-right rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-3.5 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 animate-dropdown z-50 text-slate-900 dark:text-slate-100">
              {/* User Identity Card */}
              <div className="rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-slate-800/80 dark:to-slate-800/40 p-3.5 border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getRoleGradient(
                      user.role
                    )} text-lg font-black text-white shadow-md ring-2 ring-white dark:ring-slate-700`}
                  >
                    <i className="fa-solid fa-user text-base sm:text-lg"></i>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {user.name}
                    </h4>
                    <span
                      className={`inline-block mt-0.5 rounded-md border px-2 py-0.5 text-[10px] font-bold ${getRoleBadgeColor(
                        user.role
                      )}`}
                    >
                      {user.role}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/70 space-y-1 text-xs">
                  {user.phone && (
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="font-semibold truncate">{user.phone}</span>
                    </div>
                  )}
                  {user.email && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Mail className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="truncate text-[11px]">{user.email}</span>
                    </div>
                  )}
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  <span>{getRoleDescription(user.role)}</span>
                  <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> {t('common.active', 'Active')}
                  </span>
                </div>

                {/* Theme Preference Section (Light / Dark / System) */}
                <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/70">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      {theme === 'dark' ? (
                        <Moon className="h-3.5 w-3.5 text-blue-400" />
                      ) : theme === 'light' ? (
                        <Sun className="h-3.5 w-3.5 text-amber-500" />
                      ) : (
                        <Monitor className="h-3.5 w-3.5 text-slate-400" />
                      )}
                      {t('profile.themePreference', 'Theme Preference')}
                    </span>
                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 px-1.5 py-0.5 rounded uppercase">
                      {theme}
                    </span>
                  </div>
                  <ThemeSelector variant="buttons" />
                </div>

                {/* Language Preference Section */}
                <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/70">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      {t('profile.preferredLanguage', 'Language Preference')}
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 px-1.5 py-0.5 rounded uppercase">
                      {language}
                    </span>
                  </div>
                  <LanguageSelector variant="buttons" />
                </div>
              </div>

              {/* Menu Actions */}
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-700 dark:text-rose-400 transition hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-800 dark:hover:text-rose-300"
                >
                  <LogOut className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <span>{t('nav.logout', 'Sign Out')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </header>

    {/* Responsive Slide-Over Navigation Drawer for Mobile & Tablet (< lg) */}
    {drawerOpen && (
      <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation drawer">
        {/* Backdrop overlay */}
        <div
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs animate-fade-in"
        />

        {/* Slide-in drawer container */}
        <div className="relative z-10 flex h-full w-80 max-w-[85vw] flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl animate-in slide-in-from-left duration-200">
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3.5">
            <BrandLogo size="sm" variant={isDark ? 'dark' : 'light'} />
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition"
              aria-label="Close navigation drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User identity card */}
          {user && (
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getRoleGradient(
                    user.role
                  )} text-sm font-black text-white shadow-sm`}
                >
                  <i className="fa-solid fa-user"></i>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {user.name}
                  </h4>
                  <span
                    className={`inline-block mt-0.5 rounded-md border px-2 py-0.5 text-[10px] font-bold ${getRoleBadgeColor(
                      user.role
                    )}`}
                  >
                    {user.role}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation links */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t('nav.navigation', 'Navigation')}
            </div>
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-colors active:scale-98 ${
                      isActive
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 shadow-xs'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Preferences (Theme & Language) */}
          <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-3 bg-slate-50/50 dark:bg-slate-800/30">
            <div>
              <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                {t('profile.themePreference', 'Theme')}
              </span>
              <ThemeSelector variant="buttons" />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                {t('profile.preferredLanguage', 'Language')}
              </span>
              <LanguageSelector variant="buttons" />
            </div>

            <button
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                logout();
              }}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/80 dark:bg-rose-950/40 py-2.5 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition active:scale-95"
            >
              <LogOut className="h-4 w-4" />
              <span>{t('nav.logout', 'Sign Out')}</span>
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);
};
