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
  Square,
  Smartphone,
  Send,
  Loader2,
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
    ringDuration,
    setRingDuration,
    isAlarmRinging,
    stopCurrentAlarm,
    attendanceStatus,
    notificationPermission,
    requestPermission,
    isPushSubscribed,
    isPushLoading,
    enableMobilePush,
    disableMobilePush,
    sendTestPush,
    testAlarm,
  } = useAttendanceAlarm();

  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [testPushStatus, setTestPushStatus] = useState(null);
  const [isSendingTestPush, setIsSendingTestPush] = useState(false);

  const handleTakeAttendance = () => {
    stopCurrentAlarm();
    onClose();
    navigate('/');
    setTimeout(() => {
      const el = document.getElementById('today-attendance-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  const handleToggleMobilePush = async () => {
    setTestPushStatus(null);
    if (isPushSubscribed) {
      await disableMobilePush();
      setTestPushStatus({ type: 'info', text: 'Mobile notifications turned off on this device.' });
    } else {
      const res = await enableMobilePush();
      if (res.success) {
        setTestPushStatus({
          type: 'success',
          text: '✓ Mobile alerts enabled! You will be reminded even when the app is completely closed.',
        });
      } else {
        setTestPushStatus({
          type: 'error',
          text: res.message || 'Could not enable notifications. Please check browser permissions.',
        });
      }
    }
    setTimeout(() => setTestPushStatus(null), 6000);
  };

  const handleSendTestPush = async () => {
    setIsSendingTestPush(true);
    setTestPushStatus(null);
    const res = await sendTestPush();
    setIsSendingTestPush(false);
    if (res.success) {
      setTestPushStatus({ type: 'success', text: 'Mobile notification sent! Check your phone notification tray.' });
    } else {
      setTestPushStatus({ type: 'error', text: res.message || 'Failed to dispatch mobile notification.' });
    }
    setTimeout(() => setTestPushStatus(null), 5000);
  };

  const todayStr = new Date().toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const QUICK_TIMES = [
    { label: '08:00 AM', time: '08:00' },
    { label: '09:00 AM', time: '09:00' },
    { label: '09:30 AM', time: '09:30' },
    { label: '10:00 AM', time: '10:00' },
    { label: '11:00 AM', time: '11:00' },
    { label: '06:00 PM', time: '18:00' },
  ];

  const RING_DURATIONS = [
    { label: '10 sec', value: 10 },
    { label: '30 sec', value: 30 },
    { label: '1 min', value: 60 },
    { label: 'Continuous', value: 0 },
  ];

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
              {t('alarm.modalTitle', 'Attendance Alarm & Mobile Reminder')}
            </h3>
            <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">{todayStr}</p>
          </div>
        </div>
      }
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Ringing Alarm Alert Banner (if ringing) */}
        {isAlarmRinging && (
          <div className="rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 text-white p-3.5 shadow-lg flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white text-lg">
                ⏰
              </span>
              <div className="truncate">
                <h4 className="font-extrabold text-sm leading-tight">Alarm Ringing!</h4>
                <p className="text-xs text-amber-100 truncate">Time to mark craftsman attendance</p>
              </div>
            </div>
            <button
              type="button"
              onClick={stopCurrentAlarm}
              className="px-3 py-1.5 rounded-xl bg-white text-rose-700 font-extrabold text-xs shadow-md hover:bg-rose-50 active:scale-95 transition cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <Square className="h-3.5 w-3.5 fill-current" /> Stop Alarm
            </button>
          </div>
        )}

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

        {/* Mobile Background Notifications (Works Even When App is Closed) */}
        <div className="rounded-2xl border-2 border-amber-500/40 dark:border-amber-500/30 bg-gradient-to-br from-amber-50/60 to-orange-50/30 dark:from-amber-950/30 dark:to-slate-900 p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white">
                <Smartphone className="h-4 w-4" />
              </div>
              <div>
                <span className="font-extrabold text-xs text-slate-900 dark:text-white block">
                  Mobile Notification (App Closed)
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Receive phone notifications even when the app is completely closed
                </span>
              </div>
            </div>

            {isPushSubscribed ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                <ShieldCheck className="h-3 w-3" /> Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Off
              </span>
            )}
          </div>

          <div className="pt-2 border-t border-amber-200/60 dark:border-slate-800 flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={isPushLoading}
              onClick={handleToggleMobilePush}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                isPushSubscribed
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                  : 'bg-amber-600 hover:bg-amber-700 text-white active:scale-95'
              }`}
            >
              {isPushLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{isPushSubscribed ? 'Subscribed on this Device' : '🔔 Enable Mobile Push Alerts'}</span>
            </button>

            {isPushSubscribed && (
              <button
                type="button"
                disabled={isSendingTestPush}
                onClick={handleSendTestPush}
                title="Send a real test notification to this phone"
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-amber-300 dark:border-slate-700 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-slate-700 transition flex items-center gap-1 cursor-pointer"
              >
                {isSendingTestPush ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                <span>Test Phone Alert</span>
              </button>
            )}
          </div>

          {testPushStatus && (
            <p
              className={`text-[11px] font-medium p-2 rounded-lg ${
                testPushStatus.type === 'success'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {testPushStatus.text}
            </p>
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
              {/* Customized Alarm Time Selection */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      {t('alarm.alarmTime', 'Custom Alarm Time')}
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Choose exact time for mobile reminder and ringing
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

                {/* Quick Time Preset Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_TIMES.map((preset) => {
                    const isSelected = alarmTime === preset.time;
                    return (
                      <button
                        key={preset.time}
                        type="button"
                        onClick={() => setAlarmTime(preset.time)}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                          isSelected
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Alarm Sound & Ring Duration */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      {alarmSound ? <Volume2 className="h-3.5 w-3.5 text-amber-600" /> : <VolumeX className="h-3.5 w-3.5 text-slate-400" />}
                      <span>{t('alarm.soundChime', 'Audible Alarm Ring')}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Rings loudly when reminder triggers
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

                {alarmSound && (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Ring Duration:
                    </span>
                    <div className="flex items-center gap-1">
                      {RING_DURATIONS.map((dur) => {
                        const isSelected = ringDuration === dur.value;
                        return (
                          <button
                            key={dur.value}
                            type="button"
                            onClick={() => setRingDuration(dur.value)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                              isSelected
                                ? 'bg-amber-600 text-white border-amber-600'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                            }`}
                          >
                            {dur.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-2 pt-2">
          {isAlarmRinging ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              icon={Square}
              onClick={stopCurrentAlarm}
              className="text-xs font-bold"
            >
              Stop Ringing
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Play}
              onClick={testAlarm}
              className="text-xs"
            >
              Test Alarm Sound
            </Button>
          )}

          <Button type="button" variant="primary" size="sm" onClick={onClose}>
            {t('common.done', 'Done')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
