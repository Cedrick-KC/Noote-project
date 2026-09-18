(() => {
  "use strict";
  const logoutButton = document.getElementById("logoutBtn");
  if (logoutButton) logoutButton.addEventListener("click", () => { window.NooteOffline?.clearUserCache?.().catch(() => {}); });
})();
