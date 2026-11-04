import React, { useState } from 'react';
import {
  AlarmClock,
  BellRing,
  Volume2,
  VolumeX,
  Clock,
  ShieldCheck,
  Check,
  Play,
  Square,
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
    notificationPermission,
    requestPermission,
    testAlarm,
  } = useAttendanceAlarm();

  const { t, language } = useLanguage();
  const [testTriggered, setTestTriggered] = useState(false);

  const handleTest = () => {
    testAlarm();
    setTestTriggered(true);
    if (isPushSubscribed) {
      sendTestPush().catch(() => {});
    }
    setTimeout(() => setTestTriggered(false), 3500);
  };

  const handleRequestPermission = async () => {
    const res = await requestPermission();
    if (res === 'granted') {
      await enableMobilePush();
    }
  };

  const todayStr = new Date().toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const RING_DURATIONS = [
    { label: '10 sec', value: 10 },
    { label: '30 sec', value: 30 },
    { label: '1 min', value: 60 },
    { label: '2 min', value: 120 },
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
              {t('alarm.modalTitle', 'Attendance Alarm & Reminder')}
            </h3>
            <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">{todayStr}</p>
          </div>
        </div>
      }
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Ringing Alarm Alert Banner (if actively ringing) */}
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
              {/* Customized Alarm Time Selection (clean without preset chips) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      {t('alarm.alarmTime', 'Custom Alarm Time')}
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Choose exact time for attendance reminder
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <input
                      type="time"
                      value={alarmTime}
                      onChange={(e) => setAlarmTime(e.target.value)}
                      className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-sm font-bold text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none cursor-pointer"
                    />
                  </div>
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
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                              isSelected
                                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
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

              {/* System Notification Bar Status */}
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      {t('alarm.osNotification', 'Mobile / Notification Bar Alerts')}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {notificationPermission === 'granted'
                        ? t('alarm.osAllowed', '✓ Allowed on lock screen & notification tray')
                        : t('alarm.osPrompt', 'Allow to show alarms on your phone notification bar')}
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
              onClick={handleTest}
              className="text-xs"
            >
              {testTriggered ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="h-3 w-3" /> Alarm Tested!
                </span>
              ) : (
                t('alarm.testAlarm', 'Test Alarm Now')
              )}
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
