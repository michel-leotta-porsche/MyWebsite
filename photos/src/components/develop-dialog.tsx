"use client";

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { BookmarkPlus, Check, ChevronDown, Columns2, Redo2, RotateCcw, Trash, Undo2, X, ZoomIn, ZoomOut } from "lucide-react";
import { motion } from "motion/react";

import { Button, buttonClass, IconButton, ToolGroup } from "@/components/ui/button";
import { bakePhoto } from "@/lib/develop/bake";
import {
  applyLut,
  cleanEdit,
  autoEdit,
  buildLut,
  FINE,
  isNeutral,
  LOOKS,
  lookOf,
  matchTransfer,
  moodTransfer,
  neutralEdit,
  PRESETS,
  REC0,
  recipeIsEmpty,
  sameRecipe,
  fineOf as lookFineOf,
  wearsLook,
  signedStep,
  stats,
  type NamedRecipe,
  type PhotoEdit,
  type PhotoStats,
  type RecipeValues,
} from "@/lib/develop/model";
import { createPreviewer, type Previewer } from "@/lib/develop/preview";
import { deleteRecipe, myRecipes, saveRecipe, uploadEdited, type StoredPhoto } from "@/lib/store";
import { useReducedMotion } from "@/lib/use-reduced-motion";

// Bearbeiten auf der Werkbank: immer ein Foto, die anderen der Doppelseite liegen daneben und lassen sich antippen.
// Alle Werkzeuge ergeben einen LUT; die Vorschau rechnet ihn auf der Grafikkarte, „Fertig“ rechnet im Worker ein.
// Während man zieht, reicht ein grober LUT (17³); steht die Hand still, kommt der feine (33³).

type Tab = "s" | "l" | "f" | "r";
type FineKey = (typeof FINE)[number][0];
type Loaded = { thumb: ImageData; tile: ImageData; st: PhotoStats };
export type DevelopPatch = Partial<StoredPhoto>;

const TABS: [Tab, string][] = [
  ["s", "Vorschläge"],
  ["l", "Looks"],
  ["f", "Feinschliff"],
  ["r", "Rezept"],
];
const FAST = 17;
const FINE_N = 33;
const LEVEL: [0 | 1 | 2, string][] = [
  [0, "Aus"],
  [1, "Schwach"],
  [2, "Stark"],
];
// Feld auf Papier für Auswahl und Namen: Pille mit feiner Kontur, wie die Chips
const fieldClass =
  "bg-ink/6 text-ink placeholder:text-ink-2 min-h-11 rounded-full border-0 px-4 text-[15px] shadow-[inset_0_0_0_1px_rgb(27_28_26/0.14)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
/** Wahl aus wenigen Möglichkeiten auf Papier: gewählt in Tinte (wie in der Bühne) */
const chip = (on: boolean) =>
  `min-h-9 min-w-11 rounded-full px-3.5 text-sm font-semibold transition-colors duration-150 pointer-coarse:min-h-11 ${on ? "bg-ink text-paper" : "bg-ink/6 text-ink shadow-[inset_0_0_0_1px_rgb(27_28_26/0.14)] hover:bg-ink/10"}`;
const groupTitle = "text-ink mb-2.5 text-[15px] font-bold tracking-[-0.01em]";

/* ---------- LUT-Speicher: dieselbe Bearbeitung wird nicht zweimal gerechnet ---------- */

const lutCache = new Map<string, Uint8Array>();
function lutFor(e: PhotoEdit, n: number, key = JSON.stringify(e)): Uint8Array {
  const k = `${n}|${key}`;
  let lut = lutCache.get(k);
  if (!lut) {
    lut = buildLut(e, n);
    if (lutCache.size > 96) lutCache.delete(lutCache.keys().next().value!);
    lutCache.set(k, lut);
  }
  return lut;
}

/* ---------- Bilder laden ---------- */

type Pic = ImageBitmap | HTMLImageElement;
const sizeOf = (p: Pic): [number, number] => ("naturalWidth" in p ? [p.naturalWidth, p.naturalHeight] : [p.width, p.height]);
const release = (p: Pic) => "close" in p && p.close();

/** Kurzer Grund für die Fehlermeldung, damit ein Bericht vom Telefon zeigt, was schiefging */
export const reasonOf = (e: unknown) => (e instanceof Error ? `${e.name}: ${e.message}` : String(e)).slice(0, 120);

function viaElement(url: string) {
  return new Promise<HTMLImageElement>((ok, fail) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () =>
      img.decode().then(
        () => ok(img),
        () => ok(img),
      );
    img.onerror = () => fail(new Error("Bild lädt nicht"));
    img.src = url;
  });
}

/**
 * Foto entpackt laden: erst über fetch und createImageBitmap (außerhalb des Hauptthreads),
 * scheitert das (Safari meldet dann nur „Load failed“), über ein img-Element mit CORS.
 */
async function pictureOf(url: string): Promise<Pic> {
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await createImageBitmap(await res.blob());
  } catch (e) {
    console.warn("[bearbeiten] fetch/createImageBitmap", reasonOf(e));
    return viaElement(url);
  }
}

// Eine Zeichenfläche für alle kleinen Abzüge statt einer pro Bild. Safari begrenzt den Speicher aller
// Canvas einer Seite und gibt ihn erst spät frei; ist er voll, liefert getContext null.
let scratch: HTMLCanvasElement | null = null;
function scratchCtx(w: number, h: number) {
  scratch ??= document.createElement("canvas");
  scratch.width = w;
  scratch.height = h;
  const ctx = scratch.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Kein Speicher für eine Zeichenfläche");
  return ctx;
}
/** Speicher der Zeichenfläche sofort freigeben (Safari wartet sonst auf die Speicherbereinigung) */
export const freeCanvas = (c: HTMLCanvasElement | OffscreenCanvas | null | undefined) => {
  if (!c) return;
  c.width = 0;
  c.height = 0;
};

