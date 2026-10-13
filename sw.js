// Service worker: deja la app disponible sin conexión.
// Red primero (así siempre se ven las actualizaciones) y, si no hay internet, lo guardado.
//
// AL PUBLICAR UNA VERSIÓN NUEVA: cambiar CACHE (que coincida con APP_VERSION en js/config.js).
// Si se agrega o se quita un archivo de la app, actualizar también FILES.

const CACHE = 'turnos-1.2.0';
const FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'css/styles.css',
  'js/main.js', 'js/config.js', 'js/store.js',
  'js/core/dates.js', 'js/core/text.js', 'js/core/data.js', 'js/core/schedule.js', 'js/core/reports.js',
  'js/ui/dom.js', 'js/ui/render.js', 'js/ui/clipboard.js', 'js/ui/events.js',
  'js/ui/slot-dialog.js', 'js/ui/settings-dialog.js', 'js/ui/billing-dialog.js', 'js/ui/reports-screen.js',
  'icons/icon-180.png', 'icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request))
  );
});