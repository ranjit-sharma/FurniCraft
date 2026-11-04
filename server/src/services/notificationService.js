import webpush from 'web-push';
import { env } from '../config/env.js';
import { PushSubscription } from '../models/PushSubscription.js';

// Configure Web Push VAPID credentials
try {
  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
} catch (err) {
  console.error('[WebPush] Failed to configure VAPID details:', err.message);
}

/**
 * Send a web push notification to a specific push subscription record
 */
export const sendPushNotification = async (subscription, payload) => {
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return { success: false, error: 'Invalid subscription' };
  }

  const pushConfig = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  };

  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

  try {
    const result = await webpush.sendNotification(pushConfig, payloadString, {
      TTL: 60 * 60 * 24, // 24 hours
      urgency: 'high',
    });
    return { success: true, statusCode: result.statusCode };
  } catch (err) {
    console.warn(`[WebPush] Push failed for endpoint ${subscription.endpoint.slice(0, 30)}...:`, err.statusCode || err.message);

    // If subscription is expired, revoked, or no longer exists (404, 410), delete it
    if (err.statusCode === 404 || err.statusCode === 410) {
      try {
        await PushSubscription.deleteOne({ _id: subscription._id });
        console.log(`[WebPush] Removed expired subscription ${subscription._id}`);
      } catch (cleanupErr) {
        console.error('[WebPush] Error deleting expired subscription:', cleanupErr.message);
      }
    }
    return { success: false, error: err.message, statusCode: err.statusCode };
  }
};

/**
 * Send web push notification to all subscriptions of a specific user
 */
export const sendPushToUser = async (userId, payload) => {
  try {
    const subscriptions = await PushSubscription.find({ userId });
    if (!subscriptions || subscriptions.length === 0) {
      return { success: false, sentCount: 0, reason: 'No active push subscriptions found' };
    }

    const results = await Promise.allSettled(
      subscriptions.map((sub) => sendPushNotification(sub, payload))
    );

    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    return { success: successful > 0, sentCount: successful, total: subscriptions.length };
  } catch (err) {
    console.error(`[WebPush] Failed to send push to user ${userId}:`, err);
    return { success: false, error: err.message };
  }
};

/**
 * Trigger an attendance alarm push notification for a specific Thekedar
 */
export const sendAttendanceAlarmPush = async (thekedarId, { unmarkedCount, totalWorkers, date }) => {
  const payload = {
    title: '⏰ Attendance Alarm — FurniCraft',
    body: unmarkedCount > 0
      ? `You have ${unmarkedCount} craftsman waiting to be marked today! Tap to record attendance.`
      : `Daily reminder: Check today's craftsman attendance (${totalWorkers} active).`,
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
      unmarkedCount,
      date,
      type: 'ATTENDANCE_ALARM',
    },
    actions: [
      { action: 'open', title: '📋 Mark Attendance' },
    ],
  };

  return sendPushToUser(thekedarId, payload);
};
