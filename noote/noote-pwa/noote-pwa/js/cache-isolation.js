(() => {
  "use strict";
  const logoutButton = document.getElementById("logoutBtn");
  if (logoutButton) logoutButton.addEventListener("click", () => {
    // Cached server responses are user-sensitive; queued writes remain so they
    // can be resumed after the same user signs in again.
    window.NooteOffline?.clearCachedResponses?.().catch(() => {});
  });
})();
