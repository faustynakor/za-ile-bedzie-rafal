// service-worker.js — minimalny pod powiadomienia (bez fetch)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

// Odbiór Web Push
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}

  const title = data.title || 'Powiadomienie';
  const options = {
    body: data.body || 'Masz nowe info!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data.data || {} // np. { url: '/' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Klik w notyfikację
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || self.location.origin;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});
