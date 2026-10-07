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
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { plates, singlePages, spreads, type Page } from "@/content/plates";
import { INTRO_DONE } from "@/components/intro";
import { createCurlStore, PageCurl, type CurlStore } from "@/components/page-curl";
import { PageView } from "@/components/page-view";
import { PlateOpenProvider, PlateViewer } from "@/components/plate-viewer";
import { SunAndShade } from "@/components/sun-and-shade";

type Mode = "spread" | "single";
type Leaf = { front: Page; back: Page };

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
// Nur so viele Blätter um die aufgeschlagene Seite tragen Bilder und 3D-Ebenen
const WINDOW = 2;

function buildLeaves(mode: Mode): { leaves: Leaf[]; base: Page } {
  if (mode === "spread") {
    const leaves: Leaf[] = [{ front: { kind: "cover" }, back: spreads[0].left }];
    for (let k = 0; k < spreads.length - 1; k++) {
      leaves.push({ front: spreads[k].right, back: spreads[k + 1].left });
    }
    return { leaves, base: spreads[spreads.length - 1].right };
  }
  return {
    leaves: singlePages.slice(0, -1).map((front) => ({ front, back: { kind: "verso" } })),
    base: singlePages[singlePages.length - 1],
  };
}

/** Welche Tafeln sind sichtbar, wenn k Blätter umgeschlagen sind */
function platesAt(mode: Mode, k: number): number[] {
  if (k === 0) return [];
  if (mode === "spread") return spreads[k - 1]?.plates ?? [];
  const p = singlePages[k];
  return p && p.kind === "plate" ? [p.no] : [];
}

function labelAt(mode: Mode, k: number, total: number): string {
  if (k === 0) return "Einband";
  if (k === total) return "Kolophon";
  const ps = platesAt(mode, k);
  if (ps.length === 0) return k === 1 ? "Titel" : "Kolophon";
  return ps.length > 1 ? `Tafel ${ps[0]}–${ps[ps.length - 1]}` : `Tafel ${ps[0]}`;
}

// Farbe der Papierrückseite, die beim Eselsohr sichtbar wird
const backTone = (page: Page | undefined) =>
  page?.kind === "cover" ? "var(--cloth)" : page?.kind === "endpaper" ? "var(--cloth-deep)" : "var(--paper)";

const noopSubscribe = () => () => {};

// Ferne Blätter: nur der Farbton der Seite, ohne Bild und Text
function Blank({ page }: { page: Page }) {
  const bg = page.kind === "cover" ? "bg-cloth" : page.kind === "endpaper" ? "bg-cloth-deep" : "bg-paper";
  return <div className={`absolute inset-0 ${bg}`} />;
}

