import { colWidth, typeArea, type FreeItem, type TextLook } from "@/content/books";
import { textHeight } from "@/content/layout";
import { spreadId, type PageDraft, type SpreadDraft } from "@/lib/auto-sequence";
import { itemId, type Geom } from "@/lib/free-layout";

// Tagesseite (Journaling-Workshop 9.10.2026, journaling-workshop-2026-10-09/workshop.md): „Fertig für heute“ legt den
// Tag nicht als Katalogseite ins Buch, sondern wie eingeklebt. Links das Datum von Hand und was man zum Tag geschrieben
// hat, darunter das schönste Foto; rechts bis zu drei weitere, versetzt, jedes mit seinem Satz daneben und einem
// Klebestreifen über einer Ecke. Alles sind gewöhnliche Elemente einer freien Doppelseite: auf der Bühne bleibt jedes
// davon verschiebbar. Was nicht auf die Tagesseite passt, legt die Automatik ruhig dahinter.

/** so viele Fotos liegen auf der Tagesseite, eins links, drei rechts */
export const DAY_PAGE_PHOTOS = 4;
/** so lang darf der Text zum Tag sein, damit links noch ein Foto Platz hat */
export const STORY_MAX = 280;

export type DayPhoto = { key: string; w: number; h: number; title?: string };

const hand = (size: number): TextLook => ({ font: "hand", size, bold: false });
const HEAD = hand(8);
const STORY = hand(4.2);
const NOTE = hand(3.8);
/** kleiner als das wird das Foto unter dem Text nicht; sonst geht es mit nach rechts */
const MIN_LEAD = 28;
const GAP = 5;

/** Foto in einen Rahmen einpassen, Seitenverhältnis bleibt (cqw) */
const fit = (p: DayPhoto, maxW: number, maxH: number) => {
  const w = Math.min(maxW, (maxH * p.w) / p.h);
  return { w, h: (w * p.h) / p.w };
};

/**
 * Die Tagesseite als freie Doppelseite. lead ist das schönste Foto, others die übrigen der Seite (höchstens drei) in
 * der Reihenfolge der Aufnahme. tape ist die Farbe der Klebestreifen (das Leinen des Buchs, wie auf der Bühne).
 */
export function dayPage(g: Geom & { tape: string }, heading: string, story: string, lead: DayPhoto, others: DayPhoto[]): SpreadDraft {
  const H = g.aspect * 100;
  const pct = (v: number) => (v / H) * 100;
  const left: FreeItem[] = [];
  const right: FreeItem[] = [];
  const tapes: [FreeItem[], FreeItem[]] = [[], []];

  const photo = (to: FreeItem[], p: DayPhoto, x: number, y: number, w: number, h: number) =>
    to.push({ t: "photo", id: itemId(), key: p.key, box: { x, y: pct(y), w, h: pct(h) }, caption: "off" });
  const text = (to: FreeItem[], s: string, role: "heading" | "body" | "note", look: TextLook, x: number, y: number, w: number) => {
    const h = textHeight(s, role, w, look);
    to.push({ t: "text", id: itemId(), text: s, role, look, box: { x, y: pct(y), w, h: pct(h) } });
    return h;
  };
  /** Klebestreifen schräg über eine obere Ecke des Fotos */
  const tape = (page: 0 | 1, x: number, y: number, w: number, corner: "l" | "r") =>
    tapes[page].push({
      t: "shape",
      id: itemId(),
      kind: "tape",
      look: { color: g.tape, weight: 2 },
      ...(corner === "l" ? { from: "bl" as const, box: { x: x - 4, y: pct(y - 3), w: 10, h: pct(7) } } : { from: "tl" as const, box: { x: x + w - 6, y: pct(y - 3), w: 10, h: pct(7) } }),
    });
  const noteH = (s: string | undefined, w: number) => (s ? textHeight(s, "note", w, NOTE) : 0);

  // links: Datum, Text zum Tag, darunter das schönste Foto, wenn rechts noch etwas liegt und Platz bleibt
  const la = typeArea(g, "left");
  let y = la.y;
  y += text(left, heading, "heading", HEAD, la.x, y, la.w) + 3;
  const s = story.trim().slice(0, STORY_MAX);
  if (s) y += text(left, s, "body", STORY, la.x, y, Math.min(la.w, 74)) + GAP;
  const leadNoteW = colWidth(4);
  const room = la.y + la.h - y - (lead.title ? noteH(lead.title, leadNoteW) + 3 : 0);
  const onRight = others.length === 0 || room < MIN_LEAD ? [lead, ...others].slice(0, 3) : others.slice(0, 3);
  if (onRight[0] !== lead) {
    const { w, h } = fit(lead, colWidth(5), room);
    const x = la.x + Math.round((la.w - w) * 0.3);
    photo(left, lead, x, y, w, h);
    tape(0, x, y, w, "l");
    if (lead.title) text(left, lead.title, "note", NOTE, x, y + h + 2.5, Math.max(w, leadNoteW));
  }

  // rechts: untereinander, abwechselnd links und rechts im Satzspiegel, der Satz steht neben seinem Foto
  const ra = typeArea(g, "right");
  const n = onRight.length;
  const slot = (ra.h - (n - 1) * GAP) / n;
  onRight.forEach((p, i) => {
    const top = ra.y + i * (slot + GAP);
    const { w, h } = fit(p, p.title ? ra.w - 26 : colWidth(5), slot);
    const atLeft = i % 2 === 0;
    const x = atLeft ? ra.x : ra.x + ra.w - w;
    const py = top + (slot - h) / 2;
    photo(right, p, x, py, w, h);
    tape(1, x, py, w, atLeft ? "r" : "l");
    if (p.title) {
      const nw = ra.w - w - 4;
      const nx = atLeft ? x + w + 4 : ra.x;
      text(right, p.title, "note", NOTE, nx, Math.max(top, py + h - noteH(p.title, nw)), nw);
    }
  });

  // Klebestreifen liegen über den Fotos
  const pages: [PageDraft, PageDraft] = [{ items: [...left, ...tapes[0]] }, { items: [...right, ...tapes[1]] }];
  const keys = [...new Set(pages.flatMap((pg) => pg.items.flatMap((it) => (it.t === "photo" ? [it.key] : []))))];
  return { id: spreadId(), keys, layout: 0, pinned: true, pages };
}

/** Welche Fotos auf die Tagesseite kommen: das schönste, dann bevorzugt die mit einem Satz, sonst die ersten des Tages */
export function pickForPage<P extends DayPhoto & { taken?: string }>(photos: P[], leadKey: string): { lead: P; others: P[] } {
  const lead = photos.find((p) => p.key === leadKey) ?? photos[0];
  const rest = photos.filter((p) => p !== lead);
  const chosen = [...rest.filter((p) => p.title?.trim()), ...rest.filter((p) => !p.title?.trim())].slice(0, DAY_PAGE_PHOTOS - 1);
  const others = rest.filter((p) => chosen.includes(p)).sort((a, b) => (a.taken ?? "").localeCompare(b.taken ?? ""));
  return { lead, others };
}
