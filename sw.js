// Caches the app so it opens offline. The page itself is fetched from the network first,
// so a new version shows up right away; the saved copy is used only when offline or slow.
const CACHE = 'grid-v3';
const ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(ASSETS);
    try { await c.put(XLSX_URL, await fetch(XLSX_URL, {mode: 'no-cors'})); } catch (err) {}
    self.skipWaiting();
  }));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // The player database is always fetched fresh.
  if (/\.xlsx?$/i.test(decodeURIComponent(url.pathname))) return;

  const isPage = req.mode === 'navigate' || (url.origin === location.origin && /(^|\/)(index\.html)?$/.test(url.pathname));
  if (isPage) {
    const fresh = fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    });
    e.respondWith(
      Promise.race([fresh, new Promise((_, no) => setTimeout(no, 4000))])
        .catch(() => caches.match(req, {ignoreSearch: true}).then(hit => hit || caches.match('index.html')).then(hit => hit || fresh))
    );
    return;
  }

  // Everything else: saved copy first, refreshed in the background.
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, {ignoreSearch: true});
    const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
