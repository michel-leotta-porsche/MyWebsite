"use client";

import exifr from "exifr";

import type { CameraInfo, Recipe } from "@/content/recipes";
import { readFujiRecipe, readXmp } from "@/lib/fuji";
import { parseXmp, toPreset } from "@/lib/xmp";

// Ein Foto für ein neues Buch vorbereiten, ganz im Browser:
// Rezept und Kameradaten lesen, dann neu kodieren in drei Größen. Beim Neukodieren fallen alle
// Metadaten weg, also auch GPS und Seriennummer. Hochgeladen werden nur die neuen Dateien.

export const SIZES = { thumb: 360, page: 1280, large: 2560 } as const;
export type SizeName = keyof typeof SIZES;

export type Ingested = {
  key: string;
  name: string;
  w: number;
  h: number;
  blobs: Record<SizeName, Blob>;
  /** mittlere Farbe in Lab, für die automatische Folge */
  color: [number, number, number];
  taken?: string;
  camera?: CameraInfo;
  recipe?: Recipe;
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Bildformat wird nicht unterstützt"));
    };
    img.src = url;
  });
}

function encode(img: HTMLImageElement, long: number): Promise<{ blob: Blob; canvas: HTMLCanvasElement }> {
  const s = Math.min(1, long / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * s);
  const h = Math.round(img.naturalHeight * s);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve({ blob: b, canvas }) : reject(new Error("Kodieren fehlgeschlagen"))), "image/jpeg", 0.86),
  );
}

// sRGB → Lab (D65), reicht für Farbähnlichkeit
function toLab(r: number, g: number, b: number): [number, number, number] {
  const lin = (c: number) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

function averageColor(canvas: HTMLCanvasElement): [number, number, number] {
  const small = document.createElement("canvas");
  small.width = 12;
  small.height = 12;
  const ctx = small.getContext("2d")!;
  ctx.drawImage(canvas, 0, 0, 12, 12);
  const d = ctx.getImageData(0, 0, 12, 12).data;
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < d.length; i += 4) {
    r += d[i];
    g += d[i + 1];
    b += d[i + 2];
  }
  const n = d.length / 4;
  return toLab(r / n, g / n, b / n);
}

const pick = ["Make", "Model", "LensModel", "FocalLengthIn35mmFormat", "FocalLength", "FNumber", "ExposureTime", "ISO", "ExposureCompensation", "DateTimeOriginal"];

export async function ingest(file: File, key: string): Promise<Ingested> {
  let meta: Record<string, unknown> = {};
  try {
    meta = (await exifr.parse(file, { pick })) ?? {};
  } catch {}
  const iso = meta.ISO as number | undefined;
  const ev = meta.ExposureCompensation as number | undefined;
  const make = String(meta.Make ?? "");
  const taken = meta.DateTimeOriginal instanceof Date ? meta.DateTimeOriginal.toISOString() : undefined;

  let recipe: Recipe | undefined;
  if (/jpe?g$/i.test(file.type) || /\.jpe?g$/i.test(file.name)) {
    const buf = await file.arrayBuffer();
    if (/fujifilm/i.test(make)) recipe = readFujiRecipe(buf, { iso, ev }) ?? undefined;
    if (!recipe) {
      const xmp = readXmp(buf);
      const lr = xmp ? parseXmp(xmp) : null;
      // nur wenn wirklich Entwicklungswerte drinstehen, nicht bloß ein Profilname
      if (xmp && lr && lr.basics.some((b) => b.value !== 0)) {
        const name = lr.name ?? "Lightroom-Einstellungen";
        recipe = { kind: "lightroom", name, inline: toPreset(xmp, name), placeholder: false };
      }
    }
  }

  const camera: CameraInfo | undefined = meta.Model
    ? {
        device: [/apple/i.test(make) ? "" : make.replace(/\s*CORPORATION/i, ""), String(meta.Model)].filter(Boolean).join(" "),
        focal35: (meta.FocalLengthIn35mmFormat as number) ?? (meta.FocalLength as number),
        aperture: meta.FNumber as number,
        shutter: meta.ExposureTime as number,
        iso,
        ev,
        date: taken?.slice(0, 10),
      }
    : undefined;

  const img = await loadImage(file);
  try {
    const large = await encode(img, SIZES.large);
    const page = await encode(img, SIZES.page);
    const thumb = await encode(img, SIZES.thumb);
    const color = averageColor(thumb.canvas);
    return {
      key,
      name: file.name,
      w: large.canvas.width,
      h: large.canvas.height,
      blobs: { large: large.blob, page: page.blob, thumb: thumb.blob },
      color,
      taken,
      camera,
      recipe,
    };
  } finally {
    URL.revokeObjectURL(img.src);
  }
}
