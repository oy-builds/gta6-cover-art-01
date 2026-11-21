# CoverForge — Tropical Cover Art Maker

An original, fully offline web app that turns **any photo + a caption** into
share-ready, tropical cover art and exports it as a **PNG**.

Built as a prototype entry for the make.fun bounty **`gta6-cover-art-01` —
"Make GTA 6 Cover Art"**. All artwork, layout and code in this folder are
original. It uses no game logos, trademarks, fonts, or copied art, and it is
not affiliated with any game publisher.

## What it does

1. Drop in a photo (or use the built-in generated demo scene).
2. Type a title, a caption/subtitle, and a small corner tag.
3. Pick one of three original cover treatments (below).
4. Watch the portrait cover update live.
5. Click **Download PNG** and get a **1024 × 1536** file (2:3 portrait cover
   ratio, ≥1024px wide) ready to share.

Everything runs locally in the browser. No photo is uploaded anywhere, there
are no network calls, and there are no external fonts, images, CDNs or
libraries — the app works from its own files with the internet unplugged.

## How to run

No build step and no dependencies.

**Option A — just open it**

Open `index.html` in any modern desktop browser.

**Option B — local server (recommended)**

```bash
node server.mjs          # or: node server.mjs 8080
# then visit http://localhost:5173/
```

Requires Node.js (any recent LTS) for the optional server only; the app
itself is plain HTML/CSS/JS.

**Main entry:** `index.html` (loads `styles.css` and `app.js`). This is a
standalone static web app in the hosted-on-makefun style — serve the whole
folder as static files and `index.html` is the program entry point. There is
no compile step; an optional `main.ts` wrapper is unnecessary for a
zero-dependency static program, so the entry is documented here instead.

## Features

- **Photo upload** by file picker or drag-and-drop, with zoom and
  vertical-focus sliders (cover-fit, never stretched).
- **Demo mode** — a procedurally generated gradient scene (sun disc, generic
  skyline, sea band, palm silhouettes, all drawn in code) so the app works
  before you add a photo, and a *Clear photo* button to return to it.
- **Live preview** on a canvas whose internal resolution *is* the export
  resolution, so what you see is exactly what downloads.
- **Three original styles / layouts:**
  - **Sunset Vice** — warm sunset colour wash, teal shadows, bottom title
    block with accent rule.
  - **Neon Night** — midnight grade, glowing cyan/magenta double frame,
    centred top title with neon underline.
  - **Comic Halftone** — high-contrast grade, printed halftone dot overlay,
    thick ink border, angled yellow title banner.
- **Text controls** — title (auto-wrapped, up to 3 lines), caption/subtitle,
  and a corner tag pill.
- **Print grain** texture toggle (generated noise, drawn locally).
- **PNG export** at 1024 × 1536 via `canvas.toBlob` + download.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | App shell, controls, and the 1024×1536 preview/export canvas |
| `app.js` | All logic: demo scene, photo cover-fit, treatments, text, export |
| `styles.css` | UI styling (system font stack only) |
| `server.mjs` | Zero-dependency Node static server for local running |
| `smoke.test.mjs` | Smoke test (see below) |
| `README.md` | This file |

## Test

```bash
node smoke.test.mjs
```

Checks that all deliverable files exist, the canvas is ≥1024px wide, PNG
export / download / upload / drag-and-drop logic is present, all three
styles are wired, and that no external URLs, CDNs, or network calls appear
in the app code.

## make.fun

- Bounty: `gta6-cover-art-01` — "Make GTA 6 Cover Art"
- Badge: _placeholder — add the official make.fun bounty badge/link here on
  submission_
- Status: local prototype only — **not submitted**

## Limitations

- Text uses locally available system font stacks (`Arial Black` / `Impact` /
  system-ui fallbacks), so exact title rendering varies slightly by OS.
- Colour treatments use canvas filters and overlays; very large source
  photos are scaled to cover the 1024×1536 canvas, not edited at full
  resolution.
- No cropping UI beyond zoom + vertical focus, and no multi-page / batch
  export.
