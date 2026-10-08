// Installable app (PWA): service worker registration and the "install" prompt.
let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach(fn => fn());

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.matchMedia?.('(display-mode: fullscreen)').matches || navigator.standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const canInstall = () => !!deferred && !isStandalone();
export const onInstallChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; notify(); });
window.addEventListener('appinstalled', () => { deferred = null; notify(); });

export async function promptInstall() {
  if (!deferred) return false;
  const e = deferred;
  deferred = null;
  e.prompt();
  const { outcome } = await e.userChoice;
  notify();
  return outcome === 'accepted';
}

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).then(() => navigator.serviceWorker.ready).then((reg) => {
      // Files this page already loaded before the worker took over – cache them so the next launch works offline.
      const urls = performance.getEntriesByType('resource').map(e => e.name).filter(u => u.startsWith(location.origin));
      reg.active?.postMessage({ type: 'cache', urls });
    }).catch(() => { /* offline support is optional */ });
  });
}
