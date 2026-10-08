// Einrechnen: das unbearbeitete große Foto holen, LUT und Körnung anwenden, in drei Größen neu kodieren.
// Läuft im Worker (OffscreenCanvas) und, wo der fehlt, genauso im Hauptthread.

import { applyGrain, applyLut, toLab, type RecipeValues } from "@/lib/develop/model";

export type BakeJob = { url: string; lut: Uint8Array; n: number; rec: RecipeValues; sizes: { large: number; page: number; thumb: number } };
export type BakeResult = { w: number; h: number; blobs: { large: Blob; page: Blob; thumb: Blob }; color: [number, number, number] };

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
type Ctx = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

export async function bake(job: BakeJob, make: (w: number, h: number) => AnyCanvas, encode: (c: AnyCanvas) => Promise<Blob>): Promise<BakeResult> {
  const res = await fetch(job.url, { mode: "cors", credentials: "omit" });
  if (!res.ok) throw new Error("Original nicht erreichbar");
  const bmp = await createImageBitmap(await res.blob());
  const s = Math.min(1, job.sizes.large / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * s);
  const h = Math.round(bmp.height * s);
  const large = make(w, h);
  const ctx = large.getContext("2d", { willReadFrequently: true }) as Ctx;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  // in Streifen, damit nie zwei volle Pixelpuffer gleichzeitig im Speicher liegen
  const STRIP = 256;
  for (let y = 0; y < h; y += STRIP) {
    const sh = Math.min(STRIP, h - y);
    const img = ctx.getImageData(0, y, w, sh);
    applyLut(img.data, img.data, job.lut, job.n);
    applyGrain(img.data, w, job.rec, y);
    ctx.putImageData(img, 0, y);
  }
  const shrink = (from: AnyCanvas, long: number) => {
    const k = Math.min(1, long / Math.max(from.width, from.height));
    const c = make(Math.round(from.width * k), Math.round(from.height * k));
    const x = c.getContext("2d") as Ctx;
    x.imageSmoothingQuality = "high";
    x.drawImage(from, 0, 0, c.width, c.height);
    return c;
  };
  const page = shrink(large, job.sizes.page);
  const thumb = shrink(page, job.sizes.thumb);
  const [bl, bp, bt] = await Promise.all([encode(large), encode(page), encode(thumb)]);
  // mittlere Farbe für die automatische Folge, wie beim Hochladen
  const tiny = make(12, 12);
  const tx = tiny.getContext("2d", { willReadFrequently: true }) as Ctx;
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
  return { w, h, blobs: { large: bl, page: bp, thumb: bt }, color: toLab(r / n / 255, g / n / 255, b / n / 255) };
}
