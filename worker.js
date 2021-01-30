const cacheName = 'INDEXHASH';

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(cacheName)
            .then(cache => cache.addAll(['.'])));
});

self.addEventListener('activate', event =>
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys
                .filter(key => key !== cacheName)
                .map(key => caches.delete(key))))));

self.addEventListener('fetch', event =>
    event.respondWith(
        caches.match(event.request)
            .then(response =>
                response || fetch(event.request))));
