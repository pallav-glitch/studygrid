/* ════════════════════════════════════════════════
   StudyGrid – sw.js  (Service Worker)
   Caches all app assets for full offline support.
   Strategy: Cache-first, network fallback.
   ════════════════════════════════════════════════ */

const CACHE_NAME = 'studygrid-v1';

// All files that make up the app shell
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // Google Fonts are also cached on first load
];

// ── INSTALL ───────────────────────────────────────────────────────────────────
// Pre-cache all app shell assets when the SW is installed
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching app shell');
      // We use addAll for the core assets; font URLs will be cached on fetch
      return cache.addAll(ASSETS);
    })
  );
  // Activate the new SW immediately without waiting for old tabs to close
  self.skipWaiting();
});

// ── ACTIVATE ──────────────────────────────────────────────────────────────────
// Clean up old caches when a new SW takes over
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// ── FETCH ─────────────────────────────────────────────────────────────────────
// Cache-first strategy: serve from cache, fall back to network & update cache
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Serve cached version immediately
        return cached;
      }

      // Not in cache: fetch from network and cache the result
      return fetch(event.request)
        .then((response) => {
          // Only cache valid responses (not errors, not opaque for safety)
          if (!response || response.status !== 200) return response;

          // Clone the response because it can only be consumed once
          const toCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, toCache);
          });

          return response;
        })
        .catch(() => {
          // If both cache and network fail, return a simple offline fallback
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
    })
  );
});
