"use client";

import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { type BookData } from "@/content/books";
import { PageView } from "@/components/page-view";
import { SunAndShade } from "@/components/sun-and-shade";

/** Aufschlagen eines Bands; kommt aus der Library, damit Tisch und Reihen nichts vom Hash oder der View Transition wissen */
export const OpenBook = createContext<{ open: (id: string) => void; focusId: string | null }>({ open: () => {}, focusId: null });

// Wie die Bücher in einer Reihe liegen: auf derselben Tischkante, nur leicht gedreht
const ROT = [-1.5, 1, -0.8, 1.4, -1.2, 0.6];

/** Breite des Einbands in der Reihe, das größte Buch ist der Maßstab */
// --tw ist auf dem Telefon eine halbe Spalte, sonst höchstens 232px
const coverSizes = (book: BookData) => (w: number) => {
  const f = (book.scale * w) / 100;
  return `(min-width: 768px) ${Math.ceil(248 * f)}px, ${Math.ceil(46 * f)}vw`;
};

const coverWidth = (book: BookData) => `calc(var(--tw) * ${book.scale})`;

// Ein einzelnes Buch für den Gast: groß und mittig, aber so, dass Zettel, Titel und Knopf noch auf den Schirm passen
// --reserve: Höhe für Kopf, Zettel und Knopf; quer stehen Zettel und Knopf neben dem Buch
const featureWidth = (book: BookData) => `max(7rem, min(64vw, 380px, calc((100svh - var(--reserve)) / ${book.aspect})))`;
const featureSizes = (book: BookData) => (w: number) => {
  const f = (book.scale * w) / 100;
  return `(min-width: 768px) ${Math.ceil(380 * f)}px, ${Math.ceil(64 * f)}vw`;
};

// Beim ersten Erscheinen in diesem Tab werden die Bücher einmal hingelegt; danach (z. B. nach dem Zuklappen) liegen sie einfach da
let laidOnce = false;

export function ClosedBook({
  book,
  index,
  actions,
  note,
  meta,
  feature = false,
  bare = false,
  decor,
  onPick,
  className = "",
}: {
  book: BookData;
  index: number;
  actions?: ReactNode;
  note?: string;
  meta?: ReactNode;
  /** einzeln und groß, mit Knopf zum Aufschlagen (Gastlink) */
  feature?: boolean;
  /** nur der Einband, ohne Zeilen darunter (Karussell im Bücherzimmer) */
  bare?: boolean;
  /** liegt mit auf dem Buch, z. B. Zettel, die oben herausschauen */
  decor?: ReactNode;
  /** vor dem Aufschlagen gefragt; true heißt erledigt, das Buch bleibt zu */
  onPick?: () => boolean;
  className?: string;
}) {
  const { open, focusId } = useContext(OpenBook);
  const button = useRef<HTMLButtonElement>(null);
  const edge = Math.round(3 + book.spreads.length / 3);
  // alle Bände, die mit dem ersten Schwung kommen, werden hingelegt; spätere liegen einfach da
  const [arrive] = useState(() => !laidOnce);
  useEffect(() => {
    laidOnce = true;
  }, []);

  // Zurück vom offenen Buch: der Fokus steht wieder auf diesem Band
  useEffect(() => {
    if (focusId === book.id) button.current?.focus({ preventScroll: true });
  }, [focusId, book.id]);

  return (
    <li
      className={`table-book relative ${arrive ? "arrive" : ""} ${className} ${feature ? "grid justify-items-center [--reserve:22rem] flat:flex flat:items-center flat:[--reserve:7.5rem]" : ""}`}
      style={
        {
          ["--rot" as string]: `${ROT[index % ROT.length]}deg`,
          ["--i" as string]: index,
          ...(feature && { ["--tw" as string]: featureWidth(book) }),
        } as CSSProperties
      }
    >
      <button
        ref={button}
        type="button"
        onClick={() => !onPick?.() && open(book.id)}
        aria-label={`${book.title} aufschlagen, ${book.plates.length} Tafeln${note ? `, ${note}` : ""}`}
        className="group relative block text-left focus-visible:outline-offset-8"
      >
        <div className="lift relative" style={{ width: coverWidth(book), aspectRatio: `1 / ${book.aspect}` }}>
          {/* Zettel unter dem Einband: von wem das Buch kommt */}
          {note &&
            (feature ? (
              // Am Unterrand festgemacht: der Zettel steckt immer gleich tief unter dem Einband, der Text bleibt darüber frei
              <span
                aria-hidden
                className="slip text-ink absolute right-[-6%] bottom-[calc(100%-2.25rem)] w-[max(72%,min(15rem,72vw))] rotate-[4deg] px-3 pt-2 pb-10 font-semibold shadow-[2px_4px_10px_-4px_rgb(12_10_8/0.7)] flat:top-[10%] flat:right-auto flat:bottom-auto flat:left-[calc(100%-2.25rem)] flat:w-[min(12rem,30vw)] flat:pt-3 flat:pb-4 flat:pl-12"
                style={{ fontFamily: "var(--font-hand), cursive", fontSize: "1.375rem", lineHeight: 1.1 }}
              >
                {note}
              </span>
            ) : (
              <span aria-hidden className="slip text-ink absolute -top-[12%] -right-[8%] w-[64%] rotate-[5deg] px-2 pt-1 pb-8 text-[11px] md:text-[12px] leading-tight font-semibold shadow-[2px_4px_10px_-4px_rgb(12_10_8/0.7)]">
                {note}
              </span>
            ))}
          {decor}
          {/* Schatten auf dem Tisch, das Licht kommt von oben rechts; beim Anheben blendet ein weicherer dazu */}
          <div aria-hidden className="book-shadow-closed absolute inset-0" />
          <div
            aria-hidden
            className="lift-shadow book-shadow-lift absolute inset-0 opacity-0 transition-opacity duration-200 ease-out"
          />
          {/* Buchblock: Papierkanten rechts, so dick wie das Buch Seiten hat */}
          <div
            aria-hidden
            className="book-block-r absolute top-[1.2%] bottom-[0.4%] left-full"
            style={{ width: edge }}
          />
          <div aria-hidden className="absolute inset-0" style={{ viewTransitionName: `cover-${book.id}` }}>
            <PageView book={book} page={{ kind: "cover" }} side="right" eager={index < 2} sizes={feature || bare ? featureSizes(book) : coverSizes(book)} />
          </div>
        </div>
      </button>
      {bare ? null : feature ? (
        <div
          className="mt-6 grid w-[min(var(--info-w),calc(100vw-2rem))] justify-items-center gap-3 text-center text-sm flat:mt-0 flat:ml-[min(12rem,30vw)] flat:w-[min(var(--info-w),34vw)] flat:justify-items-start flat:text-left"
          style={{ ["--info-w" as string]: `max(${coverWidth(book)}, 16rem)` }}
        >
          <p className="text-on-table-2">
            <span className="text-on-table text-base font-semibold">{book.title}</span>
            <span aria-hidden className="mx-2">
              ·
            </span>
            {meta ?? `${book.plates.length} Tafeln`}
          </p>
          {/* Der eine betonte Knopf der Ansicht: sagt, was man mit dem Buch tun kann */}
          <button
            type="button"
            onClick={() => open(book.id)}
            className="group/cta border-on-table text-on-table hover:bg-on-table hover:text-table border px-5 py-2.5 text-base font-semibold transition-colors duration-150"
          >
            Buch aufschlagen
            <span aria-hidden className="ml-2 inline-block transition-transform duration-500 ease-out group-hover/cta:translate-x-1">
              →
            </span>
          </button>
        </div>
      ) : (
        <div className="mt-4 grid gap-0.5 text-sm" style={{ width: coverWidth(book) }}>
          <p className="text-on-table text-base leading-snug font-semibold tracking-[-0.01em]">{book.title}</p>
          <p className="text-on-table-2">{meta ?? `${book.plates.length} Tafeln`}</p>
          {actions && <div className="book-actions mt-1.5 flex flex-wrap gap-x-4 gap-y-1">{actions}</div>}
        </div>
      )}
    </li>
  );
}

