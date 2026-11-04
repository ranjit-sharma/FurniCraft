import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';
import { localToday } from '../utils/date';
import {
  isPushSupported,
  getPushSubscription,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from '../utils/pushManager';

const AttendanceAlarmContext = createContext(null);

let activeAudioContext = null;
let activeAlarmInterval = null;
let ringTimeout = null;

/**
 * Start repeating digital alarm ring pattern for the chosen duration
 */
export const startAlarmRing = (durationSeconds = 30) => {
  stopAlarmRing(); // Clear any running audio first
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    activeAudioContext = ctx;

    const playBeepBurst = () => {
      if (!activeAudioContext || activeAudioContext.state === 'closed') return;
      const t = activeAudioContext.currentTime;
      // 3 rapid digital pulses followed by a bright chime
      const pattern = [
        { f: 880, start: 0.0, d: 0.07 },
        { f: 880, start: 0.11, d: 0.07 },
        { f: 880, start: 0.22, d: 0.07 },
        { f: 1174.66, start: 0.33, d: 0.2 }, // D6
      ];
      pattern.forEach(({ f, start, d }) => {
        const osc = activeAudioContext.createOscillator();
        const gain = activeAudioContext.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(f, t + start);
        gain.gain.setValueAtTime(0.18, t + start);
        gain.gain.exponentialRampToValueAtTime(0.001, t + start + d);
        osc.connect(gain);
        gain.connect(activeAudioContext.destination);
        osc.start(t + start);
        osc.stop(t + start + d);
      });
    };

    // Play immediate burst
    playBeepBurst();

    // Repeat burst every 1.25 seconds
    activeAlarmInterval = setInterval(playBeepBurst, 1250);

    // Stop automatically after durationSeconds (unless 0 for continuous)
    if (durationSeconds > 0) {
      ringTimeout = setTimeout(() => {
        stopAlarmRing();
      }, durationSeconds * 1000);
    }
  } catch (err) {
    console.warn('Audio alarm ring playback not supported or blocked:', err);
  }
};

/**
 * Stop any currently ringing alarm
 */
export const stopAlarmRing = () => {
  if (ringTimeout) {
    clearTimeout(ringTimeout);
    ringTimeout = null;
  }
  if (activeAlarmInterval) {
    clearInterval(activeAlarmInterval);
    activeAlarmInterval = null;
  }
  if (activeAudioContext) {
    try {
      activeAudioContext.close();
    } catch {}
    activeAudioContext = null;
  }
};

