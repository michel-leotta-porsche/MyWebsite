// Bildbearbeitung als eine Farbabbildung: alle Werkzeuge (Auto, Angleichen, Stimmung, Looks, Feinschliff, Rezept)
// sind Funktionen Farbe → Farbe. Sie werden zu einem 3D-LUT zusammengerechnet, den Vorschau (WebGL) und
// Einrechnen (Worker) gleich anwenden. Nur die Körnung ist ein Muster obendrauf.
// Reine Rechnung ohne DOM, damit sie auch im Worker läuft. Der Zuschnitt (geo) ist keine Farbe; er liegt in geo.ts.

import { cleanGeo, describeGeo, geoIsNeutral, type Geo } from "@/lib/develop/geo";

export type Transfer = {
  /** Lab-Mittel und -Streuung des Fotos selbst */
  mu: [number, number, number];
  sd: [number, number, number];
  /** Ziel: Mittel und Streuung, zu denen das Foto rückt */
  muT: [number, number, number];
  sdT: [number, number, number];
  /** Stärke 0..1 */
  k: number;
};

export type LookId = "sommer" | "kreide" | "daemmerung" | "salz" | "kohle" | "messing";

/** Kamerafelder eines Rezepts, nachempfunden (die Kamera rechnet auf Rohdaten, wir auf dem JPEG) */
export type RecipeValues = {
  film: LookId | null;
  wbR: number;
  wbB: number;
  hl: number;
  sh: number;
  color: number;
  dr: 100 | 200 | 400;
  cc: 0 | 1 | 2;
  fxb: 0 | 1 | 2;
  grain: 0 | 1 | 2;
  gsize: "klein" | "groß";
};

export type PhotoEdit = {
  /** Feinschliff */
  exposure: number;
  contrast: number;
  shadows: number;
  warmth: number;
  sat: number;
  /** Look mit Stärke 0..1 */
  look: LookId | null;
  amount: number;
  /** Auto: Schwarz- und Weißpunkt */
  levels: [number, number] | null;
  /** Auto, Angleichen oder Stimmung: Farbübertragung in Lab */
  transfer: Transfer | null;
  origin: "auto" | "match" | "mood" | "pick" | null;
  /** bei „Stimmung“: Titel oder Nummer des Vorbilds, nur für den Zettel */
  moodFrom?: string;
  /** bei einem fertigen Vorschlag: welcher */
  pick?: PickId;
  rec: RecipeValues;
  /** Name des gewählten Rezepts (auch wenn danach Werte geändert wurden) */
  recName?: string;
  /** Zuschnitt, Drehen, Spiegeln, Geraderichten */
  geo?: Geo;
  /** „Mehr Werkzeuge“: feinere Regler hinter dem Menü; fehlt, solange keiner benutzt wurde */
  more?: More;
};

/** acht Farbtöne für „Farben einzeln“: Name, Mitte in Grad, Probe, wofür er gut ist */
export const HUES: [string, number, string, string][] = [
  ["Rot", 0, "#c8423a", "Lippen, Mohn, Rücklichter"],
  ["Orange", 30, "#d9822f", "Haut, Sand, Abendlicht"],
  ["Gelb", 58, "#d8b836", "Laub im Herbst, Raps, Kerzenlicht"],
  ["Grün", 115, "#5f9a45", "Wiesen, Blätter"],
  ["Türkis", 175, "#3f9c98", "Lagunen, Glas"],
  ["Blau", 220, "#3f6fb5", "Himmel, Meer, Schatten"],
  ["Lila", 270, "#7a55b0", "Lavendel, Dämmerung"],
  ["Magenta", 320, "#b84a8c", "Blüten, Neon"],
];

export type More = {
  /** Licht genauer, je −1..1 */
  highlights: number;
  whites: number;
  blacks: number;
  /** Farbe genauer: Tönung (− grün, + magenta) und Dynamik */
  tint: number;
  vibrance: number;
  /** Farben einzeln: je Farbton [Farbton, Sättigung, Helligkeit], je −1..1 */
  hsl: [number, number, number][];
  /** Vignette: − dunkle Ränder, + helle Ränder */
  vignette: number;
  /** Klarheit −1..1: Kontrast in der Umgebung, braucht eine weichgezeichnete Kopie, also nicht im LUT */
  clarity: number;
  /** Gradationskurve: Punkte [Eingang, Ausgang] in 0..1 samt beiden Enden; leer = gerade */
  curve: [number, number][];
};

export const MORE0 = (): More => ({ highlights: 0, whites: 0, blacks: 0, tint: 0, vibrance: 0, hsl: HUES.map(() => [0, 0, 0]), vignette: 0, clarity: 0, curve: [] });
/** Kurve ohne Wirkung: keine Punkte oder alle auf der Diagonalen */
export const curveIsNeutral = (c: [number, number][] | undefined) => !c || c.every(([x, y]) => Math.abs(x - y) < 0.002);
export const moreIsNeutral = (m: More | undefined | null) =>
  !m ||
  (!m.highlights && !m.whites && !m.blacks && !m.tint && !m.vibrance && !m.vignette && !m.clarity && curveIsNeutral(m.curve) && m.hsl.every((t) => !t[0] && !t[1] && !t[2]));

export const REC0 = (): RecipeValues => ({ film: null, wbR: 0, wbB: 0, hl: 0, sh: 0, color: 0, dr: 100, cc: 0, fxb: 0, grain: 0, gsize: "klein" });