function pixelsOf(pic: Pic, maxW: number): ImageData {
  const [w0, h0] = sizeOf(pic);
  const s = Math.min(1, maxW / w0);
  const w = Math.max(1, Math.round(w0 * s));
  const h = Math.max(1, Math.round(h0 * s));
  const ctx = scratchCtx(w, h);
  ctx.drawImage(pic, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

/** Größe des eingerechneten großen Bilds, damit die Körnung in der Vorschau gleich groß ist */
const fullOf = (p: StoredPhoto): [number, number] => {
  const s = Math.min(1, 2560 / Math.max(p.w, p.h));
  return [Math.round(p.w * s), Math.round(p.h * s)];
};

/* ---------- Zoom ---------- */

/** Ausschnitt: Vergrößerung und Versatz in Bruchteilen der Bühne */
type View = { z: number; x: number; y: number };
const FIT: View = { z: 1, x: 0, y: 0 };
const ZMAX = 8;
// das Foto füllt die Bühne immer, kein Rand daneben
const clampView = (v: View): View => {
  const z = Math.min(ZMAX, Math.max(1, v.z));
  return { z, x: Math.min(0, Math.max(1 - z, v.x)), y: Math.min(0, Math.max(1 - z, v.y)) };
};
/** neue Vergrößerung, die Stelle (fx, fy) auf der Bühne bleibt, wo sie ist */
const zoomAt = (v: View, z: number, fx: number, fy: number): View => ({ z, x: fx - ((fx - v.x) / v.z) * z, y: fy - ((fy - v.y) / v.z) * z });

/* ---------- Kleines Bild mit LUT, für Kacheln und den Streifen ---------- */

const LutThumb = memo(function LutThumb({ img, edit, className }: { img: ImageData; edit: PhotoEdit; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const k = JSON.stringify(edit);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = img.width;
    c.height = img.height;
    const out = new ImageData(img.width, img.height);
    applyLut(img.data, out.data, lutFor(JSON.parse(k) as PhotoEdit, FAST, k), FAST);
    c.getContext("2d")?.putImageData(out, 0, 0);
  }, [img, k]);
  useEffect(() => {
    const c = ref.current;
    return () => freeCanvas(c);
  }, []);
  return <canvas ref={ref} aria-hidden className={className} />;
});

/* ---------- Bausteine der Werkzeuge ---------- */

function Tile({ img, edit, name, txt, pressed, onClick, disabled }: { img?: ImageData; edit: PhotoEdit; name: string; txt: string; pressed: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" aria-pressed={pressed} disabled={disabled} onClick={onClick} className="group flex min-w-0 flex-col gap-1 text-left disabled:opacity-40" lang="de">
      <span className={`bg-paper-shade relative block aspect-[4/5] w-full outline-2 outline-offset-2 transition-[outline-color] duration-150 ${pressed ? "outline-ink" : "outline-transparent"}`}>
        {img && <LutThumb img={img} edit={edit} className="block size-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:-translate-y-[3px]" />}
        {pressed && (
          <span aria-hidden className="bg-ink text-paper absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full">
            <Check className="size-3" strokeWidth={3} />
          </span>
        )}
      </span>
      <b className="text-sm font-semibold break-words hyphens-auto max-sm:text-xs">{name}</b>
      <small className="text-ink-2 line-clamp-2 min-h-[2lh] text-xs leading-snug max-sm:hidden">{txt}</small>
    </button>
  );
}

/** Regler mit Punkt (geändert?), Wert und einem kleinen Zurück-Knopf, der nur diesen Wert zurücksetzt */
function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  zero,
  format,
  active,
  onFocus,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  zero: number;
  format: (v: number) => string;
  active?: boolean;
  onFocus?: () => void;
  onChange: (v: number) => void;
}) {
  const changed = Math.abs(value - zero) > 0.001;
  const fill = `${((value - min) / (max - min)) * 100}%`;
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-2 text-sm">
      <label htmlFor={id} className={`flex cursor-pointer items-center gap-2 ${active ? "font-bold" : ""}`}>
        <span aria-hidden className={`size-2 rounded-full border-[1.5px] ${changed ? "border-ink bg-mark" : "border-ink-2"}`} />
        {label}
      </label>
      <button
        type="button"
        onClick={() => onChange(zero)}
        disabled={!changed}
        title={`${label} zurücksetzen`}
        className={`text-ink-2 hover:text-ink hover:bg-ink/8 -my-2.5 -ml-1 grid size-11 place-items-center rounded-full transition-opacity duration-150 ${changed ? "" : "pointer-events-none opacity-0"}`}
      >
        <RotateCcw aria-hidden className="size-4" />
        <span className="sr-only">{label} zurücksetzen</span>
      </button>
      <output htmlFor={id} className="text-ink-2 text-xs tabular-nums">
        {format(value)}
      </output>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onFocus={onFocus}
        onChange={(e) => onChange(Number(e.target.value))}
        onDoubleClick={() => onChange(zero)}
        className="range col-span-3 m-0 h-8 w-full pointer-coarse:h-9"
        style={{ "--fill": fill } as React.CSSProperties}
      />
    </div>
  );
}

