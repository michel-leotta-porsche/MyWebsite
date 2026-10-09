// Aufnahmedaten zurück in ein JPEG schreiben, das über eine Zeichenfläche gelaufen ist (die verliert alle Metadaten).
// Geschrieben wird nur, was beim Wiederfinden hilft: Datum, Kamera, Objektiv, Belichtung. Ort, Seriennummern
// und Gerätenamen kommen nie hinein. Die Ausrichtung ist 1, weil das Bild schon gedreht eingerechnet ist.

/** Werte aus exifr, so wie ingest sie liest; alles optional */
export type ExifFields = {
  make?: string;
  model?: string;
  lens?: string;
  /** Ortszeit der Aufnahme, „JJJJ:MM:TT hh:mm:ss“ */
  taken?: string;
  exposure?: number;
  fnumber?: number;
  iso?: number;
  ev?: number;
  focal?: number;
  focal35?: number;
};

const pad = (n: number) => String(n).padStart(2, "0");
/** exifr liefert Datumswerte als Date in Ortszeit; so bleibt die Uhrzeit auf der Kamera erhalten */
export const exifDate = (d: Date) => `${d.getFullYear()}:${pad(d.getMonth() + 1)}:${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

type Entry = { tag: number; type: number; count: number; data: Uint8Array };

const ASCII = 2;
const SHORT = 3;
const LONG = 4;
const RATIONAL = 5;
const UNDEFINED = 7;
const SRATIONAL = 10;

const ascii = (tag: number, s: string): Entry => {
  const clean = s.replace(/[^\x20-\x7e]/g, "").slice(0, 63);
  const data = new Uint8Array(clean.length + 1);
  for (let i = 0; i < clean.length; i++) data[i] = clean.charCodeAt(i);
  return { tag, type: ASCII, count: data.length, data };
};
const short = (tag: number, v: number): Entry => {
  const data = new Uint8Array(2);
  new DataView(data.buffer).setUint16(0, Math.max(0, Math.min(65535, Math.round(v))));
  return { tag, type: SHORT, count: 1, data };
};
const long = (tag: number, v: number): Entry => {
  const data = new Uint8Array(4);
  new DataView(data.buffer).setUint32(0, v);
  return { tag, type: LONG, count: 1, data };
};
const rational = (tag: number, [n, d]: [number, number], signed = false): Entry => {
  const data = new Uint8Array(8);
  const dv = new DataView(data.buffer);
  if (signed) dv.setInt32(0, n);
  else dv.setUint32(0, n);
  dv.setUint32(4, d);
  return { tag, type: signed ? SRATIONAL : RATIONAL, count: 1, data };
};
const ok = (v: number | undefined): v is number => typeof v === "number" && Number.isFinite(v);
/** Belichtungszeit als Bruch: 1/250 statt 0.004 */
const shutter = (v: number): [number, number] => (v < 1 ? [1, Math.max(1, Math.round(1 / v))] : [Math.round(v * 10), 10]);
const tenths = (v: number): [number, number] => [Math.max(0, Math.round(v * 10)), 10];

/** Ein IFD ab Position at; Werte über 4 Byte liegen direkt dahinter. Gibt die Bytes zurück */
function ifd(entries: Entry[], at: number): Uint8Array {
  entries.sort((a, b) => a.tag - b.tag);
  const head = 2 + entries.length * 12 + 4;
  const extra = entries.reduce((n, e) => n + (e.data.length > 4 ? e.data.length + (e.data.length % 2) : 0), 0);
  const out = new Uint8Array(head + extra);
  const dv = new DataView(out.buffer);
  dv.setUint16(0, entries.length);
  let free = head;
  entries.forEach((e, i) => {
    const o = 2 + i * 12;
    dv.setUint16(o, e.tag);
    dv.setUint16(o + 2, e.type);
    dv.setUint32(o + 4, e.count);
    if (e.data.length <= 4) out.set(e.data, o + 8);
    else {
      dv.setUint32(o + 8, at + free);
      out.set(e.data, free);
      free += e.data.length + (e.data.length % 2);
    }
  });
  // kein weiteres IFD
  dv.setUint32(2 + entries.length * 12, 0);
  return out;
}

/** TIFF-Block (big-endian) mit IFD0 und Exif-IFD */
export function exifBlock(f: ExifFields): Uint8Array {
  const zero: Entry[] = [short(0x0112, 1), ascii(0x0131, "Calima")];
  if (f.make) zero.push(ascii(0x010f, f.make));
  if (f.model) zero.push(ascii(0x0110, f.model));
  if (f.taken) zero.push(ascii(0x0132, f.taken));

  const exif: Entry[] = [{ tag: 0x9000, type: UNDEFINED, count: 4, data: new Uint8Array([0x30, 0x32, 0x33, 0x32]) }, short(0xa001, 1)];
  if (f.taken) exif.push(ascii(0x9003, f.taken), ascii(0x9004, f.taken));
  if (ok(f.exposure) && f.exposure > 0) exif.push(rational(0x829a, shutter(f.exposure)));
  if (ok(f.fnumber)) exif.push(rational(0x829d, tenths(f.fnumber)));
  if (ok(f.iso)) exif.push(short(0x8827, f.iso));
  if (ok(f.ev)) exif.push(rational(0x9204, [Math.round(f.ev * 100), 100], true));
  if (ok(f.focal)) exif.push(rational(0x920a, tenths(f.focal)));
  if (ok(f.focal35)) exif.push(short(0xa405, f.focal35));
  if (f.lens) exif.push(ascii(0xa434, f.lens));

  // Länge von IFD0 steht erst fest, wenn der Zeiger aufs Exif-IFD drin ist; der Zeiger selbst hat feste Größe
  zero.push(long(0x8769, 0));
  const first = ifd(zero.map((e) => ({ ...e })), 8);
  const exifAt = 8 + first.length;
  zero[zero.length - 1] = long(0x8769, exifAt);
  const ifd0 = ifd(zero, 8);
  const sub = ifd(exif, exifAt);

  const out = new Uint8Array(8 + ifd0.length + sub.length);
  const dv = new DataView(out.buffer);
  out.set([0x4d, 0x4d], 0);
  dv.setUint16(2, 42);
  dv.setUint32(4, 8);
  out.set(ifd0, 8);
  out.set(sub, exifAt);
  return out;
}

/**
 * Exif-Block an den Anfang eines JPEG setzen. Ein JFIF-Kopf der Zeichenfläche fällt weg (Exif gehört direkt hinter SOI),
 * ein vorhandener Exif-Block wird ersetzt.
 */
export async function withExif(jpeg: Blob, f: ExifFields): Promise<Blob> {
  const buf = new Uint8Array(await jpeg.arrayBuffer());
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return jpeg;
  let at = 2;
  // APP0 (JFIF) und APP1 (Exif) am Anfang überspringen
  while (at + 4 <= buf.length && buf[at] === 0xff && (buf[at + 1] === 0xe0 || buf[at + 1] === 0xe1)) at += 2 + ((buf[at + 2] << 8) | buf[at + 3]);
  const tiff = exifBlock(f);
  const len = 2 + 6 + tiff.length;
  const seg = new Uint8Array(2 + len);
  seg.set([0xff, 0xe1, len >> 8, len & 0xff, 0x45, 0x78, 0x69, 0x66, 0, 0]);
  seg.set(tiff, 10);
  return new Blob([buf.subarray(0, 2), seg, buf.subarray(at)], { type: "image/jpeg" });
}
