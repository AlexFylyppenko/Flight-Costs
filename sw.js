// Service worker — кешує застосунок для офлайн-роботи
const CACHE = "oblik-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "https://unpkg.com/react@18/umd/react.production.min.js",
  "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js",
  "https://unpkg.com/@babel/standalone/babel.min.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.allSettled(ASSETS.map((a) => c.add(a)))).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// Спершу кеш, потім мережа (cache-first) — застосунок миттєвий і працює офлайн
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => cached);
    })
  );
});