export const neutralEdit = (): PhotoEdit => ({
  exposure: 0,
  contrast: 0,
  shadows: 0,
  warmth: 0,
  sat: 0,
  look: null,
  amount: 0.8,
  levels: null,
  transfer: null,
  origin: null,
  rec: REC0(),
});

const REC_KEYS = Object.keys(REC0()) as (keyof RecipeValues)[];
export const sameRecipe = (a: RecipeValues, b: RecipeValues) => REC_KEYS.every((k) => a[k] === b[k]);
export const recipeIsEmpty = (r: RecipeValues) => sameRecipe(r, REC0());

/** Ändert die Bearbeitung etwas am Bild? */
export function isNeutral(e: PhotoEdit | undefined | null): boolean {
  if (!e || typeof e !== "object" || !e.rec || typeof e.rec !== "object") return true;
  return colorIsNeutral(e) && geoIsNeutral(e.geo);
}

/** Ändert die Bearbeitung die Farben? (ohne Zuschnitt) */
export function colorIsNeutral(e: PhotoEdit): boolean {
  return !e.exposure && !e.contrast && !e.shadows && !e.warmth && !e.sat && !e.look && !e.levels && !e.transfer && recipeIsEmpty(e.rec) && moreIsNeutral(e.more);
}

/** Schlüssel für alles, was den LUT bestimmt: Zuschnitt, Vignette und Klarheit gehören nicht dazu */
export const colorKey = (e: PhotoEdit) => JSON.stringify({ ...e, geo: undefined, more: e.more && { ...e.more, vignette: 0, clarity: 0 } });

/* ---------- Prüfen: Bearbeitungen aus fremden Büchern ---------- */

const num = (v: unknown, lo: number, hi: number, d = 0) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const oneOf = <T,>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);
const nums = (v: unknown, n: number, lo: number, hi: number) =>
  Array.isArray(v) && v.length === n && v.every((x) => typeof x === "number" && Number.isFinite(x)) ? v.map((x) => num(x, lo, hi)) : null;
const LOOK_IDS = ["sommer", "kreide", "daemmerung", "salz", "kohle", "messing"] as const;

/**
 * Nur bekannte Felder in ihren Bereichen. Ein geteiltes Buch oder eine geöffnete Datei kann alles enthalten;
 * so stürzt keine Ansicht ab und kein Zettel zeigt Unsinn.
 */
export function cleanEdit(e: unknown): PhotoEdit | undefined {
  if (!e || typeof e !== "object") return undefined;
  const x = e as Record<string, unknown>;
  const r = (x.rec && typeof x.rec === "object" ? x.rec : {}) as Record<string, unknown>;
  const lv = nums(x.levels, 2, 0, 1);
  const t = (x.transfer && typeof x.transfer === "object" ? x.transfer : null) as Record<string, unknown> | null;
  const lab = (v: unknown) => nums(v, 3, -200, 200) as [number, number, number] | null;
  const transfer =
    t && lab(t.mu) && lab(t.sd) && lab(t.muT) && lab(t.sdT)
      ? { mu: lab(t.mu)!, sd: lab(t.sd)!, muT: lab(t.muT)!, sdT: lab(t.sdT)!, k: num(t.k, 0, 1) }
      : null;
  return {
    exposure: num(x.exposure, -1, 1),
    contrast: num(x.contrast, -1, 1),
    shadows: num(x.shadows, 0, 1),
    warmth: num(x.warmth, -1, 1),
    sat: num(x.sat, -1, 1),
    look: oneOf(x.look, [null, ...LOOK_IDS], null),
    amount: num(x.amount, 0, 1, 0.8),
    levels: lv && lv[1] > lv[0] ? (lv as [number, number]) : null,
    transfer,
    origin: oneOf(x.origin, [null, "auto", "match", "mood", "pick"] as const, null),
    pick: oneOf(x.pick, [undefined, ...PICKS.map((p) => p.id)], undefined),
    moodFrom: str(x.moodFrom, 60),
    rec: {
      film: oneOf(r.film, [null, ...LOOK_IDS], null),
      wbR: Math.round(num(r.wbR, -9, 9)),
      wbB: Math.round(num(r.wbB, -9, 9)),
      hl: num(r.hl, -2, 4),
      sh: num(r.sh, -2, 4),
      color: Math.round(num(r.color, -4, 4)),
      dr: oneOf(r.dr, [100, 200, 400] as const, 100),
      cc: oneOf(r.cc, [0, 1, 2] as const, 0),
      fxb: oneOf(r.fxb, [0, 1, 2] as const, 0),
      grain: oneOf(r.grain, [0, 1, 2] as const, 0),
      gsize: oneOf(r.gsize, ["klein", "groß"] as const, "klein"),
    },
    recName: str(x.recName, 40),
    geo: cleanGeo(x.geo),
    more: cleanMore(x.more),
  };
}

function cleanMore(v: unknown): More | undefined {
  if (!v || typeof v !== "object") return undefined;
  const x = v as Record<string, unknown>;
  const h = Array.isArray(x.hsl) ? x.hsl : [];
  const m: More = {
    highlights: num(x.highlights, -1, 1),
    whites: num(x.whites, -1, 1),
    blacks: num(x.blacks, -1, 1),
    tint: num(x.tint, -1, 1),
    vibrance: num(x.vibrance, -1, 1),
    hsl: HUES.map((_, i) => (nums(h[i], 3, -1, 1) as [number, number, number] | null) ?? [0, 0, 0]),
    vignette: num(x.vignette, -1, 1),
    clarity: num(x.clarity, -1, 1),
    curve: cleanCurve(x.curve),
  };
  return moreIsNeutral(m) ? undefined : m;
}

