"use client";

import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

import { bookById, books } from "@/content/books";
import { Book } from "@/components/book";
import { Table } from "@/components/table";

type View = { id: string; auto: boolean } | null;

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
export function Library() {
  const [wide, setWide] = useState<boolean | null>(null);
  const hash = useSyncExternalStore(subscribeHash, readHash, () => "");
  // vom Tisch genommen: der Einband schlägt sich von selbst auf; per Link oder Zurück-Taste nicht
  const [autoId, setAutoId] = useState<string | null>(null);
  const view: View = bookById(hash) ? { id: hash, auto: autoId === hash } : null;
  const reduce = useReducedMotion() ?? false;

  // Wechsel zwischen Tisch und Buch: der Einband fliegt per View Transition an seinen neuen Platz
  const change = useCallback(
    (next: View, push = true) => {
      const run = () => {
        flushSync(() => {
          setAutoId(next?.auto ? next.id : null);
          if (push) history.pushState(null, "", next ? `#${next.id}` : location.pathname + location.search);
          window.dispatchEvent(new Event(HASH));
        });
        window.scrollTo({ top: 0, behavior: "instant" });
      };
      const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
      if (doc.startViewTransition && !reduce) doc.startViewTransition(run);
      else run();
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

  const book = view ? bookById(view.id) : undefined;
  const close = useCallback(() => change(null), [change]);

  if (book && wide !== null) {
    return (
      <Book
        key={`${book.id}-${wide ? "spread" : "single"}`}
        book={book}
        mode={wide ? "spread" : "single"}
        autoOpen={view?.auto ?? false}
        onClose={close}
      />
    );
  }

  return (
    <>
      <Table books={books} onOpen={(id) => change({ id, auto: true })} />
      <footer className="linen table-surface relative hidden bg-table-deep px-4 py-10 text-sm text-on-table-2 md:block md:px-8">
        <p>
          <span className="font-semibold text-on-table">Fujiventura</span> · Fotografien von Michel Leotta,
          Fuerteventura und Japan
        </p>
      </footer>
    </>
  );
}