function LeafView({
  leaf,
  i,
  count,
  t,
  peek,
  mode,
  k,
  curl,
}: {
  leaf: Leaf;
  i: number;
  count: number;
  t: MotionValue<number>;
  peek: MotionValue<number>;
  mode: Mode;
  k: number;
  curl: CurlStore;
}) {
  const rot = useTransform<number, number>([t, peek], ([tv, pv]) => {
    let r = -180 * turnEase(clamp01(tv - i));
    // nur beim ersten Hinweis: der Einband hebt sich ein Stück
    if (i === 0 && tv < 0.02) r += pv;
    return r;
  });
  const transform = useMotionTemplate`perspective(2600px) rotateY(${rot}deg)`;
  // Flacher Stapel statt 3D-Kontext: Reihenfolge per z-index, kein Flackern
  const zIndex = useTransform(rot, (r) => (r > -90 ? count - i : i + 1));
  // Licht: die Vorderseite dunkelt beim Aufrichten, die Rückseite hellt beim Ablegen
  const frontShade = useTransform(rot, [0, -90], [0, 0.42]);
  const backShade = useTransform(rot, [-90, -180], [0.42, 0]);
  // Auf dem Telefon verschwindet die Rückseite nach links aus dem Bild
  const backOpacity = useTransform(rot, [-172, -180], [1, mode === "single" ? 0 : 1]);
  const compact = mode === "single";
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

  return (
    <motion.div
      className={`absolute inset-y-0 origin-left [transform-style:preserve-3d] ${turning && !viaGL ? "will-change-transform" : ""}`}
      style={{
        transform,
        visibility: viaGL ? "hidden" : undefined,
        zIndex,
        left: mode === "spread" ? "50%" : 0,
        width: mode === "spread" ? "50%" : "100%",
      }}
    >
      <>
          {/* verdeckte Seiten sind für Tastatur und Screenreader nicht da */}
          <div className="absolute inset-0 overflow-hidden [backface-visibility:hidden]" inert={k !== i}>
            {near ? <PageView page={leaf.front} side="right" compact={compact} /> : <Blank page={leaf.front} />}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-30 bg-[linear-gradient(to_right,rgb(4_24_27/0.55),rgb(4_24_27/0.15))]"
              style={{ opacity: frontShade }}
            />
          </div>
          <motion.div
            className="absolute inset-0 overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)]"
            style={{ opacity: backOpacity }}
            inert={k !== i + 1 || mode === "single"}
          >
            {near ? <PageView page={leaf.back} side="left" compact={compact} /> : <Blank page={leaf.back} />}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-30 bg-[linear-gradient(to_left,rgb(4_24_27/0.55),rgb(4_24_27/0.15))]"
              style={{ opacity: backShade }}
            />
          </motion.div>
      </>
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
          background: `linear-gradient(${dir}, rgb(4 24 27 / 0.28) 50%, var(--paper-shade) 66%, var(--paper) 100%)`,
        }}
      />
      {/* Lasche: Rückseite des Blatts, zur Falte hin aufgehellt */}
      <div className="absolute inset-0 [filter:drop-shadow(-3px_-3px_5px_rgb(4_24_27/0.28))]">
        <div
          className="absolute inset-0"
          style={{
            clipPath: right ? "polygon(0 0, 100% 0, 0 100%)" : "polygon(0 0, 100% 0, 100% 100%)",
            background: `linear-gradient(${dir}, color-mix(in oklab, var(--flap) 82%, rgb(4 24 27)) 0%, var(--flap) 34%, color-mix(in oklab, var(--flap) 70%, white) 49%, var(--flap) 50%)`,
          }}
        />
      </div>
    </motion.div>
  );
}

