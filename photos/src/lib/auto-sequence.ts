import { across, blank, framed, full, landscape, small, tall, textPage, VERSO, type FreeItem, type Spec, type TextStyle } from "@/content/books";

// Automatische Gestaltung nach den Regeln aus dem Workshop (docs/workshop-konzept.md):
// Reihenfolge nach Aufnahmezeit, Gegenüber nach Farbe, Seitentypen im Rhythmus.
// Jede Doppelseite ist eine Gruppe von ein oder zwei Fotos plus eine Layout-Variante,
// damit man sie im Editor per Klick wechseln kann.

export type AutoPhoto = { key: string; w: number; h: number; color: [number, number, number]; taken?: string; star?: boolean };
export type SpreadText = { heading?: string; body: string; style?: TextStyle };
/**
 * Eine Doppelseite im Entwurf. pinned: von Hand entschieden, die Automatik fasst sie nicht mehr an.
 * text: Textseite (immer fixiert), optional mit einem Foto daneben.
 */
export type SpreadDraft = {
  id?: string;
  keys: string[];
  layout: number;
  pinned?: boolean;
  text?: SpreadText;
  /** frei gestaltet (Editor V2): hat Vorrang vor layout und text und gilt immer als fixiert */
  pages?: [PageDraft, PageDraft];
};
/** Eine frei gestaltete Seite; die Reihenfolge der Elemente ist die Ebene */
export type PageDraft = { items: FreeItem[] };

export const spreadId = () => Math.random().toString(36).slice(2, 10);

const ratio = (p: AutoPhoto) => p.w / p.h;
const isLandscape = (p: AutoPhoto) => ratio(p) > 1.1;
const isTall = (p: AutoPhoto) => ratio(p) < 0.6;
const dist = (a: AutoPhoto, b: AutoPhoto) => Math.hypot(a.color[0] - b.color[0], (a.color[1] - b.color[1]) * 1.4, (a.color[2] - b.color[2]) * 1.4);
const chroma = (p: AutoPhoto) => Math.hypot(p.color[1], p.color[2]);

/** Mögliche Layouts einer Textseite, mit oder ohne Foto daneben */
function textVariants(text: SpreadText, keys: string[], byKey: Map<string, AutoPhoto>): (readonly [Spec, Spec])[] {
  const t = textPage(text.body, text.heading, text.style ?? "text");
  const a = keys.map((k) => byKey.get(k)).find(Boolean);
  if (!a) return [[t, VERSO], [VERSO, t]];
  if (isLandscape(a)) return [[t, landscape(a.key)], [landscape(a.key), t]];
  return [[t, full(a.key)], [t, framed(a.key)], [full(a.key), t], [framed(a.key), t]];
}

/** Mögliche Layouts für eine Doppelseite; die erste Variante ist die ruhigste Wahl */
export function variantsOf(s: SpreadDraft, byKey: Map<string, AutoPhoto>): (readonly [Spec, Spec] | readonly [Spec])[] {
  if (s.pages) return [[{ kind: "free", items: s.pages[0].items }, { kind: "free", items: s.pages[1].items }]];
  return s.text ? textVariants(s.text, s.keys, byKey) : variants(s.keys, byKey);
}

