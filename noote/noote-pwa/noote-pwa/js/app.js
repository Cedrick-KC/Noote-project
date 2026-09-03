/* Noote — vanilla JS PWA frontend, talks to the Noote API for everything
   except UI/theme preferences. */

const SETTINGS_KEY = "noote-settings-v1";
const AUTH_KEY = "noote-auth-v1";
const THEMES = {
  lightBlue: { name: "Light Blue", swatch: "#1C6FA6" },
  slateNight: { name: "Slate Night", swatch: "#63A8F0" },
  sunset: { name: "Sunset", swatch: "#D9622B" },
  forest: { name: "Forest", swatch: "#2F7D4F" },
  grape: { name: "Grape", swatch: "#6D45B8" },
};

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDay = (d) => new Date(d + "T00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const escapeAttr = escapeHtml;

/* ---------- legal content (template — not legal advice, see disclaimer in the views) ---------- */
const LEGAL = {
  terms: {
    title: "Terms & Conditions",
    updated: "Last updated: [DATE]",
    body: `
<p class="legal-disclaimer">This is a starting template, not legal advice. Replace the bracketed placeholders and have it reviewed by a qualified lawyer in your jurisdiction before relying on it commercially.</p>

<h3>1. Acceptance of terms</h3>
<p>By creating an account or using Noote ("the Service"), you agree to these Terms & Conditions. If you are creating an account on behalf of an organization, you confirm you have authority to bind that organization to these terms.</p>

<h3>2. Description of service</h3>
<p>Noote is a work management application that lets an organization ("Admin") create accounts for its workers, assign tasks, and track completion. It also provides personal notes, reminders, a calendar, and an AI assistant feature.</p>

<h3>3. Accounts and roles</h3>
<p>Organizations are represented by an Admin account, which may create Worker accounts. Admins are responsible for the accuracy of information provided when creating Worker accounts and for managing access within their organization. [Company Name] is not responsible for how an organization chooses to use task assignment features internally.</p>

<h3>4. Subscriptions and billing</h3>
<p>Certain features require a paid subscription plan. Prices are shown in RWF and are subject to change with notice. Subscriptions renew automatically until canceled. Refunds, if any, are handled at [Company Name]'s discretion unless required otherwise by applicable law.</p>

<h3>5. Acceptable use</h3>
<p>You agree not to use the Service to store or transmit unlawful content, to harass or discriminate against workers, or to attempt to access accounts or data outside your organization.</p>

<h3>6. Data and content ownership</h3>
<p>You retain ownership of the notes, tasks, and other content you and your organization create. You grant [Company Name] a limited license to process that content solely to provide the Service (including sending relevant content to third-party AI providers for the assistant feature — see the Privacy Policy).</p>

<h3>7. Termination</h3>
<p>Either party may terminate this agreement at any time. [Company Name] may suspend or terminate accounts that violate these terms. Upon termination, access to the Service ends; data handling on termination is described in the Privacy Policy.</p>

<h3>8. Disclaimer of warranties</h3>
<p>The Service is provided "as is" without warranties of any kind, express or implied, including fitness for a particular purpose or uninterrupted availability.</p>

<h3>9. Limitation of liability</h3>
<p>To the maximum extent permitted by law, [Company Name] is not liable for indirect, incidental, or consequential damages arising from use of the Service.</p>

<h3>10. Changes to these terms</h3>
<p>[Company Name] may update these terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated terms.</p>

<h3>11. Governing law</h3>
<p>These terms are governed by the laws of [Jurisdiction], without regard to conflict-of-law principles.</p>

<h3>12. Contact</h3>
<p>Questions about these terms can be sent to helpline@noote.com.</p>
    `,
  },
  privacy: {
    title: "Privacy Policy",
    updated: "Last updated: [DATE]",
    body: `
<p class="legal-disclaimer">This is a starting template, not legal advice. Replace the bracketed placeholders and have it reviewed by a qualified lawyer before relying on it commercially — especially if you'll process personal data under regulations like Rwanda's Data Protection and Privacy Law or GDPR.</p>

<h3>1. What we collect</h3>
<p>Account information (name, email, hashed password), organization information, content you create (notes, tasks, reminders, calendar events), device push-notification subscriptions, and basic usage/log data.</p>

<h3>2. How we use it</h3>
<p>To provide and operate the Service: authenticating you, displaying your organization's tasks, sending push notifications you or your admin trigger, processing payments, and providing customer support.</p>

<h3>3. AI assistant processing</h3>
<p>When you use the "Ask Noote" assistant, relevant notes, tasks, reminders, and calendar data are sent to Anthropic's API to generate a response. This data is used to answer your question and is subject to Anthropic's own data handling terms. Don't enter information in the assistant you wouldn't want processed by a third-party AI provider.</p>

<h3>4. Payment processing</h3>
<p>Subscription payments are processed by Stripe. We do not store your card details — Stripe handles that directly.</p>

<h3>5. Data sharing</h3>
<p>We do not sell personal data. We share data only with: the hosting/database provider that stores it, Stripe (billing), Anthropic (AI assistant queries you initiate), and email/push providers used to deliver notifications you're subscribed to.</p>

<h3>6. Data retention</h3>
<p>We retain account and content data for as long as your organization's account is active, plus a reasonable period afterward for backups and legal compliance, unless you request deletion sooner.</p>

<h3>7. Your rights</h3>
<p>You may request access to, correction of, or deletion of your personal data by contacting [Contact Email]. An organization's admin can remove worker accounts directly; workers can request their own account or content be deleted.</p>

<h3>8. Security</h3>
<p>Passwords are hashed and never stored in plain text. We use industry-standard practices to protect data in transit and at rest, but no system is 100% secure.</p>

<h3>9. Children's privacy</h3>
<p>The Service is intended for use by working adults and organizations, not by children.</p>

<h3>10. Changes to this policy</h3>
<p>We may update this policy from time to time; continued use of the Service after changes constitutes acceptance.</p>

<h3>11. Contact</h3>
<p>Questions about this policy can be sent to helpline@noote.com.</p>
    `,
  },
};

/* ---------- settings (device-local: theme, API URL) ---------- */
function loadSettings() {
  try { const raw = localStorage.getItem(SETTINGS_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
  return { apiBaseUrl: "https://cedrique.alwaysdata.net", theme: "lightBlue" };
}
function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
let settings = loadSettings();
document.documentElement.setAttribute("data-theme", settings.theme || "lightBlue");

/* ---------- auth (session: token, user, organization) ---------- */
function loadAuth() {
  try { const raw = localStorage.getItem(AUTH_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
  return null;
}
function saveAuth(a) { localStorage.setItem(AUTH_KEY, JSON.stringify(a)); }
function clearAuth() { localStorage.removeItem(AUTH_KEY); }
let auth = loadAuth(); // { token, user, organization }

/* ---------- API client ---------- */
async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`${settings.apiBaseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// For multipart uploads (file attachments) — no Content-Type header (the
// browser sets the correct multipart boundary itself), body is FormData.
async function apiUpload(path, formData) {
  const res = await fetch(`${settings.apiBaseUrl}${path}`, {
    method: "POST",
    headers: { ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}) },
    body: formData,
  });
  let data = {};
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
  return data;
}

/* ---------- app state (fetched from API after login) ---------- */
let state = { notes: [], tasks: [], reminders: [], events: [], teamMembers: [] };
let currentView = "today";
let selectedNoteId = null;
let calCursor = new Date();
let selectedDate = todayISO();
let chatMessages = [];

const authScreen = document.getElementById("authScreen");
const appShellEl = document.querySelector(".app-shell");
const mainEl = document.getElementById("main");

/* ================= AUTH SCREEN ================= */
function showAuthScreen(mode = "login") {
  appShellEl.classList.add("hidden");
  document.getElementById("assistantBubble").classList.add("hidden");
  document.getElementById("assistantPanel").classList.add("hidden");
  authScreen.classList.remove("hidden");

  if (mode === "forgot") return renderForgotPasswordScreen();
  if (mode === "reset") return; // handled separately by renderResetPasswordScreen

  authScreen.innerHTML = `
    <div class="auth-card">
      <div class="brand" style="margin-bottom:22px">
        <div class="brand-mark">N</div>
        <span class="brand-name">noote</span>
      </div>
      <div class="auth-tabs">
        <button class="auth-tab ${mode === "login" ? "active" : ""}" data-mode="login">Log in</button>
        <button class="auth-tab ${mode === "register" ? "active" : ""}" data-mode="register">Start an organization</button>
      </div>
      <div id="authError" class="auth-error hidden"></div>
      <form id="authForm" class="auth-form"></form>
      <div class="auth-footer">
        ${mode === "login" ? `<button class="link-btn" id="forgotLink">Forgot password?</button>` : ""}
        <div class="auth-legal-links">
          <button class="link-btn" data-legal="terms">Terms</button>
          <span>·</span>
          <button class="link-btn" data-legal="privacy">Privacy</button>
        </div>
      </div>
    </div>
  `;

  const formEl = document.getElementById("authForm");
  if (mode === "login") {
    formEl.innerHTML = `
      <label>Email</label>
      <input type="email" id="loginEmail" required />
      <label>Password</label>
      <input type="password" id="loginPassword" class="pw-input" required />
      <button type="submit" class="btn-primary" style="width:100%;margin-top:6px">Log in</button>
    `;
  } else {
    formEl.innerHTML = `
      <label>Organization name</label>
      <input type="text" id="regOrgName" required placeholder="Acme Ltd." />
      <label>Your name</label>
      <input type="text" id="regName" required />
      <label>Email</label>
      <input type="email" id="regEmail" required />
      <label>Password (min 8 characters)</label>
      <input type="password" id="regPassword" class="pw-input" required minlength="8" />
      <button type="submit" class="btn-primary" style="width:100%;margin-top:6px">Create organization</button>
      <p class="auth-hint">This creates your organization and makes you its admin. You can add workers afterward from the Team tab.</p>
    `;
  }

  authScreen.querySelectorAll(".auth-tab").forEach((tab) =>
    tab.addEventListener("click", () => showAuthScreen(tab.dataset.mode))
  );
  wirePasswordToggles(authScreen);
  const forgotLink = document.getElementById("forgotLink");
  if (forgotLink) forgotLink.addEventListener("click", () => showAuthScreen("forgot"));
  authScreen.querySelectorAll("[data-legal]").forEach((btn) =>
    btn.addEventListener("click", () => showAuthLegalOverlay(btn.dataset.legal, mode))
  );

  formEl.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = document.getElementById("authError");
    errEl.classList.add("hidden");
    try {
      let result;
      if (mode === "login") {
        result = await api("/api/auth/login", {
          method: "POST",
          body: { email: document.getElementById("loginEmail").value, password: document.getElementById("loginPassword").value },
        });
      } else {
        result = await api("/api/auth/register-org", {
          method: "POST",
          body: {
            orgName: document.getElementById("regOrgName").value,
            name: document.getElementById("regName").value,
            email: document.getElementById("regEmail").value,
            password: document.getElementById("regPassword").value,
          },
        });
      }
      auth = { token: result.token, user: result.user, organization: result.organization };
      saveAuth(auth);
      await bootApp();
    } catch (err) {
      errEl.textContent = err.message || "Something went wrong.";
      errEl.classList.remove("hidden");
    }
  });
}

/* ---------- forgot / reset password ---------- */
function renderForgotPasswordScreen() {
  authScreen.innerHTML = `
    <div class="auth-card">
      <div class="brand" style="margin-bottom:22px"><div class="brand-mark">N</div><span class="brand-name">noote</span></div>
      <h3 style="margin:0 0 6px;font-family:'Space Grotesk',sans-serif">Reset your password</h3>
      <p style="font-size:12.5px;color:var(--muted);margin:0 0 16px">Enter your account email and we'll send you a reset link.</p>
      <div id="authError" class="auth-error hidden"></div>
      <div id="authSuccess" class="settings-msg hidden" style="margin-bottom:12px"></div>
      <form id="forgotForm" class="auth-form">
        <label>Email</label>
        <input type="email" id="forgotEmail" required />
        <button type="submit" class="btn-primary" style="width:100%;margin-top:10px">Send reset link</button>
      </form>
      <div class="auth-footer"><button class="link-btn" id="backToLogin">← Back to log in</button></div>
    </div>
  `;
  document.getElementById("backToLogin").addEventListener("click", () => showAuthScreen("login"));
  document.getElementById("forgotForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = document.getElementById("authError");
    const okEl = document.getElementById("authSuccess");
    errEl.classList.add("hidden"); okEl.classList.add("hidden");
    try {
      const res = await api("/api/auth/forgot-password", { method: "POST", body: { email: document.getElementById("forgotEmail").value } });
      okEl.textContent = res.message || "If that email is registered, a reset link has been sent.";
      okEl.classList.remove("hidden");
    } catch (err) {
      errEl.textContent = err.message; errEl.classList.remove("hidden");
    }
  });
}

function renderResetPasswordScreen(email, token) {
  appShellEl.classList.add("hidden");
  document.getElementById("assistantBubble").classList.add("hidden");
  authScreen.classList.remove("hidden");
  authScreen.innerHTML = `
    <div class="auth-card">
      <div class="brand" style="margin-bottom:22px"><div class="brand-mark">N</div><span class="brand-name">noote</span></div>
      <h3 style="margin:0 0 6px;font-family:'Space Grotesk',sans-serif">Choose a new password</h3>
      <p style="font-size:12.5px;color:var(--muted);margin:0 0 16px">For ${escapeHtml(email)}</p>
      <div id="authError" class="auth-error hidden"></div>
      <form id="resetForm" class="auth-form">
        <label>New password (min 8 characters)</label>
        <input type="password" id="newResetPassword" class="pw-input" required minlength="8" />
        <button type="submit" class="btn-primary" style="width:100%;margin-top:10px">Set new password</button>
      </form>
    </div>
  `;
  wirePasswordToggles(authScreen);
  document.getElementById("resetForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = document.getElementById("authError");
    errEl.classList.add("hidden");
    try {
      await api("/api/auth/reset-password", { method: "POST", body: { email, token, newPassword: document.getElementById("newResetPassword").value } });
      window.history.replaceState({}, "", window.location.pathname);
      showAuthScreen("login");
    } catch (err) {
      errEl.textContent = err.message; errEl.classList.remove("hidden");
    }
  });
}

function showAuthLegalOverlay(type, returnMode) {
  const doc = LEGAL[type];
  authScreen.innerHTML = `
    <div class="auth-card" style="width:520px;max-height:80vh;overflow-y:auto" class="noote-scroll">
      <button class="link-btn" id="legalOverlayBack" style="margin-bottom:14px">← Back</button>
      <h3 style="margin:0 0 4px;font-family:'Space Grotesk',sans-serif">${escapeHtml(doc.title)}</h3>
      <p style="font-size:11.5px;color:var(--muted);margin:0 0 14px">${escapeHtml(doc.updated)}</p>
      <div class="legal-body">${doc.body}</div>
    </div>
  `;
  document.getElementById("legalOverlayBack").addEventListener("click", () => showAuthScreen(returnMode));
}

/* ================= BOOT / LOGOUT ================= */
async function bootApp() {
  authScreen.classList.add("hidden");
  appShellEl.classList.remove("hidden");
  document.getElementById("assistantBubble").classList.remove("hidden");

  const badge = document.getElementById("userBadge");
  badge.innerHTML = `<div class="user-name">${escapeHtml(auth.user.name)}</div><div class="user-role">${auth.user.role === "admin" ? "Admin" : "Worker"} · ${escapeHtml(auth.organization?.name || "")}</div>`;

  document.getElementById("teamNavBtn").classList.toggle("hidden", auth.user.role !== "admin");
  document.getElementById("activityNavBtn").classList.toggle("hidden", auth.user.role !== "admin");

  const verifyBanner = document.getElementById("verify-banner");
  verifyBanner.classList.toggle("hidden", auth.user.emailVerified !== false);

  try {
    const [tasks, notes, reminders, events] = await Promise.all([
      api("/api/tasks"), api("/api/notes"), api("/api/reminders"), api("/api/events"),
    ]);
    state.tasks = tasks; state.notes = notes; state.reminders = reminders; state.events = events;
    if (auth.user.role === "admin") {
      state.teamMembers = await api("/api/users").catch(() => []);
    }
  } catch (err) {
    console.error("Failed to load data:", err.message);
  }

  setupPush();
  render();
}

function logout() {
  clearAuth();
  auth = null;
  state = { notes: [], tasks: [], reminders: [], events: [], teamMembers: [] };
  showAuthScreen("login");
}
document.getElementById("logoutBtn").addEventListener("click", logout);
document.getElementById("resendVerifyBtn").addEventListener("click", async (e) => {
  const btn = e.target;
  btn.disabled = true; btn.textContent = "Sending…";
  try { await api("/api/auth/resend-verification", { method: "POST" }); btn.textContent = "Sent — check your email"; }
  catch (err) { btn.textContent = "Try again"; btn.disabled = false; alert(err.message); }
});

/* ================= RENDER DISPATCH ================= */
function render() {
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === currentView));
  if (currentView === "today") renderToday();
  else if (currentView === "notes") renderNotes();
  else if (currentView === "tasks") renderTasks();
  else if (currentView === "calendar") renderCalendar();
  else if (currentView === "team") renderTeam();
  else if (currentView === "activity") renderActivity();
  else if (currentView === "settings") renderSettings();
  else if (currentView === "help") renderHelp();
  else if (currentView === "legal-terms") renderLegal("terms");
  else if (currentView === "legal-privacy") renderLegal("privacy");
}

/* ================= TODAY ================= */
function renderToday() {
  const today = todayISO();
  const openTasks = state.tasks.filter((t) => !t.done && (!t.dueDate || t.dueDate <= today));
  const openReminders = state.reminders.filter((r) => !r.done);
  const upcomingEvents = state.events
    .filter((e) => e.date >= today)
    .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")))
    .slice(0, 4);
  const recentNotes = state.notes.slice(0, 3);

  const isNewAdmin = auth.user.role === "admin" && (state.teamMembers?.length || 1) <= 1 && state.tasks.length === 0;

  mainEl.innerHTML = `
    ${isNewAdmin ? `
    <div class="onboarding-banner">
      <div class="onboarding-title">Welcome to Noote — let's get your team set up</div>
      <div class="onboarding-steps">
        <div class="onboarding-step"><span class="step-num">1</span> Add your first worker in <strong>Team</strong></div>
        <div class="onboarding-step"><span class="step-num">2</span> Assign them a task from the same tab</div>
        <div class="onboarding-step"><span class="step-num">3</span> Check <strong>Settings</strong> for billing when you're ready to add more seats</div>
      </div>
      <button class="btn-primary" id="onboardingGoTeam" style="margin-top:12px">Go to Team →</button>
    </div>
    ` : ""}
    <div class="hero">
      <div class="hero-top">
        <div>
          <div class="hero-greeting">Good to see you, ${escapeHtml(auth.user.name.split(" ")[0])}</div>
          <div class="hero-date">${fmtDay(today)}</div>
        </div>
        <div class="hero-clock" id="clock"></div>
      </div>
      <div class="quickadd">
        <button class="quickadd-type active" data-type="task">Task</button>
        <button class="quickadd-type" data-type="reminder">Reminder</button>
        <button class="quickadd-type" data-type="note">Note</button>
        <input class="quickadd-input" id="quickInput" placeholder="Quick add a task…" />
        <button class="quickadd-submit" id="quickSubmit">+</button>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-row"><h3>Tasks due</h3><button class="link-btn" data-nav="tasks">View all</button></div>
        <div id="todayTasks"></div>
      </div>
      <div class="card">
        <div class="card-row"><h3>Reminders</h3></div>
        <div id="todayReminders"></div>
      </div>
      <div class="card">
        <div class="card-row"><h3>Recent notes</h3><button class="link-btn" data-nav="notes">View all</button></div>
        <div id="todayNotes"></div>
      </div>
      <div class="card">
        <div class="card-row"><h3>Upcoming events</h3><button class="link-btn" data-nav="calendar">View all</button></div>
        <div id="todayEvents"></div>
      </div>
    </div>
  `;

  document.getElementById("todayTasks").innerHTML = openTasks.length
    ? openTasks.slice(0, 6).map((t) => `
        <label class="row-item" style="cursor:pointer">
          <input type="checkbox" data-toggle-task="${t._id}" ${t.done ? "checked" : ""} />
          <span>${escapeHtml(t.text)}</span>
          ${t.assignedBy && t.assignedBy._id !== t.assignedTo?._id ? `<span class="assigned-tag">assigned</span>` : ""}
        </label>`).join("")
    : `<div class="empty-state">Nothing due — add one above to get moving.</div>`;

  document.getElementById("todayReminders").innerHTML = openReminders.length
    ? openReminders.slice(0, 6).map((r) => `
        <div class="row-item">
          <span style="flex:1">${escapeHtml(r.text)}</span>
          ${r.time ? `<span class="mono-time">${r.time}</span>` : ""}
          <button class="icon-btn" data-toggle-reminder="${r._id}">✓</button>
        </div>`).join("")
    : `<div class="empty-state">No open reminders.</div>`;

  document.getElementById("todayNotes").innerHTML = recentNotes.length
    ? recentNotes.map((n) => `
        <div style="margin-bottom:10px">
          <div style="font-size:13.5px;font-weight:600">${escapeHtml(n.title || "Untitled")}</div>
          <div class="note-item-snippet">${escapeHtml(n.content || "Empty note")}</div>
        </div>`).join("")
    : `<div class="empty-state">No notes yet — capture your first thought.</div>`;

  document.getElementById("todayEvents").innerHTML = upcomingEvents.length
    ? upcomingEvents.map((e) => `
        <div class="row-item">
          <span style="flex:1">${escapeHtml(e.title)}</span>
          <span class="mono-time">${e.date}${e.time ? " " + e.time : ""}</span>
        </div>`).join("")
    : `<div class="empty-state">Nothing on the calendar yet.</div>`;

  const clockEl = document.getElementById("clock");
  const tickClock = () => { clockEl.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); };
  tickClock();
  clearInterval(window.__clockIv);
  window.__clockIv = setInterval(tickClock, 30000);

  let quickType = "task";
  document.querySelectorAll(".quickadd-type").forEach((btn) => {
    btn.addEventListener("click", () => {
      quickType = btn.dataset.type;
      document.querySelectorAll(".quickadd-type").forEach((b) => b.classList.toggle("active", b === btn));
      document.getElementById("quickInput").placeholder = `Quick add a ${quickType}…`;
    });
  });
  const submitQuick = async () => {
    const val = document.getElementById("quickInput").value.trim();
    if (!val) return;
    try {
      if (quickType === "task") {
        const t = await api("/api/tasks", { method: "POST", body: { text: val, priority: "normal", dueDate: today } });
        state.tasks.unshift(t);
      } else if (quickType === "reminder") {
        const r = await api("/api/reminders", { method: "POST", body: { text: val } });
        state.reminders.unshift(r);
      } else {
        const n = await api("/api/notes", { method: "POST", body: { title: val.slice(0, 60), content: "" } });
        state.notes.unshift(n);
      }
      document.getElementById("quickInput").value = "";
      render();
    } catch (err) { alert(err.message); }
  };
  document.getElementById("quickSubmit").addEventListener("click", submitQuick);
  document.getElementById("quickInput").addEventListener("keydown", (e) => { if (e.key === "Enter") submitQuick(); });

  mainEl.querySelectorAll("[data-toggle-task]").forEach((el) => el.addEventListener("change", async () => {
    const t = state.tasks.find((tk) => tk._id === el.dataset.toggleTask);
    if (!t) return;
    try { await api(`/api/tasks/${t._id}`, { method: "PATCH", body: { done: !t.done } }); t.done = !t.done; render(); }
    catch (err) { alert(err.message); }
  }));
  mainEl.querySelectorAll("[data-toggle-reminder]").forEach((el) => el.addEventListener("click", async () => {
    const r = state.reminders.find((rm) => rm._id === el.dataset.toggleReminder);
    if (!r) return;
    try { await api(`/api/reminders/${r._id}`, { method: "PATCH", body: { done: !r.done } }); r.done = !r.done; render(); }
    catch (err) { alert(err.message); }
  }));
  mainEl.querySelectorAll("[data-nav]").forEach((el) => el.addEventListener("click", () => { currentView = el.dataset.nav; render(); }));
  const onboardingBtn = document.getElementById("onboardingGoTeam");
  if (onboardingBtn) onboardingBtn.addEventListener("click", () => { currentView = "team"; render(); });
}

/* ================= NOTES ================= */
function renderNotes() {
  mainEl.innerHTML = `
    <div class="section-title"><h1>Notes</h1><p>Everything you jot down, in one place.</p></div>
    <div class="notes-layout">
      <div>
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <div class="notes-search"><input id="noteSearch" placeholder="Search notes" /></div>
          <button class="quickadd-submit" id="newNoteBtn" style="background:var(--primary);color:#fff">+</button>
        </div>
        <div class="note-list" id="noteList"></div>
      </div>
      <div class="card" id="noteEditor" style="min-height:420px"></div>
    </div>
  `;
  const renderList = (query = "") => {
    const filtered = state.notes.filter((n) =>
      n.title.toLowerCase().includes(query.toLowerCase()) || n.content.toLowerCase().includes(query.toLowerCase())
    );
    const listEl = document.getElementById("noteList");
    listEl.innerHTML = filtered.length
      ? filtered.map((n) => `
          <button class="note-item ${n._id === selectedNoteId ? "active" : ""}" data-select-note="${n._id}">
            <div class="note-item-title">${escapeHtml(n.title || "Untitled")}</div>
            <div class="note-item-snippet">${escapeHtml(n.content || "Empty note")}</div>
          </button>`).join("")
      : `<div class="empty-state">No notes match yet.</div>`;
    listEl.querySelectorAll("[data-select-note]").forEach((el) => el.addEventListener("click", () => {
      selectedNoteId = el.dataset.selectNote; renderNotes();
    }));
  };

  const renderEditor = () => {
    const note = state.notes.find((n) => n._id === selectedNoteId);
    const editorEl = document.getElementById("noteEditor");
    if (!note) { editorEl.innerHTML = `<div class="empty-state">Select a note, or create a new one, to start writing.</div>`; return; }
    editorEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <input class="note-editor-title" id="noteTitle" value="${escapeAttr(note.title)}" />
        <button class="icon-btn" id="deleteNoteBtn">🗑</button>
      </div>
      <textarea class="note-editor-body" id="noteBody" placeholder="Start writing…">${escapeHtml(note.content)}</textarea>
    `;
    let saveTimer;
    const debouncedSave = (patch) => {
      Object.assign(note, patch);
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => { api(`/api/notes/${note._id}`, { method: "PATCH", body: patch }).catch((e) => console.error(e)); }, 500);
    };
    document.getElementById("noteTitle").addEventListener("input", (e) => { debouncedSave({ title: e.target.value }); renderList(document.getElementById("noteSearch").value); });
    document.getElementById("noteBody").addEventListener("input", (e) => { debouncedSave({ content: e.target.value }); });
    document.getElementById("deleteNoteBtn").addEventListener("click", async () => {
      try { await api(`/api/notes/${note._id}`, { method: "DELETE" }); state.notes = state.notes.filter((n) => n._id !== note._id); selectedNoteId = null; renderNotes(); }
      catch (err) { alert(err.message); }
    });
  };

  document.getElementById("newNoteBtn").addEventListener("click", async () => {
    try {
      const n = await api("/api/notes", { method: "POST", body: { title: "Untitled note", content: "" } });
      state.notes.unshift(n); selectedNoteId = n._id; renderNotes();
    } catch (err) { alert(err.message); }
  });
  document.getElementById("noteSearch").addEventListener("input", (e) => renderList(e.target.value));

  renderList();
  renderEditor();
}

/* ================= TASKS ================= */
let expandedTaskId = null; // module-level: which task's detail panel is open in the Tasks view

function renderTasks() {
  mainEl.innerHTML = `
    <div class="section-title"><h1>Tasks</h1><p>What needs doing, ranked by what matters.</p></div>
    <div class="task-form">
      <input type="text" id="taskText" placeholder="Add a personal task…" />
      <select id="taskPriority">
        <option value="low">Low</option>
        <option value="normal" selected>Normal</option>
        <option value="high">High</option>
      </select>
      <input type="date" id="taskDue" />
      <select id="taskRepeat" title="Repeat">
        <option value="none">No repeat</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
      </select>
      <button id="taskAddBtn">Add</button>
    </div>
    <div class="section-label" id="openLabel"></div>
    <div id="openTasks"></div>
    <div class="section-label hidden" id="doneLabel"></div>
    <div id="doneTasks"></div>
  `;
  const priorityColor = { high: "var(--danger)", normal: "var(--primary)", low: "var(--muted)" };
  const REPEAT_LABEL = { daily: "Repeats daily", weekly: "Repeats weekly", monthly: "Repeats monthly" };

  const taskRow = (t, done) => {
    const assignedByOther = t.assignedBy && t.assignedTo && t.assignedBy._id !== t.assignedTo._id;
    const canDelete = auth.user.role === "admin" || !assignedByOther;
    const isExpanded = expandedTaskId === t._id;
    return `
      <div class="task-wrap">
        <div class="task-item ${done ? "done" : ""}">
          <button class="icon-btn" data-toggle="${t._id}" style="${done ? "color:var(--primary)" : ""}">${done ? "✓" : "○"}</button>
          <span class="task-text">${escapeHtml(t.text)}</span>
          ${assignedByOther ? `<span class="assigned-tag" title="Assigned by ${escapeAttr(t.assignedBy.name)}">by ${escapeHtml(t.assignedBy.name)}</span>` : ""}
          ${t.recurrence && t.recurrence !== "none" ? `<span class="assigned-tag" title="${REPEAT_LABEL[t.recurrence]}">↻ ${t.recurrence}</span>` : ""}
          ${!done ? `<span class="task-priority" style="color:${priorityColor[t.priority]}">${t.priority}</span>` : ""}
          ${t.dueDate ? `<span class="mono-time">${t.dueDate}</span>` : ""}
          <button class="icon-btn" data-expand="${t._id}" title="Comments & files">💬${t.commentCount ? ` ${t.commentCount}` : ""}${t.attachmentCount ? ` 📎${t.attachmentCount}` : ""}</button>
          ${canDelete ? `<button class="icon-btn" data-del="${t._id}">🗑</button>` : ""}
        </div>
        ${isExpanded ? `<div class="task-detail" id="taskDetail-${t._id}"><div class="empty-state">Loading…</div></div>` : ""}
      </div>`;
  };

  const paint = () => {
    const open = state.tasks.filter((t) => !t.done).sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
    const done = state.tasks.filter((t) => t.done);
    document.getElementById("openLabel").textContent = `Open · ${open.length}`;
    document.getElementById("openTasks").innerHTML = open.length ? open.map((t) => taskRow(t, false)).join("") : `<div class="empty-state">All clear. Add a task above.</div>`;

    const doneLabel = document.getElementById("doneLabel");
    if (done.length) {
      doneLabel.classList.remove("hidden"); doneLabel.textContent = `Done · ${done.length}`;
      document.getElementById("doneTasks").innerHTML = done.map((t) => taskRow(t, true)).join("");
    } else { doneLabel.classList.add("hidden"); document.getElementById("doneTasks").innerHTML = ""; }

    mainEl.querySelectorAll("[data-toggle]").forEach((el) => el.addEventListener("click", async () => {
      const t = state.tasks.find((tk) => tk._id === el.dataset.toggle);
      if (!t) return;
      try {
        const updated = await api(`/api/tasks/${t._id}`, { method: "PATCH", body: { done: !t.done } });
        Object.assign(t, updated);
        if (updated.nextOccurrence) state.tasks.unshift(updated.nextOccurrence);
        paint();
      } catch (err) { alert(err.message); }
    }));
    mainEl.querySelectorAll("[data-del]").forEach((el) => el.addEventListener("click", async () => {
      if (!confirm("Delete this task?")) return;
      try { await api(`/api/tasks/${el.dataset.del}`, { method: "DELETE" }); state.tasks = state.tasks.filter((tk) => tk._id !== el.dataset.del); paint(); }
      catch (err) { alert(err.message); }
    }));
    mainEl.querySelectorAll("[data-expand]").forEach((el) => el.addEventListener("click", () => {
      expandedTaskId = expandedTaskId === el.dataset.expand ? null : el.dataset.expand;
      paint();
      if (expandedTaskId) loadTaskDetail(expandedTaskId);
    }));
  };

  document.getElementById("taskAddBtn").addEventListener("click", async () => {
    const text = document.getElementById("taskText").value.trim();
    if (!text) return;
    try {
      const t = await api("/api/tasks", { method: "POST", body: {
        text, priority: document.getElementById("taskPriority").value, dueDate: document.getElementById("taskDue").value || null,
        recurrence: document.getElementById("taskRepeat").value,
      }});
      state.tasks.unshift(t);
      document.getElementById("taskText").value = ""; document.getElementById("taskDue").value = "";
      paint();
    } catch (err) { alert(err.message); }
  });
  document.getElementById("taskText").addEventListener("keydown", (e) => { if (e.key === "Enter") document.getElementById("taskAddBtn").click(); });

  paint();
}

/* ---------- task detail: comments + attachments ---------- */
async function loadTaskDetail(taskId) {
  const el = document.getElementById(`taskDetail-${taskId}`);
  if (!el) return;
  try {
    const [comments, attachments] = await Promise.all([
      api(`/api/tasks/${taskId}/comments`), api(`/api/tasks/${taskId}/attachments`),
    ]);
    paintTaskDetail(taskId, comments, attachments);
  } catch (err) {
    el.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
  }
}

function paintTaskDetail(taskId, comments, attachments) {
  const el = document.getElementById(`taskDetail-${taskId}`);
  if (!el) return;
  el.innerHTML = `
    ${attachments.length ? `<div class="attachment-list">${attachments.map((a) => `
      <a href="${settings.apiBaseUrl}${a.url}" target="_blank" class="attachment-chip">📎 ${escapeHtml(a.originalName)}</a>
    `).join("")}</div>` : ""}
    <div class="file-row">
      <input type="file" id="fileInput-${taskId}" class="file-input" />
      <button class="btn-ghost" id="uploadBtn-${taskId}" style="padding:6px 12px;font-size:12px">Attach file</button>
    </div>
    <div class="comment-list">
      ${comments.length ? comments.map((c) => `
        <div class="comment-item">
          <span class="comment-author">${escapeHtml(c.author?.name || "Someone")}</span>
          <span class="comment-text">${escapeHtml(c.text)}</span>
        </div>`).join("") : `<div class="empty-state" style="padding:10px">No comments yet.</div>`}
    </div>
    <div class="comment-form">
      <input type="text" id="commentInput-${taskId}" placeholder="Add a comment…" />
      <button id="commentBtn-${taskId}">Send</button>
    </div>
  `;

  document.getElementById(`uploadBtn-${taskId}`).addEventListener("click", async () => {
    const fileInput = document.getElementById(`fileInput-${taskId}`);
    if (!fileInput.files[0]) return;
    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    try {
      await apiUpload(`/api/tasks/${taskId}/attachments`, formData);
      const t = state.tasks.find((tk) => tk._id === taskId);
      if (t) t.attachmentCount = (t.attachmentCount || 0) + 1;
      loadTaskDetail(taskId);
    } catch (err) { alert(err.message); }
  });

  const sendComment = async () => {
    const input = document.getElementById(`commentInput-${taskId}`);
    const text = input.value.trim();
    if (!text) return;
    try {
      await api(`/api/tasks/${taskId}/comments`, { method: "POST", body: { text } });
      input.value = "";
      const t = state.tasks.find((tk) => tk._id === taskId);
      if (t) t.commentCount = (t.commentCount || 0) + 1;
      loadTaskDetail(taskId);
    } catch (err) { alert(err.message); }
  };
  document.getElementById(`commentBtn-${taskId}`).addEventListener("click", sendComment);
  document.getElementById(`commentInput-${taskId}`).addEventListener("keydown", (e) => { if (e.key === "Enter") sendComment(); });
}

/* ================= CALENDAR ================= */
function renderCalendar() {
  mainEl.innerHTML = `
    <div class="section-title"><h1>Calendar</h1><p>Your days, at a glance.</p></div>
    <div class="cal-layout">
      <div class="card">
        <div class="cal-header"><button id="prevMonth">‹</button><span class="cal-title" id="calTitle"></span><button id="nextMonth">›</button></div>
        <div class="cal-grid" id="calDow"></div>
        <div class="cal-grid" id="calCells" style="margin-top:6px"></div>
      </div>
      <div class="card">
        <div style="font-weight:600;font-size:13.5px;margin-bottom:12px" id="selDayLabel"></div>
        <div class="event-form">
          <input type="text" id="evTitle" placeholder="Event title" />
          <input type="time" id="evTime" />
        </div>
        <button class="event-add-btn" id="evAddBtn">Add event</button>
        <div id="evList"></div>
      </div>
    </div>
  `;

  const dateStr = (y, m, d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const eventsOn = (ds) => state.events.filter((e) => e.date === ds);

  const paintGrid = () => {
    const y = calCursor.getFullYear(), m = calCursor.getMonth();
    document.getElementById("calTitle").textContent = calCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    document.getElementById("calDow").innerHTML = ["S", "M", "T", "W", "T", "F", "S"].map((d) => `<div class="cal-dow">${d}</div>`).join("");
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    let cellsHtml = "";
    for (let i = 0; i < firstDay; i++) cellsHtml += `<div></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = dateStr(y, m, d);
      const has = eventsOn(ds).length > 0;
      const isToday = ds === todayISO();
      const isSel = ds === selectedDate;
      cellsHtml += `<button class="cal-cell ${has ? "has-event" : ""} ${isToday ? "today" : ""} ${isSel ? "selected" : ""}" data-day="${ds}">${d}${has && !isSel ? '<span class="cal-dot"></span>' : ""}</button>`;
    }
    document.getElementById("calCells").innerHTML = cellsHtml;
    document.querySelectorAll("[data-day]").forEach((el) => el.addEventListener("click", () => { selectedDate = el.dataset.day; paintGrid(); paintDay(); }));
  };

  const paintDay = () => {
    document.getElementById("selDayLabel").textContent = fmtDay(selectedDate);
    const evs = eventsOn(selectedDate).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    document.getElementById("evList").innerHTML = evs.length
      ? evs.map((e) => `<div class="event-item"><span class="mono-time" style="min-width:44px">${e.time || "—"}</span><span style="flex:1">${escapeHtml(e.title)}</span><button class="icon-btn" data-del-ev="${e._id}">🗑</button></div>`).join("")
      : `<div class="empty-state">No events this day.</div>`;
    document.querySelectorAll("[data-del-ev]").forEach((el) => el.addEventListener("click", async () => {
      try { await api(`/api/events/${el.dataset.delEv}`, { method: "DELETE" }); state.events = state.events.filter((e) => e._id !== el.dataset.delEv); paintGrid(); paintDay(); }
      catch (err) { alert(err.message); }
    }));
  };

  document.getElementById("prevMonth").addEventListener("click", () => { calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() - 1, 1); paintGrid(); });
  document.getElementById("nextMonth").addEventListener("click", () => { calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() + 1, 1); paintGrid(); });
  document.getElementById("evAddBtn").addEventListener("click", async () => {
    const title = document.getElementById("evTitle").value.trim();
    if (!title) return;
    try {
      const e = await api("/api/events", { method: "POST", body: { title, date: selectedDate, time: document.getElementById("evTime").value } });
      state.events.unshift(e);
      document.getElementById("evTitle").value = ""; document.getElementById("evTime").value = "";
      paintGrid(); paintDay();
    } catch (err) { alert(err.message); }
  });

  paintGrid(); paintDay();
}

/* ================= TEAM (admin only) ================= */
async function renderTeam() {
  mainEl.innerHTML = `
    <div class="section-title"><h1>Team</h1><p>Add workers and assign them tasks.</p></div>
    <div class="grid-2">
      <div class="card">
        <div class="card-row"><h3>Add a worker</h3></div>
        <div class="task-form" style="flex-direction:column;align-items:stretch">
          <input type="text" id="wName" placeholder="Full name" />
          <input type="email" id="wEmail" placeholder="Email" />
          <input type="password" id="wPassword" class="pw-input" placeholder="Temporary password (min 8 chars)" />
          <button id="wAddBtn">Add worker</button>
        </div>
        <div id="wError" class="auth-error hidden" style="margin-top:10px"></div>
      </div>
      <div class="card">
        <div class="card-row"><h3>Assign a task</h3></div>
        <div class="task-form" style="flex-direction:column;align-items:stretch">
          <label class="settings-label" style="margin-bottom:0">Assign to</label>
          <div id="assignWorkerList" class="worker-checklist"></div>
          <input type="text" id="assignText" placeholder="Task description" />
          <select id="assignPriority">
            <option value="low">Low</option>
            <option value="normal" selected>Normal</option>
            <option value="high">High</option>
          </select>
          <input type="date" id="assignDue" />
          <select id="assignRepeat" title="Repeat">
            <option value="none">No repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <button id="assignBtn">Assign task</button>
        </div>
        <div id="assignError" class="auth-error hidden" style="margin-top:10px"></div>
      </div>
    </div>
    <div class="section-title" style="margin-top:26px"><h1 style="font-size:20px">Workers</h1></div>
    <div id="teamList"></div>
  `;

  let members = [];
  try { members = await api("/api/users"); state.teamMembers = members; } catch (err) { console.error(err.message); }
  const workers = members.filter((m) => m.active);
  wirePasswordToggles(mainEl);

  document.getElementById("assignWorkerList").innerHTML = workers.length
    ? workers.map((w) => `
        <label class="worker-check-item">
          <input type="checkbox" value="${w.id}" class="assign-worker-cb" />
          ${escapeHtml(w.name)} <span style="color:var(--muted);font-size:11.5px">(${escapeHtml(w.email)})</span>
        </label>`).join("")
    : `<div class="empty-state">No workers yet — add one first.</div>`;

  document.getElementById("wAddBtn").addEventListener("click", async () => {
    const errEl = document.getElementById("wError");
    errEl.classList.add("hidden");
    const name = document.getElementById("wName").value.trim();
    const email = document.getElementById("wEmail").value.trim();
    const password = document.getElementById("wPassword").value;
    if (!name || !email || !password) return;
    try {
      await api("/api/users", { method: "POST", body: { name, email, password } });
      renderTeam();
    } catch (err) { errEl.textContent = err.message; errEl.classList.remove("hidden"); }
  });

  document.getElementById("assignBtn").addEventListener("click", async () => {
    const errEl = document.getElementById("assignError");
    errEl.classList.add("hidden");
    const workerIds = Array.from(mainEl.querySelectorAll(".assign-worker-cb:checked")).map((cb) => cb.value);
    const text = document.getElementById("assignText").value.trim();
    if (workerIds.length === 0) { errEl.textContent = "Pick at least one worker."; errEl.classList.remove("hidden"); return; }
    if (!text) { errEl.textContent = "Task description is required."; errEl.classList.remove("hidden"); return; }
    try {
      const created = await api("/api/tasks/bulk-assign", { method: "POST", body: {
        text, workerIds,
        priority: document.getElementById("assignPriority").value,
        dueDate: document.getElementById("assignDue").value || null,
        recurrence: document.getElementById("assignRepeat").value,
      }});
      if (Array.isArray(created)) state.tasks = [...created, ...state.tasks];
      document.getElementById("assignText").value = "";
      document.getElementById("assignDue").value = "";
      renderTeam();
    } catch (err) { errEl.textContent = err.message; errEl.classList.remove("hidden"); }
  });

  // Load each worker's open task count for the roster view
  const inactiveWorkers = members.filter((m) => !m.active);
  const teamListEl = document.getElementById("teamList");
  if (workers.length === 0 && inactiveWorkers.length === 0) {
    teamListEl.innerHTML = `<div class="empty-state">No workers yet — add your first one above.</div>`;
    return;
  }
  let allTasks = [];
  try { allTasks = await api("/api/tasks"); } catch (err) { console.error(err.message); }

  const activeHtml = workers.map((w) => {
    const theirTasks = allTasks.filter((t) => t.assignedTo?._id === w.id || t.assignedTo === w.id);
    const open = theirTasks.filter((t) => !t.done);
    return `
      <div class="card" style="margin-bottom:12px">
        <div class="card-row">
          <div>
            <div style="font-weight:600;font-size:14px">${escapeHtml(w.name)}</div>
            <div style="font-size:12px;color:var(--muted)">${escapeHtml(w.email)} · ${w.role}</div>
          </div>
          <button class="btn-ghost" data-deactivate="${w.id}" style="padding:6px 12px;font-size:12px">Remove</button>
        </div>
        ${open.length
          ? `<div style="display:flex;flex-direction:column;gap:6px">${open.slice(0, 5).map((t) => `<div class="row-item"><span style="flex:1">${escapeHtml(t.text)}</span>${t.dueDate ? `<span class="mono-time">${t.dueDate}</span>` : ""}</div>`).join("")}</div>`
          : `<div class="empty-state">No open tasks assigned.</div>`}
      </div>`;
  }).join("") || `<div class="empty-state">No active workers.</div>`;

  const inactiveHtml = inactiveWorkers.length
    ? `<div class="section-label" style="margin-top:20px">Removed workers</div>` +
      inactiveWorkers.map((w) => `
        <div class="card" style="margin-bottom:12px;opacity:.7">
          <div class="card-row" style="margin-bottom:0">
            <div>
              <div style="font-weight:600;font-size:14px">${escapeHtml(w.name)}</div>
              <div style="font-size:12px;color:var(--muted)">${escapeHtml(w.email)} · removed</div>
            </div>
            <button class="btn-primary" data-reactivate="${w.id}" style="padding:6px 12px;font-size:12px">Reactivate</button>
          </div>
        </div>`).join("")
    : "";

  teamListEl.innerHTML = activeHtml + inactiveHtml;

  teamListEl.querySelectorAll("[data-deactivate]").forEach((el) => el.addEventListener("click", async () => {
    if (!confirm("Remove this worker? They'll lose access, but their task history is kept — you can reactivate them later.")) return;
    try { await api(`/api/users/${el.dataset.deactivate}`, { method: "DELETE" }); renderTeam(); }
    catch (err) { alert(err.message); }
  }));
  teamListEl.querySelectorAll("[data-reactivate]").forEach((el) => el.addEventListener("click", async () => {
    try { await api(`/api/users/${el.dataset.reactivate}/reactivate`, { method: "PATCH" }); renderTeam(); }
    catch (err) { alert(err.message); }
  }));
}

/* ================= SETTINGS ================= */
async function renderSettings() {
  const isAdmin = auth.user.role === "admin";
  mainEl.innerHTML = `
    <div class="section-title"><h1>Settings</h1><p>Your account, your organization, and billing.</p></div>
    <div id="billingBanner"></div>

    <div class="card" style="margin-bottom:20px">
      <div class="card-row"><h3>Your account</h3></div>
      <label class="settings-label">Name</label>
      <input id="settingsName" value="${escapeAttr(auth.user.name)}" class="settings-input" />
      <button id="saveNameBtn" class="btn-primary" style="margin-top:10px">Save name</button>
      <div id="nameMsg" class="settings-msg hidden"></div>

      <div style="margin-top:22px;padding-top:18px;border-top:1px solid var(--border)">
        <label class="settings-label">Current password</label>
        <input type="password" id="curPassword" class="pw-input settings-input" />
        <label class="settings-label" style="margin-top:10px">New password (min 8 characters)</label>
        <input type="password" id="newPassword" class="pw-input settings-input" />
        <button id="changePwBtn" class="btn-primary" style="margin-top:10px">Change password</button>
        <div id="pwMsg" class="settings-msg hidden"></div>
      </div>
    </div>

    ${isAdmin ? `
    <div class="card" style="margin-bottom:20px">
      <div class="card-row"><h3>Organization</h3></div>
      <label class="settings-label">Organization name</label>
      <input id="orgName" value="${escapeAttr(auth.organization?.name || "")}" class="settings-input" />
      <button id="saveOrgBtn" class="btn-primary" style="margin-top:10px">Save</button>
      <div id="orgMsg" class="settings-msg hidden"></div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="card-row"><h3>Plan & billing</h3></div>
      <div id="billingInfo"><div class="empty-state">Loading…</div></div>
    </div>
    ` : ""}

    <div class="card">
      <div class="card-row"><h3>Connection (developer)</h3></div>
      <label class="settings-label">API base URL</label>
      <input id="apiUrlInput" value="${escapeAttr(settings.apiBaseUrl)}" class="settings-input" />
      <button id="saveApiUrlBtn" class="btn-primary" style="margin-top:10px">Save & log out</button>
      <p class="auth-hint">Changing this points the app at a different backend and requires logging in again.</p>
    </div>

    <div class="settings-legal-footer">
      <button class="link-btn" data-nav="help">Help</button>
      <span>·</span>
      <button class="link-btn" data-nav="legal-terms">Terms</button>
      <span>·</span>
      <button class="link-btn" data-nav="legal-privacy">Privacy</button>
    </div>
  `;

  // Billing return banner (?billing=success / ?billing=cancel)
  const params = new URLSearchParams(window.location.search);
  if (params.get("billing")) {
    const ok = params.get("billing") === "success";
    document.getElementById("billingBanner").innerHTML = `
      <div class="settings-msg ${ok ? "" : "error"}" style="margin-bottom:18px">
        ${ok ? "Payment successful — your plan will update within a few seconds." : "Checkout was canceled — no changes were made."}
      </div>`;
    window.history.replaceState({}, "", window.location.pathname);
  }

  // Account: name
  document.getElementById("saveNameBtn").addEventListener("click", async () => {
    const msg = document.getElementById("nameMsg");
    try {
      const updated = await api("/api/users/me", { method: "PATCH", body: { name: document.getElementById("settingsName").value.trim() } });
      auth.user.name = updated.name;
      saveAuth(auth);
      msg.textContent = "Saved."; msg.className = "settings-msg"; msg.classList.remove("hidden");
      document.getElementById("userBadge").querySelector(".user-name").textContent = updated.name;
    } catch (err) { msg.textContent = err.message; msg.className = "settings-msg error"; msg.classList.remove("hidden"); }
  });

  // Account: password
  document.getElementById("changePwBtn").addEventListener("click", async () => {
    const msg = document.getElementById("pwMsg");
    const currentPassword = document.getElementById("curPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    try {
      await api("/api/auth/change-password", { method: "POST", body: { currentPassword, newPassword } });
      document.getElementById("curPassword").value = "";
      document.getElementById("newPassword").value = "";
      msg.textContent = "Password updated."; msg.className = "settings-msg"; msg.classList.remove("hidden");
    } catch (err) { msg.textContent = err.message; msg.className = "settings-msg error"; msg.classList.remove("hidden"); }
  });

  // API URL
  document.getElementById("saveApiUrlBtn").addEventListener("click", () => {
    const newUrl = document.getElementById("apiUrlInput").value.trim().replace(/\/$/, "");
    if (newUrl && newUrl !== settings.apiBaseUrl) { settings.apiBaseUrl = newUrl; saveSettings(); logout(); }
  });

  if (isAdmin) {
    document.getElementById("saveOrgBtn").addEventListener("click", async () => {
      const msg = document.getElementById("orgMsg");
      try {
        const updated = await api("/api/organization", { method: "PATCH", body: { name: document.getElementById("orgName").value.trim() } });
        auth.organization = updated;
        saveAuth(auth);
        document.getElementById("userBadge").querySelector(".user-role").textContent = `Admin · ${updated.name}`;
        msg.textContent = "Saved."; msg.className = "settings-msg"; msg.classList.remove("hidden");
      } catch (err) { msg.textContent = err.message; msg.className = "settings-msg error"; msg.classList.remove("hidden"); }
    });

    try {
      const billing = await api("/api/billing/plans");
      renderBillingCard(billing);
    } catch (err) {
      document.getElementById("billingInfo").innerHTML = `<div class="empty-state">Couldn't load billing info: ${escapeHtml(err.message)}</div>`;
    }
  }

  wirePasswordToggles(mainEl);
  mainEl.querySelectorAll("[data-nav]").forEach((el) => el.addEventListener("click", () => { currentView = el.dataset.nav; render(); }));
}

function renderBillingCard(billing) {
  const el = document.getElementById("billingInfo");
  const seatNote = `${billing.seatLimit} seat${billing.seatLimit === 1 ? "" : "s"} on the ${billing.currentPlan} plan · ${billing.subscriptionStatus}`;

  el.innerHTML = `
    <p style="font-size:12.5px;color:var(--muted);margin:0 0 14px">${escapeHtml(seatNote)}</p>
    <div class="plan-grid">
      ${billing.plans.filter((p) => p.key !== "trial").map((p) => `
        <div class="plan-card ${p.key === billing.currentPlan ? "current" : ""}">
          <div class="plan-name">${escapeHtml(p.name)}</div>
          <div class="plan-price">${p.priceRWF.toLocaleString()} RWF<span>/mo</span></div>
          <div class="plan-desc">${escapeHtml(p.description)}</div>
          ${p.key === billing.currentPlan
            ? `<span class="plan-current-tag">Current plan</span>`
            : `<button class="btn-primary plan-btn" data-plan="${p.key}" ${p.available ? "" : "disabled title='Not configured yet — set its Stripe Price ID'"}>Upgrade</button>`}
        </div>
      `).join("")}
    </div>
    <button id="portalBtn" class="btn-ghost" style="margin-top:16px">Manage billing / invoices</button>
    <div id="billingMsg" class="settings-msg hidden"></div>
  `;

  el.querySelectorAll("[data-plan]").forEach((btn) => btn.addEventListener("click", async () => {
    const msg = document.getElementById("billingMsg");
    try {
      const { url } = await api("/api/billing/checkout-session", { method: "POST", body: { plan: btn.dataset.plan } });
      window.location.href = url;
    } catch (err) { msg.textContent = err.message; msg.className = "settings-msg error"; msg.classList.remove("hidden"); }
  }));
  document.getElementById("portalBtn").addEventListener("click", async () => {
    const msg = document.getElementById("billingMsg");
    try {
      const { url } = await api("/api/billing/portal-session", { method: "POST" });
      window.location.href = url;
    } catch (err) { msg.textContent = err.message; msg.className = "settings-msg error"; msg.classList.remove("hidden"); }
  });
}

/* ================= LEGAL ================= */
function renderLegal(type) {
  const doc = LEGAL[type];
  mainEl.innerHTML = `
    <button class="link-btn" id="legalBack" style="margin-bottom:14px">← Back</button>
    <div class="section-title"><h1>${escapeHtml(doc.title)}</h1><p>${escapeHtml(doc.updated)}</p></div>
    <div class="card legal-body">${doc.body}</div>
  `;
  document.getElementById("legalBack").addEventListener("click", () => { currentView = "help"; render(); });
}

/* ================= HELP ================= */
function renderHelp() {
  const isAdmin = auth?.user?.role === "admin";
  const faqs = [
    {
      q: "How do I add a worker to my organization?",
      a: "As an admin, go to the Team tab, fill in the worker's name, email, and a temporary password, then click \"Add worker\". Share those login details with them directly — there's no self-signup for workers.",
    },
    {
      q: "How does task assignment work?",
      a: "Only admins can assign tasks to workers, from the Team tab. Workers can still create personal tasks for themselves, but can't assign tasks to each other. A task assigned by someone else is tagged \"by [name]\" and can only be marked done — not deleted — by the worker; admins can edit, reassign, or delete any task in the organization.",
    },
    {
      q: "Why didn't I get a push notification?",
      a: "Push notifications need browser permission granted once after your first login, and they require an active internet connection at delivery time. If you dismissed the permission prompt, check your browser's site settings to re-enable notifications for this app.",
    },
    {
      q: "I forgot my password — what do I do?",
      a: "On the login screen, click \"Forgot password?\", enter your email, and follow the link sent to you. If you don't receive it within a few minutes, check your spam folder or ask your admin to confirm your account email is correct.",
    },
    {
      q: "Can a worker see other workers' tasks?",
      a: "No. Workers only ever see their own tasks, notes, reminders, and calendar. Only admins can see everything across the organization.",
    },
    {
      q: "How do I remove or bring back a worker?",
      a: "Admins can remove a worker from the Team tab — this deactivates their account and login without deleting their task history. A removed worker can be reactivated from the same screen at any time, seat limit allowing.",
    },
    {
      q: "What happens if I hit my plan's worker limit?",
      a: "Adding a worker past your plan's seat limit is blocked with a clear message. Upgrade your plan from Settings → Plan & billing to add more seats.",
    },
  ];

  mainEl.innerHTML = `
    <div class="section-title"><h1>Help</h1><p>Quick answers, and how to reach us.</p></div>
    <div class="card" style="margin-bottom:20px">
      <div class="faq-list">
        ${faqs.map((f, i) => `
          <div class="faq-item">
            <button class="faq-q" data-faq="${i}">${escapeHtml(f.q)}<span class="faq-caret">＋</span></button>
            <div class="faq-a hidden" id="faqA${i}">${escapeHtml(f.a)}</div>
          </div>
        `).join("")}
      </div>
    </div>
    <div class="card" style="margin-bottom:20px">
      <div class="card-row"><h3>Still stuck?</h3></div>
      <p style="font-size:13px;color:var(--muted);margin:0">Reach out at <strong>[Support Email]</strong>${isAdmin ? " — as an admin, include your organization name so we can look things up faster." : "."}</p>
    </div>
    <div class="card">
      <div class="card-row"><h3>Legal</h3></div>
      <div style="display:flex;gap:16px">
        <button class="link-btn" data-nav="legal-terms">Terms & Conditions</button>
        <button class="link-btn" data-nav="legal-privacy">Privacy Policy</button>
      </div>
    </div>
  `;

  mainEl.querySelectorAll("[data-faq]").forEach((btn) => btn.addEventListener("click", () => {
    const a = document.getElementById(`faqA${btn.dataset.faq}`);
    a.classList.toggle("hidden");
    btn.classList.toggle("open");
  }));
  mainEl.querySelectorAll("[data-nav]").forEach((el) => el.addEventListener("click", () => { currentView = el.dataset.nav; render(); }));
}

/* ================= ACTIVITY (audit log, admin only) ================= */
async function renderActivity() {
  mainEl.innerHTML = `
    <div class="section-title"><h1>Activity</h1><p>Recent actions across your organization.</p></div>
    <div id="activityList"><div class="empty-state">Loading…</div></div>
  `;

  const ACTION_LABEL = {
    "task.assigned": (m) => `assigned a task: "${m.text || ""}"`,
    "task.bulk_assigned": (m) => `assigned "${m.text || ""}" to ${m.workerCount || 0} worker(s)`,
    "task.reassigned": (m) => `reassigned a task: "${m.text || ""}"`,
    "task.deleted": (m) => `deleted a task: "${m.text || ""}"`,
    "user.created": (m) => `added worker ${m.name || ""} (${m.email || ""})`,
    "user.deactivated": (m) => `removed worker ${m.name || ""}`,
    "user.reactivated": (m) => `reactivated worker ${m.name || ""}`,
  };

  try {
    const logs = await api("/api/audit?limit=100");
    document.getElementById("activityList").innerHTML = logs.length
      ? `<div class="card"><div class="activity-list">${logs.map((l) => {
          const describe = ACTION_LABEL[l.action] || ((m) => l.action);
          const when = new Date(l.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
          return `
            <div class="activity-item">
              <span class="activity-actor">${escapeHtml(l.actor?.name || "Someone")}</span>
              <span class="activity-desc">${escapeHtml(describe(l.meta || {}))}</span>
              <span class="mono-time">${when}</span>
            </div>`;
        }).join("")}</div></div>`
      : `<div class="empty-state">No activity yet.</div>`;
  } catch (err) {
    document.getElementById("activityList").innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
  }
}

/* ================= ASSISTANT ================= */
const assistantPanel = document.getElementById("assistantPanel");
const assistantBubble = document.getElementById("assistantBubble");

function assistantContext() {
  return {
    today: todayISO(),
    role: auth.user.role,
    notes: state.notes.slice(0, 20).map((n) => ({ title: n.title, snippet: (n.content || "").slice(0, 150) })),
    tasks: state.tasks.map((t) => ({ text: t.text, done: t.done, priority: t.priority, dueDate: t.dueDate })),
    reminders: state.reminders.map((r) => ({ text: r.text, time: r.time, done: r.done })),
    events: state.events.map((e) => ({ title: e.title, date: e.date, time: e.time })),
  };
}

function renderAssistant() {
  assistantPanel.innerHTML = `
    <div class="assistant-header"><span>✦ Ask Noote</span><button id="closeAssistant">✕</button></div>
    <div class="assistant-body" id="assistantBody"></div>
    <div class="assistant-input-row"><input id="assistantInput" placeholder="Ask about your day…" /><button id="assistantSend">➤</button></div>
  `;
  document.getElementById("closeAssistant").addEventListener("click", () => { assistantPanel.classList.add("hidden"); assistantBubble.classList.remove("hidden"); });
  document.getElementById("assistantSend").addEventListener("click", () => sendAssistantMessage());
  document.getElementById("assistantInput").addEventListener("keydown", (e) => { if (e.key === "Enter") sendAssistantMessage(); });
  paintAssistantBody();
}

function paintAssistantBody(loading, error) {
  const body = document.getElementById("assistantBody");
  if (!body) return;
  let html = "";
  if (chatMessages.length === 0) {
    html += `<p style="font-size:13px;color:var(--muted);margin-bottom:4px">I can look across your notes, tasks, reminders and calendar to help you plan the day.</p>
      <div class="assistant-suggestions">
        <button data-suggest="Give me today's briefing">Give me today's briefing</button>
        <button data-suggest="What am I missing this week?">What am I missing this week?</button>
        <button data-suggest="What should I prioritize right now?">What should I prioritize right now?</button>
      </div>`;
  }
  html += chatMessages.map((m) => `<div class="msg ${m.role}">${escapeHtml(m.content)}</div>`).join("");
  if (loading) html += `<div style="font-size:12.5px;color:var(--muted)">Thinking…</div>`;
  if (error) html += `<div style="font-size:12.5px;color:var(--danger)">${escapeHtml(error)}</div>`;
  body.innerHTML = html;
  body.querySelectorAll("[data-suggest]").forEach((el) => el.addEventListener("click", () => sendAssistantMessage(el.dataset.suggest)));
  body.scrollTop = body.scrollHeight;
}

async function sendAssistantMessage(preset) {
  const input = document.getElementById("assistantInput");
  const question = (preset ?? input.value).trim();
  if (!question) return;
  input.value = "";
  chatMessages.push({ role: "user", content: question });
  paintAssistantBody(true);

  const systemContext = `You are Noote, a warm and concise personal/work assistant. The user is a ${auth.user.role} at ${auth.organization?.name || "their organization"}. Today's date is ${todayISO()}. Here is their current data as JSON: ${JSON.stringify(assistantContext())}. Reply in plain text, no markdown, under 150 words unless asked for more.`;

  try {
    const json = await api("/api/assistant", { method: "POST", body: { messages: [{ role: "user", content: systemContext }, ...chatMessages] } });
    const text = (json.content || []).map((b) => b.text || "").join("").trim() || "I couldn't come up with a response — try again.";
    chatMessages.push({ role: "assistant", content: text });
    paintAssistantBody(false);
  } catch (e) {
    paintAssistantBody(false, "Couldn't reach the assistant. Check your connection, or confirm the API URL in Settings.");
  }
}

assistantBubble.addEventListener("click", () => {
  assistantBubble.classList.add("hidden");
  assistantPanel.classList.remove("hidden");
  renderAssistant();
});

/* ================= THEME ================= */
const themeToggle = document.getElementById("themeToggle");
const themeSwatches = document.getElementById("themeSwatches");
themeSwatches.innerHTML = Object.entries(THEMES).map(([key, th]) =>
  `<div class="swatch ${settings.theme === key ? "active" : ""}" style="background:${th.swatch}" data-theme-key="${key}" title="${th.name}"></div>`
).join("");
themeToggle.addEventListener("click", () => themeSwatches.classList.toggle("hidden"));
themeSwatches.querySelectorAll("[data-theme-key]").forEach((el) => el.addEventListener("click", () => {
  settings.theme = el.dataset.themeKey;
  document.documentElement.setAttribute("data-theme", settings.theme);
  saveSettings();
  themeSwatches.querySelectorAll(".swatch").forEach((s) => s.classList.toggle("active", s === el));
}));

/* ================= NAV ================= */
document.querySelectorAll(".nav-btn").forEach((btn) => btn.addEventListener("click", () => { currentView = btn.dataset.view; render(); }));

/* ================= OFFLINE BANNER ================= */
const offlineBanner = document.getElementById("offline-banner");
function updateOnlineStatus() { offlineBanner.classList.toggle("hidden", navigator.onLine); }
window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);
updateOnlineStatus();

/* ================= INSTALL PROMPT ================= */
let deferredInstallPrompt = null;
const installBtn = document.getElementById("installBtn");
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  installBtn.classList.remove("hidden");
});
installBtn.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installBtn.classList.add("hidden");
});
window.addEventListener("appinstalled", () => installBtn.classList.add("hidden"));