/** höchstens acht Punkte, Eingang steigend mit Abstand, beide Enden bei 0 und 1 */
export const CURVE_GAP = 0.04;
function cleanCurve(v: unknown): [number, number][] {
  if (!Array.isArray(v)) return [];
  const pts = v
    .filter((p): p is [number, number] => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === "number" && Number.isFinite(n)))
    .map(([x, y]) => [num(x, 0, 1), num(y, 0, 1)] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const p of pts) if (!out.length || p[0] - out[out.length - 1][0] >= CURVE_GAP) out.push(p);
  if (out.length < 2 || out[0][0] !== 0 || out[out.length - 1][0] !== 1 || out.length > 8) return [];
  return curveIsNeutral(out) ? [] : out;
}

/**
 * Kurve als Funktion: monotone kubische Interpolation (Fritsch–Carlson), damit sie zwischen den Punkten nicht
 * über- oder unterschwingt. Läuft nur beim Bau des LUT.
 */
export function curveFn(pts: [number, number][]): (x: number) => number {
  if (curveIsNeutral(pts)) return (x) => x;
  const n = pts.length;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const d = xs.slice(1).map((x, i) => (ys[i + 1] - ys[i]) / (x - xs[i]));
  const m = xs.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const t = a * a + b * b;
    if (t > 9) {
      const k = 3 / Math.sqrt(t);
      m[i] = k * a * d[i];
      m[i + 1] = k * b * d[i];
    }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return cl((2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1]);
  };
}

/* ---------- Farbe ---------- */

const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(c, 0) ** (1 / 2.4) - 0.055);
const cl = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const scurve = (c: number, k: number) => mix(c, c * c * (3 - 2 * c), k);
type RGB = [number, number, number];
const satur = (c: RGB, s: number): RGB => {
  const l = luma(...c);
  return [l + (c[0] - l) * s, l + (c[1] - l) * s, l + (c[2] - l) * s];
};

export function toLab(r: number, g: number, b: number): RGB {
  const R = lin(r);
  const G = lin(g);
  const B = lin(b);
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
function fromLab(L: number, a: number, bb: number): RGB {
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - bb / 200;
  const inv = (t: number) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787);
  const x = inv(fx) * 0.95047;
  const y = inv(fy);
  const z = inv(fz) * 1.08883;
  return [gam(x * 3.2406 - y * 1.5372 - z * 0.4986), gam(-x * 0.9689 + y * 1.8758 + z * 0.0415), gam(x * 0.0557 - y * 0.204 + z * 1.057)];
}

/* ---------- Looks: eigene Namen, darunter ihr Charakter ---------- */

export const LOOKS: { id: LookId; name: string; txt: string; f: (c: RGB) => RGB }[] = [
  {
    id: "sommer",
    name: "Sommer",
    txt: "warm, Schwarz leicht offen",
    f: ([r, g, b]) => satur([r * 1.06, g, b * 0.86].map((x) => scurve(0.05 + cl(x) * 0.93, 0.25)) as RGB, 0.92),
  },
  { id: "kreide", name: "Kreide", txt: "matt und blass", f: ([r, g, b]) => satur([r * 1.02, g, b * 0.98], 0.68).map((x) => 0.12 + cl(x) * 0.8) as RGB },
  {
    id: "daemmerung",
    name: "Dämmerung",
    txt: "kühle Tiefen, warme Lichter",
    f: ([r, g, b]) => {
      const l = luma(r, g, b);
      const s = (1 - l) ** 2;
      const h = l * l;
      return [r - 0.05 * s + 0.07 * h, g + 0.01 * s + 0.02 * h, b + 0.06 * s - 0.07 * h].map((x) => scurve(cl(x), 0.3)) as RGB;
    },
  },
  {
    id: "salz",
    name: "Salz",
    txt: "kühl und klar",
    f: ([r, g, b]) => satur([r * 0.95, g, b * 1.07].map((x) => scurve(0.03 + cl(x) * 0.97, 0.18)) as RGB, 0.85),
  },
  {
    id: "kohle",
    name: "Kohle",
    txt: "Schwarzweiß mit Rotfilter",
    f: ([r, g, b]) => {
      const v = 0.02 + scurve(cl(0.5 * r + 0.38 * g + 0.12 * b), 0.45) * 0.96;
      return [v, v, v * 0.985];
    },
  },
  {
    id: "messing",
    name: "Messing",
    txt: "kräftig wie Diafilm, gedämpftes Grün",
    f: ([r, g, b]) => {
      const gr = Math.max(0, g - Math.max(r, b));
      return satur([r * 1.07 + gr * 0.3, g - gr * 0.35, b * 0.8].map((x) => 0.035 + scurve(cl(x), 0.22) * 0.93) as RGB, 0.85);
    },
  },
];
export const lookOf = (id: LookId | null) => LOOKS.find((l) => l.id === id);

/* ---------- Rezepte: fünf voreingestellte, eigene kommen aus dem Profil ---------- */

/** Teil eines eigenen Looks, der nicht vom einzelnen Foto abhängt: Feinschliff und Look mit Stärke */
export type LookFine = Pick<PhotoEdit, "exposure" | "contrast" | "shadows" | "warmth" | "sat" | "look" | "amount" | "more">;
/** Rezept; mit f ein „eigener Look“, der alle übertragbaren Einstellungen mitnimmt */
export type NamedRecipe = { id: string; name: string; txt: string; v: RecipeValues; f?: LookFine };
export const fineOf = (e: PhotoEdit): LookFine => ({ exposure: e.exposure, contrast: e.contrast, shadows: e.shadows, warmth: e.warmth, sat: e.sat, look: e.look, amount: e.amount, more: e.more });
/** trägt ein Foto genau diesen eigenen Look? */
export const wearsLook = (e: PhotoEdit, r: NamedRecipe) => sameRecipe(r.v, e.rec) && (!r.f || JSON.stringify(r.f) === JSON.stringify(fineOf(e)));

