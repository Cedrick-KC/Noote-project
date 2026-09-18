/* Runs after the main app has loaded so successful offline replay refreshes visible data. */
window.addEventListener("noote:sync-status", (event) => {
  if (!event.detail.syncing && event.detail.lastSync && typeof loadData === "function" && auth) loadData().catch(() => {});
});
