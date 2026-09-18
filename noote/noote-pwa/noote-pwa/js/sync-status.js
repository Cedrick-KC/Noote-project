(() => {
  "use strict";

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
    const conflicts = Number(detail.conflicts || 0);
    const authRequired = Number(detail.authRequired || 0);
    const pending = Number(detail.pending || 0);
    let text = "All changes synced";
    let className = "is-synced";
    if (offline) { text = "Offline — changes stay on this device"; className = "is-offline"; }
    else if (conflicts) { text = `${conflicts} conflict${conflicts === 1 ? "" : "s"} need review`; className = "is-conflict"; }
    else if (authRequired) { text = "Sign in to sync saved changes"; className = "is-auth-required"; }
    else if (detail.syncing) { text = "Syncing your changes…"; className = "is-syncing"; }
    else if (pending) { text = `${pending} change${pending === 1 ? "" : "s"} waiting to sync`; className = "is-pending"; }

    element.textContent = text;
    element.className = `sync-status ${className}`;
    if (conflicts) {
      const review = document.createElement("button");
      review.type = "button";
      review.className = "sync-retry";
      review.textContent = "Review";
      review.addEventListener("click", () => window.dispatchEvent(new CustomEvent("noote:sync-conflicts")));
      element.append(" "); element.appendChild(review);
    } else if (pending && !detail.syncing && navigator.onLine) {
      const retry = document.createElement("button");
      retry.type = "button"; retry.className = "sync-retry"; retry.textContent = "Sync now";
      retry.addEventListener("click", () => window.NooteOffline?.sync());
      element.append(" "); element.appendChild(retry);
    }
  }

  window.addEventListener("online", () => render(window.NooteOffline?.getState()));
  window.addEventListener("offline", () => render(window.NooteOffline?.getState()));
  window.addEventListener("noote:sync-status", (event) => render(event.detail));
  window.addEventListener("load", () => render(window.NooteOffline?.getState()));
})();
