/**
 * EduTrack Service Worker
 * Enables basic offline support, caching of static assets,
 * OpenStreetMap map tiles, and critical fonts for improved
 * reliability on unstable network connectivity in Bangladesh.
 */

const CACHE_NAME = 'edutrack-static-cache-v1';
const PRE_CACHE_RESOURCES = [
  '/',
  '/index.html',
  '/favicon.svg'
];

// Install: Pre-cache critical application shell files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching core application shell');
        return cache.addAll(PRE_CACHE_RESOURCES);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate: Clean up prior outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Cleaning up old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch: Caching and delivery strategies
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Strict Exclusion: Ignore non-GET requests, Firebase auth/database calls, and local API requests
  if (
    request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/__/auth/') ||
    url.host.includes('firestore.googleapis.com') ||
    url.host.includes('securetoken.googleapis.com') ||
    url.host.includes('identitytoolkit.googleapis.com')
  ) {
    return;
  }

  // 2. Navigations (HTML Documents): Network-First falling back to Cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Populate the cache with the latest index page
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          console.log('[Service Worker] Fallback to cached index shell for navigation offline');
          return caches.match('/') || caches.match('/index.html');
        })
    );
    return;
  }

  // 3. Static Assets: Cache-First with background update (Stale-While-Revalidate)
  const isStatic = 
    url.pathname.match(/\.(js|css|svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|eot|ico)$/i) ||
    url.hostname.includes('tile.openstreetmap.org') || // Critical for offline maps
    url.hostname.includes('fonts.googleapis.com') ||   // Open weights stylesheet
    url.hostname.includes('fonts.gstatic.com') ||      // Woff2 font files
    url.hostname.includes('images.unsplash.com') ||    // Cached tutor/banner images
    url.hostname.includes('i.pravatar.cc');            // Default placeholder avatars

  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        // If found in cache, spark a background fresh fetch to keep it warm, then return cached immediately.
        if (cachedResponse) {
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, networkResponse);
                });
              }
            })
            .catch(() => {
              // Ignore background errors while completely offline
            });
          return cachedResponse;
        }

        // If not in cache, fetch from network and double cache it
        return fetch(request)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
            return networkResponse;
          })
          .catch(() => {
            // Silently swallow fetch fail (or serve visual offline placeholder if necessary)
          });
      })
    );
    return;
  }

  // 4. Fallback for all other items: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Swallow error
        });
      return cachedResponse || fetchPromise;
    })
  );
});
