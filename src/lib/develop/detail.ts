// Werkzeuge, die die Nachbarschaft eines Pixels brauchen: Klarheit, Schärfen und das Schätzen des Horizonts.
// Klarheit rechnen Vorschau (GLSL) und Einrechnen gleich, mit derselben weichgezeichneten Kopie in kleiner Größe.

/** Lange Seite der weichgezeichneten Kopie, bezogen auf das ganze Foto; so ist der Radius überall gleich groß */
export const CLARITY_LONG = 160;
const BLUR_R = 3;

/** Helligkeit 0..255 als ein Kanal, kleine Größe, zweimal weichgezeichnet (fast eine Glocke) */
export type BlurMap = { data: Uint8Array; w: number; h: number };

const luma8 = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function boxPass(src: Float32Array, dst: Float32Array, w: number, h: number, r: number, horizontal: boolean) {
  const len = horizontal ? w : h;
  const lines = horizontal ? h : w;
  const at = (line: number, i: number) => (horizontal ? line * w + i : i * w + line);
  for (let line = 0; line < lines; line++) {
    let sum = 0;
    for (let i = -r; i <= r; i++) sum += src[at(line, Math.min(len - 1, Math.max(0, i)))];
    for (let i = 0; i < len; i++) {
      dst[at(line, i)] = sum / (2 * r + 1);
      sum += src[at(line, Math.min(len - 1, i + r + 1))] - src[at(line, Math.max(0, i - r))];
    }
  }
}

/** aus einem kleinen Abzug (RGBA) die weichgezeichnete Helligkeit */
export function blurMap(px: Uint8ClampedArray, w: number, h: number): BlurMap {
  const a = new Float32Array(w * h);
  const b = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) a[i] = luma8(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
  for (let k = 0; k < 2; k++) {
    boxPass(a, b, w, h, BLUR_R, true);
    boxPass(b, a, w, h, BLUR_R, false);
  }
  const data = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) data[i] = Math.round(a[i]);
  return { data, w, h };
}

/** Größe der kleinen Kopie für ein Bild von w × h, das vom ganzen Foto (lange Seite full) stammt */
export function blurSize(w: number, h: number, full = Math.max(w, h)): [number, number] {
  const k = CLARITY_LONG / full;
  return [Math.max(2, Math.round(w * k)), Math.max(2, Math.round(h * k))];
}

/** bilinear lesen wie die Textur der GPU (Mitte der Zelle = Wert) */
function sample(m: BlurMap, u: number, v: number): number {
  const x = Math.min(m.w - 1, Math.max(0, u * m.w - 0.5));
  const y = Math.min(m.h - 1, Math.max(0, v * m.h - 0.5));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(m.w - 1, x0 + 1);
  const y1 = Math.min(m.h - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  const d = m.data;
  const top = d[y0 * m.w + x0] * (1 - fx) + d[y0 * m.w + x1] * fx;
  const bot = d[y1 * m.w + x0] * (1 - fx) + d[y1 * m.w + x1] * fx;
  return top * (1 - fy) + bot * fy;
}

/** Klarheit: Unterschied zur Umgebung verstärken, in den Mitten am meisten (gleich im Shader) */
export const clarityGain = (k: number, l: number) => k * 1.2 * (1 - (2 * l - 1) ** 2);

/** Klarheit auf einen Streifen (Breite w, Gesamthöhe h, ab Zeile y0); vor dem LUT */
export function applyClarity(px: Uint8ClampedArray, w: number, h: number, k: number, m: BlurMap, y0 = 0) {
  if (!k) return;
  const rows = px.length / 4 / w;
  for (let y = 0; y < rows; y++) {
    const v = (y + y0 + 0.5) / h;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const l = luma8(px[i], px[i + 1], px[i + 2]);
      const d = (l - sample(m, (x + 0.5) / w, v)) * clarityGain(k, l / 255);
      px[i] += d;
      px[i + 1] += d;
      px[i + 2] += d;
    }
  }
}

/** Stärke von „Für die Datei schärfen“: Aus, Leicht, Stark */
export const SHARPEN = [0, 0.4, 0.8] as const;
export type SharpenLevel = 0 | 1 | 2;

/**
 * Unscharf maskieren mit Radius 1 auf der Helligkeit (Farbsäume bleiben aus). Bekommt Zeilen mit je einer Zeile
 * Rand oben und unten (above/below, am Bildrand null) und schreibt nur die inneren Zeilen.
 */
