// Service Worker registration — guarded against Lovable preview iframes.
// SW is essential for offline support in production but causes stale-cache
// and navigation issues inside the editor preview iframe. We register it
// ONLY on real deployed origins, and aggressively unregister inside previews.
//
// On SW activation in production, we trigger a one-time auto-reload so users
// don't have to hard-refresh to pick up new chunk hashes.

const RELOAD_FLAG = 'aumrti_sw_reloaded';
const APP_CACHE_PREFIX = 'aumrti-hms-';

function isPreviewHost(host: string): boolean {
  // Clean allow-list — never depends on ambiguous boolean precedence.
  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (host.endsWith('.lovableproject.com')) return true;
  if (host.includes('id-preview--')) return true;
  if (host.startsWith('preview--')) return true;
  return false;
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const host = window.location.hostname;
  const preview = isPreviewHost(host);

  // In preview/iframe: actively unregister any prior SW + clear caches so
  // stale builds don't get served.
  if (isInIframe || preview) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
    if ('caches' in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
    return;
  }

  const cleanupOldCaches = () => {
    if (!('caches' in window)) return;
    caches.keys().then((keys) => {
      keys
        .filter((key) => key.startsWith(APP_CACHE_PREFIX))
        .forEach((key) => caches.delete(key));
    });
  };

  const reloadOnce = () => {
    if (sessionStorage.getItem(RELOAD_FLAG)) return;
    sessionStorage.setItem(RELOAD_FLAG, '1');
    window.location.reload();
  };

  // Production / published app — register SW and listen for activation
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            worker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }).catch((err) => {
      console.log('SW registration failed:', err);
    });
  });

  // When a new SW takes control, reload exactly once so the page picks up
  // fresh JS chunks. Guarded by sessionStorage so we never loop.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    cleanupOldCaches();
    reloadOnce();
  });

  // Also listen for the explicit SW_ACTIVATED broadcast (covers first install).
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type !== 'SW_ACTIVATED') return;
    cleanupOldCaches();
    reloadOnce();
  });
}
