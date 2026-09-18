const CACHE_NAME = "noote-cache-v2";
const DB_NAME = "noote-sw-sync-v1";
const DB_VERSION = 1;
const QUEUE_STORE = "requests";
const SYNC_TAG = "noote-api-sync";
const APP_SHELL = [
  "./", "./index.html", "./landing.html", "./manifest.json",
  "./css/styles.css", "./css/landing.css", "./css/sync-status.css",
  "./js/app.js", "./js/offline-sync.js", "./js/sync-status.js",
  "./icons/icon-192.png", "./icons/icon-512.png"
];

function openQueueDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) db.createObjectStore(QUEUE_STORE, { keyPath: "id", autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function queueRequest(request) {
  const db = await openQueueDb();
  const body = request.method === "DELETE" ? null : await request.clone().arrayBuffer();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    tx.objectStore(QUEUE_STORE).add({ url: request.url, method: request.method, headers: [...request.headers], body, createdAt: Date.now() });
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
  });
  db.close();
  if (self.registration.sync) await self.registration.sync.register(SYNC_TAG);
}

async function readQueuedRequests() {
  const db = await openQueueDb();
  const items = await new Promise((resolve, reject) => {
    const request = db.transaction(QUEUE_STORE, "readonly").objectStore(QUEUE_STORE).getAll();
    request.onsuccess = () => resolve(request.result || []); request.onerror = () => reject(request.error);
  });
  db.close(); return items;
}

async function deleteQueuedRequest(id) {
  const db = await openQueueDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite"); tx.objectStore(QUEUE_STORE).delete(id);
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function flushQueue() {
  for (const item of await readQueuedRequests()) {
    try {
      const response = await fetch(item.url, { method: item.method, headers: item.headers, body: item.body || undefined, credentials: "include" });
      if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 409)) await deleteQueuedRequest(item.id);
    } catch (_) { break; }
  }
}

self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim())));

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const isWrite = ["POST", "PATCH", "DELETE"].includes(request.method);
  const isSyncable = url.pathname.startsWith("/api/notes") || url.pathname.startsWith("/api/tasks");

  if (isSyncable && isWrite) {
    event.respondWith(fetch(request.clone()).catch(async () => {
      await queueRequest(request);
      return new Response(JSON.stringify({ offline: true, queued: true }), { status: 202, headers: { "Content-Type": "application/json" } });
    }));
    return;
  }
  if (url.pathname.startsWith("/api/assistant")) {
    event.respondWith(fetch(request).catch(() => new Response(JSON.stringify({ error: "offline" }), { headers: { "Content-Type": "application/json" }, status: 503 })));
    return;
  }
  if (request.mode === "navigate" && url.origin === self.location.origin && url.pathname === "/") {
    event.respondWith(caches.match("./landing.html")); return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone())); return response;
    }).catch(() => caches.match("./index.html"))));
  }
});

self.addEventListener("sync", (event) => { if (event.tag === SYNC_TAG) event.waitUntil(flushQueue()); });
self.addEventListener("online", () => flushQueue());
self.addEventListener("push", (event) => {
  let data = { title: "Noote", body: "You have an update." }; try { data = event.data.json(); } catch (_) {}
  event.waitUntil(self.registration.showNotification(data.title || "Noote", { body: data.body || "", icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { url: data.url || "./" } }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close(); const targetUrl = event.notification.data?.url || "./";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => { for (const client of clients) if ("focus" in client) return client.focus(); if (self.clients.openWindow) return self.clients.openWindow(targetUrl); }));
});
