import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlarmClock,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Check,
  Play,
  X,
} from 'lucide-react';
import { useAttendanceAlarm } from '../../context/AttendanceAlarmContext';
import { useLanguage } from '../../context/LanguageContext';
import { Modal } from './Modal';
import { Button } from './Button';

export const AttendanceAlarmModal = ({ isOpen, onClose }) => {
  const {
    alarmEnabled,
    setAlarmEnabled,
    alarmTime,
    setAlarmTime,
    alarmSound,
    setAlarmSound,
    attendanceStatus,
    notificationPermission,
    requestPermission,
    testAlarm,
  } = useAttendanceAlarm();

  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [testTriggered, setTestTriggered] = useState(false);

  const handleTakeAttendance = () => {
    onClose();
    navigate('/');
    setTimeout(() => {
      const el = document.getElementById('today-attendance-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  const handleTest = () => {
    testAlarm();
    setTestTriggered(true);
    setTimeout(() => setTestTriggered(false), 3000);
  };

  const handleRequestPermission = async () => {
    await requestPermission();
  };

  const todayStr = new Date().toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
            <AlarmClock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t('alarm.modalTitle', 'Attendance Alarm & Reminder')}
            </h3>
            <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">{todayStr}</p>
          </div>
        </div>
      }
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Today's Attendance Status Card */}
        <div
          className={`rounded-2xl p-4 border transition-all ${
            attendanceStatus.isPending
              ? 'bg-gradient-to-br from-amber-50 to-rose-50/50 dark:from-amber-950/40 dark:to-rose-950/20 border-amber-300 dark:border-amber-800'
              : 'bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/40 dark:to-teal-950/20 border-emerald-300 dark:border-emerald-800'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {attendanceStatus.isPending ? (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                  <AlertTriangle className="h-5 w-5 animate-pulse" />
                </div>
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              )}

              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {attendanceStatus.isPending
                    ? t('alarm.statusPending', 'Attendance Pending')
                    : t('alarm.statusComplete', 'Attendance Complete')}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {attendanceStatus.isPending
                    ? `${attendanceStatus.unmarkedCount} craftsman waiting to be marked today (${attendanceStatus.markedCount}/${attendanceStatus.totalWorkers} marked)`
                    : `All ${attendanceStatus.totalWorkers} craftsmen have been marked for today!`}
                </p>
                {attendanceStatus.onLeaveCount > 0 && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium mt-0.5">
                    ({attendanceStatus.onLeaveCount} on leave today)
                  </p>
                )}
              </div>
            </div>
          </div>

          {attendanceStatus.isPending && (
            <Button
              className="mt-3.5 w-full justify-center shadow-xs"
              variant="primary"
              size="sm"
              icon={ArrowRight}
              onClick={handleTakeAttendance}
            >
              {t('alarm.markNow', 'Mark Today’s Attendance Now')}
            </Button>
          )}
        </div>

        {/* Daily Alarm Settings */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <BellRing className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>{t('alarm.enableDailyAlarm', 'Daily Attendance Alarm')}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('alarm.enableSub', 'Alerts you automatically every day to take attendance')}
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={alarmEnabled}
                onChange={(e) => setAlarmEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {alarmEnabled && (
            <>
              {/* Alarm Time Picker */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    {t('alarm.alarmTime', 'Alarm Time')}
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t('alarm.alarmTimeSub', 'Reminder triggers at this time if attendance is pending')}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <input
                    type="time"
                    value={alarmTime}
                    onChange={(e) => setAlarmTime(e.target.value)}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-sm font-bold text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Sound Chime Toggle */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    {alarmSound ? <Volume2 className="h-3.5 w-3.5 text-amber-600" /> : <VolumeX className="h-3.5 w-3.5 text-slate-400" />}
                    <span>{t('alarm.soundChime', 'Audio Alarm Chime')}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t('alarm.soundChimeSub', 'Plays audible chime sound when alarm triggers')}
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alarmSound}
                    onChange={(e) => setAlarmSound(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-amber-600"></div>
                </label>
              </div>

              {/* System Notification Bar Status */}
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      {t('alarm.osNotification', 'System Notification Bar Alerts')}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {notificationPermission === 'granted'
                        ? t('alarm.osAllowed', '✓ Allowed in Android, Windows & macOS notification tray')
                        : t('alarm.osPrompt', 'Allow to show alarms in your device notification bar')}
                    </span>
                  </div>

                  {notificationPermission === 'granted' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <ShieldCheck className="h-3 w-3" /> Enabled
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestPermission}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition cursor-pointer shrink-0"
                    >
                      {t('alarm.enableBtn', 'Enable')}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={Play}
            onClick={handleTest}
            className="text-xs"
          >
            {testTriggered ? (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <Check className="h-3 w-3" /> Alarm Tested!
              </span>
            ) : (
              t('alarm.testAlarm', 'Test Alarm Now')
            )}
          </Button>

          <Button type="button" variant="primary" size="sm" onClick={onClose}>
            {t('common.done', 'Done')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
