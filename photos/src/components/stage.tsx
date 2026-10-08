"use client";

import Image from "next/image";
import { memo, useEffect, useMemo, useRef, useState, type RefObject } from "react";

import { toEl, type BookData, type Box, type Corner, type FontKey, type FreeEl, type FreeItem, type ShapeKind, type ShapeLook, type TextLook, type TextRole } from "@/content/books";
import { FONTS, TEXT_ROLE, textMetrics } from "@/content/layout";
import {
  absToStrokes,
  distToStroke,
  endpoints,
  inkPaths,
  isLinear,
  lineBox,
  PEN_SIZES,
  SHAPES,
  shapePaths,
  simplify,
  strokePath,
  strokesToAbs,
  type AbsStroke,
  type PathEl,
} from "@/content/shapes";
import { inputClass, TextButton } from "@/components/app-ui";
import { CropDialog } from "@/components/crop-dialog";
import { PageView } from "@/components/page-view";
import {
  boxOf,
  fromSpread,
  itemId,
  MAX_PHOTOS_PER_PAGE,
  photosOnPage,
  placeNew,
  spreadGrid,
  type Geom,
  type SpreadItem,
} from "@/lib/free-layout";
import type { StoredPhoto } from "@/lib/store";

// Die Bühne: eine Doppelseite groß, Fotos und Texte direkt auf der Seite bewegen, vergrößern, zuschneiden.
// Kanten rasten am Raster (6 Spalten, 9 Zeilen), an Seitenkanten, Bund und Nachbarn ein.
// Während einer Geste ändert sich nur die Vorschau; gespeichert wird beim Loslassen, also ein Rückgängig-Schritt pro Geste.

type Edges = { l?: boolean; r?: boolean; t?: boolean; b?: boolean };
type Drag = {
  id: string;
  edges: Edges | null; // null = verschieben
  sx: number;
  sy: number;
  box0: Box;
  moved: boolean;
  shift: boolean;
  /** Endpunkt einer Linie (0 Anfang, 1 Ende) statt Rahmengriff */
  end?: 0 | 1;
};

/** Werkzeug der Bühne: Auswahl, Stift, Radierer oder eine Form zum Aufziehen */
type Tool = "select" | "pen" | "eraser" | ShapeKind;
type Pt = { x: number; y: number };

const HANDLES: { e: Edges; cls: string; cursor: string; name: string }[] = [
  { e: { t: true, l: true }, cls: "left-0 top-0", cursor: "nwse-resize", name: "oben links" },
  { e: { t: true }, cls: "left-1/2 top-0", cursor: "ns-resize", name: "oben" },
  { e: { t: true, r: true }, cls: "left-full top-0", cursor: "nesw-resize", name: "oben rechts" },
  { e: { r: true }, cls: "left-full top-1/2", cursor: "ew-resize", name: "rechts" },
  { e: { b: true, r: true }, cls: "left-full top-full", cursor: "nwse-resize", name: "unten rechts" },
  { e: { b: true }, cls: "left-1/2 top-full", cursor: "ns-resize", name: "unten" },
  { e: { b: true, l: true }, cls: "left-0 top-full", cursor: "nesw-resize", name: "unten links" },
  { e: { l: true }, cls: "left-0 top-1/2", cursor: "ew-resize", name: "links" },
];

/** Zwischenablage der Bühne; bleibt über Doppelseiten hinweg, gilt für jede Art von Element */
let clipboard: { item: SpreadItem; marker: string } | null = null;
const markerOf = (it: SpreadItem) =>
  it.t === "text" ? it.text : it.t === "photo" ? `[Calima: Foto ${it.key}]` : it.t === "shape" ? `[Calima: ${SHAPES[it.kind].label}]` : "[Calima: Zeichnung]";
/** Element in die Zwischenablage legen; gibt den Text zurück, der in die Zwischenablage des Systems geht */
function remember(it: SpreadItem) {
  clipboard = { item: structuredClone(it), marker: markerOf(it) };
  return clipboard.marker;
}

const TOOL_KEYS: Record<string, Tool> = { v: "select", p: "pen", e: "eraser", l: "line", a: "arrow", r: "rect", o: "ellipse", k: "tape" };

const DEFAULT_TEXT: Record<TextRole, string> = { heading: "Überschrift", body: "Ein paar Sätze zu diesem Tag.", note: "Notiz" };

/**
 * Die Bühne ist ein Modal über der Werkbank: der Rest der Seite wird inert (weder Tab noch Klick erreichen ihn),
 * der Fokus geht beim Öffnen hinein und beim Schließen zurück auf den Auslöser (Härtetest A1).
 */
function useModal(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const muted: HTMLElement[] = [];
    for (let node: HTMLElement | null = el; node && node !== document.body; node = node.parentElement) {
      for (const sib of Array.from(node.parentElement?.children ?? [])) {
        if (sib === node || !(sib instanceof HTMLElement) || sib.inert || sib.tagName === "SCRIPT") continue;
        sib.inert = true;
        muted.push(sib);
      }
    }
    el.querySelector<HTMLElement>("[data-stage-first]")?.focus({ preventScroll: true });
    return () => {
      for (const m of muted) m.inert = false;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [ref]);
}

