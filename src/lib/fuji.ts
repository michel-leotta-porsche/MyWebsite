// Liest das Film-Simulation-Rezept aus der Fujifilm-MakerNote eines Originals (JPEG, HEIF oder DNG; die MakerNote liefert exifr).
// Aufbau: "FUJIFILM", danach ein Versatz (little endian) auf ein IFD; alle Versätze zählen ab Beginn der MakerNote.
// Tag-Nummern und Werte nach der ExifTool-Dokumentation (FujiFilm Tags). Noch nicht mit echten Dateien geprüft:
// unbekannte Werte erscheinen als Rohwert statt falsch übersetzt.

import type { FujiRecipe } from "@/content/recipes";
import { de } from "@/lib/i18n";

type Entry = { tag: number; type: number; count: number; at: number };

const SIZES: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 8: 2, 9: 4, 10: 8 };

/** Alle Einträge eines IFD (Byte-Reihenfolge wählbar) */
function readIfd(v: DataView, ifd: number, le: boolean, base: number): Entry[] {
  const n = v.getUint16(ifd, le);
  const out: Entry[] = [];
  for (let i = 0; i < n; i++) {
    const e = ifd + 2 + i * 12;
    const type = v.getUint16(e + 2, le);
    const count = v.getUint32(e + 4, le);
    const size = (SIZES[type] ?? 1) * count;
    const at = size <= 4 ? e + 8 : base + v.getUint32(e + 8, le);
    out.push({ tag: v.getUint16(e, le), type, count, at });
  }
  return out;
}

const FILM: Record<number, string> = {
  0x0: "Provia",
  0x100: "Studio Portrait",
  0x110: "Studio Portrait Enhanced Saturation",
  0x120: "Astia",
  0x130: "Studio Portrait Increased Sharpness",
  0x200: "Velvia",
  0x300: "Studio Portrait Ex",
  0x400: "Velvia",
  0x500: "Pro Neg. Std",
  0x501: "Pro Neg. Hi",
  0x600: "Classic Chrome",
  0x700: "Eterna",
  0x800: "Classic Negative",
  0x900: "Eterna Bleach Bypass",
  0xa00: "Nostalgic Neg.",
  0xb00: "Reala Ace",
};
// Saturation trägt bei Schwarzweiß die Filmsimulation, sonst den Farbwert
const SATURATION: Record<number, number | string> = {
  0x0: 0,
  0x80: 1,
  0x100: 2,
  0xc0: 3,
  0xe0: 4,
  0x180: -1,
  0x400: -2,
  0x4c0: -3,
  0x4e0: -4,
  0x300: de("Monochrom"),
  0x301: de("Monochrom + Rotfilter"),
  0x302: de("Monochrom + Gelbfilter"),
  0x303: de("Monochrom + Grünfilter"),
  0x310: "Sepia",
  0x500: "Acros",
  0x501: de("Acros + Rotfilter"),
  0x502: de("Acros + Gelbfilter"),
  0x503: de("Acros + Grünfilter"),
};
const SHARPNESS: Record<number, number> = { 0x0: -4, 0x1: -3, 0x2: -2, 0x82: -1, 0x3: 0, 0x84: 1, 0x4: 2, 0x5: 3, 0x6: 4 };
const NR: Record<number, number> = {
  0x0: 0,
  0x180: 1,
  0x100: 2,
  0x1c0: 3,
  0x1e0: 4,
  0x280: -1,
  0x200: -2,
  0x2c0: -3,
  0x2e0: -4,
};
const WB: Record<number, string> = {
  0x0: "Auto",
  0x1: de("Auto, Weiß"),
  0x2: de("Auto, Ambiente"),
  0x100: de("Tageslicht"),
  0x200: de("Bewölkt"),
  0x300: de("Leuchtstoff Tageslicht"),
  0x301: de("Leuchtstoff Tagesweiß"),
  0x302: de("Leuchtstoff Kaltweiß"),
  0x303: de("Leuchtstoff Warmweiß"),
  0x400: de("Kunstlicht"),
  0x500: de("Blitz"),
  0x600: de("Unterwasser"),
  0xf00: de("Eigener"),
  0xff0: "Kelvin",
};
const level = (v: number | undefined): 0 | 1 | 2 => (v === 64 ? 2 : v === 32 ? 1 : 0);
const tone = (v: number | undefined) => (v === undefined ? 0 : -v / 16);

