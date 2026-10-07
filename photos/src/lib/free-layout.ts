import { plateOf, type BookData, type Box, type FreeItem, type TextRole } from "@/content/books";
import { gridLines, layoutPage, textHeight } from "@/content/layout";
import type { PageDraft, SpreadDraft } from "@/lib/auto-sequence";

// Freie Doppelseiten (Editor V2, docs/editor-workshop.md):
// Gespeichert wird pro Seite in Prozent der Seite. Bearbeitet wird auf der ganzen Doppelseite:
// x läuft dort von 0 bis 200 (linke Seite 0–100, rechte 100–200), y bleibt in % der Seitenhöhe.
// Ein Foto oder Text über den Bund wird beim Speichern zu zwei Hälften mit derselben pairId.

export type Geom = Pick<BookData, "aspect" | "bottom">;
/** Element auf der Doppelseite: x in 0..200 */
export type SpreadItem = FreeItem;

export const MAX_PHOTOS_PER_PAGE = 4;

export const itemId = () => Math.random().toString(36).slice(2, 10);

/** Aus der Variante, die gerade zu sehen ist, freie Elemente machen; sieht danach genauso aus */
export function materialize(data: BookData, spreadIndex: number): [PageDraft, PageDraft] {
  const sp = data.spreads[spreadIndex + 1];
  const H = data.aspect * 100;
  const pages: [PageDraft, PageDraft] = [{ items: [] }, { items: [] }];
  if (!sp) return pages;
  const pairs = new Map<string, string>();
  (["left", "right"] as const).forEach((side, pi) => {
    const page = side === "left" ? sp.left : sp.right;
    const layout = layoutPage(data, page, side);
    for (const el of layout.els) {
      if (el.t === "img" && el.plate) {
        const key = plateOf(data, el.no).key;
        const acrossBund = el.w > 100;
        let pairId: string | undefined;
        if (acrossBund) {
          pairId = pairs.get(key) ?? itemId();
          pairs.set(key, pairId);
        }
        pages[pi].items.push({
          t: "photo",
          id: itemId(),
          key,
          box: { x: el.x, y: (el.y / H) * 100, w: el.w, h: (el.h / H) * 100 },
          crop: { focus: el.focus, zoom: el.zoom, fit: el.fit },
          caption: page.kind === "full" || acrossBund ? "off" : "auto",
          pairId,
        });
      } else if (el.t === "text" && page.kind === "text" && el.text.trim()) {
        const role: TextRole = el.display ? "heading" : "body";
        const w = el.w ?? 66;
        pages[pi].items.push({ t: "text", id: itemId(), text: el.text, role, box: { x: el.x, y: (el.y / H) * 100, w, h: (textHeight(el.text, role, w) / H) * 100 } });
      }
    }
  });
  return pages;
}

/** Seiten → Doppelseite: rechte Seite um 100 verschoben, Hälften über den Bund zu einem Element */
export function toSpread(pages: [PageDraft, PageDraft]): SpreadItem[] {
  const out: (SpreadItem & { _n: number })[] = [];
  let n = 0;
  const seenPair = new Set<string>();
  pages.forEach((p, pi) => {
    for (const it of p.items) {
      if (it.pairId) {
        if (seenPair.has(it.pairId)) continue;
        seenPair.add(it.pairId);
      }
      out.push({ ...it, box: { ...it.box, x: it.box.x + pi * 100 }, _n: n++ });
    }
  });
  // die Stapelung gilt für die ganze Doppelseite; ältere Stände ohne z behalten ihre Reihenfolge
  return out
    .sort((a, b) => (a.z ?? a._n) - (b.z ?? b._n) || a._n - b._n)
    .map(({ _n, ...it }) => {
      void _n;
      return it as SpreadItem;
    });
}

/** Doppelseite → Seiten: jedes Element auf die Seite seiner Mitte, Fotos über den Bund werden zwei Hälften */
export function fromSpread(items: SpreadItem[]): [PageDraft, PageDraft] {
  const pages: [PageDraft, PageDraft] = [{ items: [] }, { items: [] }];
  for (const [z, raw] of items.entries()) {
    const it = { ...raw, z } as SpreadItem;
    const { x, w } = it.box;
    // über den Bund: jede Seite bekommt das ganze Element und zeigt ihre Hälfte
    if (x < 99.5 && x + w > 100.5) {
      const pairId = it.pairId ?? itemId();
      pages[0].items.push({ ...it, pairId, box: { ...it.box } });
      pages[1].items.push({ ...it, id: `${it.id}-r`, pairId, box: { ...it.box, x: x - 100 } });
      continue;
    }
    const pi = x + w / 2 < 100 ? 0 : 1;
    const { pairId: _drop, ...rest } = it;
    void _drop;
    const clean = rest as FreeItem;
    pages[pi].items.push({ ...clean, box: { ...it.box, x: x - pi * 100 } });
  }
  return pages;
}

/** Fotos der Doppelseite in Lesereihenfolge, ohne doppelte Hälften */
export const keysOfPages = (pages: [PageDraft, PageDraft]) => [
  ...new Set(pages.flatMap((p) => p.items.flatMap((i) => (i.t === "photo" ? [i.key] : [])))),
];

