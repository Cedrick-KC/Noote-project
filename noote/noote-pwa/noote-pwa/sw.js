const CACHE_NAME = "noote-cache-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css",
  "./js/app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// Install: pre-cache the app shell so it works fully offline after first load
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - Same-origin app shell files: cache-first (instant load, works offline)
// - Assistant API calls (network-dependent, needs live AI): network-only, never cached
// - Everything else same-origin: cache-first with network fallback + runtime caching
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.pathname.startsWith("/api/assistant")) {
    // Assistant needs a live connection — don't cache, don't serve stale AI replies
    event.respondWith(
      fetch(req).catch(() =>
        new Response(
          JSON.stringify({ error: "offline" }),
          { headers: { "Content-Type": "application/json" }, status: 503 }
        )
      )
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
            return res;
          })
          .catch(() => caches.match("./index.html"));
      })
    );
  }
});

// Show a system notification when the backend pushes a message
// (new task assignment, or the daily digest).
self.addEventListener("push", (event) => {
  let data = { title: "Noote", body: "You have an update." };
  try { data = event.data.json(); } catch (e) { /* keep default */ }

  event.waitUntil(
    self.registration.showNotification(data.title || "Noote", {
      body: data.body || "",
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
      data: { url: data.url || "./" },
    })
  );
});

// Focus an already-open tab, or open a new one, when the notification is tapped
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "./";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
