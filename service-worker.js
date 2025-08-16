// service-worker.js — minimalny pod powiadomienia (bez fetch)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

// Odbiór Web Push
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) {}

  const title = data.title || 'Powiadomienie';
  const body = data.body || '';
  const tag = data.tag || 'default';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: data.data || {}
    })
  );
});

// Klik w notyfikację
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      for (const c of wins) if ('focus' in c) return c.focus();
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});