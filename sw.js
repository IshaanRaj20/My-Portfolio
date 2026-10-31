const CACHE_NAME = "ishaan-portfolio-v1";

const urlsToCache = [
  "/",
  "/index.html",
  "/styles.css",
  "/SpaceBlast.png",
  "/PingPong.jpg",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png"
];

// Install SW
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch (offline support)
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});