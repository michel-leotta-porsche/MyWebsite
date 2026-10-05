import { hexToLinear } from './util';

// Palette des Videos: Cartoon-Labor bei Nacht. Tinte und Knochenweiß als Grundlage,
// Bernstein (signal) aus dem Systemplan als Akzent, Portal-Grün (acid) für Sci-Fi-Momente.
// Die Schlüssel bleiben die der Engine, damit HUD, Post und GLSL_COMMON weiter passen.
export const HEX = {
  ink: '#10131A', // Nachthimmel, Hintergrund
  ink2: '#1A1F2B', // Flächen im Dunkeln
  graphite: '#3A4252', // dunkle Linien
  ash: '#8C93A3', // Mittelgrau, Nebentext
  bone: '#F3EFE4', // Papier, Haupttext, Sprechblasen
  signal: '#FFB224', // Bernstein (Systemplan): aktives Wort, Haken, Zeiger
  ember: '#FFD27A', // helleres Bernstein für Kerne
  blood: '#E2483D', // Fehler, FAIL, Alarm
  acid: '#8EF04A', // Portal-Grün
} as const;

export type PaletteKey = keyof typeof HEX;

/** Linear RGB triplets for GL uniforms. */
export const LIN: Record<PaletteKey, [number, number, number]> = Object.fromEntries(
  Object.entries(HEX).map(([k, v]) => [k, hexToLinear(v)]),
) as Record<PaletteKey, [number, number, number]>;

/** CSS rgba() for Canvas2D. */
export function rgba(key: PaletteKey | string, a = 1): string {
  const hex = (HEX as Record<string, string>)[key] ?? key;
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
