// Service worker — офлайн-робота + автоматичне оновлення
// ВАЖЛИВО: при кожному оновленні застосунку міняйте номер версії нижче (v1 → v2 → v3 ...).
// Це єдина дія, потрібна для автооновлення на всіх пристроях.
const VERSION = "v4";
const CACHE = "oblik-" + VERSION;

// Сторонні бібліотеки — не змінюються, тримаємо в кеші назавжди
const STATIC_LIBS = [
  "https://unpkg.com/react@18/umd/react.production.min.js",
  "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js",
  "https://unpkg.com/@babel/standalone/babel.min.js",
];
// Власні файли застосунку — можуть оновлюватися
const APP_ASSETS = [
  "./", "./index.html", "./app.js", "./manifest.json",
  "./icon-180.png", "./icon-192.png", "./icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled([...APP_ASSETS, ...STATIC_LIBS].map((a) => c.add(a))))
      .then(() => self.skipWaiting()) // новий SW активується одразу, не чекаючи
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isAppFile(url) {
  // власні файли застосунку (той самий домен)
  return url.origin === self.location.origin;
}

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  if (isAppFile(url)) {
    // Network-first: спершу мережа (свіжа версія), кеш — запасний варіант офлайн
    e.respondWith(
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(e.request))
    );
  } else {
    // Сторонні бібліотеки: cache-first (миттєво, не змінюються)
    e.respondWith(
      caches.match(e.request).then((cached) => cached || fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }))
    );
  }
});
