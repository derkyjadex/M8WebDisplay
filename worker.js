const cacheName="b293c8fcfeb027f87918800b108fb082";self.addEventListener("install",(e=>{self.skipWaiting(),e.waitUntil(caches.open(cacheName).then((e=>e.addAll(["."]))))})),self.addEventListener("activate",(e=>e.waitUntil(caches.keys().then((e=>Promise.all(e.filter((e=>e!==cacheName)).map((e=>caches.delete(e))))))))),self.addEventListener("fetch",(e=>e.respondWith(caches.match(e.request).then((t=>t||fetch(e.request))))));
