/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst, StaleWhileRevalidate, CacheFirst } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Defaults from Serwist
    ...defaultCache,
    // API calls: Network First — always try fresh, fall back to cache
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/"),
      handler: new NetworkFirst({
        cacheName: "api-cache",
        networkTimeoutSeconds: 10,
      }),
    },
    // TMDB images: Stale While Revalidate
    {
      matcher: ({ url }) => url.hostname === "image.tmdb.org",
      handler: new StaleWhileRevalidate({
        cacheName: "tmdb-images",
      }),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

// Handle push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title ?? "BingeBeacon";
    const options: NotificationOptions = {
      body: data.body ?? "",
      icon: "/icons/icon-192.svg",
      badge: "/icons/icon-192.svg",
      tag: data.tag ?? "bingebeacon-notification",
      data: data.data ?? {},
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    // Fallback for plain text push
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("BingeBeacon", { body: text })
    );
  }
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      return self.clients.openWindow(url);
    })
  );
});

serwist.addEventListeners();
