"use client";

import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { plates, singlePages, spreads, type Page } from "@/content/plates";
import { PageView } from "@/components/page-view";
import { PlateOpenProvider, PlateViewer } from "@/components/plate-viewer";

type Mode = "spread" | "single";
type Leaf = { front: Page; back: Page };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
// Ein Blatt beschleunigt aus dem Liegen und setzt weich auf: ease-in-out
const turnEase = (s: number) => (s < 0.5 ? 4 * s * s * s : 1 - Math.pow(-2 * s + 2, 3) / 2);

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

function LeafView({
  leaf,
  i,
  count,
  t,
  peek,
  mode,
  k,
}: {
  leaf: Leaf;
  i: number;
  count: number;
  t: MotionValue<number>;
  peek: MotionValue<number>;
  mode: Mode;
  k: number;
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
  const backOpacity = useTransform(rot, [-120, -180], [1, mode === "single" ? 0 : 1]);
  const eager = i < 3;
  const compact = mode === "single";

  return (
    <motion.div
      className="absolute inset-y-0 origin-left [transform-style:preserve-3d] will-change-transform"
      style={{
        transform,
        zIndex,
        left: mode === "spread" ? "50%" : 0,
        width: mode === "spread" ? "50%" : "100%",
      }}
    >
      {/* verdeckte Seiten sind für Tastatur und Screenreader nicht da */}
      <div className="absolute inset-0 overflow-hidden [backface-visibility:hidden]" inert={k !== i}>
        <PageView page={leaf.front} side="right" eager={eager} compact={compact} />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-30 bg-[linear-gradient(to_right,rgb(0_0_0/0.55),rgb(0_0_0/0.15))]"
          style={{ opacity: frontShade }}
        />
      </div>
      <motion.div
        className="absolute inset-0 overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)]"
        style={{ opacity: backOpacity }}
        inert={k !== i + 1 || mode === "single"}
      >
        <PageView page={leaf.back} side="left" eager={eager} compact={compact} />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-30 bg-[linear-gradient(to_left,rgb(0_0_0/0.55),rgb(0_0_0/0.15))]"
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
          background: `linear-gradient(${dir}, rgb(0 0 0 / 0.28) 50%, var(--paper-shade) 66%, var(--paper) 100%)`,
        }}
      />
      {/* Lasche: Rückseite des Blatts, zur Falte hin aufgehellt */}
      <div className="absolute inset-0 [filter:drop-shadow(-3px_-3px_5px_rgb(4_24_27/0.28))]">
        <div
          className="absolute inset-0"
          style={{
            clipPath: right ? "polygon(0 0, 100% 0, 0 100%)" : "polygon(0 0, 100% 0, 100% 100%)",
            background: `linear-gradient(${dir}, color-mix(in oklab, var(--flap) 82%, black) 0%, var(--flap) 34%, color-mix(in oklab, var(--flap) 70%, white) 49%, var(--flap) 50%)`,
          }}
        />
      </div>
    </motion.div>
  );
}