export const PRESETS: NamedRecipe[] = [
  { id: "sommerlicht", name: "Sommerlicht", txt: "warm, weiche Lichter", v: { film: "sommer", wbR: 2, wbB: -4, hl: -1, sh: 1, color: 2, dr: 400, cc: 2, fxb: 1, grain: 1, gsize: "klein" } },
  { id: "nachmittag", name: "Nachmittag", txt: "satt, kühle Tiefen", v: { film: "daemmerung", wbR: 1, wbB: -2, hl: 0, sh: -1, color: 3, dr: 200, cc: 1, fxb: 0, grain: 2, gsize: "klein" } },
  { id: "kalkwand", name: "Kalkwand", txt: "golden, harte Sonne", v: { film: "messing", wbR: 3, wbB: -5, hl: -2, sh: 0, color: 1, dr: 100, cc: 2, fxb: 2, grain: 1, gsize: "groß" } },
  { id: "hafen", name: "Hafen", txt: "kühl, tiefes Blau", v: { film: "salz", wbR: -2, wbB: 3, hl: 0, sh: 1, color: -1, dr: 200, cc: 1, fxb: 2, grain: 0, gsize: "klein" } },
  { id: "kohle", name: "Kohle", txt: "Schwarzweiß, kräftig", v: { film: "kohle", wbR: 0, wbB: 0, hl: 1, sh: 2, color: 0, dr: 100, cc: 0, fxb: 0, grain: 2, gsize: "groß" } },
];

/* ---------- Pipeline für eine Farbe (0..1) ---------- */

function pipe(e: PhotoEdit, rgb: RGB, curve?: (x: number) => number): RGB {
  let [r, g, b] = rgb;
  if (e.levels) {
    const [bp, wp] = e.levels;
    r = cl((r - bp) / (wp - bp));
    g = cl((g - bp) / (wp - bp));
    b = cl((b - bp) / (wp - bp));
  }
  if (e.transfer) {
    const t = e.transfer;
    const lab = toLab(r, g, b);
    const o: RGB = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      const sd = Math.max(t.sd[i], 0.5);
      o[i] = mix(lab[i], (lab[i] - t.mu[i]) * (t.sdT[i] / sd) + t.muT[i], t.k);
    }
    [r, g, b] = fromLab(...o).map(cl) as RGB;
  }
  // Rezept: Filmlook, Weißabgleich-Verschiebung, Dynamikbereich, Lichter/Schatten, Farbe, Color Chrome, FX Blau
  const R = e.rec;
  const film = lookOf(R.film);
  if (film) [r, g, b] = film.f([r, g, b]).map(cl) as RGB;
  if (R.wbR || R.wbB) {
    const kr = 1 + R.wbR * 0.022;
    const kb = 1 + R.wbB * 0.022;
    const kg = 1 - (R.wbR + R.wbB) * 0.004;
    r = gam(lin(r) * kr);
    g = gam(lin(g) * kg);
    b = gam(lin(b) * kb);
  }
  const hl = R.hl - (R.dr === 200 ? 0.75 : R.dr === 400 ? 1.5 : 0);
  if (hl || R.sh) {
    const l = cl(luma(r, g, b));
    let d = 0;
    if (l > 0.5) {
      const u = (l - 0.5) / 0.5;
      d = hl * 0.05 * 4 * u * (1 - u) + (hl < 0 ? hl * 0.02 * u * u : 0);
    } else {
      const u = l / 0.5;
      d = -R.sh * 0.055 * 4 * u * (1 - u);
    }
    r += d;
    g += d;
    b += d;
  }
  if (R.color) [r, g, b] = satur([r, g, b], 1 + R.color * 0.09);
  if (R.cc || R.fxb) {
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    const blue = cl((b - Math.max(r, g)) * 3);
    const k = 1 - R.cc * 0.07 * sat ** 1.5 - R.fxb * 0.09 * blue;
    r *= k;
    g *= k;
    b = b * k + R.fxb * 0.02 * blue;
  }
  r = cl(r);
  g = cl(g);
  b = cl(b);
  // Feinschliff
  if (e.exposure || e.warmth) {
    const ex = 2 ** e.exposure;
    const w = e.warmth * 0.12;
    r = gam(lin(r) * ex * (1 + w));
    g = gam(lin(g) * ex);
    b = gam(lin(b) * ex * (1 - w));
  }
  if (e.contrast || e.shadows) {
    const l = cl(luma(r, g, b));
    let l2 = l;
    if (e.shadows) l2 += e.shadows * 0.32 * (1 - l2) * (1 - l2) * l2 * 2.2;
    if (e.contrast > 0) l2 = scurve(cl(l2), e.contrast * 0.8);
    else if (e.contrast < 0) l2 = mix(l2, 0.5, -e.contrast * 0.35);
    r += l2 - l;
    g += l2 - l;
    b += l2 - l;
  }
  if (e.sat) [r, g, b] = satur([r, g, b], 1 + e.sat);
  r = cl(r);
  g = cl(g);
  b = cl(b);
  if (e.more) [r, g, b] = more(e.more, [r, g, b], curve);
  // Look mit Stärke
  const look = lookOf(e.look);
  if (look) {
    const o = look.f([r, g, b]);
    r = mix(r, cl(o[0]), e.amount);
    g = mix(g, cl(o[1]), e.amount);
    b = mix(b, cl(o[2]), e.amount);
  }
  return [r, g, b];
}

