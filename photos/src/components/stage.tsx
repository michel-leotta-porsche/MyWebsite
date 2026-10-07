"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import type { BookData, Box, FreeEl, FreeItem, TextRole } from "@/content/books";
import { TEXT_ROLE } from "@/content/layout";
import { inputClass, TextButton } from "@/components/app-ui";
import { CropDialog } from "@/components/crop-dialog";
import { PageView } from "@/components/page-view";
import {
  applyArrangement,
  arrangements,
  boxOf,
  collides,
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
};

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

const DEFAULT_TEXT: Record<TextRole, string> = { heading: "Überschrift", body: "Ein paar Sätze zu diesem Tag.", note: "Notiz" };

export function Stage({
  data,
  geom,
  index,
  items,
  photos,
  shelf,
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
  /** schon frei gestaltet (sonst ist es die automatische Variante) */
  free: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onCommit: (items: SpreadItem[], tag?: string) => void;
  onShelve: (key: string) => void;
  onPhoto: (key: string, patch: Partial<StoredPhoto>, tag: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const grid = useMemo(() => spreadGrid(geom), [geom]);
  const [sel, setSel] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ id: string; box: Box; bad: boolean; original: boolean } | null>(null);
  const [guides, setGuides] = useState<{ xs: number[]; ys: number[] }>({ xs: [], ys: [] });
  const [gridOn, setGridOn] = useState(() => {
    try {
      return localStorage.getItem("fuji-grid") === "1";
    } catch {
      return false;
    }
  });
  const [armed, setArmed] = useState<{ role?: TextRole; key?: string } | null>(null);
  const [say, setSay] = useState("");
  const [crop, setCrop] = useState<string | null>(null);
  const [page, setPage] = useState<0 | 1>(0);
  const [width, setWidth] = useState(0);
  const [coarse, setCoarse] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
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

  const shown = items.map((i) => (draft && i.id === draft.id ? { ...i, box: draft.box } : i));
  const selected = shown.find((i) => i.id === sel) ?? null;
  const noOf = (key: string) => data.plates.find((p) => p.key === key)?.no;
  const pages = fromSpread(shown).map((p) => ({
    kind: "free" as const,
    items: p.items.flatMap((it): FreeEl[] => {
      if (it.t === "text") return [{ t: "text", text: it.text, role: it.role, box: it.box }];
      const no = noOf(it.key);
      return no ? [{ t: "photo", no, box: it.box, crop: it.crop, caption: it.caption }] : [];
    }),
  }));

  const commit = (next: SpreadItem[], tag?: string, message?: string) => {
    onCommit(next, tag);
    if (message) setSay(message);
  };
  const photoRatio = (it: SpreadItem) => {
    if (it.t !== "photo") return null;
    const p = photos.get(it.key);
    return p ? p.w / p.h : null;
  };
  const realRatio = (b: Box) => b.w / ((b.h / 100) * grid.H);
  const minW = (it: SpreadItem) => (it.t === "text" ? grid.cw * 2 + 2 : grid.cw);
  const where = (b: Box) => {
    const p = b.x + b.w / 2 < 100 ? 0 : 1;
    const col = grid.cols[p].filter((_, i) => i % 2 === 0).findIndex((c) => Math.abs(c - b.x) < 0.6);
    const row = grid.rows.filter((_, i) => i % 2 === 0).findIndex((r) => Math.abs(r - b.y) < 0.6);
    return `${p === 0 ? "linke" : "rechte"} Seite${col >= 0 ? `, Spalte ${col + 1}` : ""}${row >= 0 ? `, Zeile ${row + 1}` : ""}`;
  };
  const nameOf = (it: SpreadItem) =>
    it.t === "photo" ? `Foto ${noOf(it.key) ?? ""} ${photos.get(it.key)?.title || ""}`.trim() : `${TEXT_ROLE[it.role].label}: ${it.text.slice(0, 30)}`;

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
    if (bt - t < grid.rowH) {
      if (e.t) t = bt - grid.rowH;
      else bt = t + grid.rowH;
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

  // ---- Zeiger ----
  const startDrag = (e: React.PointerEvent, it: SpreadItem, edges: Edges | null) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const wasSelected = sel === it.id;
    setSel(it.id);
    setArmed(null);
    // Touch: erst antippen, dann ziehen; so verschiebt Scrollen nichts aus Versehen
    if (e.pointerType === "touch" && !wasSelected && !edges) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id: it.id, edges, sx: e.clientX, sy: e.clientY, box0: boxOf(it, geom), moved: false, shift: e.shiftKey };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const it = items.find((i) => i.id === d.id);
    if (!it) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 3) return;
    d.moved = true;
    const u = toUnits(e.clientX - d.sx, e.clientY - d.sy);
    const r = d.edges ? resizeBox(it, d.box0, d.edges, u.x, u.y, e.shiftKey) : moveBox(it, d.box0, u.x, u.y, e.altKey);
    const box = it.t === "text" ? { ...r.box, h: it.box.h } : r.box;
    setDraft({ id: it.id, box, bad: collides(items, it.id, boxOf({ ...it, box }, geom), geom), original: r.original });
    setGuides({ xs: r.xs, ys: r.ys });
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    setGuides({ xs: [], ys: [] });
    if (!d || !d.moved || !draft) {
      setDraft(null);
      return;
    }
    const it = items.find((i) => i.id === d.id);
    if (it && !draft.bad) {
      const next = items.map((i) => (i.id === d.id ? { ...i, box: draft.box } : i));
      commit(next, undefined, `${nameOf(it)}: ${where(draft.box)}`);
    } else if (it) setSay("Dort liegt schon etwas. Zurückgesetzt.");
    setDraft(null);
  };

  // ---- Neues Element: Text aus der Palette, Foto aus der Ablage ----
  const pageAt = (x: number): 0 | 1 => (x < 100 ? 0 : 1);
  const addText = (role: TextRole, p: 0 | 1, at?: { x: number; y: number }) => {
    const cols = role === "heading" ? 6 : role === "body" ? 4 : 3;
    const w = cols * grid.cw + (cols - 1) * 2;
    const text = DEFAULT_TEXT[role];
    const h = boxOf({ t: "text", id: "x", text, role, box: { x: 0, y: 0, w, h: 0 } }, geom).h;
    const box = placeNew(items, geom, p, w, h, at) ?? placeNew(items, geom, (1 - p) as 0 | 1, w, h);
    if (!box) return setSay("Auf dieser Doppelseite ist kein Platz mehr für Text.");
    const id = itemId();
    commit([...items, { t: "text", id, text, role, box: { ...box, h } }], undefined, `${TEXT_ROLE[role].label} hinzugefügt: ${where(box)}. Text rechts schreiben.`);
    setSel(id);
    window.setTimeout(() => textArea.current?.select(), 50);
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
        const box = placeNew(items, geom, pg, w, h, pg === p ? at : undefined);
        if (box) {
          const id = itemId();
          commit([...items, { t: "photo", id, key, box, caption: "auto" }], undefined, `Foto hinzugefügt: ${where(box)}`);
          setSel(id);
          return;
        }
      }
    }
    setSay(`Kein Platz frei. Höchstens ${MAX_PHOTOS_PER_PAGE} Fotos pro Seite; sonst erst eine Aufteilung wählen oder ein Foto verkleinern.`);
  };
  const pointOf = (clientX: number, clientY: number) => {
    const r = layer.current!.getBoundingClientRect();
    return toUnits(clientX - r.left, clientY - r.top);
  };

  // ---- Tastatur auf einem Element ----
  const onItemKey = (e: React.KeyboardEvent, it: SpreadItem) => {
    const step = { x: grid.colPitch, y: grid.rowPitch };
    const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const a = arrows[e.key];
    if (a) {
      e.preventDefault();
      const b = it.box;
      const box = e.shiftKey
        ? { ...b, w: Math.max(minW(it), b.w + a[0] * step.x), h: it.t === "text" ? b.h : Math.max(grid.rowH, b.h + a[1] * step.y) }
        : { ...b, x: Math.min(200 - b.w, Math.max(0, b.x + a[0] * step.x)), y: Math.min(100 - b.h, Math.max(0, b.y + a[1] * step.y)) };
      if (collides(items, it.id, boxOf({ ...it, box }, geom), geom)) return setSay("Dort liegt schon etwas.");
      commit(
        items.map((i) => (i.id === it.id ? { ...i, box } : i)),
        `key-${it.id}`,
        e.shiftKey ? `Größe ${Math.round(box.w)} × ${Math.round(box.h)}` : where(box),
      );
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      remove(it);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (it.t === "photo") setCrop(it.id);
      else textArea.current?.focus();
    }
  };
  const remove = (it: SpreadItem) => {
    setSel(null);
    if (it.t === "photo") onShelve(it.key);
    else commit(items.filter((i) => i.id !== it.id), undefined, "Text entfernt");
  };

  // Esc: erst Auswahl, dann Bühne; G: Raster
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "Escape" && !crop) {
        if (armed) setArmed(null);
        else if (sel) setSel(null);
        else onClose();
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
  }, [armed, crop, onClose, sel]);

  const curPage: 0 | 1 = selected ? pageAt(selected.box.x + selected.box.w / 2) : narrow ? page : 0;
  const nOnPage = photosOnPage(shown, curPage);
  const options = arrangements(geom, curPage, nOnPage);
  const handle = coarse ? 44 : 24;
  const pct = (b: Box) => ({ left: `${b.x / 2}%`, top: `${b.y}%`, width: `${b.w / 2}%`, height: `${b.h}%` });
  const cropItem = crop ? items.find((i) => i.id === crop) : undefined;
  const showGrid = gridOn || !!draft;

  return (
    <div className="linen table-surface fixed inset-0 z-[600] overflow-y-auto bg-table" role="dialog" aria-modal="true" aria-label={`Doppelseite ${index + 1} gestalten`}>
      <header className="sticky top-0 z-30 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 bg-table/95 px-4 py-4 md:px-8">
        <span className="flex items-baseline gap-5">
          <TextButton onClick={onClose}>← Zur Übersicht</TextButton>
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
          {width > 0 && (
            <div className="overflow-hidden shadow-[0_24px_48px_-20px_rgb(12_10_8/0.85)]" style={{ width: narrow ? pageW : W }}>
              <div
                className="relative transition-transform duration-500 ease-out"
                style={{ width: W, height: Hpx, transform: narrow && page === 1 ? `translateX(${-pageW}px)` : undefined }}
              >
                {(["left", "right"] as const).map((side, i) => (
                  <div key={side} className="absolute top-0" style={{ left: i * pageW, width: pageW, height: Hpx }}>
                    <PageView book={data} page={pages[i]} side={side} eager />
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
                  ref={layer}
                  className={`absolute inset-0 z-50 ${armed ? "cursor-copy" : ""}`}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onPointerCancel={onUp}
                  onPointerDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (armed) {
                      const at = pointOf(e.clientX, e.clientY);
                      if (armed.role) addText(armed.role, pageAt(at.x), at);
                      else if (armed.key) addPhoto(armed.key, pageAt(at.x), at);
                      setArmed(null);
                    } else setSel(null);
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
                  {shown.map((it) => {
                    const b = boxOf(it, geom);
                    const isSel = it.id === sel;
                    const bad = draft?.id === it.id && draft.bad;
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
                          onDoubleClick={() => (it.t === "photo" ? setCrop(it.id) : textArea.current?.focus())}
                          onKeyDown={(e) => onItemKey(e, it)}
                          onFocus={() => setSel(it.id)}
                          className={`absolute inset-0 ${isSel ? "cursor-move" : "cursor-pointer"} ${
                            isSel ? (bad ? "outline-dashed outline-2 outline-ink" : "outline-2 outline-mark") : "hover:outline-1 hover:outline-mark/70"
                          }`}
                        />
                        {isSel && draft?.id === it.id && draft.original && (
                          <span className="bg-ink text-paper pointer-events-none absolute top-1 left-1 px-1.5 py-0.5 text-[11px]">Originalformat</span>
                        )}
                        {isSel &&
                          !draft &&
                          HANDLES.filter((h) => it.t === "photo" || (!h.e.t && !h.e.b)).map((h) => (
                            <span
                              key={h.name}
                              aria-hidden
                              onPointerDown={(e) => startDrag(e, it, { ...h.e })}
                              className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center ${h.cls}`}
                              style={{ width: handle, height: handle, cursor: h.cursor, touchAction: "none" }}
                            >
                              <span className="border-ink bg-paper block h-2.5 w-2.5 border" />
                            </span>
                          ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {coarse ? (
            <p className="text-on-table-2 mt-4 max-w-[70ch] text-[13px] leading-relaxed">
              Antippen wählt, dann ziehen verschiebt. Die Griffe ändern die Größe, Doppeltippen schneidet zu. Werkzeuge stehen darunter.
            </p>
          ) : (
            <p className="text-on-table-2 mt-4 max-w-[70ch] text-[13px] leading-relaxed">
              Ziehen verschiebt, die Griffe ändern die Größe, Doppelklick schneidet zu. Kanten rasten am Raster ein, <kbd>Alt</kbd> beim Ziehen setzt frei.
              Tastatur: <kbd>Tab</kbd> wählt, Pfeile verschieben um eine Spalte oder Zeile, <kbd>Shift</kbd> + Pfeile ändern die Größe, <kbd>Enter</kbd>{" "}
              schneidet zu, <kbd>Entf</kbd> nimmt heraus, <kbd>G</kbd> zeigt das Raster.
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
              onCrop={() => setCrop(selected.id)}
              onRemove={() => remove(selected)}
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
              {boxOf(selected, geom).y + boxOf(selected, geom).h > grid.ys[grid.ys.length - 2] + 0.5 && (
                <p className="text-ink text-[12px] font-semibold">Der Text läuft unten aus dem Satzspiegel. Kürzen oder den Rahmen breiter ziehen.</p>
              )}
              <TextButton className="!text-ink text-sm" onClick={() => remove(selected)}>
                Textrahmen entfernen
              </TextButton>
            </div>
          )}

          <div className="slip text-ink space-y-3 p-5">
            <p className="text-sm font-semibold">Text hinzufügen</p>
            <p className="text-ink-2 text-[12px] leading-snug">Auf die Seite ziehen, oder antippen und dann auf die Seite tippen.</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TEXT_ROLE) as TextRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/x-role", r)}
                  onClick={(e) => (e.detail === 0 ? addText(r, curPage) : setArmed(armed?.role === r ? null : { role: r }))}
                  aria-pressed={armed?.role === r}
                  className={`cursor-grab border px-3 py-1.5 text-sm ${armed?.role === r ? "border-ink bg-ink text-paper" : "border-ink/30"}`}
                >
                  {TEXT_ROLE[r].label}
                </button>
              ))}
            </div>
            {armed?.role && <p className="text-ink text-[12px]">Jetzt auf eine freie Stelle der Seite tippen. Esc bricht ab.</p>}
          </div>

          {nOnPage > 0 && options.length > 0 && (
            <div className="slip text-ink space-y-3 p-5">
              <p className="text-sm font-semibold">
                Aufteilung {curPage === 0 ? "links" : "rechts"} · {nOnPage} {nOnPage === 1 ? "Foto" : "Fotos"}
              </p>
              <ul className="grid grid-cols-2 gap-3">
                {options.map((o) => (
                  <li key={o.label}>
                    <button
                      type="button"
                      onClick={() => commit(applyArrangement(items, curPage, o.boxes), undefined, `Aufteilung „${o.label}“`)}
                      className="group block w-full text-left"
                    >
                      <svg aria-hidden viewBox={`0 0 100 ${grid.H}`} className="bg-paper block w-full border border-ink/20">
                        {o.boxes.map((b, i) => (
                          <rect key={i} x={b.x - curPage * 100} y={(b.y / 100) * grid.H} width={b.w} height={(b.h / 100) * grid.H} className="fill-ink/70 group-hover:fill-ink" />
                        ))}
                      </svg>
                      <span className="mt-1 block text-[12px] underline decoration-mark decoration-2 underline-offset-4">{o.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {shelf.length > 0 && (
            <div className="slip text-ink space-y-3 p-5">
              <p className="text-sm font-semibold">Ablage</p>
              <p className="text-ink-2 text-[12px] leading-snug">Auf die Seite ziehen oder antippen, dann auf die Seite tippen.</p>
              <ul className="flex flex-wrap gap-2">
                {shelf.map((p) => (
                  <li key={p.key}>
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/x-photo", p.key)}
                      onClick={(e) => (e.detail === 0 ? addPhoto(p.key, curPage) : setArmed(armed?.key === p.key ? null : { key: p.key }))}
                      aria-pressed={armed?.key === p.key}
                      aria-label={`Foto auf die Seite legen: ${p.title || "ohne Titel"}`}
                      className={`relative block h-16 w-16 ${armed?.key === p.key ? "outline-2 outline-offset-2 outline-ink" : ""}`}
                    >
                      <Image src={p.thumb} alt="" fill sizes="64px" className="object-cover" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

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
}: {
  item: Extract<FreeItem, { t: "photo" }>;
  photo?: StoredPhoto;
  onCaption: (c: "auto" | "off") => void;
  onTitle: (t: string) => void;
  onCrop: () => void;
  onRemove: () => void;
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
          In die Ablage
        </button>
      </div>
    </div>
  );
}
