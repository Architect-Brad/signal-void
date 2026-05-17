const CACHE_NAME = 'signal-void-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;900&family=JetBrains+Mono:wght@400;500;700;800&family=Outfit:wght@400;900&family=Space+Grotesk:wght@300;700&display=swap'
];

// AI Models cache name
const MODEL_CACHE = 'ai-models-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== MODEL_CACHE) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // AI Model Caching (Cache First)
  if (url.hostname.includes('huggingface.co')) {
    event.respondWith(
      caches.open(MODEL_CACHE).then((cache) => {
        return cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((network) => {
            if (network.status === 200) {
              cache.put(event.request, network.clone());
            }
            return network;
          });
        });
      })
    );
    return;
  }

  // Static Assets (Stale-while-revalidate)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networked = fetch(event.request).then((network) => {
        if (network && network.status === 200) {
          const clone = network.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return network;
      }).catch(() => null);

      return cached || networked;
    })
  );
});

// Push notification listener
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'SIGNAL_INTERCEPT', body: 'Incoming neural stream detected.' };
  const options = {
    body: data.body,
    icon: 'https://img.icons8.com/wired/192/00ff41/terminal.png',
    badge: 'https://img.icons8.com/wired/64/00ff41/terminal.png',
    vibrate: [100, 50, 100],
    data: { url: '/' }
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
