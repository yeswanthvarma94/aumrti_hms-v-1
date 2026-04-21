// Aumrti HMS — Service Worker v3
// Network-first for HTML/navigations. Cache-first for hashed static assets.
// Force-takeover + broadcast SW_ACTIVATED so open tabs auto-reload exactly once.
const CACHE_NAME = 'aumrti-hms-v3';
const STATIC_ASSETS = ['/favicon.ico', '/manifest.json'];

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
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
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

  // Never intercept OAuth or auth callback routes
  if (url.pathname.startsWith('/~oauth') || url.pathname.startsWith('/auth/callback')) {
    return;
  }

  // Network-first for Supabase API
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request).then(
          (cached) =>
            cached ||
            new Response(JSON.stringify({ error: 'Offline' }), {
              headers: { 'Content-Type': 'application/json' },
              status: 503,
            })
        )
      )
    );
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

  // Cache-first for hashed static assets (JS, CSS, fonts, images)
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