function Chips<T extends string | number | null>({ label, opts, cur, onPick }: { label: string; opts: [T, string][]; cur: T; onPick: (v: T) => void }) {
  return (
    <div>
      <h3 className={groupTitle}>{label}</h3>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        {opts.map(([v, txt]) => (
          <button key={String(v)} type="button" aria-pressed={cur === v} onClick={() => onPick(v)} className={chip(cur === v)}>
            {txt}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Weißabgleich-Verschiebung wie im Kameramenü: −9 bis +9, R nach rechts, B nach oben.
 * Das Feld ist für Finger und Maus; Tastatur und VoiceOver nehmen die zwei Regler darunter.
 */
function WbPad({ r, b, onChange }: { r: number; b: number; onChange: (r: number, b: number) => void }) {
  const pad = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const at = (e: React.PointerEvent) => {
    const q = pad.current!.getBoundingClientRect();
    const c = (v: number) => Math.min(1, Math.max(0, v));
    onChange(Math.round(c((e.clientX - q.left) / q.width) * 18 - 9), Math.round(9 - c((e.clientY - q.top) / q.height) * 18));
  };
  return (
    <div>
      <h3 className={groupTitle}>Weißabgleich-Verschiebung</h3>
      <div className="flex flex-wrap items-center gap-3.5">
        <div
          ref={pad}
          aria-hidden
          className="wbpad relative size-[152px] flex-none cursor-crosshair touch-none overflow-hidden rounded-cut shadow-[inset_0_0_0_1px_rgb(27_28_26/0.3)]"
          onPointerDown={(e) => {
            drag.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            at(e);
          }}
          onPointerMove={(e) => drag.current && at(e)}
          onPointerUp={() => (drag.current = false)}
          onPointerCancel={() => (drag.current = false)}
          onDoubleClick={() => onChange(0, 0)}
        >
          <span
            className="bg-mark border-ink pointer-events-none absolute z-[1] -mt-[7px] -ml-[7px] size-3.5 rounded-full border-2"
            style={{ left: `${((r + 9) / 18) * 100}%`, top: `${((9 - b) / 18) * 100}%` }}
          />
        </div>
        <div className="text-ink-2 text-[11px] leading-snug">
          <b className="text-ink block text-[15px] font-semibold tabular-nums">
            R {signedStep(r)} · B {signedStep(b)}
          </b>
          rechts mehr Rot
          <br />
          oben mehr Blau
          <br />
          Doppeltipp: Mitte
        </div>
      </div>
      <div className="mt-2 grid gap-1">
        <Slider id="dv-wb-r" label="Rot" value={r} min={-9} max={9} step={1} zero={0} format={signedStep} onChange={(v) => onChange(v, b)} />
        <Slider id="dv-wb-b" label="Blau" value={b} min={-9} max={9} step={1} zero={0} format={signedStep} onChange={(v) => onChange(r, v)} />
      </div>
    </div>
  );
}

/** Rückfrage im Stil der App; window.confirm zeigt in der iOS-App englische Knöpfe */
function Ask({ text, yes, no, onYes, onNo }: { text: string; yes: string; no: string; onYes: () => void; onNo: () => void }) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus(), []);
  return (
    <div className="fixed inset-0 z-[20] flex items-end justify-center bg-[rgb(12_10_8/0.55)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:items-center">
      <div role="alertdialog" aria-modal="true" aria-label={text} className="slip text-ink rounded-tool relative w-full max-w-sm p-5 shadow-[0_24px_48px_-20px_rgb(12_10_8/0.8)]">
        <p className="text-[17px] font-bold tracking-[-0.01em]">{text}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button ref={first} type="button" onClick={onNo} className={buttonClass("paper", "sm")}>
            {no}
          </button>
          <button type="button" onClick={onYes} className={buttonClass("ink", "sm")}>
            {yes}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Dialog ---------- */

export function DevelopDialog({
  photos: given,
  start,
  uid,
  bookId,
  onDone,
  onClose,
}: {
  /** die Fotos der Doppelseite; bearbeitet wird immer eins */
  photos: StoredPhoto[];
  start: string;
  uid: string;
  bookId: string;
  /** geänderte Fotos, als ein Schritt fürs Rückgängig */
  onDone: (patches: Record<string, DevelopPatch>) => void;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  // fester Stand beim Öffnen: der Editor rendert weiter, die Fotos ändern sich erst mit „Fertig“
  const [photos] = useState(given);
  const [initial] = useState(() => Object.fromEntries(photos.map((p) => [p.key, cleanEdit(p.edit) ?? neutralEdit()])) as Record<string, PhotoEdit>);
  const [edits, setEdits] = useState(initial);
  const [sel, setSel] = useState(start);
  const [tab, setTab] = useState<Tab>("s");
  const [active, setActive] = useState<FineKey>("exposure");
  const [compare, setCompare] = useState(false);
  const [split, setSplit] = useState(0.5);
  const [holding, setHolding] = useState(false);
  const [big, setBig] = useState<{ value: string; label: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Record<string, Loaded>>({});
  const [ready, setReady] = useState<string | null>(null);
  const [own, setOwn] = useState<NamedRecipe[]>([]);
  const [naming, setNaming] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ask, setAsk] = useState<{ text: string; yes: string; no: string; onYes: () => void } | null>(null);
  const cancelled = useRef(false);
  const [moodIdx, setMoodIdx] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const ghost = useRef<HTMLCanvasElement>(null);
  const previewer = useRef<Previewer | null>(null);
  const bitmaps = useRef(new Map<string, Promise<Pic>>());

  const photo = photos.find((p) => p.key === sel) ?? photos[0];
  // Fotos ohne Titel heißen nach ihrer Stelle auf der Seite
  const nameOf = (p: StoredPhoto) => p.title || `Foto ${photos.indexOf(p) + 1}`;
  const edit = edits[photo.key];
  const others = photos.filter((p) => p.key !== photo.key);
  const deferred = useDeferredValue(edits);
  const dirty = photos.some((p) => JSON.stringify(edits[p.key]) !== JSON.stringify(initial[p.key]));

  // Dialog modal öffnen: Fokus bleibt drin, Seite dahinter ist inert
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    const back = document.activeElement as HTMLElement | null;
    if (!d.open) d.showModal();
    return () => {
      d.close();
      back?.focus({ preventScroll: true });
    };
  }, []);

  // kleine Abzüge aller Fotos: Kacheln, Streifen und Statistik für die Vorschläge
  useEffect(() => {
    let live = true;
    for (const p of photos) {
      pictureOf(p.orig?.thumb ?? p.thumb)
        .then((pic) => {
          const thumb = pixelsOf(pic, 360);
          const tile = pixelsOf(pic, 160);
          release(pic);
          if (live) setLoaded((m) => ({ ...m, [p.key]: { thumb, tile, st: stats(thumb.data) } }));
        })
        .catch((e) => {
          console.warn("[bearbeiten] Abzug", reasonOf(e));
          if (live) setError(`Die kleinen Vorschauen ließen sich nicht laden (${reasonOf(e)}).`);
        })
        .finally(() => freeCanvas(scratch));
    }
    myRecipes(uid)
      .then((r) => live && setOwn(r))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [photos, uid]);

  // Vorschau: ein WebGL-Kontext für den ganzen Dialog
  useEffect(() => {
    const c = canvas.current!;
    const g = ghost.current;
    const maps = bitmaps.current;
    let p: Previewer | null = null;
    try {
      p = createPreviewer(c);
      previewer.current = p;
    } catch (e) {
      // in einem Rückruf, damit kein setState direkt im Effekt läuft
      queueMicrotask(() => setError(`Die Vorschau ließ sich nicht starten (${reasonOf(e)}).`));
    }
    return () => {
      p?.dispose();
      previewer.current = null;
      for (const b of maps.values()) b.then(release).catch(() => {});
      maps.clear();
      freeCanvas(c);
      freeCanvas(g);
      freeCanvas(scratch);
    };
  }, []);

  // gewähltes Foto in Seitengröße laden (vom Original, nie von einer eingerechneten Fassung)
  useEffect(() => {
    let live = true;
    let b = bitmaps.current.get(photo.key);
    if (!b) {
      b = pictureOf(photo.orig?.src ?? photo.src);
      bitmaps.current.set(photo.key, b);
    }
    b.then((pic) => {
      if (!live || !previewer.current) return;
      previewer.current.setImage(pic, fullOf(photo));
      setReady(photo.key);
    }).catch((e) => {
      console.warn("[bearbeiten] Foto", reasonOf(e));
      // beim nächsten Versuch neu holen
      bitmaps.current.delete(photo.key);
      if (live) setFailed(reasonOf(e));
    });
    return () => {
      live = false;
    };
  }, [photo, attempt]);

  // zeichnen: sofort mit grobem LUT, kurz danach mit dem feinen
  const shown = ready === photo.key;
  useEffect(() => {
    const p = previewer.current;
    if (!p || !shown) return;
    const key = JSON.stringify(edit);
    const draw = (n: number) => p.draw({ lut: lutFor(edit, n, key), n, rec: edit.rec, split: compare ? split : null, original: holding });
    const raf = requestAnimationFrame(() => draw(lutCache.has(`${FINE_N}|${key}`) ? FINE_N : FAST));
    const t = window.setTimeout(() => draw(FINE_N), 140);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [edit, compare, split, holding, shown]);

  /* ----- Ändern ----- */

  const setEdit = useCallback((fn: (e: PhotoEdit) => PhotoEdit) => setEdits((m) => ({ ...m, [sel]: fn(m[sel]) })), [sel]);

  // Überblenden: das bisherige Bild liegt kurz darüber und blendet aus (nur opacity)
  const fade = (slow = false) => {
    const g = ghost.current;
    const c = canvas.current;
    if (reduce || !g || !c || !shown) return;
    g.width = c.width;
    g.height = c.height;
    g.getContext("2d")?.drawImage(c, 0, 0);
    g.style.transition = "none";
    g.style.opacity = "1";
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        g.style.transition = `opacity ${slow ? 900 : 600}ms var(--ease-out)`;
        g.style.opacity = "0";
      }),
    );
  };
  /* ----- Rückgängig und Wiederholen: Stände aller Fotos, ein Regelzug zählt als ein Schritt ----- */

  const [past, setPast] = useState<Record<string, PhotoEdit>[]>([]);
  const [future, setFuture] = useState<Record<string, PhotoEdit>[]>([]);
  const editsNow = useRef(edits);
  useEffect(() => {
    editsNow.current = edits;
  }, [edits]);
  const lastLive = useRef(0);
  // nach Rückgängig das Foto zeigen, das sich dabei ändert
  const showChanged = (to: Record<string, PhotoEdit>) => {
    const k = photos.find((p) => JSON.stringify(to[p.key]) !== JSON.stringify(editsNow.current[p.key]))?.key;
    if (k && k !== sel) setSel(k);
  };
  const remember = () => {
    setPast((p) => [...p.slice(-79), editsNow.current]);
    setFuture([]);
  };
  const undo = () => {
    const prev = past.at(-1);
    if (!prev || busy) return;
    fade();
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [editsNow.current, ...f]);
    showChanged(prev);
    setEdits(prev);
    lastLive.current = 0;
  };
  const redo = () => {
    const next = future[0];
    if (!next || busy) return;
    fade();
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, editsNow.current]);
    showChanged(next);
    setEdits(next);
    lastLive.current = 0;
  };
  const steps = useRef({ undo, redo });
  useEffect(() => {
    steps.current = { undo, redo };
  });

  const act = (fn: (e: PhotoEdit) => PhotoEdit, slow = false) => {
    remember();
    fade(slow);
    setEdit(fn);
  };
  const setRec = (fn: (r: RecipeValues) => Partial<RecipeValues>, slow = false) => act((e) => ({ ...e, rec: { ...e.rec, ...fn(e.rec) } }), slow);
  // Regler und Wischen ändern laufend; erst nach einer kurzen Pause beginnt ein neuer Schritt im Verlauf
  const burst = () => {
    const now = performance.now();
    if (now - lastLive.current > 700) remember();
    lastLive.current = now;
  };
  const live = (patch: Partial<PhotoEdit>) => {
    burst();
    setEdit((e) => ({ ...e, ...patch }));
  };
  const liveRec = (patch: Partial<RecipeValues>) => {
    burst();
    setEdit((e) => ({ ...e, rec: { ...e.rec, ...patch } }));
  };

  /* ----- Vorschläge ----- */

  const me = loaded[photo.key]?.st;
  const otherStats = others.map((o) => loaded[o.key]?.st).filter((s): s is PhotoStats => !!s);
  const moodSrc = others.length ? others[moodIdx % others.length] : null;
  const moodSt = moodSrc ? loaded[moodSrc.key]?.st : undefined;
  const sugg = useMemo(() => {
    const n = neutralEdit();
    return {
      auto: me ? { ...n, ...autoEdit(me) } : n,
      match: me && otherStats.length ? { ...n, transfer: matchTransfer(me, otherStats) } : n,
      mood: me && moodSt ? { ...n, transfer: moodTransfer(me, moodSt) } : n,
    };
    // otherStats ist pro Render neu; die Länge und die Fotos genügen als Schlüssel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, moodSt, otherStats.length]);

  /* ----- Rezepte ----- */

  const allRecipes = [...PRESETS, ...own];
  const recMatch = allRecipes.find((r) => sameRecipe(r.v, edit.rec));
  const recEmpty = recipeIsEmpty(edit.rec);
  const recLabel = recMatch ? recMatch.name : recEmpty ? "" : edit.recName ? `${edit.recName} · geändert` : "Eigene Werte";

  // eigener Look: nimmt Feinschliff und Look mit, die Auto-Werte des Fotos (Tonwerte, Farbübertragung) bleiben
  const applyOwn = (r: NamedRecipe) => act((e) => ({ ...e, ...r.f, rec: { ...r.v }, recName: r.name }), true);
  const pickRecipe = (v: string) => {
    if (v === "save") return setNaming(true);
    if (v === "cur") return;
    if (v === "") return act((e) => ({ ...e, rec: REC0(), recName: undefined }));
    const r = allRecipes.find((x) => x.id === v);
    if (r) applyOwn(r);
  };
  const saveOwn = (name: string) => {
    // gleicher Name überschreibt den bestehenden Look, statt einen zweiten anzulegen
    const same = own.find((x) => x.name === name);
    const r: NamedRecipe = { id: same?.id ?? `own-${Date.now().toString(36)}`, name, txt: "eigener Look", v: { ...edit.rec }, f: lookFineOf(edit) };
    setOwn((o) => [...o.filter((x) => x.name !== name), r].sort((a, b) => a.name.localeCompare(b.name, "de")));
    setEdit((e) => ({ ...e, recName: name }));
    setNaming(false);
    setNote(`„${name}“ steht jetzt unter Vorschläge bei „Deine Looks“, auch für andere Fotos und Bücher.`);
    saveRecipe(uid, r).catch(() => setNote("Der Look ließ sich nicht speichern."));
  };
  const askDelete = (gone: NamedRecipe) =>
    setAsk({
      text: `„${gone.name}“ löschen? Fotos, die ihn nutzen, bleiben, wie sie sind.`,
      yes: "Löschen",
      no: "Behalten",
      onYes: () => {
        setOwn((o) => o.filter((r) => r.id !== gone.id));
        deleteRecipe(uid, gone.id).catch(() => {});
      },
    });
  const saveForm = naming && <SaveForm onCancel={() => setNaming(false)} onSave={saveOwn} />;

  /* ----- Zoom: Ausschnitt in Bruchteilen der Bühne, damit er Größenwechsel übersteht ----- */

  // gilt nur für das Foto, auf dem gezoomt wurde; ein anderes Foto beginnt ganz
  const [zoom, setZoom] = useState<View & { key: string; ease: boolean }>({ ...FIT, key: "", ease: false });
  const view: View = zoom.key === photo.key ? zoom : FIT;
  const viewNow = useRef(view);
  viewNow.current = view;
  const frame = useRef<HTMLDivElement>(null);
  const look = (v: View, ease = false) => setZoom({ ...clampView(v), key: photo.key, ease });
  // 100 %: ein Bildpunkt der Vorschau auf einen Punkt der Seite; mindestens doppelt, damit sich der Tipp lohnt
  const fullZoom = () => {
    const c = canvas.current;
    const w = frame.current?.clientWidth ?? 0;
    return Math.min(ZMAX, Math.max(2, c && w ? c.width / w : 2));
  };
  const zoomPct = (z: number) => {
    const c = canvas.current;
    const w = frame.current?.clientWidth ?? 0;
    return c && w ? Math.round(((z * w) / c.width) * 100) : Math.round(z * 100);
  };
  // Doppeltipp, Doppelklick und der Knopf: zwischen ganz und nah an der Stelle
  const toggleZoom = (fx = 0.5, fy = 0.5) => {
    const v = viewNow.current;
    look(v.z > 1.01 ? FIT : zoomAt(v, fullZoom(), fx, fy), !reduce);
  };
  // Mausrad und Trackpad: weich um den Zeiger
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const v = viewNow.current;
      const z = Math.min(ZMAX, Math.max(1, v.z * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015))));
      setZoom({ ...clampView(zoomAt(v, z, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height)), key: photo.key, ease: false });
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [photo.key]);

  /* ----- Gesten auf dem Foto ----- */

  type Mode = "hold" | "swipe" | "split" | "pan" | "pinch" | "none" | null;
  const gesture = useRef<{ x: number; y: number; w: number; v: number; mode: Mode; t: number; t0: number; from: View } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; fx: number; fy: number; from: View } | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const fineOf = (k: FineKey) => FINE.find((f) => f[0] === k)!;
  // Stelle auf der Bühne (0–1) in Stelle im Bild, für die Trennlinie bei Vorher/nachher
  const toImage = (f: number) => Math.min(1, Math.max(0, (f - view.x) / view.z));
  const where = (el: HTMLElement, x: number, y: number) => {
    const r = el.getBoundingClientRect();
    return [(x - r.left) / r.width, (y - r.top) / r.height] as const;
  };
  const pinchOf = (el: HTMLElement) => {
    const [a, b] = [...pointers.current.values()];
    const r = el.getBoundingClientRect();
    return { d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), fx: ((a.x + b.x) / 2 - r.left) / r.width, fy: ((a.y + b.y) / 2 - r.top) / r.height };
  };
  const endGesture = () => {
    const g = gesture.current;
    if (!g) return;
    window.clearTimeout(g.t);
    if (g.mode === "hold") setHolding(false);
    if (g.mode && g.mode !== "split") setBig(null);
  };

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    el.setPointerCapture(e.pointerId);
    // zweiter Finger: aus jeder Geste wird Aufziehen
    if (pointers.current.size === 2) {
      endGesture();
      pinch.current = { ...pinchOf(el), from: viewNow.current };
      gesture.current = { x: e.clientX, y: e.clientY, w: 1, v: 0, mode: "pinch", t: 0, t0: 0, from: viewNow.current };
      return;
    }
    if (pointers.current.size > 2) return;
    // Weg auf die Bühne bezogen, nicht aufs Foto: ein Hochformat wäre sonst überempfindlich
    const stageW = el.parentElement?.parentElement?.clientWidth ?? el.clientWidth;
    const g = { x: e.clientX, y: e.clientY, w: Math.max(stageW, 240), v: 0, mode: null as Mode, t: 0, t0: performance.now(), from: viewNow.current };
    gesture.current = g;
    if (compare) {
      g.mode = "split";
      setSplit(toImage(where(el, e.clientX, e.clientY)[0]));
      return;
    }
    g.t = window.setTimeout(() => {
      if (gesture.current === g && !g.mode) {
        g.mode = "hold";
        setHolding(true);
        setBig({ value: "Original", label: "loslassen zeigt wieder bearbeitet" });
      }
    }, 380);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    const el = e.currentTarget;
    const p = pinch.current;
    if (g.mode === "pinch" && p && pointers.current.size >= 2) {
      const now = pinchOf(el);
      const z = Math.min(ZMAX, Math.max(1, (p.from.z * now.d) / p.d));
      // der Punkt unter den Fingern bleibt unter den Fingern, auch wenn sie wandern
      const v = zoomAt(p.from, z, p.fx, p.fy);
      look({ z, x: v.x + now.fx - p.fx, y: v.y + now.fy - p.fy });
      setBig({ value: `${zoomPct(z)} %`, label: "Zoom" });
      return;
    }
    if (g.mode === "split") return setSplit(toImage(where(el, e.clientX, e.clientY)[0]));
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (g.mode === "pan") {
      const r = el.getBoundingClientRect();
      return look({ z: g.from.z, x: g.from.x + dx / r.width, y: g.from.y + dy / r.height });
    }
    // gezoomt verschiebt ein Finger den Ausschnitt
    if (!g.mode && view.z > 1.01 && Math.hypot(dx, dy) > 6) {
      window.clearTimeout(g.t);
      g.mode = "pan";
      return;
    }
    // erst nach 16px und flacher als 30°
    if (!g.mode && Math.hypot(dx, dy) > 16) {
      if (Math.abs(dy) > Math.abs(dx) * 0.58) {
        window.clearTimeout(g.t);
        g.mode = "none";
        return;
      }
      window.clearTimeout(g.t);
      g.mode = "swipe";
      const t = tab;
      if (t === "s") {
        g.mode = "none";
        setNote("Wischen stellt unter Looks und Feinschliff ein. Hier genügt ein Tipp auf einen Vorschlag.");
      } else if (t === "r") {
        g.mode = "none";
        setNote("Im Rezept stellst du die Werte unten ein, wie an der Kamera.");
      } else if (t === "l" && !edit.look) {
        g.mode = "none";
        setNote("Erst einen Look wählen, dann wischen.");
      }
      g.v = t === "l" ? edit.amount : edit[active];
    }
    if (g.mode !== "swipe") return;
    const k = dx / g.w;
    if (tab === "l") {
      const v = Math.min(1, Math.max(0, g.v + k));
      live({ amount: v });
      setBig({ value: `${Math.round(v * 100)} %`, label: lookOf(edit.look)?.name ?? "" });
    } else {
      const [key, name, fmt, min, max] = fineOf(active);
      let v = Math.min(max, Math.max(min, g.v + k * (max - min) * 0.8));
      // nahe der Mitte rastet der Wert auf null ein
      if (min < 0 && Math.abs(v) < (max - min) * 0.015) v = 0;
      live({ [key]: v });
      setBig({ value: fmt(v), label: name });
    }
  };
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const last = pointers.current.get(e.pointerId);
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (!g) return;
    if (g.mode === "pinch") {
      // ein Finger bleibt liegen: weiter verschieben, ohne Sprung
      const rest = [...pointers.current.values()][0];
      if (pointers.current.size === 1 && rest) {
        pinch.current = null;
        setBig(null);
        gesture.current = { ...g, x: rest.x, y: rest.y, mode: viewNow.current.z > 1.01 ? "pan" : "none", from: viewNow.current };
      } else if (!pointers.current.size) {
        pinch.current = null;
        setBig(null);
        gesture.current = null;
      }
      return;
    }
    endGesture();
    gesture.current = null;
    // kurzer Tipp ohne Weg; zwei davon kurz hintereinander zoomen
    if (e.type !== "pointerup" || !last || (g.mode && g.mode !== "split") || performance.now() - g.t0 > 300 || Math.hypot(last.x - g.x, last.y - g.y) > 10) return;
    const t = lastTap.current;
    const now = performance.now();
    if (t && now - t.t < 350 && Math.hypot(t.x - last.x, t.y - last.y) < 30) {
      lastTap.current = null;
      const [fx, fy] = where(e.currentTarget, last.x, last.y);
      toggleZoom(fx, fy);
    } else lastTap.current = { t: now, x: last.x, y: last.y };
  };

  // Tastatur: + und − zoomen zur Mitte, 0 zeigt das ganze Foto
  const zoomKeys = useRef((k: string) => void k);
  zoomKeys.current = (k) => {
    const v = viewNow.current;
    look(k === "0" ? FIT : zoomAt(v, Math.min(ZMAX, Math.max(1, v.z * (k === "+" ? 1.5 : 1 / 1.5))), 0.5, 0.5), !reduce);
  };

  // Tastatur: \ halten zeigt das Original, 1–4 wechseln den Reiter
  useEffect(() => {
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && !!t.closest("input, select, textarea, [role=slider]");
    const down = (e: KeyboardEvent) => {
      // ⌘Z / ⇧⌘Z (Strg+Z / Strg+Y) auch auf einem Regler; in Textfeldern bleibt das Rückgängig des Felds
      if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key.toLowerCase() === "z" || e.key.toLowerCase() === "y")) {
        const t = e.target;
        if (t instanceof HTMLElement && t.closest("input:not([type=range]), select, textarea")) return;
        e.preventDefault();
        if (e.key.toLowerCase() === "y" || e.shiftKey) steps.current.redo();
        else steps.current.undo();
        return;
      }
      if (typing(e.target)) return;
      // \ liegt auf deutschen Tastaturen hinter Alt (Mac) oder AltGr; deshalb ohne Prüfung der Zusatztasten
      if ((e.key === "\\" || e.key === "m") && !e.repeat) setHolding(true);
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "+" || e.key === "-" || e.key === "0") return zoomKeys.current(e.key);
      const t = ({ 1: "s", 2: "l", 3: "f", 4: "r" } as Record<string, Tab>)[e.key];
      if (t) {
        setTab(t);
        setNote(null);
      }
    };
    const up = (e: KeyboardEvent) => (e.key === "\\" || e.key === "m") && setHolding(false);
    document.addEventListener("keydown", down);
    document.addEventListener("keyup", up);
    return () => {
      document.removeEventListener("keydown", down);
      document.removeEventListener("keyup", up);
    };
  }, []);

  /* ----- Fertig: geänderte Fotos einrechnen und hochladen ----- */

  const close = () => {
    if (busy) {
      // Rechnen abbrechen: hochgeladene Dateien bleiben liegen, das Buch ändert sich nicht
      cancelled.current = true;
      return onClose();
    }
    if (!dirty) return onClose();
    setAsk({ text: "Änderungen verwerfen?", yes: "Verwerfen", no: "Weiter bearbeiten", onYes: onClose });
  };

  const finish = async () => {
    const changed = photos.filter((p) => JSON.stringify(edits[p.key]) !== JSON.stringify(initial[p.key]));
    if (!changed.length) return onClose();
    setError(null);
    cancelled.current = false;
    const patches: Record<string, DevelopPatch> = {};
    try {
      for (const [i, p] of changed.entries()) {
        const e = edits[p.key];
        const orig = p.orig ?? { src: p.src, large: p.large, thumb: p.thumb, color: p.color };
        if (isNeutral(e)) {
          // zurück zum Original: nichts rechnen, die alten Dateien gelten wieder
          if (p.orig) patches[p.key] = { src: orig.src, large: orig.large, thumb: orig.thumb, color: orig.color, edit: undefined, orig: undefined };
          continue;
        }
        setBusy(changed.length > 1 ? `Speichere Foto ${i + 1} von ${changed.length} …` : "Speichere das Foto …");
        const out = await bakePhoto({ url: orig.large, lut: lutFor(e, FINE_N), n: FINE_N, rec: e.rec });
        if (cancelled.current) return;
        const urls = await uploadEdited(uid, bookId, p.key, out.blobs);
        if (cancelled.current) return;
        patches[p.key] = { edit: e, orig, src: urls.page, large: urls.large, thumb: urls.thumb, color: out.color };
      }
    } catch (e) {
      if (cancelled.current) return;
      console.warn("[bearbeiten] Einrechnen", reasonOf(e));
      setBusy(null);
      setError(`Speichern hat nicht geklappt. Prüf die Verbindung und tipp noch einmal auf Fertig. (${reasonOf(e)})`);
      return;
    }
    setBusy(null);
    onDone(patches);
  };

  /* ----- Texte ----- */

  const hint =
    note ??
    (compare
      ? "Den Strich auf dem Foto ziehen. Links ist das Original."
      : tab === "s"
        ? "Ein Tipp genügt. Danach kannst du unter Feinschliff nachstellen."
        : tab === "l"
          ? edit.look
            ? "Auf dem Foto wischen ändert die Stärke. Den Look noch einmal antippen oder „Ohne Look“ nimmt ihn weg."
            : "Jede Kachel zeigt den Look auf deinem Foto."
          : tab === "r"
            ? "Die Einstellungen einer Fuji-Kamera, nachempfunden. Gilt auch für Fotos vom iPhone."
            : `Auf dem Foto wischen stellt „${fineOf(active)[1]}“ ein. ↺ setzt einen Regler zurück.`);

  const switchTab = (t: Tab) => {
    setTab(t);
    setNote(null);
  };
  const aspect = photo.w / photo.h;
  const tileImg = loaded[photo.key]?.tile;

  // Fotos der Doppelseite: auf dem Telefon als Streifen unter dem Foto, am Desktop senkrecht direkt links daneben,
  // damit das Foto die ganze Höhe bekommt
  const strip = (className: string, thumb: string) =>
    photos.length > 1 && (
      <div role="group" aria-label="Fotos dieser Doppelseite" className={`flex gap-3 ${className}`}>
        {photos.map((p) => {
          const on = p.key === photo.key;
          const img = loaded[p.key]?.thumb;
          return (
            <button
              key={p.key}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setSel(p.key);
                setNote(null);
                setNaming(false);
              }}
              className={`group relative ${thumb} min-w-11 flex-none outline-3 outline-offset-2 transition-[outline-color] duration-150 ${on ? "outline-mark" : "outline-transparent"}`}
              style={{ aspectRatio: `${p.w} / ${p.h}` }}
            >
              {img && <LutThumb img={img} edit={deferred[p.key]} className="block size-full object-cover" />}
              {!on && <span aria-hidden className="bg-paper/55 absolute inset-0 transition-opacity duration-150 group-hover:opacity-50" />}
              <span className="sr-only">{on ? `${nameOf(p)}, in Bearbeitung` : `${nameOf(p)} bearbeiten`}</span>
            </button>
          );
        })}
      </div>
    );

  return (
    <dialog
      ref={dialog}
      aria-label="Foto bearbeiten"
      lang="de"
      className="bg-table text-on-table fixed inset-0 z-[700] m-0 h-full max-h-none w-full max-w-none overflow-hidden overscroll-contain p-0"
      onCancel={(e) => {
        e.preventDefault();
        // Escape schließt zuerst die Rückfrage
        if (ask) setAsk(null);
        else close();
      }}
    >
      <div className="flex h-full flex-col lg:mx-auto lg:grid lg:h-full lg:max-w-[1680px] lg:grid-cols-[minmax(0,1fr)_clamp(340px,26vw,400px)] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-x-8 lg:gap-y-5 lg:px-8 lg:pt-5 lg:pb-6">
        <header className="flex flex-none items-center justify-between gap-4 pt-[max(0.5rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-2 pl-[max(1rem,env(safe-area-inset-left))] lg:col-span-2 lg:p-0">
          <h2 className="text-xl font-bold tracking-[-0.02em]">Bearbeiten</h2>
          <div className="flex items-center gap-2 lg:gap-3">
            <ToolGroup label="Verlauf">
              <IconButton label="Rückgängig (⌘Z)" onClick={undo} disabled={!past.length || !!busy}>
                <Undo2 aria-hidden />
              </IconButton>
              <IconButton label="Wiederholen (⇧⌘Z)" onClick={redo} disabled={!future.length || !!busy}>
                <Redo2 aria-hidden />
              </IconButton>
            </ToolGroup>
            {/* Telefon: nur das Zeichen, damit Verlauf, Abbrechen und Fertig in eine Zeile passen */}
            <Button size="sm" onClick={close} className="pl-2.5 max-sm:min-w-11 max-sm:px-0" aria-label="Abbrechen">
              <X aria-hidden />
              <span className="max-sm:sr-only">Abbrechen</span>
            </Button>
            <Button variant="cloth" size="sm" onClick={finish} disabled={!!busy} className="pl-3 md:min-h-11 md:px-5">
              <Check aria-hidden />
              {busy ? "Speichert …" : "Fertig"}
            </Button>
          </div>
        </header>

        {/* Bühne: das Foto ganz sichtbar; auf dem Telefon steht sie fest, nur die Werkzeuge rollen */}
        <div className="bg-table flex flex-none flex-col gap-2 pr-[max(1rem,env(safe-area-inset-right))] pb-2 pl-[max(1rem,env(safe-area-inset-left))] lg:min-h-0 lg:gap-4 lg:p-0">
          <div className="grid h-[clamp(170px,36svh,460px)] place-items-center [container-type:size] lg:h-auto lg:min-h-0 lg:flex-1 lg:px-[88px]">
            <div className="relative" style={{ width: `min(100cqw, ${aspect * 100}cqh)`, aspectRatio: `${photo.w} / ${photo.h}` }}>
              {strip("absolute top-0 right-full bottom-0 mr-5 w-[64px] flex-col items-center justify-center overflow-y-auto px-1 py-1 max-lg:hidden", "w-14")}
              <div
                ref={frame}
                className={`absolute inset-0 touch-none overflow-hidden select-none [-webkit-touch-callout:none] ${view.z > 1.01 ? "cursor-move" : "cursor-grab"}`}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                onContextMenu={(e) => e.preventDefault()}
                role="img"
                aria-label={`${nameOf(photo)}${isNeutral(edit) ? "" : ", bearbeitet"}. Halten zeigt das Original, waagerecht wischen stellt ein, zwei Finger oder Doppeltipp zoomen.`}
              >
                {/* Zoom: nur transform; das Bild hat volle Auflösung, die Vergrößerung zeigt echte Details */}
                <div
                  className={`absolute inset-0 origin-top-left ${zoom.ease && zoom.key === photo.key ? "ease-out transition-transform duration-500" : ""}`}
                  style={{ transform: `translate(${view.x * 100}%, ${view.y * 100}%) scale(${view.z})` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- Platzhalter, bis die Vorschau steht */}
                  {!shown && <img src={photo.orig?.thumb ?? photo.thumb} alt="" className="absolute inset-0 size-full object-cover" />}
                  <canvas ref={canvas} aria-hidden className={`absolute inset-0 size-full ${shown ? "" : "opacity-0"}`} />
                  <canvas ref={ghost} aria-hidden className="pointer-events-none absolute inset-0 size-full opacity-0" />
                </div>
                {failed && !shown && (
                  <div className="slip text-ink rounded-cut absolute inset-x-2 bottom-2 z-[6] grid justify-items-start gap-2 p-3 text-sm" onPointerDown={(e) => e.stopPropagation()}>
                    <p className="font-semibold">Das Foto ließ sich nicht laden.</p>
                    <p className="text-ink-2 mt-0.5 text-xs">{failed}</p>
                    <Button
                      variant="paper"
                      size="sm"
                      onClick={() => {
                        setFailed(null);
                        setAttempt((n) => n + 1);
                      }}
                    >
                      Noch einmal laden
                    </Button>
                  </div>
                )}
                {compare && (
                  <>
                    <div aria-hidden className="bg-paper pointer-events-none absolute inset-y-0 z-[4] -ml-px w-0.5" style={{ left: `${Math.min(1, Math.max(0, view.x + split * view.z)) * 100}%` }}>
                      <span className="bg-paper text-ink absolute top-1/2 left-1/2 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-sm shadow-[0_2px_8px_rgb(12_10_8/0.4)]">
                        ⟷
                      </span>
                    </div>
                    <span aria-hidden className="text-on-table pointer-events-none absolute top-2 left-2 z-[4] rounded-full bg-[rgb(12_10_8/0.6)] px-2.5 py-1 text-xs font-semibold">
                      vorher
                    </span>
                    <span aria-hidden className="text-on-table pointer-events-none absolute top-2 right-2 z-[4] rounded-full bg-[rgb(12_10_8/0.6)] px-2.5 py-1 text-xs font-semibold">
                      nachher
                    </span>
                  </>
                )}
                {view.z > 1.01 && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => look(FIT, !reduce)}
                    className="text-on-table absolute right-2 bottom-2 z-[6] flex min-h-8 items-center gap-1.5 rounded-full bg-[rgb(12_10_8/0.6)] pr-3 pl-2 text-xs font-semibold tabular-nums pointer-coarse:min-h-10"
                  >
                    <ZoomOut aria-hidden className="size-4" />
                    {zoomPct(view.z)} %<span className="sr-only">, ganzes Foto zeigen</span>
                  </button>
                )}
                <div aria-hidden className={`pointer-events-none absolute inset-0 z-[5] grid place-items-center transition-opacity duration-150 ${big ? "opacity-100" : "opacity-0"}`}>
                  {big && (
                    <div className="text-center">
                      <span className="text-paper block text-[clamp(28px,7vw,56px)] leading-none font-bold [text-shadow:0_2px_16px_rgb(12_10_8/0.7)]" style={{ fontVariationSettings: '"wdth" 75' }}>
                        {big.value}
                      </span>
                      <small className="text-paper mt-1 block text-sm font-semibold [text-shadow:0_1px_8px_rgb(12_10_8/0.8)]">{big.label}</small>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {strip("overflow-x-auto px-1 py-1.5 lg:hidden", "h-14")}

          <div className="flex flex-wrap items-center gap-2 lg:justify-center">
            <button
              type="button"
              aria-pressed={compare}
              disabled={!shown}
              title="Auch: M oder \ gedrückt halten zeigt das Original, 1–4 wechseln die Reiter"
              onClick={() => {
                setCompare((c) => !c);
                setSplit(toImage(0.5));
                setNote(null);
              }}
              className={buttonClass("quiet", "sm", `pl-2.5 ${compare ? "!bg-on-table !text-table" : ""}`)}
            >
              <Columns2 aria-hidden />
              Vorher / nachher
            </button>
            <button type="button" onClick={() => act(() => neutralEdit())} disabled={isNeutral(edit) || !!busy} className={buttonClass("quiet", "sm", "pl-2.5")}>
              <RotateCcw aria-hidden />
              Foto zurücksetzen
            </button>
            {/* am Telefon genügen zwei Finger, die Leiste bleibt einzeilig */}
            <button
              type="button"
              aria-pressed={view.z > 1.01}
              disabled={!shown}
              title="Auch: Doppelklick oder Mausrad aufs Foto, + und − auf der Tastatur, 0 zeigt das ganze Foto"
              onClick={() => toggleZoom()}
              className={buttonClass("quiet", "sm", `pl-2.5 max-sm:hidden ${view.z > 1.01 ? "!bg-on-table !text-table" : ""}`)}
            >
              <ZoomIn aria-hidden />
              Zoom
            </button>
          </div>
          {/* immer da, damit Screenreader Fehler und Fortschritt hören */}
          {/* am Desktop steht der Hinweis auf dem Zettel beim Werkzeug; hier bleiben nur Fehler und Fortschritt sichtbar */}
          <p role="status" className={`min-h-[1.3em] text-[13px] lg:text-center ${error ? "text-on-table font-semibold" : "text-on-table-2"} ${error || busy ? "" : "lg:sr-only"}`}>
            {error ?? busy ?? hint}
          </p>
        </div>

        {/* Werkzeuge */}
        <section
          aria-label="Werkzeuge"
          inert={!shown || !!busy}
          className={`slip text-ink max-lg:rounded-t-tool lg:rounded-cut relative flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain pt-4 lg:shadow-[0_18px_30px_-18px_rgb(12_10_8/0.8)] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] transition-opacity duration-150 lg:max-h-full lg:flex-none lg:self-start lg:px-5 lg:pt-5 lg:pb-5 ${!shown || busy ? "opacity-60" : ""}`}
        >
          {photos.length > 1 && (
            <p className="text-ink-2 text-sm lg:sr-only">
              Du bearbeitest <b className="text-ink">{nameOf(photo)}</b>. Ein anderes Foto antippen wechselt.
            </p>
          )}
          <div
            role="tablist"
            aria-label="Werkzeuge"
            className="slip sticky -top-4 z-[2] -mx-4 -mt-4 px-4 pt-4 pb-1 lg:-top-5 lg:-mx-5 lg:-mt-5 lg:px-5 lg:pt-5"
            onKeyDown={(e) => {
              // Pfeiltasten wandern zwischen den Reitern (Muster der ARIA-Tabs)
              const i = TABS.findIndex(([t]) => t === tab);
              const j = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : null;
              if (j === null) return;
              e.preventDefault();
              const t = TABS[(j + TABS.length) % TABS.length][0];
              switchTab(t);
              document.getElementById(`dv-tab-${t}`)?.focus();
            }}
          >
            <div className="bg-ink/6 flex rounded-full p-[3px] shadow-[inset_0_0_0_1px_rgb(27_28_26/0.12)]">
              {TABS.map(([t, name]) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  id={`dv-tab-${t}`}
                  aria-selected={tab === t}
                  aria-controls={tab === t ? `dv-pane-${t}` : undefined}
                  tabIndex={tab === t ? 0 : -1}
                  onClick={() => switchTab(t)}
                  className={`relative min-h-9 min-w-0 flex-auto rounded-full px-2 text-[13px] font-semibold transition-colors duration-150 pointer-coarse:min-h-11 sm:text-sm ${tab === t ? "text-paper" : "text-ink-2 hover:text-ink"}`}
                >
                  {tab === t && (
                    <motion.span
                      layoutId="dv-tab"
                      aria-hidden
                      className="bg-ink absolute inset-0 rounded-full"
                      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 38 }}
                    />
                  )}
                  <span className="relative">{name}</span>
                </button>
              ))}
            </div>
          </div>

          <p aria-hidden className="text-ink-2 -mt-1 text-[13px] leading-snug max-lg:hidden">
            {hint}
          </p>
          <div role="tabpanel" id={`dv-pane-${tab}`} aria-labelledby={`dv-tab-${tab}`}>
            {tab === "s" && (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(92px,1fr))] sm:gap-2.5 lg:grid-cols-3 lg:gap-y-5">
                <Tile
                  img={tileImg}
                  edit={sugg.auto}
                  name="Auto"
                  txt="Licht und Farbe automatisch"
                  pressed={edit.origin === "auto"}
                  disabled={!me}
                  onClick={() => me && act((e) => ({ ...e, ...autoEdit(me), origin: "auto", moodFrom: undefined }))}
                />
                <Tile
                  img={tileImg}
                  edit={sugg.match}
                  name="Angleichen"
                  txt={others.length ? "an die Nachbarfotos" : "braucht ein zweites Foto auf der Seite"}
                  pressed={edit.origin === "match"}
                  disabled={!me || !otherStats.length}
                  onClick={() => me && act((e) => ({ ...e, transfer: matchTransfer(me, otherStats), levels: null, origin: "match", moodFrom: undefined }))}
                />
                <Tile
                  img={tileImg}
                  edit={sugg.mood}
                  name="Stimmung übernehmen"
                  txt={moodSrc ? `vom ${nameOf(moodSrc)}` : "braucht ein zweites Foto auf der Seite"}
                  pressed={edit.origin === "mood"}
                  disabled={!me || !moodSt}
                  onClick={() => {
                    if (!me || !moodSrc || !moodSt) return;
                    // noch einmal antippen nimmt die Stimmung des nächsten Fotos
                    if (edit.origin === "mood" && edit.moodFrom === nameOf(moodSrc) && others.length > 1) {
                      const next = others[(moodIdx + 1) % others.length];
                      const st = loaded[next.key]?.st;
                      setMoodIdx((i) => i + 1);
                      if (st) act((e) => ({ ...e, transfer: moodTransfer(me, st), levels: null, origin: "mood", moodFrom: nameOf(next) }));
                      return;
                    }
                    act((e) => ({ ...e, transfer: moodTransfer(me, moodSt), levels: null, origin: "mood", moodFrom: nameOf(moodSrc) }));
                  }}
                />
              </div>
            )}
            {tab === "s" && (
              <div className="mt-7">
                <h3 className={groupTitle}>Deine Looks</h3>
                {own.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(92px,1fr))] sm:gap-2.5 lg:grid-cols-3 lg:gap-y-5">
                    {own.map((r) => (
                      <div key={r.id} className="relative min-w-0">
                        <Tile img={tileImg} edit={{ ...edit, ...r.f, rec: r.v }} name={r.name} txt={r.f ? "eigener Look" : "eigenes Rezept"} pressed={wearsLook(edit, r)} onClick={() => applyOwn(r)} />
                        <button
                          type="button"
                          onClick={() => askDelete(r)}
                          aria-label={`${r.name} löschen`}
                          title={`${r.name} löschen`}
                          className="bg-paper/90 text-ink hover:bg-paper absolute top-1.5 left-1.5 grid size-7 place-items-center rounded-full shadow-[0_1px_4px_rgb(12_10_8/0.3)]"
                        >
                          <X aria-hidden className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-ink-2 text-sm">Noch keine. Stell ein Foto ein, wie es dir gefällt, und speichere es als Look für alle Fotos und Bücher.</p>
                )}
                {saveForm || (
                  <Button variant="paper" size="sm" className="mt-3.5 pl-2.5" onClick={() => setNaming(true)} disabled={isNeutral(edit)}>
                    <BookmarkPlus aria-hidden />
                    Als eigenen Look speichern
                  </Button>
                )}
              </div>
            )}

            {tab === "l" && (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(92px,1fr))] sm:gap-2.5 lg:grid-cols-3 lg:gap-y-5">
                <Tile img={tileImg} edit={{ ...edit, look: null }} name="Ohne Look" txt="nimmt den Look weg" pressed={!edit.look} onClick={() => edit.look && act((e) => ({ ...e, look: null }))} />
                {LOOKS.map((L) => (
                  <Tile
                    key={L.id}
                    img={tileImg}
                    edit={{ ...edit, look: L.id, amount: 0.8 }}
                    name={L.name}
                    txt={L.txt}
                    pressed={edit.look === L.id}
                    onClick={() => act((e) => (e.look === L.id ? { ...e, look: null } : { ...e, look: L.id, amount: 0.8 }), true)}
                  />
                ))}
                {edit.look && (
                  <div className="slip col-span-full sticky -bottom-4 z-[2] -mx-4 mt-1 border-t border-ink/10 px-4 pt-3 pb-2 lg:-bottom-5 lg:-mx-5 lg:px-5">
                    <Slider
                      id="dv-amount"
                      label={`Stärke ${lookOf(edit.look)?.name ?? ""}`}
                      value={edit.amount}
                      min={0}
                      max={1}
                      step={0.01}
                      zero={0.8}
                      format={(v) => `${Math.round(v * 100)} %`}
                      onChange={(v) => live({ amount: v })}
                    />
                  </div>
                )}
              </div>
            )}

            {tab === "f" && (
              <div className="grid gap-x-[22px] gap-y-2.5 sm:grid-cols-2 lg:grid-cols-1 lg:gap-y-4">
                {FINE.map(([k, name, fmt, min, max]) => (
                  <Slider
                    key={k}
                    id={`dv-${k}`}
                    label={name}
                    value={edit[k]}
                    min={min}
                    max={max}
                    step={0.01}
                    zero={0}
                    format={fmt}
                    active={active === k}
                    onFocus={() => setActive(k)}
                    onChange={(v) => {
                      setActive(k);
                      live({ [k]: v });
                    }}
                  />
                ))}
              </div>
            )}

            {tab === "r" && (
              <div className="grid gap-x-7 gap-y-4 sm:grid-cols-2 lg:grid-cols-1 lg:gap-y-7">
                <div className="sm:col-span-2 lg:col-span-1">
                  <h3 className={groupTitle}>
                    <label htmlFor="dv-preset">Rezept</label>
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="relative flex min-w-0 flex-[1_1_200px]">
                      <select
                        id="dv-preset"
                        className={`${fieldClass} w-full min-w-0 appearance-none pr-10`}
                        value={recMatch ? recMatch.id : recEmpty ? "" : "cur"}
                        onChange={(e) => pickRecipe(e.target.value)}
                      >
                        <option value="">Ohne Rezept</option>
                        <optgroup label="Voreingestellt">
                          {PRESETS.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} · {r.txt}
                            </option>
                          ))}
                        </optgroup>
                        {own.length > 0 && (
                          <optgroup label="Eigene">
                            {own.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {!recMatch && !recEmpty && <option value="cur">{recLabel}</option>}
                        <option value="save">Als eigenen Look speichern …</option>
                      </select>
                      <ChevronDown aria-hidden className="text-ink pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2" />
                    </span>
                    {recMatch && own.some((r) => r.id === recMatch.id) && (
                      <button
                        type="button"
                        className="text-danger hover:bg-danger/8 flex min-h-9 items-center gap-2 rounded-full px-2.5 text-sm font-semibold pointer-coarse:min-h-11"
                        onClick={() => askDelete(recMatch)}
                      >
                        <Trash aria-hidden className="size-4" />
                        Löschen
                      </button>
                    )}
                  </div>
                  {saveForm}
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <Chips<RecipeValues["film"]>
                    label="Filmlook"
                    opts={[[null, "Ohne"], ...LOOKS.map((L) => [L.id, L.name] as [RecipeValues["film"], string])]}
                    cur={edit.rec.film}
                    onPick={(v) => setRec(() => ({ film: v }), true)}
                  />
                </div>
                <WbPad r={edit.rec.wbR} b={edit.rec.wbB} onChange={(wbR, wbB) => liveRec({ wbR, wbB })} />
                <div className="grid content-start gap-2.5 lg:gap-4">
                  <h3 className={groupTitle}>Ton und Farbe</h3>
                  {(
                    [
                      ["hl", "Lichter", -2, 4, 0.5],
                      ["sh", "Schatten", -2, 4, 0.5],
                      ["color", "Farbe", -4, 4, 1],
                    ] as const
                  ).map(([k, name, min, max, step]) => (
                    <Slider key={k} id={`dv-rc-${k}`} label={name} value={edit.rec[k]} min={min} max={max} step={step} zero={0} format={signedStep} onChange={(v) => liveRec({ [k]: v })} />
                  ))}
                </div>
                <Chips<RecipeValues["dr"]>
                  label="Dynamikbereich"
                  opts={[
                    [100, "DR100"],
                    [200, "DR200"],
                    [400, "DR400"],
                  ]}
                  cur={edit.rec.dr}
                  onPick={(v) => setRec(() => ({ dr: v }))}
                />
                <Chips<RecipeValues["cc"]> label="Color Chrome" opts={LEVEL} cur={edit.rec.cc} onPick={(v) => setRec(() => ({ cc: v }))} />
                <Chips<RecipeValues["fxb"]> label="Color Chrome FX Blau" opts={LEVEL} cur={edit.rec.fxb} onPick={(v) => setRec(() => ({ fxb: v }))} />
                <div className="grid gap-1.5">
                  <Chips<RecipeValues["grain"]> label="Körnung" opts={LEVEL} cur={edit.rec.grain} onPick={(v) => setRec(() => ({ grain: v }))} />
                  <Chips<RecipeValues["gsize"]>
                    label="Korngröße"
                    opts={[
                      ["klein", "Klein"],
                      ["groß", "Groß"],
                    ]}
                    cur={edit.rec.gsize}
                    onPick={(v) => setRec(() => ({ gsize: v }))}
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
      {ask && (
        <Ask
          text={ask.text}
          yes={ask.yes}
          no={ask.no}
          onNo={() => setAsk(null)}
          onYes={() => {
            setAsk(null);
            ask.onYes();
          }}
        />
      )}
    </dialog>
  );
}

function SaveForm({ onSave, onCancel }: { onSave: (name: string) => void; onCancel: () => void }): ReactNode {
  const [name, setName] = useState("");
  return (
    <form
      className="mt-2.5 grid gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        const n = name.trim();
        if (n) onSave(n);
      }}
    >
      <label htmlFor="dv-rc-name" className="text-ink-2 text-[13px]">
        Name für deinen Look
      </label>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <input
          id="dv-rc-name"
          autoFocus
          maxLength={40}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z. B. Michels Sommer"
          className={`${fieldClass} min-w-0 flex-[1_1_200px]`}
        />
        <button type="submit" className={buttonClass("ink", "sm")}>
          Speichern
        </button>
        <button type="button" onClick={onCancel} className={buttonClass("paper", "sm")}>
          Abbrechen
        </button>
      </div>
    </form>
  );
}
