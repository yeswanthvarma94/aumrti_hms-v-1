// Service Worker registration — guarded against Lovable preview iframes.
// SW is essential for offline support in production but causes stale-cache
// and navigation issues inside the editor preview iframe. We register it
// ONLY on real deployed origins, and aggressively unregister inside previews.

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
  const isPreviewHost =
    host.includes('id-preview--') ||
    host.includes('lovableproject.com') ||
    host.includes('lovable.app') === false && host.includes('lovable') ||
    host === 'localhost' ||
    host === '127.0.0.1';

  // In preview/iframe: actively unregister any prior SW + clear caches so
  // stale builds don't get served.
  if (isInIframe || isPreviewHost) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
    if ('caches' in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
    return;
  }

  // Production / published app — register SW
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('SW registration failed:', err);
    });
  });
}
