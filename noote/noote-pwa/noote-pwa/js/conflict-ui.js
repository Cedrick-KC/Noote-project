(() => {
  "use strict";
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
  function show() {
    const conflicts = window.NooteOffline?.listConflicts ? window.NooteOffline.listConflicts() : Promise.resolve([]);
    conflicts.then((items) => {
      let panel = document.getElementById("sync-conflicts");
      if (!panel) { panel = document.createElement("section"); panel.id = "sync-conflicts"; panel.className = "sync-conflicts"; document.body.appendChild(panel); }
      panel.innerHTML = `<h2>Changes needing review</h2>${items.length ? items.map((item) => `<article class="sync-conflict"><p><strong>${escapeHtml(item.method)} ${escapeHtml(new URL(item.url).pathname)}</strong></p><p>Another device changed this item while you were offline.</p><div><button data-conflict="local" data-id="${escapeHtml(item.operationId)}">Keep my change</button><button data-conflict="discard" data-id="${escapeHtml(item.operationId)}">Use server version</button></div></article>`).join("") : "<p>No conflicts remain.</p>"}`;
      panel.querySelectorAll("[data-conflict]").forEach((button) => button.addEventListener("click", async () => { const strategy = button.dataset.conflict === "local" ? "keep-local" : "discard"; await window.NooteOffline.resolveConflict(button.dataset.id, strategy); show(); }));
    }).catch(() => {});
  }
  window.addEventListener("noote:sync-conflicts", show);
})();
