// Lässt node --test die TypeScript-Quellen laden: „@/…“ zeigt auf src/, Endungen .ts und .tsx werden ergänzt.
import { register } from "node:module";

register(
  "data:text/javascript," +
    encodeURIComponent(`
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
const src = new URL("../../src/", ${JSON.stringify(import.meta.url)});
export async function resolve(spec, ctx, next) {
  let url = null;
  if (spec.startsWith("@/")) url = new URL(spec.slice(2), src);
  else if ((spec.startsWith("./") || spec.startsWith("../")) && ctx.parentURL?.includes("/src/")) url = new URL(spec, ctx.parentURL);
  if (url) {
    const p = fileURLToPath(url);
    for (const ext of ["", ".ts", ".tsx", "/index.ts"]) if (existsSync(p + ext) && !(ext === "" && !/\\.[a-z]+$/.test(p))) return next(pathToFileURL(p + ext).href, ctx);
  }
  return next(spec, ctx);
}
// Fotos, die Quellen importieren (Next liefert dafür Maße und Pfad): eine leere Stellvertreterin genügt
export async function load(url, ctx, next) {
  if (/\\.(jpe?g|png|webp)$/.test(url)) return { format: "module", source: "export default { src: '', width: 1, height: 1 };", shortCircuit: true };
  return next(url, ctx);
}
`),
);
