
const CACHE_NAME = "ishaan-portfolio-v2";

const urlsToCache = [
  "/",
  "/index.html",
  "/projects.html",
  "/about.html",
  "/contact.html",
  "/styles.css",
  "/script.js",
  "/ir-logo.jpg",
  "/favicon.ico",
  "/favicon-32x32.png",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
  "/apple-touch-icon.png",
  "/SpaceBlast.png",
  "/PingPong.jpg",
  "/Calculator.jpg",
  "/Arcade.jpg",
  "/SuperMario.jpg",
  "/FlappyBird.jpg",
  "/ChatApp.jpg",
  "/NexusShieldAI.jpg"
];

// Install: cache available website files.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(
        urlsToCache.map(async (url) => {
          try {
            const response = await fetch(url, {
              cache: "reload"
            });

            if (response.ok) {
              await cache.put(url, response);
            }
          } catch (error) {
            console.warn("Could not cache:", url);
          }
        })
      );

      await self.skipWaiting();
    })
  );
});

// Activate: remove old portfolio caches.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith("ishaan-portfolio-") &&
              key !== CACHE_NAME
          )
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();
    })
  );
});

// Fetch: prefer fresh files, use cached files offline.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);

        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }

        return response;
      } catch (error) {
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
          return cachedResponse;
        }

        if (request.mode === "navigate") {
          const homePage = await caches.match("/index.html");

          if (homePage) {
            return homePage;
          }
        }

        return new Response("You are offline and this file is not cached.", {
          status: 503,
          headers: {
            "Content-Type": "text/plain; charset=utf-8"
          }
        });
      }
    })()
  );
});
