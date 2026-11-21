# CoverForge — Multi-Panel Cover Art Maker

An original, fully offline web app that turns **your photos + a caption** into
multi-panel, poster-style cover art and exports it as a **PNG** in the common
post sizes.

Built as an entry for the make.fun bounty **`gta6-cover-art-01` — "Make GTA 6
Cover Art"**, laid out in the official kit format. All artwork, layout and code
are original. It uses no game logos, trademarks, fonts, or copied art, and it
is not affiliated with any game publisher.

## What it does

1. Add one or several of your own photos (file picker or drag-and-drop).
   Your first photo fills all five panels, each panel with a different crop.
2. Click a panel (in the preview or the panel picker) and fine-tune it:
   choose which photo it shows (or the built-in demo scene), and adjust its
   **zoom** and **left/right + up/down position**.
3. Edit the **title (caption)**, subtitle and corner tag.
4. Pick one of three original colour styles (below) and optional print grain.
5. Export a PNG at **1080 × 1080**, **1080 × 1350** or **1920 × 1080**.

Everything runs locally in the browser. Photos are read on your own machine
and never uploaded; there are no network calls, no external fonts, images,
CDNs or libraries — the app works from its own files with the internet
unplugged.

## Repository layout (kit format)

| Path | Purpose |
| --- | --- |
| `main.ts` | Hand-in program (Node 22, standard library only): copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored library |
| `app/` | The static web app — `index.html`, `app.js`, `styles.css`. No build step |
| `screenshots/` | Three PNG screenshots: an exported portrait cover, the editor with a photo loaded, an exported landscape cover |
| `vendor/makefun-app.ts` | The kit's dossier library, byte-identical to the kit copy (the gate rebuilds the dossier with it and compares) |
| `smoke.test.mjs` | Smoke tests (see below) |
| `LICENSE` | MIT |
| `.makefun/owner.json` | make.fun ownership claim (wallet address) |

## How to run the app

Serve `app/` with any static file server and open it in desktop Chrome, e.g.:

```bash
python3 -m http.server 8080 --directory app
# then visit the local address it prints
```

Opening `app/index.html` directly in a browser also works. No build step,
no dependencies.

## Hand in (build the entry output)

```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/app/`, `out/screenshots/` and `out/dossier.json`. Running it
twice produces byte-identical output.

## Features

- **Multi-panel poster layout** — five panels (hero + four supporting), each
  with a white keyline and gutter, in every export size.
- **Any photo, any panel** — add several photos; assign each panel its own
  photo or the demo scene; per-panel zoom and X/Y position sliders; one photo
  can fill several panels with different crops.
- **Demo mode** — a procedurally generated scene (sun disc, generic skyline,
  sea band, palm silhouettes, all drawn in code, shifted per panel) so the app
  works before you add a photo.
- **Live preview** on a canvas whose internal resolution *is* the export
  resolution, with a dashed outline on the panel being edited.
- **Three original styles:**
  - **Sunset Vice** — warm sunset colour wash, teal shadows, bottom title
    block with accent rule.
  - **Neon Night** — midnight grade, glowing cyan/magenta double frame,
    centred top title with neon underline.
  - **Comic Halftone** — high-contrast grade, printed halftone dot overlay,
    thick ink border, angled yellow title banner.
- **Text controls** — title (auto-wrapped, up to 3 lines), subtitle, and a
  corner tag pill.
- **Print grain** texture toggle (generated noise, drawn locally).
- **PNG export** at 1080 × 1080, 1080 × 1350 and 1920 × 1080 via
  `canvas.toBlob` + download.

## Test

```bash
node smoke.test.mjs
```

Checks the kit structure: `app/index.html` references only files inside
`app/`; the three screenshots are PNGs within the gate's size and dimension
limits; `vendor/makefun-app.ts` is byte-identical to the kit's copy (sha256);
`app.js` parses as an ES module; and `node main.ts` produces `app/`,
`screenshots/` and a valid `dossier.json`, byte-identical across two runs.

## make.fun

- Bounty: `gta6-cover-art-01` — "Make GTA 6 Cover Art"
- Status: restructured to the official kit format locally — **not submitted**
  from this workspace.

## Limitations

- Title lettering uses locally available system font stacks (`Arial Black` /
  `Impact` / system-ui fallbacks), so exact rendering varies slightly by OS.
- Colour treatments use canvas filters and overlays; very large source photos
  are scaled to cover their panel, not edited at full resolution.
- The screenshots are faithful renders of the app's own layout, styles and
  lettering, drawn with the same panel fractions and crops the app uses.
