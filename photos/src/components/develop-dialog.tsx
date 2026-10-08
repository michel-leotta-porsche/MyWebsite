"use client";

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { inputClass } from "@/components/app-ui";
import { bakePhoto } from "@/lib/develop/bake";
import {
  applyLut,
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
const linkBtn = "underline decoration-mark decoration-2 underline-offset-4 disabled:opacity-40";

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
    img.onload = () => img.decode().then(() => ok(img), () => ok(img));
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
    <button type="button" aria-pressed={pressed} disabled={disabled} onClick={onClick} className="group flex min-w-0 flex-col gap-1.5 text-left disabled:opacity-40" lang="de">
      <span className={`block aspect-[4/5] w-full bg-paper-shade outline-2 outline-offset-2 ${pressed ? "outline-ink" : "outline-transparent"}`}>
        {img && <LutThumb img={img} edit={edit} className="block size-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:-translate-y-[3px]" />}
      </span>
      <b className="text-sm font-semibold break-words hyphens-auto max-sm:text-xs">{name}</b>
      <small className="text-ink-2 text-xs leading-snug max-sm:hidden">{txt}</small>
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
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-2 text-sm">
      <label htmlFor={id} className={`flex cursor-pointer items-center gap-2 ${active ? "font-bold" : ""}`}>
        <span aria-hidden className={`size-2 rounded-full border-[1.5px] ${changed ? "border-ink bg-mark" : "border-ink-2"}`} />
        {label}
      </label>
      <output htmlFor={id} className="text-ink-2 font-mono text-xs">
        {format(value)}
      </output>
      <button
        type="button"
        onClick={() => onChange(zero)}
        disabled={!changed}
        title={`${label} zurücksetzen`}
        className={`text-ink-2 hover:text-ink -my-1 grid size-7 place-items-center text-base leading-none transition-opacity duration-150 ${changed ? "" : "pointer-events-none opacity-0"}`}
      >
        <span aria-hidden>↺</span>
        <span className="sr-only">{label} zurücksetzen</span>
      </button>
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
        className="col-span-3 m-0 w-full accent-ink"
      />
    </div>
  );
}

