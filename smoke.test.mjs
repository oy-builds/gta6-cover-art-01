// Smoke test — run: node smoke.test.mjs
// Verifies the kit-format structure: app/ references stay inside app/, the
// screenshots meet the gate's limits, vendor/makefun-app.ts is byte-identical
// to the kit's copy, app.js parses as an ES module, and node main.ts hands in
// app/ + screenshots/ + dossier.json, byte-identical across two runs.
import { existsSync, readFileSync, readdirSync, statSync, mkdtempSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";

const root = fileURLToPath(new URL(".", import.meta.url));
const appDir = join(root, "app");
let failures = 0;
function check(name, ok) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failures++;
}
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

// --- Root structure -------------------------------------------------------
for (const f of ["main.ts", "LICENSE", "README.md", join(".makefun", "owner.json"),
                 join("vendor", "makefun-app.ts"), join("app", "index.html"),
                 join("app", "app.js"), join("app", "styles.css")]) {
  check(`exists: ${f}`, existsSync(join(root, f)));
}
for (const f of ["index.html", "app.js", "styles.css", "server.mjs"]) {
  check(`old root file gone: ${f}`, !existsSync(join(root, f)));
}

// --- app/index.html references only files inside app/ ---------------------
const html = readFileSync(join(appDir, "index.html"), "utf8");
const refs = [...html.matchAll(/(?:src|href)\s*=\s*"([^"]+)"/g)].map((m) => m[1]);
check("index.html has references to check", refs.length >= 2);
for (const ref of refs) {
  if (ref.startsWith("data:") || ref.startsWith("#")) { check(`reference ok (inline): ${ref.slice(0, 24)}`, true); continue; }
  check(`reference not remote: ${ref}`, !/^[a-z][a-z0-9+.-]*:/i.test(ref) && !ref.startsWith("//"));
  const target = resolve(appDir, ref.replace(/^\//, ""));
  check(`reference inside app/: ${ref}`, target.startsWith(appDir + sep) && existsSync(target));
}
check("index.html at most 1 MiB", statSync(join(appDir, "index.html")).size <= 1048576);
check("no network calls in app.js", !/\bfetch\s*\(|XMLHttpRequest|WebSocket/.test(readFileSync(join(appDir, "app.js"), "utf8")));

// --- Feature wiring ---------------------------------------------------------
const js = readFileSync(join(appDir, "app.js"), "utf8");
check("multi-panel layout present", js.includes("PANEL_LAYOUT") && js.includes("drawPanel"));
check("per-panel zoom/x/y controls", ["panelZoom", "panelX", "panelY"].every((id) => html.includes(id) && js.includes(id)));
check("caption editing present", html.includes("titleInput") && html.includes("subtitleInput"));
for (const size of ["1080x1080", "1080x1350", "1920x1080"]) {
  check(`export size offered: ${size}`, html.includes(`value="${size}"`));
}
for (const style of ["sunset", "neon", "halftone"]) {
  check(`style present: ${style}`, html.includes(`value="${style}"`) && js.includes(style));
}
check("PNG export uses toBlob", js.includes("toBlob") && js.includes('"image/png"'));

// --- app.js parses as an ES module -----------------------------------------
const tmp = mkdtempSync(join(tmpdir(), "coverforge-smoke-"));
const moduleCopy = join(tmp, "app-as-module.mjs");
copyFileSync(join(appDir, "app.js"), moduleCopy);
let parses = true;
try { execFileSync(process.execPath, ["--check", moduleCopy], { stdio: "pipe" }); } catch { parses = false; }
check("app.js parses as an ES module", parses);

// --- Screenshots meet the gate limits ---------------------------------------
const shotsDir = join(root, "screenshots");
const shots = readdirSync(shotsDir).filter((n) => !n.startsWith(".")).sort();
check("exactly 3 screenshots", shots.length === 3);
check("first screenshot by name is the portrait cover", shots[0] === "1-cover-portrait.png");
for (const name of shots) {
  const path = join(shotsDir, name);
  const buf = readFileSync(path);
  const isPng = buf.length > 24 && buf.toString("hex", 0, 8) === "89504e470d0a1a0a" && buf.toString("ascii", 12, 16) === "IHDR";
  check(`${name}: whole PNG with IHDR`, isPng);
  if (isPng) {
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    check(`${name}: ${w}x${h} long side <= 1280`, Math.max(w, h) <= 1280);
    check(`${name}: ${w}x${h} short side >= 480`, Math.min(w, h) >= 480);
  }
  check(`${name}: at most 256 KiB (${buf.length} bytes)`, buf.length <= 262144);
}

// --- vendor/makefun-app.ts is the kit's copy, byte for byte ------------------
const VENDOR_SHA256 = "14e650adbd6aff7fb760e9bcd7be00dfbe86fb4819afe88dfe23dd0e087e770e";
const vendorBuf = readFileSync(join(root, "vendor", "makefun-app.ts"));
check("vendor/makefun-app.ts sha256 matches the kit copy", sha256(vendorBuf) === VENDOR_SHA256);
const kitVendor = join(root, "..", "kits", "gta6-cover-art-01", "gta6-cover-art-01-kit", "starter", "vendor", "makefun-app.ts");
if (existsSync(kitVendor)) {
  check("vendor/makefun-app.ts byte-identical to kit file on disk",
    Buffer.compare(vendorBuf, readFileSync(kitVendor)) === 0);
}

// --- main.ts hands the entry in ----------------------------------------------
function runMain() {
  const out = mkdtempSync(join(tmpdir(), "coverforge-out-"));
  execFileSync(process.execPath, [join(root, "main.ts")], {
    env: { ...process.env, MAKEFUN_OUTPUT_DIR: out }, stdio: "pipe",
  });
  return out;
}
const out1 = runMain();
check("main.ts writes out/app/index.html", existsSync(join(out1, "app", "index.html")));
check("main.ts writes out/app/app.js + styles.css",
  existsSync(join(out1, "app", "app.js")) && existsSync(join(out1, "app", "styles.css")));
const outShots = existsSync(join(out1, "screenshots")) ? readdirSync(join(out1, "screenshots")).sort() : [];
check("main.ts writes out/screenshots (3 files)", JSON.stringify(outShots) === JSON.stringify(shots));
const dossierPath = join(out1, "dossier.json");
check("main.ts writes out/dossier.json", existsSync(dossierPath));
if (existsSync(dossierPath)) {
  const dossier = readFileSync(dossierPath);
  let parsed = null;
  try { parsed = JSON.parse(dossier.toString("utf8")); } catch { /* stays null */ }
  check("dossier.json is valid JSON (makefun/dossier/v1)", !!parsed && parsed.schema === "makefun/dossier/v1");
  check(`dossier.json at most 1.5 MiB (${dossier.length} bytes)`, dossier.length <= 1572864);
  const out2 = runMain();
  check("second main.ts run is byte-identical",
    Buffer.compare(dossier, readFileSync(join(out2, "dossier.json"))) === 0);
}

console.log(failures === 0 ? "\nAll smoke tests passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
