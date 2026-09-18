const CACHE_NAME = "noote-cache-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./landing.html",
  "./manifest.json",
  "./css/styles.css",
  "./css/landing.css",
  "./js/app.js",
  "./js/offline-sync.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/assistant")) {
    event.respondWith(fetch(request).catch(() => new Response(
      JSON.stringify({ error: "offline" }),
      { headers: { "Content-Type": "application/json" }, status: 503 }
    )));
    return;
  }

  if (request.mode === "navigate" && url.origin === self.location.origin && url.pathname === "/") {
    event.respondWith(caches.match("./landing.html"));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
        return response;
      }).catch(() => caches.match("./index.html"));
    }));
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "Noote", body: "You have an update." };
  try { data = event.data.json(); } catch (_) {}
  event.waitUntil(self.registration.showNotification(data.title || "Noote", {
    body: data.body || "", icon: "icons/icon-192.png", badge: "icons/icon-192.png",
    data: { url: data.url || "./" }
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "./";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    for (const client of clients) if ("focus" in client) return client.focus();
    if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
  }));
});
