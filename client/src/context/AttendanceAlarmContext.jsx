import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';
import { localToday } from '../utils/date';

const AttendanceAlarmContext = createContext(null);

export const playAlarmChime = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [
      { freq: 523.25, time: 0.0, dur: 0.2 }, // C5
      { freq: 659.25, time: 0.18, dur: 0.2 }, // E5
      { freq: 783.99, time: 0.36, dur: 0.25 }, // G5
      { freq: 1046.5, time: 0.6, dur: 0.5 },  // C6
    ];
    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + dur);
    });
  } catch (err) {
    console.warn('Audio alarm playback not supported or blocked:', err);
  }
};

export const sendSystemNotification = (title, body) => {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      return new Notification(title, {
        body,
        icon: '/furnicraft-icon.svg',
        badge: '/furnicraft-icon.svg',
        tag: 'furnicraft-attendance-alarm',
        renotify: true,
      });
    } catch (err) {
      console.warn('Native notification failed:', err);
    }
  }
  return null;
};

export const AttendanceAlarmProvider = ({ children }) => {
  const { user, isThekedar } = useAuth();

  // Alarm settings persisted in localStorage
  const [alarmEnabled, setAlarmEnabledState] = useState(() => {
    try {
      const saved = localStorage.getItem('furnicraft_attendance_alarm_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [alarmTime, setAlarmTimeState] = useState(() => {
    try {
      return localStorage.getItem('furnicraft_attendance_alarm_time') || '09:30';
    } catch {
      return '09:30';
    }
  });

  const [alarmSound, setAlarmSoundState] = useState(() => {
    try {
      const saved = localStorage.getItem('furnicraft_attendance_alarm_sound');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [notificationPermission, setNotificationPermission] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';
  });

  // Attendance live metrics
  const [attendanceStatus, setAttendanceStatus] = useState({
    totalWorkers: 0,
    markedCount: 0,
    unmarkedCount: 0,
    onLeaveCount: 0,
    isPending: false,
    loading: false,
  });

  // Banner snooze/dismiss state for current session
  const [isBannerDismissed, setIsBannerDismissed] = useState(() => {
    try {
      const snoozedUntil = localStorage.getItem('furnicraft_attendance_banner_snooze');
      if (snoozedUntil && Date.now() < Number(snoozedUntil)) return true;
    } catch {}
    return false;
  });

  const setAlarmEnabled = (val) => {
    setAlarmEnabledState(val);
    try {
      localStorage.setItem('furnicraft_attendance_alarm_enabled', JSON.stringify(val));
    } catch {}
  };

  const setAlarmTime = (val) => {
    setAlarmTimeState(val);
    try {
      localStorage.setItem('furnicraft_attendance_alarm_time', val);
    } catch {}
  };

  const setAlarmSound = (val) => {
    setAlarmSoundState(val);
    try {
      localStorage.setItem('furnicraft_attendance_alarm_sound', JSON.stringify(val));
    } catch {}
  };

  const requestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        setNotificationPermission(res);
        return res;
      } catch (err) {
        console.warn('Request notification permission failed:', err);
      }
    }
    return 'unsupported';
  };

  const dismissBanner = (hours = 2) => {
    setIsBannerDismissed(true);
    try {
      localStorage.setItem('furnicraft_attendance_banner_snooze', String(Date.now() + hours * 3600 * 1000));
    } catch {}
  };

  // Fetch today's attendance summary for thekedar
  const refreshAttendanceStatus = useCallback(async () => {
    if (!user || !isThekedar) return;
    try {
      const today = localToday();
      const res = await api.get(`/reports/dashboard?date=${today}`);
      const d = res.data;
      if (d) {
        const allActiveWorkers = (d.workers || []).filter((w) => w.status === 'ACTIVE');
        const onLeaveWorkers = allActiveWorkers.filter((w) => w.today?.code === 'LEAVE');
        const regularWorkers = allActiveWorkers.filter((w) => w.today?.code !== 'LEAVE');
        const markedCount = regularWorkers.filter((w) => w.today?.code).length;
        const unmarkedCount = regularWorkers.length - markedCount;
        const isPending = regularWorkers.length > 0 && unmarkedCount > 0;

        setAttendanceStatus({
          totalWorkers: regularWorkers.length,
          markedCount,
          unmarkedCount,
          onLeaveCount: onLeaveWorkers.length,
          isPending,
          loading: false,
        });
      }
    } catch (err) {
      // Quietly ignore network failures in background check
    }
  }, [user, isThekedar]);

  // Initial fetch and polling every 60s
  useEffect(() => {
    if (isThekedar) {
      refreshAttendanceStatus();
      const pollId = setInterval(refreshAttendanceStatus, 60000);
      return () => clearInterval(pollId);
    }
  }, [isThekedar, refreshAttendanceStatus]);

  // Test Alarm trigger
  const testAlarm = useCallback(() => {
    if (alarmSound) {
      playAlarmChime();
    }
    const title = '⏰ FurniCraft Attendance Alarm';
    const body = attendanceStatus.isPending
      ? `You have ${attendanceStatus.unmarkedCount} craftsman pending attendance today! Tap to record.`
      : "Daily Attendance Alarm is set and working! You'll be alerted if any craftsman attendance is pending.";
    sendSystemNotification(title, body);
  }, [alarmSound, attendanceStatus]);

  // Background Alarm Clock Monitor: Checks every 20 seconds
  const lastFiredRef = useRef('');
  useEffect(() => {
    if (!isThekedar || !alarmEnabled) return;

    const checkAlarm = () => {
      const today = localToday();
      const now = new Date();
      const currentHH = String(now.getHours()).padStart(2, '0');
      const currentMM = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHH}:${currentMM}`;

      // Check if alarm time matches current minute and not already fired today
      if (currentTime === alarmTime && lastFiredRef.current !== today) {
        // Only ring if attendance is actually pending!
        if (attendanceStatus.isPending) {
          lastFiredRef.current = today;
          try {
            localStorage.setItem('furnicraft_attendance_alarm_last_fired', today);
          } catch {}

          if (alarmSound) {
            playAlarmChime();
          }

          sendSystemNotification(
            '⏰ Daily Attendance Alarm — FurniCraft',
            `Time to mark attendance! You have ${attendanceStatus.unmarkedCount} craftsman waiting to be marked today.`
          );

          // Restore banner visibility if it was snoozed
          setIsBannerDismissed(false);
          try {
            localStorage.removeItem('furnicraft_attendance_banner_snooze');
          } catch {}
        }
      }
    };

    const intervalId = setInterval(checkAlarm, 20000);
    return () => clearInterval(intervalId);
  }, [isThekedar, alarmEnabled, alarmTime, alarmSound, attendanceStatus]);

  return (
    <AttendanceAlarmContext.Provider
      value={{
        alarmEnabled,
        setAlarmEnabled,
        alarmTime,
        setAlarmTime,
        alarmSound,
        setAlarmSound,
        attendanceStatus,
        refreshAttendanceStatus,
        notificationPermission,
        requestPermission,
        testAlarm,
        isBannerDismissed,
        dismissBanner,
      }}
    >
      {children}
    </AttendanceAlarmContext.Provider>
  );
};

export const useAttendanceAlarm = () => {
  const context = useContext(AttendanceAlarmContext);
  if (!context) {
    return {
      alarmEnabled: false,
      setAlarmEnabled: () => {},
      alarmTime: '09:30',
      setAlarmTime: () => {},
      alarmSound: true,
      setAlarmSound: () => {},
      attendanceStatus: { isPending: false, unmarkedCount: 0, markedCount: 0, totalWorkers: 0 },
      refreshAttendanceStatus: () => {},
      notificationPermission: 'default',
      requestPermission: async () => 'default',
      testAlarm: () => {},
      isBannerDismissed: true,
      dismissBanner: () => {},
    };
  }
  return context;
};
