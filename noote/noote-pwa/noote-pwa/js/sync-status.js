(() => {
  "use strict";

  const labels = {
    offline: "Offline — changes stay on this device",
    syncing: "Syncing your changes…",
    pending: (count) => `${count} change${count === 1 ? "" : "s"} waiting to sync`,
    synced: "All changes synced",
    failed: "Sync paused — retry when ready"
  };

  function mount() {
    let status = document.getElementById("sync-status");
    if (!status) {
      status = document.createElement("div");
      status.id = "sync-status";
      status.className = "sync-status hidden";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      document.body.appendChild(status);
    }
    return status;
  }

  function render(detail = {}) {
    const element = mount();
    const offline = !navigator.onLine;
    const pending = Number(detail.pending || 0);
    const text = offline ? labels.offline : detail.syncing ? labels.syncing : pending ? labels.pending(pending) : labels.synced;
    element.textContent = text;
    element.className = `sync-status ${offline ? "is-offline" : detail.syncing ? "is-syncing" : pending ? "is-pending" : "is-synced"}`;
    element.classList.remove("hidden");

    if (pending && !detail.syncing && navigator.onLine) {
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "sync-retry";
      retry.textContent = "Sync now";
      retry.addEventListener("click", () => window.NooteOffline?.sync());
      element.append(" ");
      element.appendChild(retry);
    }
  }

  window.addEventListener("online", () => render(window.NooteOffline?.getState()));
  window.addEventListener("offline", () => render(window.NooteOffline?.getState()));
  window.addEventListener("noote:sync-status", (event) => render(event.detail));
  window.addEventListener("load", () => render(window.NooteOffline?.getState()));
})();