export const sendSystemNotification = (title, body) => {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      return new Notification(title, {
        body,
        icon: '/furnicraft-icon.png',
        badge: '/furnicraft-icon.png',
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

  // Alarm settings persisted in localStorage and server
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

  const [ringDuration, setRingDurationState] = useState(() => {
    try {
      const saved = localStorage.getItem('furnicraft_attendance_ring_duration');
      return saved !== null ? JSON.parse(saved) : 30; // 30 seconds default
    } catch {
      return 30;
    }
  });

  const [notificationPermission, setNotificationPermission] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';
  });

  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);

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

  // Check existing push subscription on mount
  useEffect(() => {
    if (isThekedar && isPushSupported()) {
      getPushSubscription().then((sub) => {
        setIsPushSubscribed(Boolean(sub));
      });
    }
  }, [isThekedar]);

  // Sync settings with backend on mount
  useEffect(() => {
    if (isThekedar) {
      api
        .get('/notifications/alarm-settings')
        .then((res) => {
          const d = res?.data || res;
          if (d && typeof d === 'object') {
            if (typeof d.alarmEnabled === 'boolean') {
              setAlarmEnabledState(d.alarmEnabled);
              localStorage.setItem('furnicraft_attendance_alarm_enabled', JSON.stringify(d.alarmEnabled));
            }
            if (d.alarmTime) {
              setAlarmTimeState(d.alarmTime);
              localStorage.setItem('furnicraft_attendance_alarm_time', d.alarmTime);
            }
            if (typeof d.alarmSound === 'boolean') {
              setAlarmSoundState(d.alarmSound);
              localStorage.setItem('furnicraft_attendance_alarm_sound', JSON.stringify(d.alarmSound));
            }
            if (d.ringDuration) {
              setRingDurationState(d.ringDuration);
              localStorage.setItem('furnicraft_attendance_ring_duration', JSON.stringify(d.ringDuration));
            }
            if (typeof d.hasActiveSubscription === 'boolean') {
              setIsPushSubscribed(d.hasActiveSubscription);
            }
          }
        })
        .catch(() => {});
    }
  }, [isThekedar]);

  const updateServerSettings = useCallback((updates) => {
    if (isThekedar) {
      api.patch('/notifications/alarm-settings', updates).catch(() => {});
    }
  }, [isThekedar]);

  const setAlarmEnabled = (val) => {
    setAlarmEnabledState(val);
    try {
      localStorage.setItem('furnicraft_attendance_alarm_enabled', JSON.stringify(val));
    } catch {}
    updateServerSettings({ alarmEnabled: val });
  };

  const setAlarmTime = (val) => {
    setAlarmTimeState(val);
    try {
      localStorage.setItem('furnicraft_attendance_alarm_time', val);
    } catch {}
    updateServerSettings({ alarmTime: val });
  };

  const setAlarmSound = (val) => {
    setAlarmSoundState(val);
    try {
      localStorage.setItem('furnicraft_attendance_alarm_sound', JSON.stringify(val));
    } catch {}
    updateServerSettings({ alarmSound: val });
  };

  const setRingDuration = (val) => {
    const num = Number(val) || 30;
    setRingDurationState(num);
    try {
      localStorage.setItem('furnicraft_attendance_ring_duration', JSON.stringify(num));
    } catch {}
    updateServerSettings({ ringDuration: num });
  };

  const dismissBanner = (hours = 2) => {
    setIsBannerDismissed(true);
    try {
      const snoozedUntil = Date.now() + hours * 60 * 60 * 1000;
      localStorage.setItem('furnicraft_attendance_banner_snooze', String(snoozedUntil));
    } catch {}
  };

  const triggerAlarmRing = useCallback(() => {
    setIsAlarmRinging(true);
    if (alarmSound) {
      startAlarmRing(ringDuration);
      if (ringDuration > 0) {
        setTimeout(() => {
          setIsAlarmRinging(false);
        }, ringDuration * 1000);
      }
    }
  }, [alarmSound, ringDuration]);

  const stopCurrentAlarm = useCallback(() => {
    stopAlarmRing();
    setIsAlarmRinging(false);
  }, []);

  // Request browser/OS notification permission
  const requestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    try {
      const res = await Notification.requestPermission();
      setNotificationPermission(res);
      return res;
    } catch {
      return 'denied';
    }
  };

  // Subscribe this mobile/desktop device to Push Notifications
  const enableMobilePush = async () => {
    setIsPushLoading(true);
    try {
      await subscribeToPushNotifications({
        alarmTime,
        alarmEnabled,
        alarmSound,
        ringDuration,
      });
      setIsPushSubscribed(true);
      setNotificationPermission('granted');
      return { success: true };
    } catch (err) {
      console.error('Error enabling mobile push:', err);
      return { success: false, message: err.message };
    } finally {
      setIsPushLoading(false);
    }
  };

  // Unsubscribe this device from push notifications
  const disableMobilePush = async () => {
    setIsPushLoading(true);
    try {
      await unsubscribeFromPushNotifications();
      setIsPushSubscribed(false);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setIsPushLoading(false);
    }
  };

  // Dispatch an immediate test mobile push notification
  const sendTestPush = async () => {
    try {
      const res = await api.post('/notifications/test-push');
      return { success: true, message: res.data?.message };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || err.message };
    }
  };

  // Fetch live dashboard metrics to determine attendance status
  const refreshAttendanceStatus = useCallback(async () => {
    if (!user || !isThekedar) return;

    try {
      const today = localToday();
      const res = await api.get(`/reports/dashboard?date=${today}`);
      const rawWorkers = res.data?.data?.activeWorkers || [];

      if (Array.isArray(rawWorkers)) {
        const onLeaveWorkers = rawWorkers.filter((w) => w.today?.code === 'LEAVE');
        const regularWorkers = rawWorkers.filter((w) => w.today?.code !== 'LEAVE');
        const markedCount = regularWorkers.filter((w) => Boolean(w.today)).length;
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

        // If all marked, stop any active alarm ringing
        if (!isPending) {
          stopCurrentAlarm();
        }
      }
    } catch (err) {
      // Quietly ignore network failures in background check
    }
  }, [user, isThekedar, stopCurrentAlarm]);

  // Initial fetch and polling every 60s
  useEffect(() => {
    if (isThekedar) {
      refreshAttendanceStatus();
      const pollId = setInterval(refreshAttendanceStatus, 60000);
      return () => clearInterval(pollId);
    }
  }, [isThekedar, refreshAttendanceStatus]);

  // Test Alarm trigger (Audio + In-app notification)
  const testAlarm = useCallback(() => {
    triggerAlarmRing();
    const title = '⏰ FurniCraft Attendance Alarm';
    const body = attendanceStatus.isPending
      ? `You have ${attendanceStatus.unmarkedCount} craftsman pending attendance today! Tap to record.`
      : "Daily Attendance Alarm is set and working! You'll be alerted if any craftsman attendance is pending.";
    sendSystemNotification(title, body);
  }, [triggerAlarmRing, attendanceStatus]);

  // In-Tab Alarm Clock Monitor: Checks every 20 seconds when app is in foreground
  const lastFiredRef = useRef('');
  useEffect(() => {
    if (!isThekedar || !alarmEnabled) return;

    const checkAlarm = () => {
      const today = localToday();
      const now = new Date();
      const currentHH = String(now.getHours()).padStart(2, '0');
      const currentMM = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHH}:${currentMM}`;

      // Check if alarm time matches current minute and not already fired today in foreground
      if (currentTime === alarmTime && lastFiredRef.current !== today) {
        // Only ring if attendance is actually pending!
        if (attendanceStatus.isPending) {
          lastFiredRef.current = today;
          try {
            localStorage.setItem('furnicraft_attendance_alarm_last_fired', today);
          } catch {}

          triggerAlarmRing();

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
  }, [isThekedar, alarmEnabled, alarmTime, attendanceStatus, triggerAlarmRing]);

  return (
    <AttendanceAlarmContext.Provider
      value={{
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
        refreshAttendanceStatus,
        notificationPermission,
        requestPermission,
        isPushSubscribed,
        isPushLoading,
        enableMobilePush,
        disableMobilePush,
        sendTestPush,
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
      ringDuration: 30,
      setRingDuration: () => {},
      isAlarmRinging: false,
      stopCurrentAlarm: () => {},
      attendanceStatus: { isPending: false, unmarkedCount: 0, markedCount: 0, totalWorkers: 0 },
      refreshAttendanceStatus: () => {},
      notificationPermission: 'default',
      requestPermission: async () => 'default',
      isPushSubscribed: false,
      isPushLoading: false,
      enableMobilePush: async () => ({ success: false }),
      disableMobilePush: async () => ({ success: false }),
      sendTestPush: async () => ({ success: false }),
      testAlarm: () => {},
      isBannerDismissed: true,
      dismissBanner: () => {},
    };
  }
  return context;
};
