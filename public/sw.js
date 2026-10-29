const CACHE_NAME = 'norsu-care-public-v1';
const SHELL_ASSETS = [
  '/public',
  '/manifest.webmanifest',
  '/pwa-192x192.png',
  '/pwa-512x192.png',
  '/apple-touch-icon.png',
  '/norsu.png',
  '/carecenter.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        '/manifest.webmanifest',
        '/pwa-192x192.png',
        '/pwa-512x512.png',
        '/apple-touch-icon.png',
        '/norsu.png',
        '/carecenter.png'
      ]).catch(() => undefined)
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Network-first strategy for navigation so Cloudflare Pages deployments are
// always fresh, falling back to cached shell only when offline.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/public', copy)).catch(() => undefined);
          return response;
        })
        .catch(() => caches.match('/public').then((cached) => cached || caches.match('/index.html')))
    );
  }
});

// Web Push Notification receiver
self.addEventListener('push', (event) => {
  let payload = {
    title: 'NORSU-G CARE Center',
    body: 'A new announcement has been posted on the Public Hub.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'care-public-announcement',
    url: '/public'
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = {
        ...payload,
        ...parsed,
        title: parsed.title || payload.title,
        body: parsed.body || payload.body,
        icon: parsed.icon || '/pwa-192x192.png',
        badge: parsed.badge || '/pwa-192x192.png',
        tag: parsed.tag || payload.tag,
        url: parsed.url || '/public'
      };
    } catch {
      const text = event.data.text();
      if (text) {
        payload.body = text;
      }
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      renotify: true,
      data: {
        url: payload.url,
        category: payload.category || 'Announcement'
      }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/public';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            url: targetUrl
          });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});