/* ---------- Mehr Werkzeuge ---------- */

function toHsl(r: number, g: number, b: number): RGB {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  const d = mx - mn;
  if (d < 1e-6) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function fromHsl(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r, g, b] = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return [r + m, g + m, b + m];
}
/** Gewicht eines Farbtons: weiche Glocke bis zum Nachbarn */
function hueWeight(h: number, i: number): number {
  const c = HUES[i][1];
  const prev = HUES[(i + HUES.length - 1) % HUES.length][1];
  const next = HUES[(i + 1) % HUES.length][1];
  let d = h - c;
  d = ((d + 540) % 360) - 180;
  const span = d < 0 ? (c - prev + 360) % 360 : (next - c + 360) % 360;
  const t = Math.abs(d) / span;
  return t >= 1 ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * t);
}

/** Licht genauer, Farbe genauer, Farben einzeln; alles Farbe → Farbe, also im LUT */
function more(m: More, [r, g, b]: RGB, curve?: (x: number) => number): RGB {
  if (m.highlights || m.whites || m.blacks) {
    const l = cl(luma(r, g, b));
    const u = cl((l - 0.35) / 0.65);
    // Lichter in den hellen Mitten, Weiß und Schwarz an den Enden
    const d = m.highlights * 0.14 * 4 * u * (1 - u) + m.whites * 0.14 * l ** 4 + m.blacks * 0.12 * (1 - l) ** 4;
    r += d;
    g += d;
    b += d;
  }
  if (m.tint) {
    r = gam(lin(cl(r)) * (1 + m.tint * 0.05));
    g = gam(lin(cl(g)) * (1 - m.tint * 0.09));
    b = gam(lin(cl(b)) * (1 + m.tint * 0.05));
  }
  if (m.vibrance) {
    // Dynamik: wenig gesättigte Farben bewegen sich stärker, Hauttöne etwas weniger
    const s = Math.max(r, g, b) - Math.min(r, g, b);
    const skin = r > g && g > b ? 0.6 : 1;
    [r, g, b] = satur([r, g, b], 1 + m.vibrance * (1 - Math.min(1, s * 1.8)) * skin * (m.vibrance > 0 ? 1 : 0.9));
  }
  if (m.hsl.some((t) => t[0] || t[1] || t[2])) {
    const [h, s, l] = toHsl(cl(r), cl(g), cl(b));
    let dh = 0;
    let ds = 0;
    let dl = 0;
    for (let i = 0; i < HUES.length; i++) {
      const w = hueWeight(h, i);
      if (!w) continue;
      dh += w * m.hsl[i][0];
      ds += w * m.hsl[i][1];
      dl += w * m.hsl[i][2];
    }
    // Grautöne haben keinen Farbton: je bunter, desto mehr wirkt es
    const k = Math.min(1, s * 2.5);
    [r, g, b] = fromHsl(h + dh * 30 * k, cl(s * (1 + ds * k)), cl(l + dl * 0.18 * k * s));
  }
  // Gradationskurve auf allen drei Kanälen, wie die RGB-Kurve in Lightroom
  if (curve) return [curve(cl(r)), curve(cl(g)), curve(cl(b))];
  return [cl(r), cl(g), cl(b)];
}

/* ---------- Vignette: in Vorschau (GLSL) und Einrechnen gleich, bezogen auf den Zuschnitt ---------- */

/** Stärke der Vignette an einer Stelle des Ergebnisses (0..1 in beiden Richtungen) */
export function vignetteAt(x: number, y: number): number {
  const d = Math.hypot((x - 0.5) * 2, (y - 0.5) * 2);
  const t = cl((d - 0.45) / 0.7);
  return t * t * (3 - 2 * t);
}
/** Vignette auf Pixel eines Streifens (Breite w, Gesamthöhe h, ab Zeile y0) */
export function applyVignette(px: Uint8ClampedArray, w: number, h: number, v: number, y0 = 0) {
  if (!v) return;
  const rows = px.length / 4 / w;
  for (let y = 0; y < rows; y++) {
    const fy = (y + y0 + 0.5) / h;
    for (let x = 0; x < w; x++) {
      const f = vignetteAt((x + 0.5) / w, fy);
      if (!f) continue;
      const i = (y * w + x) * 4;
      for (let k = 0; k < 3; k++) px[i + k] = v < 0 ? px[i + k] * (1 + v * 0.7 * f) : px[i + k] + (255 - px[i + k]) * v * 0.6 * f;
    }
  }
}

/** 3D-LUT als RGBA8, Index (b·N + g)·N + r. 33 Punkte zum Einrechnen, 17 reichen beim Ziehen */
export function buildLut(e: PhotoEdit, n = 33): Uint8Array {
  const lut = new Uint8Array(n * n * n * 4);
  let p = 0;
  const curve = e.more && !curveIsNeutral(e.more.curve) ? curveFn(e.more.curve) : undefined;
  for (let bi = 0; bi < n; bi++)
    for (let gi = 0; gi < n; gi++)
      for (let ri = 0; ri < n; ri++) {
        const o = pipe(e, [ri / (n - 1), gi / (n - 1), bi / (n - 1)], curve);
        lut[p++] = Math.round(o[0] * 255);
        lut[p++] = Math.round(o[1] * 255);
        lut[p++] = Math.round(o[2] * 255);
        lut[p++] = 255;
      }
  return lut;
}