export function sharpenRows(px: Uint8ClampedArray, w: number, level: SharpenLevel, above: Uint8ClampedArray | null, below: Uint8ClampedArray | null) {
  const a = SHARPEN[level];
  if (!a) return;
  const rows = px.length / 4 / w;
  const L = new Float32Array(w * (rows + 2));
  const put = (row: Uint8ClampedArray, r: number, y: number) => {
    for (let x = 0; x < w; x++) L[r * w + x] = luma8(row[(y * w + x) * 4], row[(y * w + x) * 4 + 1], row[(y * w + x) * 4 + 2]);
  };
  for (let y = 0; y < rows; y++) put(px, y + 1, y);
  if (above) put(above, 0, 0);
  else L.copyWithin(0, w, 2 * w);
  if (below) put(below, rows + 1, 0);
  else L.copyWithin((rows + 1) * w, rows * w, (rows + 1) * w);
  for (let y = 0; y < rows; y++) {
    const r = y + 1;
    for (let x = 0; x < w; x++) {
      const xl = x ? x - 1 : x;
      const xr = x < w - 1 ? x + 1 : x;
      const c = L[r * w + x];
      // Mittel der acht Nachbarn mit Gewichten wie eine kleine Glocke
      const blur =
        (4 * c + 2 * (L[r * w + xl] + L[r * w + xr] + L[(r - 1) * w + x] + L[(r + 1) * w + x]) + L[(r - 1) * w + xl] + L[(r - 1) * w + xr] + L[(r + 1) * w + xl] + L[(r + 1) * w + xr]) / 16;
      let d = c - blur;
      // feines Rauschen nicht verstärken
      if (Math.abs(d) < 1.5) continue;
      d *= a * 1.6;
      const i = (y * w + x) * 4;
      px[i] += d;
      px[i + 1] += d;
      px[i + 2] += d;
    }
  }
}

/* ---------- Horizont schätzen: fürs „Auto“ beim Geraderichten ---------- */

const RANGE = 20;
const MAX_FIX = 10;
const STEP = 0.1;

/**
 * Neigung der vorherrschenden waagerechten (und, schwächer gewichtet, senkrechten) Kanten im Bild, in Grad.
 * Positiv heißt: die Kante fällt nach rechts ab (im Uhrzeigersinn gedreht, y nach unten). null, wenn nichts
 * Klares zu sehen ist. Verfahren: Kantenpunkte nach Richtung trennen und für jeden Winkel prüfen, wie stark sie
 * sich auf wenige Linien häufen (Projektion, Summe der Quadrate).
 */
export function estimateTilt(px: Uint8ClampedArray, w: number, h: number): number | null {
  const L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) L[i] = luma8(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
  type Pt = [number, number, number];
  const horiz: Pt[] = [];
  const vert: Pt[] = [];
  const mags: number[] = [];
  const grads: [number, number, number, number, number][] = [];
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const p = (dx: number, dy: number) => L[(y + dy) * w + x + dx];
      const gx = p(1, -1) + 2 * p(1, 0) + p(1, 1) - p(-1, -1) - 2 * p(-1, 0) - p(-1, 1);
      const gy = p(-1, 1) + 2 * p(0, 1) + p(1, 1) - p(-1, -1) - 2 * p(0, -1) - p(1, -1);
      const m = Math.hypot(gx, gy);
      if (m < 40) continue;
      grads.push([x, y, gx, gy, m]);
      mags.push(m);
    }
  if (grads.length < 60) return null;
  // nur die kräftigsten Kanten zählen
  mags.sort((a, b) => a - b);
  const cut = mags[Math.floor(mags.length * 0.6)];
  const tan = Math.tan((RANGE * Math.PI) / 180) * 1.3;
  for (const [x, y, gx, gy, m] of grads) {
    if (m < cut) continue;
    // waagerechte Kante: Gradient zeigt nach oben oder unten
    if (Math.abs(gx) < Math.abs(gy) * tan) horiz.push([x, y, m]);
    else if (Math.abs(gy) < Math.abs(gx) * tan) vert.push([x, y, m]);
  }
  const n = Math.round((2 * RANGE) / STEP) + 1;
  const score = new Float64Array(n);
  const bins = new Float64Array(Math.ceil(Math.hypot(w, h)) * 2 + 4);
  const off = bins.length / 2;
  const profile = (pts: Pt[], deg: number, vertical: boolean, weight: number) => {
    if (pts.length < 20) return 0;
    bins.fill(0);
    const t = (deg * Math.PI) / 180;
    const c = Math.cos(t);
    const s = Math.sin(t);
    let total = 0;
    for (const [x, y, m] of pts) {
      // Abstand zur Linie durch den Ursprung mit Neigung deg
      const r = vertical ? x * c + y * s : y * c - x * s;
      bins[Math.round(r) + off] += m;
      total += m;
    }
    let sq = 0;
    for (let i = 0; i < bins.length; i++) sq += bins[i] * bins[i];
    return (weight * sq) / (total * total);
  };
  for (let i = 0; i < n; i++) {
    const deg = -RANGE + i * STEP;
    score[i] = profile(horiz, deg, false, 1) + profile(vert, deg, true, 0.5);
  }
  let best = 0;
  for (let i = 1; i < n; i++) if (score[i] > score[best]) best = i;
  const sorted = Array.from(score).sort((a, b) => a - b);
  const median = sorted[Math.floor(n / 2)];
  // keine deutliche Spitze: lieber nichts tun als falsch drehen
  if (!median || score[best] < median * 1.3) return null;
  // Spitze zwischen den Stufen verfeinern
  let deg = -RANGE + best * STEP;
  if (best > 0 && best < n - 1) {
    const [a, b, c] = [score[best - 1], score[best], score[best + 1]];
    const den = a - 2 * b + c;
    if (den < 0) deg += (STEP * 0.5 * (a - c)) / den;
  }
  // gesucht wird bis 20°, gedreht nur bis 10°: steilere Kanten sind fast immer Absicht (Dach, Treppe, Diagonale)
  if (Math.abs(deg) > MAX_FIX) return null;
  return Math.round(deg * 10) / 10;
}
