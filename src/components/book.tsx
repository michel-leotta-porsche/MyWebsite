"use client";

import {
  animate,
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { ChevronLeft, Pencil, ScrollText } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { pageNos, plateName, plateOf, type BookData, type Page } from "@/content/books";
import { headPlates } from "@/content/layout";
import { useT } from "@/lib/i18n";
import { cameraOf, hasSlip, recipeOf } from "@/content/recipes";
import { createCurlStore, PageCurl, type CurlStore } from "@/components/page-curl";
import { JumpContext, PageView } from "@/components/page-view";
import { PlateOpenProvider, PlateViewer } from "@/components/plate-viewer";
import { RecipeSlip } from "@/components/recipe-slip";
import { SunAndShade } from "@/components/sun-and-shade";
import { buttonClass } from "@/components/ui/button-class";
import { haptic } from "@/lib/haptics";
import { atBookEnd } from "@/lib/sample-book";

export type Mode = "spread" | "single";
export type Leaf = { front: Page; back: Page };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
// Ein Blatt beschleunigt aus dem Liegen und setzt weich auf: ease-in-out
const turnEase = (s: number) => (s < 0.5 ? 4 * s * s * s : 1 - Math.pow(-2 * s + 2, 3) / 2);
// Umkehrung für das Wischen: zu einem Winkel den passenden Fortschritt finden
const invTurnEase = (y: number) => {
  let lo = 0;
  let hi = 1;
  for (let n = 0; n < 24; n++) {
    const mid = (lo + hi) / 2;
    if (turnEase(mid) < y) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};
// Nur so viele Blätter um die aufgeschlagene Seite tragen Bilder
export const WINDOW = 2;
// Nach dem letzten Blatt: so viele Schritte Scrollweg, auf denen sich das Buch zurück auf den Tisch legt
const OUTRO = 0.9;

export function buildLeaves(book: BookData, mode: Mode): { leaves: Leaf[]; base: Page } {
  if (mode === "spread") {
    const { spreads } = book;
    const leaves: Leaf[] = [{ front: { kind: "cover" }, back: spreads[0].left }];
    for (let k = 0; k < spreads.length - 1; k++) leaves.push({ front: spreads[k].right, back: spreads[k + 1].left });
    return { leaves, base: spreads[spreads.length - 1].right };
  }
  const pages = book.singlePages;
  return {
    leaves: pages.slice(0, -1).map((front) => ({ front, back: { kind: "verso" } })),
    base: pages[pages.length - 1],
  };
}

/** Sichtbare Seiten, wenn k Blätter umgeschlagen sind */
export function pagesAt(book: BookData, mode: Mode, k: number): Page[] {
  if (k === 0) return [{ kind: "cover" }];
  if (mode === "spread") {
    const s = book.spreads[k - 1];
    return s ? [s.left, s.right] : [];
  }
  const p = book.singlePages[k];
  return p ? [p] : [];
}
export const platesOn = (pages: Page[]) => [...new Set(pages.flatMap(pageNos))];

function labelAt(book: BookData, mode: Mode, k: number, t: Tr): string {
  if (k === 0) return t("Einband");
  const pages = pagesAt(book, mode, k);
  const ps = platesOn(pages);
  if (ps.length === 0) {
    if (pages.some((p) => p.kind === "title")) return t("Titel");
    if (pages.some((p) => p.kind === "index")) return t("Verzeichnis");
    return t("Kolophon");
  }
  return ps.length > 1 ? t("Tafel {from}–{to}", { from: ps[0], to: ps[ps.length - 1] }) : t("Tafel {no}", { no: ps[0] });
}

type Tr = ReturnType<typeof useT>;

type SideCaption = { side: "left" | "right"; plates: { no: number; title: string; name: string; slip: string | null }[] };

/**
 * Je aufgeschlagener Seite: Titel der randlosen Tafeln (sie tragen keine Unterschrift auf der Seite) und
 * welcher Zettel zu einem Foto gehört (Rezept aus Fuji-Daten oder Lightroom-Preset, Kamera, Bearbeitung).
 */
function sideCaptions(book: BookData, mode: Mode, k: number, t: Tr): SideCaption[] {
  const pages = pagesAt(book, mode, k);
  const names = pages.length === 2 ? (["left", "right"] as const) : (["right"] as const);
  return pages.map((page, i) => {
    const side = names[i] ?? "right";
    const heads = new Set(headPlates(book, page, side));
    const plates = pageNos(page).map((no) => {
      const p = plateOf(book, no);
      const slip = !hasSlip(p) ? null : recipeOf(p) ? t("Rezept") : cameraOf(p) ? t("Kamera") : t("Bearbeitung");
      return { no, title: heads.has(no) ? p.title : "", name: p.title, slip };
    });
    return { side, plates: plates.filter((pl) => pl.title || pl.slip) };
  });
}

const noopSubscribe = () => () => {};

// Ferne Blätter: nur der Farbton der Seite, ohne Bild und Text
export function Blank({ book, page }: { book: BookData; page: Page }) {
  const bg = page.kind === "cover" ? book.cloth.base : page.kind === "endpaper" ? book.cloth.deep : undefined;
  return <div className={`absolute inset-0 ${bg ? "" : "bg-paper"}`} style={{ backgroundColor: bg }} />;
}

export function LeafView({
  book,
  leaf,
  i,
  count,
  t,
  mode,
  k,
  curl,
}: {
  book: BookData;
  leaf: Leaf;
  i: number;
  count: number;
  t: MotionValue<number>;
  mode: Mode;
  k: number;
  curl: CurlStore;
}) {
  const rot = useTransform(t, (tv) => -180 * turnEase(clamp01(tv - i)));
  const transform = useMotionTemplate`perspective(2600px) rotateY(${rot}deg)`;
  // Flacher Stapel statt 3D-Kontext: Reihenfolge per z-index, kein Flackern
  const zIndex = useTransform(rot, (r) => (r > -90 ? count - i : i + 1));
  // Licht: die Vorderseite dunkelt beim Aufrichten, die Rückseite hellt beim Ablegen
  const frontShade = useTransform(rot, [0, -90], [0, 0.42]);
  const backShade = useTransform(rot, [-90, -180], [0.42, 0]);
  // Auf dem Telefon verschwindet die Rückseite nach links aus dem Bild
  const backOpacity = useTransform(rot, [-172, -180], [1, mode === "single" ? 0 : 1]);
  const near = Math.abs(i - k) <= WINDOW;

  // Bewegt sich das Blatt und hat WebGL seine Textur, zeichnet WebGL es gebogen; das HTML-Blatt tritt zurück
  const turningNow = (tv: number) => tv - i > 0.004 && tv - i < 0.996;
  const [turning, setTurning] = useState(() => turningNow(t.get()));
  useMotionValueEvent(t, "change", (tv) => {
    const on = turningNow(tv);
    if (on !== turning) setTurning(on);
  });
  const glReady = useSyncExternalStore(curl.subscribe, () => curl.has(i), () => false);
  const viaGL = turning && glReady;

  // Ferne Blätter liegen verdeckt im Stapel. Jedes 3D-Blatt ist für Safari eine eigene Zeichenfläche in voller
  // Seitengröße (bei 3-facher Pixeldichte etwa 7 MB je Seite); mit allen Blättern im DOM waren es bei einem
  // Buch mit 45 Blättern über 600 MB, und Safari beendete den Tab gleich nach dem Aufschlagen.
  if (!near) return null;

  return (
    <motion.div
      className={`absolute inset-y-0 origin-left [transform-style:preserve-3d] ${turning && !viaGL ? "will-change-transform" : ""}`}
      style={{
        transform,
        visibility: viaGL ? "hidden" : undefined,
        zIndex,
        left: mode === "spread" ? "50%" : 0,
        width: mode === "spread" ? "50%" : "100%",
        // der geschlossene Einband fliegt beim Öffnen vom Tisch hierher (View Transition);
        // nur solange er zu ist, sonst flacht der Name das 3D-Blatt ab und die Rückseite verschwindet
        viewTransitionName: i === 0 && k === 0 ? `cover-${book.id}` : undefined,
      }}
    >
      {/* verdeckte Seiten sind für Tastatur und Screenreader nicht da */}
      <div className="absolute inset-0 overflow-hidden [backface-visibility:hidden]" inert={k !== i}>
        <PageView book={book} page={leaf.front} side="right" eager={i === 0} />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-30 bg-[linear-gradient(to_right,rgb(12_10_8/0.55),rgb(12_10_8/0.15))]"
          style={{ opacity: frontShade }}
        />
      </div>
      <motion.div
        className="absolute inset-0 overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)]"
        style={{ opacity: backOpacity }}
        inert={k !== i + 1 || mode === "single"}
      >
        <PageView book={book} page={leaf.back} side="left" />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-30 bg-[linear-gradient(to_left,rgb(12_10_8/0.55),rgb(12_10_8/0.15))]"
          style={{ opacity: backShade }}
        />
      </motion.div>
    </motion.div>
  );
}

/** Eselsohr: die Ecke klappt um, darunter liegt die nächste Seite */
function Curl({ side, amount, flap }: { side: "left" | "right"; amount: MotionValue<number>; flap: string }) {
  const right = side === "right";
  const transform = useMotionTemplate`scale(${amount})`;
  const dir = right ? "to bottom right" : "to bottom left";
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute bottom-0 z-[150] aspect-square w-[24%] max-w-[150px]"
      style={{
        transform,
        [right ? "right" : "left"]: 0,
        transformOrigin: right ? "bottom right" : "bottom left",
        ["--flap" as string]: flap,
      }}
    >
      {/* Loch: die Seite darunter, im Schatten der Falte */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: right ? "polygon(100% 0, 100% 100%, 0 100%)" : "polygon(0 0, 100% 100%, 0 100%)",
          background: `linear-gradient(${dir}, rgb(12 10 8 / 0.28) 50%, var(--paper-shade) 66%, var(--paper) 100%)`,
        }}
      />
      {/* Lasche: Rückseite des Blatts, zur Falte hin aufgehellt */}
      <div className="absolute inset-0 [filter:drop-shadow(-3px_-3px_5px_rgb(12_10_8/0.28))]">
        <div
          className="absolute inset-0"
          style={{
            clipPath: right ? "polygon(0 0, 100% 0, 0 100%)" : "polygon(0 0, 100% 0, 100% 100%)",
            background: `linear-gradient(${dir}, color-mix(in oklab, var(--flap) 82%, rgb(12 10 8)) 0%, var(--flap) 34%, color-mix(in oklab, var(--flap) 70%, white) 49%, var(--flap) 50%)`,
          }}
        />
      </div>
    </motion.div>
  );
}

