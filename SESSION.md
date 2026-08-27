# Interval Trainer Development Handoff

Last updated: 2026-08-27

## Current state

The project is a dependency-free static PWA built with `index.html`, `styles.css`, and `app.js`. It uses browser `localStorage` only. It is published through GitHub Pages at `https://rolandbarthes.github.io/interval-trainer/`.

Implemented features include multiple editable workout plans, an exercise/stretch bank, manual interval entry, workout-level automatic rest, per-plan repeats, timer transport controls, tappable queue navigation with a live highlighted countdown, tones, vibration, selectable text-to-speech, an optional spoken 10-second warning, wake lock, JSON import/export, a manifest, and offline service worker.

Default plans are Lower Back, Posture Work, and Whole Body Stretch.

## Local testing

- Windows: `http://localhost:4173`
- iPhone on the same Wi-Fi: `http://192.168.0.60:4174`
- The Python servers were started as background processes and may need restarting after Windows reboots.
- The iPhone LAN URL uses HTTP, so full service-worker/offline PWA installation requires an HTTPS route.

## Recent decisions

- Top-level navigation is Timer, Plans, Exercises, and Settings.
- Data import/export is nested under Settings.
- Rest is configured once per workout and inserted into the timer sequence automatically; the queue labels it simply as “Rest.”
- Preferences, including the selected TTS voice and 10-second warning, persist locally.
- GitHub Pages deploys automatically from `main` using `.github/workflows/pages.yml`.
- The service worker uses network-first navigation plus refreshed static-asset caching. Normal releases should update the installed PWA without deleting its shortcut.
- Dedicated 180×180, 192×192, and 512×512 PNG PWA icons are included.
- All primary views use a consistent 900px maximum content width.

## Resume checklist

1. Read `TODO.md` and this file.
2. Run `node --check app.js` and `node --check service-worker.js`.
3. Start a static server if the previous one is no longer running.
4. After changes, advance the cache and asset version, push `main`, and verify the Pages deployment.
