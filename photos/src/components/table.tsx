"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

import { type BookData } from "@/content/books";
import { INTRO_DONE } from "@/components/intro";
import { PageView } from "@/components/page-view";
import { SunAndShade } from "@/components/sun-and-shade";

// Wie die Bücher auf dem Tisch liegen: leicht gedreht und versetzt, nie in Reih und Glied
const POSE = [
  { rot: -4, y: 0 },
  { rot: 3, y: 40 },
  { rot: -2, y: 12 },
  { rot: 4, y: 52 },
];
const NUMBER = ["Kein", "Ein", "Zwei", "Drei", "Vier", "Fünf", "Sechs", "Sieben", "Acht", "Neun", "Zehn"];

/** Breite des Einbands auf dem Tisch, das größte Buch ist der Maßstab */
const coverWidth = (book: BookData) =>
  `calc(var(--tw) * ${book.scale})`;

function ClosedBook({ book, onOpen, index }: { book: BookData; onOpen: () => void; index: number }) {
  const pose = POSE[index % POSE.length];
  const edge = Math.round(3 + book.spreads.length / 3);
  return (
    <div
      className="table-book relative"
      style={{ ["--rot" as string]: `${pose.rot}deg`, ["--dy" as string]: `${pose.y}px` }}
      data-table-book
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${book.title} aufschlagen, ${book.plates.length} Tafeln`}
        className="group relative block text-left focus-visible:outline-offset-8"
      >
        <div
          className="lift relative"
          style={{ width: coverWidth(book), aspectRatio: `1 / ${book.aspect}` }}
        >
          {/* Schatten auf dem Tisch; beim Anheben blendet ein weicherer dazu */}
          <div aria-hidden className="absolute inset-0 shadow-[0_22px_40px_-16px_rgb(12_10_8/0.8),0_4px_10px_-4px_rgb(12_10_8/0.55)]" />
          <div
            aria-hidden
            className="absolute inset-0 opacity-0 shadow-[0_44px_60px_-22px_rgb(12_10_8/0.7)] transition-opacity duration-500 ease-out group-hover:opacity-100 group-focus-visible:opacity-100"
          />
          {/* Buchblock: Papierkanten rechts und unten, so dick wie das Buch Seiten hat */}
          <div
            aria-hidden
            className="absolute top-[1.2%] bottom-[0.4%] left-full bg-[repeating-linear-gradient(to_right,var(--paper)_0_1px,var(--paper-shade)_1px_2px)]"
            style={{ width: edge }}
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ viewTransitionName: `cover-${book.id}` }}
          >
            <PageView book={book} page={{ kind: "cover" }} side="right" eager />
          </div>
        </div>
      </button>
      <p className="text-on-table-2 mt-5 text-sm">
        <span className="text-on-table">{book.title}</span>
        <span className="mx-2" aria-hidden>
          ·
        </span>
        {book.plates.length} Tafeln
      </p>
    </div>
  );
}

export function Table({ books, onOpen }: { books: BookData[]; onOpen: (id: string) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion() ?? false;

  // Nach dem Einstieg hebt sich jedes Buch einmal kurz an: hier lässt sich etwas aufschlagen
  useEffect(() => {
    if (reduce || !root.current) return;
    const lifts = Array.from(root.current.querySelectorAll<HTMLElement>(".lift"));
    const anims: Animation[] = [];
    const nudge = () =>
      lifts.forEach((el, i) =>
        anims.push(
          el.animate([{ transform: "none" }, { transform: "translateY(-10px) rotate(-0.6deg)" }, { transform: "none" }], {
            duration: 1300,
            delay: 300 + i * 220,
            easing: "cubic-bezier(0.77, 0, 0.175, 1)",
          }),
        ),
      );
    if (document.documentElement.classList.contains("intro")) {
      window.addEventListener(INTRO_DONE, nudge, { once: true });
      return () => window.removeEventListener(INTRO_DONE, nudge);
    }
    const id = window.setTimeout(nudge, 400);
    return () => {
      window.clearTimeout(id);
      anims.forEach((a) => a.cancel());
    };
  }, [reduce]);

  return (
    <section
      aria-label="Tisch mit Fotobüchern"
      className="linen table-surface relative flex min-h-svh flex-col overflow-hidden bg-table"
      style={{
        // Einbandbreite auf dem Tisch: Doppelseiten-Format wie beim Lesen, nur kleiner
        ["--tw" as string]: "min(22vw, calc((100svh - 280px) / 1.5), 360px)",
      }}
    >
      <SunAndShade light="sun" />
      <header className="relative z-20 flex items-baseline justify-between px-4 pt-4 md:px-8 md:pt-6">
        <h1 className="text-on-table text-lg font-bold tracking-[-0.02em]" style={{ fontVariationSettings: '"wdth" 80' }}>
          Fujiventura
        </h1>
        <p className="text-on-table-2 text-sm">
          {NUMBER[books.length] ?? books.length} Bücher von Michel Leotta
        </p>
      </header>
      <div
        ref={root}
        className="table-spread relative z-0 flex flex-1 flex-col items-stretch gap-10 px-6 pt-10 pb-16 md:flex-row md:flex-wrap md:items-center md:justify-center md:gap-[7vw] md:px-8 md:pt-0 md:pb-10"
      >
        {books.map((b, i) => (
          <ClosedBook key={b.id} book={b} index={i} onOpen={() => onOpen(b.id)} />
        ))}
      </div>
    </section>
  );
}
