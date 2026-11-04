import { PushSubscription, WorkerProfile, Attendance } from '../models/index.js';
import { env } from '../config/env.js';
import { sendPushNotification } from '../services/notificationService.js';
import { getLocalTimeInfo } from '../services/attendanceAlarmScheduler.js';

/**
 * Return VAPID Public Key for client-side PushManager registration
 */
export const getVapidPublicKey = (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      publicKey: env.VAPID_PUBLIC_KEY,
    },
  });
};

/**
 * Register or update a device Web Push Subscription
 */
export const subscribePush = async (req, res) => {
  try {
    const { endpoint, keys, alarmEnabled = true, alarmTime = '09:30', alarmSound = true, ringDuration = 30, timezone, userAgent } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid push subscription endpoint and cryptographic keys (p256dh, auth) are required.',
      });
    }

    const detectedTz = timezone || 'Asia/Kolkata';

    // Upsert subscription for this device endpoint
    const subscription = await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        userId: req.user.id,
        role: req.user.role,
        endpoint,
        keys,
        alarmEnabled: Boolean(alarmEnabled),
        alarmTime: alarmTime || '09:30',
        alarmSound: Boolean(alarmSound),
        ringDuration: Number(ringDuration) || 30,
        timezone: detectedTz,
        userAgent: userAgent || req.headers['user-agent'] || '',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'Mobile push subscription registered successfully.',
      data: { subscription },
    });
  } catch (err) {
    console.error('[NotificationController] Failed to subscribe push:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * Unsubscribe a device from push notifications
 */
export const unsubscribePush = async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await PushSubscription.deleteOne({ endpoint, userId: req.user.id });
    } else {
      await PushSubscription.deleteMany({ userId: req.user.id });
    }

    res.status(200).json({
      status: 'success',
      message: 'Push subscription removed successfully.',
    });
  } catch (err) {
    console.error('[NotificationController] Failed to unsubscribe push:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * Get current alarm and notification preferences for authenticated user
 */
export const getAlarmSettings = async (req, res) => {
  try {
    const subscriptions = await PushSubscription.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    const primary = subscriptions[0];

    res.status(200).json({
      status: 'success',
      data: {
        alarmEnabled: primary ? primary.alarmEnabled : true,
        alarmTime: primary ? primary.alarmTime : '09:30',
        alarmSound: primary ? primary.alarmSound : true,
        ringDuration: primary ? primary.ringDuration : 30,
        timezone: primary ? primary.timezone : 'Asia/Kolkata',
        hasActiveSubscription: subscriptions.length > 0,
        deviceCount: subscriptions.length,
      },
    });
  } catch (err) {
    console.error('[NotificationController] Error getting alarm settings:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * Update customized alarm settings across all user devices
 */
export const updateAlarmSettings = async (req, res) => {
  try {
    const { alarmEnabled, alarmTime, alarmSound, ringDuration, timezone } = req.body;

    const updates = {};
    if (typeof alarmEnabled === 'boolean') updates.alarmEnabled = alarmEnabled;
    if (typeof alarmTime === 'string') updates.alarmTime = alarmTime;
    if (typeof alarmSound === 'boolean') updates.alarmSound = alarmSound;
    if (typeof ringDuration === 'number') updates.ringDuration = ringDuration;
    if (typeof timezone === 'string') updates.timezone = timezone;

    await PushSubscription.updateMany({ userId: req.user.id }, { $set: updates });

    res.status(200).json({
      status: 'success',
      message: 'Alarm settings updated successfully.',
      data: updates,
    });
  } catch (err) {
    console.error('[NotificationController] Error updating alarm settings:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * Send an immediate test mobile push notification
 */
export const testPushNotification = async (req, res) => {
  try {
    const subscriptions = await PushSubscription.find({ userId: req.user.id });

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No registered push subscription found for this device. Please enable notifications first.',
      });
    }

    const { date: todayDate } = getLocalTimeInfo();
    const workerProfiles = await WorkerProfile.find({ thekedarId: req.user.id });
    const attendanceLogs = await Attendance.find({ thekedarId: req.user.id, date: todayDate });
    const markedWorkerIds = new Set(attendanceLogs.map((a) => a.workerId.toString()));
    const unmarkedCount = workerProfiles.filter((wp) => !markedWorkerIds.has(wp.userId.toString())).length;

    const payload = {
      title: '⏰ Attendance Alarm (Test) — FurniCraft',
      body: unmarkedCount > 0
        ? `[Test Alert] You have ${unmarkedCount} craftsman pending attendance today! Tap to open attendance roster.`
        : `[Test Alert] All ${workerProfiles.length} craftsmen marked today! Alarm reminder is ready.`,
      icon: '/furnicraft-icon.png',
      badge: '/furnicraft-icon.png',
      tag: 'furnicraft-test-push',
      timestamp: Date.now(),
      requireInteraction: true,
      sound: '/alarm.mp3',
      vibrate: [600, 200, 600, 200, 600, 200, 1000],
      silent: false,
      data: {
        url: '/?openAttendance=true',
        unmarkedCount,
        date: todayDate,
        isTest: true,
      },
      actions: [
        { action: 'open', title: '📋 Mark Attendance' },
      ],
    };

    let sentSuccess = 0;
    for (const sub of subscriptions) {
      const result = await sendPushNotification(sub, payload);
      if (result.success) sentSuccess++;
    }

    res.status(200).json({
      status: 'success',
      message: `Test mobile notification dispatched to ${sentSuccess} device(s). You can close or minimize the app to see it in your mobile notification bar.`,
      data: { sentCount: sentSuccess, totalDevices: subscriptions.length },
    });
  } catch (err) {
    console.error('[NotificationController] Error sending test push:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};
