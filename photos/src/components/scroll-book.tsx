"use client";

import {
  motion,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValueEvent,
} from "motion/react";
import { useMemo, useRef, useState, useSyncExternalStore, type RefObject } from "react";

import type { BookData } from "@/content/books";
import { Blank, buildLeaves, LeafView, pagesAt, platesOn, WINDOW, type Mode } from "@/components/book";
import { createCurlStore, PageCurl } from "@/components/page-curl";
import { PageView } from "@/components/page-view";

// Das Buch der Landing: dieselben Blätter, dieselbe Biegung (WebGL) und dieselbe Feder wie in der Leseansicht,
// angetrieben vom Scrollen durch den Kopf der Seite. Nur zum Ansehen: kein Klick, keine Tastatur.

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const noopSubscribe = () => () => {};

export function ScrollBook({
  book,
  mode,
  track,
  width,
}: {
  book: BookData;
  mode: Mode;
  /** Abschnitt, durch den gescrollt wird: oben = zu, unten = letzte Doppelseite */
  track: RefObject<HTMLElement | null>;
  /** Breite des ganzen Buchs (aufgeschlagen) als CSS-Länge */
  width: string;
}) {
  const { leaves, base } = useMemo(() => buildLeaves(book, mode), [book, mode]);
  const curl = useMemo(() => createCurlStore(), []);
  const bookRef = useRef<HTMLDivElement>(null);
  const bend = useSyncExternalStore(
    noopSubscribe,
    () => !document.documentElement.classList.contains("ohne-biegung"),
    () => false,
  );
  const reduce = useReducedMotion() ?? false;
  const count = leaves.length;
  const nPlates = book.plates.length;

  // gleiche Feder wie die Leseansicht, damit sich das Blättern genauso anfühlt
  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });
  const raw = useTransform(scrollYProgress, (p) => p * count);
  const sprung = useSpring(raw, { stiffness: 150, damping: 26, mass: 0.7 });
  const stepped = useTransform(raw, (v) => Math.min(count, Math.round(v)));
  const t = reduce ? stepped : sprung;

  const [kt, setKt] = useState(0);
  useMotionValueEvent(t, "change", (v) => setKt(Math.min(count, Math.max(0, Math.round(v)))));

  // Zu liegt das Buch flach und mittig auf dem Tisch; beim Aufschlagen richtet es sich auf
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
  const edge = Math.round(6 + count);

  // Bildfolge wie in der Leseansicht
  const range = Array.from({ length: count + 1 }, (_, s) => s);
  const progressAt = (step: number) => {
    const ps = platesOn(pagesAt(book, mode, step));
    if (ps.length) return (ps.reduce((a, b) => a + b, 0) / ps.length - 1) / Math.max(1, nPlates - 1);
    return step <= 1 ? 0 : 1;
  };
  const fill = useTransform(t, range, range.map(progressAt));
  const fillT = useMotionTemplate`scaleX(${fill})`;
  const current = platesOn(pagesAt(book, mode, kt));

  return (
    <div aria-hidden inert className="flex flex-col items-center select-none">
      <motion.div
        ref={bookRef}
        className="relative"
        style={{
          transform: bookTransform,
          width,
          aspectRatio: mode === "spread" ? `2 / ${book.aspect}` : `1 / ${book.aspect}`,
        }}
      >
        {/* Schatten auf dem Tisch: unter dem rechten Teil immer, unter dem linken erst aufgeschlagen */}
        <div
          className="absolute inset-0 shadow-[0_34px_60px_-20px_rgb(12_10_8/0.8),0_8px_18px_-8px_rgb(12_10_8/0.55)]"
          style={{ left: mode === "spread" ? "50%" : 0 }}
        />
        <motion.div
          className="absolute inset-y-0 left-0 shadow-[0_34px_60px_-20px_rgb(12_10_8/0.8),0_8px_18px_-8px_rgb(12_10_8/0.55)]"
          style={{ width: mode === "spread" ? "50%" : 0, opacity: open }}
        />

        {/* Buchblock: so dick wie das Buch Blätter hat, Blatt für Blatt gestreift */}
        <motion.div
          className="absolute top-[0.6%] bottom-[0.6%] left-full origin-left bg-[repeating-linear-gradient(to_right,var(--paper)_0_1px,var(--paper-shade)_1px_2px)]"
          style={{ transform: rightEdgeT, width: edge }}
        />
        {mode === "spread" && (
          <motion.div
            className="absolute top-[0.6%] right-full bottom-[0.6%] origin-right bg-[repeating-linear-gradient(to_left,var(--paper)_0_1px,var(--paper-shade)_1px_2px)]"
            style={{ transform: leftEdgeT, width: edge }}
          />
        )}

        <div
          className="absolute inset-y-0 overflow-hidden"
          style={{ left: mode === "spread" ? "50%" : 0, width: mode === "spread" ? "50%" : "100%" }}
        >
          {kt >= count - WINDOW ? <PageView book={book} page={base} side="right" /> : <Blank book={book} page={base} />}
        </div>

        {leaves.map((leaf, i) => (
          <LeafView key={i} book={book} leaf={leaf} i={i} count={count} t={t} mode={mode} k={kt} curl={curl} />
        ))}

        {bend && !reduce && <PageCurl book={book} leaves={leaves} t={t} k={kt} mode={mode} store={curl} bookRef={bookRef} />}
      </motion.div>

      {/* Bildfolge: ein Haltepunkt je Foto, gefüllt bis zur aufgeschlagenen Seite */}
      <div className="relative mt-8 h-6 w-full max-w-[320px] md:mt-12">
        <div className="bg-on-table-2/40 absolute top-1/2 h-px" style={{ left: `${50 / nPlates}%`, right: `${50 / nPlates}%` }} />
        <motion.div
          className="bg-mark absolute top-1/2 h-px origin-left"
          style={{ transform: fillT, left: `${50 / nPlates}%`, right: `${50 / nPlates}%` }}
        />
        <ol className="absolute inset-0 flex">
          {book.plates.map((p) => (
            <li key={p.no} className="flex flex-1 items-center justify-center">
              <span
                className={`stop block h-2.5 w-[3px] ${current.includes(p.no) ? "bg-mark scale-y-[1.9]" : "bg-on-table-2"}`}
              />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
