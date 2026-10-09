// Zuschnitt: Drehen in Vierteln, Spiegeln, Geraderichten und ein Rahmen. Alles relativ zum Bild, damit dieselben
// Werte für Vorschau, die 2560 px im Buch und die 4096 px im Fotostudio gelten. Reine Rechnung ohne DOM (läuft im Worker).
//
// Reihenfolge: Viertel drehen (im Uhrzeigersinn) → waagerecht spiegeln → um angle Grad drehen (Mitte) → Rahmen.
// Der Rahmen liegt in der „Fläche“: dem Bild nach Vierteln und Spiegeln, vor dem Geraderichten (Breite W', Höhe H').

export type Ratio = "orig" | "free" | "1:1" | "4:5" | "3:2" | "16:9";

export type Geo = {
  /** 90°-Schritte im Uhrzeigersinn */
  quarter: 0 | 1 | 2 | 3;
  /** waagerecht gespiegelt */
  flip: boolean;
  /** Geraderichten in Grad, −45..45 */
  angle: number;
  /** x, y, w, h in 0..1 der Fläche */
  crop: [number, number, number, number];
  ratio: Ratio;
  /** bei festen Formaten: hochkant */
  portrait: boolean;
};

export const RATIOS: [Ratio, string][] = [
  ["orig", "Original"],
  ["free", "Frei"],
  ["1:1", "1:1"],
  ["4:5", "4:5"],
  ["3:2", "3:2"],
  ["16:9", "16:9"],
];

export const GEO0 = (): Geo => ({ quarter: 0, flip: false, angle: 0, crop: [0, 0, 1, 1], ratio: "orig", portrait: false });

export const geoIsNeutral = (g: Geo | undefined | null) =>
  !g || (!g.quarter && !g.flip && Math.abs(g.angle) < 0.05 && g.crop[0] < 1e-4 && g.crop[1] < 1e-4 && g.crop[2] > 1 - 1e-4 && g.crop[3] > 1 - 1e-4);

const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);

/** Nur bekannte Felder in ihren Bereichen; ein Rahmen außerhalb des Bilds wird in die Fläche gezogen */
export function cleanGeo(v: unknown): Geo | undefined {
  if (!v || typeof v !== "object") return undefined;
  const x = v as Record<string, unknown>;
  const c = Array.isArray(x.crop) && x.crop.length === 4 ? x.crop : [0, 0, 1, 1];
  const w = num(c[2], 0.02, 1, 1);
  const h = num(c[3], 0.02, 1, 1);
  const g: Geo = {
    quarter: ([0, 1, 2, 3] as const).includes(x.quarter as 0) ? (x.quarter as Geo["quarter"]) : 0,
    flip: x.flip === true,
    angle: num(x.angle, -45, 45, 0),
    crop: [num(c[0], 0, 1 - w, 0), num(c[1], 0, 1 - h, 0), w, h],
    ratio: RATIOS.some(([r]) => r === x.ratio) ? (x.ratio as Ratio) : "free",
    portrait: x.portrait === true,
  };
  return geoIsNeutral(g) ? undefined : g;
}

/** Fläche nach dem Drehen in Vierteln */
export const turned = (w: number, h: number, q: number): [number, number] => (q % 2 ? [h, w] : [w, h]);

/** Seitenverhältnis (Breite durch Höhe) eines Formats in der Fläche; null bei frei */
export function ratioOf(r: Ratio, portrait: boolean, W: number, H: number): number | null {
  if (r === "free") return null;
  if (r === "orig") return W / H;
  const [a, b] = r.split(":").map(Number);
  const k = a / b;
  return portrait ? Math.min(k, 1 / k) : Math.max(k, 1 / k);
}

/** „4:5“ hochkant, „5:4“ quer */
export function ratioLabel(r: Ratio, portrait: boolean): string {
  if (r === "free" || r === "orig") return RATIOS.find(([x]) => x === r)![1];
  const [a, b] = r.split(":").map(Number);
  const [lo, hi] = [Math.min(a, b), Math.max(a, b)];
  return portrait ? `${lo}:${hi}` : `${hi}:${lo}`;
}

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Passt ein Rechteck (Mitte cx, cy relativ zur Flächenmitte, halbe Seiten a, b; Pixel) ins gedrehte Bild? */
function fits(cx: number, cy: number, a: number, b: number, W: number, H: number, angle: number) {
  const c = Math.cos(rad(angle));
  const s = Math.sin(rad(angle));
  for (const [dx, dy] of [
    [-a, -b],
    [a, -b],
    [a, b],
    [-a, b],
  ]) {
    const px = cx + dx;
    const py = cy + dy;
    // zurück ins ungedrehte Bild
    const ux = px * c + py * s;
    const uy = -px * s + py * c;
    if (Math.abs(ux) > W / 2 + 1e-6 || Math.abs(uy) > H / 2 + 1e-6) return false;
  }
  return true;
}

/** Liegt der Rahmen ganz im gedrehten Bild? */
export function cropFits(crop: Geo["crop"], angle: number, W: number, H: number) {
  const a = (crop[2] * W) / 2;
  const b = (crop[3] * H) / 2;
  return crop[2] > 0 && crop[3] > 0 && fits((crop[0] + crop[2] / 2) * W - W / 2, (crop[1] + crop[3] / 2) * H - H / 2, a, b, W, H, angle);
}

