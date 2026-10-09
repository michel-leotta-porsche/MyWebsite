// Einstellungen eines Fotos zum Mitnehmen, wie „Einstellungen kopieren“ in Lightroom: Farbe und Licht, nie der Zuschnitt.
// Quelle ist eine Calima-Bearbeitung oder das Rezept aus der Datei (Fuji-MakerNote, Lightroom-XMP), dann übersetzt
// in Calimas Regler und als „nachempfunden“ markiert. Ohne DOM, damit es sich ohne Browser prüfen lässt.

import type { FujiRecipe, Recipe } from "@/content/recipes";
import { cleanEdit, colorIsNeutral, fineOf, HUES, MORE0, neutralEdit, REC0, type LookFine, type LookId, type More, type NamedRecipe, type PhotoEdit, type RecipeValues } from "@/lib/develop/model";
import { t } from "@/lib/i18n";
import { num as crs, parseXmp } from "@/lib/xmp";

export type CopiedSettings = {
  v: 1;
  source: "edit" | "fuji" | "lightroom";
  /** wird recName beim Einfügen und Name beim Speichern als Look */
  name: string;
  /** woher, für Kachel und Hinweis: „Tafel 7“, Dateiname */
  from?: string;
  rec: RecipeValues;
  f: LookFine;
  /** aus einer Datei übersetzt, also nur ähnlich */
  approx: boolean;
  /** was sich nicht übertragen ließ, für den Zettel */
  lost: string[];
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const step = <T extends number>(v: number, list: readonly T[]): T => list.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
const fine0 = (): LookFine => ({ exposure: 0, contrast: 0, shadows: 0, warmth: 0, sat: 0, look: null, amount: 0.8 });

/** Aus einer Calima-Bearbeitung: alles außer dem, was nur zu diesem Foto gehört (Auto, Angleichen, Zuschnitt) */
export function fromEdit(e: PhotoEdit, name?: string, from?: string): CopiedSettings | null {
  const c = cleanEdit(e);
  if (!c) return null;
  const s: CopiedSettings = { v: 1, source: "edit", name: name || c.recName || t("Kopierte Einstellungen"), from, rec: { ...c.rec }, f: fineOf(c), approx: false, lost: [] };
  // nur Auto oder Angleichen: das hängt am Foto, es bliebe nichts zum Mitnehmen
  return settingsAreEmpty(s) ? null : s;
}

/* ---------- Fuji ---------- */

/** Filmsimulation → nächster Calima-Look, dazu kleine Verschiebungen. Eine Anmutung, keine Nachbildung. */
const FILMS: [RegExp, LookId | null, Partial<Pick<RecipeValues, "color" | "sh">>?][] = [
  [/^Velvia/, "messing"],
  [/^Astia/, null, { color: 1 }],
  [/^Classic Chrome/, "kreide"],
  [/^Pro Neg\. Std/, null, { color: -1 }],
  [/^Pro Neg\. Hi/, null, { sh: 1 }],
  [/^Eterna Bleach Bypass/, "kreide", { color: -3, sh: 1 }],
  [/^Eterna/, "kreide"],
  [/^Classic Negative/, "daemmerung"],
  [/^Nostalgic/, "sommer"],
  [/^(Monochrom|Acros|Sepia)/, "kohle"],
  [/^(Provia|Reala|Studio Portrait)/, null],
];

export function fromFuji(r: FujiRecipe, from?: string): CopiedSettings | null {
  if (r.placeholder) return null;
  const hit = FILMS.find(([re]) => re.test(r.film));
  const lost: string[] = [];
  if (!hit) lost.push(t("Filmsimulation {film}", { film: r.film }));
  if (/Sepia/.test(r.film)) lost.push(t("Sepia-Ton"));
  if (/filter/i.test(r.film)) lost.push(t("Farbfilter"));
  const [, film = null, shift = {}] = hit ?? [];
  // „DR Auto (DR400)“: der angewandte Wert zählt
  const drs = [...r.dr.matchAll(/DR(\d+)/g)].map((m) => Number(m[1]));
  const dr = drs.length ? step(drs[drs.length - 1], [100, 200, 400] as const) : 100;
  if (!/^Auto/.test(r.wb.mode)) lost.push(t("Weißabgleich {mode}", { mode: t(r.wb.mode) }));
  if (r.sharpness) lost.push(t("Schärfe"));
  if (r.nr) lost.push(t("Rauschminderung"));
  const rec: RecipeValues = {
    film,
    wbR: Math.round(clamp(r.wb.r, -9, 9)),
    wbB: Math.round(clamp(r.wb.b, -9, 9)),
    hl: clamp(r.highlight, -2, 4),
    sh: clamp(r.shadow + (shift.sh ?? 0), -2, 4),
    color: film === "kohle" ? 0 : Math.round(clamp(r.color + (shift.color ?? 0), -4, 4)),
    dr,
    cc: r.colorChrome,
    fxb: r.fxBlue,
    grain: r.grain.strength,
    gsize: r.grain.size,
  };
  const f = fine0();
  if (r.clarity) f.more = { ...MORE0(), clarity: clamp(r.clarity / 5, -1, 1) };
  return { v: 1, source: "fuji", name: r.name, from, rec, f, approx: true, lost };
}

/* ---------- Lightroom ---------- */

/** Tonkurve 0..255 auf höchstens acht Punkte mit Mindestabstand, beide Enden bei 0 und 1 */
export function thinCurve(pts: [number, number][]): [number, number][] {
  const p = pts.map(([x, y]) => [clamp(x / 255, 0, 1), clamp(y / 255, 0, 1)] as [number, number]).sort((a, b) => a[0] - b[0]);
  if (p.length < 2) return [];
  if (p[0][0] !== 0) p.unshift([0, p[0][1]]);
  if (p[p.length - 1][0] !== 1) p.push([1, p[p.length - 1][1]]);
  const out: [number, number][] = [p[0]];
  for (const q of p.slice(1, -1)) if (q[0] - out[out.length - 1][0] >= 0.04 && 1 - q[0] >= 0.04) out.push(q);
  out.push(p[p.length - 1]);
  if (out.length <= 8) return out;
  // gleichmäßig ausdünnen, Enden bleiben
  return Array.from({ length: 8 }, (_, i) => out[Math.round((i * (out.length - 1)) / 7)]);
}

export function fromLightroom(xmp: string, name: string, from?: string): CopiedSettings | null {
  const lr = parseXmp(xmp);
  if (!lr) return null;
  const n = (k: string) => crs(xmp, k) ?? 0;
  const lost: string[] = [];
  const shadows = n("Shadows2012") / 100;
  const more: More = {
    ...MORE0(),
    highlights: clamp(n("Highlights2012") / 100, -1, 1),
    whites: clamp(n("Whites2012") / 100, -1, 1),
    // Schatten abdunkeln kann der Feinschliff nicht, also etwas mehr Schwarz
    blacks: clamp(n("Blacks2012") / 100 + Math.min(0, shadows) * 0.5, -1, 1),
    tint: clamp(n("IncrementalTint") / 100, -1, 1),
    vibrance: clamp(n("Vibrance") / 100, -1, 1),
    hsl: HUES.map((_, i) => {
      const c = lr.hsl[i];
      return [clamp(c.hue / 100, -1, 1), clamp(c.sat / 100, -1, 1), clamp(c.lum / 100, -1, 1)];
    }),
    vignette: clamp(n("PostCropVignetteAmount") / 100, -1, 1),
    clarity: clamp((n("Clarity2012") + 0.3 * n("Texture")) / 100, -1, 1),
    curve: thinCurve(lr.curve),
  };
  const f: LookFine = {
    exposure: clamp(n("Exposure2012"), -1, 1),
    contrast: clamp(n("Contrast2012") / 100, -1, 1),
    shadows: clamp(shadows, 0, 1),
    warmth: clamp(n("IncrementalTemperature") / 100, -1, 1),
    sat: clamp(n("Saturation") / 100, -1, 1),
    look: lr.gray ? "kohle" : null,
    amount: lr.gray ? 1 : 0.8,
    more,
  };
  const rec = REC0();
  const amount = n("GrainAmount");
  if (amount > 0) {
    rec.grain = amount > 40 ? 2 : 1;
    rec.gsize = n("GrainSize") >= 40 ? "groß" : "klein";
  }
  if (n("Dehaze")) lost.push(t("Dunst entfernen"));
  if (lr.grading && (lr.grading.shadow[1] || lr.grading.highlight[1])) lost.push(t("Color Grading"));
  if (/crs:Temperature=/.test(xmp) && !/crs:IncrementalTemperature=/.test(xmp)) lost.push(t("Weißabgleich in Kelvin"));
  if (/<crs:ToneCurvePV2012(Red|Green|Blue)>/.test(xmp)) lost.push(t("Kurven je Farbkanal"));
  // durch dieselbe Prüfung wie geteilte Bücher: alles in seinen Bereichen, ungültige Kurve fällt weg
  const c = cleanEdit({ ...f, rec })!;
  return { v: 1, source: "lightroom", name, from, rec: c.rec, f: fineOf(c), approx: true, lost };
}

/** Rezept aus der Datei eines Fotos, übersetzt; null bei Beispielen und bei Presets, die nur als Pfad vorliegen */
export function fromRecipe(r: Recipe, from?: string): CopiedSettings | null {
  if (r.placeholder) return null;
  if (r.kind === "fuji") return fromFuji(r, from);
  // aus einer Calima-Datei: schon in Calimas Reglern, nur die Herkunft kommt neu dazu
  if (r.kind === "calima") return { ...r.settings, from };
  return r.inline ? fromLightroom(r.inline, r.name, from) : null;
}

/* ---------- Anwenden, Speichern, Prüfen ---------- */

export const settingsAreEmpty = (s: CopiedSettings) => colorIsNeutral({ ...neutralEdit(), ...s.f, rec: s.rec });

/**
 * Einfügen: Farbe und Licht werden ersetzt, Zuschnitt bleibt. Auto, Angleichen und Vorschlag des Ziels fallen weg,
 * sonst behauptet der Zettel einen Vorschlag, den es nicht mehr gibt.
 */
export function applySettings(target: PhotoEdit, s: CopiedSettings): PhotoEdit {
  return {
    ...target,
    ...s.f,
    more: s.f.more,
    levels: null,
    transfer: null,
    origin: null,
    pick: undefined,
    moodFrom: undefined,
    rec: { ...s.rec },
    recName: s.name,
  };
}

/** Als eigener Look: dieselbe Form wie „Als eigenen Look speichern“ im Fotostudio */
export const asLook = (s: CopiedSettings, id: string): NamedRecipe => ({
  id,
  name: s.name.slice(0, 40),
  txt: s.source === "edit" ? "eigener Look" : s.source === "fuji" ? "aus Fuji-Rezept, nachempfunden" : "aus Lightroom, nachempfunden",
  v: { ...s.rec },
  f: s.f,
});

/* ---------- Looks in diesem Buch ---------- */

// Fingerabdruck auf eine Nachkommastelle: ein kleiner Schubs am Regler ergibt keinen neuen Look
const sig = (s: Pick<CopiedSettings, "rec" | "f">) => JSON.stringify({ rec: s.rec, f: s.f }, (_, v) => (typeof v === "number" ? Math.round(v * 10) / 10 : v));

/** Derselbe Look, bis auf Kleinigkeiten */
export const sameSettings = (a: Pick<CopiedSettings, "rec" | "f">, b: Pick<CopiedSettings, "rec" | "f">) => sig(a) === sig(b);

export type BookLook = CopiedSettings & {
  /** Fotos, die ihn tragen */
  keys: string[];
  /** wo er liegt, für die Kachel: „Doppelseite 2, 5“ */
  where: string;
};

/**
 * Jeder Look, der im Buch schon auf einem Foto liegt, ohne dass jemand ihn kopieren musste. Gleiche Looks
 * werden zusammengefasst, die meistbenutzten zuerst. `at` nennt die Stelle eines Fotos, etwa die Doppelseite.
 */
export function bookLooks(photos: { key: string; edit?: PhotoEdit | null; at?: number }[], label = t("Doppelseite"), max = 8): BookLook[] {
  const groups = new Map<string, { s: CopiedSettings; keys: string[]; at: number[]; names: string[] }>();
  for (const p of photos) {
    const c = cleanEdit(p.edit);
    const s = c && fromEdit(c);
    if (!s) continue;
    const k = sig(s);
    const g = groups.get(k) ?? { s, keys: [], at: [], names: [] };
    g.keys.push(p.key);
    if (p.at !== undefined && !g.at.includes(p.at)) g.at.push(p.at);
    if (c.recName) g.names.push(c.recName);
    groups.set(k, g);
  }
  return [...groups.values()]
    .map((g, i) => ({ g, i }))
    .sort((a, b) => b.g.keys.length - a.g.keys.length || a.i - b.i)
    .slice(0, max)
    .map(({ g }) => {
      const at = [...g.at].sort((a, b) => a - b);
      const where = at.length ? `${label} ${at.join(", ")}` : "";
      // der häufigste Name, sonst nach der ersten Stelle benannt
      const name = g.names.sort((a, b) => g.names.filter((n) => n === b).length - g.names.filter((n) => n === a).length)[0] ?? (at.length ? t("Look von {label} {n}", { label, n: at[0] }) : t("Look aus diesem Buch"));
      return { ...g.s, name, from: where || undefined, keys: g.keys, where };
    });
}

/** Zwischenablage aus dem Speicher: nur geprüfte Werte, wie eigene Rezepte (store.ts cleanRecipe) */
export function cleanSettings(x: unknown): CopiedSettings | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  if (r.v !== 1 || typeof r.name !== "string" || !["edit", "fuji", "lightroom"].includes(r.source as string)) return null;
  const c = cleanEdit({ ...(r.f && typeof r.f === "object" ? r.f : {}), rec: r.rec });
  if (!c) return null;
  return {
    v: 1,
    source: r.source as CopiedSettings["source"],
    name: r.name.slice(0, 40) || t("Kopierte Einstellungen"),
    from: typeof r.from === "string" ? r.from.slice(0, 60) : undefined,
    rec: c.rec,
    f: fineOf(c),
    approx: r.approx === true,
    lost: Array.isArray(r.lost) ? r.lost.filter((l): l is string => typeof l === "string").slice(0, 8).map((l) => l.slice(0, 40)) : [],
  };
}
