# Route Posters

Turn runs, rides and hikes into print-quality poster art. Drop in activity files, pick a layout,
choose what metadata to show, and export a 300 DPI PNG for sharing or a true-vector PDF for a
print shop.

Everything happens in the browser. There is no backend, no database and no account — your
activity files are never uploaded anywhere.

## Quick start

```bash
npm install
npm run dev
```

Then open the printed URL and press **Load samples** to see it working immediately — nine
example activities ship with the app.

To use your own data, export it from wherever it lives and drag the files in. In Strava that is
**Settings → My Account → Download or Delete Your Account → Request your archive**, which
emails you a zip containing every activity as GPX.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm test` | Unit tests |
| `npm run build` | Typecheck, then build to `dist/` |
| `npm run preview` | Serve the built site, base path and all |

## What it does

- **Ten layouts** — from a single hero route to a 3×3 "year in runs" wall grid, plus an auto
  grid that arranges any number from one to ten to suit the page.
- **Nine paper sizes** — A4 through A1, US 12×18 and 18×24, and square / 4:5 / 9:16 for social.
  Portrait or landscape, with optional 3mm print bleed.
- **Six themes** — Midnight, Paper, Blueprint, Heat, Sage and Noir.
- **Per-map metadata** — distance, time, pace or speed, elevation, date, activity type and
  location, toggled globally or overridden on individual maps. Titles are editable.
- **Shared scaling** — optionally draw every route to one shared metres-per-millimetre, so a 5k
  visibly reads as shorter than a marathon rather than each route being stretched to fill its
  own box. Corrected for Mercator distortion, so activities recorded at different latitudes stay
  honestly comparable.
- **Real export** — PNG at 150 or 300 DPI, PDF as true vector at exact physical size, and raw
  SVG if you want to finish the poster in Illustrator, Figma or Inkscape.

Supported imports: **GPX**, **TCX** and **FIT**. Where a file carries the device's own summary
(TCX laps, FIT sessions) those figures are trusted over anything recomputed from GPS positions,
since a wheel sensor or footpod measures distance far better than satellites do.

## Why file import rather than the Strava API

The app is built around file import on purpose. Pulling from Strava's API directly runs into
several constraints that make it a poor fit for a small personal tool:

- The API only ever returns **your own** activities. A URL for someone else's ride returns 404,
  and the API Agreement forbids showing one athlete's data to any other user — so a "paste any
  Strava link" feature cannot legitimately exist.
- Standard-tier access now requires an **active Strava subscription** and is self-serve for only
  **10 athletes** without going through app review.
- Strava data may be cached for at most **seven days**, which rules out simply saving posters
  server-side.
- OAuth requires a `client_secret` and does not support PKCE, so the token exchange **cannot**
  happen in a static page — it needs a server, which this project deliberately does not have.

A bulk export gives you every activity as GPX in one download, which covers the same ground with
none of that. The Strava client (`src/ingest/strava.ts`) is nevertheless written and ready:
polyline decoding, activity fetching, URL parsing and 7-day cache eviction all work. Only the
token exchange is missing, isolated behind a `TokenProvider` interface, so it can be satisfied
later by a Cloudflare Worker or a local dev helper without touching anything else.

If you do render Strava-sourced data, the footer has a **Powered by Strava** toggle — their
brand guidelines cover printed output, not just screens.

## How it is put together

The poster *is* an SVG with a millimetre-based `viewBox`. The preview on screen is that same
SVG scaled with CSS, and both exporters consume it directly, so there is no second rendering
path that could drift out of sync with what you see.

```
src/
  ingest/     GPX, TCX and FIT parsing -> one Activity shape
  geo/        Mercator projection, bounds fitting, Ramer-Douglas-Peucker simplification
  templates/  Layouts as pure (box, count) -> Rect[] functions
  poster/     layoutPoster(): poster + activities -> a complete render model
  components/ The SVG poster, and the editor around it
  export/     Font embedding, PNG rasterisation, vector PDF
  store/      Project state, localStorage, project files
```

Two details worth knowing if you work on this:

- **Fonts must be inlined as base64 into the exported SVG.** A serialised SVG rasterised through
  an `<img>` cannot fetch external resources, so a stylesheet reference is silently ignored and
  every export comes out in a fallback face. `src/export/fonts.ts` handles this.
- **PNG export verifies itself.** Exceeding a browser's canvas limit does not throw — it yields a
  blank image. Since posters always paint an opaque background, the exporter samples pixels to
  confirm the render worked and steps the resolution down only if it genuinely failed, rather
  than pre-emptively capping everyone at Safari's limit.

## Deployment

Pushing to `main` builds and publishes to GitHub Pages via `.github/workflows/deploy.yml`.
Enable it once under **Settings → Pages → Source → GitHub Actions**.

The site is served from a sub-path, so `vite.config.ts` sets `base: '/strava-posters/'`. If you
fork this under a different repository name, change that — or set `VITE_BASE` to override it,
which is what you want for a custom domain (`VITE_BASE=/ npm run build`).

## Licences

The bundled fonts are [Inter](https://github.com/rsms/inter) and
[Bebas Neue](https://github.com/dharmatype/Bebas-Neue), both under the SIL Open Font License;
copies live alongside them in `public/fonts/`. Both are subset to Latin and instanced to fixed
weights, which is why they are only about 12KB each.

The sample activities in `public/samples/` are synthetic, not real recordings.
