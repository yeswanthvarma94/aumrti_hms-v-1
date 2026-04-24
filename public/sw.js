// Aumrti HMS — Service Worker v4
// Network-first for HTML/navigations. Cache-first only for hashed static assets.
// Force-takeover + broadcast SW_ACTIVATED so open tabs auto-reload exactly once.
const CACHE_NAME = 'aumrti-hms-v4';
const CACHE_PREFIX = 'aumrti-hms-';
const STATIC_ASSETS = ['/favicon.ico', '/manifest.json'];

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => {
        try { client.postMessage({ type: 'SW_ACTIVATED', cache: CACHE_NAME }); } catch {}
      });
    })()
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never intercept auth/API/dynamic routes
  if (
    url.pathname.startsWith('/~oauth') ||
    url.pathname.startsWith('/auth/callback') ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co')
  ) {
    return;
  }

  if (url.origin !== self.location.origin) return;

  const isNavigation =
    event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') || '').includes('text/html') ||
    url.pathname.endsWith('.html');

  // Network-first for HTML / navigations — always get fresh shell with current chunk hashes
  if (isNavigation) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match('/'))
      )
    );
    return;
  }

  const isHashedAsset = /\/assets\/[^/]+\.[a-zA-Z0-9_-]{8,}\.(js|css|woff2?|png|jpe?g|webp|svg|ico)$/.test(url.pathname);
  if (!isHashedAsset) return;

  // Cache-first for immutable hashed static assets only
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
    )
  );
});