/** LUT auf Pixel anwenden (trilinear), wie die Textur-Filterung der GPU */
export function applyLut(src: Uint8ClampedArray, dst: Uint8ClampedArray, lut: Uint8Array, n: number) {
  const S = (n - 1) / 255;
  const N2 = n * n;
  const top = n - 1;
  for (let i = 0; i < src.length; i += 4) {
    const fr = src[i] * S;
    const fg = src[i + 1] * S;
    const fb = src[i + 2] * S;
    const r0 = fr | 0;
    const g0 = fg | 0;
    const b0 = fb | 0;
    const r1 = r0 < top ? r0 + 1 : r0;
    const g1 = g0 < top ? g0 + 1 : g0;
    const b1 = b0 < top ? b0 + 1 : b0;
    const dr = fr - r0;
    const dg = fg - g0;
    const db = fb - b0;
    const a = (b0 * N2 + g0 * n) * 4;
    const bq = (b1 * N2 + g0 * n) * 4;
    const c = (b0 * N2 + g1 * n) * 4;
    const d = (b1 * N2 + g1 * n) * 4;
    const R0 = r0 * 4;
    const R1 = r1 * 4;
    for (let k = 0; k < 3; k++) {
      const c00 = lut[a + R0 + k] + (lut[a + R1 + k] - lut[a + R0 + k]) * dr;
      const c10 = lut[c + R0 + k] + (lut[c + R1 + k] - lut[c + R0 + k]) * dr;
      const c01 = lut[bq + R0 + k] + (lut[bq + R1 + k] - lut[bq + R0 + k]) * dr;
      const c11 = lut[d + R0 + k] + (lut[d + R1 + k] - lut[d + R0 + k]) * dr;
      const c0 = c00 + (c10 - c00) * dg;
      const c1 = c01 + (c11 - c01) * dg;
      dst[i + k] = c0 + (c1 - c0) * db;
    }
    dst[i + 3] = 255;
  }
}

/* ---------- Körnung: dasselbe Muster in Vorschau (GLSL) und Einrechnen ---------- */

/** Stärke der Körnung je Stufe und Korngröße als Anteil der Bildbreite */
export const GRAIN = { amount: [0, 0.045, 0.08], cell: { klein: 1 / 1400, groß: 1 / 700 } } as const;

/** Ganzzahl-Hash (PCG), in grain.glsl gleich */
export function hash2(x: number, y: number): number {
  let v = (Math.imul(x, 1973) + Math.imul(y, 9277) + 89173) >>> 0;
  v = (Math.imul(v, 747796405) + 2891336453) >>> 0;
  const w = Math.imul((v >>> ((v >>> 28) + 4)) ^ v, 277803737) >>> 0;
  return (((w >>> 22) ^ w) >>> 0) / 4294967295;
}

/** Körnung auf Pixel (Breite w): Overlay-artig, in den Mitten am stärksten */
export function applyGrain(px: Uint8ClampedArray, w: number, rec: RecipeValues, y0 = 0, scale = 1) {
  const amount = GRAIN.amount[rec.grain];
  if (!amount) return;
  // Zellen in Pixeln des großen Bilds; scale > 1, wenn px eine verkleinerte Vorschau ist
  const cell = Math.max(1, w * scale * GRAIN.cell[rec.gsize]);
  const h = px.length / 4 / w;
  for (let y = 0; y < h; y++) {
    const cy = Math.floor(((y + y0) * scale) / cell);
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const nz = (hash2(Math.floor((x * scale) / cell), cy) - 0.5) * 2 * amount * 255;
      const l = (px[i] * 0.2126 + px[i + 1] * 0.7152 + px[i + 2] * 0.0722) / 255;
      const m = nz * 4 * l * (1 - l);
      px[i] += m;
      px[i + 1] += m;
      px[i + 2] += m;
    }
  }
}

/* ---------- Statistik und Vorschläge ---------- */

export type PhotoStats = { mu: RGB; sd: RGB; p01: number; p99: number };

/** Lab-Mittel, Streuung und Helligkeits-Perzentile aus einem kleinen Abzug */
export function stats(px: Uint8ClampedArray): PhotoStats {
  const sum = [0, 0, 0];
  const sq = [0, 0, 0];
  const hist = new Uint32Array(256);
  let m = 0;
  for (let i = 0; i < px.length; i += 16) {
    const lab = toLab(px[i] / 255, px[i + 1] / 255, px[i + 2] / 255);
    for (let c = 0; c < 3; c++) {
      sum[c] += lab[c];
      sq[c] += lab[c] * lab[c];
    }
    hist[Math.round(luma(px[i], px[i + 1], px[i + 2]))]++;
    m++;
  }
  const mu = sum.map((s) => s / m) as RGB;
  const sd = sq.map((s, c) => Math.sqrt(Math.max(0, s / m - mu[c] * mu[c]))) as RGB;
  const pct = (p: number) => {
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= m * p) return v / 255;
    }
    return 1;
  };
  return { mu, sd, p01: pct(0.005), p99: pct(0.995) };
}

/** Auto: Tonwerte spreizen und den Farbstich zur Hälfte nehmen */
/* ---------- Fertige Vorschläge: Auto als Grundlage, darauf ein abgestimmter Satz aus Look und Reglern ---------- */

