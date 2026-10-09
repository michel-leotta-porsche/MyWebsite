// Einrechnen: das unbearbeitete große Foto holen, LUT und Körnung anwenden, in drei Größen neu kodieren.
// Läuft im Worker (OffscreenCanvas) und, wo der fehlt, genauso im Hauptthread.

import { applyClarity, blurMap, blurSize, sharpenRows, type SharpenLevel } from "@/lib/develop/detail";
import { outSize, placeOn, type Geo } from "@/lib/develop/geo";
import { applyGrain, applyLut, applyVignette, toLab, type RecipeValues } from "@/lib/develop/model";

export type BakeJob = {
  url: string;
  lut: Uint8Array;
  n: number;
  rec: RecipeValues;
  sizes: { large: number; page: number; thumb: number };
  /** JPEG-Qualität; im Buch 0,86 wie beim Hochladen, im Fotostudio höher */
  quality?: number;
  /** Höchstgröße des Originals in Byte */
  maxBytes?: number;
  /** Zuschnitt; vor LUT und Körnung, damit die Körnung am Ergebnis gleich groß ist */
  geo?: Geo;
  /** Vignette −1..1, nach dem LUT und vor der Körnung */
  vignette?: number;
  /** Klarheit −1..1, vor dem LUT (wie in der Vorschau) */
  clarity?: number;
  /** „Für die Datei schärfen“, nach der Vignette und vor der Körnung */
  sharpen?: SharpenLevel;
};
export type BakeResult = { w: number; h: number; blobs: { large: Blob; page: Blob; thumb: Blob }; color: [number, number, number] };

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
type Ctx = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

type Source = ImageBitmap | HTMLImageElement;
/** Eingerechnet wird nur aus dem eigenen Speicher (oder im Testmodus aus dem Browser), nie von fremden Adressen */
export const bakeable = (url: string) => url.startsWith("https://firebasestorage.googleapis.com/") || url.startsWith("blob:");
/** große Fassung ist höchstens etwa 2 MB; mehr wäre eine fremde Datei, die beim Entpacken den Speicher sprengt */
export const MAX_ORIGINAL = 12 * 1024 * 1024;

export const fetchBitmap = async (url: string, maxBytes = MAX_ORIGINAL): Promise<Source> => {
  if (!bakeable(url)) throw new Error("Original liegt nicht im eigenen Speicher");
  // Kopie ohne CORS-Freigabe im Cache: einmal frisch holen
  const res = await fetch(url, { mode: "cors", credentials: "omit" }).catch(() => fetch(url, { mode: "cors", credentials: "omit", cache: "reload" }));
  if (!res.ok) throw new Error(`Original nicht erreichbar (HTTP ${res.status})`);
  const blob = await res.blob();
  if (blob.size > maxBytes) throw new Error("Original zu groß");
  return createImageBitmap(blob);
};
const free = (c: AnyCanvas) => {
  c.width = 0;
  c.height = 0;
};
function ctxOf(c: AnyCanvas, read = false): Ctx {
  const ctx = c.getContext("2d", read ? { willReadFrequently: true } : undefined) as Ctx | null;
  // Safari gibt null zurück, wenn der Speicher für Zeichenflächen voll ist
  if (!ctx) throw new Error("Kein Speicher für eine Zeichenfläche");
  return ctx;
}

