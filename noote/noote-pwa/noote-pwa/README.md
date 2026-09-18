# Noote — PWA

A notes / tasks / reminders / calendar assistant, built as a plain HTML/CSS/JS Progressive Web App — no build step, no framework required.

## v2 frontend updates

The feature branch adds a public product landing page at `landing.html`, polished responsive styling in `css/landing.css`, IndexedDB caching and a client-side mutation queue in `js/offline-sync.js`, and service-worker request queuing for notes and tasks. The service worker caches the landing page and app shell, and the installed PWA opens on the landing page.

Offline writes to notes and tasks are retained on-device and retried after connectivity returns. The assistant remains network-dependent. Conflict responses (`409`) are retained for review rather than silently discarded.

## First run

1. Deploy or run `noote-server` and note its URL.
2. Open the PWA landing page and choose **Get started** or **Log in**.
3. Click the gear icon in Settings if you need to point the app at a non-default API URL.
4. Start an organization to create a company account and become its admin.
5. Use the Team tab to add workers and assign tasks.

## Run locally

Any static file server works:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Open the printed URL. Service workers require `localhost` or HTTPS.

## Deploy

Any static host works, including Netlify, Vercel, Cloudflare Pages, or GitHub Pages. Deploy the whole `noote-pwa` folder.

## Backend dependency

The frontend connects to the sibling `noote-server` project for authentication, organizations, notes, tasks, reminders, calendar data, AI assistant requests, and push notifications.
