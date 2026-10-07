"use client";

// Statischer Export ohne Bildserver: scripts/shrink-export.mjs legt jedes Foto
// in festen Breiten ab (name-s480.jpg …). Der Browser wählt per srcset die passende,
// das Telefon lädt so nie die 1800px-Fassung, wenn 960 reichen.
export const WIDTHS = [480, 960, 1440, 1800] as const;

export default function imageLoader({ src, width }: { src: string; width: number }) {
  // Bilder aus Firebase Storage liegen schon in festen Größen vor (siehe lib/ingest.ts)
  if (/^(https?:|blob:|data:)/.test(src)) return src;
  const w = WIDTHS.find((x) => x >= width) ?? WIDTHS[WIDTHS.length - 1];
  // „-s“ statt „.w“: neue Namen, weil am 07.10. die alten URLs als 404 ein Jahr lang gecacht wurden
  return src.replace(/\.jpg$/, `-s${w}.jpg`);
}
