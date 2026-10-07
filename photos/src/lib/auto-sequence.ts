import { across, blank, framed, full, landscape, small, tall, type Spec } from "@/content/books";

// Automatische Gestaltung nach den Regeln aus dem Workshop (docs/workshop-konzept.md):
// Reihenfolge nach Aufnahmezeit, Gegenüber nach Farbe, Seitentypen im Rhythmus.
// Jede Doppelseite ist eine Gruppe von ein oder zwei Fotos plus eine Layout-Variante,
// damit man sie im Editor per Klick wechseln kann.

export type AutoPhoto = { key: string; w: number; h: number; color: [number, number, number]; taken?: string };
export type SpreadDraft = { keys: string[]; layout: number };

const ratio = (p: AutoPhoto) => p.w / p.h;
const isLandscape = (p: AutoPhoto) => ratio(p) > 1.1;
const isTall = (p: AutoPhoto) => ratio(p) < 0.6;
const dist = (a: AutoPhoto, b: AutoPhoto) => Math.hypot(a.color[0] - b.color[0], (a.color[1] - b.color[1]) * 1.4, (a.color[2] - b.color[2]) * 1.4);
const chroma = (p: AutoPhoto) => Math.hypot(p.color[1], p.color[2]);

/** Mögliche Layouts für eine Gruppe; die erste Variante ist die ruhigste Wahl */
export function variants(keys: string[], byKey: Map<string, AutoPhoto>): (readonly [Spec, Spec] | readonly [Spec])[] {
  const ps = keys.map((k) => byKey.get(k)!).filter(Boolean);
  if (ps.length === 1) {
    const [a] = ps;
    if (isLandscape(a)) return [[across(a.key)], [blank(a.key), landscape(a.key)], [landscape(a.key), blank(a.key)]];
    if (isTall(a)) return [[blank(a.key), tall(a.key)], [blank(a.key), full(a.key)]];
    return [[blank(a.key), full(a.key)], [blank(a.key), framed(a.key)], [small(a.key, 3, "top", "outer"), blank(a.key)]];
  }
  const [a, b] = ps;
  const la = isLandscape(a);
  const lb = isLandscape(b);
  if (la && lb) return [[landscape(a.key), landscape(b.key)]];
  if (la) return [[landscape(a.key), full(b.key)], [landscape(a.key), framed(b.key)]];
  if (lb) return [[full(a.key), landscape(b.key)], [framed(a.key), landscape(b.key)]];
  const ta = isTall(a) ? tall(a.key) : full(a.key);
  const tb = isTall(b) ? tall(b.key) : full(b.key);
  return [
    [ta, tb],
    [framed(a.key), framed(b.key)],
    [small(a.key, 3, "top", "outer"), tb],
    [ta, small(b.key, 3, "bottom", "outer")],
    [small(a.key, 3, "bottom", "inner"), tb],
    [ta, small(b.key, 2, "bottom", "outer")],
  ];
}

const paperRich = (spread: readonly Spec[]) => spread.some((s) => s.kind === "small" || s.kind === "plate" || s.kind === "landscape" || s.kind === "blank");
const fullPair = (spread: readonly Spec[]) => spread.length === 2 && spread.every((s) => s.kind === "full" || s.kind === "tall");

/** Buch aus losen Fotos: Gruppen bilden, Layouts im Rhythmus wählen, Einband bestimmen */
export function autoSequence(photos: AutoPhoto[]): { spreads: SpreadDraft[]; coverKey: string } {
  const byKey = new Map(photos.map((p) => [p.key, p]));
  const rest = [...photos].sort((a, b) => (a.taken ?? "").localeCompare(b.taken ?? ""));
  // der farbigste ruhige Hochformat-Abzug kommt auf den Einband, er erscheint im Buch trotzdem
  const coverKey = [...photos].filter((p) => !isLandscape(p)).sort((a, b) => chroma(b) - chroma(a))[0]?.key ?? photos[0]?.key;

  const groups: string[][] = [];
  let acrossUsed = 0;
  while (rest.length) {
    const a = rest.shift()!;
    // ein breites Querformat darf ab und zu über den Bund laufen
    if (isLandscape(a) && ratio(a) > 1.4 && acrossUsed < Math.max(1, Math.floor(photos.length / 12)) && groups.length > 0) {
      groups.push([a.key]);
      acrossUsed++;
      continue;
    }
    if (!rest.length) {
      groups.push([a.key]);
      break;
    }
    // Gegenüber: unter den nächsten drei das farblich nächste
    const window = rest.slice(0, 3);
    const partner = window.reduce((best, p) => (dist(a, p) < dist(a, best) ? p : best), window[0]);
    rest.splice(rest.indexOf(partner), 1);
    groups.push([a.key, partner.key]);
  }

  // Rhythmus: nie zwei randlose Paare hintereinander, spätestens jede dritte Doppelseite mit viel Papier
  const spreads: SpreadDraft[] = [];
  let sincePaper = 0;
  let lastFull = false;
  let blanks = 0;
  for (const keys of groups) {
    const vs = variants(keys, byKey);
    let pick = 0;
    const candidates = vs.map((v, i) => ({ v, i }));
    const allowed = candidates.filter(({ v }) => {
      if (v.some((s) => s.kind === "blank") && blanks >= 1 && vs.some((x) => !x.some((s) => s.kind === "blank"))) return false;
      if (lastFull && fullPair(v)) return false;
      if (sincePaper >= 2 && !paperRich(v) && vs.some(paperRich)) return false;
      return true;
    });
    if (allowed.length) {
      // abwechseln, damit nicht jede Papierseite gleich aussieht
      const rotate = spreads.length % allowed.length;
      const preferQuiet = sincePaper >= 2 ? allowed.filter(({ v }) => paperRich(v)) : allowed;
      pick = (preferQuiet.length ? preferQuiet : allowed)[rotate % (preferQuiet.length || allowed.length)].i;
      if (!lastFull && sincePaper < 2 && allowed.some(({ i }) => i === 0)) pick = 0;
    }
    const chosen = vs[pick];
    if (chosen.some((s) => s.kind === "blank")) blanks++;
    lastFull = fullPair(chosen);
    sincePaper = paperRich(chosen) ? 0 : sincePaper + 1;
    spreads.push({ keys, layout: pick });
  }
  return { spreads, coverKey };
}
