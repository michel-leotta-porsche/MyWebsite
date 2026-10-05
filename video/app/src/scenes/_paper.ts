// Werkzeugkasten für den Bastelpapier-Look: ausgeschnittene Formen mit leicht schiefen Kanten,
// kleiner Schlagschatten pro Teil, Stop-Motion mit 12 fps. Alles reine Funktionen der Zeit.
import { frameIdx, hash, mulberry32 } from '../engine/util';
import { F, font } from '../engine/type';

export type P = [number, number];

/** Stop-Motion-Schritt: wechselt 12-mal pro Sekunde, über die Belichtung eines Frames konstant. */
export const stepOf = (t: number) => Math.floor(frameIdx(t) / 5);
/** Zeit auf 12-fps-Raster (für Bewegungen, die ruckeln sollen wie gelegte Papierfiguren). */
export const stepT = (t: number) => stepOf(t) / 12;

/** Kleiner Versatz pro Teil und Schritt: Hände, die Papier verschieben. */
export function nudge(seed: number, s: number, amp = 0.7): P {
  return [(hash(seed, s, 1) - 0.5) * 2 * amp, (hash(seed, s, 2) - 0.5) * 2 * amp];
}

/** Punkte auf einer Ellipse mit leicht unregelmäßigem Schnitt (fest pro Teil, nicht zitternd). */
export function oval(cx: number, cy: number, rx: number, ry: number, seed = 0, n = 36, rough = 0, a0 = 0, a1 = Math.PI * 2): P[] {
  const out: P[] = [];
  const full = Math.abs(a1 - a0 - Math.PI * 2) < 1e-6;
  const m = full ? n : n + 1;
  for (let i = 0; i < m; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const k = 1 + (hash(seed, i, 9) - 0.5) * 2 * rough;
    out.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return out;
}

/** Rechteck mit Ecken, leicht schief geschnitten. */
export function rect(x: number, y: number, w: number, h: number, seed = 0, rough = 0): P[] {
  const j = (i: number, k: number) => (hash(seed, i, k) - 0.5) * 2 * rough;
  return [[x + j(0, 1), y + j(0, 2)], [x + w + j(1, 1), y + j(1, 2)], [x + w + j(2, 1), y + h + j(2, 2)], [x + j(3, 1), y + h + j(3, 2)]];
}

/** Abgerundetes Rechteck als Punktliste. */
export function rrect(x: number, y: number, w: number, h: number, r: number, seed = 0): P[] {
  const out: P[] = [];
  const corner = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= 5; i++) {
      const a = a0 + (i / 5) * (Math.PI / 2);
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  corner(x + w - r, y + r, -Math.PI / 2);
  corner(x + w - r, y + h - r, 0);
  corner(x + r, y + h - r, Math.PI / 2);
  corner(x + r, y + r, Math.PI);
  return out;
}

/** Farbe aufhellen (k > 0) oder abdunkeln (k < 0); nur #rrggbb, sonst unverändert. */
export function shade(col: string, k: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(col)) return col;
  const n = parseInt(col.slice(1), 16);
  const ch = (v: number) => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k);
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Stoff-/Filzstruktur für Kleidung, Mützen, Haare (wie die Bastel-Optik der Serie). */
let TEX: CanvasPattern | null = null;
let TEX_ON = false;
const NO_TEX = new Set(['#fbfaf5', '#5b1d22', '#e07583', '#1d1a1e']);
export function setTexture(p: CanvasPattern | null) { TEX = p; }
export function texture(on: boolean) { TEX_ON = on; }

export interface CutOpts {
  /** Schlagschatten (Papier liegt auf Papier). */
  shadow?: boolean;
  /** Dunklere Schnittkante. */
  edge?: string | null;
  edgeW?: number;
  alpha?: number;
}

