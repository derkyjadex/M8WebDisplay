// Copyright 2021 James Deery
// Released under the MIT licence, https://opensource.org/licenses/MIT

const cacheName = 'INDEXHASH';

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(cacheName)
            .then(cache => cache.addAll(['.', 'icon.png', 'app.webmanifest'])));
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

self.addEventListener('message', event => {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});
