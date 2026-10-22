// Alzare VERSION a ogni modifica dei file qui sotto: forza la reinstallazione con i file nuovi.
const VERSION = 'v7';
const CACHE = `chez-moi-${VERSION}`;
const SHELL = ['/', '/index.html', '/style.css', '/app.js', '/logic.js', '/sfide.js', '/manifest.webmanifest',
  '/icon.svg', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png'];

// skipWaiting + claim: una PWA aperta dall'icona Home non si chiude quasi mai, senza questi l'aggiornamento resta in attesa
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Shell: prima la rete, la cache solo offline. /api mai in cache (dati personali dietro Access).
// fetch(e.request) senza secondo argomento: ricostruire una richiesta "navigate" lancia un errore (lezione di calice).
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || Response.error())),
  );
});
