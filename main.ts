// CoverForge hand-in program for the make.fun gta6-cover-art-01 bounty.
// Node 22, standard library only, no build step: node main.ts
//
// The entry itself is the static web app in app/ (open app/index.html in a
// browser, it runs fully offline). This program delivers it: it copies app/
// and screenshots/ into the output directory and writes dossier.json there
// with buildDossier from the vendored make.fun library, byte for byte the
// way the bounty scorer rebuilds it.
//
// MAKEFUN_OUTPUT_DIR stands in for /output outside the grader:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });

// The app, exactly as it will be served and judged.
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });

// The screenshots, first by name is the cover.
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
const shotsDir = join(repoRoot, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The dossier the judge reads. The caps mirror the scorer's own limits, so
// this program refuses anything the gate would refuse: the text cap shapes
// the bytes, the rest only fail loudly (too many or too-large screenshots,
// an app/ tree over its file, byte or path limits).
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

console.log(`CoverForge handed in: app/ + screenshots/ + dossier.json (${dossier.length} bytes) -> ${outputDir}`);
