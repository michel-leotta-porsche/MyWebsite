// Verkleinert die Fotos im statischen Export (out/) auf Webgröße.
// Ohne Bildserver liefert next/image sonst die Originale aus.
import { readdir, rename } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const dir = path.join(import.meta.dirname, "..", "out", "_next", "static", "media");
const files = (await readdir(dir)).filter((f) => f.endsWith(".jpg"));

for (const f of files) {
  const file = path.join(dir, f);
  const tmp = `${file}.tmp`;
  await sharp(file)
    .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80, progressive: true, mozjpeg: true })
    .toFile(tmp);
  await rename(tmp, file);
}
console.log(`${files.length} Fotos verkleinert`);
