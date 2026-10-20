// VolleyHub — service worker: rete prima, copia locale se manca la connessione
const CACHE = 'volleyhub-v2';
const BASE = [
  './', './index.html', './app.html', './accedi.html', './live.html', './segna.html', './iscrizione.html', './stampa.html',
  './css/vh.css', './css/app.css', './css/live.css', './css/segna.css',
  './js/config.js', './js/core.js', './js/store.js', './js/store-demo.js', './js/demo-data.js', './js/ui.js',
  './js/live.js', './js/segna.js', './js/iscrizione.js',
  './js/app/main.js', './js/app/stato.js', './js/app/comp.js', './js/app/importa.js', './js/app/v-home.js', './js/app/v-nuovo.js',
  './js/app/v-torneo.js', './js/app/v-categoria.js', './js/app/v-societa.js', './js/app/v-iscrizioni.js', './js/app/v-pubblica.js', './js/app/tour.js', './js/app/v-presenze.js',
  './assets/logo-mark.svg', './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png', './manifest.webmanifest',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Firebase gestisce da sé la propria cache; i font e le librerie esterne passano dalla rete
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: req.mode === 'navigate' }))
  );
});
