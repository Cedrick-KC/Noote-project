/* Noote offline-first synchronization layer.
 * It keeps API reads in IndexedDB and queues failed writes until connectivity returns.
 */
(() => {
  "use strict";

  const DB_NAME = "noote-offline-v1";
  const DB_VERSION = 1;
  const DATA_STORE = "api-cache";
  const QUEUE_STORE = "sync-queue";
  const SYNCABLE = /^\/api\/(notes|tasks)(?:\/|$)/;
  const state = { pending: 0, syncing: false, lastSync: null };
  const listeners = new Set();
  const nativeFetch = window.fetch.bind(window);

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

  async function transaction(store, mode, callback) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const result = callback(tx.objectStore(store));
      tx.oncomplete = () => { db.close(); resolve(result); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }

  async function getCached(key) {
    return transaction(DATA_STORE, "readonly", (store) => new Promise((resolve) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.response || null);
      request.onerror = () => resolve(null);
    }));
  }

  async function putCached(key, response) {
    const clone = response.clone();
    const body = await clone.text();
    await transaction(DATA_STORE, "readwrite", (store) => store.put({
      key, response: { body, status: response.status, headers: [...response.headers] }, updatedAt: Date.now()
    }));
  }

  function responseFromCache(cached) {
    return cached && new Response(cached.body, { status: cached.status, headers: cached.headers });
  }

  async function refreshPendingCount() {
    const items = await transaction(QUEUE_STORE, "readonly", (store) => new Promise((resolve) => {
      const request = store.getAll(); request.onsuccess = () => resolve(request.result || []); request.onerror = () => resolve([]);
    }));
    emit({ pending: items.length });
    return items;
  }

  async function enqueue(request) {
    const body = request.method === "DELETE" ? null : await request.clone().text();
    const operation = {
      operationId: crypto.randomUUID(), url: request.url, method: request.method,
      headers: [...request.headers], body, createdAt: Date.now(), attempts: 0
    };
    await transaction(QUEUE_STORE, "readwrite", (store) => store.put(operation));
    await refreshPendingCount();
    emit({ syncing: false });
    return new Response(JSON.stringify({ offline: true, queued: true, operationId: operation.operationId }), {
      status: request.method === "POST" ? 201 : 200, headers: { "Content-Type": "application/json" }
    });
  }

  async function removeOperation(operationId) {
    return transaction(QUEUE_STORE, "readwrite", (store) => store.delete(operationId));
  }

  async function sync() {
    if (state.syncing || !navigator.onLine) return;
    const items = await refreshPendingCount();
    if (!items.length) return;
    emit({ syncing: true });
    for (const item of items) {
      try {
        const response = await nativeFetch(item.url, {
          method: item.method, headers: item.headers, body: item.body || undefined,
          credentials: "include"
        });
        if (response.ok) await removeOperation(item.operationId);
        else if (response.status === 409) {
          await transaction(QUEUE_STORE, "readwrite", (store) => store.put({ ...item, status: "conflict" }));
        } else if (response.status >= 400 && response.status < 500) await removeOperation(item.operationId);
      } catch (error) {
        await transaction(QUEUE_STORE, "readwrite", (store) => store.put({ ...item, attempts: item.attempts + 1, lastError: error.message }));
        break;
      }
    }
    emit({ syncing: false, lastSync: new Date().toISOString() });
    await refreshPendingCount();
  }

  window.fetch = async (input, init = {}) => {
    const request = new Request(input, init);
    const url = new URL(request.url, location.href);
    if (!SYNCABLE.test(url.pathname)) return nativeFetch(request);
    if (request.method === "GET") {
      try {
        const response = await nativeFetch(request);
        if (response.ok) await putCached(url.href, response);
        return response;
      } catch (error) {
        const cached = responseFromCache(await getCached(url.href));
        if (cached) return cached;
        throw error;
      }
    }
    try { return await nativeFetch(request); } catch (error) { return enqueue(request); }
  };

  window.NooteOffline = { sync, getState: () => ({ ...state }), subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); } };
  window.addEventListener("online", sync);
  window.addEventListener("focus", sync);
  window.addEventListener("load", () => { refreshPendingCount().then(sync).catch(() => {}); });
})();
