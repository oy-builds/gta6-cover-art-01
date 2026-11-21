// Smoke test — run: node smoke.test.mjs
// Checks the deliverable files exist, the export logic is present,
// the three styles are wired, and no external/network assets are referenced.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL(".", import.meta.url));
let failures = 0;
function check(name, ok) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failures++;
}
function read(name) { return readFileSync(join(root, name), "utf8"); }

for (const f of ["index.html", "app.js", "styles.css", "server.mjs", "README.md"]) {
  check(`exists: ${f}`, existsSync(join(root, f)));
}

const html = read("index.html");
const js = read("app.js");
const css = read("styles.css");
const all = html + "\n" + js + "\n" + css;

// Export logic
check("canvas element present", /<canvas[^>]+id="coverCanvas"/.test(html));
check("canvas is at least 1024 wide", /width="1024"/.test(html));
check("PNG export uses toBlob", js.includes("toBlob") && js.includes('"image/png"'));
check("export triggers a download", js.includes("download") && js.includes(".png"));
check("photo upload input present", /type="file"/.test(html) && html.includes("photoInput"));
check("drag-and-drop wired", js.includes("drop") && js.includes("dataTransfer"));

// Three original styles
for (const style of ["sunset", "neon", "halftone"]) {
  check(`style present: ${style}`, html.includes(`value="${style}"`) && js.includes(style));
}
check("demo scene generator present", js.includes("drawDemoScene"));
check("title + subtitle inputs present", html.includes("titleInput") && html.includes("subtitleInput"));

// Offline guarantees: no external URLs in src/href, no CDN, no fetch/XHR in app code
check("no external src/href in HTML", !/(src|href)\s*=\s*"https?:\/\//i.test(html));
check("no CDN references", !/cdn\.|googleapis|unpkg|jsdelivr/i.test(all));
check("no network calls in app.js", !/\bfetch\s*\(|XMLHttpRequest|WebSocket/.test(js));

// Server sanity
const server = read("server.mjs");
check("server.mjs is a node http static server", server.includes("createServer") && server.includes("index.html"));

console.log(failures === 0 ? "\nAll smoke tests passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