/* ================= SERVICE WORKER + PUSH ================= */
let swRegistration = null;
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try { swRegistration = await navigator.serviceWorker.register("sw.js"); }
    catch (err) { console.warn("SW registration failed", err); }
  });
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/* ---------- password show/hide toggles (reusable) ---------- */
// Wraps any <input type="password" class="pw-input" id="..."> already in the
// DOM with an eye-icon toggle button. Call this after rendering a form.
function wirePasswordToggles(root = document) {
  root.querySelectorAll(".pw-input").forEach((input) => {
    if (input.dataset.pwWired) return;
    input.dataset.pwWired = "1";
    const wrapper = document.createElement("div");
    wrapper.className = "password-field";
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pw-toggle";
    btn.setAttribute("aria-label", "Show password");
    btn.textContent = "👁";
    wrapper.appendChild(btn);
    btn.addEventListener("click", () => {
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      btn.textContent = showing ? "👁" : "🙈";
      btn.setAttribute("aria-label", showing ? "Show password" : "Hide password");
    });
  });
}

async function setupPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  if (Notification.permission === "denied") return;

  try {
    if (!swRegistration) swRegistration = await navigator.serviceWorker.ready;

    const existing = await swRegistration.pushManager.getSubscription();
    if (existing) {
      await api("/api/push/subscribe", { method: "POST", body: existing.toJSON() });
      return;
    }

    const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permission !== "granted") return;

    const { publicKey } = await api("/api/push/vapid-public-key");
    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    await api("/api/push/subscribe", { method: "POST", body: subscription.toJSON() });
  } catch (err) {
    console.warn("Push setup skipped:", err.message);
  }
}

