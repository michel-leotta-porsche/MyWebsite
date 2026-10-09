"use client";

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";

import { keys, withKeys } from "@/lib/app-mode";
import { Aperture, BookmarkPlus, Pencil, Plus, RefreshCw, Check, ClipboardCopy, Copy, Layers, ChevronDown, ChevronLeft, Columns2, Crop, Droplet, Palette, Redo2, RotateCcw, ChevronUp, Spline, Sun, Trash, Undo2, X, ZoomIn, ZoomOut, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";

import { CropStage, StraightenDial } from "@/components/crop-stage";
import { CurvePad } from "@/components/curve-pad";
import { Button, buttonClass, IconButton, ToolGroup } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ContextMenu, Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { Segmented } from "@/components/ui/segmented";
import { Swatches } from "@/components/ui/swatches";
import { bakePhoto } from "@/lib/develop/bake";
import { estimateTilt } from "@/lib/develop/detail";
import { cropFor, degrees, fitCrop, GEO0, geoIsNeutral, outMap, outSize, RATIOS, ratioLabel, ratioOf, turned, type Geo, type Ratio } from "@/lib/develop/geo";
import {
  applyLut,
  cleanEdit,
  colorIsNeutral,
  colorKey,
  curveIsNeutral,
  autoEdit,
  buildLut,
  FINE,
  isNeutral,
  HUES,
  LOOKS,
  lookOf,
  MORE0,
  MORE_SLIDERS,
  moreIsNeutral,
  signed100,
  matchTransfer,
  moodTransfer,
  neutralEdit,
  pickEdit,
  PICKS,
  PICKS_SHOWN,
  PRESETS,
  REC0,
  recipeIsEmpty,
  sameRecipe,
  fineOf as lookFineOf,
  wearsLook,
  signedStep,
  spreadEdit,
  stats,
  type More,
  type NamedRecipe,
  type PhotoEdit,
  type PickId,
  type PhotoStats,
  type RecipeValues,
} from "@/lib/develop/model";
import { createPreviewer, type Previewer } from "@/lib/develop/preview";
import { applySettings, asLook, fromEdit, fromRecipe, sameSettings, type BookLook, type CopiedSettings } from "@/lib/develop/settings";
import { deleteRecipe, editedPatch, myRecipes, origOf, saveRecipe, uploadEdited, type StoredPhoto } from "@/lib/store";
import { haptic } from "@/lib/haptics";
// in Effekten i18n.t: liest die Sprache beim Aufruf, ohne den Effekt an t zu binden
import * as i18n from "@/lib/i18n";
import { de, locale, useLang, useT } from "@/lib/i18n";
import { setShownPicks, useShownPicks } from "@/lib/pick-prefs";
import { copySettings, forgetSettings, useRecentSettings } from "@/lib/settings-clipboard";
import { useReducedMotion } from "@/lib/use-reduced-motion";

// Bearbeiten auf der Werkbank: immer ein Foto, die anderen der Doppelseite liegen daneben und lassen sich antippen.
// Alle Werkzeuge ergeben einen LUT; die Vorschau rechnet ihn auf der Grafikkarte, „Fertig“ rechnet im Worker ein.
// Während man zieht, reicht ein grober LUT (17³); steht die Hand still, kommt der feine (33³).

type Tab = "s" | "l" | "f" | "r";
type FineKey = (typeof FINE)[number][0];
type Loaded = { thumb: ImageData; tile: ImageData; st: PhotoStats };
type Tr = ReturnType<typeof useT>;
export type DevelopPatch = Partial<StoredPhoto>;

const TABS: [Tab, string][] = [
  ["s", de("Vorschläge")],
  ["l", "Looks"],
  ["f", de("Feinschliff")],
  ["r", de("Rezept")],
];
const FAST = 17;
const FINE_N = 33;
const LEVEL: [0 | 1 | 2, string][] = [
  [0, de("Aus")],
  [1, de("Schwach")],
  [2, de("Stark")],
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
function lutFor(e: PhotoEdit, n: number, key = colorKey(e)): Uint8Array {
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
    return await viaFetch(url);
  } catch (e) {
    console.warn("[bearbeiten] fetch/createImageBitmap", reasonOf(e));
    // Der Browser kann eine Kopie ohne CORS-Freigabe im Cache halten (Fotos liegen ein Jahr dort): einmal frisch holen
    return viaFetch(url, "reload").catch(() => viaElement(url));
  }
}
async function viaFetch(url: string, cache?: RequestCache) {
  const res = await fetch(url, { mode: "cors", credentials: "omit", cache });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return createImageBitmap(await res.blob());
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
const fullOf = (p: StoredPhoto, long: number): [number, number] => {
  // Größe vor dem Zuschnitt: gerechnet wird immer vom Original
  const o = origOf(p);
  const [w, h] = [o.w ?? p.w, o.h ?? p.h];
  const s = Math.min(1, long / Math.max(w, h));
  return [Math.round(w * s), Math.round(h * s)];
};

/* ---------- Mehr Werkzeuge: Gruppen, die sich unter die fünf Regler klappen ---------- */

type Group = "light" | "color" | "hsl" | "vignette" | "curve";
const GROUPS: [Group, string, string, LucideIcon][] = [
  ["light", de("Licht genauer"), de("Lichter, Weiß, Schwarz, Klarheit"), Sun],
  ["color", de("Farbe genauer"), de("Tönung, Dynamik"), Droplet],
  ["hsl", de("Farben einzeln"), de("acht Farbtöne"), Palette],
  ["vignette", de("Vignette"), de("Ränder abdunkeln"), Aperture],
  ["curve", de("Gradationskurve"), de("Helligkeit Punkt für Punkt"), Spline],
];
/** Die Kurve braucht Maus und Platz: im Menü nur am Rechner; eine schon gesetzte Kurve bleibt überall sichtbar */
const DESK = "(min-width: 1024px) and (pointer: fine)";
const onDesk = (cb: () => void) => {
  const mq = window.matchMedia(DESK);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useDesk = () => useSyncExternalStore(onDesk, () => window.matchMedia(DESK).matches, () => false);
const CURVES: [string, [number, number][]][] = [
  [de("Gerade"), []],
  [
    de("Mehr Kontrast"),
    [
      [0, 0],
      [0.25, 0.19],
      [0.75, 0.82],
      [1, 1],
    ],
  ],
  [
    de("Weicher"),
    [
      [0, 0],
      [0.25, 0.3],
      [0.75, 0.71],
      [1, 1],
    ],
  ],
  [
    de("Matt"),
    [
      [0, 0.08],
      [0.25, 0.27],
      [0.75, 0.76],
      [1, 0.96],
    ],
  ],
];
const GROUPS_KEY = "calima-dev-groups";
/** Was in einer Gruppe verstellt ist, kurz; leer, wenn nichts */
function groupNote(m: More | undefined, g: Group, t: Tr): string {
  if (!m) return "";
  if (g === "curve") return curveIsNeutral(m.curve) ? "" : t("angepasst");
  if (g === "hsl") {
    const n = HUES.filter((_, i) => m.hsl[i].some((v) => Math.abs(v) > 0.005)).map(([name]) => t(name));
    return n.length ? n.join(", ") : "";
  }
  const row = MORE_SLIDERS.find(([k, , grp]) => grp === g && Math.abs(m[k]) > 0.005);
  return row ? `${t(row[1])} ${signed100(m[row[0]])}` : "";
}

/**
 * Lage der Vorschau in der Bühne: die Bühne zeigt den Rahmen, die Zeichenfläche (ganzes Bild) liegt gedreht und
 * gespiegelt darunter. Nur transform, damit Drehen und Ziehen nichts neu rechnen.
 */
function geoBox(g: Geo, w: number, h: number): CSSProperties {
  const [W, H] = turned(w, h, g.quarter);
  const cw = g.crop[2] * W;
  const ch = g.crop[3] * H;
  const bw = (w / cw) * 100;
  const bh = (h / ch) * 100;
  const cx = ((W / 2 - g.crop[0] * W) / cw) * 100;
  const cy = ((H / 2 - g.crop[1] * H) / ch) * 100;
  return {
    width: `${bw}%`,
    height: `${bh}%`,
    left: `${cx - bw / 2}%`,
    top: `${cy - bh / 2}%`,
    transform: `rotate(${g.angle}deg) scaleX(${g.flip ? -1 : 1}) rotate(${g.quarter * 90}deg)`,
  };
}
const FULL: Geo["crop"] = [0, 0, 1, 1];
/** neutraler Zuschnitt fällt weg, damit „unbearbeitet“ unbearbeitet bleibt */
const keepGeo = (g: Geo): Geo | undefined => (geoIsNeutral(g) ? undefined : g);

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

function Tile({ img, edit, name, txt, pressed, onClick, disabled, dashed }: { img?: ImageData; edit: PhotoEdit; name: string; txt: string; pressed: boolean; onClick: () => void; disabled?: boolean; dashed?: boolean }) {
  const lang = useLang();
  return (
    <button type="button" aria-pressed={pressed} disabled={disabled} onClick={onClick} className="group flex min-w-0 flex-col gap-1 text-left disabled:opacity-40" lang={lang}>
      <span className={`bg-paper-shade relative block aspect-[4/5] w-full outline-2 outline-offset-2 transition-[outline-color] duration-150 ${pressed ? "outline-ink" : dashed ? "outline-ink/40 outline-dashed" : "outline-transparent"}`}>
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
  const t = useT();
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
        title={t("{label} zurücksetzen", { label })}
        className={`text-ink-2 hover:text-ink hover:bg-ink/8 -my-2.5 -ml-1 grid size-11 place-items-center rounded-full transition-opacity duration-150 ${changed ? "" : "pointer-events-none opacity-0"}`}
      >
        <RotateCcw aria-hidden className="size-4" />
        <span className="sr-only">{t("{label} zurücksetzen", { label })}</span>
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
  // die Namen der Möglichkeiten kommen deutsch (de) und werden hier übersetzt
  const t = useT();
  return (
    <div>
      <h3 className={groupTitle}>{label}</h3>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        {opts.map(([v, txt]) => (
          <button key={String(v)} type="button" aria-pressed={cur === v} onClick={() => onPick(v)} className={chip(cur === v)}>
            {t(txt)}
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
  const t = useT();
  const pad = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const at = (e: React.PointerEvent) => {
    const q = pad.current!.getBoundingClientRect();
    const c = (v: number) => Math.min(1, Math.max(0, v));
    onChange(Math.round(c((e.clientX - q.left) / q.width) * 18 - 9), Math.round(9 - c((e.clientY - q.top) / q.height) * 18));
  };
  return (
    <div>
      <h3 className={groupTitle}>{t("Weißabgleich-Verschiebung")}</h3>
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
          {t("rechts mehr Rot")}
          <br />
          {t("oben mehr Blau")}
          <br />
          {t("Doppeltipp: Mitte")}
        </div>
      </div>
      <div className="mt-2 grid gap-1">
        <Slider id="dv-wb-r" label={t("Rot")} value={r} min={-9} max={9} step={1} zero={0} format={signedStep} onChange={(v) => onChange(v, b)} />
        <Slider id="dv-wb-b" label={t("Blau")} value={b} min={-9} max={9} step={1} zero={0} format={signedStep} onChange={(v) => onChange(r, v)} />
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
      <div role="alertdialog" aria-modal="true" aria-label={text} className="slip text-ink rounded-cut relative w-full max-w-sm p-5 shadow-[0_24px_48px_-20px_rgb(12_10_8/0.8)]">
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

const STAGE_KEY = "calima:buehne";
/** so klein wird das Foto höchstens, wenn man die Werkzeuge hochzieht */
const STAGE_MIN = 96;

export function DevelopDialog({
  photos: given,
  start,
  uid,
  bookId,
  onDone,
  onFinish,
  title,
  long = 2560,
  note: opening,
  looks: inBook,
  onClose,
}: {
  /** die Fotos der Doppelseite; bearbeitet wird immer eins */
  photos: StoredPhoto[];
  start: string;
  uid: string;
  /** ohne Buch (Fotostudio) gibt es nichts hochzuladen, dann gilt onFinish */
  bookId?: string;
  /** geänderte Fotos, als ein Schritt fürs Rückgängig */
  onDone?: (patches: Record<string, DevelopPatch>) => void;
  /** Fotostudio: „Fertig“ gibt nur die Bearbeitungen aller Fotos zurück, eingerechnet wird draußen */
  onFinish?: (edits: Record<string, PhotoEdit>) => void;
  title?: string;
  /** lange Kante der eingerechneten Fassung, damit die Körnung in der Vorschau stimmt */
  long?: number;
  /** Hinweis zum Öffnen, etwa wenn nicht alle gewählten Fotos aufgingen */
  note?: string | null;
  /** Looks, die im Buch schon auf Fotos liegen (Werkbank); ohne Buch keine */
  looks?: BookLook[];
  onClose: () => void;
}) {
  const t = useT();
  const lang = useLang();
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
  const [note, setNote] = useState<string | null>(opening ?? null);
  const [loaded, setLoaded] = useState<Record<string, Loaded>>({});
  const [ready, setReady] = useState<string | null>(null);
  const [own, setOwn] = useState<NamedRecipe[]>([]);
  // true: neuen Look benennen, sonst den genannten umbenennen
  const [naming, setNaming] = useState<boolean | NamedRecipe>(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ask, setAsk] = useState<{ text: string; yes: string; no: string; onYes: () => void } | null>(null);
  const cancelled = useRef(false);
  const [moodIdx, setMoodIdx] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [cropping, setCropping] = useState(false);
  // Telefon: Zettel nach unten gewischt, das Foto bekommt die ganze Höhe
  const [tucked, setTucked] = useState(false);
  const slip = useRef<HTMLElement>(null);
  const pull = useRef<{ x: number; y: number; dy: number } | null>(null);
  // Telefon: Höhe der Bühne, wenn der Zettel am Griff hochgezogen wurde (null: wie gewohnt), auf dem Gerät gemerkt
  const stage = useRef<HTMLDivElement>(null);
  const [stageH, setStageH] = useState<number | null>(() => {
    try {
      const v = Number(localStorage.getItem(STAGE_KEY));
      return v >= STAGE_MIN ? v : null;
    } catch {
      return null;
    }
  });
  const grab = useRef<{ y: number; h: number; full: number; moved: boolean } | null>(null);
  const keepStage = (h: number | null) => {
    setStageH(h);
    try {
      if (h == null) localStorage.removeItem(STAGE_KEY);
      else localStorage.setItem(STAGE_KEY, String(Math.round(h)));
    } catch {}
  };
  // offene Gruppen merkt sich das Gerät, für alle Fotos
  const [groups, setGroups] = useState<Group[]>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(GROUPS_KEY) ?? "[]");
      return Array.isArray(v) ? GROUPS.map(([g]) => g).filter((g) => v.includes(g)) : [];
    } catch {
      return [];
    }
  });
  const [folded, setFolded] = useState<Group[]>([]);
  const [hue, setHue] = useState(1);
  const desk = useDesk();
  const croppingNow = useRef(cropping);
  croppingNow.current = cropping;

  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const ghost = useRef<HTMLCanvasElement>(null);
  const previewer = useRef<Previewer | null>(null);
  const bitmaps = useRef(new Map<string, Promise<Pic>>());

  const photo = photos.find((p) => p.key === sel) ?? photos[0];
  // Fotos ohne Titel heißen nach ihrer Stelle auf der Seite
  const nameOf = (p: StoredPhoto) => p.title || t("Foto {n}", { n: photos.indexOf(p) + 1 });
  const edit = edits[photo.key];
  const others = photos.filter((p) => p.key !== photo.key);
  const deferred = useDeferredValue(edits);
  const dirty = photos.some((p) => JSON.stringify(edits[p.key]) !== JSON.stringify(initial[p.key]));
  // Zuschnitt: Größe des Ergebnisses ohne Zuschnitt, Fläche nach dem Drehen in Vierteln
  const [fw, fh] = fullOf(photo, long);
  const geo = edit.geo ?? GEO0();
  const [TW, TH] = turned(fw, fh, geo.quarter);

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
          if (live) setError(i18n.t("Die kleinen Vorschauen ließen sich nicht laden ({reason}).", { reason: reasonOf(e) }));
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
      queueMicrotask(() => setError(i18n.t("Die Vorschau ließ sich nicht starten ({reason}).", { reason: reasonOf(e) })));
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
      previewer.current.setImage(pic, fullOf(photo, long));
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
  }, [photo, attempt, long]);

  // zeichnen: sofort mit grobem LUT, kurz danach mit dem feinen
  const shown = ready === photo.key;
  useEffect(() => {
    const p = previewer.current;
    if (!p || !shown) return;
    const key = colorKey(edit);
    // Trennlinie: Stelle auf der Bühne → Stelle im Bild, so wie es gedreht und gespiegelt gezeigt wird
    const gg = edit.geo ?? GEO0();
    const sdir: [number, number] = ([[1, 0], [0, -1], [-1, 0], [0, 1]] as const)[gg.quarter].map((v) => (gg.flip ? -v : v)) as [number, number];
    const at = gg.crop[0] + split * gg.crop[2];
    const vmap = outMap(edit.geo, fw, fh);
    const draw = (n: number) => p.draw({ lut: lutFor(edit, n, key), n, rec: edit.rec, split: compare ? at : null, original: holding, sdir, vignette: edit.more?.vignette, vmap, clarity: edit.more?.clarity });
    const raf = requestAnimationFrame(() => draw(lutCache.has(`${FINE_N}|${key}`) ? FINE_N : FAST));
    const t = window.setTimeout(() => draw(FINE_N), 140);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [edit, compare, split, holding, shown, fw, fh]);

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
    const changed = photos.filter((p) => JSON.stringify(to[p.key]) !== JSON.stringify(editsNow.current[p.key]));
    // ändert ein Schritt mehrere Fotos (Auf alle, Angleichen), bleibt das gezeigte Foto
    if (changed.length === 1 && changed[0].key !== sel) setSel(changed[0].key);
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
  // langes Drücken auf Rückgängig: mehrere Schritte auf einmal zurück, bis vor den gewählten
  const undoTo = (i: number) => {
    const to = past[i];
    if (!to || busy) return;
    fade(true);
    setPast((p) => p.slice(0, i));
    setFuture((f) => [...past.slice(i + 1), editsNow.current, ...f]);
    showChanged(to);
    setEdits(to);
    lastLive.current = 0;
  };
  /** was ein Schritt geändert hat, in einem Wort oder zwei */
  const stepName = (a: Record<string, PhotoEdit>, b: Record<string, PhotoEdit>) => {
    const changed = photos.filter((p) => JSON.stringify(a[p.key]) !== JSON.stringify(b[p.key]));
    if (changed.length > 1) return t("{n} Fotos auf einmal", { n: changed.length });
    const p = changed[0];
    if (!p) return t("Nichts geändert");
    const x = a[p.key] ?? neutralEdit();
    const y = b[p.key] ?? neutralEdit();
    const same = (k: keyof PhotoEdit) => JSON.stringify(x[k]) === JSON.stringify(y[k]);
    let what: string;
    if (y.origin && (y.origin !== x.origin || y.pick !== x.pick || !same("transfer")))
      what =
        y.origin === "pick"
          ? t(PICKS.find((q) => q.id === y.pick)?.name ?? "")
          : y.origin === "auto"
            ? t("Auto")
            : y.origin === "match"
              ? t("Angleichen")
              : t("Stimmung übernehmen");
    else if (!same("geo")) what = t("Zuschnitt");
    else if (!same("look")) what = y.look ? t(lookOf(y.look)?.name ?? "") : t("Ohne Look");
    else if (!same("amount")) what = t("Stärke {name}", { name: t(lookOf(y.look)?.name ?? "") });
    else if (!same("rec")) what = y.recName ?? t("Rezept");
    else {
      const f = FINE.find(([k]) => !same(k));
      what = f ? t(f[1]) : !same("more") ? t("Feinschliff") : t("Einstellungen");
    }
    return photos.length > 1 ? `${what} · ${nameOf(p)}` : what;
  };
  const history = past
    .map((before, i) => ({ i, name: stepName(before, past[i + 1] ?? edits) }))
    .reverse()
    .slice(0, 15);
  const steps = useRef({ undo, redo, crop: () => {} });
  useEffect(() => {
    steps.current = { undo, redo, crop: () => (croppingNow.current ? setCropping(false) : openCrop()) };
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
  const liveMore = (fn: (m: More) => Partial<More>) => {
    burst();
    setEdit((e) => {
      const m = { ...(e.more ?? MORE0()) };
      const next = { ...m, ...fn(m) };
      return { ...e, more: moreIsNeutral(next) ? undefined : next };
    });
  };
  const keepGroups = (next: Group[]) => {
    setGroups(next);
    try {
      localStorage.setItem(GROUPS_KEY, JSON.stringify(next));
    } catch {
      // privates Fenster: dann eben nur für diesen Dialog
    }
  };

  /* ----- Zuschneiden ----- */

  const setGeo = (fn: (g: Geo) => Geo) => setEdit((e) => ({ ...e, geo: keepGeo(fn(e.geo ?? GEO0())) }));
  const actGeo = (fn: (g: Geo) => Geo) => {
    remember();
    setGeo(fn);
  };
  // Drehrad: der Rahmen beim Ansetzen ist das Ziel; beim Drehen wird er nur so weit kleiner, wie es sein muss
  const dialBase = useRef<Geo["crop"] | null>(null);
  const kOf = (g: Geo, W = TW, H = TH) => ratioOf(g.ratio, g.portrait, W, H);
  const pickRatio = (r: Ratio) =>
    actGeo((g) => {
      // 4:5 ist meist hochkant gemeint, die anderen folgen der Fläche
      const portrait = r === "4:5" ? true : TH > TW;
      const k = ratioOf(r, portrait, TW, TH);
      return { ...g, ratio: r, portrait, crop: r === "free" ? g.crop : cropFor(k, g.crop, g.angle, TW, TH) };
    });
  const pickPortrait = (portrait: boolean) => actGeo((g) => ({ ...g, portrait, crop: cropFor(ratioOf(g.ratio, portrait, TW, TH), g.crop, g.angle, TW, TH) }));
  // 90° nach links: das ganze Ergebnis dreht sich, der Rahmen dreht mit
  const turnLeft = () =>
    actGeo((g) => {
      const [x, y, w, h] = g.crop;
      return { ...g, quarter: ((g.quarter + (g.flip ? 1 : 3)) % 4) as Geo["quarter"], portrait: !g.portrait, crop: [y, 1 - x - w, h, w] };
    });
  const flipIt = () => actGeo((g) => ({ ...g, flip: !g.flip, angle: -g.angle, crop: [1 - g.crop[0] - g.crop[2], g.crop[1], g.crop[2], g.crop[3]] }));
  const straighten = (a: number) => setGeo((g) => ({ ...g, angle: a, crop: fitCrop(dialBase.current ?? g.crop, a, TW, TH) }));
  // Auto: Neigung der Kanten im ganzen Foto schätzen; gespiegelt kippt sie in die andere Richtung
  const [autoBusy, setAutoBusy] = useState(false);
  const autoStraighten = async () => {
    const b = bitmaps.current.get(photo.key);
    if (!b || autoBusy) return;
    setAutoBusy(true);
    try {
      const px = pixelsOf(await b, 480);
      const tilt = estimateTilt(px.data, px.width, px.height);
      if (tilt == null) return setNote(t("Keine klare Kante gefunden. Dreh am Rad, bis es passt."));
      const a = Math.max(-45, Math.min(45, geo.flip ? tilt : -tilt));
      if (Math.abs(a - geo.angle) < 0.1) return setNote(t("Das Foto ist schon gerade."));
      actGeo((g) => ({ ...g, angle: a, crop: fitCrop(g.crop, a, TW, TH) }));
      haptic("select");
      setNote(t("Um {angle} gerade gerichtet. Das Rad stellt nach.", { angle: degrees(a) }));
    } catch (e) {
      console.warn("[bearbeiten] Auto gerade", reasonOf(e));
    } finally {
      setAutoBusy(false);
    }
  };
  const openCrop = () => {
    setTucked(false);
    setCompare(false);
    setHolding(false);
    setBig(null);
    setNote(null);
    setCropping(true);
  };

  /* ----- Vorschläge ----- */

  const me = loaded[photo.key]?.st;
  // Helligkeit des Fotos hinter der Kurve: alles außer der Kurve selbst eingerechnet, am kleinen Abzug
  const thumbNow = loaded[photo.key]?.thumb;
  const wantHist = tab === "f" && (groups.includes("curve") || !curveIsNeutral(edit.more?.curve));
  const histEdit = edit.more ? { ...edit, more: { ...edit.more, curve: [] } } : edit;
  const histKey = wantHist ? colorKey(histEdit) : "";
  const curveHist = useMemo(() => {
    if (!histKey || !thumbNow) return undefined;
    const out = new Uint8ClampedArray(thumbNow.data.length);
    applyLut(thumbNow.data, out, lutFor(JSON.parse(histKey) as PhotoEdit, FAST, histKey), FAST);
    const bins = new Array<number>(64).fill(0);
    for (let i = 0; i < out.length; i += 4) bins[Math.min(63, Math.floor((0.2126 * out[i] + 0.7152 * out[i + 1] + 0.0722 * out[i + 2]) / 4))]++;
    return bins;
  }, [histKey, thumbNow]);
  const otherStats = others.map((o) => loaded[o.key]?.st).filter((s): s is PhotoStats => !!s);
  const moodSrc = others.length ? others[moodIdx % others.length] : null;
  const moodSt = moodSrc ? loaded[moodSrc.key]?.st : undefined;
  const sugg = useMemo(() => {
    const n = neutralEdit();
    return {
      auto: me ? { ...n, ...autoEdit(me) } : n,
      picks: Object.fromEntries(PICKS.map((p) => [p.id, me ? pickEdit(me, p.id, n) : n])) as Record<PickId, PhotoEdit>,
      match: me && otherStats.length ? { ...n, transfer: matchTransfer(me, otherStats) } : n,
      mood: me && moodSt ? { ...n, transfer: moodTransfer(me, moodSt) } : n,
    };
    // otherStats ist pro Render neu; die Länge und die Fotos genügen als Schlüssel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, moodSt, otherStats.length]);

  /* ----- Stapel im Fotostudio: auf alle übertragen, angleichen ----- */

  const series = !!onFinish && photos.length > 1;
  // Abzüge im Streifen springen kurz hoch, wenn sie etwas bekommen (beide Streifen, Telefon und Rechner)
  const hop = (keys: string[]) => {
    if (reduce) return;
    keys.forEach((k, i) =>
      document.querySelectorAll<HTMLElement>(`[data-strip-key="${k}"]`).forEach((el) =>
        el.animate(
          [{ transform: "none" }, { transform: `translateY(-14px) rotate(${i % 2 ? 3 : -3}deg)`, offset: 0.4 }, { transform: "none" }],
          { duration: 460, delay: i * 45, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
        ),
      ),
    );
  };
  const spreadTo = (keys: string[]) => {
    const from = editsNow.current[photo.key];
    setEdits((m) => ({ ...m, ...Object.fromEntries(keys.map((k) => [k, spreadEdit(from, m[k], loaded[k]?.st)])) }));
    hop(keys);
  };
  // kurz groß über dem Foto, damit man es auch auf dem Telefon sieht (dort steht kein Hinweistext)
  const flash = (value: string, label: string) => {
    setBig({ value, label });
    window.setTimeout(() => setBig((b) => (b?.value === value ? null : b)), 1600);
  };
  const spreadAll = () => {
    const keys = others.map((p) => p.key);
    remember();
    spreadTo(keys);
    haptic("success");
    flash(t("Auf alle {n}", { n: photos.length }), t("jedes mit eigenem Auto"));
    setNote(t("Auf {n} Fotos, jedes mit eigenem Auto. Zuschnitt bleibt je Foto. Rückgängig nimmt es zurück.", { n: photos.length }));
  };
  const alignAll = () => {
    const all = photos.map((p) => ({ k: p.key, st: loaded[p.key]?.st })).filter((x): x is { k: string; st: PhotoStats } => !!x.st);
    if (all.length < 2) return;
    remember();
    fade();
    setEdits((m) => ({
      ...m,
      ...Object.fromEntries(all.map(({ k, st }) => [k, { ...m[k], transfer: matchTransfer(st, all.filter((o) => o.k !== k).map((o) => o.st)), levels: null, origin: "match" as const, moodFrom: undefined }])),
    }));
    hop(all.map((x) => x.k));
    flash(t("Angeglichen"), t("{n} Fotos rücken zusammen", { n: all.length }));
    setNote(t("Die Fotos sind in Licht und Farbe zueinander gerückt. Rückgängig nimmt es zurück."));
  };
  // Mias Wisch: vom eigenen Abzug über die anderen ziehen, jeder gestreifte bekommt die Bearbeitung
  const wipe = useRef<{ id: number; done: Set<string> } | null>(null);
  const wipeMove = (e: React.PointerEvent) => {
    const w = wipe.current;
    if (!w || w.id !== e.pointerId) return;
    const k = (document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-strip-key]") as HTMLElement | null)?.dataset.stripKey;
    if (!k || k === photo.key || w.done.has(k)) return;
    if (!w.done.size) remember();
    w.done.add(k);
    spreadTo([k]);
    haptic("select");
  };
  const wipeEnd = () => {
    const n = wipe.current?.done.size ?? 0;
    wipe.current = null;
    if (!n) return;
    flash(`+${n}`, n === 1 ? t("Foto übernimmt die Bearbeitung") : t("Fotos übernehmen die Bearbeitung"));
    setNote(n === 1 ? t("Auf 1 Foto gewischt, jedes mit eigenem Auto.") : t("Auf {n} Fotos gewischt, jedes mit eigenem Auto.", { n }));
  };

  /* ----- Rezepte ----- */

  const allRecipes = [...PRESETS, ...own];
  const recMatch = allRecipes.find((r) => sameRecipe(r.v, edit.rec));
  const recEmpty = recipeIsEmpty(edit.rec);
  // voreingestellte Rezepte heißen deutsch (so stehen sie auch in recName); eigene Namen bleiben, wie sie sind
  const shownName = (n: string) => (PRESETS.some((p) => p.name === n) ? t(n) : n);
  const recLabel = recMatch ? shownName(recMatch.name) : recEmpty ? "" : edit.recName ? t("{name} · geändert", { name: shownName(edit.recName) }) : t("Eigene Werte");

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
    setOwn((o) => [...o.filter((x) => x.name !== name), r].sort((a, b) => a.name.localeCompare(b.name, locale(lang))));
    setEdit((e) => ({ ...e, recName: name }));
    setNaming(false);
    setNote(t("„{name}“ steht jetzt oben bei „Deine Looks“, auch für andere Fotos und Bücher.", { name }));
    // die Looks stehen oben, das Formular unten: zum neuen Look scrollen
    requestAnimationFrame(() => dialog.current?.querySelector(`[data-own="${r.id}"]`)?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" }));
    saveRecipe(uid, r).catch(() => setNote(t("Der Look ließ sich nicht speichern.")));
  };
  const askDelete = (gone: NamedRecipe) =>
    setAsk({
      text: t("„{name}“ löschen? Fotos, die ihn nutzen, bleiben, wie sie sind.", { name: gone.name }),
      yes: t("Löschen"),
      no: t("Behalten"),
      onYes: () => {
        setOwn((o) => o.filter((r) => r.id !== gone.id));
        deleteRecipe(uid, gone.id).catch(() => {});
      },
    });
  const renameOwn = (r: NamedRecipe, name: string) => {
    if (name === r.name) return setNaming(false);
    if (own.some((x) => x.id !== r.id && x.name === name)) return setNote(t("„{name}“ heißt schon ein anderer Look.", { name }));
    const next = { ...r, name };
    setOwn((o) => o.map((x) => (x.id === r.id ? next : x)).sort((a, b) => a.name.localeCompare(b.name, locale(lang))));
    if (edit.recName === r.name) setEdit((e) => ({ ...e, recName: name }));
    setNaming(false);
    setNote(t("Heißt jetzt „{name}“.", { name }));
    saveRecipe(uid, next).catch(() => setNote(t("Der Look ließ sich nicht speichern.")));
  };
  const updateOwn = (r: NamedRecipe) => {
    const next: NamedRecipe = { ...r, v: { ...edit.rec }, f: lookFineOf(edit) };
    setOwn((o) => o.map((x) => (x.id === r.id ? next : x)));
    setEdit((e) => ({ ...e, recName: r.name }));
    setNote(t("„{name}“ hat jetzt die Einstellungen dieses Fotos.", { name: r.name }));
    saveRecipe(uid, next).catch(() => setNote(t("Der Look ließ sich nicht speichern.")));
  };
  const saveForm =
    naming === true ? (
      <SaveForm onCancel={() => setNaming(false)} onSave={saveOwn} />
    ) : naming ? (
      <SaveForm key={naming.id} initial={naming.name} label={t("Neuer Name für „{name}“", { name: naming.name })} onCancel={() => setNaming(false)} onSave={(name) => renameOwn(naming, name)} />
    ) : null;

  /* ----- Vorschläge: welche dastehen, merkt sich das Gerät; austauschen per Rechtsklick oder langem Tippen ----- */

  const shownPicks = useShownPicks();
  const spare = PICKS.filter((p) => !shownPicks.includes(p.id));
  const picksChanged = shownPicks.join() !== PICKS_SHOWN.join();
  const swapPick = (from: PickId, to: PickId) => setShownPicks(shownPicks.map((id) => (id === from ? to : id)));
  const dropPick = (id: PickId) => {
    setShownPicks(shownPicks.filter((x) => x !== id));
    const gone = PICKS.find((p) => p.id === id);
    setNote(t("„{name}“ steht nicht mehr da. Unter „Weitere“ holst du ihn zurück.", { name: gone ? t(gone.name) : "" }));
  };

  /* ----- Einstellungen kopieren und einfügen: Farbe und Licht, nie der Zuschnitt ----- */

  const recentAll = useRecentSettings();
  const copied = recentAll[0] ?? null;
  // das Rezept aus der Datei steckt in diesem Foto schon drin; kopiert wird es nur für andere Fotos
  const fileSettings = useMemo(() => (photo.recipe ? fromRecipe(photo.recipe) : null), [photo.recipe]);
  const fileFuji = photo.recipe?.kind === "fuji";
  const fileLabel = fileFuji ? t("Fuji-Rezept") : photo.recipe?.kind === "calima" ? t("Calima-Look") : t("Lightroom-Werte");
  const copyEdit = () => {
    const s = fromEdit(edit, undefined, nameOf(photo));
    if (!s) return setNote(t("Noch nichts zu kopieren: Stell zuerst Farbe oder Licht ein."));
    copySettings(s);
    haptic("select");
    setNote(t("Mitgenommen. Liegt oben bei „Deine Looks“, bei jedem Foto mit einem Tipp (⇧⌘V)."));
  };
  const copyFile = () => {
    if (!fileSettings) return;
    copySettings({ ...fileSettings, from: nameOf(photo) });
    haptic("select");
    setNote(
      fileSettings.approx
        ? t("{label} „{name}“ mitgenommen, in Calima nachempfunden. Liegt oben bei „Deine Looks“.", { label: fileLabel, name: shownName(fileSettings.name) })
        : t("{label} „{name}“ mitgenommen. Liegt oben bei „Deine Looks“.", { label: fileLabel, name: shownName(fileSettings.name) }),
    );
  };
  const paste = () => {
    if (!copied) return setNote(t("Erst bei einem Foto einen Look mitnehmen."));
    take(copied);
  };
  const take = (s: CopiedSettings) => {
    act((e) => applySettings(e, s), true);
    setNote(s.approx ? t("„{name}“ übernommen, nachempfunden. Der Zuschnitt bleibt.", { name: shownName(s.name) }) : t("„{name}“ übernommen. Der Zuschnitt bleibt.", { name: shownName(s.name) }));
  };
  const wears = (s: CopiedSettings) => wearsLook(edit, asLook(s, ""));
  /** Mitgenommenes oder ein Look aus dem Buch wird ein eigener Look, für alle Fotos und Bücher */
  const keep = (s: CopiedSettings) => {
    const same = own.find((x) => x.name === s.name);
    const r = asLook(s, same?.id ?? `own-${Date.now().toString(36)}`);
    setOwn((o) => [...o.filter((x) => x.name !== r.name), r].sort((a, b) => a.name.localeCompare(b.name, locale(lang))));
    if (recentAll.includes(s)) forgetSettings(s);
    setNote(t("„{name}“ steht jetzt bei „Deine Looks“. Umbenennen geht per Rechtsklick oder langem Drücken.", { name: r.name }));
    saveRecipe(uid, r).catch(() => setNote(t("Der Look ließ sich nicht speichern.")));
  };
  // jeder Look nur einmal: eigene vor dem Buch, das Buch vor „Zuletzt“
  const looks = (inBook ?? []).filter((l) => !own.some((r) => sameRecipe(r.v, l.rec) && (!r.f || sameSettings({ rec: r.v, f: r.f }, l))));
  const recent = recentAll.filter((c) => !looks.some((l) => sameSettings(l, c)) && !own.some((r) => r.f && sameSettings({ rec: r.v, f: r.f }, c)));
  const mine = own.length > 0 || recent.length > 0;
  const clip = useRef({ copyEdit, paste });
  useEffect(() => {
    clip.current = { copyEdit, paste };
  });

  /* ----- Zoom: Ausschnitt in Bruchteilen der Bühne, damit er Größenwechsel übersteht ----- */

  // gilt nur für das Foto, auf dem gezoomt wurde; ein anderes Foto beginnt ganz
  const [zoom, setZoom] = useState<View & { key: string; ease: boolean }>({ ...FIT, key: "", ease: false });
  const view: View = zoom.key === photo.key && !cropping ? zoom : FIT;
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
      if (croppingNow.current) return;
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
        setBig({ value: t("Original"), label: t("loslassen zeigt wieder bearbeitet") });
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
      const cur = tab;
      if (cur === "s") {
        g.mode = "none";
        setNote(t("Wischen stellt unter Looks und Feinschliff ein. Hier genügt ein Tipp auf einen Vorschlag."));
      } else if (cur === "r") {
        g.mode = "none";
        setNote(t("Im Rezept stellst du die Werte unten ein, wie an der Kamera."));
      } else if (cur === "l" && !edit.look) {
        g.mode = "none";
        setNote(t("Erst einen Look wählen, dann wischen."));
      }
      g.v = cur === "l" ? edit.amount : edit[active];
    }
    if (g.mode !== "swipe") return;
    const k = dx / g.w;
    if (tab === "l") {
      const v = Math.min(1, Math.max(0, g.v + k));
      live({ amount: v });
      const L = lookOf(edit.look);
      setBig({ value: `${Math.round(v * 100)} %`, label: L ? t(L.name) : "" });
    } else {
      const [key, name, fmt, min, max] = fineOf(active);
      let v = Math.min(max, Math.max(min, g.v + k * (max - min) * 0.8));
      // nahe der Mitte rastet der Wert auf null ein
      if (min < 0 && Math.abs(v) < (max - min) * 0.015) v = 0;
      live({ [key]: v });
      setBig({ value: fmt(v), label: t(name) });
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
      // ⇧⌘C / ⇧⌘V: Einstellungen kopieren und einfügen, wie in Lightroom
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey && (e.key.toLowerCase() === "c" || e.key.toLowerCase() === "v")) {
        if (typing(e.target)) return;
        e.preventDefault();
        if (e.key.toLowerCase() === "c") clip.current.copyEdit();
        else clip.current.paste();
        return;
      }
      if (typing(e.target)) return;
      // \ liegt auf deutschen Tastaturen hinter Alt (Mac) oder AltGr; deshalb ohne Prüfung der Zusatztasten
      if ((e.key === "\\" || e.key === "m") && !e.repeat) setHolding(true);
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "c" || e.key === "C") return steps.current.crop();
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
    setAsk({ text: t("Änderungen verwerfen?"), yes: t("Verwerfen"), no: t("Weiter bearbeiten"), onYes: onClose });
  };

  const finish = async () => {
    if (onFinish) return onFinish(edits);
    if (!bookId || !onDone) return onClose();
    const changed = photos.filter((p) => JSON.stringify(edits[p.key]) !== JSON.stringify(initial[p.key]));
    if (!changed.length) return onClose();
    setError(null);
    cancelled.current = false;
    const patches: Record<string, DevelopPatch> = {};
    try {
      for (const [i, p] of changed.entries()) {
        const e = edits[p.key];
        const orig = origOf(p);
        if (isNeutral(e)) {
          // zurück zum Original: nichts rechnen, die alten Dateien gelten wieder
          if (p.orig) patches[p.key] = editedPatch(p, e);
          continue;
        }
        setBusy(changed.length > 1 ? t("Speichere Foto {i} von {n} …", { i: i + 1, n: changed.length }) : t("Speichere das Foto …"));
        const out = await bakePhoto({ url: orig.large, lut: lutFor(e, FINE_N), n: FINE_N, rec: e.rec, geo: e.geo, vignette: e.more?.vignette, clarity: e.more?.clarity });
        if (cancelled.current) return;
        const urls = await uploadEdited(uid, bookId, p.key, out.blobs);
        if (cancelled.current) return;
        patches[p.key] = editedPatch(p, e, { urls, color: out.color });
      }
    } catch (e) {
      if (cancelled.current) return;
      console.warn("[bearbeiten] Einrechnen", reasonOf(e));
      setBusy(null);
      setError(t("Speichern hat nicht geklappt. Prüf die Verbindung und tipp noch einmal auf Fertig. ({reason})", { reason: reasonOf(e) }));
      return;
    }
    setBusy(null);
    onDone(patches);
  };

  /* ----- Texte ----- */

  const hint =
    note ??
    (cropping
      ? bookId
        ? t("Rahmen ziehen verschiebt ihn, Ecken ändern die Größe. Das Rad darunter richtet gerade. Die Seite schneidet im Rahmen zusätzlich zu.")
        : t("Rahmen ziehen verschiebt ihn, Ecken ändern die Größe. Das Rad darunter richtet gerade.")
      : compare
      ? t("Den Strich auf dem Foto ziehen. Links ist das Original.")
      : tab === "s"
        ? series
          ? t("Ein Foto einstellen, dann „Auf alle“. Oder sein Bild im Streifen über die anderen ziehen.")
          : t("Ein Tipp genügt. Lange drücken oder Rechtsklick tauscht einen Vorschlag aus.")
        : tab === "l"
          ? edit.look
            ? t("Auf dem Foto wischen ändert die Stärke. Den Look noch einmal antippen oder „Ohne Look“ nimmt ihn weg.")
            : t("Jede Kachel zeigt den Look auf deinem Foto.")
          : tab === "r"
            ? t("Die Einstellungen einer Fuji-Kamera, nachempfunden. Gilt auch für Fotos vom iPhone.")
            : t("Auf dem Foto wischen stellt „{name}“ ein. ↺ setzt einen Regler zurück.", { name: t(fineOf(active)[1]) }));

  const switchTab = (t: Tab) => {
    setTab(t);
    setNote(null);
  };
  // Bühne: zeigt den Rahmen; beim Zuschneiden die ganze Fläche mit dem Rahmen darüber
  const shownGeo: Geo = cropping ? { ...geo, crop: FULL } : geo;
  const [sw, sh] = cropping ? [TW, TH] : outSize(geo, fw, fh);
  const aspect = sw / sh;
  const [pxW, pxH] = outSize(geo, fw, fh);
  const tileImg = loaded[photo.key]?.tile;

  // Fotos der Doppelseite: auf dem Telefon als Streifen unter dem Foto, am Desktop senkrecht direkt links daneben,
  // damit das Foto die ganze Höhe bekommt
  const strip = (className: string, thumb: string) =>
    photos.length > 1 && (
      <div role="group" aria-label={series ? t("Fotos dieses Stapels") : t("Fotos dieser Doppelseite")} className={`flex gap-3 select-none ${className}`}>
        {photos.map((p) => {
          const on = p.key === photo.key;
          const img = loaded[p.key]?.thumb;
          return (
            <button
              key={p.key}
              type="button"
              aria-pressed={on}
              data-strip-key={p.key}
              onPointerDown={
                series && on
                  ? (e) => {
                      if (e.button !== 0) return;
                      e.currentTarget.setPointerCapture(e.pointerId);
                      wipe.current = { id: e.pointerId, done: new Set() };
                    }
                  : undefined
              }
              onPointerMove={series && on ? wipeMove : undefined}
              onPointerUp={series && on ? wipeEnd : undefined}
              onPointerCancel={series && on ? wipeEnd : undefined}
              onClick={() => {
                setSel(p.key);
                setNote(null);
                setNaming(false);
              }}
              className={`group relative ${thumb} min-w-11 flex-none ${series && on ? "touch-none" : ""} outline-3 outline-offset-2 transition-[outline-color] duration-150 ${on ? "outline-mark" : "outline-transparent"}`}
              style={{ aspectRatio: `${p.w} / ${p.h}` }}
            >
              {img && <LutThumb img={img} edit={deferred[p.key]} className="block size-full object-cover" />}
              {!on && <span aria-hidden className="bg-paper/55 absolute inset-0 transition-opacity duration-150 group-hover:opacity-50" />}
              <span className="sr-only">
                {on
                  ? series
                    ? t("{name}, in Bearbeitung. Über die anderen ziehen überträgt die Bearbeitung", { name: nameOf(p) })
                    : t("{name}, in Bearbeitung", { name: nameOf(p) })
                  : t("{name} bearbeiten", { name: nameOf(p) })}
              </span>
            </button>
          );
        })}
      </div>
    );

  return (
    <dialog
      ref={dialog}
      aria-label={t("Foto bearbeiten")}
      lang={lang}
      className="bg-table text-on-table fixed inset-0 z-[700] m-0 h-full max-h-none w-full max-w-none overflow-hidden overscroll-contain p-0"
      onCancel={(e) => {
        e.preventDefault();
        // Escape schließt zuerst die Rückfrage, dann den Zuschnitt
        if (ask) setAsk(null);
        else if (cropping) setCropping(false);
        else close();
      }}
    >
      <div className="flex h-full flex-col flat:grid flat:grid-cols-[minmax(0,1fr)_minmax(300px,48%)] flat:grid-rows-[auto_minmax(0,1fr)] lg:mx-auto lg:grid lg:h-full lg:max-w-[1680px] lg:grid-cols-[minmax(0,1fr)_clamp(340px,26vw,400px)] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-x-8 lg:gap-y-5 lg:px-8 lg:pt-5 lg:pb-6">
        <header className="flex flex-none items-center justify-between gap-4 pt-[max(0.5rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-2 pl-[max(1rem,env(safe-area-inset-left))] flat:col-span-2 lg:col-span-2 lg:p-0">
          <h2 className="text-xl font-bold tracking-[-0.02em]">{title ?? t("Bearbeiten")}</h2>
          <div className="flex items-center gap-2 lg:gap-3">
            <ToolGroup label={t("Verlauf")}>
              <ContextMenu
                container={dialog}
                className="inline-flex"
                menu={
                  <>
                    <MenuLabel>{t("Zurück bis vor …")}</MenuLabel>
                    {history.map((h, n) => (
                      <MenuItem key={h.i} hint={n === 0 ? t("der letzte Schritt") : t("{n} Schritte zurück", { n: n + 1 })} onClick={() => undoTo(h.i)}>
                        {h.name}
                      </MenuItem>
                    ))}
                    {past.length > history.length && (
                      <>
                        <MenuSeparator />
                        <MenuItem icon={<RotateCcw />} onClick={() => undoTo(0)}>
                          {t("Ganz an den Anfang")}
                        </MenuItem>
                      </>
                    )}
                    {!past.length && <MenuItem disabled>{t("Noch nichts zum Zurücknehmen")}</MenuItem>}
                  </>
                }
              >
                <IconButton label={withKeys(t("Rückgängig"), "⌘Z")} title={t("Rückgängig, lange drücken zeigt den Verlauf")} onClick={undo} disabled={!past.length || !!busy}>
                  <Undo2 aria-hidden />
                </IconButton>
              </ContextMenu>
              <IconButton label={withKeys(t("Wiederholen"), "⇧⌘Z")} onClick={redo} disabled={!future.length || !!busy}>
                <Redo2 aria-hidden />
              </IconButton>
            </ToolGroup>
            {/* Telefon: nur das Zeichen, damit Verlauf, Abbrechen und Fertig in eine Zeile passen */}
            <Button size="sm" onClick={close} className="pl-2.5 max-sm:min-w-11 max-sm:px-0" aria-label={t("Abbrechen")}>
              <X aria-hidden />
              <span className="max-sm:sr-only">{t("Abbrechen")}</span>
            </Button>
            <Button variant="cloth" size="sm" onClick={finish} disabled={!!busy} className="pl-3 md:min-h-11 md:px-5">
              <Check aria-hidden />
              {busy ? t("Speichert …") : t("Fertig")}
            </Button>
          </div>
        </header>

        {/* Bühne: das Foto ganz sichtbar; auf dem Telefon steht sie fest, nur die Werkzeuge rollen. Quer stehen Foto und Werkzeuge nebeneinander */}
        <div
          className={`bg-table flex flex-none flex-col gap-2 flat:min-h-0 pr-[max(1rem,env(safe-area-inset-right))] pb-2 pl-[max(1rem,env(safe-area-inset-left))] lg:min-h-0 lg:gap-4 lg:p-0 ${tucked ? "max-lg:min-h-0 max-lg:flex-1" : ""}`}
        >
          <div
            ref={stage}
            style={stageH != null && !cropping && !tucked ? ({ "--stage": `${stageH}px` } as CSSProperties) : undefined}
            className={`grid ${cropping ? "h-[clamp(220px,50svh,560px)]" : tucked ? "max-lg:min-h-0 max-lg:flex-1" : "h-[var(--stage,clamp(170px,36svh,460px))]"} place-items-center [container-type:size] flat:h-auto flat:min-h-0 flat:flex-1 lg:h-auto lg:min-h-0 lg:flex-1 lg:px-[88px]`}>
            <div className="relative" style={{ width: `min(100cqw, ${aspect * 100}cqh)`, aspectRatio: `${sw} / ${sh}` }}>
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
                aria-label={
                  isNeutral(edit)
                    ? t("{name}. Halten zeigt das Original, waagerecht wischen stellt ein, zwei Finger oder Doppeltipp zoomen.", { name: nameOf(photo) })
                    : t("{name}, bearbeitet. Halten zeigt das Original, waagerecht wischen stellt ein, zwei Finger oder Doppeltipp zoomen.", { name: nameOf(photo) })
                }
              >
                {/* Zoom: nur transform; das Bild hat volle Auflösung, die Vergrößerung zeigt echte Details */}
                <div
                  className={`absolute inset-0 origin-top-left ${zoom.ease && zoom.key === photo.key ? "ease-out transition-transform duration-500" : ""}`}
                  style={{ transform: `translate(${view.x * 100}%, ${view.y * 100}%) scale(${view.z})` }}
                >
                  {/* Zuschnitt: das ganze Bild liegt gedreht unter dem Rahmen */}
                  <div className="absolute" style={geoBox(shownGeo, fw, fh)}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- Platzhalter, bis die Vorschau steht */}
                    {!shown && <img src={photo.orig?.thumb ?? photo.thumb} alt="" className="absolute inset-0 size-full object-cover" />}
                    <canvas ref={canvas} aria-hidden className={`absolute inset-0 size-full ${shown ? "" : "opacity-0"}`} />
                    <canvas ref={ghost} aria-hidden className="pointer-events-none absolute inset-0 size-full opacity-0" />
                  </div>
                </div>
                {cropping && shown && (
                  <>
                    <CropStage
                      geo={geo}
                      W={TW}
                      H={TH}
                      ratio={kOf(geo)}
                      onChange={(c) => {
                        burst();
                        setGeo((g) => ({ ...g, crop: c }));
                      }}
                      onEnd={() => {}}
                    />
                    <span
                      aria-hidden
                      className="text-on-table pointer-events-none absolute z-[8] rounded-full bg-[rgb(12_10_8/0.6)] px-2 py-0.5 text-[11px] font-semibold tabular-nums"
                      style={{ left: `calc(${geo.crop[0] * 100}% + 6px)`, top: `calc(${geo.crop[1] * 100}% + 6px)` }}
                    >
                      {geo.ratio === "free" ? "" : `${ratioLabel(geo.ratio === "orig" ? "orig" : geo.ratio, geo.portrait)} · `}
                      {pxW} × {pxH} px
                    </span>
                  </>
                )}
                {failed && !shown && (
                  <div className="slip text-ink rounded-cut absolute inset-x-2 bottom-2 z-[6] grid justify-items-start gap-2 p-3 text-sm" onPointerDown={(e) => e.stopPropagation()}>
                    <p className="font-semibold">{t("Das Foto ließ sich nicht laden.")}</p>
                    <p className="text-ink-2 mt-0.5 text-xs">{failed}</p>
                    <Button
                      variant="paper"
                      size="sm"
                      onClick={() => {
                        setFailed(null);
                        setAttempt((n) => n + 1);
                      }}
                    >
                      {t("Noch einmal laden")}
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
                      {t("vorher")}
                    </span>
                    <span aria-hidden className="text-on-table pointer-events-none absolute top-2 right-2 z-[4] rounded-full bg-[rgb(12_10_8/0.6)] px-2.5 py-1 text-xs font-semibold">
                      {t("nachher")}
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
                    {zoomPct(view.z)} %<span className="sr-only">{t(", ganzes Foto zeigen")}</span>
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
          {cropping && (
            <StraightenDial
              angle={geo.angle}
              onStart={() => {
                remember();
                dialBase.current = geo.crop;
                setNote(null);
              }}
              onChange={straighten}
              onEnd={() => (dialBase.current = null)}
              onTurn={turnLeft}
              onFlip={flipIt}
              onAuto={autoStraighten}
              autoBusy={autoBusy}
            />
          )}
          {/* Telefon: Fotos und Knöpfe in einer Zeile, damit für die Werkzeuge mehr Höhe bleibt */}
          <div className={cropping ? "hidden" : "flex items-center gap-2 lg:contents"}>
            {strip("min-w-0 flex-1 overflow-x-auto px-1 py-1.5 lg:hidden", "h-14")}

            <div className="flex flex-none items-center gap-2 max-lg:ml-auto lg:flex-wrap lg:justify-center">
              <button
                type="button"
                disabled={!shown}
                title={t("Auch: Taste C")}
                onClick={openCrop}
                className={buttonClass("quiet", "sm", `pl-2.5 ${photos.length > 1 ? "max-sm:min-w-11 max-sm:px-0" : ""}`)}
              >
                <Crop aria-hidden />
                <span className={photos.length > 1 ? "max-sm:sr-only" : ""}>{t("Zuschneiden")}</span>
                {!geoIsNeutral(edit.geo) && <span aria-hidden className="bg-mark size-1.5 rounded-full" />}
                {!geoIsNeutral(edit.geo) && <span className="sr-only">{t(", zugeschnitten")}</span>}
              </button>
              <button
                type="button"
                aria-pressed={compare}
                disabled={!shown}
                title={t("Auch: M oder \\ gedrückt halten zeigt das Original, 1–4 wechseln die Reiter")}
                onClick={() => {
                  setCompare((c) => !c);
                  setSplit(toImage(0.5));
                  setNote(null);
                }}
                className={buttonClass("quiet", "sm", `pl-2.5 max-sm:min-w-11 max-sm:px-0 flat:min-w-11 flat:px-0 ${compare ? "!bg-on-table !text-table" : ""}`)}
              >
                <Columns2 aria-hidden />
                <span className="max-sm:sr-only flat:sr-only">{t("Vorher / nachher")}</span>
              </button>
              <button
                type="button"
                onClick={() => act(() => neutralEdit())}
                disabled={isNeutral(edit) || !!busy}
                className={buttonClass("quiet", "sm", "pl-2.5 max-sm:min-w-11 max-sm:px-0 flat:min-w-11 flat:px-0")}
              >
                <RotateCcw aria-hidden />
                <span className="max-sm:sr-only flat:sr-only">{t("Foto zurücksetzen")}</span>
              </button>
              {/* am Telefon genügen zwei Finger, die Leiste bleibt einzeilig */}
              <button
                type="button"
                aria-pressed={view.z > 1.01}
                disabled={!shown}
                title={keys(t("Auch: Doppelklick oder Mausrad aufs Foto, + und − auf der Tastatur, 0 zeigt das ganze Foto"))}
                onClick={() => toggleZoom()}
                className={buttonClass("quiet", "sm", `pl-2.5 max-sm:hidden flat:hidden ${view.z > 1.01 ? "!bg-on-table !text-table" : ""}`)}
              >
                <ZoomIn aria-hidden />
                Zoom
              </button>
            </div>
          </div>
          {/* immer da, damit Screenreader Fehler und Fortschritt hören */}
          {/* am Desktop steht der Hinweis auf dem Zettel beim Werkzeug; hier bleiben nur Fehler und Fortschritt sichtbar.
              Am Telefon zeigt die Zeile nur, was gerade passiert ist; der Dauerhinweis kostet sonst Platz für die Werkzeuge */}
          <p role="status" className={`text-[13px] lg:text-center ${error ? "text-on-table font-semibold" : "text-on-table-2"} ${error || busy ? "" : note || compare ? "lg:sr-only" : "sr-only"}`}>
            {error ?? busy ?? hint}
          </p>
        </div>

        {/* Werkzeuge */}
        <section
          ref={slip}
          aria-label={t("Werkzeuge")}
          inert={!shown || !!busy}
          onTouchStart={(e) => {
            const el = slip.current;
            pull.current = null;
            if (!el || cropping || window.matchMedia("(min-width: 1024px), (orientation: landscape) and (max-height: 500px)").matches) return;
            // Regler, Kurve und Drehrad brauchen das Ziehen selbst
            if ((e.target as Element).closest("input, [role=slider], svg[role=group], [data-dial], [data-grab]")) return;
            if (!tucked && el.scrollTop > 0) return;
            pull.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dy: 0 };
          }}
          onTouchMove={(e) => {
            const p = pull.current;
            const el = slip.current;
            if (!p || !el) return;
            const dx = e.touches[0].clientX - p.x;
            p.dy = e.touches[0].clientY - p.y;
            if (Math.abs(dx) > Math.abs(p.dy)) {
              pull.current = null;
              el.style.transform = "";
              return;
            }
            // der Zettel folgt dem Finger nach unten, gebremst
            if (!tucked && p.dy > 8 && el.scrollTop <= 0) {
              el.style.transition = "none";
              el.style.transform = `translateY(${(p.dy - 8) * 0.55}px)`;
            }
          }}
          onTouchEnd={() => {
            const p = pull.current;
            const el = slip.current;
            pull.current = null;
            if (el) {
              el.style.transition = reduce ? "" : "transform 220ms var(--ease-out)";
              el.style.transform = "";
            }
            if (!p) return;
            if (!tucked && p.dy > 70) {
              setTucked(true);
              haptic("select");
            } else if (tucked && p.dy < -24) setTucked(false);
          }}
          onTouchCancel={() => {
            pull.current = null;
            if (slip.current) slip.current.style.transform = "";
          }}
          className={`${tucked ? "max-lg:flex-none max-lg:overflow-hidden max-lg:[&>*:not([data-keep])]:hidden" : ""} slip text-ink max-lg:rounded-t-tool flat:!rounded-tr-none flat:min-h-0 lg:rounded-cut relative flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain pt-4 lg:shadow-[0_18px_30px_-18px_rgb(12_10_8/0.8)] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] transition-opacity duration-150 lg:max-h-full lg:flex-none lg:self-start lg:px-5 lg:pt-5 lg:pb-5 ${!shown || busy ? "opacity-60" : ""}`}
        >
          {photos.length > 1 && (
            <p className="sr-only">
              {t("Du bearbeitest")} <b className="text-ink">{nameOf(photo)}</b>. {t("Ein anderes Foto antippen wechselt.")}
            </p>
          )}
          {cropping && (
            <div className="grid gap-4">
              <div className="flex items-center justify-between gap-2">
                <Button variant="paper" size="sm" className="pl-2" onClick={() => setCropping(false)}>
                  <ChevronLeft aria-hidden />
                  {t("Werkzeuge")}
                </Button>
                <h3 className="text-[15px] font-bold tracking-[-0.01em]">{t("Zuschnitt")}</h3>
                <Button variant="paper" size="sm" className="pl-2.5" disabled={geoIsNeutral(edit.geo)} onClick={() => actGeo(() => GEO0())}>
                  <RotateCcw aria-hidden />
                  {t("Zurücksetzen")}
                </Button>
              </div>
              <Chips<Ratio> label={t("Format")} opts={RATIOS} cur={geo.ratio} onPick={pickRatio} />
              {geo.ratio !== "orig" && geo.ratio !== "free" && geo.ratio !== "1:1" && (
                <div>
                  <h3 className={groupTitle}>{t("Ausrichtung")}</h3>
                  <Segmented
                    tone="paper"
                    label={t("Ausrichtung")}
                    options={[
                      { value: "hoch", label: t("Hoch") },
                      { value: "quer", label: t("Quer") },
                    ]}
                    value={geo.portrait ? "hoch" : "quer"}
                    onChange={(v) => pickPortrait(v === "hoch")}
                  />
                </div>
              )}
              {/* am Rechner zusätzlich als gewöhnlicher Regler, für Tastatur und genaue Werte */}
              <div className="max-lg:hidden">
                <Slider
                  id="dv-angle"
                  label={t("Geraderichten")}
                  value={geo.angle}
                  min={-45}
                  max={45}
                  step={0.1}
                  zero={0}
                  format={degrees}
                  onFocus={() => (dialBase.current = geo.crop)}
                  onChange={(v) => {
                    burst();
                    straighten(v);
                  }}
                />
              </div>
              <p className="text-ink-2 text-[13px] leading-snug">{hint}</p>
            </div>
          )}
          <div data-keep="" hidden={cropping} className="slip sticky -top-4 z-[2] -mx-4 -mt-4 px-4 pt-1 pb-1 flat:pt-4 lg:-top-5 lg:-mx-5 lg:-mt-5 lg:px-5 lg:pt-5">
            <button
              type="button"
              data-grab=""
              aria-expanded={!tucked}
              onClick={() => {
                // nach dem Ziehen kein Klick hinterher
                if (grab.current?.moved) return void (grab.current = null);
                setTucked((t) => !t);
              }}
              // am Griff zieht man den Zettel stufenlos hoch (Foto kleiner, mehr Werkzeug) oder weit nach unten zum Einklappen
              onPointerDown={(e) => {
                const el = stage.current;
                if (tucked || !el) return;
                el.style.removeProperty("--stage");
                const full = el.getBoundingClientRect().height;
                if (stageH != null) el.style.setProperty("--stage", `${stageH}px`);
                grab.current = { y: e.clientY, h: el.getBoundingClientRect().height, full, moved: false };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                const g = grab.current;
                const el = stage.current;
                if (!g || !el || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
                const dy = e.clientY - g.y;
                if (!g.moved && Math.abs(dy) < 6) return;
                g.moved = true;
                // über die gewohnte Höhe hinaus nur gebremst: das ist der Weg zum Einklappen
                const h = g.h + dy;
                el.style.setProperty("--stage", `${h > g.full ? g.full + (h - g.full) * 0.35 : Math.max(STAGE_MIN, h)}px`);
              }}
              onPointerUp={(e) => {
                const g = grab.current;
                const el = stage.current;
                if (!g || !el || !g.moved) return void (grab.current = null);
                const h = g.h + e.clientY - g.y;
                if (h > g.full + 70) {
                  setTucked(true);
                  haptic("select");
                }
                const next = h >= g.full - 12 ? null : Math.max(STAGE_MIN, h);
                if (next == null) el.style.removeProperty("--stage");
                else el.style.setProperty("--stage", `${next}px`);
                keepStage(next);
              }}
              onPointerCancel={() => {
                grab.current = null;
                if (stage.current && stageH == null) stage.current.style.removeProperty("--stage");
                else stage.current?.style.setProperty("--stage", `${stageH}px`);
              }}
              className={`text-ink-2 flex w-full touch-none items-center justify-center gap-1.5 lg:hidden flat:hidden ${tucked ? "min-h-11 text-[13px] font-semibold" : "-mt-1 -mb-1.5 h-7 cursor-row-resize"}`}
            >
              {tucked ? (
                <>
                  <ChevronUp aria-hidden className="size-4" />
                  {t("Werkzeuge zeigen")}
                </>
              ) : (
                <>
                  <span aria-hidden className="bg-ink/25 h-1 w-10 rounded-full" />
                  <span className="sr-only">{t("Werkzeuge einklappen, Foto ganz zeigen")}</span>
                </>
              )}
            </button>
          <div
            hidden={tucked}
            role="tablist"
            aria-label={t("Werkzeuge")}
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
              {TABS.map(([id, name]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`dv-tab-${id}`}
                  aria-selected={tab === id}
                  aria-controls={tab === id ? `dv-pane-${id}` : undefined}
                  tabIndex={tab === id ? 0 : -1}
                  onClick={() => switchTab(id)}
                  className={`relative min-h-9 min-w-0 flex-auto rounded-full px-2 text-[13px] font-semibold transition-colors duration-150 pointer-coarse:min-h-11 sm:text-sm ${tab === id ? "text-paper" : "text-ink-2 hover:text-ink"}`}
                >
                  {tab === id && (
                    <motion.span
                      layoutId="dv-tab"
                      aria-hidden
                      className="bg-ink absolute inset-0 rounded-full"
                      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 38 }}
                    />
                  )}
                  <span className="relative">{t(name)}</span>
                </button>
              ))}
            </div>
          </div>
          {series && (
            <div hidden={tucked} className="mt-2 flex items-center gap-2">
              <Button variant="cloth" size="sm" onClick={spreadAll} disabled={!!busy} className="min-w-0 flex-1 pl-2.5">
                <Copy aria-hidden />
                {t("Auf alle {n}", { n: photos.length })}
              </Button>
              <Button variant="paper" size="sm" onClick={alignAll} disabled={!!busy || photos.some((p) => !loaded[p.key])} className="min-w-0 flex-1 pl-2.5">
                <Layers aria-hidden />
                {t("Angleichen")}
              </Button>
            </div>
          )}
          </div>

          <p aria-hidden className={`text-ink-2 -mt-1 text-[13px] leading-snug max-lg:hidden ${cropping ? "lg:hidden" : ""}`}>
            {hint}
          </p>
          <div role="tabpanel" id={`dv-pane-${tab}`} aria-labelledby={`dv-tab-${tab}`} hidden={cropping}>
            {tab === "s" && mine && (
              <div className="mb-7">
                <h3 className={groupTitle}>{t("Deine Looks")}</h3>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(92px,1fr))] sm:gap-2.5 lg:grid-cols-3 lg:gap-y-5">
                  {recent.map((c, i) => (
                    <ContextMenu
                      key={`recent-${i}`}
                      container={dialog}
                      className="grid min-w-0 select-none"
                      menu={
                        <>
                          <MenuItem icon={<BookmarkPlus />} hint={t("für alle Fotos und Bücher")} onClick={() => keep(c)}>
                            {t("Zu deinen Looks")}
                          </MenuItem>
                          <MenuSeparator />
                          <MenuItem icon={<X />} onClick={() => forgetSettings(c)}>
                            {t("Aus „Zuletzt“ entfernen")}
                          </MenuItem>
                        </>
                      }
                    >
                      <Tile
                        img={tileImg}
                        edit={applySettings(edit, c)}
                        name={shownName(c.name)}
                        txt={[t("mitgenommen"), c.source === "fuji" ? "Fuji" : c.source === "lightroom" ? "Lightroom" : c.from].filter(Boolean).join(" · ")}
                        pressed={wears(c)}
                        dashed
                        onClick={() => take(c)}
                      />
                    </ContextMenu>
                  ))}
                  {own.map((r) => (
                    <ContextMenu
                      key={r.id}
                      data-own={r.id}
                      container={dialog}
                      className="relative grid min-w-0 select-none"
                      menu={
                        <>
                          <MenuItem icon={<Pencil />} onClick={() => setNaming(r)}>
                            {t("Umbenennen")}
                          </MenuItem>
                          <MenuItem icon={<RefreshCw />} hint={t("nimmt Farbe und Licht von jetzt")} onClick={() => updateOwn(r)} disabled={colorIsNeutral(edit) || wearsLook(edit, r)}>
                            {t("Mit diesem Foto überschreiben")}
                          </MenuItem>
                          <MenuSeparator />
                          <MenuItem icon={<Trash />} danger onClick={() => askDelete(r)}>
                            {t("Löschen")}
                          </MenuItem>
                        </>
                      }
                    >
                      <Tile img={tileImg} edit={{ ...edit, ...r.f, rec: r.v }} name={r.name} txt={r.f ? t("eigener Look") : t("eigenes Rezept")} pressed={wearsLook(edit, r)} onClick={() => applyOwn(r)} />
                      <button
                        type="button"
                        onClick={() => askDelete(r)}
                        aria-label={t("{name} löschen", { name: r.name })}
                        title={t("{name} löschen", { name: r.name })}
                        className="bg-paper/90 text-ink hover:bg-paper absolute top-1.5 left-1.5 grid size-7 place-items-center rounded-full shadow-[0_1px_4px_rgb(12_10_8/0.3)]"
                      >
                        <X aria-hidden className="size-3.5" />
                      </button>
                    </ContextMenu>
                  ))}
                </div>
                {naming && naming !== true && saveForm}
              </div>
            )}
            {tab === "s" && looks.length > 0 && (
              <div className="mb-7">
                <h3 className={groupTitle}>{t("In diesem Buch")}</h3>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(92px,1fr))] sm:gap-2.5 lg:grid-cols-3 lg:gap-y-5">
                  {looks.map((l) => (
                    <ContextMenu
                      key={l.keys.join()}
                      container={dialog}
                      className="grid min-w-0 select-none"
                      menu={
                        <MenuItem icon={<BookmarkPlus />} hint={t("für alle Fotos und Bücher")} onClick={() => keep(l)}>
                          {t("Zu deinen Looks")}
                        </MenuItem>
                      }
                    >
                      <Tile img={tileImg} edit={applySettings(edit, l)} name={shownName(l.name)} txt={l.where || t("aus diesem Buch")} pressed={wears(l)} onClick={() => take(l)} />
                    </ContextMenu>
                  ))}
                </div>
              </div>
            )}
            {tab === "s" && (mine || looks.length > 0) && <h3 className={groupTitle}>{t("Vorschläge")}</h3>}
            {tab === "s" && (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(92px,1fr))] sm:gap-2.5 lg:grid-cols-3 lg:gap-y-5">
                <Tile
                  img={tileImg}
                  edit={sugg.auto}
                  name="Auto"
                  txt={t("Licht und Farbe automatisch")}
                  pressed={edit.origin === "auto"}
                  disabled={!me}
                  onClick={() =>
                    me &&
                    act((e) => {
                      // nach einem fertigen Vorschlag heißt Auto wirklich nur Auto
                      const base = e.origin === "pick" ? { ...neutralEdit(), rec: e.rec, recName: e.recName, geo: e.geo } : e;
                      return { ...base, ...autoEdit(me), origin: "auto", moodFrom: undefined, pick: undefined };
                    })
                  }
                />
                {shownPicks.map((id) => {
                  const p = PICKS.find((x) => x.id === id)!;
                  return (
                    <ContextMenu
                      key={id}
                      container={dialog}
                      className="grid min-w-0 select-none"
                      menu={
                        <>
                          {spare.length > 0 && <MenuLabel>{t("Austauschen gegen")}</MenuLabel>}
                          {spare.map((q) => (
                            <MenuItem key={q.id} hint={t(q.txt)} onClick={() => swapPick(id, q.id)}>
                              {t(q.name)}
                            </MenuItem>
                          ))}
                          {spare.length > 0 && <MenuSeparator />}
                          <MenuItem icon={<Trash />} onClick={() => dropPick(id)}>
                            {t("Entfernen")}
                          </MenuItem>
                          {picksChanged && (
                            <MenuItem icon={<RotateCcw />} onClick={() => setShownPicks(null)}>
                              {t("Vorschläge wie anfangs")}
                            </MenuItem>
                          )}
                        </>
                      }
                    >
                      <Tile
                        img={tileImg}
                        edit={sugg.picks[id]}
                        name={t(p.name)}
                        txt={t(p.txt)}
                        pressed={edit.origin === "pick" && edit.pick === id}
                        disabled={!me}
                        onClick={() => me && act((e) => pickEdit(me, id, e), true)}
                      />
                    </ContextMenu>
                  );
                })}
                {spare.length > 0 && (
                  <Menu
                    container={dialog}
                    align="start"
                    trigger={
                      <button type="button" className="group flex min-w-0 flex-col gap-1 text-left">
                        <span className="border-ink/25 text-ink-2 group-hover:border-ink/45 group-hover:text-ink grid aspect-[4/5] w-full place-items-center border border-dashed transition-colors duration-150">
                          <Plus aria-hidden className="size-6" strokeWidth={1.5} />
                        </span>
                        <b className="text-sm font-semibold max-sm:text-xs">{t("Weitere")}</b>
                        <small className="text-ink-2 line-clamp-2 min-h-[2lh] text-xs leading-snug max-sm:hidden">{t("Vorschläge dazuholen, lange drücken tauscht")}</small>
                      </button>
                    }
                  >
                    <MenuLabel>{t("Dazuholen")}</MenuLabel>
                    {spare.map((q) => (
                      <MenuItem key={q.id} hint={t(q.txt)} onClick={() => setShownPicks([...shownPicks, q.id])}>
                        {t(q.name)}
                      </MenuItem>
                    ))}
                    {picksChanged && (
                      <>
                        <MenuSeparator />
                        <MenuItem icon={<RotateCcw />} onClick={() => setShownPicks(null)}>
                          {t("Vorschläge wie anfangs")}
                        </MenuItem>
                      </>
                    )}
                  </Menu>
                )}
                {!onFinish && (
                <Tile
                  img={tileImg}
                  edit={sugg.match}
                  name={t("Angleichen")}
                  txt={others.length ? t("an die Nachbarfotos") : t("braucht ein zweites Foto auf der Seite")}
                  pressed={edit.origin === "match"}
                  disabled={!me || !otherStats.length}
                  onClick={() => me && act((e) => ({ ...e, transfer: matchTransfer(me, otherStats), levels: null, origin: "match", moodFrom: undefined }))}
                />
                )}
                {!onFinish && (
                <Tile
                  img={tileImg}
                  edit={sugg.mood}
                  name={t("Stimmung übernehmen")}
                  txt={moodSrc ? t("vom {name}", { name: nameOf(moodSrc) }) : t("braucht ein zweites Foto auf der Seite")}
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
                )}
              </div>
            )}
            {tab === "s" && (
              <div className="mt-7">
                {!mine && (
                  <>
                    <h3 className={groupTitle}>{t("Deine Looks")}</h3>
                    <p className="text-ink-2 text-sm">{t("Noch keine. Stell ein Foto ein, wie es dir gefällt, und speichere es als Look für alle Fotos und Bücher.")}</p>
                  </>
                )}
                {naming === true ? (
                  saveForm
                ) : (
                  <div className={`flex flex-wrap gap-2 ${mine ? "" : "mt-3.5"}`}>
                    <Button variant="paper" size="sm" className="pl-2.5" onClick={() => setNaming(true)} disabled={colorIsNeutral(edit)}>
                      <BookmarkPlus aria-hidden />
                      {t("Als eigenen Look speichern")}
                    </Button>
                    {/* im Buch liegen alle Looks schon unter „In diesem Buch“; mitnehmen braucht es nur ohne Buch */}
                    {!inBook && (
                      <Button variant="paper" size="sm" className="pl-2.5" onClick={copyEdit} disabled={colorIsNeutral(edit)} title={t("Farbe und Licht ohne Zuschnitt, für die anderen Fotos, ⇧⌘C")}>
                        <ClipboardCopy aria-hidden />
                        {t("Für andere Fotos mitnehmen")}
                      </Button>
                    )}
                    {fileSettings && (
                      <Button variant="paper" size="sm" className="pl-2.5" onClick={copyFile} title={t("für andere Fotos und Bücher, in Calima nachempfunden")}>
                        <ClipboardCopy aria-hidden />
                        {fileFuji ? t("Fuji-Rezept mitnehmen") : t("Lightroom-Werte mitnehmen")}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {tab === "l" && (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(92px,1fr))] sm:gap-2.5 lg:grid-cols-3 lg:gap-y-5">
                <Tile img={tileImg} edit={{ ...edit, look: null }} name={t("Ohne Look")} txt={t("nimmt den Look weg")} pressed={!edit.look} onClick={() => edit.look && act((e) => ({ ...e, look: null }))} />
                {LOOKS.map((L) => (
                  <Tile
                    key={L.id}
                    img={tileImg}
                    edit={{ ...edit, look: L.id, amount: 0.8 }}
                    name={t(L.name)}
                    txt={t(L.txt)}
                    pressed={edit.look === L.id}
                    onClick={() => act((e) => (e.look === L.id ? { ...e, look: null } : { ...e, look: L.id, amount: 0.8 }), true)}
                  />
                ))}
                {edit.look && (
                  <div className="slip col-span-full sticky -bottom-4 z-[2] -mx-4 mt-1 border-t border-ink/10 px-4 pt-3 pb-2 lg:-bottom-5 lg:-mx-5 lg:px-5">
                    <Slider
                      id="dv-amount"
                      label={t("Stärke {name}", { name: t(lookOf(edit.look)?.name ?? "") })}
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
                    label={t(name)}
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
            {tab === "f" &&
              (() => {
                const m = edit.more ?? MORE0();
                const shownGroups = GROUPS.filter(([g]) => groups.includes(g) || groupNote(edit.more, g, t));
                const offered = GROUPS.filter(([g]) => g !== "curve" || desk || shownGroups.some(([x]) => x === g));
                const pick = (g: Group) => {
                  const changed = !!groupNote(edit.more, g, t);
                  if (groups.includes(g) && !changed) return keepGroups(groups.filter((x) => x !== g));
                  if (!groups.includes(g)) keepGroups([...groups, g]);
                  setFolded((f) => f.filter((x) => x !== g));
                  // nach dem Aufklappen zur Gruppe rollen
                  requestAnimationFrame(() => document.getElementById(`dv-g-${g}`)?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" }));
                };
                const slider = (k: (typeof MORE_SLIDERS)[number][0], name: string) => (
                  <Slider key={k} id={`dv-m-${k}`} label={t(name)} value={m[k]} min={-1} max={1} step={0.01} zero={0} format={signed100} onChange={(v) => liveMore(() => ({ [k]: v }))} />
                );
                return (
                  <div className="mt-5 grid gap-3 lg:mt-6">
                    {shownGroups.map(([g, name]) => {
                      const note = groupNote(edit.more, g, t);
                      const open = !folded.includes(g);
                      return (
                        <section key={g} id={`dv-g-${g}`} aria-label={t(name)} className="border-ink/12 border-t pt-2.5">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              aria-expanded={open}
                              aria-controls={`dv-gb-${g}`}
                              onClick={() => setFolded((f) => (open ? [...f, g] : f.filter((x) => x !== g)))}
                              className="hover:bg-ink/6 -ml-2 flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-full px-2 text-left text-[15px] font-bold tracking-[-0.01em]"
                            >
                              <ChevronDown aria-hidden className={`size-4 flex-none transition-transform duration-150 ${open ? "" : "-rotate-90"}`} />
                              <span aria-hidden className={`size-2 flex-none rounded-full border-[1.5px] ${note ? "border-ink bg-mark" : "border-ink-2"}`} />
                              <span className="truncate">{t(name)}</span>
                              {!open && note && <span className="text-ink-2 ml-auto truncate text-xs font-normal">{note}</span>}
                            </button>
                            {!note && (
                              <IconButton label={t("{name} schließen", { name: t(name) })} variant="paper" onClick={() => keepGroups(groups.filter((x) => x !== g))} className="!bg-transparent">
                                <X aria-hidden />
                              </IconButton>
                            )}
                          </div>
                          <div id={`dv-gb-${g}`} hidden={!open} className="grid gap-x-[22px] gap-y-2.5 pt-1 pb-2 sm:grid-cols-2 lg:grid-cols-1 lg:gap-y-4">
                            {g === "curve" ? (
                              <div className="grid gap-2.5 sm:col-span-2 lg:col-span-1">
                                <CurvePad points={m.curve} hist={curveHist} onStart={burst} onChange={(c) => liveMore(() => ({ curve: c }))} />
                                <div role="group" aria-label={t("Vorlagen")} className="flex flex-wrap gap-1.5">
                                  {CURVES.map(([name, c]) => (
                                    <button
                                      key={name}
                                      type="button"
                                      aria-pressed={JSON.stringify(c) === JSON.stringify(m.curve)}
                                      onClick={() => {
                                        remember();
                                        fade();
                                        setEdit((e) => {
                                          const next = { ...(e.more ?? MORE0()), curve: c };
                                          return { ...e, more: moreIsNeutral(next) ? undefined : next };
                                        });
                                      }}
                                      className={chip(JSON.stringify(c) === JSON.stringify(m.curve))}
                                    >
                                      {t(name)}
                                    </button>
                                  ))}
                                </div>
                                <p className="text-ink-2 text-xs">{t("Auf die Fläche klicken setzt einen Punkt. Aus der Fläche ziehen oder doppelklicken nimmt ihn weg.")}</p>
                              </div>
                            ) : g === "hsl" ? (
                              <div className="grid gap-2.5 sm:col-span-2 lg:col-span-1">
                                <Swatches
                                  label={`${t(HUES[hue][0])}: ${t(HUES[hue][3])}`}
                                  items={HUES.map(([n, , color], i) => ({ id: String(i), label: n, color, ink: "var(--paper)" }))}
                                  value={String(hue)}
                                  onChange={(id) => setHue(Number(id))}
                                />
                                {[de("Farbton"), de("Sättigung"), de("Helligkeit")].map((label, j) => (
                                  <Slider
                                    key={label}
                                    id={`dv-hsl-${j}`}
                                    label={t(label)}
                                    value={m.hsl[hue][j]}
                                    min={-1}
                                    max={1}
                                    step={0.01}
                                    zero={0}
                                    format={signed100}
                                    onChange={(v) => liveMore((x) => ({ hsl: x.hsl.map((t, i) => (i === hue ? (t.map((y, jj) => (jj === j ? v : y)) as [number, number, number]) : t)) }))}
                                  />
                                ))}
                              </div>
                            ) : (
                              MORE_SLIDERS.filter(([, , grp]) => grp === g).map(([k, label]) => slider(k, label))
                            )}
                          </div>
                        </section>
                      );
                    })}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Menu
                        align="start"
                        container={dialog}
                        trigger={
                          <button type="button" className={buttonClass("paper", "sm", "pl-3")}>
                            {t("Mehr Werkzeuge")}
                            <ChevronDown aria-hidden />
                          </button>
                        }
                      >
                        {offered.map(([g, name, txt, Icon]) => (
                          <MenuItem key={g} icon={<Icon />} hint={t(txt)} checked={shownGroups.some(([x]) => x === g)} onClick={() => pick(g)}>
                            {t(name)}
                          </MenuItem>
                        ))}
                      </Menu>
                      <span className="text-ink-2 text-xs">{shownGroups.length ? t("{n} von {m} offen", { n: shownGroups.length, m: offered.length }) : desk ? t("Lichter, Klarheit, Farben, Vignette, Kurve") : t("Lichter, Klarheit, Farben, Vignette")}</span>
                    </div>
                  </div>
                );
              })()}

            {tab === "r" && (
              <div className="grid gap-x-7 gap-y-4 sm:grid-cols-2 lg:grid-cols-1 lg:gap-y-7">
                <div className="sm:col-span-2 lg:col-span-1">
                  <h3 className={groupTitle}>
                    <label htmlFor="dv-preset">{t("Rezept")}</label>
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <Menu
                      align="start"
                      container={dialog}
                      trigger={
                        <button type="button" id="dv-preset" className={`${fieldClass} flex min-w-0 flex-[1_1_200px] items-center justify-between gap-2 text-left`}>
                          <span className="truncate">{recEmpty ? t("Ohne Rezept") : recLabel}</span>
                          <ChevronDown aria-hidden className="size-4 flex-none" />
                        </button>
                      }
                    >
                      {[{ id: "", name: de("Ohne Rezept"), txt: "" }, ...PRESETS].map((r) => (
                        <MenuItem key={r.id} icon={<Check className={(r.id ? recMatch?.id === r.id : recEmpty) ? "" : "invisible"} />} onClick={() => pickRecipe(r.id)}>
                          <span>
                            {t(r.name)}
                            {r.txt && <span className="text-ink-2"> · {t(r.txt)}</span>}
                          </span>
                        </MenuItem>
                      ))}
                      {own.length > 0 && <MenuSeparator />}
                      {own.map((r) => (
                        <MenuItem key={r.id} icon={<Check className={recMatch?.id === r.id ? "" : "invisible"} />} onClick={() => pickRecipe(r.id)}>
                          {r.name}
                        </MenuItem>
                      ))}
                      <MenuSeparator />
                      <MenuItem icon={<BookmarkPlus />} onClick={() => pickRecipe("save")}>
                        {t("Als eigenen Look speichern …")}
                      </MenuItem>
                    </Menu>
                    {recMatch && own.some((r) => r.id === recMatch.id) && (
                      <button
                        type="button"
                        className="text-danger hover:bg-danger/8 flex min-h-9 items-center gap-2 rounded-full px-2.5 text-sm font-semibold pointer-coarse:min-h-11"
                        onClick={() => askDelete(recMatch)}
                      >
                        <Trash aria-hidden className="size-4" />
                        {t("Löschen")}
                      </button>
                    )}
                  </div>
                  {saveForm}
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <Chips<RecipeValues["film"]>
                    label={t("Filmlook")}
                    opts={[[null, de("Ohne")], ...LOOKS.map((L) => [L.id, L.name] as [RecipeValues["film"], string])]}
                    cur={edit.rec.film}
                    onPick={(v) => setRec(() => ({ film: v }), true)}
                  />
                </div>
                <WbPad r={edit.rec.wbR} b={edit.rec.wbB} onChange={(wbR, wbB) => liveRec({ wbR, wbB })} />
                <div className="grid content-start gap-2.5 lg:gap-4">
                  <h3 className={groupTitle}>{t("Ton und Farbe")}</h3>
                  {(
                    [
                      ["hl", de("Lichter"), -2, 4, 0.5],
                      ["sh", de("Schatten"), -2, 4, 0.5],
                      ["color", de("Farbe"), -4, 4, 1],
                    ] as const
                  ).map(([k, name, min, max, step]) => (
                    <Slider key={k} id={`dv-rc-${k}`} label={t(name)} value={edit.rec[k]} min={min} max={max} step={step} zero={0} format={signedStep} onChange={(v) => liveRec({ [k]: v })} />
                  ))}
                </div>
                <Chips<RecipeValues["dr"]>
                  label={t("Dynamikbereich")}
                  opts={[
                    [100, "DR100"],
                    [200, "DR200"],
                    [400, "DR400"],
                  ]}
                  cur={edit.rec.dr}
                  onPick={(v) => setRec(() => ({ dr: v }))}
                />
                <Chips<RecipeValues["cc"]> label="Color Chrome" opts={LEVEL} cur={edit.rec.cc} onPick={(v) => setRec(() => ({ cc: v }))} />
                <Chips<RecipeValues["fxb"]> label={t("Color Chrome FX Blau")} opts={LEVEL} cur={edit.rec.fxb} onPick={(v) => setRec(() => ({ fxb: v }))} />
                <div className="grid gap-1.5">
                  <Chips<RecipeValues["grain"]> label={t("Körnung")} opts={LEVEL} cur={edit.rec.grain} onPick={(v) => setRec(() => ({ grain: v }))} />
                  <Chips<RecipeValues["gsize"]>
                    label={t("Korngröße")}
                    opts={[
                      ["klein", de("Klein")],
                      ["groß", de("Groß")],
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

function SaveForm({ onSave, onCancel, initial = "", label }: { onSave: (name: string) => void; onCancel: () => void; initial?: string; label?: string }): ReactNode {
  const t = useT();
  const [name, setName] = useState(initial);
  return (
    <form
      className="mt-2.5 grid gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        const n = name.trim();
        if (n) onSave(n);
      }}
    >
      <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
        <Field label={label ?? t("Name für deinen Look")} autoFocus maxLength={40} required value={name} onChange={(e) => setName(e.target.value)} className="min-w-0 flex-[1_1_220px]" />
        <div className="flex gap-2">
          <button type="submit" className={buttonClass("ink", "sm")}>
            {t("Speichern")}
          </button>
          <button type="button" onClick={onCancel} className={buttonClass("paper", "sm")}>
            {t("Abbrechen")}
          </button>
        </div>
      </div>
    </form>
  );
}
