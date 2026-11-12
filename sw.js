const CACHE = 'ultima-milla-v1';
const ASSETS = ['./', './index.html', './style.css', './calc.js', './app.js', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];
const ROOT = new URL('./', self.location.href);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(path => new URL(path, ROOT)))));
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
  event.respondWith(caches.match(request, { ignoreSearch: request.mode === 'navigate' }).then(cached => cached || fetch(request)));
});