export function Stage({
  data,
  geom,
  index,
  items,
  photos,
  shelf,
  elsewhere,
  free,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onCommit,
  onShelve,
  onPhoto,
  onReset,
  onClose,
}: {
  data: BookData;
  geom: Geom;
  index: number;
  items: SpreadItem[];
  photos: Map<string, StoredPhoto>;
  shelf: StoredPhoto[];
  /** Fotos auf anderen Doppelseiten (Index der Doppelseite); reingezogen wandern sie hierher */
  elsewhere: { photo: StoredPhoto; spread: number }[];
  /** schon frei gestaltet (sonst ist es die automatische Variante) */
  free: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** pulled: Fotos, die von anderen Doppelseiten hierher wandern (nicht kopiert) */
  onCommit: (items: SpreadItem[], tag?: string, pulled?: string[]) => void;
  onShelve: (key: string) => void;
  onPhoto: (key: string, patch: Partial<StoredPhoto>, tag: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const grid = useMemo(() => spreadGrid(geom), [geom]);
  const [sel, setSel] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ id: string; box: Box; original: boolean; from?: Corner } | null>(null);
  const [tool, setToolState] = useState<Tool>("select");
  /** Stift: Farbe und Breite bleiben, bis man sie ändert */
  const [pen, setPen] = useState<{ c: string; s: number }>({ c: "#1b1c1a", s: PEN_SIZES[1].s });
  /** Aussehen der nächsten Form */
  const [shapeLook, setShapeLook] = useState<ShapeLook>({ color: "#1b1c1a", weight: 2 });
  /** Vorschau beim Zeichnen oder Aufziehen, in Doppelseiten-Einheiten */
  const [sketch, setSketch] = useState<{ paths: PathEl[] } | null>(null);
  const [guides, setGuides] = useState<{ xs: number[]; ys: number[] }>({ xs: [], ys: [] });
  const [gridOn, setGridOn] = useState(() => {
    try {
      return localStorage.getItem("fuji-grid") === "1";
    } catch {
      return false;
    }
  });
  /** Textrahmen, in dem gerade direkt auf der Seite geschrieben wird */
  const [editing, setEditing] = useState<string | null>(null);
  /** Kontextmenü: Rechtsklick oder langes Drücken; id null = freies Papier */
  const [menu, setMenu] = useState<{ cx: number; cy: number; id: string | null; at: { x: number; y: number } } | null>(null);
  const press = useRef<number>(0);
  const [say, setSay] = useState("");
  const [crop, setCrop] = useState<string | null>(null);
  /** Zuschneiden direkt auf der Seite (wie in PowerPoint) */
  const [cropping, setCropping] = useState<string | null>(null);
  /** Auftrag aus der Werkzeugleiste an den Zuschneide-Modus */
  const [cropMsg, setCropMsg] = useState<"done" | "cancel" | null>(null);
  const [page, setPage] = useState<0 | 1>(0);
  const [width, setWidth] = useState(0);
  const [coarse, setCoarse] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  useModal(dialog);
  const layerEl = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const textArea = useRef<HTMLTextAreaElement>(null);

  // Breite messen; schmal: eine Seite nach der anderen
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    const mq = window.matchMedia("(pointer: coarse)");
    const onMq = () => setCoarse(mq.matches);
    onMq();
    mq.addEventListener("change", onMq);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", onMq);
    };
  }, []);

  const narrow = width > 0 && width < 640;
  const vh = typeof window === "undefined" ? 900 : window.innerHeight;
  // schmal: die Seite lässt unten Platz für die Werkzeuge
  const pageW = narrow ? Math.min(width, (vh * 0.62) / data.aspect) : Math.min(width / 2, Math.max(220, (vh - 170) / data.aspect));
  const W = pageW * 2;
  const Hpx = pageW * data.aspect;
  const toUnits = (dx: number, dy: number) => ({ x: (dx / W) * 200, y: (dy / Hpx) * 100 });

  const shown = items.map((i) => (draft && i.id === draft.id ? ({ ...i, box: draft.box, ...(i.t === "shape" && draft.from ? { from: draft.from } : {}) } as SpreadItem) : i));
  const selected = shown.find((i) => i.id === sel) ?? null;
  const noOf = (key: string) => data.plates.find((p) => p.key === key)?.no;
  // Seiten nur neu setzen, wenn sich wirklich etwas ändert; beim Ziehen fehlt das gezogene Element
  // auf der Seite und bewegt sich als leichte Vorschau (DragGhost) darüber
  const draftId = draft?.id ?? null;
  const pages = useMemo(
    () =>
      fromSpread(items).map((p) => ({
        kind: "free" as const,
        items: p.items.flatMap((it): FreeEl[] => {
          if (it.id === draftId) return [];
          if (it.t === "text") return it.id === editing ? [] : [{ t: "text", text: it.text, role: it.role, box: it.box, light: it.light, look: it.look }];
          if (it.t === "shape" || it.t === "ink") return [toEl(it)];
          const no = data.plates.find((pl) => pl.key === it.key)?.no;
          if (it.id === cropping) return [];
          return no ? [{ t: "photo", no, box: it.box, crop: it.crop, caption: it.caption }] : [];
        }),
      })),
    [items, draftId, editing, cropping, data],
  );

  const commit = (next: SpreadItem[], tag?: string, message?: string, pulled?: string[]) => {
    onCommit(next, tag, pulled);
    if (message) setSay(message);
  };
  const photoRatio = (it: SpreadItem) => {
    if (it.t !== "photo") return null;
    const p = photos.get(it.key);
    return p ? p.w / p.h : null;
  };
  const realRatio = (b: Box) => b.w / ((b.h / 100) * grid.H);
  const minW = (it: SpreadItem) => (it.t === "text" ? grid.cw * 2 + 2 : it.t === "photo" ? grid.cw : 2);
  const minH = (it: SpreadItem) => (it.t === "photo" || it.t === "text" ? grid.rowH : 2);
  const where = (b: Box) => {
    const p = b.x + b.w / 2 < 100 ? 0 : 1;
    const col = grid.cols[p].filter((_, i) => i % 2 === 0).findIndex((c) => Math.abs(c - b.x) < 0.6);
    const row = grid.rows.filter((_, i) => i % 2 === 0).findIndex((r) => Math.abs(r - b.y) < 0.6);
    return `${p === 0 ? "linke" : "rechte"} Seite${col >= 0 ? `, Spalte ${col + 1}` : ""}${row >= 0 ? `, Zeile ${row + 1}` : ""}`;
  };
  const nameOf = (it: SpreadItem) =>
    it.t === "photo"
      ? `Foto ${noOf(it.key) ?? ""} ${photos.get(it.key)?.title || ""}`.trim()
      : it.t === "text"
        ? `${TEXT_ROLE[it.role].label}: ${it.text.slice(0, 30)}`
        : it.t === "shape"
          ? SHAPES[it.kind].label
          : `Zeichnung, ${it.strokes.length} ${it.strokes.length === 1 ? "Strich" : "Striche"}`;

  // ---- Einrasten ----
  const thX = (8 / W) * 200;
  const thY = (8 / Hpx) * 100;
  const targets = (id: string) => {
    const others = items.filter((i) => i.id !== id).map((i) => boxOf(i, geom));
    return {
      xs: [...grid.xs, ...others.flatMap((b) => [b.x, b.x + b.w])],
      ys: [...grid.ys, ...others.flatMap((b) => [b.y, b.y + b.h])],
    };
  };
  const nearest = (v: number, list: number[], th: number) => {
    let best: number | null = null;
    for (const t of list) if (Math.abs(t - v) <= th && (best === null || Math.abs(t - v) < Math.abs(best - v))) best = t;
    return best;
  };

  function moveBox(it: SpreadItem, b0: Box, dx: number, dy: number, free: boolean) {
    const b = { ...b0, x: b0.x + dx, y: b0.y + dy };
    const gx: number[] = [];
    const gy: number[] = [];
    if (!free) {
      const t = targets(it.id);
      const h = boxOf({ ...it, box: b }, geom).h;
      const cands = [
        { edge: b.x, off: 0 },
        { edge: b.x + b.w, off: b.w },
      ].map((c) => ({ ...c, t: nearest(c.edge, t.xs, thX) }));
      const bx = cands.filter((c) => c.t !== null).sort((a, c) => Math.abs(a.t! - a.edge) - Math.abs(c.t! - c.edge))[0];
      if (bx) {
        b.x = bx.t! - bx.off;
        gx.push(bx.t!);
      }
      const ys = [
        { edge: b.y, off: 0 },
        { edge: b.y + h, off: h },
      ].map((c) => ({ ...c, t: nearest(c.edge, t.ys, thY) }));
      const by = ys.filter((c) => c.t !== null).sort((a, c) => Math.abs(a.t! - a.edge) - Math.abs(c.t! - c.edge))[0];
      if (by) {
        b.y = by.t! - by.off;
        gy.push(by.t!);
      }
    }
    b.x = Math.min(200 - Math.min(b.w, 200), Math.max(0, b.x));
    b.y = Math.min(100 - Math.min(b.h, 100), Math.max(0, b.y));
    return { box: b, xs: gx, ys: gy, original: false };
  }

  function resizeBox(it: SpreadItem, b0: Box, e: Edges, dx: number, dy: number, keepRatio: boolean) {
    let l = b0.x;
    let r = b0.x + b0.w;
    let t = b0.y;
    let bt = b0.y + b0.h;
    if (e.l) l += dx;
    if (e.r) r += dx;
    if (e.t) t += dy;
    if (e.b) bt += dy;
    const tg = targets(it.id);
    const gx: number[] = [];
    const gy: number[] = [];
    const snapX = (v: number) => {
      const n = nearest(v, tg.xs, thX);
      if (n === null) return v;
      gx.push(n);
      return n;
    };
    const snapY = (v: number) => {
      const n = nearest(v, tg.ys, thY);
      if (n === null) return v;
      gy.push(n);
      return n;
    };
    if (e.l) l = snapX(l);
    if (e.r) r = snapX(r);
    if (e.t) t = snapY(t);
    if (e.b) bt = snapY(bt);
    // Mindestgröße: eine Spalte, eine Zeile
    if (r - l < minW(it)) {
      if (e.l) l = r - minW(it);
      else r = l + minW(it);
    }
    if (bt - t < minH(it)) {
      if (e.t) t = bt - minH(it);
      else bt = t + minH(it);
    }
    let box = { x: l, y: t, w: r - l, h: bt - t };
    let original = false;
    // Originalformat ist ein Magnet; Shift hält das Seitenverhältnis fest
    const ratio = keepRatio ? realRatio(b0) : photoRatio(it);
    const corner = (e.l || e.r) && (e.t || e.b);
    if (ratio && (corner || keepRatio)) {
      const cur = realRatio(box);
      if (keepRatio || Math.abs(cur / ratio - 1) < 0.07) {
        const h = (box.w / ratio / grid.H) * 100;
        box = e.t ? { ...box, y: box.y + box.h - h, h } : { ...box, h };
        original = !keepRatio;
        // die angepasste Kante liegt nicht mehr auf der Einrastlinie
        gy.length = 0;
      }
    }
    box.x = Math.max(0, box.x);
    box.y = Math.max(0, box.y);
    box.w = Math.min(box.w, 200 - box.x);
    box.h = Math.min(box.h, 100 - box.y);
    return { box, xs: gx, ys: gy, original };
  }

  /** Punkt einrasten (Raster, Kanten, Nachbarn); Shift: Winkel in 45°-Schritten um den Anker */
  function snapPoint(id: string, p: Pt, anchor: Pt | null, shift: boolean, free: boolean) {
    const gx: number[] = [];
    const gy: number[] = [];
    let q = { ...p };
    if (shift && anchor) {
      // in echten Längen rechnen: y ist % der Seitenhöhe
      const k = grid.H / 100;
      const vx = q.x - anchor.x;
      const vy = (q.y - anchor.y) * k;
      const ang = Math.round(Math.atan2(vy, vx) / (Math.PI / 4)) * (Math.PI / 4);
      const len = Math.hypot(vx, vy);
      q = { x: anchor.x + Math.cos(ang) * len, y: anchor.y + (Math.sin(ang) * len) / k };
    } else if (!free) {
      const t = targets(id);
      const nx = nearest(q.x, t.xs, thX);
      const ny = nearest(q.y, t.ys, thY);
      if (nx !== null) gx.push((q.x = nx));
      if (ny !== null) gy.push((q.y = ny));
    }
    q.x = Math.min(200, Math.max(0, q.x));
    q.y = Math.min(100, Math.max(0, q.y));
    return { p: q, xs: gx, ys: gy };
  }

  /** Endpunkt einer Linie ziehen; der andere bleibt stehen */
  function moveEnd(it: Extract<SpreadItem, { t: "shape" }>, b0: Box, end: 0 | 1, dx: number, dy: number, shift: boolean, free: boolean) {
    const ends = endpoints(b0, it.from);
    const fixed = ends[1 - end];
    const s = snapPoint(it.id, { x: ends[end].x + dx, y: ends[end].y + dy }, fixed, shift, free);
    const lb = end === 0 ? lineBox(s.p, fixed) : lineBox(fixed, s.p);
    return { box: lb.box, from: lb.from, xs: s.xs, ys: s.ys, original: false };
  }

  // ---- Zeiger ----
  const startDrag = (e: React.PointerEvent, it: SpreadItem, edges: Edges | null, end?: 0 | 1) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const wasSelected = sel === it.id;
    setSel(it.id);
    if (editing && editing !== it.id) setEditing(null);
    // Touch: langes Drücken öffnet das Menü; erst antippen, dann ziehen, so verschiebt Scrollen nichts aus Versehen
    if (e.pointerType === "touch" && !edges) {
      const { clientX, clientY } = e;
      window.clearTimeout(press.current);
      press.current = window.setTimeout(() => {
        drag.current = null;
        setDraft(null);
        openMenu(clientX, clientY, it.id);
      }, 550);
    }
    if (e.pointerType === "touch" && !wasSelected && !edges) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id: it.id, edges, end, sx: e.clientX, sy: e.clientY, box0: boxOf(it, geom), moved: false, shift: e.shiftKey };
  };
  const frame = useRef(0);
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    // höchstens einmal pro Bild rechnen
    const { clientX, clientY, shiftKey, altKey } = e;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => moveTo(clientX, clientY, shiftKey, altKey));
  };
  /** letzte Zeigerlage; beim Loslassen zählt sie, auch wenn ihr Bild noch nicht gezeichnet war */
  const last = useRef<{ clientX: number; clientY: number; shiftKey: boolean; altKey: boolean } | null>(null);
  const compute = (clientX: number, clientY: number, shiftKey: boolean, altKey: boolean) => {
    const d = drag.current;
    if (!d) return null;
    const it = items.find((i) => i.id === d.id);
    if (!it) return null;
    if (!d.moved && Math.hypot(clientX - d.sx, clientY - d.sy) < 3) return null;
    d.moved = true;
    window.clearTimeout(press.current);
    const u = toUnits(clientX - d.sx, clientY - d.sy);
    if (d.end !== undefined && it.t === "shape") {
      const r = moveEnd(it, d.box0, d.end, u.x, u.y, shiftKey, altKey);
      return { it, r, box: r.box, from: r.from };
    }
    const r = d.edges ? resizeBox(it, d.box0, d.edges, u.x, u.y, shiftKey) : moveBox(it, d.box0, u.x, u.y, altKey);
    return { it, r, box: it.t === "text" ? { ...r.box, h: it.box.h } : r.box, from: undefined as Corner | undefined };
  };
  const moveTo = (clientX: number, clientY: number, shiftKey: boolean, altKey: boolean) => {
    last.current = { clientX, clientY, shiftKey, altKey };
    const c = compute(clientX, clientY, shiftKey, altKey);
    if (!c) return;
    setDraft({ id: c.it.id, box: c.box, original: c.r.original, from: c.from });
    setGuides({ xs: c.r.xs, ys: c.r.ys });
  };
  const onUp = (e?: React.PointerEvent) => {
    cancelAnimationFrame(frame.current);
    window.clearTimeout(press.current);
    const pt = e ? { clientX: e.clientX, clientY: e.clientY, shiftKey: e.shiftKey, altKey: e.altKey } : last.current;
    const c = pt ? compute(pt.clientX, pt.clientY, pt.shiftKey, pt.altKey) : null;
    const d = drag.current;
    drag.current = null;
    last.current = null;
    setGuides({ xs: [], ys: [] });
    setDraft(null);
    if (!d || !d.moved || !c) return;
    const next = items.map((i) => (i.id === d.id ? ({ ...i, box: c.box, ...(c.from ? { from: c.from } : {}) } as SpreadItem) : i));
    commit(next, undefined, `${nameOf(c.it)}: ${where(c.box)}`);
  };

  // ---- Neues Element: Text aus der Palette, Foto aus der Ablage ----
  const pageAt = (x: number): 0 | 1 => (x < 100 ? 0 : 1);
  const addText = (role: TextRole, p: 0 | 1, at?: { x: number; y: number }, given?: string) => {
    const cols = role === "heading" ? 6 : role === "body" ? 4 : 3;
    const w = cols * grid.cw + (cols - 1) * 2;
    const text = given?.slice(0, 1200) ?? DEFAULT_TEXT[role];
    const h = boxOf({ t: "text", id: "x", text, role, box: { x: 0, y: 0, w, h: 0 } }, geom).h;
    // an der Stelle des Zeigers, auch auf einem Foto (Ebenen); ohne Zeiger die erste freie Stelle
    const box = (at ? snapAt(p, at, w, h) : null) ?? placeNew(items, geom, p, w, h) ?? snapAt(p, { x: grid.ta[p].x, y: grid.rows[0] }, w, h);
    const id = itemId();
    commit([...items, { t: "text", id, text, role, box: { ...box, h } }], undefined, `${TEXT_ROLE[role].label} hinzugefügt: ${where(box)}. Jetzt tippen.`);
    setSel(id);
    if (!given) setEditing(id);
  };
  /** Box mit oberer linker Ecke am Raster nahe dem Zeiger, innerhalb der Seite */
  const snapAt = (p: 0 | 1, at: { x: number; y: number }, w: number, h: number): Box => {
    const cols = grid.cols[p].filter((_, i) => i % 2 === 0);
    const rows = grid.rows.filter((_, i) => i % 2 === 0);
    const near = (v: number, list: number[]) => list.reduce((b, c) => (Math.abs(c - v) < Math.abs(b - v) ? c : b), list[0]);
    const x = Math.min(near(at.x, cols), p * 100 + 100 - w);
    const y = Math.min(near(at.y, rows), 100 - h);
    return { x: Math.max(p * 100, x), y: Math.max(0, y), w, h };
  };
  const addPhoto = (key: string, p: 0 | 1, at?: { x: number; y: number }) => {
    const photo = photos.get(key);
    if (!photo) return;
    if (items.some((i) => i.t === "photo" && i.key === key)) return setSay("Das Foto liegt schon auf dieser Doppelseite.");
    const order: (0 | 1)[] = [p, (1 - p) as 0 | 1];
    for (const pg of order) {
      if (photosOnPage(items, pg) >= MAX_PHOTOS_PER_PAGE) continue;
      for (const cols of [3, 2]) {
        const w = cols * grid.cw + (cols - 1) * 2;
        const h = (w / (photo.w / photo.h) / grid.H) * 100;
        // erst eine freie Stelle; ist keine frei, an den Zeiger (liegt dann obenauf)
        const box = placeNew(items, geom, pg, w, h, pg === p ? at : undefined) ?? (pg === p && at && cols === 2 ? snapAt(pg, at, w, h) : null);
        if (box) {
          const id = itemId();
          commit([...items, { t: "photo", id, key, box, caption: "auto" }], undefined, `Foto hinzugefügt: ${where(box)}`, [key]);
          setSel(id);
          return;
        }
      }
    }
    setSay(`Kein Platz frei. Höchstens ${MAX_PHOTOS_PER_PAGE} Fotos pro Seite; sonst erst eine Aufteilung wählen oder ein Foto verkleinern.`);
  };
  const pointOf = (clientX: number, clientY: number) => {
    const r = layerEl.current!.getBoundingClientRect();
    return toUnits(clientX - r.left, clientY - r.top);
  };

  // ---- Zeichnen: Stift, Radierer, Formen aufziehen ----
  // Stift-Striche landen in einer Zeichnung, solange der Stift gewählt bleibt; jeder Strich ist ein Rückgängig-Schritt.
  const sketchRef = useRef<
    | { kind: "pen"; pts: [number, number, number][]; pen: boolean }
    | { kind: "shape"; shape: ShapeKind; a: Pt; b: Pt; sx: number; sy: number; moved: boolean }
    | { kind: "erase"; tag: string }
    | null
  >(null);
  /** Hat dieses Gerät einen Stift gemeldet? Dann zeichnet der Finger nicht (Handballen auf dem iPad) */
  const penSeen = useRef(false);
  const inkTarget = useRef<string | null>(null);
  const sketchFrame = useRef(0);
  const setTool = (t: Tool) => {
    inkTarget.current = null;
    sketchRef.current = null;
    setSketch(null);
    setToolState(t);
    if (t !== "select") {
      setSel(null);
      setEditing(null);
      setSay(t === "pen" ? "Stift: auf der Seite zeichnen. Esc beendet." : t === "eraser" ? "Radierer: über Striche wischen." : `${SHAPES[t].label}: auf der Seite aufziehen.`);
    }
  };
  /** Punkt in cqw der Doppelseite (x 0..200, y in cqw) */
  const cqOf = (p: Pt): [number, number] => [p.x, (p.y / 100) * grid.H];
  const pressureOf = (e: PointerEvent | React.PointerEvent, isPen: boolean) => (isPen ? Math.max(0.05, e.pressure || 0.5) : 0.5);

  const shapeBox = (sk: { shape: ShapeKind; a: Pt; b: Pt }, square: boolean): { box: Box; from?: Corner } => {
    if (isLinear(sk.shape)) return lineBox(sk.a, sk.b);
    const a = sk.a;
    let b = sk.b;
    if (square) {
      // gleiche echte Breite und Höhe: Quadrat, Kreis
      const k = grid.H / 100;
      const side = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y) * k);
      b = { x: a.x + Math.sign(b.x - a.x || 1) * side, y: a.y + (Math.sign(b.y - a.y || 1) * side) / k };
    }
    return { box: { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) } };
  };
  const lookFor = (k: ShapeKind): ShapeLook => (k === "tape" ? { color: data.cloth.base, weight: 2 } : shapeLook);

  const previewSketch = () => {
    cancelAnimationFrame(sketchFrame.current);
    sketchFrame.current = requestAnimationFrame(() => {
      const sk = sketchRef.current;
      if (!sk || sk.kind === "erase") return setSketch(null);
      if (sk.kind === "pen") {
        const abs: AbsStroke = { c: pen.c, s: pen.s, pen: sk.pen || undefined, pts: sk.pts.map(([x, y, p]) => [...cqOf({ x, y }), p] as [number, number, number]) };
        return setSketch({ paths: [strokePath(abs)] });
      }
      const { box, from } = shapeBox(sk, sk.moved && !!last.current?.shiftKey);
      setSketch({ paths: shapePaths(sk.shape, box, lookFor(sk.shape), from, grid.H) });
    });
  };

  const eraseAt = (p: Pt, tag: string) => {
    const [x, y] = cqOf(p);
    const r = coarse ? 2.4 : 1.4;
    let changed = false;
    const next = items.flatMap((it): SpreadItem[] => {
      if (it.t !== "ink") return [it];
      const abs = strokesToAbs(it.strokes, it.box, grid.H);
      const keep = abs.filter((st) => distToStroke(st, x, y) > r + st.s / 2);
      if (keep.length === abs.length) return [it];
      changed = true;
      if (!keep.length) return [];
      const { box, strokes } = absToStrokes(keep, grid.H);
      return [{ ...it, box, strokes }];
    });
    if (changed) commit(next, tag, "Strich radiert");
  };

  const onDrawDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.pointerType === "pen") penSeen.current = true;
    // Handballen: hat das Gerät einen Stift, zeichnet der Finger nicht
    else if (e.pointerType === "touch" && penSeen.current && (tool === "pen" || tool === "eraser")) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = pointOf(e.clientX, e.clientY);
    last.current = { clientX: e.clientX, clientY: e.clientY, shiftKey: e.shiftKey, altKey: e.altKey };
    if (tool === "pen") {
      const isPen = e.pointerType === "pen";
      sketchRef.current = { kind: "pen", pts: [[p.x, p.y, pressureOf(e, isPen)]], pen: isPen };
      previewSketch();
    } else if (tool === "eraser") {
      const tag = `erase-${itemId()}`;
      sketchRef.current = { kind: "erase", tag };
      eraseAt(p, tag);
    } else if (tool !== "select") {
      const a = snapPoint("neu", p, null, false, e.altKey).p;
      sketchRef.current = { kind: "shape", shape: tool, a, b: a, sx: e.clientX, sy: e.clientY, moved: false };
    }
  };
  const onDrawMove = (e: React.PointerEvent) => {
    const sk = sketchRef.current;
    if (!sk) return;
    last.current = { clientX: e.clientX, clientY: e.clientY, shiftKey: e.shiftKey, altKey: e.altKey };
    if (sk.kind === "pen") {
      // alle Zwischenpunkte, die der Browser zwischen zwei Bildern gesammelt hat (Apple Pencil liefert sonst wenige)
      const evs = (e.nativeEvent.getCoalescedEvents?.() ?? []) as PointerEvent[];
      for (const ev of evs.length ? evs : [e.nativeEvent]) {
        const q = pointOf(ev.clientX, ev.clientY);
        sk.pts.push([q.x, q.y, pressureOf(ev, sk.pen)]);
      }
      previewSketch();
    } else if (sk.kind === "erase") {
      eraseAt(pointOf(e.clientX, e.clientY), sk.tag);
    } else {
      if (!sk.moved && Math.hypot(e.clientX - sk.sx, e.clientY - sk.sy) < 4) return;
      sk.moved = true;
      const s = snapPoint("neu", pointOf(e.clientX, e.clientY), isLinear(sk.shape) ? sk.a : null, e.shiftKey && isLinear(sk.shape), e.altKey);
      sk.b = s.p;
      setGuides({ xs: s.xs, ys: s.ys });
      previewSketch();
    }
  };
  const onDrawUp = () => {
    const sk = sketchRef.current;
    sketchRef.current = null;
    cancelAnimationFrame(sketchFrame.current);
    setSketch(null);
    setGuides({ xs: [], ys: [] });
    if (!sk || sk.kind === "erase") return;
    if (sk.kind === "pen") return finishStroke(sk.pts, sk.pen);
    // ein Klick ohne Ziehen legt die Form in Standardgröße hin
    let shape: { box: Box; from?: Corner };
    if (!sk.moved) {
      const w = grid.cw * 2 + 2;
      if (isLinear(sk.shape)) shape = lineBox(sk.a, { x: Math.min(200, sk.a.x + w * 1.5), y: sk.a.y });
      else shape = { box: { x: Math.min(sk.a.x, 200 - w), y: Math.min(sk.a.y, 100 - (w / grid.H) * 100), w, h: (w / grid.H) * 100 } };
    } else shape = shapeBox(sk, !!last.current?.shiftKey);
    const id = itemId();
    commit([...items, { t: "shape", id, kind: sk.shape, box: shape.box, look: lookFor(sk.shape), ...(shape.from && shape.from !== "tl" ? { from: shape.from } : {}) }], undefined, `${SHAPES[sk.shape].label} hinzugefügt: ${where(shape.box)}`);
    // wie in Keynote und PowerPoint: nach dem Aufziehen zurück zur Auswahl, die neue Form ist gewählt
    setToolState("select");
    setSel(id);
  };
  const finishStroke = (raw: [number, number, number][], isPen: boolean) => {
    const pts = raw.map(([x, y, p]) => [...cqOf({ x, y }), p] as [number, number, number]);
    // vereinfachen: Toleranz etwa ein Zehntel cqw, das sieht man nicht, spart aber die Hälfte der Punkte
    const simple = simplify(pts, 0.06);
    if (simple.length === 1) simple.push([simple[0][0] + 0.01, simple[0][1], simple[0][2]]);
    const stroke: AbsStroke = { c: pen.c, s: pen.s, ...(isPen ? { pen: true as const } : {}), pts: simple };
    const target = items.find((i) => i.id === inkTarget.current && i.t === "ink");
    if (target && target.t === "ink") {
      const { box, strokes } = absToStrokes([...strokesToAbs(target.strokes, target.box, grid.H), stroke], grid.H);
      commit(items.map((i) => (i.id === target.id ? { ...target, box, strokes } : i)), undefined, `Strich ${strokes.length}`);
    } else {
      const id = itemId();
      inkTarget.current = id;
      const { box, strokes } = absToStrokes([stroke], grid.H);
      commit([...items, { t: "ink", id, box, strokes }], undefined, "Zeichnung begonnen");
    }
  };
  const pathsOf = (it: SpreadItem): PathEl[] =>
    it.t === "shape" ? shapePaths(it.kind, it.box, it.look, it.from, grid.H) : it.t === "ink" ? inkPaths(it.strokes, it.box, grid.H) : [];
  const setShapeOf = (id: string, patch: Partial<ShapeLook>, tag?: string) => {
    // die zuletzt gewählte Kontur, Fläche und Stärke gelten auch für die nächste Form
    if (items.find((i) => i.id === id && i.t === "shape" && i.kind !== "tape")) setShapeLook((l) => ({ ...l, ...patch }));
    commit(items.map((i) => (i.id === id && i.t === "shape" ? { ...i, look: { ...i.look, ...patch } } : i)), tag);
  };

  // ---- Tastatur auf einem Element ----
  const onItemKey = (e: KeyboardEvent | React.KeyboardEvent, it: SpreadItem) => {
    const step = { x: grid.colPitch, y: grid.rowPitch };
    const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const a = arrows[e.key];
    if (a) {
      e.preventDefault();
      // Linien haben Endpunkte statt Größe
      if (e.shiftKey && it.t === "shape" && isLinear(it.kind)) return;
      const b = it.box;
      const box = e.shiftKey
        ? { ...b, w: Math.max(minW(it), b.w + a[0] * step.x), h: it.t === "text" ? b.h : Math.max(minH(it), b.h + a[1] * step.y) }
        : { ...b, x: Math.min(200 - b.w, Math.max(0, b.x + a[0] * step.x)), y: Math.min(100 - b.h, Math.max(0, b.y + a[1] * step.y)) };
      commit(
        items.map((i) => (i.id === it.id ? { ...i, box } : i)),
        `key-${it.id}`,
        e.shiftKey ? `Größe ${Math.round(box.w)} × ${Math.round(box.h)}` : where(box),
      );
    } else if ((e.metaKey || e.ctrlKey) && (e.key === "]" || e.key === "[")) {
      e.preventDefault();
      layer(it.id, e.key === "]" ? (e.shiftKey ? "front" : "up") : e.shiftKey ? "back" : "down");
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      remove(it);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (it.t === "photo") setCropping(it.id);
      else if (it.t === "text") setEditing(it.id);
    }
  };
  /** Kopie eines Elements eine Rasterzelle versetzt einfügen, oben auf den Stapel */
  const paste = (src: SpreadItem, at?: { x: number; y: number }) => {
    const id = itemId();
    const b = src.box;
    const dx = b.x + b.w + grid.colPitch <= 200 ? grid.colPitch : -grid.colPitch;
    const dy = b.y + b.h + grid.rowPitch <= 100 ? grid.rowPitch : b.y >= grid.rowPitch ? -grid.rowPitch : 0;
    const box = at
      ? { ...snapAt(pageAt(at.x), at, Math.min(b.w, 100), b.h), w: b.w, h: b.h }
      : { ...b, x: Math.max(0, b.x + dx), y: Math.max(0, b.y + dy) };
    const copy = { ...src, id, box, pairId: undefined } as SpreadItem;
    commit([...items, copy], undefined, `${src.t === "photo" ? "Foto" : src.t === "text" ? "Text" : nameOf(src)} eingefügt: ${where(box)}`);
    setSel(id);
  };
  const duplicate = (it: SpreadItem) => paste(it);

  const openMenu = (cx: number, cy: number, id: string | null) => {
    if (id) setSel(id);
    setEditing(null);
    setMenu({ cx, cy, id, at: pointOf(cx, cy) });
  };
  const copyItem = (it: SpreadItem) => {
    navigator.clipboard?.writeText(remember(it)).catch(() => {});
    setSay("Kopiert");
  };
  const pasteFromMenu = async (at?: { x: number; y: number }) => {
    if (clipboard) return paste(clipboard.item, at);
    const text = await navigator.clipboard?.readText().catch(() => "");
    if (text?.trim()) addText("body", at ? pageAt(at.x) : curPage, at, text.trim());
  };
  const menuEntries = (): MenuEntry[] => {
    if (!menu) return [];
    const it = menu.id ? items.find((i) => i.id === menu.id) : undefined;
    const common: MenuEntry[] = it
      ? [
          "sep",
          { label: "Kopieren", hint: "⌘C", run: () => copyItem(it) },
          { label: "Ausschneiden", hint: "⌘X", run: () => (copyItem(it), remove(it)) },
          { label: "Duplizieren", hint: "⌘D", run: () => paste(it) },
          { label: "Einfügen", hint: "⌘V", run: () => pasteFromMenu() },
          "sep",
          { label: "Ganz nach vorn", hint: "⇧⌘]", disabled: !canLayer(it.id, "up"), run: () => layer(it.id, "front") },
          { label: "Nach vorn", hint: "⌘]", disabled: !canLayer(it.id, "up"), run: () => layer(it.id, "up") },
          { label: "Nach hinten", hint: "⌘[", disabled: !canLayer(it.id, "down"), run: () => layer(it.id, "down") },
          { label: "Ganz nach hinten", hint: "⇧⌘[", disabled: !canLayer(it.id, "down"), run: () => layer(it.id, "back") },
          "sep",
        ]
      : [];
    if (it?.t === "photo")
      return [
        { label: "Zuschneiden", hint: "Doppelklick", run: () => setCropping(it.id) },
        { label: "Ausschnitt-Dialog …", run: () => setCrop(it.id) },
        {
          label: "Unterschrift auf der Seite",
          checked: it.caption === "auto",
          run: () => commit(items.map((i) => (i.id === it.id && i.t === "photo" ? { ...i, caption: i.caption === "auto" ? "off" : "auto" } : i))),
        },
        ...common,
        { label: "Löschen (in die Ablage)", hint: "Entf", run: () => remove(it) },
      ];
    if (it?.t === "text")
      return [
        { label: "Text schreiben", hint: "Enter", run: () => setEditing(it.id) },
        ...(Object.keys(TEXT_ROLE) as TextRole[]).map(
          (r): MenuEntry => ({ label: TEXT_ROLE[r].label, checked: it.role === r, run: () => commit(items.map((i) => (i.id === it.id ? { ...i, role: r } : i))) }),
        ),
        {
          label: "Helle Schrift",
          checked: !!it.light,
          run: () => commit(items.map((i) => (i.id === it.id && i.t === "text" ? { ...i, light: i.light ? undefined : true } : i))),
        },
        ...common,
        { label: "Löschen", hint: "Entf", run: () => remove(it) },
      ];
    if (it?.t === "shape" || it?.t === "ink") return [...common.slice(1), { label: "Löschen", hint: "Entf", run: () => remove(it) }];
    const at = menu.at;
    return [
      { label: "Hier einfügen", hint: "⌘V", run: () => pasteFromMenu(at) },
      "sep",
      ...(Object.keys(TEXT_ROLE) as TextRole[]).map((r): MenuEntry => ({ label: `${TEXT_ROLE[r].label} hier`, run: () => addText(r, pageAt(at.x), at) })),
    ];
  };

  /** Ebenen: die Reihenfolge der Elemente ist die Stapelung, das letzte liegt oben */
  /** Liegt etwas über (up) bzw. unter (down) dem Element, das es überlappt? */
  const canLayer = (id: string, dir: "up" | "down") => {
    const i = items.findIndex((x) => x.id === id);
    if (i < 0) return false;
    const me = boxOf(items[i], geom);
    return items.some((o, n) => {
      if (dir === "up" ? n <= i : n >= i) return false;
      const b = boxOf(o, geom);
      return me.x < b.x + b.w && b.x < me.x + me.w && me.y < b.y + b.h && b.y < me.y + me.h;
    });
  };
  const layer = (id: string, to: "up" | "down" | "front" | "back") => {
    const i = items.findIndex((x) => x.id === id);
    if (i < 0) return;
    const me = boxOf(items[i], geom);
    const hits = (o: SpreadItem) => {
      const b = boxOf(o, geom);
      return me.x < b.x + b.w && b.x < me.x + me.w && me.y < b.y + b.h && b.y < me.y + me.h;
    };
    // vorbei am nächsten Element, das wirklich darüber oder darunter liegt; nicht überlappende zählen nicht
    let j: number;
    if (to === "front") j = items.length - 1;
    else if (to === "back") j = 0;
    else if (to === "up") j = items.findIndex((o, n) => n > i && hits(o));
    else j = items.findLastIndex((o, n) => n < i && hits(o));
    if (j < 0 || j === i) return setSay(to === "up" || to === "front" ? "Liegt schon ganz vorn." : "Liegt schon ganz hinten.");
    const next = [...items];
    const [it] = next.splice(i, 1);
    next.splice(j, 0, it);
    commit(next, undefined, to === "up" || to === "front" ? "Nach vorn gelegt" : "Nach hinten gelegt");
  };
  const remove = (it: SpreadItem) => {
    setSel(null);
    if (it.t === "photo") onShelve(it.key);
    else commit(items.filter((i) => i.id !== it.id), undefined, `${it.t === "text" ? "Text" : nameOf(it)} entfernt`);
  };

  // ⌘C / ⌘X / ⌘V; Text aus anderen Apps wird ein neuer Textrahmen
  const latest = useRef<{
    selected: SpreadItem | null;
    paste: (it: SpreadItem) => void;
    remove: (it: SpreadItem) => void;
    addTextWith: (t: string) => void;
    onItemKey: (e: KeyboardEvent, it: SpreadItem) => void;
    tool: Tool;
    setTool: (t: Tool) => void;
  }>({
    selected: null,
    tool: "select",
    setTool: () => {},
    onItemKey: () => {},
    paste: () => {},
    remove: () => {},
    addTextWith: () => {},
  });
  useEffect(() => {
    const typing = (e: Event) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    };
    const onCopy = (e: ClipboardEvent) => {
      const it = latest.current.selected;
      if (typing(e) || !it) return;
      e.clipboardData?.setData("text/plain", remember(it));
      e.preventDefault();
      setSay(e.type === "cut" ? "Ausgeschnitten" : "Kopiert");
      if (e.type === "cut") latest.current.remove(it);
    };
    const onPaste = (e: ClipboardEvent) => {
      if (typing(e)) return;
      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (clipboard && (!text || text === clipboard.marker)) {
        e.preventDefault();
        latest.current.paste(clipboard.item);
      } else if (text.trim()) {
        e.preventDefault();
        latest.current.addTextWith(text.trim());
      }
    };
    window.addEventListener("copy", onCopy);
    window.addEventListener("cut", onCopy);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("copy", onCopy);
      window.removeEventListener("cut", onCopy);
      window.removeEventListener("paste", onPaste);
    };
  }, []);

  // Esc: erst Auswahl, dann Bühne; G: Raster
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (cropping) return;
      if (e.key === "Escape" && !crop) {
        if (latest.current.tool !== "select") latest.current.setTool("select");
        else if (editing) setEditing(null);
        else if (sel) setSel(null);
        else onClose();
      } else if (latest.current.selected && /^(Delete|Backspace|Arrow(Left|Right|Up|Down)|\[|\])$/.test(e.key) && !(t && (t.tagName === "SELECT" || t.getAttribute("role") === "menuitem"))) {
        // Entf legt in die Ablage, Pfeile verschieben; gilt für das Gewählte, egal wo der Fokus steht
        latest.current.onItemKey(e, latest.current.selected);
      } else if (e.key === "Enter" && latest.current.selected && (t === document.body || !!t?.closest("[data-stage-layer]"))) {
        latest.current.onItemKey(e, latest.current.selected);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d" && latest.current.selected) {
        e.preventDefault();
        latest.current.paste(latest.current.selected);
      } else if (!crop && !e.metaKey && !e.ctrlKey && !e.altKey && TOOL_KEYS[e.key.toLowerCase()]) {
        // Werkzeuge wie in Keynote und Figma: V Auswahl, P Stift, E Radierer, L A R O K Formen
        e.preventDefault();
        const next = TOOL_KEYS[e.key.toLowerCase()];
        latest.current.setTool(latest.current.tool === next ? "select" : next);
      } else if (e.key.toLowerCase() === "g" && !e.metaKey && !e.ctrlKey) {
        setGridOn((g) => {
          try {
            localStorage.setItem("fuji-grid", g ? "0" : "1");
          } catch {}
          return !g;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, crop, cropping, onClose, sel]);

  const curPage: 0 | 1 = selected ? pageAt(selected.box.x + selected.box.w / 2) : narrow ? page : 0;
  useEffect(() => {
    latest.current = { selected, paste, remove, onItemKey, addTextWith: (t: string) => addText("body", curPage, undefined, t), tool, setTool };
  });
  const handle = coarse ? 44 : 24;
  const pct = (b: Box) => ({ left: `${b.x / 2}%`, top: `${b.y}%`, width: `${b.w / 2}%`, height: `${b.h}%` });
  const cropItem = crop ? items.find((i) => i.id === crop) : undefined;
  const editItem = editing ? shown.find((i) => i.id === editing && i.t === "text") : undefined;
  const setTextOf = (id: string, text: string) =>
    commit(items.map((i) => (i.id === id && i.t === "text" ? { ...i, text: text.slice(0, 1200) } : i)), `text-${id}`);
  /** Schrift des Textfelds auf der Seite: genau wie im Buch gesetzt */
  const editFont = (it: Extract<FreeItem, { t: "text" }>): React.CSSProperties => {
    const st = TEXT_ROLE[it.role];
    const m = textMetrics(it.role, it.look);
    const px = (m.size * pageW) / 100;
    const display = st.display && m.font === "grotesk";
    return {
      fontSize: m.size < 3.4 ? Math.max(11, px) : px,
      fontWeight: m.weight,
      lineHeight: m.lh,
      fontFamily: FONTS[m.font].css,
      fontStyle: it.look?.italic ? "italic" : undefined,
      textAlign: it.look?.align ?? "left",
      letterSpacing: display ? "-0.035em" : undefined,
      fontVariationSettings: display ? '"wdth" 78, "opsz" 96' : undefined,
      color: it.look?.color ?? (it.light ? "var(--paper)" : st.tone === "ink2" ? "#5a5c56" : "var(--ink)"),
    };
  };
  /** Werkzeugkasten: freie Werte am Textrahmen; null löscht einen Wert (zurück zum Stil) */
  const setLook = (id: string, patch: Partial<Record<keyof TextLook, TextLook[keyof TextLook] | null>>, tag?: string) =>
    commit(
      items.map((i) => {
        if (i.id !== id || i.t !== "text") return i;
        const look: TextLook = { ...i.look };
        for (const [k, v] of Object.entries(patch)) {
          if (v === null || v === undefined) delete look[k as keyof TextLook];
          else (look as Record<string, unknown>)[k] = v;
        }
        return { ...i, look: Object.keys(look).length ? look : undefined, light: patch.color !== undefined ? undefined : i.light };
      }),
      tag,
    );
  const showGrid = gridOn || !!draft;

  return (
    <div ref={dialog} className="linen table-surface fixed inset-0 z-[600] overflow-x-hidden overflow-y-auto bg-table" role="dialog" aria-modal="true" aria-label={`Doppelseite ${index + 1} gestalten`}>
      <header className="sticky top-0 z-30 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 bg-table/95 px-4 py-4 md:px-8">
        <span className="flex items-baseline gap-5">
          <TextButton data-stage-first onClick={onClose}>
            ← Zur Übersicht
          </TextButton>
          <span className="text-on-table font-semibold">Doppelseite {index + 1}</span>
          <span className="text-on-table-2 hidden text-sm md:inline">{free ? "frei gestaltet, fixiert" : "automatisch, wird beim ersten Handgriff frei"}</span>
        </span>
        <span className="text-on-table-2 flex flex-wrap items-baseline gap-x-5 gap-y-2 text-sm">
          <TextButton disabled={!canUndo} onClick={onUndo}>
            Rückgängig
          </TextButton>
          <TextButton disabled={!canRedo} onClick={onRedo}>
            Wiederholen
          </TextButton>
          <TextButton
            aria-pressed={gridOn}
            onClick={() =>
              setGridOn((g) => {
                try {
                  localStorage.setItem("fuji-grid", g ? "0" : "1");
                } catch {}
                return !g;
              })
            }
            title="Raster zeigen (G)"
          >
            Raster {gridOn ? "aus" : "an"}
          </TextButton>
          {free && <TextButton onClick={onReset}>Auf Vorschlag zurücksetzen</TextButton>}
        </span>
      </header>

      <p className="sr-only" aria-live="polite">
        {say}
      </p>

      <div className="grid gap-8 px-4 pb-24 md:grid-cols-[minmax(0,1fr)_300px] md:px-8">
        <div ref={wrap} className="min-w-0">
          {narrow && (
            <div className="mb-3 flex gap-5 text-sm">
              {([0, 1] as const).map((p) => (
                <TextButton key={p} aria-pressed={page === p} className={page === p ? "font-semibold" : ""} onClick={() => setPage(p)}>
                  {p === 0 ? "Linke Seite" : "Rechte Seite"}
                </TextButton>
              ))}
            </div>
          )}
          {cropping ? (
            <div className="mb-4 flex min-h-9 items-center gap-x-5 overflow-hidden" role="toolbar" aria-label="Zuschneiden">
              <span className="text-on-table shrink-0 text-sm font-semibold">Zuschneiden</span>
              <button type="button" onClick={() => setCropMsg("done")} className="border-on-table text-on-table hover:bg-on-table hover:text-table min-h-9 shrink-0 border px-3 text-sm font-semibold transition-colors duration-150">
                Fertig
              </button>
              <TextButton className="shrink-0" onClick={() => setCropMsg("cancel")}>
                Abbrechen
              </TextButton>
              <TextButton
                className="shrink-0"
                onClick={() => {
                  const id = cropping;
                  setCropMsg("cancel");
                  setCrop(id);
                }}
              >
                Mehr …
              </TextButton>
              <span className="text-on-table-2 hidden min-w-0 truncate text-[13px] lg:inline">Bild ziehen verschiebt · Ecken am Bild vergrößern · Griffe am Rahmen schneiden</span>
            </div>
          ) : (
          <div className="mb-4 space-y-2">
            <div className="flex flex-wrap items-center gap-x-1 gap-y-2" role="toolbar" aria-label="Werkzeuge">
              {(["select", "pen", "eraser"] as const).map((t) => (
                <ToolButton key={t} tool={t} active={tool === t} onClick={() => setTool(tool === t && t !== "select" ? "select" : t)} />
              ))}
              <span aria-hidden className="bg-on-table/30 mx-2 h-6 w-px" />
              {(Object.keys(SHAPES) as ShapeKind[]).map((t) => (
                <ToolButton key={t} tool={t} active={tool === t} onClick={() => setTool(tool === t ? "select" : t)} />
              ))}
              <span aria-hidden className="bg-on-table/30 mx-2 h-6 w-px" />
              {(Object.keys(TEXT_ROLE) as TextRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/x-role", r)}
                  onClick={() => addText(r, curPage)}
                  className="border-on-table/60 text-on-table hover:border-on-table mr-1 min-h-9 cursor-grab border px-3 text-sm transition-colors duration-150"
                  title="Klicken legt den Text auf die Seite, Ziehen an eine bestimmte Stelle"
                >
                  + {TEXT_ROLE[r].label}
                </button>
              ))}
            </div>
            {tool === "pen" && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2" role="group" aria-label="Stift">
                <Swatches value={pen.c} cloth={data.cloth.base} onPick={(c) => c && setPen((p) => ({ ...p, c }))} />
                <span className="flex gap-1" role="group" aria-label="Breite">
                  {PEN_SIZES.map((ps) => (
                    <button
                      key={ps.label}
                      type="button"
                      aria-pressed={pen.s === ps.s}
                      aria-label={`Breite ${ps.label}`}
                      title={ps.label}
                      onClick={() => setPen((p) => ({ ...p, s: ps.s }))}
                      className={`flex h-9 w-9 items-center justify-center border ${pen.s === ps.s ? "border-on-table" : "border-transparent"}`}
                    >
                      <span aria-hidden className="bg-on-table block rounded-full" style={{ width: 4 + ps.s * 6, height: 4 + ps.s * 6 }} />
                    </button>
                  ))}
                </span>
                <span className="text-on-table-2 text-[13px]">{coarse ? "Mit dem Stift zeichnen; der Finger zeichnet nicht, sobald ein Stift da war." : "Zeichnen mit Maus oder Stift. Esc oder V beendet."}</span>
              </div>
            )}
            {tool !== "select" && tool !== "pen" && (
              <p className="text-on-table-2 text-[13px]">
                {tool === "eraser"
                  ? "Über Striche wischen löscht sie. Formen und Fotos bleiben."
                  : `${SHAPES[tool].label} aufziehen; ein Klick legt sie in Standardgröße hin. ${isLinear(tool) ? "Shift: 45°-Schritte." : "Shift: Quadrat bzw. Kreis."} Alt: ohne Einrasten.`}
              </p>
            )}
          </div>
          )}
          {width > 0 && (
            <div
              className="book-shadow-open relative"
              // Griffe dürfen über den Rand ragen; schmal wird nur waagerecht auf eine Seite beschnitten
              style={{ width: narrow ? pageW : W, overflowX: narrow ? "clip" : "visible", overflowY: "visible" }}
            >
              {/* Buchblock links und rechts, wie beim fertigen Buch */}
              {!narrow && (
                <>
                  <div aria-hidden className="book-block-l absolute top-[0.6%] right-full bottom-[0.6%] w-[8px]" />
                  <div aria-hidden className="book-block-r absolute top-[0.6%] bottom-[0.6%] left-full w-[8px]" />
                </>
              )}
              <div
                className="relative transition-transform duration-500 ease-out select-none"
                style={{ width: W, height: Hpx, transform: narrow && page === 1 ? `translateX(${-pageW}px)` : undefined }}
              >
                {(["left", "right"] as const).map((side, i) => (
                  <div key={side} className="absolute top-0" style={{ left: i * pageW, width: pageW, height: Hpx }}>
                    <MemoPage book={data} page={pages[i]} side={side} eager />
                  </div>
                ))}

                {/* Raster, Falz und Einrastlinien */}
                <svg aria-hidden className="pointer-events-none absolute inset-0 z-40 h-full w-full" viewBox={`0 0 200 100`} preserveAspectRatio="none">
                  <rect x={97} y={0} width={6} height={100} fill="rgb(12 10 8 / 0.05)" />
                  {showGrid && (
                    <g stroke="rgb(27 28 26 / 0.18)" strokeWidth={1} vectorEffect="non-scaling-stroke">
                      {grid.ta.map((ta, n) => (
                        <rect key={n} x={ta.x} y={grid.ys[1]} width={ta.w} height={grid.ys[grid.ys.length - 2] - grid.ys[1]} fill="none" vectorEffect="non-scaling-stroke" />
                      ))}
                      {grid.xs.map((x) => (
                        <line key={`x${x}`} x1={x} x2={x} y1={0} y2={100} vectorEffect="non-scaling-stroke" />
                      ))}
                      {grid.ys.map((y) => (
                        <line key={`y${y}`} x1={0} x2={200} y1={y} y2={y} vectorEffect="non-scaling-stroke" />
                      ))}
                    </g>
                  )}
                  <g stroke="var(--mark)" strokeWidth={1.5} vectorEffect="non-scaling-stroke">
                    {guides.xs.map((x) => (
                      <line key={`gx${x}`} x1={x} x2={x} y1={0} y2={100} vectorEffect="non-scaling-stroke" />
                    ))}
                    {guides.ys.map((y) => (
                      <line key={`gy${y}`} x1={0} x2={200} y1={y} y2={y} vectorEffect="non-scaling-stroke" />
                    ))}
                  </g>
                </svg>

                {/* Bearbeitungsebene */}
                <div
                  ref={layerEl}
                  data-stage-layer
                  className="absolute inset-0 z-50 cursor-text select-none"
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onPointerCancel={() => onUp()}
                  onPointerDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    setSel(null);
                    setEditing(null);
                  }}
                  onContextMenu={(e) => {
                    if (e.target !== e.currentTarget) return;
                    e.preventDefault();
                    openMenu(e.clientX, e.clientY, null);
                  }}
                  onDoubleClick={(e) => {
                    if (e.target !== e.currentTarget) return;
                    const at = pointOf(e.clientX, e.clientY);
                    addText("body", pageAt(at.x), at);
                  }}
                  onDragOver={(e) => {
                    const t = Array.from(e.dataTransfer.types);
                    if (t.includes("text/x-role") || t.includes("text/x-photo")) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "copy";
                    }
                  }}
                  onDrop={(e) => {
                    const role = e.dataTransfer.getData("text/x-role") as TextRole;
                    const key = e.dataTransfer.getData("text/x-photo");
                    if (!role && !key) return;
                    e.preventDefault();
                    e.stopPropagation();
                    const at = pointOf(e.clientX, e.clientY);
                    if (role) addText(role, pageAt(at.x), at);
                    else addPhoto(key, pageAt(at.x), at);
                  }}
                >
                  {/* Trefferflächen in der echten Stapelung: was oben liegt, wird zuerst getroffen */}
                  {shown.map((it) => {
                    const b = boxOf(it, geom);
                    const isSel = it.id === sel;
                    if (it.id === editing) return null;
                    if (it.t === "shape" || it.t === "ink") {
                      // Treffer nur auf dem Gezeichneten: was daneben liegt (ein Foto unter dem Pfeil), bleibt greifbar
                      const filled = it.t === "ink" || it.kind === "tape" || !!it.look.fill;
                      return (
                        <div key={it.id} className="contents">
                          <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 200 ${grid.H}`} preserveAspectRatio="none">
                            {pathsOf(it).map((pth, n) => (
                              <path
                                key={n}
                                d={pth.d}
                                fill={filled || pth.fill ? "transparent" : "none"}
                                stroke="transparent"
                                strokeWidth={coarse ? 24 : 12}
                                vectorEffect="non-scaling-stroke"
                                pointerEvents={filled || pth.fill ? "all" : "stroke"}
                                className={isSel ? "cursor-move" : "cursor-pointer"}
                                style={{ touchAction: isSel ? "none" : "auto" }}
                                onPointerDown={(e) => startDrag(e, it, null)}
                                onDoubleClick={(e) => e.stopPropagation()}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openMenu(e.clientX, e.clientY, it.id);
                                }}
                              />
                            ))}
                          </svg>
                          <button
                            type="button"
                            aria-label={`${nameOf(it)}, ${where(b)}`}
                            aria-pressed={isSel}
                            onFocus={() => setSel(it.id)}
                            className="pointer-events-none absolute opacity-0"
                            style={pct(b)}
                          />
                        </div>
                      );
                    }
                    return (
                      <div
                        key={it.id}
                        className="absolute"
                        style={{ ...pct(b), touchAction: isSel ? "none" : "auto" }}
                      >
                        <button
                          type="button"
                          aria-label={`${nameOf(it)}, ${where(b)}`}
                          aria-pressed={isSel}
                          onPointerDown={(e) => startDrag(e, it, null)}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (it.t === "photo") setCropping(it.id);
                            else setEditing(it.id);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openMenu(e.clientX, e.clientY, it.id);
                          }}
                          onFocus={() => setSel(it.id)}
                          className={`absolute inset-0 ${isSel ? "cursor-move" : "cursor-pointer"} ${
                            isSel ? "outline-2 outline-mark" : "hover:outline-1 hover:outline-mark/70"
                          }`}
                        />
                      </div>
                    );
                  })}
                  {selected?.t === "text" && !draft && (
                    <TextToolbar
                      key={selected.id}
                      item={selected}
                      box={boxOf(selected, geom)}
                      cloth={data.cloth.base}
                      onLook={(patch, tag) => setLook(selected.id, patch, tag)}
                    />
                  )}
                  {draft &&
                    (() => {
                      const it = shown.find((i) => i.id === draft.id);
                      return it ? (
                        <DragGhost
                          item={it}
                          box={boxOf(it, geom)}
                          photo={it.t === "photo" ? photos.get(it.key) : undefined}
                          font={it.t === "text" ? editFont(it) : undefined}
                          paths={pathsOf(it)}
                          H={grid.H}
                        />
                      ) : null;
                    })()}
                  {/* Zeichenfläche: Stift, Radierer, Formen aufziehen; fängt alle Zeiger, solange ein Werkzeug gewählt ist */}
                  {tool !== "select" && (
                    <div
                      aria-hidden
                      className="absolute inset-0 z-[70]"
                      style={{ cursor: tool === "eraser" ? "cell" : "crosshair", touchAction: "none" }}
                      onPointerDown={onDrawDown}
                      onPointerMove={onDrawMove}
                      onPointerUp={onDrawUp}
                      onPointerCancel={onDrawUp}
                      onContextMenu={(e) => e.preventDefault()}
                    />
                  )}
                  {sketch && (
                    <svg aria-hidden className="pointer-events-none absolute inset-0 z-[71] h-full w-full" viewBox={`0 0 200 ${grid.H}`} preserveAspectRatio="none">
                      <Paths paths={sketch.paths} />
                    </svg>
                  )}
                  {/* Griffe des gewählten Elements liegen über allem, ohne das Darunter zu verdecken */}
                  {selected?.t === "shape" && isLinear(selected.kind) && !draft
                    ? endpoints(selected.box, selected.from).map((pt, n) => (
                        <span
                          key={n}
                          aria-hidden
                          onPointerDown={(e) => startDrag(e, selected, {}, n as 0 | 1)}
                          className="absolute z-[66] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                          style={{ left: `${pt.x / 2}%`, top: `${pt.y}%`, width: handle, height: handle, cursor: "crosshair", touchAction: "none" }}
                        >
                          <span className="border-ink bg-paper block h-3 w-3 border" />
                        </span>
                      ))
                    : null}
                  {selected && selected.id !== editing && selected.id !== cropping && !(selected.t === "shape" && isLinear(selected.kind)) && (
                    <div className={`pointer-events-none absolute ${selected.t === "shape" || selected.t === "ink" ? "outline-1 outline-dashed outline-mark" : ""}`} style={pct(boxOf(selected, geom))}>
                      {draft?.id === selected.id && draft.original && (
                        <span className="bg-ink text-paper absolute top-1 left-1 px-1.5 py-0.5 text-[11px]">Originalformat</span>
                      )}
                      {!draft &&
                        HANDLES.filter((h) => selected.t !== "text" || (!h.e.t && !h.e.b)).map((h) => (
                          <span
                            key={h.name}
                            aria-hidden
                            onPointerDown={(e) => startDrag(e, selected, { ...h.e })}
                            className={`pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center ${h.cls}`}
                            style={{ width: handle, height: handle, cursor: h.cursor, touchAction: "none" }}
                          >
                            <span className="border-ink bg-paper block h-2.5 w-2.5 border" />
                          </span>
                        ))}
                    </div>
                  )}
                  {(() => {
                    const it = cropping ? items.find((i) => i.id === cropping) : undefined;
                    const ph = it?.t === "photo" ? photos.get(it.key) : undefined;
                    if (!it || it.t !== "photo" || !ph) return null;
                    return (
                      <CropMode
                        key={it.id}
                        item={it}
                        photo={ph}
                        H={grid.H}
                        pxPerUnit={pageW / 100}
                        snapX={grid.xs}
                        snapY={grid.ys.map((y) => (y / 100) * grid.H)}
                        message={cropMsg}
                        onDone={(box, c) => {
                          setCropMsg(null);
                          setCropping(null);
                          if (box) commit(items.map((i) => (i.id === it.id && i.t === "photo" ? { ...i, box, crop: c } : i)), undefined, "Zugeschnitten");
                        }}
                      />
                    );
                  })()}
                  {editItem && editItem.t === "text" && (
                    <textarea
                      autoFocus
                      aria-label={`${TEXT_ROLE[editItem.role].label} schreiben`}
                      value={editItem.text}
                      onChange={(e) => setTextOf(editItem.id, e.target.value)}
                      onFocus={(e) => e.currentTarget.select()}
                      onPointerDown={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Escape") setEditing(null);
                      }}
                      onBlur={() => setEditing(null)}
                      spellCheck
                      className="absolute m-0 resize-none overflow-hidden border-0 bg-transparent p-0 outline-2 outline-mark select-text [caret-color:var(--mark)] [-webkit-user-select:text]"
                      style={{ ...pct(boxOf(editItem, geom)), minHeight: "1.2em", ...editFont(editItem) }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
          {(shelf.length > 0 || elsewhere.length > 0) && (
            <section aria-label="Alle Fotos" className="mt-5">
              <p className="text-on-table text-sm font-semibold">
                Alle Fotos <span className="text-on-table-2 font-normal">· ziehen oder antippen legt sie auf die Seite, von anderen Doppelseiten wandern sie herüber</span>
              </p>
              <ul tabIndex={0} aria-label="Fotos des Buchs" className="mt-2 flex gap-2 overflow-x-auto pb-2">
                {[...shelf.map((photo) => ({ photo, spread: -1 })), ...elsewhere].map(({ photo: ph, spread }) => (
                  <li key={ph.key} className="shrink-0">
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/x-photo", ph.key)}
                      onClick={() => addPhoto(ph.key, curPage)}
                      aria-label={`Foto auf diese Doppelseite holen: ${ph.title || "ohne Titel"}, ${spread < 0 ? "aus der Ablage" : `von Doppelseite ${spread + 1}`}`}
                      className="group block text-left"
                    >
                      <span className="relative block h-16 w-16">
                        <Image src={ph.thumb} alt="" fill sizes="64px" className="object-cover transition-opacity duration-150 group-hover:opacity-80" draggable={false} />
                      </span>
                      <span className="text-on-table-2 mt-1 block text-[11px] tabular-nums">{spread < 0 ? "Ablage" : `Doppelseite ${spread + 1}`}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {coarse ? (
            <p className="text-on-table-2 mt-4 max-w-[70ch] text-[13px] leading-relaxed">
              Antippen wählt, dann ziehen verschiebt. Die Griffe ändern die Größe. Doppeltippen auf ein Foto schneidet zu, auf einen Text schreibt.
            </p>
          ) : (
            <p className="text-on-table-2 mt-4 max-w-[70ch] text-[13px] leading-relaxed">
              Ziehen verschiebt, die Griffe ändern die Größe. Doppelklick auf ein Foto schneidet zu, auf einen Text schreibt, aufs Papier legt neuen Text an.
              Kanten rasten am Raster ein, <kbd>Alt</kbd> beim Ziehen setzt frei.
              Tastatur: <kbd>Tab</kbd> wählt, Pfeile verschieben um eine Spalte oder Zeile, <kbd>Shift</kbd> + Pfeile ändern die Größe, <kbd>Enter</kbd>{" "}
              schneidet zu, <kbd>Entf</kbd> nimmt heraus, <kbd>⌘C</kbd> / <kbd>⌘V</kbd> kopiert, <kbd>⌘D</kbd> dupliziert, <kbd>G</kbd> zeigt das Raster.
            </p>
          )}
        </div>

        <aside className="space-y-5 md:sticky md:top-20 md:self-start">
          {selected?.t === "photo" && (
            <PhotoPanel
              item={selected}
              photo={photos.get(selected.key)}
              onCaption={(c) => commit(items.map((i) => (i.id === selected.id ? { ...i, caption: c } : i)))}
              onTitle={(title) => onPhoto(selected.key, { title }, `t-${selected.key}`)}
              onCrop={() => setCropping(selected.id)}
              onRemove={() => remove(selected)}
              onLayer={(to) => layer(selected.id, to)}
              onDuplicate={() => duplicate(selected)}
              up={canLayer(selected.id, "up")}
              down={canLayer(selected.id, "down")}
            />
          )}
          {selected?.t === "text" && (
            <div className="slip text-ink space-y-3 p-5">
              <p className="text-sm font-semibold">Textrahmen</p>
              <fieldset className="flex flex-wrap gap-2 text-sm">
                <legend className="text-ink-2 mb-1 text-[13px]">Stil</legend>
                {(Object.keys(TEXT_ROLE) as TextRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={selected.role === r}
                    onClick={() => commit(items.map((i) => (i.id === selected.id ? { ...i, role: r } : i)))}
                    className={`border px-3 py-1.5 ${selected.role === r ? "border-ink bg-ink text-paper" : "border-ink/30"}`}
                  >
                    {TEXT_ROLE[r].label}
                  </button>
                ))}
              </fieldset>
              <label className="block text-[13px]">
                <span className="text-ink-2">Text</span>
                <textarea
                  ref={textArea}
                  className={inputClass}
                  rows={6}
                  value={selected.text}
                  onChange={(e) => {
                    const text = e.target.value.slice(0, 1200);
                    commit(items.map((i) => (i.id === selected.id && i.t === "text" ? { ...i, text } : i)), `text-${selected.id}`);
                  }}
                />
              </label>
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={!!selected.light}
                  onChange={(e) => commit(items.map((i) => (i.id === selected.id && i.t === "text" ? { ...i, light: e.target.checked || undefined } : i)))}
                  className="accent-[var(--ink)]"
                />
                Helle Schrift (für Text auf dunklen Fotos)
              </label>
              <LayerButtons
                onLayer={(to) => layer(selected.id, to)}
                onDuplicate={() => duplicate(selected)}
                up={canLayer(selected.id, "up")}
                down={canLayer(selected.id, "down")}
              />
              {boxOf(selected, geom).y + boxOf(selected, geom).h > grid.ys[grid.ys.length - 2] + 0.5 && (
                <p className="text-ink text-[12px] font-semibold">Der Text läuft unten aus dem Satzspiegel. Kürzen oder den Rahmen breiter ziehen.</p>
              )}
              <TextButton className="!text-ink text-sm" onClick={() => remove(selected)}>
                Textrahmen entfernen
              </TextButton>
            </div>
          )}

          {selected?.t === "shape" && (
            <div className="slip text-ink space-y-3 p-5">
              <p className="text-sm font-semibold">{SHAPES[selected.kind].label}</p>
              <div className="space-y-1">
                <p className="text-ink-2 text-[13px]">{selected.kind === "tape" ? "Farbe" : "Kontur"}</p>
                <Swatches value={selected.kind === "tape" ? (selected.look.fill ?? selected.look.color) : selected.look.color} cloth={data.cloth.base} onPick={(c) => setShapeOf(selected.id, { color: c ?? selected.look.color, fill: selected.kind === "tape" ? undefined : selected.look.fill })} dark />
              </div>
              {(selected.kind === "rect" || selected.kind === "ellipse") && (
                <div className="space-y-1">
                  <p className="text-ink-2 text-[13px]">Fläche</p>
                  <Swatches value={selected.look.fill ?? null} cloth={data.cloth.base} none onPick={(c) => setShapeOf(selected.id, { fill: c ?? undefined })} dark />
                </div>
              )}
              <fieldset className="flex flex-wrap items-center gap-2 text-sm">
                <legend className="text-ink-2 mb-1 text-[13px]">{selected.kind === "tape" ? "Breite" : "Strich"}</legend>
                {([1, 2, 3] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    aria-pressed={selected.look.weight === w}
                    onClick={() => setShapeOf(selected.id, { weight: w })}
                    className={`border px-3 py-1.5 ${selected.look.weight === w ? "border-ink bg-ink text-paper" : "border-ink/30"}`}
                  >
                    {w === 1 ? "fein" : w === 2 ? "mittel" : "kräftig"}
                  </button>
                ))}
                {selected.kind !== "tape" && (
                  <label className="ml-2 flex items-center gap-2 text-[13px]">
                    <input type="checkbox" checked={!!selected.look.dashed} onChange={(e) => setShapeOf(selected.id, { dashed: e.target.checked || undefined })} className="accent-[var(--ink)]" />
                    gestrichelt
                  </label>
                )}
              </fieldset>
              <LayerButtons onLayer={(to) => layer(selected.id, to)} onDuplicate={() => duplicate(selected)} up={canLayer(selected.id, "up")} down={canLayer(selected.id, "down")} />
              <TextButton className="!text-ink text-sm" onClick={() => remove(selected)}>
                {SHAPES[selected.kind].label} entfernen
              </TextButton>
            </div>
          )}
          {selected?.t === "ink" && (
            <div className="slip text-ink space-y-3 p-5">
              <p className="text-sm font-semibold">Zeichnung</p>
              <p className="text-ink-2 text-[13px]">
                {selected.strokes.length} {selected.strokes.length === 1 ? "Strich" : "Striche"}. Ziehen verschiebt, die Griffe skalieren. Einzelne Striche löscht der Radierer (E).
              </p>
              <div className="space-y-1">
                <p className="text-ink-2 text-[13px]">Alle Striche umfärben</p>
                <Swatches
                  value={selected.strokes.every((st) => st.c === selected.strokes[0].c) ? selected.strokes[0].c : null}
                  cloth={data.cloth.base}
                  dark
                  onPick={(c) => c && commit(items.map((i) => (i.id === selected.id && i.t === "ink" ? { ...i, strokes: i.strokes.map((st) => ({ ...st, c })) } : i)))}
                />
              </div>
              <LayerButtons onLayer={(to) => layer(selected.id, to)} onDuplicate={() => duplicate(selected)} up={canLayer(selected.id, "up")} down={canLayer(selected.id, "down")} />
              <TextButton className="!text-ink text-sm" onClick={() => remove(selected)}>
                Zeichnung entfernen
              </TextButton>
            </div>
          )}
          {shown.length > 1 && (
            <div className="slip text-ink space-y-2 p-5">
              <p className="text-sm font-semibold">Ebenen</p>
              <p className="text-ink-2 text-[12px] leading-snug">Oben liegt vorn. Antippen wählt, auch was verdeckt ist.</p>
              <ol className="space-y-px">
                {[...shown].reverse().map((it) => (
                  <li key={it.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSel(it.id)}
                      aria-pressed={it.id === sel}
                      className={`min-h-8 min-w-0 flex-1 truncate border-l-2 px-2 text-left text-[13px] ${it.id === sel ? "border-mark font-semibold" : "border-transparent"}`}
                    >
                      {nameOf(it) || "Foto"}
                    </button>
                    <button type="button" aria-label="nach vorn" disabled={!canLayer(it.id, "up")} onClick={() => layer(it.id, "up")} className="h-8 w-8 text-sm disabled:opacity-30">
                      ↑
                    </button>
                    <button type="button" aria-label="nach hinten" disabled={!canLayer(it.id, "down")} onClick={() => layer(it.id, "down")} className="h-8 w-8 text-sm disabled:opacity-30">
                      ↓
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}

        </aside>
      </div>

      {menu && <ContextMenu x={menu.cx} y={menu.cy} entries={menuEntries()} onClose={() => setMenu(null)} />}
      {cropItem && cropItem.t === "photo" && photos.get(cropItem.key) && (
        <CropDialog
          photo={{ ...photos.get(cropItem.key)!, ...(cropItem.crop ?? {}) }}
          aspect={realRatio(cropItem.box)}
          gutter={cropItem.box.x < 99.5 && cropItem.box.x + cropItem.box.w > 100.5}
          onChange={(v) => commit(items.map((i) => (i.id === cropItem.id ? { ...i, crop: v } : i)), `crop-${cropItem.id}`)}
          onClose={() => setCrop(null)}
        />
      )}
    </div>
  );
}

function PhotoPanel({
  item,
  photo,
  onCaption,
  onTitle,
  onCrop,
  onRemove,
  onLayer,
  onDuplicate,
  up,
  down,
}: {
  item: Extract<FreeItem, { t: "photo" }>;
  photo?: StoredPhoto;
  onCaption: (c: "auto" | "off") => void;
  onTitle: (t: string) => void;
  onCrop: () => void;
  onRemove: () => void;
  onLayer: (to: "up" | "down" | "front" | "back") => void;
  onDuplicate: () => void;
  up: boolean;
  down: boolean;
}) {
  return (
    <div className="slip text-ink space-y-3 p-5">
      <p className="text-sm font-semibold">Foto</p>
      <label className="block text-[13px]">
        <span className="text-ink-2">Titel</span>
        <input className={inputClass} value={photo?.title ?? ""} onChange={(e) => onTitle(e.target.value.slice(0, 50))} />
      </label>
      <label className="flex items-center gap-2 text-[13px]">
        <input type="checkbox" checked={item.caption === "auto"} onChange={(e) => onCaption(e.target.checked ? "auto" : "off")} className="accent-[var(--ink)]" />
        Unterschrift auf der Seite (sonst in der Kopfzeile)
      </label>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <button type="button" className="underline decoration-mark decoration-2 underline-offset-4" onClick={onCrop}>
          Ausschnitt …
        </button>
        <button type="button" className="text-ink-2 underline underline-offset-4" onClick={onRemove}>
          Löschen (in die Ablage)
        </button>
      </div>
      <LayerButtons onLayer={onLayer} onDuplicate={onDuplicate} up={up} down={down} />
    </div>
  );
}

function LayerButtons({
  onLayer,
  onDuplicate,
  up = true,
  down = true,
}: {
  onLayer: (to: "up" | "down" | "front" | "back") => void;
  onDuplicate: () => void;
  up?: boolean;
  down?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-[13px]" role="group" aria-label="Ebene und Kopie">
      <button type="button" className="underline decoration-mark decoration-2 underline-offset-4" onClick={onDuplicate} title="⌘D, oder ⌘C und ⌘V">
        Duplizieren
      </button>
      <button type="button" className="underline decoration-mark decoration-2 underline-offset-4 disabled:opacity-40" onClick={() => onLayer("front")} disabled={!up} title="⇧⌘]">
        Ganz nach vorn
      </button>
      <button type="button" className="underline decoration-mark decoration-2 underline-offset-4 disabled:opacity-40" onClick={() => onLayer("back")} disabled={!down} title="⇧⌘[">
        Ganz nach hinten
      </button>
    </div>
  );
}

type MenuEntry = "sep" | { label: string; hint?: string; checked?: boolean; disabled?: boolean; run: () => void };

/** Kontextmenü am Zeiger: Pfeiltasten, Enter, Esc; ein Klick daneben schließt */
function ContextMenu({ x, y, entries, onClose }: { x: number; y: number; entries: MenuEntry[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ left: Math.max(8, Math.min(x, innerWidth - r.width - 8)), top: Math.max(8, Math.min(y, innerHeight - r.height - 8)) });
    el.querySelector<HTMLButtonElement>("[role=menuitem], [role=menuitemcheckbox]")?.focus();
  }, [x, y]);
  const move = (e: React.KeyboardEvent) => {
    const list = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem], [role=menuitemcheckbox]") ?? []);
    const i = list.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      list[(i + (e.key === "ArrowDown" ? 1 : list.length - 1)) % list.length]?.focus();
    } else if (e.key === "Escape" || e.key === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };
  return (
    <div
      className="fixed inset-0 z-[690]"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div
        ref={ref}
        role="menu"
        aria-label="Aktionen"
        onKeyDown={move}
        className="slip text-ink fixed min-w-56 py-1.5 text-sm shadow-[0_18px_36px_-14px_rgb(12_10_8/0.8)]"
        style={pos}
      >
        {entries.map((en, i) =>
          en === "sep" ? (
            <div key={i} role="separator" className="my-1.5 border-t border-ink/15" />
          ) : (
            <button
              key={i}
              type="button"
              role={en.checked === undefined ? "menuitem" : "menuitemcheckbox"}
              aria-checked={en.checked}
              disabled={en.disabled}
              onClick={() => {
                onClose();
                en.run();
              }}
              className="hover:bg-ink/8 focus-visible:bg-ink/8 flex min-h-8 disabled:opacity-40 disabled:hover:bg-transparent w-full items-center gap-3 px-3 text-left focus-visible:outline-none"
            >
              <span aria-hidden className="w-3 text-center">
                {en.checked ? "✓" : ""}
              </span>
              <span className="flex-1">{en.label}</span>
              {en.hint && <span className="text-ink-2 text-[12px]">{en.hint}</span>}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

type R = { x: number; y: number; w: number; h: number };

/**
 * Zuschneiden auf der Seite: Rahmen F und ganzes Bild I in Seiteneinheiten (cqw, y = Höhe in cqw).
 * Lage wie im Buch: I.x = F.x + Fokus × (F.w − I.w), Zoom = I.w / Breite bei „füllt den Rahmen“.
 */
function CropMode({
  item,
  photo,
  H,
  pxPerUnit,
  snapX,
  snapY,
  message,
  onDone,
}: {
  item: Extract<FreeItem, { t: "photo" }>;
  photo: StoredPhoto;
  H: number;
  pxPerUnit: number;
  snapX: number[];
  snapY: number[];
  message: "done" | "cancel" | null;
  onDone: (box: Box | null, crop: { focus: [number, number]; zoom: number; fit: "cover" }) => void;
}) {
  const start = () => {
    const F: R = { x: item.box.x, y: (item.box.y / 100) * H, w: item.box.w, h: (item.box.h / 100) * H };
    const c = item.crop ?? { focus: photo.focus ?? [0.5, 0.5], zoom: photo.zoom ?? 1, fit: photo.fit ?? "cover" };
    const s0 = Math.max(F.w / photo.w, F.h / photo.h);
    const z = c.fit === "contain" ? 1 : Math.max(1, c.zoom);
    const w = photo.w * s0 * z;
    const h = photo.h * s0 * z;
    return { F, I: { x: F.x + c.focus[0] * (F.w - w), y: F.y + c.focus[1] * (F.h - h), w, h } };
  };
  const [st, setSt] = useState(start);
  const drag = useRef<{ mode: "pan" | "frame" | "image"; e: Edges; sx: number; sy: number; F0: R; I0: R } | null>(null);
  const done = useRef(false);

  const finish = (apply: boolean) => {
    if (done.current) return;
    done.current = true;
    if (!apply) return onDone(null, { focus: [0.5, 0.5], zoom: 1, fit: "cover" });
    const { F, I } = st;
    const s0 = Math.max(F.w / photo.w, F.h / photo.h);
    const zoom = Math.max(1, I.w / (photo.w * s0));
    const fx = Math.abs(F.w - I.w) < 0.01 ? 0.5 : (I.x - F.x) / (F.w - I.w);
    const fy = Math.abs(F.h - I.h) < 0.01 ? 0.5 : (I.y - F.y) / (F.h - I.h);
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    onDone({ x: F.x, y: (F.y / H) * 100, w: F.w, h: (F.h / H) * 100 }, { focus: [clamp(fx), clamp(fy)], zoom, fit: "cover" });
  };
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  });
  useEffect(() => {
    if (message) finishRef.current(message === "done");
  }, [message]);

  /** Bild deckt den Rahmen immer ganz ab */
  const fitImage = (I: R, F: R): R => {
    const k = Math.max(1, F.w / I.w, F.h / I.h);
    const w = I.w * k;
    const h = I.h * k;
    return { w, h, x: Math.min(F.x, Math.max(F.x + F.w - w, I.x)), y: Math.min(F.y, Math.max(F.y + F.h - h, I.y)) };
  };

  // Tastatur: Pfeile verschieben das Bild, + / − zoomen, Enter übernimmt, Esc bricht ab
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        finishRef.current(true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        finishRef.current(false);
      } else if (/^Arrow/.test(e.key) || e.key === "+" || e.key === "-" || e.key === "=") {
        e.preventDefault();
        setSt(({ F, I }) => {
          if (e.key === "+" || e.key === "=" || e.key === "-") {
            const k = e.key === "-" ? 1 / 1.05 : 1.05;
            const w = I.w * k;
            const h = I.h * k;
            return { F, I: fitImage({ x: I.x - (w - I.w) / 2, y: I.y - (h - I.h) / 2, w, h }, F) };
          }
          const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key] ?? [0, 0];
          return { F, I: fitImage({ ...I, x: I.x + d[0], y: I.y + d[1] }, F) };
        });
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const begin = (e: React.PointerEvent, mode: "pan" | "frame" | "image", edges: Edges = {}) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, e: edges, sx: e.clientX, sy: e.clientY, F0: st.F, I0: st.I };
  };
  const near = (v: number, list: number[]) => {
    const th = 8 / pxPerUnit;
    let best = v;
    for (const t of list) if (Math.abs(t - v) < th && Math.abs(t - v) < Math.abs(best - v) + (best === v ? th : 0)) best = t;
    return best;
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / pxPerUnit;
    const dy = (e.clientY - d.sy) / pxPerUnit;
    const { F0, I0 } = d;
    if (d.mode === "pan") return setSt({ F: F0, I: fitImage({ ...I0, x: I0.x + dx, y: I0.y + dy }, F0) });
    if (d.mode === "frame") {
      // Rahmen schneiden: innerhalb des Bildes, Kanten rasten am Raster ein, das Bild bleibt stehen
      let l = F0.x;
      let r = F0.x + F0.w;
      let t = F0.y;
      let b = F0.y + F0.h;
      const min = 4;
      if (d.e.l) l = Math.min(r - min, Math.max(I0.x, near(F0.x + dx, snapX)));
      if (d.e.r) r = Math.max(l + min, Math.min(I0.x + I0.w, near(F0.x + F0.w + dx, snapX)));
      if (d.e.t) t = Math.min(b - min, Math.max(I0.y, near(F0.y + dy, snapY)));
      if (d.e.b) b = Math.max(t + min, Math.min(I0.y + I0.h, near(F0.y + F0.h + dy, snapY)));
      l = Math.max(0, l);
      r = Math.min(200, r);
      t = Math.max(0, t);
      b = Math.min(H, b);
      return setSt({ F: { x: l, y: t, w: r - l, h: b - t }, I: I0 });
    }
    // Bild an einer Ecke größer oder kleiner, die Gegenecke bleibt stehen
    const sx = d.e.r ? 1 : -1;
    const sy = d.e.b ? 1 : -1;
    const k0 = Math.max((I0.w + sx * dx) / I0.w, (I0.h + sy * dy) / I0.h);
    const ax = d.e.r ? I0.x : I0.x + I0.w;
    const ay = d.e.b ? I0.y : I0.y + I0.h;
    const need = Math.max(
      d.e.r ? (F0.x + F0.w - ax) / I0.w : (ax - F0.x) / I0.w,
      d.e.b ? (F0.y + F0.h - ay) / I0.h : (ay - F0.y) / I0.h,
    );
    const k = Math.min(6, Math.max(need, k0));
    const w = I0.w * k;
    const h = I0.h * k;
    setSt({ F: F0, I: { w, h, x: d.e.r ? ax : ax - w, y: d.e.b ? ay : ay - h } });
  };
  const up = () => {
    drag.current = null;
  };

  const pc = (r: R): React.CSSProperties => ({ left: `${r.x / 2}%`, top: `${(r.y / H) * 100}%`, width: `${r.w / 2}%`, height: `${(r.h / H) * 100}%` });
  const { F, I } = st;
  const frameHandles: { e: Edges; cls: string; cursor: string }[] = HANDLES.map((h) => ({ e: h.e, cls: h.cls, cursor: h.cursor }));
  const corners: { e: Edges; cls: string; cursor: string }[] = [
    { e: { t: true, l: true }, cls: "left-0 top-0", cursor: "nwse-resize" },
    { e: { t: true, r: true }, cls: "left-full top-0", cursor: "nesw-resize" },
    { e: { b: true, r: true }, cls: "left-full top-full", cursor: "nwse-resize" },
    { e: { b: true, l: true }, cls: "left-0 top-full", cursor: "nesw-resize" },
  ];
  return (
    <div
      className="absolute inset-0 z-[60] select-none"
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onPointerDown={(e) => e.target === e.currentTarget && finish(true)}
      onDoubleClick={() => finish(true)}
    >
      {/* das ganze Bild, blass; darüber der Ausschnitt im Rahmen voll */}
      {/* eslint-disable-next-line @next/next/no-img-element -- genaue Lage beim Zuschneiden */}
      <img
        src={photo.src}
        alt=""
        draggable={false}
        onPointerDown={(e) => begin(e, "pan")}
        className="absolute max-w-none cursor-move touch-none select-none opacity-40"
        style={pc(I)}
      />
      <div className="pointer-events-none absolute overflow-hidden outline-2 outline-mark" style={pc(F)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- genaue Lage beim Zuschneiden */}
        <img
          src={photo.src}
          alt=""
          draggable={false}
          className="absolute max-w-none"
          style={{ left: `${((I.x - F.x) / F.w) * 100}%`, top: `${((I.y - F.y) / F.h) * 100}%`, width: `${(I.w / F.w) * 100}%`, height: `${(I.h / F.h) * 100}%` }}
        />
      </div>
      {/* Griffe am Rahmen: schneiden */}
      <div className="pointer-events-none absolute" style={pc(F)}>
        {frameHandles.map((h, i) => {
          const corner = (h.e.l || h.e.r) && (h.e.t || h.e.b);
          return (
            <span
              key={i}
              aria-hidden
              onPointerDown={(e) => begin(e, "frame", h.e)}
              className={`pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center ${h.cls}`}
              style={{ width: 28, height: 28, cursor: h.cursor }}
            >
              <span className={`bg-ink block border border-paper ${corner ? "h-3 w-3" : h.e.l || h.e.r ? "h-5 w-1.5" : "h-1.5 w-5"}`} />
            </span>
          );
        })}
      </div>
      {/* Ecken am Bild: vergrößern */}
      <div className="pointer-events-none absolute" style={pc(I)}>
        {corners.map((h, i) => (
          <span
            key={i}
            aria-hidden
            onPointerDown={(e) => begin(e, "image", h.e)}
            className={`pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center ${h.cls}`}
            style={{ width: 28, height: 28, cursor: h.cursor }}
          >
            <span className="bg-paper border-ink block h-3 w-3 border" />
          </span>
        ))}
      </div>
    </div>
  );
}

const SWATCHES: { label: string; value: string | null }[] = [
  { label: "Tinte", value: null },
  { label: "Grau", value: "#5a5c56" },
  { label: "Papier", value: "#eee9df" },
  { label: "Schwarz", value: "#000000" },
  { label: "Weiß", value: "#ffffff" },
];
/** cqw → Punkt bei einer gedruckten Seitenbreite von 15 cm */
const PT = 4.25;

/** Kleiner Werkzeugkasten über dem gewählten Textrahmen */
function TextToolbar({
  item,
  box,
  cloth,
  onLook,
}: {
  item: Extract<FreeItem, { t: "text" }>;
  box: Box;
  cloth: string;
  onLook: (patch: Partial<Record<keyof TextLook, TextLook[keyof TextLook] | null>>, tag?: string) => void;
}) {
  const m = textMetrics(item.role, item.look);
  const look = item.look ?? {};
  const pt = Math.round(m.size * PT);
  const setPt = (v: number) => onLook({ size: Math.min(40, Math.max(1.6, v / PT)) }, `size-${item.id}`);
  const above = box.y > 9;
  const btn = "flex h-8 min-w-8 items-center justify-center px-1.5 text-sm hover:bg-ink/8";
  const on = "bg-ink text-paper hover:bg-ink";
  const colors = [...SWATCHES, { label: "Einband", value: cloth }];
  return (
    <div
      role="toolbar"
      aria-label="Text gestalten"
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className="slip text-ink absolute z-[65] flex max-w-[min(560px,92vw)] select-text flex-wrap items-center gap-1 p-1 shadow-[0_12px_28px_-12px_rgb(12_10_8/0.8)]"
      style={{ left: `${Math.min(box.x, 150) / 2}%`, ...(above ? { bottom: `calc(${100 - box.y}% + 10px)` } : { top: `calc(${box.y + box.h}% + 10px)` }) }}
    >
      <label className="sr-only" htmlFor={`font-${item.id}`}>
        Schriftart
      </label>
      <select
        id={`font-${item.id}`}
        value={m.font}
        onChange={(e) => onLook({ font: e.target.value === "grotesk" ? null : (e.target.value as FontKey) })}
        className="h-8 border border-ink/25 bg-transparent px-1.5 text-sm"
        style={{ fontFamily: FONTS[m.font].css }}
      >
        {(Object.keys(FONTS) as FontKey[]).map((f) => (
          <option key={f} value={f} style={{ fontFamily: FONTS[f].css }}>
            {FONTS[f].label}
          </option>
        ))}
      </select>
      <span className="mx-1 flex items-center" role="group" aria-label="Größe">
        <button type="button" className={btn} aria-label="kleiner" onClick={() => setPt(pt - (pt > 24 ? 4 : 1))}>
          −
        </button>
        <label className="sr-only" htmlFor={`size-${item.id}`}>
          Größe in Punkt
        </label>
        <input
          id={`size-${item.id}`}
          type="number"
          min={7}
          max={170}
          value={pt}
          onChange={(e) => e.target.value && setPt(Number(e.target.value))}
          className="h-8 w-12 border border-ink/25 bg-transparent text-center text-sm tabular-nums"
        />
        <button type="button" className={btn} aria-label="größer" onClick={() => setPt(pt + (pt >= 24 ? 4 : 1))}>
          +
        </button>
        <span aria-hidden className="text-ink-2 ml-1 text-[11px]">
          pt
        </span>
      </span>
      <button type="button" aria-pressed={m.weight >= 700} aria-label="Fett" className={`${btn} font-bold ${m.weight >= 700 ? on : ""}`} onClick={() => onLook({ bold: m.weight < 700 })}>
        F
      </button>
      <button type="button" aria-pressed={!!look.italic} aria-label="Kursiv" className={`${btn} italic ${look.italic ? on : ""}`} onClick={() => onLook({ italic: look.italic ? null : true })}>
        K
      </button>
      <span className="mx-1 flex" role="group" aria-label="Ausrichtung">
        {(["left", "center", "right"] as const).map((a) => (
          <button
            key={a}
            type="button"
            aria-pressed={(look.align ?? "left") === a}
            aria-label={a === "left" ? "linksbündig" : a === "center" ? "mittig" : "rechtsbündig"}
            className={`${btn} ${(look.align ?? "left") === a ? on : ""}`}
            onClick={() => onLook({ align: a === "left" ? null : a })}
          >
            <svg aria-hidden viewBox="0 0 14 12" className="h-3 w-3.5">
              {[0, 4, 8].map((y, i) => {
                const w = i === 1 ? 8 : 14;
                const x = a === "left" ? 0 : a === "center" ? (14 - w) / 2 : 14 - w;
                return <rect key={y} x={x} y={y} width={w} height={1.6} className="fill-current" />;
              })}
            </svg>
          </button>
        ))}
      </span>
      <span className="flex items-center gap-1" role="group" aria-label="Farbe">
        {colors.map((c) => {
          const active = (look.color ?? null) === c.value && (c.value !== null || !item.light);
          return (
            <button
              key={c.label}
              type="button"
              title={c.label}
              aria-label={`Farbe ${c.label}`}
              aria-pressed={active}
              onClick={() => onLook({ color: c.value })}
              className={`h-6 w-6 border ${active ? "outline-2 outline-offset-1 outline-ink" : ""} border-ink/30`}
              style={{ background: c.value ?? "var(--ink)" }}
            />
          );
        })}
        <label className="relative h-6 w-6 cursor-pointer border border-ink/30" title="Eigene Farbe">
          <span className="sr-only">Eigene Farbe</span>
          <span aria-hidden className="absolute inset-0" style={{ background: "conic-gradient(#e8a72c, #d2553b, #6a8fa3, #6f8d5e, #e8a72c)" }} />
          <input
            type="color"
            value={look.color ?? "#1b1c1a"}
            onChange={(e) => onLook({ color: e.target.value }, `color-${item.id}`)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
      </span>
    </div>
  );
}

/** Seite nur neu zeichnen, wenn sich ihre Daten ändern (beim Ziehen bleibt sie stehen) */
const MemoPage = memo(PageView);

/** Leichte Vorschau des gezogenen Elements: ein Bild oder ein Textblock, ohne die Seite neu zu setzen */
function DragGhost({ item, box, photo, font, paths, H }: { item: SpreadItem; box: Box; photo?: StoredPhoto; font?: React.CSSProperties; paths: PathEl[]; H: number }) {
  const style: React.CSSProperties = { left: `${box.x / 2}%`, top: `${box.y}%`, width: `${box.w / 2}%`, height: `${box.h}%` };
  if (item.t === "photo" && photo) {
    const c = item.crop ?? { focus: photo.focus ?? [0.5, 0.5], zoom: photo.zoom ?? 1, fit: photo.fit ?? "cover" };
    return (
      <div className="pointer-events-none absolute overflow-hidden" style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Vorschau beim Ziehen, wie im Buch beschnitten */}
        <img
          src={photo.src}
          alt=""
          className={`absolute inset-0 h-full w-full ${c.fit === "contain" ? "object-contain" : "object-cover"}`}
          style={{
            objectPosition: `${c.focus[0] * 100}% ${c.focus[1] * 100}%`,
            transform: c.fit !== "contain" && c.zoom !== 1 ? `scale(${c.zoom})` : undefined,
            transformOrigin: `${c.focus[0] * 100}% ${c.focus[1] * 100}%`,
          }}
        />
      </div>
    );
  }
  if (item.t === "text")
    return (
      <div className="pointer-events-none absolute whitespace-pre-line" style={{ ...style, height: "auto", ...font }}>
        {item.text}
      </div>
    );
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 200 ${H}`} preserveAspectRatio="none">
      <Paths paths={paths} />
    </svg>
  );
}

/** Pfade aus shapes.ts als SVG; Maße in cqw wie im Buch */
function Paths({ paths }: { paths: PathEl[] }) {
  return (
    <>
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={p.fill ?? "none"}
          stroke={p.stroke}
          strokeWidth={p.width}
          strokeDasharray={p.dash?.join(" ")}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={p.opacity}
        />
      ))}
    </>
  );
}