/** Freie Doppelseite übernehmen: Fotos synchron, fixiert */
export const withPages = (s: SpreadDraft, pages: [PageDraft, PageDraft]): SpreadDraft => ({ ...s, pages, keys: keysOfPages(pages), pinned: true, text: undefined });

/** Raster beider Seiten auf der Doppelseite (x in 0..200, y in % der Seitenhöhe) */
export function spreadGrid(g: Geom) {
  const l = gridLines(g, "left");
  const r = gridLines(g, "right");
  const H = l.H;
  const pct = (v: number) => (v / H) * 100;
  return {
    H,
    cw: l.cw,
    colPitch: l.colPitch,
    rowPitch: pct(l.rowPitch),
    rowH: pct(l.rh),
    ta: [l.ta, { ...r.ta, x: r.ta.x + 100 }],
    xs: [...new Set([...l.xs, ...r.xs.map((x) => x + 100)])].sort((a, b) => a - b),
    /** Spaltenanfänge und -enden je Seite, für Aufteilungen */
    cols: [l.xs.slice(1, -1), r.xs.slice(1, -1).map((x) => x + 100)] as const,
    ys: l.ys.map(pct),
    rows: l.ys.slice(1, -1).map(pct),
  };
}

const overlap = (a: Box, b: Box) => a.x < b.x + b.w - 0.01 && b.x < a.x + a.w - 0.01 && a.y < b.y + b.h - 0.01 && b.y < a.y + a.h - 0.01;

/** Box eines Elements mit Texthöhe (Text wächst mit dem Inhalt) */
export function boxOf(it: SpreadItem, g: Geom): Box {
  if (it.t !== "text") return it.box;
  return { ...it.box, h: (textHeight(it.text, it.role, it.box.w, it.look) / (g.aspect * 100)) * 100 };
}

/** Überlappt ein Element ein anderes? Fotos nie übereinander, Text nie auf einem Foto */
export function collides(items: SpreadItem[], id: string, box: Box, g: Geom) {
  const me = items.find((i) => i.id === id);
  return items.some((o) => {
    if (o.id === id) return false;
    const b = boxOf(o, g);
    if (!overlap(box, b)) return false;
    // Text auf Text ist genauso verboten wie Foto auf Foto
    return me?.t === "text" || o.t === "photo" || me?.t === "photo";
  });
}

export const photosOnPage = (items: SpreadItem[], page: 0 | 1) =>
  items.filter((i) => i.t === "photo" && i.box.x + i.box.w / 2 >= page * 100 && i.box.x + i.box.w / 2 < page * 100 + 100).length;

/** Freien Platz für ein neues Element finden: erst unter dem Zeiger, dann Zelle für Zelle */
export function placeNew(items: SpreadItem[], g: Geom, page: 0 | 1, w: number, h: number, at?: { x: number; y: number }, id = "neu"): Box | null {
  const grid = spreadGrid(g);
  const cols = grid.cols[page].filter((_, i) => i % 2 === 0);
  const rows = grid.rows.filter((_, i) => i % 2 === 0);
  const fits = (b: Box) => b.x + b.w <= page * 100 + 100 + 0.01 && b.y + b.h <= 100.01 && !collides([...items, { t: "text", id, text: "", role: "body", box: b }], id, b, g);
  const snapStart = (v: number, list: number[]) => list.reduce((best, c) => (Math.abs(c - v) < Math.abs(best - v) ? c : best), list[0]);
  if (at) {
    const b = { x: snapStart(at.x - w / 2, cols), y: snapStart(at.y - h / 2, rows), w, h };
    if (fits(b)) return b;
  }
  for (const y of rows) for (const x of cols) if (fits({ x, y, w, h })) return { x, y, w, h };
  return null;
}

/** Foto aus einer freien Doppelseite nehmen (beide Hälften) */
export function removeKey(s: SpreadDraft, key: string): SpreadDraft {
  if (!s.pages) return s;
  const pages = s.pages.map((p) => ({ items: p.items.filter((i) => !(i.t === "photo" && i.key === key)) })) as [PageDraft, PageDraft];
  return withPages(s, pages);
}

/** Foto auf eine freie Doppelseite legen: Seite mit weniger Fotos, erste freie Zelle, 3 Spalten breit */
export function addKey(s: SpreadDraft, key: string, ratio: number, g: Geom): SpreadDraft | null {
  if (!s.pages) return null;
  const items = toSpread(s.pages);
  const pages = ([0, 1] as const).filter((p) => photosOnPage(items, p) < MAX_PHOTOS_PER_PAGE).sort((a, b) => photosOnPage(items, a) - photosOnPage(items, b));
  const grid = spreadGrid(g);
  for (const page of pages) {
    for (const cols of [3, 2]) {
      const w = cols * grid.cw + (cols - 1) * 2;
      const h = (w / ratio / grid.H) * 100;
      const box = placeNew(items, g, page, w, h);
      if (box) return withPages(s, fromSpread([...items, { t: "photo", id: itemId(), key, box, caption: "auto" }]));
    }
  }
  return null;
}