/** Rezept aus einer Fuji-MakerNote, oder null, wenn sie keine ist oder sich nicht lesen lässt */
export function readFujiRecipe(note: Uint8Array, exif: { iso?: number; ev?: number }): FujiRecipe | null {
  // eine abgeschnittene oder fremde MakerNote darf nur das Rezept kosten, nicht das ganze Foto
  try {
    return parse(new DataView(note.buffer, note.byteOffset, note.byteLength), exif);
  } catch {
    return null;
  }
}

function parse(v: DataView, exif: { iso?: number; ev?: number }): FujiRecipe | null {
  const start = 0;
  if (v.byteLength < 14) return null;
  // "FUJIFILM" am Anfang
  if (v.getUint32(start) !== 0x46554a49 || v.getUint32(start + 4) !== 0x46494c4d) return null;
  const ifd = start + v.getUint32(start + 8, true);
  const entries = readIfd(v, ifd, true, start);
  const get = (tag: number) => entries.find((e) => e.tag === tag);
  const u16 = (tag: number) => {
    const e = get(tag);
    return e ? v.getUint16(e.at, true) : undefined;
  };
  const s32 = (tag: number, i = 0) => {
    const e = get(tag);
    return e ? v.getInt32(e.at + i * 4, true) : undefined;
  };

  const sat = u16(0x1003);
  const satValue = sat === undefined ? 0 : SATURATION[sat];
  const filmMode = u16(0x1401);
  const film =
    typeof satValue === "string" ? satValue : filmMode !== undefined ? (FILM[filmMode] ?? `Film 0x${filmMode.toString(16)}`) : "Provia";
  const wbMode = u16(0x1002);
  const kelvin = u16(0x1005);
  const wbLabel = wbMode === 0xff0 && kelvin ? `${kelvin}K` : wbMode !== undefined ? (WB[wbMode] ?? "Auto") : "Auto";
  // Feinabstimmung in 20er-Schritten gespeichert
  const r = Math.round((s32(0x100a, 0) ?? 0) / 20);
  const b = Math.round((s32(0x100a, 1) ?? 0) / 20);
  const drSetting = u16(0x1402);
  const devDr = u16(0x1403);
  // bei „DR Auto“ steht der tatsächlich angewandte Wert trotzdem in 0x1403
  const dr = drSetting === 0 ? (devDr ? `DR Auto (DR${devDr})` : "DR Auto") : devDr ? `DR${devDr}` : "DR100";
  const roughness = u16(0x1047) ?? s32(0x1047);
  const size = u16(0x104c);
  const evNum = exif.ev ?? 0;
  const evThird = Math.round(evNum * 3);
  const ev =
    evThird === 0
      ? "±0"
      : `${evThird > 0 ? "+" : "−"}${Math.abs(evThird) % 3 === 0 ? Math.abs(evThird) / 3 : `${Math.floor(Math.abs(evThird) / 3) ? `${Math.floor(Math.abs(evThird) / 3)} ` : ""}${Math.abs(evThird) % 3}/3`}`;

  return {
    kind: "fuji",
    name: film,
    film,
    dr,
    wb: { mode: wbLabel, r, b },
    highlight: tone(s32(0x1041)),
    shadow: tone(s32(0x1040)),
    color: typeof satValue === "number" ? satValue : 0,
    sharpness: SHARPNESS[u16(0x1001) ?? 0x3] ?? 0,
    nr: NR[u16(0x100e) ?? 0] ?? 0,
    clarity: Math.round((s32(0x100f) ?? 0) / 1000),
    grain: { strength: level(roughness), size: size === 32 ? "groß" : "klein" },
    colorChrome: level(u16(0x1048) ?? s32(0x1048)),
    fxBlue: level(u16(0x104e) ?? s32(0x104e)),
    iso: exif.iso ? `ISO ${exif.iso}` : "–",
    ev,
    placeholder: false,
  };
}
