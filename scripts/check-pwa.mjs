// Validates PWA assets. Run after `npm run build` to also check the generated service worker.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const errors = [];
const ok = (m) => console.log("✔", m);
const fail = (m) => { errors.push(m); console.error("✘", m); };

const manifestPath = "public/manifest.webmanifest";
if (!existsSync(manifestPath)) fail("manifest em falta");
else {
  const m = JSON.parse(readFileSync(manifestPath, "utf8"));
  for (const k of ["name", "short_name", "start_url", "display", "theme_color", "background_color", "icons"])
    m[k] ? ok(`manifest.${k}`) : fail(`manifest.${k} em falta`);
  if (m.display !== "standalone") fail("display deve ser standalone");
  for (const size of ["192x192", "512x512"])
    m.icons?.some((i) => i.sizes === size) ? ok(`ícone ${size}`) : fail(`ícone ${size} em falta`);
  m.icons?.some((i) => i.purpose?.includes("maskable")) ? ok("ícone maskable") : fail("ícone maskable em falta");
  for (const i of m.icons ?? []) existsSync(join("public", i.src)) ? null : fail(`ficheiro ${i.src} em falta`);
}
existsSync("public/icons/apple-touch-icon.png") ? ok("apple-touch-icon") : fail("apple-touch-icon em falta");

const root = readFileSync("src/routes/__root.tsx", "utf8");
for (const t of ["manifest.webmanifest", "theme-color", "apple-touch-icon", "apple-mobile-web-app-capable"])
  root.includes(t) ? ok(`head: ${t}`) : fail(`head sem ${t}`);

// Find generated sw.js in build output (if built)
function find(dir, name) {
  if (!existsSync(dir)) return null;
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { const r = find(p, name); if (r) return r; }
    else if (f === name) return p;
  }
  return null;
}
const sw = find(".output", "sw.js") || find("dist", "sw.js");
if (!sw) console.log("ℹ sw.js não encontrado (execute o build primeiro)");
else {
  const src = readFileSync(sw, "utf8");
  ok(`service worker gerado: ${sw}`);
  if (/supabase\.co|sb_publishable|access_token/i.test(src)) fail("service worker referencia credenciais/API");
  else ok("sem credenciais nem API no cache");
  if (/\.html"/.test(src)) fail("HTML pré-cacheado"); else ok("sem HTML pré-cacheado");
}

if (errors.length) { console.error(`\n${errors.length} erro(s)`); process.exit(1); }
console.log("\nPWA válida");