/** Ein ausgeschnittenes Teil: Füllung, Schatten, Kante. */
export function cut(c: CanvasRenderingContext2D, pts: P[], fill: string, o: CutOpts = {}) {
  if (pts.length < 3) return;
  c.beginPath();
  c.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i]![0], pts[i]![1]);
  c.closePath();
  c.save();
  if (o.alpha !== undefined) c.globalAlpha *= o.alpha;
  if (o.shadow === true) {
    c.shadowColor = 'rgba(30,20,10,0.28)';
    c.shadowOffsetX = 2.5;
    c.shadowOffsetY = 3.5;
    c.shadowBlur = 0;
  }
  c.fillStyle = fill;
  c.fill();
  c.restore();
  if (TEX_ON && TEX && fill.startsWith('#') && !NO_TEX.has(fill.toLowerCase())) {
    c.save();
    c.clip();
    c.globalCompositeOperation = 'multiply';
    c.globalAlpha *= 0.32;
    c.fillStyle = TEX;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [px, py] of pts) { x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py); }
    c.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
    c.restore();
  }
  if (o.edge !== null) {
    // Kante: dunklere Variante der eigenen Farbe statt schwarzer Kontur
    const e = o.edge ?? shade(fill, -0.3);
    if (e === fill) return;
    c.save();
    if (o.alpha !== undefined) c.globalAlpha *= o.alpha;
    c.lineWidth = o.edgeW ?? 1.6;
    c.strokeStyle = e;
    c.lineJoin = 'round';
    c.stroke();
    c.restore();
  }
}

/** Linie aus Papierstreifen (z. B. Arme, Stuhlbeine). */
export function strip(c: CanvasRenderingContext2D, pts: P[], w: number, col: string, shadow = false) {
  c.save();
  c.beginPath();
  c.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i]![0], pts[i]![1]);
  if (shadow) { c.shadowColor = 'rgba(30,20,10,0.25)'; c.shadowOffsetX = 2; c.shadowOffsetY = 3; }
  // Kontur: etwas breiterer schwarzer Strich darunter
  if (w > 5) {
    c.lineWidth = w + 2.6; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = shade(col, -0.3); c.stroke();
  }
  c.lineWidth = w;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = col;
  c.stroke();
  c.restore();
}

/** Text, mit Schibsted oder Plex Mono. */
export function label(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, col: string, o: { mono?: boolean; weight?: number; align?: CanvasTextAlign; ls?: number; rot?: number } = {}) {
  c.save();
  c.translate(x, y);
  if (o.rot) c.rotate(o.rot);
  c.font = font(o.mono ? F.mono(o.weight ?? 600) : F.grotesk(o.weight ?? 800), size);
  c.textAlign = o.align ?? 'center';
  c.textBaseline = 'alphabetic';
  c.letterSpacing = `${o.ls ?? 0}px`;
  c.fillStyle = col;
  c.fillText(s, 0, 0);
  c.restore();
}

/** Filz: feines Korn plus kurze Fasern, hell (für „multiply“). */
export function makeFelt(size = 256): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d')!;
  const r = mulberry32(7);
  const img = c.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 205 + r() * 50;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  c.globalAlpha = 0.35;
  for (let i = 0; i < 900; i++) {
    const x = r() * size, y = r() * size, a = r() * Math.PI * 2, l = 2 + r() * 6;
    c.strokeStyle = r() > 0.5 ? '#9a9a9a' : '#ffffff';
    c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
  }
  return cv;
}

/** Papierkorn als Kachel: einmal erzeugt, als Overlay im Bildraum. */
export function makeGrain(size = 512): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#808080';
  c.fillRect(0, 0, size, size);
  const r = mulberry32(42);
  const img = c.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (r() - 0.5) * 34;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
  }
  c.putImageData(img, 0, 0);
  // Fasern
  c.globalAlpha = 0.18;
  for (let i = 0; i < 260; i++) {
    const x = r() * size, y = r() * size, a = r() * Math.PI, l = 6 + r() * 22;
    c.strokeStyle = r() > 0.5 ? '#5a5a5a' : '#b0b0b0';
    c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
  }
  return cv;
}

export { hash };
