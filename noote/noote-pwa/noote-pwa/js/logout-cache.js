function logout() {
  window.NooteOffline?.clearUserCache?.().catch(() => {});
  clearAuth();
  auth = null;
  state = { notes: [], tasks: [], reminders: [], events: [], teamMembers: [] };
  showAuthScreen("login");
}
