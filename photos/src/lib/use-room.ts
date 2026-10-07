"use client";

import { useCallback, useEffect, useState } from "react";

import { friendlyError } from "@/lib/errors";
import {
  deleteBookForever,
  dropFromInbox,
  keepInInbox,
  trashBook,
  watchInbox,
  watchMyBooks,
  type Share,
  type StoredBook,
} from "@/lib/store";

type Zone = "own" | "gifts";

/**
 * Alles, was im Bücherzimmer liegt, und was man damit tun kann.
 * Dahinter: zwei laufende Abfragen (eigene Bücher, Geschenke), jede mit eigenem Fehler, damit ein Ausfall nur
 * seine Reihe trifft; Änderungen erscheinen sofort, die Abfrage bestätigt sie danach.
 * Aktionen, die sich zurücknehmen lassen, geben ihr Rückgängig zurück.
 */
export function useRoom(uid: string) {
  const [books, setBooks] = useState<StoredBook[] | null>(null);
  const [gifts, setGifts] = useState<Share[] | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Zone, string>>>({});
  const [attempt, setAttempt] = useState({ own: 0, gifts: 0 });

  const fail = (zone: Zone) => (e: unknown) => setErrors((x) => ({ ...x, [zone]: friendlyError(e) }));

  useEffect(
    () =>
      watchMyBooks(
        uid,
        (b) => {
          setBooks(b);
          setErrors((x) => ({ ...x, own: undefined }));
        },
        fail("own"),
      ),
    [uid, attempt.own],
  );
  useEffect(
    () =>
      watchInbox(
        uid,
        (g) => {
          setGifts(g);
          setErrors((x) => ({ ...x, gifts: undefined }));
        },
        fail("gifts"),
      ),
    [uid, attempt.gifts],
  );

  const retry = useCallback((zone: Zone) => {
    setErrors((x) => ({ ...x, [zone]: undefined }));
    setAttempt((a) => ({ ...a, [zone]: a[zone] + 1 }));
  }, []);

  const setTrashed = (b: StoredBook, on: boolean) => {
    setBooks((list) => list?.map((x) => (x.id === b.id ? { ...x, trashed: on ? Date.now() : undefined } : x)) ?? null);
    trashBook(b, on).catch(fail("own"));
  };

  return {
    /** null solange noch nichts da ist */
    own: books?.filter((b) => !b.trashed) ?? null,
    trash: (books ?? []).filter((b) => b.trashed).sort((a, b) => (b.trashed ?? 0) - (a.trashed ?? 0)),
    gifts,
    errors,
    retry,
    /** In den Papierkorb; zurück mit dem Rückgabewert */
    toTrash(b: StoredBook) {
      setTrashed(b, true);
      return () => setTrashed(b, false);
    },
    restore: (b: StoredBook) => setTrashed(b, false),
    /** Geschenk aus dem eigenen Zimmer nehmen; beim Schenkenden bleibt es */
    dropGift(g: Share) {
      setGifts((list) => list?.filter((x) => x.token !== g.token) ?? null);
      dropFromInbox(uid, g.token).catch(fail("gifts"));
      return () => {
        setGifts((list) => [...(list ?? []), g]);
        keepInInbox(uid, g).catch(fail("gifts"));
      };
    },
    /** Papierkorb endgültig leeren; Fehler bleiben bei der eigenen Reihe stehen */
    async emptyTrash() {
      for (const b of (books ?? []).filter((x) => x.trashed)) {
        try {
          await deleteBookForever(b);
          setBooks((all) => all?.filter((x) => x.id !== b.id) ?? null);
        } catch (e) {
          fail("own")(e);
        }
      }
    },
    /** nach einer Änderung im Dialog (z. B. Titel), bis die Abfrage nachzieht */
    replace: (b: StoredBook) => setBooks((all) => all?.map((x) => (x.id === b.id ? b : x)) ?? null),
  };
}
