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

function LeafView({
  leaf,
  i,
  count,
  t,
  peekR,
  peekL,
  mode,
}: {
  leaf: Leaf;
  i: number;
  count: number;
  t: MotionValue<number>;
  peekR: MotionValue<number>;
  peekL: MotionValue<number>;
  mode: Mode;
}) {
  const rot = useTransform<number, number>([t, peekR, peekL], ([tv, pr, pl]) => {
    const s = clamp01(tv - i);
    let r = -180 * turnEase(s);
    const k = Math.round(tv);
    // Ecke heben: oberstes Blatt rechts, oberstes Blatt links
    if (Math.abs(tv - k) < 0.02) {
      if (i === k) r += pr;
      if (i === k - 1) r += pl;
    }
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
      <div className="absolute inset-0 overflow-hidden [backface-visibility:hidden]">
        <PageView page={leaf.front} side="right" eager={eager} />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(to_right,rgb(0_0_0/0.55),rgb(0_0_0/0.15))]"
          style={{ opacity: frontShade }}
        />
      </div>
      <motion.div
        className="absolute inset-0 overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)]"
        style={{ opacity: backOpacity }}
      >
        <PageView page={leaf.back} side="left" eager={eager} />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(to_left,rgb(0_0_0/0.55),rgb(0_0_0/0.15))]"
          style={{ opacity: backShade }}
        />
      </motion.div>
    </motion.div>
  );
}

export function Book({ mode, className = "" }: { mode: Mode; className?: string }) {
  const { leaves, base } = buildLeaves(mode);
  const count = leaves.length;
  const reduce = useReducedMotion();

  const track = useRef<HTMLElement>(null);
  const stops = useRef<(HTMLDivElement | null)[]>([]);
  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });

  const raw = useTransform(scrollYProgress, (p) => p * count);
  // Feder auf dem Scrollwert: das Blatt hat Masse und läuft nach
  const sprung = useSpring(raw, { stiffness: 150, damping: 26, mass: 0.7 });
  const stepped = useTransform(raw, (v) => Math.round(v));
  const t = reduce ? stepped : sprung;

  const peekR = useSpring(0, { stiffness: 260, damping: 22 });
  const peekL = useSpring(0, { stiffness: 260, damping: 22 });
  const hoverable = useRef(false);

  const [k, setK] = useState(0);
  useMotionValueEvent(raw, "change", (v) => setK(Math.round(v)));

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
    (step: number) => {
      const target = stops.current[Math.max(0, Math.min(count, step))];
      if (!target) return;
      const top = target.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
    },
    [count, reduce],
  );

  const stepForPlate = (no: number) => {
    for (let s = 1; s <= count; s++) if (platesAt(mode, s).includes(no)) return s;
    return 0;
  };

  useEffect(() => {
    hoverable.current = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }, []);

  // Tastatur: Pfeile blättern, nur für das sichtbare Buch
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!track.current || track.current.offsetParent === null) return;
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea")) return;
      if (e.key === "ArrowRight") goTo(k + 1);
      else if (e.key === "ArrowLeft") goTo(k - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, k]);

  // Einmal zu Beginn hebt sich der Einband ein Stück: hier lässt sich blättern
  useEffect(() => {
    if (reduce || window.scrollY > 10) return;
    const c = animate(peekR, [0, -28, 0], { duration: 1.8, delay: 0.9, ease: [0.77, 0, 0.175, 1] });
    return () => c.stop();
  }, [peekR, reduce]);

  const peek = (side: "l" | "r", on: boolean) => {
    if (!hoverable.current || reduce) return;
    if (side === "r") peekR.set(on ? -22 : 0);
    else peekL.set(on ? 22 : 0);
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

      <div className="linen sticky top-0 flex h-dvh flex-col overflow-hidden bg-table">
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
        <div className="relative flex flex-1 items-center justify-center px-4 md:px-8">
          <motion.div
            className="relative"
            style={{
              transform: bookTransform,
              width: mode === "spread" ? "calc(var(--pw) * 2)" : "var(--pw)",
              height: "calc(var(--pw) * 1.3)",
              ["--pw" as string]:
                mode === "spread"
                  ? "min(calc((100vw - 64px) / 2), calc((100dvh - 190px) / 1.3), 620px)"
                  : "min(calc(100vw - 40px), calc((100dvh - 190px) / 1.3))",
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
            >
              <PageView page={base} side="right" />
            </div>

            {leaves.map((leaf, i) => (
              <LeafView
                key={i}
                leaf={leaf}
                i={i}
                count={count}
                t={t}
                peekR={peekR}
                peekL={peekL}
                mode={mode}
              />
            ))}

            {/* Blätterflächen: Klick, Tastatur und Ecke heben */}
            {mode === "spread" ? (
              <>
                <button
                  type="button"
                  aria-label="Zurückblättern"
                  disabled={k === 0}
                  onClick={() => goTo(k - 1)}
                  onPointerEnter={() => peek("l", true)}
                  onPointerLeave={() => peek("l", false)}
                  className="absolute inset-y-0 left-0 z-[200] w-1/2 cursor-w-resize disabled:cursor-default"
                />
                <button
                  type="button"
                  aria-label="Weiterblättern"
                  disabled={k === count}
                  onClick={() => goTo(k + 1)}
                  onPointerEnter={() => peek("r", true)}
                  onPointerLeave={() => peek("r", false)}
                  className="absolute inset-y-0 right-0 z-[200] w-1/2 cursor-e-resize disabled:cursor-default"
                />
              </>
            ) : (
              <>
                <button
                  type="button"
                  aria-label="Zurückblättern"
                  disabled={k === 0}
                  onClick={() => goTo(k - 1)}
                  className="absolute inset-y-0 left-0 z-[200] w-1/3"
                />
                <button
                  type="button"
                  aria-label="Weiterblättern"
                  disabled={k === count}
                  onClick={() => goTo(k + 1)}
                  className="absolute inset-y-0 right-0 z-[200] w-2/3"
                />
              </>
            )}
          </motion.div>
        </div>

        {/* Bildfolge als Linie mit Haltepunkten */}
        <nav aria-label="Bildfolge" className="relative mx-auto w-full max-w-[680px] px-6 pt-2 pb-6 md:pb-8">
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
                      className="text-on-table pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 translate-y-1 text-xs whitespace-nowrap opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100"
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
    </section>
  );
}
