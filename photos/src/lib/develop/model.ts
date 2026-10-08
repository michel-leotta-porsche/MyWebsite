// Bildbearbeitung als eine Farbabbildung: alle Werkzeuge (Auto, Angleichen, Stimmung, Looks, Feinschliff, Rezept)
// sind Funktionen Farbe → Farbe. Sie werden zu einem 3D-LUT zusammengerechnet, den Vorschau (WebGL) und
// Einrechnen (Worker) gleich anwenden. Nur die Körnung ist ein Muster obendrauf.
// Reine Rechnung ohne DOM, damit sie auch im Worker läuft.

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
  origin: "auto" | "match" | "mood" | null;
  /** bei „Stimmung“: Titel oder Nummer des Vorbilds, nur für den Zettel */
  moodFrom?: string;
  rec: RecipeValues;
  /** Name des gewählten Rezepts (auch wenn danach Werte geändert wurden) */
  recName?: string;
};

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
  return !e.exposure && !e.contrast && !e.shadows && !e.warmth && !e.sat && !e.look && !e.levels && !e.transfer && recipeIsEmpty(e.rec);
}

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
    origin: oneOf(x.origin, [null, "auto", "match", "mood"] as const, null),
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

export type NamedRecipe = { id: string; name: string; txt: string; v: RecipeValues };

export const PRESETS: NamedRecipe[] = [
  { id: "sommerlicht", name: "Sommerlicht", txt: "warm, weiche Lichter", v: { film: "sommer", wbR: 2, wbB: -4, hl: -1, sh: 1, color: 2, dr: 400, cc: 2, fxb: 1, grain: 1, gsize: "klein" } },
  { id: "nachmittag", name: "Nachmittag", txt: "satt, kühle Tiefen", v: { film: "daemmerung", wbR: 1, wbB: -2, hl: 0, sh: -1, color: 3, dr: 200, cc: 1, fxb: 0, grain: 2, gsize: "klein" } },
  { id: "kalkwand", name: "Kalkwand", txt: "golden, harte Sonne", v: { film: "messing", wbR: 3, wbB: -5, hl: -2, sh: 0, color: 1, dr: 100, cc: 2, fxb: 2, grain: 1, gsize: "groß" } },
  { id: "hafen", name: "Hafen", txt: "kühl, tiefes Blau", v: { film: "salz", wbR: -2, wbB: 3, hl: 0, sh: 1, color: -1, dr: 200, cc: 1, fxb: 2, grain: 0, gsize: "klein" } },
  { id: "kohle", name: "Kohle", txt: "Schwarzweiß, kräftig", v: { film: "kohle", wbR: 0, wbB: 0, hl: 1, sh: 2, color: 0, dr: 100, cc: 0, fxb: 0, grain: 2, gsize: "groß" } },
];

/* ---------- Pipeline für eine Farbe (0..1) ---------- */

function pipe(e: PhotoEdit, rgb: RGB): RGB {
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

/** 3D-LUT als RGBA8, Index (b·N + g)·N + r. 33 Punkte zum Einrechnen, 17 reichen beim Ziehen */
export function buildLut(e: PhotoEdit, n = 33): Uint8Array {
  const lut = new Uint8Array(n * n * n * 4);
  let p = 0;
  for (let bi = 0; bi < n; bi++)
    for (let gi = 0; gi < n; gi++)
      for (let ri = 0; ri < n; ri++) {
        const o = pipe(e, [ri / (n - 1), gi / (n - 1), bi / (n - 1)]);
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
  if (e.origin === "match") rows.push({ label: "Vorschlag", value: "an die Doppelseite angeglichen" });
  if (e.origin === "mood") rows.push({ label: "Vorschlag", value: e.moodFrom ? `Stimmung von ${e.moodFrom}` : "Stimmung übernommen" });
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