/** Eselsohr: die obere Außenecke knickt mit einer Feder um und bleibt so; beim Umblättern tritt es zurück */
function Ear({ side, resting, reduce }: { side: "left" | "right"; resting: MotionValue<number>; reduce: boolean }) {
  const right = side === "right";
  const dir = right ? "to bottom left" : "to bottom right";
  return (
    <motion.div
      aria-hidden
      className="absolute top-0 aspect-square w-[16%] max-w-[96px]"
      style={{ [right ? "right" : "left"]: 0, transformOrigin: right ? "top right" : "top left" }}
      initial={reduce ? false : { scale: 0.9, opacity: 0, rotate: right ? 8 : -8 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      exit={reduce ? { opacity: 0 } : { scale: 0.9, opacity: 0 }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 17, mass: 0.8, opacity: { duration: 0.15, ease: "easeOut" } }}
    >
      {/* innen, damit das Einblenden die Ruhe-Deckkraft beim Umblättern nicht überschreibt */}
      <motion.div className="absolute inset-0" style={{ opacity: resting }}>
        {/* Loch: darunter liegt die nächste Seite im Schatten der Falte */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: right ? "polygon(0 0, 100% 0, 100% 100%)" : "polygon(0 0, 100% 0, 0 100%)",
            background: `linear-gradient(${dir}, var(--paper) 0%, var(--paper-shade) 34%, rgb(12 10 8 / 0.3) 50%)`,
          }}
        />
        {/* Lasche: Rückseite des Blatts, liegt auf der Seite und wirft einen kleinen Schatten */}
        <div className="absolute inset-0 [filter:drop-shadow(-2px_3px_4px_rgb(12_10_8/0.35))]">
          <div
            className="absolute inset-0"
            style={{
              clipPath: right ? "polygon(0 0, 100% 100%, 0 100%)" : "polygon(100% 0, 100% 100%, 0 100%)",
              background: `linear-gradient(${right ? "to top right" : "to top left"}, var(--paper) 50%, color-mix(in oklab, var(--paper) 70%, white) 51%, var(--paper-shade) 100%)`,
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Wechselnder Text: neue Werte rollen von unten herein */
export function RollingLabel({ text, reduce }: { text: string; reduce: boolean }) {
  return (
    <span className="relative inline-flex overflow-hidden align-bottom">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={text}
          className="inline-block whitespace-nowrap"
          initial={reduce ? { opacity: 0 } : { y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: "-100%", opacity: 0 }}
          transition={{ duration: reduce ? 0.12 : 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          {text || " "}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * Seitenbreite in CSS: Doppelseite oder Einzelseite, nach Seitenformat und Buchgröße.
 * Gemessen an der Bühne (Size-Container), nicht am Fenster: ein höherer Kopf (große Schrift) oder
 * ein Telefon quer lassen dem Buch genau den Platz, der übrig ist.
 */
export function pageWidth(book: BookData, mode: Mode) {
  const a = book.aspect;
  return mode === "spread"
    ? `calc(min(calc((100cqw - 16px) / 2), calc((100cqh - 40px) / ${a}), 640px) * ${book.scale})`
    : `min(100cqw, calc((100cqh - 12px) / ${a}))`;
}

const SWIPED = "fuji:swiped";
// so lange (ms) liegt der Finger still, bis langes Drücken in die Werkbank führt
const LONG_PRESS = 480;

type Pt = { x: number; y: number; time: number };
/** Stelle auf einer Tafel: x und y von 0 bis 1 über das Foto */
export type Spot = { no: number; x: number; y: number };
/** Etwas, das an einer Stelle im Foto hängt (Zettel, Marker); Book setzt es nur an seinen Platz */
export type Pinned = Spot & { key: string; node: React.ReactNode };
// so groß (px) ist die Ecke, in der langes Drücken ein Eselsohr knickt
const CORNER = 56;
// Klicks und Fingertipps in diesen Elementen gehören nicht dem Buch (Zettel, Marker)
const OWN = "[data-own-gesture]";
const pointOf = (e: { clientX: number; clientY: number; timeStamp: number }): Pt => ({ x: e.clientX, y: e.clientY, time: e.timeStamp });

export function Book({
  book,
  mode,
  autoOpen,
  startPlate,
  onClose,
  extra,
  ears,
  onEar,
  onEdit,
  onPin,
  pins,
  end,
  backLabel,
}: {
  book: BookData;
  mode: Mode;
  /** Einband nach dem Hinlegen von selbst aufschlagen */
  autoOpen: boolean;
  /** statt beim Titel gleich an dieser Tafel aufschlagen */
  startPlate?: number;
  /** Buch zurück auf den Tisch legen */
  onClose: () => void;
  /** Zusätzliche Knöpfe in der Kopfzeile, z. B. Zettel schreiben */
  extra?: (book: BookData, plates: number[]) => React.ReactNode;
  /** Tafeln mit Eselsohr: die obere Außenecke ist umgeknickt */
  ears?: number[];
  /** Ecke gedrückt halten knickt ein Eselsohr (Tastatur: Enter auf der Ecke) */
  onEar?: (no: number) => void;
  /** Nur in fremden Büchern: langes Drücken aufs Foto heftet dort etwas an */
  onPin?: (spot: Spot) => void;
  /** Was an Stellen im Foto hängt */
  pins?: Pinned[];
  /** Nur im eigenen Buch: in die Werkbank, an die aufgeschlagene Stelle (step wie k: 0 Einband, 1 Titel, …) */
  onEdit?: (step: number) => void;
  /** Leise unter dem Buch, sobald die letzte Doppelseite oder der Rückdeckel aufliegt (z. B. der Weg zum eigenen Buch) */
  end?: React.ReactNode;
  /** Statt „Calima“ oben links, wo der Name nicht als Weg zurück erkannt wird (Besucher der Landing) */
  backLabel?: string;
}) {
  const { leaves, base } = useMemo(() => buildLeaves(book, mode), [book, mode]);
  const curl = useMemo(() => createCurlStore(), []);
  // ?ohne=biegung: flach umblättern wie früher (auf dem Server und beim Hydrieren immer aus)
  const bend = useSyncExternalStore(
    noopSubscribe,
    () => !document.documentElement.classList.contains("ohne-biegung"),
    () => false,
  );
  const count = leaves.length;
  const swipe = mode === "single";
  const reduce = useReducedMotion() ?? false;
  const nPlates = book.plates.length;
  const t = useT();

  const track = useRef<HTMLElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const stops = useRef<(HTMLDivElement | null)[]>([]);

  // Antrieb Doppelseite: Scrollposition. Antrieb Telefon: Finger.
  const span = count + (swipe ? 0 : OUTRO);
  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });
  const raw = useTransform(scrollYProgress, (p) => p * span);
  const sprung = useSpring(raw, { stiffness: 150, damping: 26, mass: 0.7 });
  const stepped = useTransform(raw, (v) => Math.min(count, Math.round(v)));
  const finger = useMotionValue(0);
  const turn = swipe ? finger : reduce ? stepped : sprung;

  const curlR = useSpring(0, { stiffness: 420, damping: 30 });
  const curlL = useSpring(0, { stiffness: 420, damping: 30 });
  const hoverable = useRef(false);

  // k: Zielseite (für Tastatur und Knöpfe); kt: was gerade sichtbar aufgeschlagen ist
  const [k, setK] = useState(0);
  const [kt, setKt] = useState(0);
  useMotionValueEvent(raw, "change", (v) => !swipe && setK(Math.min(count, Math.round(v))));
  useMotionValueEvent(turn, "change", (v) => {
    const r = Math.min(count, Math.round(v));
    setKt(r);
    if (swipe) setK(r);
  });

  // Nach dem Kolophon weiterscrollen: das Buch klappt zu und legt sich zurück auf den Tisch
  const outro = useTransform(turn, (v) => clamp01((v - count) / OUTRO));
  const closed = useRef(false);
  useMotionValueEvent(outro, "change", (o) => {
    if (o > 0.82 && !closed.current) {
      closed.current = true;
      onClose();
    }
  });

  // Eselsohr nur, wenn das Buch ruhig aufgeschlagen liegt
  const resting = useTransform<number, number>(turn, (v) => (Math.abs(v - Math.round(v)) < 0.03 && v <= count ? 1 : 0));
  const curlRight = useTransform<number, number>([curlR, resting], ([c, r]) => c * r);
  const curlLeft = useTransform<number, number>([curlL, resting], ([c, r]) => c * r);

  // Geschlossen liegt das Buch flach und rechts versetzt; beim Öffnen richtet es sich auf
  const open = useTransform(turn, (v) => clamp01(v));
  const shift = useTransform(open, (o) => (mode === "spread" ? -25 * (1 - o) : 0));
  const tilt = useTransform<number, number>([open, outro], ([o, x]) => 16 - 12 * o + 14 * x);
  const lift = useTransform<number, number>([open, outro], ([o, x]) => (0.94 + 0.06 * o) * (1 - 0.18 * x));
  const sink = useTransform(outro, (x) => 22 * x * x);
  const bookTransform = useMotionTemplate`perspective(1800px) translateY(${sink}vh) rotateX(${tilt}deg) translateX(${shift}%) scale(${lift})`;
  const bookOpacity = useTransform(outro, [0.4, 1], [1, 0]);

  // Papierkanten: rechts schrumpft der Stapel, links wächst er
  const rightEdge = useTransform(turn, (v) => clamp01((count - v) / count));
  const leftEdge = useTransform(turn, (v) => clamp01((v - 1) / count));
  const rightEdgeT = useMotionTemplate`scaleX(${rightEdge})`;
  const leftEdgeT = useMotionTemplate`scaleX(${leftEdge})`;
  const rightFootT = useMotionTemplate`scaleY(${rightEdge})`;
  const leftFootT = useMotionTemplate`scaleY(${leftEdge})`;
  const edgeW = Math.round(3 + count / 4);
  // Wölbung der Seiten nur, solange das Buch ruhig offen liegt: beim Umblättern zeichnet WebGL das Licht
  const still = useTransform<number, number>([turn, outro], ([v, x]) =>
    v < 0.5 ? 0 : clamp01(1 - Math.abs(v - Math.round(v)) * 12) * (1 - x),
  );

  const range = Array.from({ length: count + 1 }, (_, s) => s);

  // Fahrplan-Linie: Position in der Bildfolge 0..1
  const progressAt = (step: number) => {
    const ps = platesOn(pagesAt(book, mode, step));
    if (ps.length) return (ps.reduce((a, b) => a + b, 0) / ps.length - 1) / Math.max(1, nPlates - 1);
    return step <= 1 ? 0 : 1;
  };
  const fill = useTransform(turn, range, range.map(progressAt));
  const fillT = useMotionTemplate`scaleX(${fill})`;

  // Hinweis zum Blättern: verschwindet nach dem ersten eigenen Umblättern und kommt in dieser Sitzung nicht wieder.
  // Das Aufschlagen des Einbands läuft vom Tisch aus von selbst, deshalb zählt erst das Blatt danach.
  const seen = useSyncExternalStore(
    noopSubscribe,
    () => {
      try {
        return sessionStorage.getItem(SWIPED) === "1";
      } catch {
        return false;
      }
    },
    () => true,
  );
  const [turned, setTurned] = useState(false);
  useMotionValueEvent(turn, "change", (v) => {
    if (turned || v < 1.9) return;
    setTurned(true);
    try {
      sessionStorage.setItem(SWIPED, "1");
    } catch {}
  });
  const hinted = seen || turned;

  // Nach dem Aufschlagen steht der Fokus im Buch, nicht auf body (Pfeiltasten, Tab zur Bildfolge)
  useEffect(() => {
    track.current?.focus({ preventScroll: true });
  }, []);

  const goTo = useCallback(
    (step: number, instant = false) => {
      const target = Math.max(0, Math.min(count, step));
      if (swipe) {
        if (reduce || instant) finger.set(target);
        else animate(finger, target, { type: "spring", stiffness: 170, damping: 24 });
        return;
      }
      const el = stops.current[target];
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top, behavior: reduce || instant ? "auto" : "smooth" });
    },
    [count, finger, reduce, swipe],
  );
  // Scrollposition zu einem beliebigen Fortschritt, z. B. halb umgeblättert beim Ziehen
  const scrollToT = useCallback(
    (v: number) => {
      const el = track.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top + (v / span) * (el.offsetHeight - window.innerHeight), behavior: "instant" });
    },
    [span],
  );

  const stepForPlate = useCallback(
    (no: number) => {
      for (let s = 1; s <= count; s++) if (platesOn(pagesAt(book, mode, s)).includes(no)) return s;
      return 0;
    },
    [book, count, mode],
  );
  const jump = useCallback((no: number) => goTo(stepForPlate(no)), [goTo, stepForPlate]);

  // Vom Tisch aufgeschlagen: der Einband öffnet sich von selbst, wenn das Buch liegt. Nur einmal: rendert das
  // Zimmer neu (Zettel auf, Eselsohr), kommt das Buch als neues Objekt, und das Buch soll nicht zurückspringen
  const autoOpened = useRef(false);
  useEffect(() => {
    if (autoOpened.current || !autoOpen || (reduce && !startPlate)) return;
    const id = window.setTimeout(() => {
      autoOpened.current = true;
      goTo(startPlate ? stepForPlate(startPlate) : 1);
    }, reduce ? 0 : 420);
    return () => window.clearTimeout(id);
  }, [autoOpen, goTo, reduce, startPlate, stepForPlate]);

  // Rezeptzettel: gehört zur aufgeschlagenen Doppelseite und schließt sich beim Weiterblättern
  const [slip, setSlip] = useState<{ no: number; k: number } | null>(null);
  const slipPlate = slip && slip.k === k ? plateOf(book, slip.no) : null;
  const closeSlip = useCallback(() => setSlip(null), []);
  // Welches Foto gehört zum Knopf? Zeigen oder Fokus auf „Rezept“ und der offene Zettel heben sein Foto hervor
  const [pointed, setPointed] = useState<number | null>(null);
  const marked = pointed ?? slip?.no ?? null;
  useEffect(() => {
    const root = bookRef.current;
    if (!root || marked === null) return;
    const boxes = Array.from(root.querySelectorAll<HTMLElement>(`[data-plate-box="${marked}"]`));
    boxes.forEach((el) => (el.dataset.marked = ""));
    return () => boxes.forEach((el) => delete el.dataset.marked);
  }, [marked, kt]);

  // Vergrößern: Tafel hebt sich aus dem Buch
  const [viewer, setViewer] = useState<{ no: number; from: DOMRect | null; trigger: HTMLElement } | null>(null);
  const findRect = useCallback((no: number) => {
    const boxes = Array.from(bookRef.current?.querySelectorAll<HTMLElement>(`[data-plate-box="${no}"]`) ?? []).filter(
      // die Bühne selbst ist bei offener Tafel inert, das zählt nicht
      (el) => !el.closest("[inert]:not([data-stage])"),
    );
    if (!boxes.length) return null;
    const rs = boxes.map((el) => el.getBoundingClientRect());
    const left = Math.min(...rs.map((r) => r.left));
    const top = Math.min(...rs.map((r) => r.top));
    return new DOMRect(left, top, Math.max(...rs.map((r) => r.right)) - left, Math.max(...rs.map((r) => r.bottom)) - top);
  }, []);
  const openPlate = useCallback(
    (no: number, trigger: HTMLElement) => {
      curlR.set(0);
      curlL.set(0);
      setViewer({ no, from: findRect(no), trigger });
    },
    [curlL, curlR, findRect],
  );
  const refocus = useRef<HTMLElement | null>(null);
  const closePlate = useCallback(
    (current: number) => {
      if (viewer && current !== viewer.no) goTo(stepForPlate(current));
      else refocus.current = viewer?.trigger ?? null;
      setViewer(null);
    },
    [goTo, stepForPlate, viewer],
  );
  // erst nach dem Rendern ist die Bühne nicht mehr inert und nimmt den Fokus
  useEffect(() => {
    if (viewer || !refocus.current) return;
    refocus.current.focus({ preventScroll: true });
    refocus.current = null;
  }, [viewer]);

  // Kein Scrollen unter der offenen Tafel
  useEffect(() => {
    if (!viewer) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
    };
  }, [viewer]);

  useEffect(() => {
    hoverable.current = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }, []);

  // Tastatur: Pfeile blättern, Esc legt das Buch zurück
  useEffect(() => {
    if (viewer) return;
    const onKey = (e: KeyboardEvent) => {
      // beim Schreiben auf einem Zettel gehören die Tasten dem Zettel
      if ((e.target as Element | null)?.closest?.("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowRight") goTo(k + 1);
      else if (e.key === "ArrowLeft") goTo(k - 1);
      else if (e.key === "Escape") onClose();
      else if (e.key === "r" || e.key === "R") {
        const no = platesOn(pagesAt(book, mode, k)).find((n) => hasSlip(plateOf(book, n)));
        if (no) setSlip((cur) => (cur && cur.no === no && cur.k === k ? null : { no, k }));
        else return;
      }
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [book, goTo, k, mode, onClose, viewer]);

  // Eselsohr folgt der Maus
  const plateAt = (x: number, y: number) => {
    for (const no of platesOn(pagesAt(book, mode, k))) {
      const pr = findRect(no);
      if (pr && x >= pr.left && x <= pr.right && y >= pr.top && y <= pr.bottom) return no;
    }
    return null;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    if (drag.current) {
      if (move(pointOf(e)) && drag.current?.moved && !bookRef.current?.hasPointerCapture(e.pointerId))
        bookRef.current?.setPointerCapture(e.pointerId);
      return;
    }
    if (!hoverable.current || !bookRef.current) return;
    const r = bookRef.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const onRight = mode === "single" ? x > 0.35 : x > 0.5;
    const overPlate = plateAt(e.clientX, e.clientY) !== null;
    if (reduce) return;
    curlR.set(!overPlate && onRight && k < count ? 1 : 0);
    curlL.set(!overPlate && !onRight && mode === "spread" && k > 0 ? 1 : 0);
  };
  const onPointerLeave = () => {
    curlR.set(0);
    curlL.set(0);
  };

  // Ziehen mit Maus oder Finger: die Kante der Seite bleibt unter dem Zeiger.
  // Auf dem Telefon legt Ziehen nach unten das Buch zurück auf den Tisch.
  // Maus und Stift kommen als Pointer Events, der Finger als Touch Events (siehe unten): Safari auf dem iPhone
  // bricht Pointer Events ab, sobald es die Geste selbst zum Scrollen nimmt, auch mit touch-action pan-y.
  const drag = useRef<{
    x0: number;
    y0: number;
    k0: number;
    moved: "x" | "y" | false;
    samples: Pt[];
  } | null>(null);
  // nach einem Ziehen oder langen Drücken ist der Klick, den der Browser hinterherschickt, kein Blättern
  const suppressUntil = useRef(0);
  const pull = useMotionValue(0);
  // Langes Drücken (nur im eigenen Buch): das Buch gibt unter dem Finger leicht nach, dann geht es in die Werkbank
  const press = useMotionValue(0);
  const pullScale = useTransform<number, number>([pull, press], ([p, q]) => (1 - (0.1 * Math.min(240, p)) / 240) * (1 - 0.03 * q));
  const pullT = useMotionTemplate`translateY(${pull}px) scale(${pullScale})`;
  const pressTimer = useRef(0);
  const pressed = useRef(false);
  const cancelPress = () => {
    window.clearTimeout(pressTimer.current);
    pressTimer.current = 0;
    setEarPress(null);
    if (press.get() > 0) animate(press, 0, { duration: 0.15 });
  };
  // Welche Seite trägt welche Tafel: links/rechts bei der Doppelseite, sonst die eine Seite
  const sidePlates = (() => {
    const pages = pagesAt(book, mode, kt);
    const pick = (p?: Page) => (p ? pageNos(p)[0] : undefined);
    return mode === "spread" ? { left: pick(pages[0]), right: pick(pages[1]) } : { left: undefined, right: pick(pages[0]) };
  })();
  // Ecke, die sich unter dem Finger hebt, solange er dort liegt
  const [earPress, setEarPress] = useState<"left" | "right" | null>(null);
  const [earHint, setEarHint] = useState<"left" | "right" | null>(null);
  const hintTimer = useRef(0);
  const hintEar = (side: "left" | "right") => {
    setEarHint(side);
    window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setEarHint(null), 700);
  };
  useEffect(() => () => window.clearTimeout(hintTimer.current), []);
  const holdThen = (run: () => void, sink = true) => {
    if (sink && !reduce) animate(press, 1, { duration: LONG_PRESS / 1000, delay: 0.12, ease: "easeIn" });
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = 0;
      pressed.current = true;
      drag.current = null;
      setEarPress(null);
      run();
    }, LONG_PRESS + 120);
  };
  /** Wo der Finger liegt: Seite, obere Außenecke, Stelle auf dem Foto */
  const spotAt = (p: Pt) => {
    const r = bookRef.current?.getBoundingClientRect();
    if (!r) return null;
    const side: "left" | "right" = mode === "spread" && p.x < r.left + r.width / 2 ? "left" : "right";
    const corner = p.y - r.top < CORNER && (side === "right" ? r.right - p.x < CORNER : p.x - r.left < CORNER);
    const no = plateAt(p.x, p.y) ?? sidePlates[side];
    const box = no !== undefined ? findRect(no) : null;
    const spot = no !== undefined && box ? { no, x: clamp01((p.x - box.left) / box.width), y: clamp01((p.y - box.top) / box.height) } : null;
    return { side, corner, spot };
  };
  const startPress = (p: Pt) => {
    pressed.current = false;
    if (onEdit) {
      const step = Math.min(count, Math.max(0, Math.round(turn.get())));
      holdThen(() => {
        haptic("press");
        onEdit(step);
      });
      return;
    }
    if (!onEar && !onPin) return;
    const at = spotAt(p);
    if (!at) return;
    const earNo = sidePlates[at.side];
    if (at.corner && onEar && earNo !== undefined && !ears?.includes(earNo)) {
      setEarPress(at.side);
      holdThen(() => {
        haptic("press");
        onEar(earNo);
      }, false);
      return;
    }
    const spot = at.spot;
    if (!at.corner && onPin && spot)
      holdThen(() => {
        haptic("press");
        onPin(spot);
      });
  };
  useEffect(() => () => window.clearTimeout(pressTimer.current), []);

  const begin = (p: Pt) => {
    finger.stop();
    const k0 = Math.min(count, Math.round(swipe ? finger.get() : raw.get()));
    drag.current = { x0: p.x, y0: p.y, k0, moved: false, samples: [p] };
    startPress(p);
  };
  /** true, solange die Geste dem Buch gehört (waagrecht blättern oder nach unten zurücklegen) */
  const move = (p: Pt): boolean => {
    const d = drag.current;
    if (!d || !bookRef.current) return false;
    const dx = p.x - d.x0;
    const dy = p.y - d.y0;
    if (!d.moved) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 6) return false;
      cancelPress();
      // Doppelseite: senkrecht scrollt der Browser selbst, das Ziehen endet hier
      if (!swipe && Math.abs(dy) > Math.abs(dx)) {
        drag.current = null;
        return false;
      }
      d.moved = swipe && dy > Math.abs(dx) * 1.2 ? "y" : "x";
      curlR.set(0);
      curlL.set(0);
    }
    d.samples.push(p);
    if (d.samples.length > 5) d.samples.shift();
    if (d.moved === "y") {
      pull.set(Math.max(0, dy));
      return true;
    }
    // Breite einer Seite; bei der Doppelseite wandert die Kante über den Bund, also zwei Breiten
    const w = bookRef.current.getBoundingClientRect().width / (swipe ? 1 : 2);
    const travel = clamp01(Math.abs(dx) / (w * (swipe ? 1.05 : 2)));
    const angle = Math.acos(1 - 2 * travel) / Math.PI;
    const s = invTurnEase(angle);
    // auf dem Telefon über den Rückdeckel hinaus: zurück auf den Tisch
    if (swipe && dx < 0 && d.k0 === count) {
      pull.set(Math.min(240, -dx * 0.6));
      return true;
    }
    const target = Math.max(0, Math.min(count, dx < 0 ? d.k0 + s : d.k0 - s));
    // weniger Bewegung: das Blatt folgt dem Finger nicht, beim Loslassen springt die Seite um
    if (reduce) return true;
    if (swipe) finger.set(target);
    else scrollToT(target);
    return true;
  };
  const finish = (p: Pt) => {
    cancelPress();
    if (pressed.current) {
      pressed.current = false;
      suppressUntil.current = performance.now() + 600;
      return;
    }
    const d = drag.current;
    drag.current = null;
    if (!d || !d.moved) return;
    suppressUntil.current = performance.now() + 400;
    const first = d.samples[0];
    const dt = Math.max(1, p.time - first.time);
    if (d.moved === "y" || pull.get() > 0) {
      const vy = (p.y - first.y) / dt;
      if (pull.get() > 80 || vy > 0.6 || (d.moved === "x" && pull.get() > 60)) onClose();
      else animate(pull, 0, { type: "spring", stiffness: 300, damping: 28 });
      return;
    }
    const v = (p.x - first.x) / dt; // px pro ms
    // weniger Bewegung: nur die Richtung des Wischens zählt
    const prog = reduce ? -Math.sign(d.samples[d.samples.length - 1].x - d.x0) : (swipe ? finger.get() : raw.get()) - d.k0;
    let target = d.k0;
    if (prog > 0.28 || v < -0.35) target = d.k0 + 1;
    else if (prog < -0.28 || v > 0.35) target = d.k0 - 1;
    target = Math.max(0, Math.min(count, target));
    // Haptik einmal, wenn das Blatt liegt; nicht während des Ziehens und nicht, wenn es zurückfällt
    const landed = () => target !== d.k0 && haptic("select");
    if (!swipe) {
      goTo(target);
      landed();
    } else if (reduce) {
      finger.set(target);
      landed();
    } else animate(finger, target, { type: "spring", stiffness: 210, damping: 26, velocity: -v * 2.2 }).then(landed);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || e.pointerType === "touch" || (e.target as Element).closest(OWN)) return;
    begin(pointOf(e));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    finish(pointOf(e));
  };

  // Finger: eigene Touch-Listener, nicht passiv, damit ein waagrechtes Wischen das Scrollen der Seite verhindern kann.
  // Die Handler wechseln mit jedem Rendern; der Listener ruft immer die aktuellen auf.
  const touch = useRef({ begin, move, finish, cancelPress });
  useEffect(() => {
    touch.current = { begin, move, finish, cancelPress };
  });
  useEffect(() => {
    const el = bookRef.current;
    if (!el) return;
    let id: number | null = null;
    const find = (list: TouchList) => Array.from(list).find((tp) => tp.identifier === id);
    const start = (e: TouchEvent) => {
      // zwei Finger: zoomen ist Sache des Browsers
      if (e.touches.length > 1) {
        id = null;
        drag.current = null;
        touch.current.cancelPress();
        return;
      }
      if ((e.target as Element).closest?.(OWN)) return;
      const tp = e.changedTouches[0];
      id = tp.identifier;
      touch.current.begin({ x: tp.clientX, y: tp.clientY, time: e.timeStamp });
    };
    const onMove = (e: TouchEvent) => {
      const tp = find(e.changedTouches);
      if (!tp) return;
      const d = drag.current;
      const ours = touch.current.move({ x: tp.clientX, y: tp.clientY, time: e.timeStamp });
      // klar waagrecht, auch unter der Schwelle: Safari darf die Geste gar nicht erst als Scrollen beginnen
      const sideways = !!d && !d.moved && Math.abs(tp.clientX - d.x0) > 2 * Math.abs(tp.clientY - d.y0);
      if ((ours || sideways) && e.cancelable) e.preventDefault();
    };
    const end = (e: TouchEvent) => {
      const tp = find(e.changedTouches);
      if (!tp) return;
      id = null;
      const wasPress = pressed.current;
      touch.current.finish({ x: tp.clientX, y: tp.clientY, time: e.timeStamp });
      // nach langem Drücken kein Klick hinterher
      if (wasPress && e.cancelable) e.preventDefault();
    };
    // Bewegen und Loslassen am Fenster: verschwindet das Element unter dem Finger (die Ecke knickt um),
    // erreichen seine Touch-Ereignisse das Buch nicht mehr
    el.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", end);
    window.addEventListener("touchcancel", end);
    return () => {
      el.removeEventListener("touchstart", start);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", end);
      window.removeEventListener("touchcancel", end);
    };
  }, []);

  // Klick aufs Papier blättert; Treffer auf Tafeln über Geometrie (Touch trifft in 3D-Seiten nicht zuverlässig)
  const onBookClick = (e: React.MouseEvent) => {
    if (performance.now() < suppressUntil.current || (e.target as Element).closest(OWN)) return;
    if (!bookRef.current) return;
    const no = plateAt(e.clientX, e.clientY);
    if (no !== null) {
      const trigger = Array.from(
        bookRef.current.querySelectorAll<HTMLElement>(`[data-plate-box="${no}"] button`),
      ).find((el) => !el.closest("[inert]"));
      if (trigger) openPlate(no, trigger);
      return;
    }
    const r = bookRef.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    if (x > (mode === "single" ? 0.35 : 0.5)) goTo(k + 1);
    else goTo(k - 1);
  };

  // Bildfolge: Position auf der Linie wird zur Tafel
  const scrubbing = useRef(false);
  const scrubbed = useRef(0);
  const scrubTo = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const no = Math.min(nPlates, Math.max(1, Math.floor(((e.clientX - r.left) / r.width) * nPlates) + 1));
    if (no === scrubbed.current && e.type !== "pointerdown") return;
    scrubbed.current = no;
    goTo(stepForPlate(no));
  };

  // Wo die Fotos mit angehefteten Zetteln liegen, als Anteil ihrer Buchseite; gemessen, sobald die Doppelseite liegt
  const [pinBoxes, setPinBoxes] = useState<Record<number, { side: "left" | "right"; l: number; t: number; w: number; h: number }>>({});
  const pinNos = [...new Set((pins ?? []).map((p) => p.no))].join(",");
  useEffect(() => {
    if (!pinNos) return;
    const measure = () => {
      const r = bookRef.current?.getBoundingClientRect();
      if (!r) return;
      const halfW = mode === "spread" ? r.width / 2 : r.width;
      const next: typeof pinBoxes = {};
      for (const no of pinNos.split(",").map(Number)) {
        const box = findRect(no);
        if (!box) continue;
        const side = mode === "spread" && box.left + box.width / 2 < r.left + r.width / 2 ? "left" : "right";
        const x0 = side === "right" && mode === "spread" ? r.left + halfW : r.left;
        next[no] = { side, l: (box.left - x0) / halfW, t: (box.top - r.top) / r.height, w: box.width / halfW, h: box.height / r.height };
      }
      setPinBoxes(next);
    };
    const raf = requestAnimationFrame(measure);
    const late = window.setTimeout(measure, 400);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(late);
      window.removeEventListener("resize", measure);
    };
  }, [pinNos, kt, mode, findRect]);

  const current = platesOn(pagesAt(book, mode, k));
  // Zettel auf die Gegenseite seines Fotos; über den Bund oder als Einzelseite bleibt er rechts
  // Zettel auf die Gegenseite der Seite, auf der sein Foto liegt; auch bei mehreren Fotos pro Seite
  const slipSide = (() => {
    if (mode !== "spread" || !slipPlate) return "right";
    const [l, r] = pagesAt(book, mode, kt);
    const onLeft = !!l && pageNos(l).includes(slipPlate.no);
    const onRight = !!r && pageNos(r).includes(slipPlate.no);
    return onRight && !onLeft ? "left" : "right";
  })();
  const label = labelAt(book, mode, k, t);
  const pw = pageWidth(book, mode);
  const sides = sideCaptions(book, mode, kt, t);
  const slipProps = { k, slip: slipPlate?.no ?? null, onOpen: setSlip, onPoint: setPointed };
  const actions = (extra || onEdit) && (
    <>
      {extra?.(book, current)}
      {onEdit && <EditButton onEdit={() => onEdit(k)} />}
    </>
  );

  return (
    <section
      ref={track}
      aria-label={t("Fotobuch {title}", { title: book.title })}
      tabIndex={-1}
      className="relative outline-none"
      style={{ height: swipe ? "100svh" : `${count * 85 + 100 + OUTRO * 85}svh` }}
    >
      {/* Haltepunkte: jedes offene Doppelblatt hat seine Scrollposition */}
      {!swipe &&
        range.map((s) => (
          <div
            key={s}
            ref={(el) => {
              stops.current[s] = el;
            }}
            aria-hidden
            className="absolute h-px w-px"
            style={{ top: `calc(${s / span} * (100% - 100svh))` }}
          />
        ))}

      <motion.div
        data-stage
        // --side: quer auf dem Telefon stehen Kopf und Bildtitel links und rechts neben dem Buch
        className={`linen table-surface sticky top-0 flex h-svh flex-col overflow-hidden bg-table select-none [--side:0px] flat:[--side:min(13rem,27vw)] ${swipe ? "touch-none" : ""}`}
        inert={!!viewer}
      >
        <SunAndShade light={book.light} />
        {/* Kopf: bricht bei großer Schrift um, statt den Weg zurück aus dem Bild zu schieben.
            Quer liegt er über der Bühne, links und rechts neben dem Buch. */}
        <header className="pointer-events-none relative z-20 flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-4 pt-[max(1rem,env(safe-area-inset-top))] md:grid md:grid-cols-[1fr_auto_1fr] md:px-8 md:pt-6 flat:absolute flat:inset-x-0 flat:top-0 flat:grid flat:grid-cols-[calc(var(--side)-1rem)_1fr_calc(var(--side)-1rem)] flat:px-4 flat:pt-3 [&>*]:pointer-events-auto">
          <button
            type="button"
            onClick={onClose}
            className="text-on-table -ml-1 inline-flex min-h-11 items-center gap-0.5 justify-self-start pr-2 text-lg font-bold whitespace-nowrap tracking-[-0.02em] transition-opacity duration-150 active:opacity-60 flat:whitespace-normal"
            style={{ fontVariationSettings: '"wdth" 80' }}
            aria-label={backLabel ?? t("Calima, zurück zum Tisch")}
          >
            {/* Pfeil zeigt, dass der Name zurückführt (wie „‹ Bücherzimmer“ in der Werkbank); auf dem Telefon gibt es kein Esc */}
            <ChevronLeft aria-hidden className="text-on-table-2 size-5" />
            {backLabel ?? "Calima"}
          </button>
          {/* Bildtitel der randlosen Tafeln (auf der Seite selbst steht nichts) und ihr Rezept: je Seite eine Gruppe */}
          <div className="hidden items-start gap-x-8 gap-y-2 text-sm md:flex flat:col-start-1 flat:row-start-2 flat:flex-col">
            <SideCaptions sides={sides} kt={kt} reduce={reduce} slipProps={slipProps} layout="row" />
            {actions && <span className="flex shrink-0 items-center gap-2">{actions}</span>}
          </div>
          <p className="text-on-table-2 ml-auto justify-self-end text-right text-sm flat:col-start-3" aria-live="polite">
            <span className="text-on-table">{book.title}</span>
            <span className="mx-2" aria-hidden>
              ·
            </span>
            <span className="text-on-table">
              <RollingLabel text={label} reduce={reduce} />
            </span>
            <span className="mx-2" aria-hidden>
              /
            </span>
            {nPlates}
          </p>
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(k)}
              aria-label={t("Bearbeiten")}
              title={t("Bearbeiten (oder lange aufs Buch drücken)")}
              className={buttonClass("quiet", "sm", "-mr-1 -mt-1.5 size-11 shrink-0 justify-center p-0 md:hidden flat:hidden")}
            >
              <Pencil aria-hidden />
            </button>
          )}
          {/* Telefon: über jeder Seite ihr Bildtitel und Rezept, links über links, rechts über rechts;
              quer stehen sie links und rechts neben dem Buch */}
          <div className="grid basis-full gap-y-2 pt-1 text-sm md:hidden flat:max-md:contents">
            <SideCaptions sides={sides} kt={kt} reduce={reduce} slipProps={slipProps} layout="columns" />
            {/* hochkant steht „Bearbeiten“ als Stift oben in der Kopfzeile, das spart der Bühne eine Zeile */}
            {(extra || onEdit) && (
              <span className={`flex flex-wrap justify-end gap-2 flat:col-start-3 flat:row-start-3 flat:justify-self-end ${extra ? "" : "hidden flat:flex"}`}>
                {extra?.(book, current)}
                {onEdit && (
                  <span className="hidden flat:contents">
                    <EditButton onEdit={() => onEdit(k)} />
                  </span>
                )}
              </span>
            )}
          </div>
        </header>

        {/* Bühne */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 [container-type:size] md:px-8 flat:px-[var(--side)] flat:pt-2">
          <JumpContext.Provider value={jump}>
            <PlateOpenProvider value={openPlate}>
              <motion.div style={{ transform: pullT }} className="relative">
                <motion.div
                  ref={bookRef}
                  // Doppelseite: waagrecht wischen blättert, senkrecht scrollt die Seite. Ohne pan-y übernimmt
                  // Safari auf dem iPhone jede Wischbewegung selbst und bricht das Ziehen ab.
                  className={`relative cursor-grab active:cursor-grabbing ${swipe ? "" : "touch-pan-y"}`}
                  onDragStart={(e) => e.preventDefault()}
                  onPointerMove={onPointerMove}
                  onPointerLeave={onPointerLeave}
                  onPointerDown={onPointerDown}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  onClick={onBookClick}
                  style={{
                    transform: bookTransform,
                    opacity: bookOpacity,
                    width: mode === "spread" ? "calc(var(--pw) * 2)" : "var(--pw)",
                    height: `calc(var(--pw) * ${book.aspect})`,
                    ["--pw" as string]: pw,
                    // Überstand der Buchdecke über den Buchblock
                    ["--board" as string]: "max(3px, calc(var(--pw) * 0.018))",
                  }}
                >
                  {/* Buchdecke: die Pappe steht rundum ein Stück über den Buchblock, in Leinen bezogen.
                      Geschlossen ist der Einband selbst die Decke; sie zeigt sich, wenn das Buch aufgeht. */}
                  <motion.div
                    aria-hidden
                    className="book-board absolute top-[calc(var(--board)*-1)] bottom-[calc(var(--board)*-1)]"
                    style={{
                      left: mode === "spread" ? "50%" : 0,
                      right: `calc(-${edgeW}px - var(--board))`,
                      backgroundColor: book.cloth.base,
                      opacity: open,
                    }}
                  />
                  {mode === "spread" && (
                    <motion.div
                      aria-hidden
                      className="book-board absolute top-[calc(var(--board)*-1)] bottom-[calc(var(--board)*-1)]"
                      style={{ left: `calc(-${edgeW}px - var(--board))`, right: "50%", backgroundColor: book.cloth.base, opacity: open }}
                    />
                  )}

                  {/* Schatten auf dem Tisch, nur unter dem geöffneten Teil */}
                  <div
                    aria-hidden
                    className="book-shadow-open absolute inset-0"
                    style={{ left: mode === "spread" ? "50%" : 0 }}
                  />
                  <motion.div
                    aria-hidden
                    className="book-shadow-open absolute inset-y-0 left-0"
                    style={{ width: mode === "spread" ? "50%" : 0, opacity: open }}
                  />

                  {/* Papierkanten, so dick wie das Buch Seiten hat */}
                  <motion.div
                    aria-hidden
                    className="book-block-r absolute top-[0.6%] bottom-[0.6%] left-full origin-left"
                    style={{ transform: rightEdgeT, width: Math.round(3 + count / 4) }}
                  />
                  {mode === "spread" && (
                    <motion.div
                      aria-hidden
                      className="book-block-l absolute top-[0.6%] right-full bottom-[0.6%] origin-right"
                      style={{ transform: leftEdgeT, width: Math.round(3 + count / 4) }}
                    />
                  )}

                  {/* Buchblock von vorn: die untere Schnittkante, so dick wie der Stapel auf jeder Seite */}
                  <motion.div
                    aria-hidden
                    className="book-foot absolute top-full right-0 origin-top"
                    style={{ left: mode === "spread" ? "50%" : 0, height: `min(${Math.ceil(edgeW / 2)}px, calc(var(--board) - 1px))`, transform: rightFootT }}
                  />
                  {mode === "spread" && (
                    <motion.div
                      aria-hidden
                      className="book-foot absolute top-full right-1/2 left-0 origin-top"
                      style={{ height: `min(${Math.ceil(edgeW / 2)}px, calc(var(--board) - 1px))`, transform: leftFootT }}
                    />
                  )}

                  {/* letzte Seite liegt unten rechts */}
                  <div
                    className="absolute inset-y-0 overflow-hidden"
                    style={{ left: mode === "spread" ? "50%" : 0, width: mode === "spread" ? "50%" : "100%" }}
                    inert={kt !== count}
                  >
                    {kt >= count - WINDOW ? <PageView book={book} page={base} side="right" /> : <Blank book={book} page={base} />}
                  </div>

                  {leaves.map((leaf, i) => (
                    <LeafView key={i} book={book} leaf={leaf} i={i} count={count} t={turn} mode={mode} k={kt} curl={curl} />
                  ))}

                  {bend && !reduce && (
                    <PageCurl book={book} leaves={leaves} t={turn} k={kt} mode={mode} store={curl} bookRef={bookRef} />
                  )}

                  {/* Wölbung: am Bund hebt sich das Papier ins Licht, zur Außenkante fällt es ab */}
                  <motion.div aria-hidden className="pointer-events-none absolute inset-0 z-[140] flex" style={{ opacity: still }}>
                    {mode === "spread" && <div className="book-curve-l h-full w-1/2" />}
                    <div className="book-curve-r h-full flex-1" />
                  </motion.div>

                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 right-0"
                    style={{ width: mode === "spread" ? "50%" : "100%" }}
                  >
                    <Curl side="right" amount={curlRight} flap={backTone(book, leaves[kt]?.back)} />
                  </div>
                  {mode === "spread" && (
                    <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/2">
                      <Curl side="left" amount={curlLeft} flap={backTone(book, leaves[kt - 1]?.front)} />
                    </div>
                  )}

                  {/* Eselsohren: umgeknickte obere Außenecke; die Ecke selbst ist auch der Knopf dafür */}
                  {(["left", "right"] as const).map((side) => {
                    const no = sidePlates[side];
                    if (no === undefined || (side === "left" && mode !== "spread")) return null;
                    const on = ears?.includes(no) ?? false;
                    return (
                      <div
                        key={`ear-${side}-${kt}`}
                        className="pointer-events-none absolute inset-y-0 z-[210]"
                        style={{ [side]: 0, width: mode === "spread" ? "50%" : "100%" }}
                      >
                        <AnimatePresence>{on && <Ear key={no} side={side} resting={resting} reduce={reduce} />}</AnimatePresence>
                        {/* bleibt nach dem Knicken liegen (unsichtbar): verschwände das Element unter dem Finger,
                            käme das Loslassen beim Buch nicht mehr an */}
                        {onEar && (
                          <button
                            type="button"
                            aria-label={t("Eselsohr bei Tafel {no}", { no })}
                            aria-hidden={on || undefined}
                            tabIndex={on ? -1 : undefined}
                            title={on ? undefined : t("Ecke gedrückt halten")}
                            data-lift={!on && (earPress === side || earHint === side) ? "" : undefined}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (on) return;
                              // Tastatur und VoiceOver knicken direkt; der Finger muss die Ecke halten, ein Tipp zeigt nur, dass es geht
                              if (e.detail === 0) onEar(no);
                              else if (performance.now() >= suppressUntil.current) hintEar(side);
                            }}
                            className="group/ear pointer-events-auto absolute top-0 h-14 w-14 [-webkit-touch-callout:none] focus-visible:outline-ink focus-visible:-outline-offset-4"
                            style={{ [side]: 0 }}
                          >
                            {/* Ecke hebt sich beim Zeigen leicht an: hier lässt sich etwas knicken (UX-Kritik K20);
                                beim Halten hebt sie sich weiter, bis sie umknickt */}
                            <span
                              aria-hidden
                              className={`${on ? "hidden" : ""} bg-paper-shade absolute top-0 size-5 opacity-0 shadow-[0_2px_4px_-1px_rgb(12_10_8/0.35)] transition-[opacity,width,height] duration-200 group-hover/ear:opacity-100 group-focus-visible/ear:opacity-100 group-data-lift/ear:size-9 group-data-lift/ear:opacity-100 ${earPress === side ? "ease-in [transition-duration:480ms]" : ""}`}
                              style={{
                                [side]: 0,
                                clipPath: side === "right" ? "polygon(0 0, 100% 100%, 0 100%)" : "polygon(100% 0, 100% 100%, 0 100%)",
                              }}
                            />
                          </button>
                        )}
                        {/* Zettel und Marker an ihrer Stelle im Foto; während des Umblätterns ausgeblendet */}
                        {pins && (
                          <motion.div className="pointer-events-none absolute inset-0 z-[5]" style={{ opacity: resting }}>
                            {pins.map((pin) => {
                              const box = pinBoxes[pin.no];
                              if (!box || box.side !== side) return null;
                              return (
                                <div
                                  key={pin.key}
                                  data-own-gesture=""
                                  className="pointer-events-auto absolute"
                                  style={{ left: `${(box.l + pin.x * box.w) * 100}%`, top: `${(box.t + pin.y * box.h) * 100}%` }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {pin.node}
                                </div>
                              );
                            })}
                          </motion.div>
                        )}
                      </div>
                    );
                  })}

                  {/* Blätterknöpfe für Tastatur und Screenreader, an den Außenkanten */}
                  <button
                    type="button"
                    aria-label={t("Zurückblättern")}
                    disabled={k === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      // nach langem Drücken (Eselsohr in der Ecke) schickt der Browser noch einen Klick hinterher
                      if (performance.now() < suppressUntil.current) return;
                      goTo(k - 1);
                    }}
                    className="absolute inset-y-0 left-0 z-[200] w-[7%] focus-visible:outline-ink focus-visible:-outline-offset-4 disabled:pointer-events-none"
                  />
                  <button
                    type="button"
                    aria-label={t("Weiterblättern")}
                    disabled={k === count}
                    onClick={(e) => {
                      e.stopPropagation();
                      // nach langem Drücken (Eselsohr in der Ecke) schickt der Browser noch einen Klick hinterher
                      if (performance.now() < suppressUntil.current) return;
                      goTo(k + 1);
                    }}
                    className="absolute inset-y-0 right-0 z-[200] w-[7%] focus-visible:outline-ink focus-visible:-outline-offset-4 disabled:pointer-events-none"
                  />
                </motion.div>
              </motion.div>
            </PlateOpenProvider>
          </JumpContext.Provider>
        </div>

        {/* Bildfolge als Linie mit Haltepunkten */}
        <nav
          aria-label={t("Bildfolge")}
          className="relative z-20 mx-auto w-full max-w-[680px] px-6 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:pb-7 flat:pt-0 flat:pb-[max(0.25rem,env(safe-area-inset-bottom))]"
        >
          <AnimatePresence>
            {!hinted && (
              <motion.p
                aria-hidden
                className="text-on-table-2 absolute -top-3 left-0 w-full text-center text-sm"
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {swipe ? (
                  t("Wischen oder Tippen zum Blättern")
                ) : (
                  <>
                    <span className="pointer-coarse:hidden">{t("Scrollen, Klicken oder ← → zum Blättern")}</span>
                    <span className="hidden pointer-coarse:inline">{t("Scrollen oder Wischen zum Blättern")}</span>
                  </>
                )}
              </motion.p>
            )}
          </AnimatePresence>
          {/* Scrub-Leiste: tippen oder ziehen springt zur nächsten Tafel; die Knöpfe bleiben für die Tastatur.
              Auf dem Telefon 44px hoch, damit der Finger die schmalen Haltepunkte trifft */}
          <div
            className="relative h-11 cursor-pointer touch-none md:h-6"
            onPointerDown={(e) => {
              scrubbing.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              scrubTo(e);
            }}
            onPointerMove={(e) => scrubbing.current && scrubTo(e)}
            onPointerUp={() => (scrubbing.current = false)}
            onPointerCancel={() => (scrubbing.current = false)}
          >
            <div
              aria-hidden
              className="absolute top-1/2 h-px bg-on-table-2/40"
              style={{ left: `${50 / nPlates}%`, right: `${50 / nPlates}%` }}
            />
            <motion.div
              aria-hidden
              className="absolute top-1/2 h-px origin-left bg-mark"
              style={{ transform: fillT, left: `${50 / nPlates}%`, right: `${50 / nPlates}%` }}
            />
            <ol className="absolute inset-0 flex">
              {book.plates.map((p) => {
                const active = current.includes(p.no);
                return (
                  <li key={p.no} className="group relative flex min-w-0 flex-1 justify-center">
                    <button
                      type="button"
                      onClick={() => goTo(stepForPlate(p.no))}
                      aria-label={plateName(p.no, p.title)}
                      aria-current={active ? "true" : undefined}
                      className="flex h-full w-full max-w-6 items-center justify-center"
                    >
                      <span
                        aria-hidden
                        className={`stop block h-2.5 w-[3px] ${active ? "scale-y-[1.9] bg-mark" : "bg-on-table-2 group-hover:scale-y-150 group-hover:bg-on-table"}`}
                      />
                    </button>
                    <span
                      aria-hidden
                      className="text-on-table pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 translate-y-1 text-xs whitespace-nowrap opacity-0 transition-[opacity,translate] duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100"
                    >
                      {p.no} {p.title}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
          {/* Platz bleibt reserviert, damit das Buch nicht springt, wenn der Satz am Ende erscheint */}
          {end && (
            <div className="grid min-h-12 place-items-center pt-2 text-center md:min-h-10">
              <AnimatePresence>
                {atBookEnd(k, count) && (
                  <motion.div
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                  >
                    {end}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </nav>
      </motion.div>

      <AnimatePresence>
        {slipPlate && !viewer && <RecipeSlip key={slipPlate.no} plate={slipPlate} onClose={closeSlip} side={slipSide} />}
      </AnimatePresence>

      {viewer && (
        <PlateViewer
          book={book}
          no={viewer.no}
          from={viewer.from}
          reduce={reduce}
          findRect={findRect}
          onClose={closePlate}
        />
      )}
    </section>
  );
}

/** In die Werkbank, an die aufgeschlagene Doppelseite; dasselbe wie langes Drücken aufs Buch */
function EditButton({ onEdit }: { onEdit: () => void }) {
  const t = useT();
  return (
    <button type="button" onClick={onEdit} title={t("Oder lange aufs Buch drücken")} className={buttonClass("quiet", "sm")}>
      <Pencil aria-hidden />
      {t("Bearbeiten")}
    </button>
  );
}

type SlipProps = {
  k: number;
  slip: number | null;
  onOpen: (s: { no: number; k: number } | null) => void;
  onPoint: (no: number | null) => void;
};

/**
 * Bildtitel und Zettel-Knopf je Seite. Telefon (columns): zwei Spalten wie die Doppelseite darunter, links
 * linksbündig, rechts rechtsbündig; quer neben dem Buch. Ab Tablet (row): die Gruppen nebeneinander in der Kopfmitte.
 * Lange Titel brechen auf zwei Zeilen um statt abzuschneiden; der Knopf steht bei seinem Titel und braucht keine Nummer.
 */
function SideCaptions({
  sides,
  kt,
  reduce,
  slipProps,
  layout,
}: {
  sides: SideCaption[];
  kt: number;
  reduce: boolean;
  slipProps: SlipProps;
  layout: "row" | "columns";
}) {
  const columns = layout === "columns";
  const single = sides.length === 1;
  return (
    <div
      aria-live="polite"
      className={
        columns
          ? "grid min-h-6 grid-cols-2 items-start gap-x-4 flat:max-md:contents"
          : "flex min-w-0 items-start gap-x-8 flat:flex-col flat:gap-y-3"
      }
    >
      {sides.map(({ side, plates }) => {
        const right = columns && side === "right" && !single;
        return (
          <motion.div
            key={`${kt}-${side}`}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className={`grid min-w-0 content-start gap-y-2 ${right ? "col-start-2 justify-items-end text-right" : "justify-items-start"} ${
              columns && single ? "col-span-2" : ""
            } ${columns ? (right ? "flat:col-start-3 flat:row-start-2 flat:justify-self-end" : "flat:col-start-1 flat:row-start-2") : "max-w-[20rem]"}`}
          >
            {plates.map(({ no, title, name, slip }) => (
              <div key={no} className={`grid min-w-0 gap-y-1.5 ${right ? "justify-items-end" : "justify-items-start"}`}>
                {title && (
                  <p className="line-clamp-2 leading-snug [overflow-wrap:anywhere]">
                    <span className="text-on-table-2 mr-[0.45em] tabular-nums">{no}</span>
                    <span className="text-on-table">{title}</span>
                  </p>
                )}
                {slip && <SlipButton no={no} label={slip} title={name} {...slipProps} />}
              </div>
            ))}
          </motion.div>
        );
      })}
    </div>
  );
}

/** Knopf „Rezept“ (Pille) zu einer Tafel; Zeigen oder Fokus hebt das Foto auf der Seite hervor */
function SlipButton({ no, label, title, k, slip, onOpen, onPoint }: SlipProps & { no: number; label: string; title: string }) {
  const t = useT();
  return (
    <button
      type="button"
      aria-expanded={slip === no}
      aria-label={t("{label} zu {plate}", { label, plate: plateName(no, title) })}
      onClick={() => onOpen(slip === no ? null : { no, k })}
      onPointerEnter={(e) => e.pointerType === "mouse" && onPoint(no)}
      onPointerLeave={() => onPoint(null)}
      onFocus={() => onPoint(no)}
      onBlur={() => onPoint(null)}
      className={buttonClass("quiet", "sm", slip === no ? "bg-on-table/16" : "")}
    >
      <ScrollText aria-hidden />
      {label}
    </button>
  );
}

// Farbe der Papierrückseite, die beim Eselsohr sichtbar wird
function backTone(book: BookData, page: Page | undefined) {
  return page?.kind === "cover" ? book.cloth.base : page?.kind === "endpaper" ? book.cloth.deep : "var(--paper)";
}
