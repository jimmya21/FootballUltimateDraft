// Caches the app so it opens offline. Bump CACHE when you change any file.
const CACHE = 'grid-v2';
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
// Serve from cache first, refresh in the background so updates show on the next launch.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (/\.xlsx?($|\?)/i.test(decodeURIComponent(new URL(e.request.url).pathname))) return;   // always fetch the player database fresh
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, {ignoreSearch: true});
    const net = fetch(e.request).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(e.request, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
