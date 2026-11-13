// Astrocat — service worker: la app funciona sin internet.
// Al publicar una versión nueva, cambia VERSION para que el teléfono descargue los archivos nuevos.
const VERSION = 'astrocat-v1.0.0-1';
const BASE = ['./', 'index.html', 'manifest.webmanifest', 'css/app.css', 'js/app.js', 'js/modelo.js', 'js/db.js', 'js/ui.js',
  'js/vistas/hoy.js', 'js/vistas/registro.js', 'js/vistas/elegir-dia.js', 'js/vistas/varias.js', 'img/logo.svg', 'img/gato.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Primero la copia guardada (rápido y sin internet); en segundo plano se actualiza.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async (c) => {
    const guardado = await c.match(e.request, { ignoreSearch: true });
    const red = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => guardado);
    return guardado || red;
  }));
});
