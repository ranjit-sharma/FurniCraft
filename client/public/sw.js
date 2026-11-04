/* FurniCraft Service Worker for Background Attendance Alarm & Push Notifications */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push Notifications even when the app/browser is closed
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || '⏰ Attendance Alarm — FurniCraft';
  const options = {
    body: data.body || "Time to mark attendance for today's craftsmen!",
    icon: data.icon || '/furnicraft-icon.png',
    badge: data.badge || '/furnicraft-icon.png',
    tag: data.tag || 'furnicraft-attendance-alarm',
    data: data.data || { url: '/?openAttendance=true' },
    renotify: true,
    requireInteraction: true,
    silent: false,
    sound: '/alarm.mp3',
    vibrate: [600, 200, 600, 200, 600, 200, 1000, 300, 600],
    actions: data.actions || [
      { action: 'open', title: '📋 Mark Attendance' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification interaction / click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || '/?openAttendance=true';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle subscription lifecycle updates
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription.options)
      .then((subscription) => {
        return fetch('/api/v1/notifications/push-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription),
        });
      })
      .catch((err) => {
        console.warn('[SW] pushsubscriptionchange failed:', err);
      })
  );
});
