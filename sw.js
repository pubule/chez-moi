// Mostra subito la versione in cache e la aggiorna in background:
// dopo una modifica all'app basta riaprirla due volte.
const CACHE = 'chez-moi';
const FILE = ['./', 'index.html', 'style.css', 'app.js', 'logic.js', 'sfide.js', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILE)));
  self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const inCache = await c.match(e.request, { ignoreSearch: true });
    const rete = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; });
    return inCache || rete;
  }));
});