/** Farben für Formen und Stift: Tinte, Papier und die Farben der Einbände; dazu der Einband dieses Buchs und eine eigene */
const PALETTE: { label: string; value: string }[] = [
  { label: "Tinte", value: "#1b1c1a" },
  { label: "Grau", value: "#5a5c56" },
  { label: "Papier", value: "#eee9df" },
  { label: "Weiß", value: "#ffffff" },
  { label: "Ringelblume", value: "#e8a72c" },
  { label: "Ziegel", value: "#cc7048" },
  { label: "Meer", value: "#5b979c" },
  { label: "Salbei", value: "#a3ad92" },
];

function Swatches({ value, cloth, onPick, none, dark }: { value: string | null; cloth: string; onPick: (c: string | null) => void; none?: boolean; dark?: boolean }) {
  const colors = PALETTE.some((p) => p.value.toLowerCase() === cloth.toLowerCase()) ? PALETTE : [...PALETTE, { label: "Einband", value: cloth }];
  const ring = dark ? "outline-ink" : "outline-on-table";
  return (
    <span className="flex flex-wrap items-center gap-1" role="group" aria-label="Farbe">
      {none && (
        <button
          type="button"
          aria-pressed={value === null}
          aria-label="keine Fläche"
          title="keine"
          onClick={() => onPick(null)}
          className={`relative h-7 w-7 border border-ink/30 bg-paper ${value === null ? `outline-2 outline-offset-1 ${ring}` : ""}`}
        >
          <svg aria-hidden viewBox="0 0 10 10" className="absolute inset-0 h-full w-full">
            <line x1={1} y1={9} x2={9} y2={1} stroke="#cc7048" strokeWidth={1} />
          </svg>
        </button>
      )}
      {colors.map((c) => (
        <button
          key={c.label}
          type="button"
          title={c.label}
          aria-label={`Farbe ${c.label}`}
          aria-pressed={value?.toLowerCase() === c.value.toLowerCase()}
          onClick={() => onPick(c.value)}
          className={`h-7 w-7 border border-ink/30 ${value?.toLowerCase() === c.value.toLowerCase() ? `outline-2 outline-offset-1 ${ring}` : ""}`}
          style={{ background: c.value }}
        />
      ))}
      <label className="relative h-7 w-7 cursor-pointer border border-ink/30" title="Eigene Farbe">
        <span className="sr-only">Eigene Farbe</span>
        <span aria-hidden className="absolute inset-0" style={{ background: "conic-gradient(#e8a72c, #d2553b, #6a8fa3, #6f8d5e, #e8a72c)" }} />
        <input type="color" value={value ?? "#1b1c1a"} onChange={(e) => onPick(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      </label>
    </span>
  );
}

const TOOL_INFO: Record<Tool, { label: string; key: string }> = {
  select: { label: "Auswahl", key: "V" },
  pen: { label: "Stift", key: "P" },
  eraser: { label: "Radierer", key: "E" },
  ...SHAPES,
};

/** Werkzeugknopf mit kleinem Zeichen; Name und Kürzel im Tooltip und für Screenreader */
function ToolButton({ tool, active, onClick }: { tool: Tool; active: boolean; onClick: () => void }) {
  const info = TOOL_INFO[tool];
  const icon: Record<Tool, React.ReactNode> = {
    select: <path d="M5 3l12 8-5.5 1.2L9 18z" fill="currentColor" />,
    pen: <path d="M4 16c3-1 4-5 7-8l3-3 2 2-3 3c-3 3-6 5-9 6z M13 6l2 2" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />,
    eraser: <path d="M3 14l7-8 6 5-6 6H6z M8 17h9" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />,
    line: <path d="M4 16L16 4" stroke="currentColor" strokeWidth={1.6} />,
    arrow: <path d="M4 16L15 5 M9 5h6v6" fill="none" stroke="currentColor" strokeWidth={1.6} />,
    rect: <rect x={4} y={5} width={12} height={10} fill="none" stroke="currentColor" strokeWidth={1.6} />,
    ellipse: <circle cx={10} cy={10} r={6} fill="none" stroke="currentColor" strokeWidth={1.6} />,
    tape: <path d="M3 12l3-4 1 1 1-1 7 0 1 1 1-1-3 4-1-1-1 1H5l-1-1z" fill="currentColor" opacity={0.75} />,
  };
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`${info.label} (${info.key})`}
      title={`${info.label} (${info.key})`}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center border transition-colors duration-150 ${active ? "border-on-table bg-on-table text-table" : "text-on-table border-transparent hover:border-on-table/60"}`}
    >
      <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5">
        {icon[tool]}
      </svg>
    </button>
  );
}
