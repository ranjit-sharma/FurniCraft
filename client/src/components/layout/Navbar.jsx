import React, { useState, useRef, useEffect } from 'react';
import { useInRouterContext, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { LogOut, Phone, Mail, CheckCircle2, Globe, LifeBuoy, ChevronRight, BookOpen, User, AlarmClock, X } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { LanguageSelector } from '../common/LanguageSelector';
import { HelpCenterModal } from '../common/HelpCenterModal';
import { ThekedarGuideModal } from '../common/ThekedarGuideModal';
import { AttendanceAlarmModal } from '../common/AttendanceAlarmModal';
import { useAttendanceAlarm } from '../../context/AttendanceAlarmContext';

const LogoLinkWithRouter = ({ children }) => {
  const navigate = useNavigate();
  return (
    <a
      href="/"
      onClick={(e) => {
        e.preventDefault();
        navigate('/');
      }}
      className="flex items-center gap-2 sm:gap-3 min-w-0 transition-opacity hover:opacity-90 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-xl select-none"
      title="FurniCraft Dashboard"
      aria-label="FurniCraft Dashboard"
    >
      {children}
    </a>
  );
};

const LogoLink = ({ children }) => {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <LogoLinkWithRouter>{children}</LogoLinkWithRouter>;
  }
  return (
    <a
      href="/"
      className="flex items-center gap-2 sm:gap-3 min-w-0 transition-opacity hover:opacity-90 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-xl select-none"
      title="FurniCraft Dashboard"
      aria-label="FurniCraft Dashboard"
    >
      {children}
    </a>
  );
};

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { language, t } = useLanguage();
  const { isDark } = useTheme();
  const { attendanceStatus, alarmTime, alarmToast, dismissAlarmToast } = useAttendanceAlarm();
  const [profileOpen, setProfileOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [alarmModalOpen, setAlarmModalOpen] = useState(false);
  const profileRef = useRef(null);

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
    <header className="sticky top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] md:h-16 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 px-3 sm:px-4 md:px-6 pt-[env(safe-area-inset-top)] backdrop-blur-md transition-colors">
        <LogoLink>
          <BrandLogo size="sm" variant={isDark ? 'dark' : 'light'} className="sm:hidden" />
          <BrandLogo size="md" variant={isDark ? 'dark' : 'light'} className="hidden sm:flex" />
        </LogoLink>

        {/* Right: Alarm Bell & Profile Icon Toggler */}
        {user && (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Thekedar Attendance Alarm Bell */}
            {user.role === 'THEKEDAR' && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAlarmModalOpen(true)}
                  title={
                    attendanceStatus.isPending
                      ? `⏰ Attendance Alarm: ${attendanceStatus.unmarkedCount} craftsman waiting to be marked today`
                      : 'Attendance Alarm: All marked for today'
                  }
                  aria-label="Attendance alarm and notifications"
                  className={`relative flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-full border-2 transition-all cursor-pointer ${
                    attendanceStatus.isPending
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 ring-4 ring-amber-500/20 shadow-md animate-pulse scale-105'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:border-amber-400 hover:scale-105'
                  }`}
                >
                  <AlarmClock className={`h-5 w-5 ${attendanceStatus.isPending ? 'text-amber-600 dark:text-amber-400' : ''}`} />
                  {attendanceStatus.isPending && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white shadow-xs">
                      {attendanceStatus.unmarkedCount}
                    </span>
                  )}
                </button>

                {/* Toast on Alarm Button */}
                {alarmToast && (
                  <div
                    role="alert"
                    onClick={() => setAlarmModalOpen(true)}
                    className="absolute right-0 top-full mt-2.5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-3 py-2 shadow-2xl border border-slate-700/60 dark:border-slate-200 text-xs font-bold whitespace-nowrap cursor-pointer animate-fade-in"
                  >
                    <AlarmClock className="h-4 w-4 text-amber-400 shrink-0 animate-bounce" />
                    <span>{alarmToast}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissAlarmToast();
                      }}
                      className="ml-1 p-0.5 rounded hover:bg-white/20 dark:hover:bg-slate-200 text-slate-400 hover:text-white dark:hover:text-slate-900"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

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
                  <User className="h-4 w-4 md:h-5 md:w-5 text-white" />
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
                    <User className="h-6 w-6 text-white" />
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
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                {/* Thekedar User Guide (Full instructions with photos) */}
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    setGuideModalOpen(true);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-amber-950 dark:text-amber-200 transition hover:bg-amber-100/70 dark:hover:bg-amber-950/60 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div className="text-left">
                      <div className="flex items-center gap-1.5">
                        <span>{t('profile.thekedarGuide', 'Thekedar User Guide')}</span>
                        <span className="rounded bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.2 tracking-wide">
                          PHOTOS
                        </span>
                      </div>
                      <span className="text-[10px] text-amber-700/90 dark:text-amber-400/90 block font-normal">
                        {t('profile.thekedarGuideSub', 'Full instructions & shift codes')}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                </button>

                {/* Attendance Alarm & Reminders */}
                {user.role === 'THEKEDAR' && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      setAlarmModalOpen(true);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-amber-900 dark:text-amber-200 transition hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <AlarmClock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span>{t('alarm.menuTitle', 'Attendance Alarm')}</span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                      {alarmTime}
                    </span>
                  </button>
                )}

                {/* Help & Support Center */}
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    setHelpModalOpen(true);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-amber-900 dark:text-amber-200 transition hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <LifeBuoy className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span>{t('profile.helpCenter', 'Help & Support Center')}</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                </button>

                <button
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-700 dark:text-rose-400 transition hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-800 dark:hover:text-rose-300 cursor-pointer"
                >
                  <LogOut className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <span>{t('nav.logout', 'Sign Out')}</span>
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
      )}
      {/* Help & Support Center Modal */}
      <HelpCenterModal isOpen={helpModalOpen} onClose={() => setHelpModalOpen(false)} />
      {/* Thekedar User Guide Modal */}
      <ThekedarGuideModal isOpen={guideModalOpen} onClose={() => setGuideModalOpen(false)} />
      {/* Thekedar Attendance Alarm Settings Modal */}
      <AttendanceAlarmModal isOpen={alarmModalOpen} onClose={() => setAlarmModalOpen(false)} />
    </header>
  );
};
