const CACHE_NAME = "nest-logger-v2";

const APP_ASSETS = [
  "/",
  "/index.html",
  "/favicon.png",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
];

// INSTALL
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_ASSETS))
  );
  self.skipWaiting();
});

// ACTIVATE
self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

// FETCH
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // MapTiler tiles → cache-first
  if (url.hostname === "api.maptiler.com" &&
      url.pathname.includes("/maps/topo-v4/")) {

    event.respondWith(
      caches.open("maptiler-tiles").then(cache =>
        cache.match(event.request).then(resp =>
          resp ||
          fetch(event.request).then(net => {
            cache.put(event.request, net.clone());
            return net;
          })
        )
      )
    );
    return;
  }

  // App shell → cache-first
  event.respondWith(
    caches.match(event.request).then(resp =>
      resp || fetch(event.request)
    )
  );
});