function Chips<T extends string | number | null>({ label, opts, cur, onPick }: { label: string; opts: [T, string][]; cur: T; onPick: (v: T) => void }) {
  return (
    <div>
      <h3 className="text-ink-2 mb-1.5 font-mono text-[11px] font-normal tracking-[0.08em] uppercase">{label}</h3>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        {opts.map(([v, txt]) => (
          <button
            key={String(v)}
            type="button"
            aria-pressed={cur === v}
            onClick={() => onPick(v)}
            className={`min-h-[34px] border px-2.5 text-[13px] ${cur === v ? "border-ink bg-ink text-paper" : "border-ink-2"}`}
          >
            {txt}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Weißabgleich-Verschiebung wie im Kameramenü: −9 bis +9, R nach rechts, B nach oben */
function WbPad({ r, b, onChange }: { r: number; b: number; onChange: (r: number, b: number) => void }) {
  const pad = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const at = (e: React.PointerEvent) => {
    const q = pad.current!.getBoundingClientRect();
    const c = (v: number) => Math.min(1, Math.max(0, v));
    onChange(Math.round(c((e.clientX - q.left) / q.width) * 18 - 9), Math.round(9 - c((e.clientY - q.top) / q.height) * 18));
  };
  const txt = `R ${signedStep(r)}, B ${signedStep(b)}`;
  return (
    <div>
      <h3 className="text-ink-2 mb-1.5 font-mono text-[11px] font-normal tracking-[0.08em] uppercase">Weißabgleich-Verschiebung</h3>
      <div className="flex flex-wrap items-center gap-3.5">
        <div
          ref={pad}
          tabIndex={0}
          role="slider"
          aria-label="Weißabgleich-Verschiebung, Pfeiltasten: links und rechts Rot, hoch und runter Blau"
          aria-valuetext={txt}
          aria-valuemin={-9}
          aria-valuemax={9}
          aria-valuenow={r}
          className="wbpad border-ink relative size-[152px] flex-none cursor-crosshair touch-none border"
          onPointerDown={(e) => {
            drag.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            at(e);
          }}
          onPointerMove={(e) => drag.current && at(e)}
          onPointerUp={() => (drag.current = false)}
          onDoubleClick={() => onChange(0, 0)}
          onKeyDown={(e) => {
            const m = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] } as Record<string, [number, number]>)[e.key];
            if (!m) return;
            e.preventDefault();
            onChange(Math.max(-9, Math.min(9, r + m[0])), Math.max(-9, Math.min(9, b + m[1])));
          }}
        >
          <span
            aria-hidden
            className="bg-mark border-ink pointer-events-none absolute z-[1] -mt-[7px] -ml-[7px] size-3.5 rounded-full border-2"
            style={{ left: `${((r + 9) / 18) * 100}%`, top: `${((9 - b) / 18) * 100}%` }}
          />
        </div>
        <div className="text-ink-2 font-mono text-[11px] leading-snug">
          <b className="text-ink block text-[15px] font-medium">
            R {signedStep(r)} · B {signedStep(b)}
          </b>
          rechts mehr Rot
          <br />
          oben mehr Blau
          <br />
          Doppeltipp: Mitte
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
  const [initial] = useState(() => Object.fromEntries(photos.map((p) => [p.key, p.edit ?? neutralEdit()])) as Record<string, PhotoEdit>);
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
  const [moodIdx, setMoodIdx] = useState(0);

  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const ghost = useRef<HTMLCanvasElement>(null);
  const previewer = useRef<Previewer | null>(null);
  const bitmaps = useRef(new Map<string, Promise<Pic>>());

  const photo = photos.find((p) => p.key === sel) ?? photos[0];
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
      if (live) setError(`Das Foto ließ sich nicht laden (${reasonOf(e)}).`);
    });
    return () => {
      live = false;
    };
  }, [photo]);

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
  const act = (fn: (e: PhotoEdit) => PhotoEdit, slow = false) => {
    fade(slow);
    setEdit(fn);
  };
  const setRec = (fn: (r: RecipeValues) => Partial<RecipeValues>, slow = false) => act((e) => ({ ...e, rec: { ...e.rec, ...fn(e.rec) } }), slow);
  const live = (patch: Partial<PhotoEdit>) => setEdit((e) => ({ ...e, ...patch }));
  const liveRec = (patch: Partial<RecipeValues>) => setEdit((e) => ({ ...e, rec: { ...e.rec, ...patch } }));

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

  const pickRecipe = (v: string) => {
    if (v === "save") return setNaming(true);
    if (v === "cur") return;
    if (v === "") return act((e) => ({ ...e, rec: REC0(), recName: undefined }));
    const r = allRecipes.find((x) => x.id === v);
    if (r) act((e) => ({ ...e, rec: { ...r.v }, recName: r.name }), true);
  };

  /* ----- Gesten auf dem Foto ----- */

  const gesture = useRef<{ x: number; y: number; w: number; v: number; mode: "hold" | "swipe" | "split" | "none" | null; t: number } | null>(null);
  const fineOf = (k: FineKey) => FINE.find((f) => f[0] === k)!;

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const g = { x: e.clientX, y: e.clientY, w: el.clientWidth, v: 0, mode: null as NonNullable<typeof gesture.current>["mode"], t: 0 };
    gesture.current = g;
    if (compare) {
      g.mode = "split";
      el.setPointerCapture(e.pointerId);
      const r = el.getBoundingClientRect();
      setSplit(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
      return;
    }
    g.t = window.setTimeout(() => {
      if (gesture.current === g && !g.mode) {
        g.mode = "hold";
        setHolding(true);
        setBig({ value: "Original", label: "loslassen zeigt wieder bearbeitet" });
      }
    }, 260);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g) return;
    const el = e.currentTarget;
    if (g.mode === "split") {
      const r = el.getBoundingClientRect();
      return setSplit(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
    }
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.mode && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      window.clearTimeout(g.t);
      g.mode = "swipe";
      el.setPointerCapture(e.pointerId);
      let t = tab;
      if (t === "s") {
        t = "f";
        setTab("f");
      }
      if (t === "r") {
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
      const v = Math.min(max, Math.max(min, g.v + k * (max - min) * 0.8));
      live({ [key]: v });
      setBig({ value: fmt(v), label: name });
    }
  };
  const onUp = () => {
    const g = gesture.current;
    if (!g) return;
    window.clearTimeout(g.t);
    if (g.mode === "hold") setHolding(false);
    if (g.mode && g.mode !== "split") setBig(null);
    gesture.current = null;
  };

  // Tastatur: \ halten zeigt das Original, 1–4 wechseln den Reiter
  useEffect(() => {
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && !!t.closest("input, select, textarea, [role=slider]");
    const down = (e: KeyboardEvent) => {
      if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "\\" && !e.repeat) setHolding(true);
      const t = ({ 1: "s", 2: "l", 3: "f", 4: "r" } as Record<string, Tab>)[e.key];
      if (t) {
        setTab(t);
        setNote(null);
      }
    };
    const up = (e: KeyboardEvent) => e.key === "\\" && setHolding(false);
    document.addEventListener("keydown", down);
    document.addEventListener("keyup", up);
    return () => {
      document.removeEventListener("keydown", down);
      document.removeEventListener("keyup", up);
    };
  }, []);

  /* ----- Fertig: geänderte Fotos einrechnen und hochladen ----- */

  const close = () => {
    if (busy) return;
    if (dirty && !window.confirm("Änderungen verwerfen?")) return;
    onClose();
  };

  const finish = async () => {
    const changed = photos.filter((p) => JSON.stringify(edits[p.key]) !== JSON.stringify(initial[p.key]));
    if (!changed.length) return onClose();
    setError(null);
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
        setBusy(changed.length > 1 ? `Rechne Foto ${i + 1} von ${changed.length} ein …` : "Rechne das Foto ein …");
        const out = await bakePhoto({ url: orig.large, lut: lutFor(e, FINE_N), n: FINE_N, rec: e.rec });
        const urls = await uploadEdited(uid, bookId, p.key, out.blobs);
        patches[p.key] = { edit: e, orig, src: urls.page, large: urls.large, thumb: urls.thumb, color: out.color };
      }
    } catch (e) {
      console.warn("[bearbeiten] Einrechnen", reasonOf(e));
      setBusy(null);
      setError(`Einrechnen hat nicht geklappt (${reasonOf(e)}). Versuch es noch einmal.`);
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

  return (
    <dialog
      ref={dialog}
      aria-label="Foto bearbeiten"
      lang="de"
      className="bg-table text-on-table fixed inset-0 z-[700] m-0 h-full max-h-none w-full max-w-none overflow-y-auto overscroll-contain p-0 lg:overflow-hidden"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="flex min-h-full flex-col lg:mx-auto lg:grid lg:h-full lg:max-w-[1680px] lg:grid-cols-[minmax(0,1fr)_clamp(340px,26vw,400px)] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-x-7 lg:gap-y-3.5 lg:p-4">
        <header className="flex items-center justify-between gap-4 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 lg:col-span-2 lg:p-0">
          <h2 className="text-2xl font-bold tracking-[-0.03em]" style={{ fontVariationSettings: '"wdth" 78' }}>
            Bearbeiten
          </h2>
          <div className="flex items-center gap-5 text-sm">
            <button type="button" onClick={close} disabled={!!busy} className={linkBtn}>
              Abbrechen
            </button>
            <button type="button" onClick={finish} disabled={!!busy} className="bg-mark text-ink min-h-10 px-4 font-semibold disabled:opacity-60">
              {busy ? "Rechnet …" : "Fertig"}
            </button>
          </div>
        </header>

        {/* Bühne: das Foto ganz sichtbar; auf dem Telefon bleibt es oben stehen */}
        <div className="bg-table sticky top-0 z-10 flex flex-col gap-2.5 px-4 pb-3 lg:static lg:min-h-0 lg:p-0">
          <div className="grid h-[40svh] place-items-center [container-type:size] lg:h-auto lg:min-h-0 lg:flex-1">
            <div
              className="relative cursor-grab touch-pan-y select-none [-webkit-touch-callout:none]"
              style={{ width: `min(100cqw, ${aspect * 100}cqh)`, aspectRatio: `${photo.w} / ${photo.h}` }}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onContextMenu={(e) => e.preventDefault()}
              role="img"
              aria-label={`${photo.title || "Foto"}, bearbeitet. Halten zeigt das Original, waagerecht wischen stellt ein.`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Platzhalter, bis die Vorschau steht */}
              {!shown && <img src={photo.orig?.thumb ?? photo.thumb} alt="" className="absolute inset-0 size-full object-cover" />}
              <canvas ref={canvas} aria-hidden className={`absolute inset-0 size-full ${shown ? "" : "opacity-0"}`} />
              <canvas ref={ghost} aria-hidden className="pointer-events-none absolute inset-0 size-full opacity-0" />
              {compare && (
                <>
                  <div aria-hidden className="bg-paper pointer-events-none absolute inset-y-0 z-[4] -ml-px w-0.5" style={{ left: `${split * 100}%` }}>
                    <span className="bg-paper text-ink absolute top-1/2 left-1/2 grid size-[30px] -translate-x-1/2 -translate-y-1/2 place-items-center text-sm">⟷</span>
                  </div>
                  <span aria-hidden className="text-on-table pointer-events-none absolute top-2 left-2 z-[4] bg-[rgb(12_10_8/0.6)] px-1.5 py-1 font-mono text-[10px] tracking-[0.08em] uppercase">
                    vorher
                  </span>
                  <span aria-hidden className="text-on-table pointer-events-none absolute top-2 right-2 z-[4] bg-[rgb(12_10_8/0.6)] px-1.5 py-1 font-mono text-[10px] tracking-[0.08em] uppercase">
                    nachher
                  </span>
                </>
              )}
              <div aria-hidden className={`pointer-events-none absolute inset-0 z-[5] grid place-items-center transition-opacity duration-150 ${big ? "opacity-100" : "opacity-0"}`}>
                {big && (
                  <div className="text-center">
                    <span className="text-paper block text-[clamp(28px,7vw,56px)] leading-none font-bold [text-shadow:0_2px_16px_rgb(12_10_8/0.7)]" style={{ fontVariationSettings: '"wdth" 75' }}>
                      {big.value}
                    </span>
                    <small className="text-paper mt-1 block font-mono text-[11px] tracking-[0.08em] uppercase [text-shadow:0_1px_8px_rgb(12_10_8/0.8)]">{big.label}</small>
                  </div>
                )}
              </div>
            </div>
          </div>

          {photos.length > 1 && (
            <div role="group" aria-label="Fotos dieser Doppelseite" className="flex gap-3 overflow-x-auto py-1.5 lg:justify-center">
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
                    className={`group relative h-12 flex-none lg:h-16 outline-3 outline-offset-2 transition-[outline-color] duration-150 ${on ? "outline-mark" : "outline-transparent"}`}
                    style={{ aspectRatio: `${p.w} / ${p.h}` }}
                  >
                    {img && <LutThumb img={img} edit={deferred[p.key]} className="block size-full object-cover" />}
                    {!on && <span aria-hidden className="bg-paper/55 absolute inset-0 transition-opacity duration-150 group-hover:opacity-50" />}
                    <span className="sr-only">{on ? `${p.title || "Foto"}, in Bearbeitung` : `${p.title || "Foto"} bearbeiten`}</span>
                  </button>
                );
              })}
            </div>
          )}
          <p aria-hidden className="text-on-table-2 hidden font-mono text-[11px] lg:block">
            Taste \ halten: Original · 1–4: Reiter · Halten auf dem Foto: Original
          </p>
        </div>

        {/* Werkzeuge */}
        <section aria-label="Werkzeuge" className="slip text-ink relative flex flex-1 flex-col gap-3.5 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain">
          {photos.length > 1 && (
            <p className="text-ink-2 text-sm">
              Du bearbeitest <b className="text-ink">{photo.title || "dieses Foto"}</b>. Ein anderes Foto antippen wechselt.
            </p>
          )}
          <div role="tablist" aria-label="Werkzeuge" className="bg-[var(--slip)] flex flex-wrap gap-x-[18px] border-b border-ink/15 lg:sticky lg:-top-4 lg:z-[2] lg:-mx-4 lg:-mt-1.5 lg:px-4 lg:pt-1.5">
            {TABS.map(([t, name]) => (
              <button
                key={t}
                type="button"
                role="tab"
                id={`dv-tab-${t}`}
                aria-selected={tab === t}
                aria-controls={`dv-pane-${t}`}
                onClick={() => switchTab(t)}
                className={`relative pt-2.5 pb-3 text-[17px] leading-none font-bold tracking-[-0.02em] ${tab === t ? "text-ink" : "text-ink-2"}`}
                style={{ fontVariationSettings: '"wdth" 80' }}
              >
                {name}
                {tab === t && <span aria-hidden className="bg-mark absolute inset-x-0 -bottom-px h-[3px]" />}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`dv-pane-${tab}`} aria-labelledby={`dv-tab-${tab}`}>
            {tab === "s" && (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(92px,1fr))] sm:gap-2.5 lg:grid-cols-3">
                <Tile
                  img={tileImg}
                  edit={sugg.auto}
                  name="Auto"
                  txt="Tonwerte und Weißabgleich aus dem Foto"
                  pressed={edit.origin === "auto"}
                  disabled={!me}
                  onClick={() => me && act((e) => ({ ...e, ...autoEdit(me), origin: "auto", moodFrom: undefined }))}
                />
                <Tile
                  img={tileImg}
                  edit={sugg.match}
                  name="Angleichen"
                  txt={others.length ? "an die anderen Fotos der Doppelseite" : "braucht ein zweites Foto auf der Seite"}
                  pressed={edit.origin === "match"}
                  disabled={!me || !otherStats.length}
                  onClick={() => me && act((e) => ({ ...e, transfer: matchTransfer(me, otherStats), levels: null, origin: "match", moodFrom: undefined }))}
                />
                <Tile
                  img={tileImg}
                  edit={sugg.mood}
                  name="Stimmung übernehmen"
                  txt={moodSrc ? `vom Foto ${moodSrc.title || "daneben"}` : "braucht ein zweites Foto auf der Seite"}
                  pressed={edit.origin === "mood"}
                  disabled={!me || !moodSt}
                  onClick={() => {
                    if (!me || !moodSrc || !moodSt) return;
                    // noch einmal antippen nimmt die Stimmung des nächsten Fotos
                    if (edit.origin === "mood" && edit.moodFrom === (moodSrc.title || "daneben") && others.length > 1) {
                      const next = others[(moodIdx + 1) % others.length];
                      const st = loaded[next.key]?.st;
                      setMoodIdx((i) => i + 1);
                      if (st) act((e) => ({ ...e, transfer: moodTransfer(me, st), levels: null, origin: "mood", moodFrom: next.title || "daneben" }));
                      return;
                    }
                    act((e) => ({ ...e, transfer: moodTransfer(me, moodSt), levels: null, origin: "mood", moodFrom: moodSrc.title || "daneben" }));
                  }}
                />
                <Tile img={tileImg} edit={neutralEdit()} name="Original" txt="alles zurück" pressed={isNeutral(edit)} onClick={() => act(() => neutralEdit())} />
              </div>
            )}

            {tab === "l" && (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(92px,1fr))] sm:gap-2.5 lg:grid-cols-3">
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
                  <div className="col-span-full mt-1">
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
              <div className="grid gap-x-[22px] gap-y-2.5 sm:grid-cols-2 lg:grid-cols-1">
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
              <div className="grid gap-x-7 gap-y-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="sm:col-span-2 lg:col-span-1">
                  <h3 className="text-ink-2 mb-1.5 font-mono text-[11px] font-normal tracking-[0.08em] uppercase">
                    <label htmlFor="dv-preset">Rezept</label>
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <select
                      id="dv-preset"
                      className={`${inputClass} min-h-[42px] flex-[1_1_200px] min-w-0`}
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
                      <option value="save">Aktuelle Werte als Rezept speichern …</option>
                    </select>
                    {recMatch && own.some((r) => r.id === recMatch.id) && (
                      <button
                        type="button"
                        className={`${linkBtn} text-sm`}
                        onClick={() => {
                          if (!window.confirm(`Rezept „${recMatch.name}“ löschen? Fotos, die es nutzen, bleiben, wie sie sind.`)) return;
                          setOwn((o) => o.filter((r) => r.id !== recMatch.id));
                          deleteRecipe(uid, recMatch.id).catch(() => {});
                        }}
                      >
                        Löschen
                      </button>
                    )}
                  </div>
                  {naming && (
                    <SaveForm
                      onCancel={() => setNaming(false)}
                      onSave={(name) => {
                        const r: NamedRecipe = { id: `own-${Date.now().toString(36)}`, name, txt: "eigenes", v: { ...edit.rec } };
                        setOwn((o) => [...o.filter((x) => x.name !== name), r]);
                        setEdit((e) => ({ ...e, recName: name }));
                        setNaming(false);
                        setNote(`„${name}“ steht jetzt in der Auswahl, auch für andere Fotos und Bücher.`);
                        saveRecipe(uid, r).catch(() => setNote("Das Rezept ließ sich nicht speichern."));
                      }}
                    />
                  )}
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
                <div className="grid content-start gap-2.5">
                  <h3 className="text-ink-2 font-mono text-[11px] font-normal tracking-[0.08em] uppercase">Ton und Farbe</h3>
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

          <p className="text-ink-2 min-h-[1.3em] text-[13px]" aria-live="polite">
            {hint}
          </p>
          <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2 text-sm">
            <button
              type="button"
              aria-pressed={compare}
              onClick={() => {
                setCompare((c) => !c);
                setSplit(0.5);
                setNote(null);
              }}
              className={`${linkBtn} py-1.5 ${compare ? "font-bold" : ""}`}
            >
              Vorher / nachher vergleichen
            </button>
            <button type="button" onClick={() => act(() => neutralEdit())} disabled={isNeutral(edit)} className={`${linkBtn} py-1.5`}>
              Dieses Foto zurücksetzen
            </button>
          </div>
          {(busy || error) && (
            <p role="status" className={`text-sm ${error ? "text-ink font-semibold" : "text-ink-2"}`}>
              {error ?? busy}
            </p>
          )}
        </section>
      </div>
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
        Name für das Rezept
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
          className={`${inputClass} min-h-[42px] flex-[1_1_200px] min-w-0`}
        />
        <button type="submit" className="bg-ink text-paper min-h-[42px] px-3.5 text-sm">
          Speichern
        </button>
        <button type="button" onClick={onCancel} className={`${linkBtn} text-sm`}>
          Abbrechen
        </button>
      </div>
    </form>
  );
}
