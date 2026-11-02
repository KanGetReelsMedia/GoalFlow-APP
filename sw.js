// GoalFlow - Premium PWA Service Worker
const CACHE_NAME = 'goalflow-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-192.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png'
];

// Install - Cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('GoalFlow: Caching app shell');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate - Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('GoalFlow: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - Network first, fallback to cache (for offline goals)
self.addEventListener('fetch', event => {
  // Skip non-GET requests and chrome extensions
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        // Clone and cache
        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });
        return response;
      })
      .catch(() => {
        // Offline - return from cache
        return caches.match(event.request)
          .then(response => {
            if (response) {
              return response;
            }
            // If requesting a page, return index.html for SPA routing
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Background sync for future goal reminders
self.addEventListener('sync', event => {
  if (event.tag === 'sync-goals') {
    event.waitUntil(syncGoals());
  }
});

async function syncGoals() {
  // Placeholder for future Supabase/Firebase sync
  console.log('GoalFlow: Syncing goals');
}

// Push notifications for streaks/reminders
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'GoalFlow';
  const options = {
    body: data.body || 'Time to log your goals!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
