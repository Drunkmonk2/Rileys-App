/* Offline cache for Riley's app.
 * Strategy: NETWORK-FIRST so new versions show up as soon as the phone is
 * online, falling back to the cache when offline. Bump CACHE on each release. */
const CACHE = "rileys-app-v3";
const ASSETS = [
  "./", "./index.html", "./manifest.json",
  "./css/styles.css",
  "./js/data.js", "./js/speech.js", "./js/tracing.js", "./js/games.js", "./js/app.js",
  "./audio/manifest.json",
  "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request))
  );
});
