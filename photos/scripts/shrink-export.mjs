// Legt jedes Foto im statischen Export (out/) in festen Breiten ab, passend zu src/image-loader.ts.
// Ohne Bildserver lieferte next/image sonst überall die Originale aus.
import { readdir, rm, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const WIDTHS = [480, 960, 1440, 1800];
const dir = path.join(import.meta.dirname, "..", "out", "_next", "static", "media");
const files = (await readdir(dir)).filter((f) => f.endsWith(".jpg") && !/-s\d+\.jpg$/.test(f));

for (const f of files) {
  const file = path.join(dir, f);
  for (const w of WIDTHS) {
    await sharp(file)
      .resize({ width: w, height: w, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: w <= 960 ? 78 : 80, progressive: true, mozjpeg: true })
      .toFile(file.replace(/\.jpg$/, `-s${w}.jpg`));
  }
  // das Original wird nicht mehr verlinkt
  await unlink(file);
}
console.log(`${files.length} Fotos in ${WIDTHS.length} Breiten abgelegt`);

// Arbeitsstände aus src/app/(intern) gehören nicht auf die Live-Seite: Seite, Daten und Ordner entfernen
const out = path.join(import.meta.dirname, "..", "out");
const INTERN = ["kritik", "qfd", "umfrage"];
for (const name of INTERN) {
  for (const f of [`${name}.html`, `${name}.txt`, name]) await rm(path.join(out, f), { recursive: true, force: true });
}
console.log(`Interne Seiten entfernt: ${INTERN.map((n) => "/" + n).join(", ")}`);