/** Von einem passenden Rahmen so weit Richtung next wie möglich (die passenden Rahmen bilden eine konvexe Menge) */
export function toward(from: Geo["crop"], next: Geo["crop"], angle: number, W: number, H: number): Geo["crop"] {
  const at = (t: number) => from.map((v, i) => v + (next[i] - v) * t) as Geo["crop"];
  if (cropFits(next, angle, W, H)) return next;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 20; i++) {
    const m = (lo + hi) / 2;
    if (cropFits(at(m), angle, W, H)) lo = m;
    else hi = m;
  }
  return at(lo);
}

/**
 * Rahmen so verkleinern und verschieben, dass er ganz im gedrehten Bild liegt: keine leeren Ecken.
 * W, H ist die Fläche in Pixeln (oder jedem anderen Maß mit dem richtigen Seitenverhältnis).
 */
export function fitCrop(crop: Geo["crop"], angle: number, W: number, H: number): Geo["crop"] {
  let a = (crop[2] * W) / 2;
  let b = (crop[3] * H) / 2;
  const c = Math.abs(Math.cos(rad(angle)));
  const s = Math.abs(Math.sin(rad(angle)));
  // größter Maßstab, mit dem das Rechteck in der Mitte noch passt
  const t = Math.min(1, W / 2 / (a * c + b * s), H / 2 / (a * s + b * c));
  a *= t;
  b *= t;
  const cx = (crop[0] + crop[2] / 2) * W - W / 2;
  const cy = (crop[1] + crop[3] / 2) * H - H / 2;
  // Mitte zur Flächenmitte ziehen, bis es passt; die Menge der passenden Mitten ist konvex
  let k = 1;
  if (!fits(cx, cy, a, b, W, H, angle)) {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i++) {
      const m = (lo + hi) / 2;
      if (fits(cx * m, cy * m, a, b, W, H, angle)) lo = m;
      else hi = m;
    }
    k = lo;
  }
  const w = (2 * a) / W;
  const h = (2 * b) / H;
  return [(cx * k + W / 2 - a) / W, (cy * k + H / 2 - b) / H, w, h];
}

/** Größter Rahmen mit Seitenverhältnis k (null: ganze Fläche) um die Mitte des bisherigen Rahmens */
export function cropFor(k: number | null, around: Geo["crop"], angle: number, W: number, H: number): Geo["crop"] {
  if (k === null) return fitCrop([0, 0, 1, 1], angle, W, H);
  // in Pixeln so groß wie möglich, dann in die Fläche einpassen
  const pw = W / H > k ? H * k : W;
  const ph = pw / k;
  const cx = around[0] + around[2] / 2;
  const cy = around[1] + around[3] / 2;
  const w = pw / W;
  const h = ph / H;
  return fitCrop([cx - w / 2, cy - h / 2, w, h], angle, W, H);
}

/** Größe des Ergebnisses in Pixeln bei einem Bild von w × h */
export function outSize(g: Geo | undefined, w: number, h: number): [number, number] {
  if (!g) return [w, h];
  const [W, H] = turned(w, h, g.quarter);
  return [Math.max(1, Math.round(g.crop[2] * W)), Math.max(1, Math.round(g.crop[3] * H))];
}

type Ctx2D = { translate(x: number, y: number): void; rotate(a: number): void; scale(x: number, y: number): void };

/**
 * Zeichenfläche so einstellen, dass drawImage(bild, -w/2, -h/2, w, h) das Ergebnis zeichnet.
 * k: Maßstab vom Bild (w × h) zur Zeichenfläche.
 */
export function placeOn(ctx: Ctx2D, g: Geo, w: number, h: number, k: number) {
  const [W, H] = turned(w, h, g.quarter);
  ctx.scale(k, k);
  ctx.translate(-g.crop[0] * W, -g.crop[1] * H);
  ctx.translate(W / 2, H / 2);
  ctx.rotate(rad(g.angle));
  if (g.flip) ctx.scale(-1, 1);
  ctx.rotate((g.quarter * Math.PI) / 2);
}

/**
 * Stelle im unbearbeiteten Bild (0..1) → Stelle im Ergebnis (0..1), oder null, wenn sie weggeschnitten ist.
 * Für den Motivpunkt im Buch.
 */
export function mapPoint(g: Geo, w: number, h: number, [u, v]: [number, number]): [number, number] | null {
  // Bildmitte als Ursprung, Pixel
  let x = (u - 0.5) * w;
  let y = (v - 0.5) * h;
  for (let i = 0; i < g.quarter; i++) [x, y] = [-y, x];
  if (g.flip) x = -x;
  const c = Math.cos(rad(g.angle));
  const s = Math.sin(rad(g.angle));
  [x, y] = [x * c - y * s, x * s + y * c];
  const [W, H] = turned(w, h, g.quarter);
  const ox = (x + W / 2 - g.crop[0] * W) / (g.crop[2] * W);
  const oy = (y + H / 2 - g.crop[1] * H) / (g.crop[3] * H);
  return ox < 0 || ox > 1 || oy < 0 || oy > 1 ? null : [ox, oy];
}

/** „Zugeschnitten 4:5, gerade −2,5°, gedreht“: für den Zettel */
export function describeGeo(g: Geo): string {
  const parts: string[] = [];
  const cropped = g.crop[2] < 0.999 || g.crop[3] < 0.999;
  if (cropped) parts.push(g.ratio === "free" || g.ratio === "orig" ? "zugeschnitten" : `zugeschnitten ${ratioLabel(g.ratio, g.portrait)}`);
  if (Math.abs(g.angle) >= 0.05) parts.push(`gerade ${g.angle > 0 ? "+" : "−"}${Math.abs(g.angle).toFixed(1).replace(".", ",")}°`);
  if (g.quarter) parts.push(`${g.quarter * 90}° gedreht`);
  if (g.flip) parts.push("gespiegelt");
  const s = parts.join(", ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
