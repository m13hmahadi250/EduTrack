// Service Worker for EduTrack Web Notifications & Offline Caching Strategy
const CACHE_NAME = 'edutrack-app-v5';
const DYNAMIC_CACHE = 'edutrack-dynamic-v5';

// Core app assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/logo.svg',
  '/android-chrome-192x192.png',
  '/favicon-96x96.png',
  '/favicon.ico'
];

// Install Event - Pre-cache core static assets and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Purge all outdated caches (including poisoned v1/v3 script caches)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== DYNAMIC_CACHE) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network-First for code/navigation, Stale-While-Revalidate for static media
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests or non-HTTP(S) requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Never intercept Vite dev modules, pre-bundled deps, HMR endpoints, or API calls
  if (
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/api/') ||
    url.searchParams.has('v') ||
    url.searchParams.has('t')
  ) {
    return;
  }

  // 1. SPA Navigation requests (Network-First with offline fallback)
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match('/index.html') || caches.match('/');
          });
        })
    );
    return;
  }

  // 2. Production JS & CSS bundles - Network-First so updated builds never mix chunk versions
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    url.pathname.match(/\.(js|css)$/)
  ) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 3. Static Media (Images, Fonts, Icons) - Stale-While-Revalidate
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|woff2?)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});

// Handle custom push notifications if push services are configured
self.addEventListener('push', (event) => {
  let data = { title: 'EduTrack Alert', body: 'You have a new update.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'EduTrack Alert', body: event.data.text() };
    }
  }

  const options = {
    body: data.body || 'New message or notification arrived.',
    icon: data.icon || '/android-chrome-192x192.png',
    badge: '/favicon-96x96.png',
    vibrate: [150, 100, 150],
    data: data.url || '/',
    tag: data.tag || 'edutrack-alert',
    actions: [
      { action: 'open', title: 'Open App', icon: '/favicon-96x96.png' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'EduTrack Notification', options)
  );
});

// Handle Service Worker lifecycle & auth cache purge messages
self.addEventListener('message', (event) => {
  const payload = event.data || {};
  if (payload.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (payload.type === 'CLEAR_AUTH_CACHE') {
    event.waitUntil(
      caches.delete(DYNAMIC_CACHE).then(() => undefined).catch(() => undefined)
    );
  }
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = new URL(event.notification.data || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if ('focus' in client && 'navigate' in client) {
          client.focus();
          return client.navigate(urlToOpen);
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
