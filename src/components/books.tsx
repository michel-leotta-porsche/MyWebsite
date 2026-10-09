"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { flushSync } from "react-dom";

import type { BookData } from "@/content/books";
import { OpenBook } from "@/components/table";
import { useReducedMotion } from "@/lib/use-reduced-motion";

// Das offene Buch (Umblättern in WebGL, Bewegung, Rezeptzettel) ist der größte Teil des Codes.
// Es kommt nicht mit dem ersten Laden, sondern danach im Leerlauf oder spätestens beim Aufschlagen.
type BookComponent = typeof import("@/components/book").Book;
let LoadedBook: BookComponent | null = null;
let loading: Promise<unknown> | null = null;
const loadBook = () => (loading ??= import("@/components/book").then((m) => (LoadedBook = m.Book)));

type View = { id: string; auto: boolean; plate?: number } | null;

// Der Hash ist der Zustand: welches Buch liegt offen
const HASH = "fuji:hash";
const subscribeHash = (f: () => void) => {
  window.addEventListener("popstate", f);
  window.addEventListener(HASH, f);
  return () => {
    window.removeEventListener("popstate", f);
    window.removeEventListener(HASH, f);
  };
};
const readHash = () => decodeURIComponent(location.hash.slice(1));

/**
 * Der Tisch mit allen Büchern, oder ein aufgeschlagenes Buch. Kein Router: der Hash merkt sich das Buch
 * (#fuerteventura, #japan), damit Links und die Zurück-Taste funktionieren.
 * Doppelseiten ab Tablet, Einzelseiten zum Wischen auf dem Telefon; es bleibt immer nur eine Bindung im DOM.
 */
export function Library({
  books,
  children,
  before,
  footer,
  bookExtra,
  ears,
  onEar,
  onEdit,
}: {
  books: BookData[];
  /** Der Tisch mit seinen Reihen; jede Reihe schlägt ihre Bände über OpenBook auf */
  children: ReactNode;
  /** Über dem Tisch, nur solange kein Buch offen ist (z. B. der Kopf der Landing Page) */
  before?: ReactNode;
  footer?: ReactNode;
  /** Zusätzliche Knöpfe in der Kopfzeile des offenen Buchs */
  bookExtra?: (book: BookData, plates: number[]) => ReactNode;
  /** Eselsohren im offenen Buch (fest oder je Buch) und was beim Antippen der Ecke passiert (fest oder je Buch) */
  ears?: number[] | Record<string, number[]>;
  onEar?: ((no: number) => void) | Record<string, (no: number) => void>;
  /** Nur für eigene Bücher: was langes Drücken oder „Bearbeiten“ im offenen Buch tut; undefined, wenn das Buch nicht dir gehört */
  onEdit?: (id: string) => ((step: number) => void) | undefined;
}) {
  const bookById = (id: string) => books.find((b) => b.id === id);
  const [wide, setWide] = useState<boolean | null>(null);
  const hash = useSyncExternalStore(subscribeHash, readHash, () => "");
  // vom Tisch genommen: der Einband schlägt sich von selbst auf; per Link oder Zurück-Taste nicht
  const [autoId, setAutoId] = useState<string | null>(null);
  // Tafel, an der das Buch aufgehen soll; gilt nur für das eine Aufschlagen
  const [startPlate, setStartPlate] = useState<number | undefined>(undefined);
  const view: View = books.some((b) => b.id === hash) ? { id: hash, auto: autoId === hash } : null;
  const reduce = useReducedMotion();
  const [bookReady, setBookReady] = useState(LoadedBook !== null);

  // Wechsel zwischen Tisch und Buch: der Einband fliegt per View Transition an seinen neuen Platz
  const change = useCallback(
    (next: View, push = true) => {
      const run = () => {
        flushSync(() => {
          setAutoId(next?.auto ? next.id : null);
          setStartPlate(next?.plate);
          if (push) history.pushState(null, "", next ? `#${next.id}` : location.pathname + location.search);
          window.dispatchEvent(new Event(HASH));
        });
        window.scrollTo({ top: 0, behavior: "instant" });
      };
      const go = () => {
        const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
        if (doc.startViewTransition && !reduce) doc.startViewTransition(run);
        else run();
      };
      // erst wenn der Code des Buchs da ist, sonst fliegt der Einband ins Leere
      if (next && !LoadedBook) loadBook().then(go, go);
      else go();
    },
    [reduce],
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Buch per Link (#japan) sofort holen, sonst erst, wenn die Seite fertig geladen ist und Ruhe herrscht
  const linked = view !== null;
  useEffect(() => {
    if (bookReady) return;
    let alive = true;
    let timer = 0;
    // Safari kennt requestIdleCallback erst seit Kurzem
    const ric = (window as Partial<Window>).requestIdleCallback;
    const fetchBook = () => loadBook().then(() => alive && setBookReady(true));
    const idle = () => {
      timer = ric ? ric(fetchBook, { timeout: 4000 }) : window.setTimeout(fetchBook, 1000);
    };
    if (linked) fetchBook();
    else if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });
    return () => {
      alive = false;
      window.removeEventListener("load", idle);
      if (ric) cancelIdleCallback(timer);
      else window.clearTimeout(timer);
    };
  }, [linked, bookReady]);

  const book = view ? bookById(view.id) : undefined;
  const edit = view ? onEdit?.(view.id) : undefined;
  // Zurück auf dem Tisch steht der Fokus wieder auf dem Band, der offen war
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const close = useCallback(() => {
    setReturnTo(view?.id ?? null);
    change(null);
  }, [change, view?.id]);
  // bis der Code da ist, bleibt der Tisch liegen (wie im HTML vom Server)
  const Book = bookReady ? LoadedBook : null;

  if (book && wide !== null && Book) {
    return (
      <Book
        key={book.id}
        book={book}
        // auch auf dem Telefon die ganze Doppelseite, wie das Buch auf der Startseite
        mode="spread"
        autoOpen={view?.auto ?? false}
        startPlate={view?.auto ? startPlate : undefined}
        onClose={close}
        extra={bookExtra}
        ears={Array.isArray(ears) ? ears : ears?.[book.id]}
        onEar={typeof onEar === "function" ? onEar : onEar?.[book.id]}
        onEdit={edit}
      />
    );
  }

  return (
    <>
      {before}
      <OpenBook value={{ open: (id, plate) => change({ id, auto: true, plate }), focusId: returnTo }}>{children}</OpenBook>
      {footer}
    </>
  );
}
