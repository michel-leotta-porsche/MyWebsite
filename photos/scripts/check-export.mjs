// Bricht den Deploy ab, wenn eine HTML-Seite in out/ eine Datei unter /_next/static verlangt, die nicht existiert.
// Läuft als predeploy in firebase.json nach `npm run export`.
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const out = path.join(import.meta.dirname, "..", "out");
const html = (await readdir(out, { recursive: true })).filter((f) => f.endsWith(".html"));
const missing = new Set();
for (const f of html) {
  const text = await readFile(path.join(out, f), "utf8");
  for (const [, url] of text.matchAll(/(\/_next\/static\/[^"'\s,)\\]+)/g)) {
    const clean = decodeURIComponent(url.split("?")[0]);
    // Originalfotos entfernt shrink-export; der Loader verlangt nur die Fassungen name-s480.jpg …
    const target = /\.jpg$/.test(clean) && !/-s\d+\.jpg$/.test(clean) ? clean.replace(/\.jpg$/, "-s480.jpg") : clean;
    await access(path.join(out, target)).catch(() => missing.add(target));
  }
}
if (missing.size) {
  console.error(`${missing.size} Dateien fehlen, z. B.:\n${[...missing].slice(0, 5).join("\n")}`);
  process.exit(1);
}
console.log(`Export vollständig (${html.length} Seiten geprüft)`);