/** Zähler oben rechts: neue Werte rollen von unten herein */
function RollingLabel({ text, reduce }: { text: string; reduce: boolean }) {
  return (
    <span className="relative inline-flex overflow-hidden align-bottom">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={text}
          className="inline-block"
          initial={reduce ? { opacity: 0 } : { y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: "-100%", opacity: 0 }}
          transition={{ duration: reduce ? 0.12 : 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function Book({ mode, className = "" }: { mode: Mode; className?: string }) {
  const { leaves, base } = useMemo(() => buildLeaves(mode), [mode]);
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

  const track = useRef<HTMLElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const stops = useRef<(HTMLDivElement | null)[]>([]);

  // Antrieb Doppelseite: Scrollposition. Antrieb Telefon: Finger.
  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });
  const raw = useTransform(scrollYProgress, (p) => p * count);
  const sprung = useSpring(raw, { stiffness: 150, damping: 26, mass: 0.7 });
  const stepped = useTransform(raw, (v) => Math.round(v));
  const finger = useMotionValue(0);
  const t = swipe ? finger : reduce ? stepped : sprung;

  const peek = useSpring(0, { stiffness: 260, damping: 22 });
  const curlR = useSpring(0, { stiffness: 420, damping: 30 });
  const curlL = useSpring(0, { stiffness: 420, damping: 30 });
  const hoverable = useRef(false);

  // k: Zielseite (für Tastatur und Knöpfe); kt: was gerade sichtbar aufgeschlagen ist
  const [k, setK] = useState(0);
  const [kt, setKt] = useState(0);
  useMotionValueEvent(raw, "change", (v) => !swipe && setK(Math.round(v)));
  useMotionValueEvent(t, "change", (v) => {
    const r = Math.round(v);
    setKt(r);
    if (swipe) setK(r);
  });

  // Eselsohr nur, wenn das Buch ruhig aufgeschlagen liegt
  const resting = useTransform<number, number>(t, (v) => (Math.abs(v - Math.round(v)) < 0.03 ? 1 : 0));
  const curlRight = useTransform<number, number>([curlR, resting], ([c, r]) => c * r);
  const curlLeft = useTransform<number, number>([curlL, resting], ([c, r]) => c * r);

  // Geschlossen liegt das Buch flach und rechts versetzt; beim Öffnen richtet es sich auf
  const open = useTransform(t, (v) => clamp01(v));
  const shift = useTransform(open, (o) => (mode === "spread" ? -25 * (1 - o) : 0));
  const tilt = useTransform(open, (o) => 16 - 12 * o);
  const lift = useTransform(open, (o) => 0.94 + 0.06 * o);
  const bookTransform = useMotionTemplate`perspective(1800px) rotateX(${tilt}deg) translateX(${shift}%) scale(${lift})`;

  // Papierkanten: rechts schrumpft der Stapel, links wächst er
  const rightEdge = useTransform(t, (v) => clamp01((count - v) / count));
  const leftEdge = useTransform(t, (v) => clamp01((v - 1) / count));
  const rightEdgeT = useMotionTemplate`scaleX(${rightEdge})`;
  const leftEdgeT = useMotionTemplate`scaleX(${leftEdge})`;

  const range = Array.from({ length: count + 1 }, (_, s) => s);

  // Fahrplan-Linie: Position in der Bildfolge 0..1
  const progressAt = (step: number) => {
    const ps = platesAt(mode, step);
    if (ps.length) return (ps.reduce((a, b) => a + b, 0) / ps.length - 1) / (plates.length - 1);
    return step <= 1 ? 0 : 1;
  };
  const fill = useTransform(t, range, range.map(progressAt));
  const fillT = useMotionTemplate`scaleX(${fill})`;
  const hint = useTransform(t, [0, 0.35], [1, 0]);

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
      window.scrollTo({ top: top + (v / count) * (el.offsetHeight - window.innerHeight), behavior: "instant" });
    },
    [count],
  );

  const stepForPlate = useCallback(
    (no: number) => {
      for (let s = 1; s <= count; s++) if (platesAt(mode, s).includes(no)) return s;
      return 0;
    },
    [count, mode],
  );

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

  // Tastatur: Pfeile blättern, nur für das sichtbare Buch
  useEffect(() => {
    if (viewer) return;
    const onKey = (e: KeyboardEvent) => {
      if (!track.current || track.current.offsetParent === null) return;
      if (e.key === "ArrowRight") goTo(k + 1);
      else if (e.key === "ArrowLeft") goTo(k - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, k, viewer]);

  // Nach dem Einstieg hebt sich der Einband einmal ein Stück: hier lässt sich blättern
  useEffect(() => {
    if (reduce) return;
    let c: ReturnType<typeof animate> | undefined;
    const nudge = () => {
      if (window.scrollY > 10 || finger.get() > 0) return;
      c = animate(peek, [0, -28, 0], { duration: 1.6, delay: 0.25, ease: [0.77, 0, 0.175, 1] });
    };
    if (document.documentElement.classList.contains("intro")) {
      window.addEventListener(INTRO_DONE, nudge, { once: true });
    } else {
      const id = window.setTimeout(nudge, 650);
      return () => window.clearTimeout(id);
    }
    return () => {
      window.removeEventListener(INTRO_DONE, nudge);
      c?.stop();
    };
  }, [finger, peek, reduce]);

  // Eselsohr folgt der Maus
  const plateAt = (x: number, y: number) => {
    for (const no of platesAt(mode, k)) {
      const pr = findRect(no);
      if (pr && x >= pr.left && x <= pr.right && y >= pr.top && y <= pr.bottom) return no;
    }
    return null;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (drag.current) return onDragMove(e);
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

  // Ziehen mit Maus oder Finger: die Kante der Seite bleibt unter dem Zeiger
  const drag = useRef<{ x0: number; k0: number; moved: boolean; samples: { x: number; time: number }[] } | null>(null);
  const suppressClick = useRef(false);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || reduce) return;
    finger.stop();
    const k0 = Math.round(swipe ? finger.get() : raw.get());
    drag.current = { x0: e.clientX, k0, moved: false, samples: [{ x: e.clientX, time: e.timeStamp }] };
  };
  const onDragMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !bookRef.current) return;
    const dx = e.clientX - d.x0;
    if (!d.moved && Math.abs(dx) < 6) return;
    if (!d.moved) {
      d.moved = true;
      bookRef.current.setPointerCapture(e.pointerId);
      curlR.set(0);
      curlL.set(0);
    }
    d.samples.push({ x: e.clientX, time: e.timeStamp });
    if (d.samples.length > 5) d.samples.shift();
    // Breite einer Seite; bei der Doppelseite wandert die Kante über den Bund, also zwei Breiten
    const w = bookRef.current.getBoundingClientRect().width / (swipe ? 1 : 2);
    const travel = clamp01(Math.abs(dx) / (w * (swipe ? 1.05 : 2)));
    const angle = Math.acos(1 - 2 * travel) / Math.PI;
    const s = invTurnEase(angle);
    const target = Math.max(0, Math.min(count, dx < 0 ? d.k0 + s : d.k0 - s));
    if (swipe) finger.set(target);
    else scrollToT(target);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.moved) return;
    suppressClick.current = true;
    const first = d.samples[0];
    const v = (e.clientX - first.x) / Math.max(1, e.timeStamp - first.time); // px pro ms
    const prog = (swipe ? finger.get() : raw.get()) - d.k0;
    let target = d.k0;
    if (prog > 0.28 || v < -0.35) target = d.k0 + 1;
    else if (prog < -0.28 || v > 0.35) target = d.k0 - 1;
    target = Math.max(0, Math.min(count, target));
    if (!swipe) goTo(target);
    else if (reduce) finger.set(target);
    else animate(finger, target, { type: "spring", stiffness: 210, damping: 26, velocity: -v * 2.2 });
  };

  // Klick aufs Papier blättert; Treffer auf Tafeln über Geometrie (Touch trifft in 3D-Seiten nicht zuverlässig)
  const onBookClick = (e: React.MouseEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
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
    const no = Math.min(plates.length, Math.max(1, Math.floor(((e.clientX - r.left) / r.width) * plates.length) + 1));
    if (no === scrubbed.current && e.type !== "pointerdown") return;
    scrubbed.current = no;
    goTo(stepForPlate(no));
  };

  const current = platesAt(mode, k);
  const label = labelAt(mode, k, count);

  return (
    <section
      ref={track}
      aria-label="Fotobuch Fujiventura"
      className={`relative ${className}`}
      style={{ height: swipe ? "100svh" : `${count * 85 + 100}svh` }}
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
            style={{ top: `calc(${s / count} * (100% - 100svh))` }}
          />
        ))}

      <motion.div
        data-stage
        className={`linen table-surface sticky top-0 flex h-svh flex-col overflow-hidden bg-table select-none ${swipe ? "touch-none" : ""}`}
        inert={!!viewer}
      >
        <SunAndShade />
        <header className="relative z-20 flex items-baseline justify-between px-4 pt-4 md:px-8 md:pt-6">
          <p
            className="text-on-table text-lg font-bold tracking-[-0.02em]"
            style={{ fontVariationSettings: '"wdth" 80' }}
          >
            Fujiventura
          </p>
          <p className="text-on-table-2 text-sm" aria-live="polite">
            <span className="text-on-table">
              <RollingLabel text={label} reduce={reduce} />
            </span>
            <span className="mx-2" aria-hidden>
              /
            </span>
            {plates.length} Tafeln
          </p>
        </header>

        {/* Bühne */}
        <div className="relative flex flex-1 items-center justify-center px-3 md:px-8">
          <PlateOpenProvider value={openPlate}>
            <motion.div
              ref={bookRef}
              className="relative cursor-grab active:cursor-grabbing"
              onDragStart={(e) => e.preventDefault()}
              onPointerMove={onPointerMove}
              onPointerLeave={onPointerLeave}
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onClick={onBookClick}
              style={{
                transform: bookTransform,
                width: mode === "spread" ? "calc(var(--pw) * 2)" : "var(--pw)",
                height: `calc(var(--pw) * ${mode === "spread" ? 1.3 : 1.46})`,
                ["--pw" as string]:
                  mode === "spread"
                    ? "min(calc((100vw - 64px) / 2), calc((100svh - 150px) / 1.3), 700px)"
                    : "min(calc(100vw - 24px), calc((100svh - 130px) / 1.46))",
              }}
            >
              {/* Schatten auf dem Tisch, nur unter dem geöffneten Teil */}
              <div
                aria-hidden
                className="absolute inset-0 shadow-[0_28px_50px_-18px_rgb(4_24_27/0.75),0_6px_14px_-6px_rgb(4_24_27/0.5)]"
                style={{ left: mode === "spread" ? "50%" : 0 }}
              />
              <motion.div
                aria-hidden
                className="absolute inset-y-0 left-0 shadow-[0_28px_50px_-18px_rgb(4_24_27/0.75)]"
                style={{ width: mode === "spread" ? "50%" : 0, opacity: open }}
              />

              {/* Papierkanten */}
              <motion.div
                aria-hidden
                className="absolute top-[0.6%] bottom-[0.6%] left-full w-[7px] origin-left bg-[repeating-linear-gradient(to_right,var(--paper)_0_1px,var(--paper-shade)_1px_2px)]"
                style={{ transform: rightEdgeT }}
              />
              {mode === "spread" && (
                <motion.div
                  aria-hidden
                  className="absolute top-[0.6%] right-full bottom-[0.6%] w-[7px] origin-right bg-[repeating-linear-gradient(to_left,var(--paper)_0_1px,var(--paper-shade)_1px_2px)]"
                  style={{ transform: leftEdgeT }}
                />
              )}

              {/* letzte Seite liegt unten rechts */}
              <div
                className="absolute inset-y-0 overflow-hidden"
                style={{ left: mode === "spread" ? "50%" : 0, width: mode === "spread" ? "50%" : "100%" }}
                inert={kt !== count}
              >
                {kt >= count - WINDOW ? (
                  <PageView page={base} side="right" compact={mode === "single"} />
                ) : (
                  <Blank page={base} />
                )}
              </div>

              {leaves.map((leaf, i) => (
                <LeafView key={i} leaf={leaf} i={i} count={count} t={t} peek={peek} mode={mode} k={kt} curl={curl} />
              ))}

              {bend && !reduce && (
                <PageCurl leaves={leaves} t={t} k={kt} mode={mode} store={curl} bookRef={bookRef} />
              )}

              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0"
                style={{ width: mode === "spread" ? "50%" : "100%" }}
              >
                <Curl side="right" amount={curlRight} flap={backTone(leaves[kt]?.back)} />
              </div>
              {mode === "spread" && (
                <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/2">
                  <Curl side="left" amount={curlLeft} flap={backTone(leaves[kt - 1]?.front)} />
                </div>
              )}

              {/* Blätterknöpfe für Tastatur und Screenreader, an den Außenkanten */}
              <button
                type="button"
                aria-label="Zurückblättern"
                disabled={k === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(k - 1);
                }}
                className="absolute inset-y-0 left-0 z-[200] w-[7%] focus-visible:outline-ink focus-visible:-outline-offset-4 disabled:pointer-events-none"
              />
              <button
                type="button"
                aria-label="Weiterblättern"
                disabled={k === count}
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(k + 1);
                }}
                className="absolute inset-y-0 right-0 z-[200] w-[7%] focus-visible:outline-ink focus-visible:-outline-offset-4 disabled:pointer-events-none"
              />
            </motion.div>
          </PlateOpenProvider>
        </div>

        {/* Bildfolge als Linie mit Haltepunkten */}
        <nav
          aria-label="Bildfolge"
          className="relative z-20 mx-auto w-full max-w-[680px] px-6 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:pb-7"
        >
          <motion.p
            aria-hidden
            className="text-on-table-2 absolute -top-3 left-0 w-full text-center text-sm"
            style={{ opacity: hint }}
          >
            {swipe ? "Wischen zum Blättern" : "Scrollen zum Blättern"}
          </motion.p>
          {/* Scrub-Leiste: tippen oder ziehen springt zur nächsten Tafel; die Knöpfe bleiben für die Tastatur */}
          <div
            className="relative h-6 cursor-pointer touch-none"
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
              style={{ left: `${50 / plates.length}%`, right: `${50 / plates.length}%` }}
            />
            <motion.div
              aria-hidden
              className="absolute top-1/2 h-px origin-left bg-mark"
              style={{ transform: fillT, left: `${50 / plates.length}%`, right: `${50 / plates.length}%` }}
            />
            <ol className="absolute inset-0 flex">
              {plates.map((p) => {
                const active = current.includes(p.no);
                return (
                  <li key={p.no} className="group relative flex min-w-0 flex-1 justify-center">
                    <button
                      type="button"
                      onClick={() => goTo(stepForPlate(p.no))}
                      aria-label={`Tafel ${p.no}: ${p.title}`}
                      aria-current={active ? "true" : undefined}
                      className="flex h-6 w-full max-w-6 items-center justify-center"
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
        </nav>
      </motion.div>

      {viewer && (
        <PlateViewer no={viewer.no} from={viewer.from} reduce={reduce} findRect={findRect} onClose={closePlate} />
      )}
    </section>
  );
}