export type PickId = "klar" | "film" | "sw" | "matt" | "abend" | "kuehl" | "dia" | "weich";
export const PICKS: { id: PickId; name: string; txt: string; e: Partial<PhotoEdit>; more: Partial<More> }[] = [
  {
    id: "klar",
    name: "Klar",
    txt: "frisch, kräftig, knackig",
    e: { contrast: 0.18, exposure: 0.04 },
    more: { highlights: -0.3, whites: 0.12, blacks: -0.12, vibrance: 0.32, clarity: 0.3 },
  },
  {
    id: "film",
    name: "Warmer Film",
    txt: "weich und warm, wie analog",
    e: { look: "sommer", amount: 0.65, shadows: 0.15, warmth: 0.12 },
    more: {
      vignette: -0.3,
      curve: [
        [0, 0.05],
        [0.5, 0.52],
        [1, 0.97],
      ],
    },
  },
  {
    id: "sw",
    name: "Schwarzweiß",
    txt: "kräftiger Kontrast, dunkle Ränder",
    e: { look: "kohle", amount: 1, contrast: 0.28 },
    more: { blacks: -0.15, clarity: 0.35, vignette: -0.35 },
  },
  // zum Austauschen: stehen erst unter Vorschläge, wenn jemand sie dorthin holt
  {
    id: "matt",
    name: "Matt",
    txt: "blass, Schwarz offen",
    e: { look: "kreide", amount: 0.7, contrast: -0.08 },
    more: {
      vibrance: -0.15,
      curve: [
        [0, 0.1],
        [0.5, 0.52],
        [1, 0.94],
      ],
    },
  },
  {
    id: "abend",
    name: "Abendlicht",
    txt: "golden, weiche Schatten",
    e: { warmth: 0.3, shadows: 0.2, exposure: 0.03 },
    more: { highlights: -0.2, tint: 0.06, vibrance: 0.2, vignette: -0.2 },
  },
  {
    id: "kuehl",
    name: "Kühl",
    txt: "klar und frisch, wie Meerluft",
    e: { look: "salz", amount: 0.7, warmth: -0.08, contrast: 0.1 },
    more: { highlights: -0.15, clarity: 0.15 },
  },
  {
    id: "dia",
    name: "Diafilm",
    txt: "satt und kräftig",
    e: { look: "messing", amount: 0.75, contrast: 0.15 },
    more: { blacks: -0.1, vibrance: 0.15, vignette: -0.2 },
  },
  {
    id: "weich",
    name: "Weich",
    txt: "hell und sanft, für Gesichter",
    e: { exposure: 0.06, contrast: -0.12, shadows: 0.25 },
    more: { highlights: -0.25, clarity: -0.2, vibrance: 0.1 },
  },
];
/** stehen ab Werk unter Vorschläge, die übrigen holt man sich per Austauschen dazu */
export const PICKS_SHOWN: PickId[] = ["klar", "film", "sw"];
/** Vorschlag auf ein Foto: Farbe und Licht neu, Zuschnitt und Rezept bleiben */
export function pickEdit(st: PhotoStats, id: PickId, base: PhotoEdit): PhotoEdit {
  const p = PICKS.find((x) => x.id === id)!;
  return { ...neutralEdit(), rec: base.rec, recName: base.recName, geo: base.geo, ...autoEdit(st), ...p.e, more: { ...MORE0(), ...p.more }, origin: "pick", pick: id };
}

/**
 * „Auf alle“: die Bearbeitung von einem Foto auf ein anderes übertragen. Look, Rezept, Feinschliff und „Mehr“ kommen
 * mit; was vom Foto selbst abhängt, rechnet jedes Foto neu: Auto, Vorschlag und Stimmung bekommen sein eigenes Auto
 * darunter, damit ein dunkles und ein helles Foto beide beim selben Stil landen. Zuschnitt und Geraderichten bleiben.
 */
export function spreadEdit(from: PhotoEdit, to: PhotoEdit, st: PhotoStats | undefined): PhotoEdit {
  const own = !!from.transfer || !!from.levels;
  const base = { ...from, geo: to.geo, moodFrom: undefined, more: from.more ? { ...from.more, hsl: from.more.hsl.map((t) => [...t] as [number, number, number]), curve: from.more.curve.map((p) => [...p] as [number, number]) } : undefined };
  if (!own) return { ...base, levels: null, transfer: null };
  // ohne Zahlen zum Foto (noch nicht geladen) lieber ohne Auto als mit dem Auto eines anderen Fotos
  if (!st) return { ...base, levels: null, transfer: null, origin: from.origin === "pick" ? "pick" : null };
  return { ...base, ...autoEdit(st), origin: from.origin === "pick" ? "pick" : "auto" };
}

export function autoEdit(st: PhotoStats): Pick<PhotoEdit, "levels" | "transfer"> {
  return {
    levels: [Math.min(0.1, st.p01 * 0.8), Math.max(0.88, st.p99 + (1 - st.p99) * 0.2)],
    transfer: { mu: st.mu, sd: st.sd, muT: [st.mu[0], st.mu[1] * 0.55, st.mu[2] * 0.55], sdT: [Math.max(st.sd[0], 21), st.sd[1], st.sd[2]], k: 1 },
  };
}

/** Angleichen: nur dieses Foto rückt an das Mittel der anderen Fotos der Doppelseite */
export function matchTransfer(me: PhotoStats, others: PhotoStats[]): Transfer {
  const avg = (f: (o: PhotoStats) => RGB) => [0, 1, 2].map((c) => others.reduce((a, o) => a + f(o)[c], 0) / others.length) as RGB;
  const muT = avg((o) => o.mu);
  const sdT = avg((o) => o.sd);
  return { mu: me.mu, sd: me.sd, muT: [mix(me.mu[0], muT[0], 0.6), muT[1], muT[2]], sdT: [mix(me.sd[0], sdT[0], 0.6), sdT[1], sdT[2]], k: 0.75 };
}

