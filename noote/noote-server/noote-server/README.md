# Noote

Noote is a work-management platform for organizations: notes, tasks,
reminders, and a calendar for individuals, plus a full admin layer for
teams — worker accounts, task assignment, push notifications, and billing.

It ships as two applications:

| | |
|---|---|
| **`noote-pwa`** | The frontend. Installable PWA, plain HTML/CSS/JS, no build step, works offline for viewing cached data. |
| **`noote-server`** | The backend. Node.js/Express + MongoDB API. Holds all data, secrets, and third-party integrations. |

They communicate entirely over HTTP — the frontend never talks to MongoDB,
Stripe, or Anthropic directly, only to `noote-server`.

---

## Who it's for

An organization ("Admin") signs up, adds workers by email, and assigns them
tasks — individually or in bulk. Workers log in and see only their own
work: personal tasks plus anything assigned to them, tagged with who
assigned it. Everyone also gets private notes, reminders, and a calendar.

## Core features

**Individual productivity**
- Notes, tasks (priority, due date, recurrence), reminders, calendar
- 5 switchable color themes
- "Ask Noote" AI assistant — briefings and prioritization based on the
  user's current data (Claude API, key never reaches the browser)

**Team & organization**
- Multi-tenant by design — every record is scoped to an organization;
  one company can never see another's data
- Admin-only task assignment, including bulk-assign to multiple workers
  at once
- Comments on tasks (notifies the other party) and file attachments
- An audit log of who did what, when

**Notifications**
- Web push: instant on task assignment, plus a daily 7 AM digest of
  that day's open tasks

**Accounts & security**
- Email/password auth (JWT sessions), email verification, forgot/reset
  password, change password
- Rate limiting, input sanitization, and a central error handler on the API
- Passwords hashed with bcrypt, never stored in plain text

**Billing**
- Stripe Checkout + customer portal, seat-limit enforcement per plan,
  webhook-driven plan updates — no manual database editing to upgrade a
  customer

**Product polish**
- PWA install prompt, offline app-shell caching
- Onboarding banner for a brand-new admin
- Help/FAQ page, Terms & Privacy pages (template — see note below)

---

## Architecture

```
┌─────────────┐        HTTPS/JSON        ┌──────────────┐
│  noote-pwa  │ ───────────────────────▶ │ noote-server │
│  (static,   │                          │  (Node/      │
│   no        │ ◀─────────────────────── │  Express)    │
│   secrets)  │      JSON responses       └──────┬───────┘
└─────────────┘                                  │
                                    ┌─────────────┼─────────────┬─────────────┐
                                    ▼             ▼             ▼             ▼
                                MongoDB        Stripe      Anthropic    Web Push /
                              (all data)     (billing)   (AI assistant)   Email
```

Every secret — database credentials, JWT signing key, Stripe key, Anthropic
key, SMTP credentials, VAPID keys — lives only in `noote-server`'s
environment. The frontend holds nothing but the API's URL.

---

## Quick start (local development)

**1. Backend**
```bash
cd noote-server
docker compose up -d          # local MongoDB, no Atlas account needed
cp .env.example .env          # fill in JWT_SECRET at minimum — see below
npm install
npm run dev
```
Confirm it's alive: `http://localhost:4000/api/health` → `{"ok":true}`

**2. Frontend**
```bash
cd noote-pwa
npx serve . -p 8080
```
Open `http://localhost:8080`.

**3. First use**
"Start an organization" to create your admin account, then use the
**Team** tab to add workers and assign tasks. See each project's own
README for full setup detail (Stripe, push notifications, email, file
storage).

### Minimum required environment variables

Everything else in `noote-server/.env.example` is optional and degrades
gracefully — the app runs and tells you clearly what's missing when you
try to use a feature that needs it.

| Variable | Required for |
|---|---|
| `MONGODB_URI` | Everything — the app won't start without a database |
| `JWT_SECRET` | Login sessions |
| `CORS_ORIGIN` | Letting the frontend actually reach the API |
| `ANTHROPIC_API_KEY` | The "Ask Noote" assistant |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Push notifications |
| `STRIPE_SECRET_KEY` + price IDs | Billing/upgrades |
| `SMTP_*` | Real delivery of password-reset/verification emails (otherwise they log to the server console) |

---

## Project structure

```
noote-project/
├── noote-pwa/              Frontend — see noote-pwa/README.md
│   ├── index.html
│   ├── manifest.json       PWA install config
│   ├── sw.js                Service worker (offline cache + push)
│   ├── css/styles.css
│   └── js/app.js            All frontend logic
│
└── noote-server/            Backend — see noote-server/README.md
    └── src/
        ├── index.js          Express entrypoint, middleware, route mounting
        ├── models/           Mongoose schemas
        ├── routes/           API endpoints, one file per resource
        ├── middleware/       Auth, file upload, request sanitization
        ├── utils/            Email, push, audit log, validation, Stripe
        └── jobs/             Scheduled tasks (daily digest)
```

---

## Deployment

- **Frontend**: any static host — Netlify, Vercel, GitHub Pages, Cloudflare
  Pages. Drag-and-drop or CLI deploy; no build step.
- **Backend**: any Node host — Render, Railway, Fly.io, or a VPS.
- **Database**: MongoDB Atlas (free tier is enough to start).

Full deployment steps, including Stripe webhook setup and push notification
keys, are in `noote-server/README.md`.

---

## Known limitations — read before going to production

- **File attachments are stored on local disk** on the API server. Fine for
  a single always-on instance; will not survive a redeploy on ephemeral
  hosts (e.g. Render's free tier) and won't work with more than one server
  instance. Swap `src/middleware/upload.js` for S3-compatible storage
  before relying on this in production.
- **No usage cap on the AI assistant** per plan tier yet — each query costs
  an Anthropic API call regardless of the organization's plan.
- **No offline write queue** — the PWA caches data for offline *viewing*,
  but changes made while offline are not queued and synced later.
- **Terms & Privacy pages are a starting template**, not legal advice —
  replace the bracketed placeholders and have them reviewed by a qualified
  lawyer before relying on them commercially, especially given Rwanda's
  data protection law and any other jurisdiction you operate in.
- **Payments**: Stripe requires the billing entity to be based in a
  Stripe-supported country. If you need payouts directly into a Rwandan
  bank account, Stripe isn't the right fit for that — Flutterwave or MTN
  Mobile Money are the usual alternatives in that market.

## License

Not yet set — add one (e.g. MIT, or a proprietary notice) before treating
this as a distributable product.