// Bricht den Deploy ab, wenn eine HTML-Seite in out/ eine Datei unter /_next/static verlangt, die nicht existiert.
// Läuft als predeploy in firebase.json nach `npm run export`.
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

import nextEnv from "@next/env";

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
for (const f of ["impressum.html", "datenschutz.html", "hilfe.html", "nutzungsbedingungen.html"]) if (!html.includes(f)) problems.push(`${f} fehlt`);
for (const f of ["kritik.html", "qfd.html", "umfrage.html"]) if (html.includes(f)) problems.push(`${f} darf nicht live gehen`);
// Die Anschrift muss wie eine aussehen (Straße und Ort mit Postleitzahl), nicht nur gesetzt sein: am 9.10.2026 stand
// live „photos/.env.local“ im Impressum, weil das Secret einen Platzhalter enthielt. Den Wert nie ausgeben.
nextEnv.loadEnvConfig(path.join(import.meta.dirname, ".."));
const address = (process.env.FUJI_IMPRESSUM_ADRESSE ?? "").split("|").map((l) => l.trim()).filter(Boolean);
if (address.length < 2 || !address.some((l) => /\b\d{4,5}\b/.test(l)) || address.some((l) => /\.env|\.local\b|^\S+\/\S+$/.test(l)))
  problems.push(
    "Impressum ohne gültige Anschrift: FUJI_IMPRESSUM_ADRESSE (GitHub-Secret bzw. .env.local) braucht mindestens zwei Zeilen mit | getrennt, eine davon mit Postleitzahl",
  );
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

if (missing.size) {
  console.error(`${missing.size} Dateien fehlen, z. B.:\n${[...missing].slice(0, 5).join("\n")}`);
  process.exit(1);
}
console.log(`Export vollständig (${html.length} Seiten geprüft)`);