export async function bake(
  job: BakeJob,
  make: (w: number, h: number) => AnyCanvas,
  encode: (c: AnyCanvas, quality: number) => Promise<Blob>,
  load: (url: string, maxBytes?: number) => Promise<Source> = fetchBitmap,
): Promise<BakeResult> {
  const bmp = await load(job.url, job.maxBytes);
  const bw = "naturalWidth" in bmp ? bmp.naturalWidth : bmp.width;
  const bh = "naturalHeight" in bmp ? bmp.naturalHeight : bmp.height;
  // Zuschnitt macht die Fläche kleiner; hochgerechnet wird nie
  const [ow, oh] = outSize(job.geo, bw, bh);
  const s = Math.min(1, job.sizes.large / Math.max(ow, oh));
  const w = Math.max(1, Math.round(ow * s));
  const h = Math.max(1, Math.round(oh * s));
  const large = make(w, h);
  const ctx = ctxOf(large, true);
  ctx.imageSmoothingQuality = "high";
  if (job.geo) {
    placeOn(ctx, job.geo, bw, bh, s);
    ctx.drawImage(bmp, -bw / 2, -bh / 2, bw, bh);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  } else ctx.drawImage(bmp, 0, 0, w, h);
  if ("close" in bmp) bmp.close();
  // Klarheit braucht die Umgebung: kleine weichgezeichnete Kopie, Radius bezogen aufs ganze Foto wie in der Vorschau
  let blur: ReturnType<typeof blurMap> | null = null;
  if (job.clarity) {
    const [mw, mh] = blurSize(w, h, Math.max(bw, bh) * s);
    const mc = make(mw, mh);
    const mx = ctxOf(mc, true);
    mx.imageSmoothingQuality = "high";
    mx.drawImage(large, 0, 0, mw, mh);
    blur = blurMap(mx.getImageData(0, 0, mw, mh).data, mw, mh);
    free(mc);
  }
  const sharpen = job.sharpen ?? 0;
  // in Streifen, damit nie zwei volle Pixelpuffer gleichzeitig im Speicher liegen
  const STRIP = 256;
  for (let y = 0; y < h; y += STRIP) {
    const sh = Math.min(STRIP, h - y);
    const img = ctx.getImageData(0, y, w, sh);
    if (blur && job.clarity) applyClarity(img.data, w, h, job.clarity, blur, y);
    applyLut(img.data, img.data, job.lut, job.n);
    if (job.vignette) applyVignette(img.data, w, h, job.vignette, y);
    if (!sharpen) applyGrain(img.data, w, job.rec, y);
    ctx.putImageData(img, 0, y);
  }
  // Schärfen braucht die Nachbarzeilen: zweiter Durchgang, die Zeile darüber wird vor dem Schreiben gemerkt
  if (sharpen) {
    let above: Uint8ClampedArray | null = null;
    for (let y = 0; y < h; y += STRIP) {
      const sh = Math.min(STRIP, h - y);
      const more = y + sh < h ? 1 : 0;
      const img = ctx.getImageData(0, y, w, sh + more);
      const all = img.data;
      const rows = all.subarray(0, w * sh * 4);
      const below = more ? all.slice(w * sh * 4) : null;
      const last = rows.slice(w * (sh - 1) * 4);
      sharpenRows(rows, w, sharpen, above, below);
      applyGrain(rows, w, job.rec, y);
      above = last;
      // nur die eigenen Zeilen zurückschreiben, die Randzeile darunter bleibt unberührt
      ctx.putImageData(img, 0, y, 0, 0, w, sh);
    }
  }
  const shrink = (from: AnyCanvas, long: number) => {
    const k = Math.min(1, long / Math.max(from.width, from.height));
    const c = make(Math.round(from.width * k), Math.round(from.height * k));
    const x = ctxOf(c);
    x.imageSmoothingQuality = "high";
    x.drawImage(from, 0, 0, c.width, c.height);
    return c;
  };
  const q = job.quality ?? 0.86;
  const page = shrink(large, job.sizes.page);
  const thumb = shrink(page, job.sizes.thumb);
  const [bl, bp, bt] = await Promise.all([encode(large, q), encode(page, q), encode(thumb, q)]);
  free(large);
  free(page);
  // mittlere Farbe für die automatische Folge, wie beim Hochladen
  const tiny = make(12, 12);
  const tx = ctxOf(tiny, true);
  tx.drawImage(thumb, 0, 0, 12, 12);
  const d = tx.getImageData(0, 0, 12, 12).data;
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < d.length; i += 4) {
    r += d[i];
    g += d[i + 1];
    b += d[i + 2];
  }
  const n = d.length / 4;
  free(thumb);
  free(tiny);
  return { w, h, blobs: { large: bl, page: bp, thumb: bt }, color: toLab(r / n / 255, g / n / 255, b / n / 255) };
}
