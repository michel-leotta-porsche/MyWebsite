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
// Pflichtseiten müssen da sein, interne Arbeitsstände dürfen nicht live gehen
const problems = [];
for (const f of ["impressum.html", "datenschutz.html"]) if (!html.includes(f)) problems.push(`${f} fehlt`);
for (const f of ["kritik.html", "qfd.html", "umfrage.html"]) if (html.includes(f)) problems.push(`${f} darf nicht live gehen`);
if (html.includes("impressum.html") && (await readFile(path.join(out, "impressum.html"), "utf8")).includes("ANSCHRIFT FEHLT"))
  problems.push("Impressum ohne Anschrift: FUJI_IMPRESSUM_ADRESSE in photos/.env.local setzen (Zeilen mit | trennen)");
// App Check: ohne Site-Schlüssel ginge die Seite ungeschützt raus, und bei erzwungenem App Check schlüge jede Anfrage fehl
const envLocal = await readFile(path.join(import.meta.dirname, "..", ".env.local"), "utf8").catch(() => "");
if (!process.env.NEXT_PUBLIC_FUJI_APPCHECK_KEY && !/^NEXT_PUBLIC_FUJI_APPCHECK_KEY=\S/m.test(envLocal))
  problems.push("App Check ohne Schlüssel: NEXT_PUBLIC_FUJI_APPCHECK_KEY (reCAPTCHA-v3-Site-Schlüssel) in photos/.env.local setzen");
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

if (missing.size) {
  console.error(`${missing.size} Dateien fehlen, z. B.:\n${[...missing].slice(0, 5).join("\n")}`);
  process.exit(1);
}
console.log(`Export vollständig (${html.length} Seiten geprüft)`);
