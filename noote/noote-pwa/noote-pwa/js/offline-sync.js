/* Noote offline-first synchronization layer. */
(() => {
  "use strict";
  const DB_NAME = "noote-offline-v1";
  const DB_VERSION = 1;
  const DATA_STORE = "api-cache";
  const QUEUE_STORE = "sync-queue";
  const SYNCABLE = /^\/api\/(notes|tasks|reminders|events)(?:\/|$)/;
  const state = { pending: 0, syncing: false, conflicts: 0, authRequired: 0, lastSync: null };
  const listeners = new Set();
  const nativeFetch = window.fetch.bind(window);
  const newId = () => window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  function emit(extra = {}) {
    Object.assign(state, extra);
    window.dispatchEvent(new CustomEvent("noote:sync-status", { detail: { ...state } }));
    listeners.forEach((listener) => listener({ ...state }));
  }
  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DATA_STORE)) db.createObjectStore(DATA_STORE, { keyPath: "key" });
        if (!db.objectStoreNames.contains(QUEUE_STORE)) db.createObjectStore(QUEUE_STORE, { keyPath: "operationId" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async function transaction(storeName, mode, callback) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      let result;
      try { result = callback(tx.objectStore(storeName)); } catch (error) { db.close(); reject(error); return; }
      tx.oncomplete = () => { db.close(); resolve(result); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }
  async function getCached(key) { return transaction(DATA_STORE, "readonly", (store) => new Promise((resolve) => { const request = store.get(key); request.onsuccess = () => resolve(request.result?.response || null); request.onerror = () => resolve(null); })); }
  async function putCached(key, response) { const body = await response.clone().text(); await transaction(DATA_STORE, "readwrite", (store) => store.put({ key, response: { body, status: response.status, headers: [...response.headers] }, updatedAt: Date.now() })); }
  function responseFromCache(cached) { return cached && new Response(cached.body, { status: cached.status, headers: cached.headers }); }
  async function listQueue() { return transaction(QUEUE_STORE, "readonly", (store) => new Promise((resolve) => { const request = store.getAll(); request.onsuccess = () => resolve(request.result || []); request.onerror = () => resolve([]); })); }
  async function refreshPendingCount() { const items = await listQueue(); emit({ pending: items.length, conflicts: items.filter((item) => item.status === "conflict").length, authRequired: items.filter((item) => item.status === "auth-required").length }); return items; }
  async function updateOperation(operationId, patch) { await transaction(QUEUE_STORE, "readwrite", (store) => { const request = store.get(operationId); request.onsuccess = () => { if (request.result) store.put({ ...request.result, ...patch }); }; }); }
  async function deleteOperation(operationId) { await transaction(QUEUE_STORE, "readwrite", (store) => store.delete(operationId)); }
  async function enqueue(request) {
    const operationId = newId();
    let body = request.method === "DELETE" ? JSON.stringify({ operationId }) : await request.clone().text();
    try { const payload = body ? JSON.parse(body) : {}; payload.operationId = payload.operationId || operationId; body = JSON.stringify(payload); } catch (_) {}
    const headers = new Headers(request.headers);
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    await transaction(QUEUE_STORE, "readwrite", (store) => store.put({ operationId, url: request.url, method: request.method, headers: [...headers], body, createdAt: Date.now(), attempts: 0 }));
    await refreshPendingCount();
    return new Response(JSON.stringify({ offline: true, queued: true, operationId }), { status: request.method === "POST" ? 201 : 200, headers: { "Content-Type": "application/json" } });
  }
  async function sync() {
    if (state.syncing || !navigator.onLine) return;
    const items = await refreshPendingCount(); if (!items.length) return;
    emit({ syncing: true });
    for (const item of items) {
      if (item.status === "conflict" || item.status === "auth-required") continue;
      try {
        const response = await nativeFetch(item.url, { method: item.method, headers: item.headers, body: item.body || undefined, credentials: "include" });
        if (response.ok) await deleteOperation(item.operationId);
        else if (response.status === 409) await updateOperation(item.operationId, { status: "conflict", conflictAt: Date.now(), conflict: await response.json().catch(() => null) });
        else if (response.status === 401) await updateOperation(item.operationId, { status: "auth-required" });
        else if (response.status >= 400 && response.status < 500) await deleteOperation(item.operationId);
      } catch (error) { await updateOperation(item.operationId, { attempts: item.attempts + 1, lastError: error.message }); break; }
    }
    emit({ syncing: false, lastSync: new Date().toISOString() }); await refreshPendingCount();
  }
  async function listConflicts() { return (await listQueue()).filter((item) => item.status === "conflict"); }
  async function resolveConflict(operationId, strategy) {
    const item = (await listQueue()).find((entry) => entry.operationId === operationId);
    if (!item) return false;
    if (strategy === "discard") { await deleteOperation(operationId); await refreshPendingCount(); return true; }
    const server = item.conflict?.server;
    if (strategy === "keep-local" && server?.version !== undefined) {
      let payload = {}; try { payload = item.body ? JSON.parse(item.body) : {}; } catch (_) {}
      payload.expectedVersion = server.version;
      await updateOperation(operationId, { body: JSON.stringify(payload), status: undefined, conflict: undefined });
      await refreshPendingCount();
      return true;
    }
    return false;
  }
  window.fetch = async (input, init = {}) => {
    const request = new Request(input, init); const url = new URL(request.url, location.href);
    if (!SYNCABLE.test(url.pathname)) return nativeFetch(request);
    if (request.method === "GET") { try { const response = await nativeFetch(request); if (response.ok) await putCached(url.href, response); return response; } catch (error) { const cached = responseFromCache(await getCached(url.href)); if (cached) return cached; throw error; } }
    try { return await nativeFetch(request); } catch (_) { return enqueue(request); }
  };
  window.NooteOffline = { sync, listConflicts, resolveConflict, getState: () => ({ ...state }), subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); }, clearUserCache: () => transaction(DATA_STORE, "readwrite", (store) => { const request = store.getAllKeys(); request.onsuccess = () => request.result.forEach((key) => store.delete(key)); }) };
  window.addEventListener("online", sync); window.addEventListener("focus", sync); window.addEventListener("load", () => { refreshPendingCount().then(sync).catch(() => {}); });
})();
