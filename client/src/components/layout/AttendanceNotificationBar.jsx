import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlarmClock, ArrowRight, X, Clock } from 'lucide-react';
import { useAttendanceAlarm } from '../../context/AttendanceAlarmContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export const AttendanceNotificationBar = () => {
  const { isThekedar } = useAuth();
  const { attendanceStatus, isBannerDismissed, dismissBanner } = useAttendanceAlarm();
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (!isThekedar || !attendanceStatus.isPending || isBannerDismissed) {
    return null;
  }

  const handleGoToAttendance = () => {
    navigate('/');
    // Smooth scroll down to the attendance roster if already on the page
    setTimeout(() => {
      const el = document.getElementById('today-attendance-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  return (
    <div
      role="alert"
      className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] md:top-16 z-30 flex items-center justify-between gap-3 bg-gradient-to-r from-amber-600 via-amber-700 to-rose-700 text-white px-3 sm:px-4 py-2 text-xs font-semibold shadow-md animate-fade-in transition-all"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white">
          <AlarmClock className="h-4 w-4 animate-bounce" />
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-300"></span>
          </span>
        </span>

        <div className="truncate">
          <span className="font-extrabold uppercase tracking-wide text-amber-200 mr-1.5">
            {t('alarm.barTitle', 'Attendance Alarm')}:
          </span>
          <span className="font-medium text-white">
            {t(
              'alarm.barPendingMsg',
              `${attendanceStatus.unmarkedCount} craftsman waiting for today's attendance (${attendanceStatus.markedCount}/${attendanceStatus.totalWorkers} marked)`
            )}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleGoToAttendance}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white text-amber-900 font-bold hover:bg-amber-50 active:scale-95 transition shadow-xs cursor-pointer text-[11px]"
        >
          <span>{t('alarm.takeNow', 'Take Attendance')}</span>
          <ArrowRight className="h-3 w-3" />
        </button>

        <button
          type="button"
          onClick={() => dismissBanner(2)}
          title="Snooze reminder for 2 hours"
          className="p-1 rounded-lg hover:bg-white/10 text-amber-100 hover:text-white transition cursor-pointer"
          aria-label="Snooze attendance reminder"
        >
          <Clock className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() => dismissBanner(24)}
          title="Dismiss reminder"
          className="p-1 rounded-lg hover:bg-white/10 text-amber-100 hover:text-white transition cursor-pointer"
          aria-label="Dismiss attendance reminder"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
