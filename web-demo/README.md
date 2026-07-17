# quest log — web demo

A static, browser-only build of [quest log](../README.md) for showing off the UI without running the self-hosted server. No backend, no database — state lives in the visitor's `localStorage` and never leaves their browser.

Differs from the self-hosted app in `../public/`:

- No profile picker — single seeded demo profile.
- `saveData()` writes straight to `localStorage` instead of `fetch`-ing a server API.
- Ships with sample quests/rewards/quotes so it doesn't look empty on first load.
- Adds a "reset to sample data" button (profile tab → data section).
- A banner across the top explains the data-stays-local behavior.

Everything else — theming, achievements, stats, heatmap, weekday scheduling, sub-tasks, import/export — is the same code, unmodified.

## Deploy to Vercel

1. Push this repo to GitHub (already done if you're reading this from there).
2. In Vercel: **Add New → Project**, import this repo.
3. Set **Root Directory** to `web-demo`.
4. Framework Preset: **Other**. Build Command: none. Output Directory: `.` (leave default / blank).
5. Deploy.

No environment variables, no build step — it's plain static files (`index.html`, `manifest.json`, `sw.js`, `icons/`).

## Local preview

Any static file server works, e.g.:

```
npx serve web-demo
```

or

```
python -m http.server 4700 --directory web-demo
```
