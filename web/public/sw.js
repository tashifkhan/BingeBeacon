const CACHE_VERSION = "bingebeacon-v2";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const API_CACHE = `${CACHE_VERSION}-api`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const OFFLINE_URL = "/~offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        // addAll() rejects the whole install if any single entry 404s, which
        // would leave the app with no service worker at all. Cache each shell
        // asset independently so one missing file can't take the rest down.
        Promise.all(
          [
            OFFLINE_URL,
            "/manifest.json",
            "/favicon.svg",
            "/icons/icon-192.png",
            "/icons/icon-512.png",
            "/placeholder-poster.svg",
          ].map((url) =>
            cache
              .add(url)
              .catch((err) => console.warn("[sw] precache skipped", url, err)),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const activeCaches = new Set([SHELL_CACHE, API_CACHE, IMAGE_CACHE, STATIC_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !activeCaches.has(key)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request).then((response) => {
    if (response.ok) void cache.put(request, response.clone());
    return response;
  });
  return cached ?? network;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, SHELL_CACHE).catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }

  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/api/v1/")) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  if (url.hostname === "image.tmdb.org") {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { body: event.data.text() } };
  }

  const notification = payload.notification ?? payload;
  const data = payload.data ?? notification.data ?? {};
  event.waitUntil(
    self.registration.showNotification(notification.title ?? "BingeBeacon", {
      body: notification.body ?? "",
      icon: notification.icon ?? "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: notification.tag ?? data.tag ?? "bingebeacon-notification",
      data,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url ?? "/", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url === target);
      return existing ? existing.focus() : self.clients.openWindow(target);
    }),
  );
});
