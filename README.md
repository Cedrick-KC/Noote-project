# Noote — PWA

A notes / tasks / reminders / calendar assistant, built as a plain HTML/CSS/JS
Progressive Web App — no build step, no framework required.

This frontend now talks to the **Noote API** (in the sibling `noote-server`
project) for everything except theme preference. It supports organizations,
admin/worker roles, task assignment, and push notifications. See
`noote-server/README.md` for backend setup — you need it running (locally or
deployed) for this frontend to work; it's no longer a local-storage-only app.

## First run

1. Deploy or run `noote-server` (see its README) and note its URL.
2. Open this app. On first load you'll see a login/register screen.
3. Click the gear icon (Settings) if you need to point the app at a
   non-default API URL — default is `http://localhost:4000`.
4. "Start an organization" creates your company account and makes you its
   admin. From there, use the **Team** tab to add workers and assign them
   tasks.
5. Workers log in with the email/password their admin created for them, and
   see only their own tasks, notes, reminders and calendar — plus anything
   assigned to them, tagged with who assigned it.

## What makes this a real PWA

- **Installable** — `manifest.json` + icons let phones/desktops add it to the
  home screen / app list.
- **Offline-first** — `sw.js` (service worker) caches the app shell on first
  load. After that, the app opens and works fully offline. Your notes, tasks,
  reminders and events live in the browser's local storage on the device, so
  they're readable and editable with zero connection.
- **Assistant needs a live connection** — the AI features (`Ask Noote`) call
  out to a backend, so those specifically require internet. Everything else
  does not.

## Run it locally

Any static file server works, e.g.:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Open the printed URL. Service workers require either `localhost` or HTTPS —
both are fine for local dev.

## Deploy it for real

Any static host works: **Netlify**, **Vercel**, **GitHub Pages**, **Cloudflare
Pages**. Drag-and-drop the whole folder onto Netlify's dashboard, or:

```bash
npm i -g vercel
vercel deploy
```

GitHub Pages: push this folder to a repo, enable Pages on the `main` branch.

## The AI assistant and push notifications

Both are handled by `noote-server` now — the assistant calls
`${API base URL}/api/assistant`, and push subscriptions are registered
automatically after login (the browser will ask for notification
permission). Nothing to configure here beyond pointing Settings at the right
API URL. The standalone `api/assistant.js` in this folder is kept only as a
minimal reference if you ever want the assistant on a serverless function
instead of the main API — not required for normal use.

## Icons

Regenerate `icons/icon-192.png` / `icon-512.png` / etc. any time by swapping
in your own artwork at those exact filenames and sizes — referenced directly
in `manifest.json` and `index.html`.

## Offline behavior with a backend

The service worker still caches the app shell, so the app opens offline. But
since data now lives in the database (not local storage), a fully offline
session shows stale data from the last successful fetch rather than letting
you edit and sync later — there's no offline write queue yet. That's a
reasonable next step if offline editing matters for your users (see "Next
steps" below).

## Suggested next steps for East Africa specifically

- Add Kinyarwanda / Swahili translations (the codebase has no framework
  dependency, so this is a matter of swapping string literals — consider
  extracting them into a small `i18n.js` dictionary).
- Add an SMS-based capture/reminder channel for feature-phone users.
- Add shared/team task lists (needs a small backend + auth — this static
  version is single-device/local-storage only).
