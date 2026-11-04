import { PushSubscription, WorkerProfile, Attendance, User } from '../models/index.js';
import { sendPushNotification } from './notificationService.js';

let schedulerInterval = null;

export const getLocalTimeInfo = (tz = 'Asia/Kolkata') => {
  try {
    const now = new Date();
    const timeFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return {
      time: timeFormatter.format(now), // "09:30"
      date: dateFormatter.format(now), // "2026-11-04"
    };
  } catch {
    const now = new Date();
    const ist = new Date(now.getTime() + (5.5 * 60 + now.getTimezoneOffset()) * 60000);
    const hh = String(ist.getHours()).padStart(2, '0');
    const mm = String(ist.getMinutes()).padStart(2, '0');
    const yyyy = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, '0');
    const d = String(ist.getDate()).padStart(2, '0');
    return { time: `${hh}:${mm}`, date: `${yyyy}-${m}-${d}` };
  }
};

/**
 * Check and fire attendance alarms for any Thekedar whose customized alarm time matches now
 */
export const checkAndFireAttendanceAlarms = async () => {
  try {
    const subscriptions = await PushSubscription.find({ alarmEnabled: true });
    if (!subscriptions || subscriptions.length === 0) return;

    // Group subscriptions by userId to check attendance once per Thekedar
    const thekedarMap = new Map();
    for (const sub of subscriptions) {
      const uid = sub.userId.toString();
      if (!thekedarMap.has(uid)) {
        thekedarMap.set(uid, []);
      }
      thekedarMap.get(uid).push(sub);
    }

    for (const [thekedarId, userSubs] of thekedarMap.entries()) {
      const primarySub = userSubs[0];
      const { time: currentTime, date: currentDate } = getLocalTimeInfo(primarySub.timezone || 'Asia/Kolkata');

      // Check if configured alarm time matches the current minute
      if (primarySub.alarmTime !== currentTime) {
        continue;
      }

      // Check if all subs have already fired today
      const pendingSubs = userSubs.filter((s) => s.lastFiredDate !== currentDate);
      if (pendingSubs.length === 0) {
        continue;
      }

      // Verify user is active Thekedar
      const thekedar = await User.findById(thekedarId);
      if (!thekedar || thekedar.role !== 'THEKEDAR' || thekedar.status !== 'ACTIVE') {
        continue;
      }

      // Fetch workers managed by this Thekedar
      const workerProfiles = await WorkerProfile.find({ thekedarId });
      if (!workerProfiles || workerProfiles.length === 0) {
        // No workers in workforce, mark fired to prevent repeating checks
        await PushSubscription.updateMany(
          { _id: { $in: pendingSubs.map((s) => s._id) } },
          { lastFiredDate: currentDate }
        );
        continue;
      }

      // Check today's attendance logs for this Thekedar
      const attendanceLogs = await Attendance.find({
        thekedarId,
        date: currentDate,
      });

      const markedWorkerIds = new Set(attendanceLogs.map((a) => a.workerId.toString()));
      const unmarkedWorkers = workerProfiles.filter(
        (wp) => !markedWorkerIds.has(wp.userId.toString())
      );

      // Only fire alarm notification if attendance is actually pending!
      if (unmarkedWorkers.length > 0) {
        const payload = {
          title: '⏰ Attendance Alarm — FurniCraft',
          body: `You have ${unmarkedWorkers.length} craftsman waiting for today's attendance (${workerProfiles.length - unmarkedWorkers.length}/${workerProfiles.length} marked). Tap to record.`,
          icon: '/furnicraft-icon.png',
          badge: '/furnicraft-icon.png',
          tag: 'furnicraft-attendance-alarm',
          timestamp: Date.now(),
          requireInteraction: true,
          sound: '/alarm.mp3',
          vibrate: [600, 200, 600, 200, 600, 200, 1000],
          silent: false,
          data: {
            url: '/?openAttendance=true',
            unmarkedCount: unmarkedWorkers.length,
            totalWorkers: workerProfiles.length,
            date: currentDate,
            type: 'ATTENDANCE_ALARM',
          },
          actions: [
            { action: 'open', title: '📋 Mark Attendance' },
          ],
        };

        // Send push to each pending device
        for (const sub of pendingSubs) {
          await sendPushNotification(sub, payload);
          sub.lastFiredDate = currentDate;
          await sub.save();
        }

        console.log(
          `[AlarmScheduler] Dispatched alarm push to Thekedar ${thekedar.name} (${thekedarId}): ${unmarkedWorkers.length} workers unmarked.`
        );
      } else {
        // All workers marked for today, mark fired for today so no further pushes occur
        await PushSubscription.updateMany(
          { _id: { $in: pendingSubs.map((s) => s._id) } },
          { lastFiredDate: currentDate }
        );
      }
    }
  } catch (err) {
    console.error('[AlarmScheduler] Error checking attendance alarms:', err);
  }
};

/**
 * Start the background scheduler running every 30 seconds
 */
export const startAttendanceAlarmScheduler = () => {
  if (schedulerInterval) return;
  console.log('[AlarmScheduler] Attendance Alarm background scheduler started (checks every 30s).');
  // Initial run after short delay
  setTimeout(() => {
    checkAndFireAttendanceAlarms();
  }, 5000);

  schedulerInterval = setInterval(checkAndFireAttendanceAlarms, 30000);
};

export const stopAttendanceAlarmScheduler = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[AlarmScheduler] Attendance Alarm background scheduler stopped.');
  }
};