/** Stimmung übernehmen: Farbverteilung eines Vorbilds (Reinhard-Farbübertragung), Helligkeit nur halb */
export function moodTransfer(me: PhotoStats, from: PhotoStats): Transfer {
  return {
    mu: me.mu,
    sd: me.sd,
    muT: [mix(me.mu[0], from.mu[0], 0.5), from.mu[1], from.mu[2]],
    sdT: [mix(me.sd[0], from.sd[0], 0.5), from.sd[1], from.sd[2]],
    k: 0.85,
  };
}

/* ---------- Zettel ---------- */

const signed = (v: number) => (v > 0 ? "+" : v < 0 ? "−" : "±") + Math.abs(v);
const LEVEL = ["Aus", "Schwach", "Stark"];

/** Was nachbearbeitet wurde, in Zeilen für den Rezept-Zettel */
export function describeEdit(e: PhotoEdit): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (e.origin === "auto") rows.push({ label: "Vorschlag", value: "Auto" });
  if (e.origin === "match") rows.push({ label: "Vorschlag", value: "an die anderen Fotos angeglichen" });
  if (e.origin === "mood") rows.push({ label: "Vorschlag", value: e.moodFrom ? `Stimmung von ${e.moodFrom}` : "Stimmung übernommen" });
  if (e.origin === "pick") rows.push({ label: "Vorschlag", value: PICKS.find((p) => p.id === e.pick)?.name ?? "fertiger Vorschlag" });
  const R = e.rec;
  if (!recipeIsEmpty(R)) {
    const preset = [...PRESETS].find((p) => sameRecipe(p.v, R));
    rows.push({ label: "Rezept", value: preset ? preset.name : e.recName ? `${e.recName}, angepasst` : "eigene Werte" });
    rows.push({ label: "Filmlook", value: lookOf(R.film)?.name ?? "Ohne" });
    rows.push({ label: "Weißabgleich", value: `R${signed(R.wbR)} B${signed(R.wbB)}` });
    rows.push({ label: "Dynamikbereich", value: `DR${R.dr}` });
    rows.push({ label: "Lichter / Schatten", value: `${signed(R.hl)} / ${signed(R.sh)}` });
    rows.push({ label: "Farbe", value: signed(R.color) });
    if (R.cc || R.fxb) rows.push({ label: "Color Chrome / FX Blau", value: `${LEVEL[R.cc]} / ${LEVEL[R.fxb]}` });
    if (R.grain) rows.push({ label: "Körnung", value: `${LEVEL[R.grain]}, ${R.gsize}` });
  }
  const look = lookOf(e.look);
  if (look) rows.push({ label: "Look", value: `${look.name} ${Math.round(e.amount * 100)} %` });
  for (const [k, label, f] of FINE) if (Math.abs(e[k]) > 0.005) rows.push({ label, value: f(e[k]) });
  const m = e.more;
  if (m && !moreIsNeutral(m)) {
    for (const [k, label] of MORE_SLIDERS) if (Math.abs(m[k]) > 0.005) rows.push({ label, value: signed100(m[k]) });
    const hues = HUES.filter((_, i) => m.hsl[i].some((v) => Math.abs(v) > 0.005)).map(([n]) => n);
    if (hues.length) rows.push({ label: "Farben einzeln", value: hues.join(", ") });
    if (!curveIsNeutral(m.curve)) rows.push({ label: "Gradationskurve", value: "angepasst" });
  }
  if (e.geo && !geoIsNeutral(e.geo)) rows.push({ label: "Zuschnitt", value: describeGeo(e.geo) });
  return rows;
}

/** Feinschliff-Regler: Schlüssel, Name, Anzeige, Bereich */
export const FINE: [keyof Pick<PhotoEdit, "exposure" | "contrast" | "shadows" | "warmth" | "sat">, string, (v: number) => string, number, number][] = [
  ["exposure", "Licht", (v) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2).replace(".", ",")} EV`, -1, 1],
  ["contrast", "Kontrast", (v) => `${v >= 0 ? "+" : "−"}${Math.abs(Math.round(v * 100))}`, -1, 1],
  ["shadows", "Schatten aufhellen", (v) => `${Math.round(v * 100)}`, 0, 1],
  ["warmth", "Wärme", (v) => `${v >= 0 ? "+" : "−"}${Math.abs(Math.round(v * 100))}`, -1, 1],
  ["sat", "Farbe", (v) => `${v >= 0 ? "+" : "−"}${Math.abs(Math.round(v * 100))}`, -1, 1],
];
export { signed as signedStep };

const signed100 = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(Math.round(v * 100))}`;
/** Regler in „Mehr Werkzeuge“ außer den Farben einzeln: Schlüssel, Name, Gruppe */
export const MORE_SLIDERS: [Exclude<keyof More, "hsl" | "curve">, string, "light" | "color" | "vignette"][] = [
  ["highlights", "Lichter", "light"],
  ["whites", "Weiß", "light"],
  ["blacks", "Schwarz", "light"],
  ["tint", "Tönung", "color"],
  ["vibrance", "Dynamik", "color"],
  ["clarity", "Klarheit", "light"],
  ["vignette", "Vignette", "vignette"],
];
export { signed100 };
