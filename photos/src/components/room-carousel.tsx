"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import type { BookData } from "@/content/books";
import { ClosedBook } from "@/components/table";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/** Ein Platz im Karussell: ein Buch (mit dem, was darauf liegt) oder etwas anderes in Buchgröße, z. B. das leere Buch */
export type Slide = { key: string; book?: BookData; decor?: ReactNode; note?: string; tile?: ReactNode };

/**
 * Eine Reihe im Bücherzimmer als Karussell: ein Buch liegt groß in der Mitte, die Nachbarn schauen klein herein.
 * Wischen oder die Punkte wechseln das Buch; darunter steht, was zum Buch in der Mitte gehört (`panel`).
 * Ein Nachbar wird beim Antippen erst in die Mitte geholt, erst das Buch in der Mitte schlägt sich auf.
 */
export function Carousel({ id, heading, slides, panel, children }: { id: string; heading: string; slides: Slide[]; panel: (slide: Slide) => ReactNode; children?: ReactNode }) {
  const list = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const books = slides.filter((s) => s.book).length;
  const current = Math.min(active, Math.max(0, slides.length - 1));
  // die Reihe gibt es erst, wenn Bücher da sind
  const shown = slides.length > 0;

  // welches Buch gerade in der Mitte liegt, aus der Scrollposition
  useEffect(() => {
    const ul = list.current;
    if (!ul) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const mid = ul.scrollLeft + ul.clientWidth / 2;
      let best = 0;
      let dist = Infinity;
      Array.from(ul.children).forEach((el, i) => {
        const li = el as HTMLElement;
        const d = Math.abs(li.offsetLeft + li.offsetWidth / 2 - mid);
        if (d < dist) {
          dist = d;
          best = i;
        }
      });
      setActive(best);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    ul.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      ul.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [shown]);

  const go = (i: number) => {
    const ul = list.current;
    const li = ul?.children[i] as HTMLElement | undefined;
    if (!ul || !li) return;
    ul.scrollTo({ left: li.offsetLeft - (ul.clientWidth - li.offsetWidth) / 2, behavior: reduce ? "auto" : "smooth" });
    setActive(i);
  };

  const place = (i: number) => (i < current ? "is-before" : i > current ? "is-after" : "is-active");

  return (
    <section id={id} aria-labelledby={`${id}-h`} className="grid scroll-mt-6 gap-4">
      <div className="border-on-table-2/60 flex items-baseline gap-3 border-t pt-3">
        <h2 id={`${id}-h`} className="text-on-table text-[22px] font-bold tracking-[-0.015em]" style={{ fontVariationSettings: '"wdth" 80' }}>
          {heading}
        </h2>
        <span className="text-on-table-2 text-sm">{books}</span>
      </div>
      {shown && (
        <>
          <ul ref={list} className="carousel relative" aria-label={heading}>
            {slides.map((s, i) =>
              s.book ? (
                <ClosedBook
                  key={s.key}
                  book={s.book}
                  index={i}
                  note={s.note}
                  decor={s.decor}
                  bare
                  className={place(i)}
                  onPick={() => {
                    if (i === current) return false;
                    go(i);
                    return true;
                  }}
                />
              ) : (
                <li
                  key={s.key}
                  className={place(i)}
                  onClickCapture={(e) => {
                    if (i === current) return;
                    e.preventDefault();
                    e.stopPropagation();
                    go(i);
                  }}
                >
                  {s.tile}
                </li>
              ),
            )}
          </ul>
          {slides.length > 1 && (
            <div className="-mt-1 flex justify-center">
              {slides.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`${s.book?.title ?? "Neues Buch"}, ${i + 1} von ${slides.length}`}
                  aria-current={i === current}
                  className="group grid size-6 place-items-center"
                >
                  <span
                    aria-hidden
                    className={`size-1.5 rounded-full transition-colors duration-150 ${i === current ? "bg-mark" : "bg-on-table-2/50 group-hover:bg-on-table-2"}`}
                  />
                </button>
              ))}
            </div>
          )}
          <div className="mx-auto grid w-full max-w-xl">{panel(slides[current])}</div>
        </>
      )}
      {children}
    </section>
  );
}

/** Zettel, die oben aus dem Buch schauen: bei wem es liegt. Liegen unter dem Einband (früher im DOM) */
export function SlipTabs({ names }: { names: string[] }) {
  const shown = names.slice(0, 3);
  const rest = names.length - shown.length;
  return (
    <>
      {shown.map((n, i) => (
        <span
          key={n}
          aria-hidden
          className="slip text-ink absolute top-[-30px] h-16 w-[27%] truncate px-1.5 pt-1 text-center text-[19px] leading-tight shadow-[1px_2px_6px_-3px_rgb(12_10_8/0.7)]"
          style={{ left: `${10 + i * 29}%`, rotate: `${[-4, 3, -2][i]}deg`, fontFamily: "var(--font-hand), cursive" }}
        >
          {i === 2 && rest > 0 ? `${n} +${rest}` : n}
        </span>
      ))}
    </>
  );
}

/** Umgeknickte Ecke oben rechts auf dem Einband: ein Freund hat Eselsohren gemacht */
export function CoverEar() {
  return (
    <span aria-hidden className="absolute top-0 right-0 z-10 size-[17%]">
      <span className="bg-paper absolute inset-0 shadow-[-2px_2px_3px_rgb(12_10_8/0.35)] [clip-path:polygon(0_0,100%_100%,0_100%)]" />
      <span className="bg-table absolute inset-0 [clip-path:polygon(0_0,100%_0,100%_100%)]" />
    </span>
  );
}
