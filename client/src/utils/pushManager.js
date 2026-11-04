import api from '../api/client';

export const DEFAULT_VAPID_PUBLIC_KEY =
  'BN4aYgiIKCZLtbu3hJOGP-0zOmIssjVEGPAvtL0f0l2bvssi7vyprIQ74WE5TCZ-NWFKtabvZ1OBr5yEpzPFyus';

export const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const isPushSupported = () => {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
};

export const registerServiceWorker = async () => {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return registration;
  } catch (err) {
    console.warn('[SW] Service worker registration error:', err);
    return null;
  }
};

export const getPushSubscription = async () => {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch (err) {
    console.warn('[Push] Error getting push subscription:', err);
    return null;
  }
};

export const subscribeToPushNotifications = async ({ alarmTime = '09:30', alarmEnabled = true, alarmSound = true, ringDuration = 30 } = {}) => {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported on this browser or device.');
  }

  // 1. Request OS / Browser notification permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was denied. Please allow notifications in your browser or device settings.');
  }

  // 2. Fetch VAPID public key from backend with robust fallback
  let publicKey = DEFAULT_VAPID_PUBLIC_KEY;
  try {
    const vapidRes = await api.get('/notifications/vapid-public-key');
    const fetchedKey = vapidRes?.data?.publicKey || vapidRes?.publicKey;
    if (typeof fetchedKey === 'string' && fetchedKey.length > 20) {
      publicKey = fetchedKey;
    }
  } catch (err) {
    console.warn('[Push] Error fetching public key, using built-in key:', err);
  }

  if (!publicKey) {
    throw new Error('Unable to retrieve server push key.');
  }

  // 3. Register or get Service Worker
  let registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    registration = await registerServiceWorker();
  }
  await navigator.serviceWorker.ready;

  // 4. Subscribe with PushManager
  const convertedVapidKey = urlBase64ToUint8Array(publicKey);
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedVapidKey,
  });

  const subJson = subscription.toJSON();

  // 5. Detect timezone and device
  let timezone = 'Asia/Kolkata';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {}

  // 6. Send subscription to FurniCraft backend
  await api.post('/notifications/push-subscription', {
    endpoint: subJson.endpoint,
    keys: subJson.keys,
    alarmEnabled,
    alarmTime,
    alarmSound,
    ringDuration,
    timezone,
    userAgent: navigator.userAgent,
  });

  return subscription;
};

export const unsubscribeFromPushNotifications = async () => {
  if (!isPushSupported()) return true;
  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      await api.delete('/notifications/push-subscription', {
        data: { endpoint: subscription.endpoint },
      });
      await subscription.unsubscribe();
    }
    return true;
  } catch (err) {
    console.warn('[Push] Error unsubscribing:', err);
    return false;
  }
};
