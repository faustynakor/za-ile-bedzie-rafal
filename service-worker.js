self.addEventListener("install", event => {
    event.waitUntil(
        caches.open("static").then(cache => {
            cache.addAll(["/", "/index.html", "/styles.css", "/app.js"]);
        })
    );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  event.respondWith((async () => {
    try {
      const net = await fetch(req);
      return net;
    } catch (err) {
      const cache = await caches.open('app-cache');
      const cached = await cache.match(req);
      if (cached) return cached;
      const offline = await cache.match('/offline.html');
      if (offline) return offline;
      return new Response('Offline / fetch failed', { status: 503, statusText: 'Service Unavailable' });
    }
  })());
});


// Odbiór wiadomości push
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) {}

  const title = data.title || 'Powiadomienie';
  const options = {
    body: data.body || 'Masz nowe info!',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    data: data.data || {},
    actions: data.actions || []
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