export function Book({ mode, className = "" }: { mode: Mode; className?: string }) {
  const { leaves, base } = buildLeaves(mode);
  const count = leaves.length;
  const reduce = useReducedMotion() ?? false;

  const track = useRef<HTMLElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const stops = useRef<(HTMLDivElement | null)[]>([]);
  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });

  const raw = useTransform(scrollYProgress, (p) => p * count);
  // Feder auf dem Scrollwert: das Blatt hat Masse und läuft nach
  const sprung = useSpring(raw, { stiffness: 150, damping: 26, mass: 0.7 });
  const stepped = useTransform(raw, (v) => Math.round(v));
  const t = reduce ? stepped : sprung;

  const peek = useSpring(0, { stiffness: 260, damping: 22 });
  const curlR = useSpring(0, { stiffness: 420, damping: 30 });
  const curlL = useSpring(0, { stiffness: 420, damping: 30 });
  const hoverable = useRef(false);

  const [k, setK] = useState(0);
  useMotionValueEvent(raw, "change", (v) => setK(Math.round(v)));

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

  // Fahrplan-Linie: Position in der Bildfolge 0..1
  const progressAt = (step: number) => {
    const ps = platesAt(mode, step);
    if (ps.length) return (ps.reduce((a, b) => a + b, 0) / ps.length - 1) / (plates.length - 1);
    return step <= 1 ? 0 : 1;
  };
  const range = Array.from({ length: count + 1 }, (_, s) => s);
  const fill = useTransform(t, range, range.map(progressAt));
  const fillT = useMotionTemplate`scaleX(${fill})`;
  const hint = useTransform(t, [0, 0.35], [1, 0]);

  const goTo = useCallback(
    (step: number, instant = false) => {
      const target = stops.current[Math.max(0, Math.min(count, step))];
      if (!target) return;
      const top = target.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top, behavior: reduce || instant ? "auto" : "smooth" });
    },
    [count, reduce],
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

  // Einmal zu Beginn hebt sich der Einband ein Stück: hier lässt sich blättern
  useEffect(() => {
    if (reduce || window.scrollY > 10) return;
    const c = animate(peek, [0, -28, 0], { duration: 1.8, delay: 0.9, ease: [0.77, 0, 0.175, 1] });
    return () => c.stop();
  }, [peek, reduce]);

  // Maus über dem Buch: Ecke der Seite, auf die man zeigt, klappt um
  const onPointerMove = (e: React.PointerEvent) => {
    if (!hoverable.current || reduce || !bookRef.current) return;
    const r = bookRef.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const onRight = mode === "single" ? x > 0.35 : x > 0.5;
    curlR.set(onRight && k < count ? 1 : 0);
    curlL.set(!onRight && mode === "spread" && k > 0 ? 1 : 0);
  };
  const onPointerLeave = () => {
    curlR.set(0);
    curlL.set(0);
  };
  // Klick aufs Papier blättert; Tafeln fangen ihren Klick selbst ab
  const onBookClick = (e: React.MouseEvent) => {
    if (!bookRef.current) return;
    // Treffer über Geometrie: Touch trifft in 3D-Seiten nicht zuverlässig den Knopf
    for (const no of platesAt(mode, k)) {
      const pr = findRect(no);
      if (pr && e.clientX >= pr.left && e.clientX <= pr.right && e.clientY >= pr.top && e.clientY <= pr.bottom) {
        const trigger = Array.from(
          bookRef.current.querySelectorAll<HTMLElement>(`[data-plate-box="${no}"] button`),
        ).find((el) => !el.closest("[inert]"));
        if (trigger) openPlate(no, trigger);
        return;
      }
    }
    const r = bookRef.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    if (x > (mode === "single" ? 0.35 : 0.5)) goTo(k + 1);
    else goTo(k - 1);
  };

  const current = platesAt(mode, k);
  const label = labelAt(mode, k, count);

  return (
    <section
      ref={track}
      aria-label="Fotobuch Fujiventura"
      className={`relative ${className}`}
      style={{ height: `${count * 85 + 100}dvh` }}
    >
      {/* Rastpunkte: jedes offene Doppelblatt ist ein Haltepunkt */}
      {range.map((s) => (
        <div
          key={s}
          ref={(el) => {
            stops.current[s] = el;
          }}
          aria-hidden
          className="absolute h-px w-px snap-start"
          style={{ top: `calc(${s / count} * (100% - 100dvh))` }}
        />
      ))}

      <div data-stage className="linen sticky top-0 flex h-dvh flex-col overflow-hidden bg-table" inert={!!viewer}>
        <header className="flex items-baseline justify-between px-4 pt-4 md:px-8 md:pt-6">
          <p
            className="text-on-table text-lg font-bold tracking-[-0.02em]"
            style={{ fontVariationSettings: '"wdth" 80' }}
          >
            Fujiventura
          </p>
          <p className="text-on-table-2 text-sm" aria-live="polite">
            <span className="text-on-table">{label}</span>
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
              className="relative cursor-pointer"
              onPointerMove={onPointerMove}
              onPointerLeave={onPointerLeave}
              onClick={onBookClick}
              style={{
                transform: bookTransform,
                width: mode === "spread" ? "calc(var(--pw) * 2)" : "var(--pw)",
                height: `calc(var(--pw) * ${mode === "spread" ? 1.3 : 1.46})`,
                ["--pw" as string]:
                  mode === "spread"
                    ? "min(calc((100vw - 64px) / 2), calc((100dvh - 150px) / 1.3), 700px)"
                    : "min(calc(100vw - 24px), calc((100dvh - 130px) / 1.46))",
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
                inert={k !== count}
              >
                <PageView page={base} side="right" compact={mode === "single"} />
              </div>

              {leaves.map((leaf, i) => (
                <LeafView key={i} leaf={leaf} i={i} count={count} t={t} peek={peek} mode={mode} k={k} />
              ))}

              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0"
                style={{ width: mode === "spread" ? "50%" : "100%" }}
              >
                <Curl side="right" amount={curlRight} flap={backTone(leaves[k]?.back)} />
              </div>
              {mode === "spread" && (
                <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/2">
                  <Curl side="left" amount={curlLeft} flap={backTone(leaves[k - 1]?.front)} />
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
                className="absolute inset-y-0 left-0 z-[200] w-[7%] cursor-w-resize focus-visible:outline-ink focus-visible:-outline-offset-4 disabled:pointer-events-none"
              />
              <button
                type="button"
                aria-label="Weiterblättern"
                disabled={k === count}
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(k + 1);
                }}
                className="absolute inset-y-0 right-0 z-[200] w-[7%] cursor-e-resize focus-visible:outline-ink focus-visible:-outline-offset-4 disabled:pointer-events-none"
              />
            </motion.div>
          </PlateOpenProvider>
        </div>

        {/* Bildfolge als Linie mit Haltepunkten */}
        <nav aria-label="Bildfolge" className="relative mx-auto w-full max-w-[680px] px-6 pt-2 pb-5 md:pb-7">
          <motion.p
            aria-hidden
            className="text-on-table-2 absolute -top-3 left-0 w-full text-center text-sm"
            style={{ opacity: hint }}
          >
            Scrollen zum Blättern
          </motion.p>
          <div className="relative h-6">
            <div aria-hidden className="absolute top-1/2 right-[12px] left-[12px] h-px bg-on-table-2/40" />
            <motion.div
              aria-hidden
              className="absolute top-1/2 right-[12px] left-[12px] h-px origin-left bg-cloth"
              style={{ transform: fillT }}
            />
            <ol className="absolute inset-0 flex justify-between">
              {plates.map((p) => {
                const active = current.includes(p.no);
                return (
                  <li key={p.no} className="group relative flex">
                    <button
                      type="button"
                      onClick={() => goTo(stepForPlate(p.no))}
                      aria-label={`Tafel ${p.no}: ${p.title}`}
                      aria-current={active ? "true" : undefined}
                      className="flex h-6 w-6 items-center justify-center"
                    >
                      <span
                        aria-hidden
                        className={`stop block h-2.5 w-[3px] ${active ? "scale-y-[1.9] bg-cloth" : "bg-on-table-2 group-hover:scale-y-150 group-hover:bg-on-table"}`}
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
      </div>

      {viewer && (
        <PlateViewer no={viewer.no} from={viewer.from} reduce={reduce} findRect={findRect} onClose={closePlate} />
      )}
    </section>
  );
}
