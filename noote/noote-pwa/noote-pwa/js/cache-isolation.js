(() => {
  "use strict";
  const logoutButton = document.getElementById("logoutBtn");
  if (logoutButton) logoutButton.addEventListener("click", () => {
    // Queued mutations contain authenticated data. Do not let another account
    // on this device inherit them after logout.
    window.NooteOffline?.clearUserCache?.().catch(() => {});
  });
})();