/** Mögliche Layouts für eine Gruppe von Fotos */
export function variants(keys: string[], byKey: Map<string, AutoPhoto>): (readonly [Spec, Spec] | readonly [Spec])[] {
  const ps = keys.map((k) => byKey.get(k)!).filter(Boolean);
  if (!ps.length) return [[VERSO, VERSO]];
  if (ps.length === 1) {
    const [a] = ps;
    // Die leere Seite (blank) trägt die Unterschrift der Gegenseite und steht deshalb nur neben dem
    // randlosen Foto, das selbst keine hat. Neben Tafel, Querformat und kleiner Tafel bliebe sonst
    // dieselbe Nummer doppelt stehen; dort bleibt gegenüber reines Papier (VERSO).
    if (isLandscape(a)) return [[across(a.key)], [VERSO, landscape(a.key)], [landscape(a.key), VERSO]];
    // das hohe Format trägt seine Unterschrift im Papierstreifen; gegenüber bleibt leeres Papier
    if (isTall(a)) return [[VERSO, tall(a.key)], [blank(a.key), full(a.key)]];
    return [[blank(a.key), full(a.key)], [VERSO, framed(a.key)], [small(a.key, 3, "top", "outer"), VERSO]];
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

const paperRich = (spread: readonly Spec[]) =>
  spread.some((s) => s.kind === "small" || s.kind === "plate" || s.kind === "landscape" || s.kind === "blank" || s.kind === "verso");
const fullPair = (spread: readonly Spec[]) => spread.length === 2 && spread.every((s) => s.kind === "full" || s.kind === "tall");

/**
 * Titelbild ohne eigene Wahl: zuerst unter den Fotos mit Stern, sonst unter allen;
 * darin der farbigste Hochformat-Abzug (er erscheint im Buch trotzdem).
 */
export function pickCover(photos: AutoPhoto[]): string {
  const starred = photos.filter((p) => p.star);
  const pool = starred.length ? starred : photos;
  return [...pool].filter((p) => !isLandscape(p)).sort((a, b) => chroma(b) - chroma(a))[0]?.key ?? pool[0]?.key;
}

/** Buch aus losen Fotos: Gruppen bilden, Layouts im Rhythmus wählen, Einband bestimmen */
export function autoSequence(photos: AutoPhoto[]): { spreads: SpreadDraft[]; coverKey: string } {
  const byKey = new Map(photos.map((p) => [p.key, p]));
  const rest = [...photos].sort((a, b) => (a.taken ?? "").localeCompare(b.taken ?? ""));
  const coverKey = pickCover(photos);

  const groups: string[][] = [];
  let acrossUsed = 0;
  while (rest.length) {
    const a = rest.shift()!;
    // wichtige Fotos bekommen eine Doppelseite für sich und damit die größte Fläche
    if (a.star) {
      groups.push([a.key]);
      continue;
    }
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
    const window = rest.filter((p) => !p.star).slice(0, 3);
    if (!window.length) {
      groups.push([a.key]);
      continue;
    }
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
    if (keys.length === 1) {
      // ein Foto allein (wichtig, Querformat über den Bund, das letzte übrige): immer die erste Variante,
      // groß über den Bund oder randlos neben der leeren Seite. Die anderen lassen eine Seite ohne Grund leer.
      pick = 0;
    } else if (allowed.length) {
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
    spreads.push({ id: spreadId(), keys, layout: pick });
  }
  return { spreads, coverKey };
}

/**
 * Neu gestalten, ohne Entschiedenes anzufassen: fixierte Doppelseiten und Textseiten bleiben an ihrem Platz,
 * nur die Fotos der freien Doppelseiten (und neue Fotos) werden neu verteilt.
 */
export function relayoutFree(
  spreads: SpreadDraft[],
  photos: AutoPhoto[],
  shelved: Set<string>,
): { spreads: SpreadDraft[]; coverKey: string } {
  const keep = (s: SpreadDraft) => s.pinned || s.text || s.pages;
  const fixed = new Set(spreads.filter(keep).flatMap((s) => s.keys));
  const free = photos.filter((p) => !fixed.has(p.key) && !shelved.has(p.key));
  const auto = autoSequence(free);
  const out: SpreadDraft[] = [];
  let next = 0;
  for (const s of spreads) {
    if (keep(s)) out.push(s);
    // die Doppelseite behält ihre id, damit Auswahl und Liste beim Neuverteilen nicht springen
    else if (next < auto.spreads.length) out.push({ ...auto.spreads[next++], id: s.id ?? spreadId() });
  }
  while (next < auto.spreads.length) out.push(auto.spreads[next++]);
  return { spreads: out, coverKey: auto.coverKey };
}