/* ================= START ================= */
const startParams = new URLSearchParams(window.location.search);
const resetEmail = startParams.get("resetEmail");
const resetToken = startParams.get("resetToken");
const verifyEmailParam = startParams.get("verifyEmail");
const verifyTokenParam = startParams.get("verifyToken");

async function handleEmailVerifyLink() {
  authScreen.classList.remove("hidden");
  appShellEl.classList.add("hidden");
  authScreen.innerHTML = `<div class="auth-card"><div class="brand" style="margin-bottom:18px"><div class="brand-mark">N</div><span class="brand-name">noote</span></div><p id="verifyMsg" style="font-size:13px;color:var(--muted)">Verifying your email…</p></div>`;
  try {
    await api("/api/auth/verify-email", { method: "POST", body: { email: verifyEmailParam, token: verifyTokenParam } });
    document.getElementById("verifyMsg").textContent = "Email verified — you're all set.";
    if (auth?.user) { auth.user.emailVerified = true; saveAuth(auth); }
  } catch (err) {
    document.getElementById("verifyMsg").textContent = err.message;
  }
  window.history.replaceState({}, "", window.location.pathname);
  setTimeout(() => { auth?.token ? bootApp() : showAuthScreen("login"); }, 1500);
}

if (resetEmail && resetToken) {
  renderResetPasswordScreen(resetEmail, resetToken);
} else if (verifyEmailParam && verifyTokenParam) {
  handleEmailVerifyLink();
} else if (auth?.token) {
  bootApp();
} else {
  showAuthScreen("login");
}
