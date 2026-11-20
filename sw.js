const CACHE = 'ultima-milla-v19';
const ASSETS = ['./', './index.html', './style.css', './route-map.js', './js/main.js', './js/app.js', './js/vistas.js', './js/estado.js', './js/costos.js', './js/energia.js', './js/precios.js', './js/ubicacion.js', './js/catalogo.js', './js/demo.js', './js/formato.js', './js/iconos.js', './data/parametros.json', './data/vehiculos.json', './fuel-prices.json', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];
const ROOT = new URL('./', self.location.href);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(path => new URL(path, ROOT)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('ultima-milla-') && key !== CACHE).map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== ROOT.origin || !request.url.startsWith(ROOT.href)) return;
  event.respondWith(fetch(request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
    }
    return response;
  }).catch(() => caches.match(request, { ignoreSearch: request.mode === 'navigate' })));
});