/**
 * Eine Reihe Bücher auf der Tischkante, mit eigener Überschrift.
 * Weitere Dinge (das leere Buch) kommen als `tiles` ans Ende der Reihe.
 */
export function Shelf({
  id,
  heading,
  books,
  note,
  meta,
  actions,
  tiles,
  feature = false,
  children,
}: {
  id?: string;
  heading?: string;
  books: BookData[];
  note?: (book: BookData) => string | undefined;
  meta?: (book: BookData) => ReactNode;
  actions?: (book: BookData) => ReactNode;
  tiles?: ReactNode;
  /** ein einzelnes Buch groß und mittig, mit Knopf zum Aufschlagen (Gastlink) */
  feature?: boolean;
  /** unter der Reihe, z. B. ein Fehler mit „Nochmal versuchen“ */
  children?: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={heading && id ? `${id}-h` : undefined} className={`grid gap-8 scroll-mt-6 ${feature ? "my-auto" : ""}`}>
      {heading && (
        <div className="border-on-table-2/60 flex items-baseline gap-3 border-t pt-3">
          <h2 id={id ? `${id}-h` : undefined} className="text-on-table text-[22px] font-bold tracking-[-0.015em]" style={{ fontVariationSettings: '"wdth" 80' }}>
            {heading}
          </h2>
          <span className="text-on-table-2 text-sm">{books.length}</span>
        </div>
      )}
      {(books.length > 0 || tiles) && (
        <ul className={feature ? "flex justify-center pt-24 flat:pt-0" : "shelf"}>
          {books.map((b, i) => (
            <ClosedBook key={b.id} book={b} index={i} actions={actions?.(b)} note={note?.(b)} meta={meta?.(b)} feature={feature} />
          ))}
          {tiles}
        </ul>
      )}
      {children}
    </section>
  );
}

/** Der Basalttisch: Licht, Kopf und darauf die Reihen */
export function Table({
  label,
  title,
  headerRight,
  children,
}: {
  label?: string;
  /** Überschrift links im Kopf; ohne Angabe die Wortmarke als h1 */
  title?: ReactNode;
  /** Rechts im Kopf, z. B. die Räume */
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={label ?? "Tisch mit Fotobüchern"} className="linen table-surface relative flex min-h-svh flex-col overflow-hidden bg-table">
      <SunAndShade light="sun" />
      <header className="relative z-20 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-16 md:pt-6">
        {title ?? (
          <h1 className="text-on-table text-lg font-bold tracking-[-0.02em]" style={{ fontVariationSettings: '"wdth" 80' }}>
            Calima
          </h1>
        )}
        {headerRight}
      </header>
      <div className="table-spread relative z-0 flex flex-1 flex-col gap-14 px-4 pt-10 pb-20 md:gap-16 md:px-16 md:pt-14 md:pb-28 flat:pt-4 flat:pb-6">{children}</div>
    </section>
  );
}
