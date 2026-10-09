"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { friendlyError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import {
  blockSender,
  deleteBookForever,
  dropFromInbox,
  keepInInbox,
  mySharesOf,
  notesOf,
  trashBook,
  watchBlocked,
  watchInbox,
  watchMyBooks,
  type Blocked,
  type Note,
  type Share,
  type StoredBook,
} from "@/lib/store";

type Zone = "own" | "gifts";

/** Ein Zettel oder Eselsohr, mit dem Link, über den es kam; `who` ist der Name des Gasts oder, ohne Namen, für wen der Link war */
export type Feedback = Note & { token: string; who: string };

/** Wo ein eigenes Buch hingelegt ist und was davon zurückkam; `items` neueste zuerst */
export type Spread = { to: string[]; notes: number; ears: number; items: Feedback[] };

/**
 * Für jedes eigene Buch: bei wem es liegt, welche Zettel und Eselsohren kamen. Ruhende Links zählen nicht.
 * cached: nur aus dem Zwischenspeicher im Browser; null, wenn dort noch keine Links liegen.
 */
async function spreadOf(uid: string, cached = false): Promise<Record<string, Spread> | null> {
  const all = await mySharesOf(uid, cached);
  if (cached && all.length === 0) return null;
  const shares = all.filter((s) => !s.paused);
  const out: Record<string, Spread> = {};
  await Promise.all(
    shares.map(async (s) => {
      const id = s.bookId ?? s.book?.id;
      if (!id) return;
      const notes = await notesOf(s.token, cached).catch(() => []);
      const e = (out[id] ??= { to: [], notes: 0, ears: 0, items: [] });
      if (s.to && !e.to.includes(s.to)) e.to.push(s.to);
      for (const n of notes) {
        if (n.kind === "ear") e.ears++;
        else if (n.text?.trim()) e.notes++;
        else continue;
        e.items.push({ ...n, token: s.token, who: n.from?.trim() || s.to || t("Gast") });
      }
    }),
  );
  for (const e of Object.values(out)) e.items.sort((a, b) => (b.at?.seconds ?? 0) - (a.at?.seconds ?? 0));
  return out;
}

/**
 * Alles, was im Bücherzimmer liegt, und was man damit tun kann.
 * Dahinter: zwei laufende Abfragen (eigene Bücher, Geschenke), jede mit eigenem Fehler, damit ein Ausfall nur
 * seine Reihe trifft; Änderungen erscheinen sofort, die Abfrage bestätigt sie danach.
 * Aktionen, die sich zurücknehmen lassen, geben ihr Rückgängig zurück.
 */
export function useRoom(uid: string) {
  const [books, setBooks] = useState<StoredBook[] | null>(null);
  const [gifts, setGifts] = useState<Share[] | null>(null);
  const [blocked, setBlocked] = useState<Blocked[]>([]);
  const [errors, setErrors] = useState<Partial<Record<Zone, string>>>({});
  const [attempt, setAttempt] = useState({ own: 0, gifts: 0 });
  const [spread, setSpread] = useState<Record<string, Spread>>({});
  const [spreadLoaded, setSpreadLoaded] = useState(false);
  const [spreadRun, setSpreadRun] = useState(0);

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

  useEffect(() => watchBlocked(uid, setBlocked), [uid]);
  const visibleGifts = useMemo(() => gifts?.filter((g) => !blocked.some((b) => b.uid === g.owner)) ?? null, [gifts, blocked]);

  // Nur eine Zugabe an den Büchern: schlägt das Laden fehl, fehlt die Zeile einfach.
  // Zuerst der Stand vom letzten Besuch aus dem Zwischenspeicher, damit die Bücher nicht auf das Netz warten
  // (zwei Abfragen nacheinander, am Handy gut eine halbe Sekunde); der frische Stand ersetzt ihn danach.
  useEffect(() => {
    let alive = true;
    let fresh = false;
    spreadOf(uid, true)
      .then((s) => {
        if (!alive || fresh || !s) return;
        setSpread(s);
        setSpreadLoaded(true);
      })
      .catch(() => {});
    spreadOf(uid)
      .then((s) => {
        fresh = true;
        if (alive && s) setSpread(s);
      })
      .catch(() => {})
      .finally(() => alive && setSpreadLoaded(true));
    return () => {
      alive = false;
    };
  }, [uid, spreadRun]);

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
    /** ohne Bücher von ausgeblendeten Personen */
    gifts: visibleGifts,
    /** Alle Bücher dieser Person ausblenden (App Store 1.2: Blockieren) */
    async block(g: Share) {
      const tokens = (gifts ?? []).filter((x) => x.owner === g.owner).map((x) => x.token);
      setBlocked((list) => [...list, { uid: g.owner, name: g.fromName }]);
      await blockSender(uid, g.owner, g.fromName, tokens).catch(fail("gifts"));
    },
    /** Buch-Kennung → bei wem es liegt, Zettel, Eselsohren */
    spread,
    /** einmal gezählt (auch wenn es fehlschlug): erst dann steht fest, welches Buch Neues hat */
    spreadLoaded,
    /** neu zählen, z. B. nachdem das Buch jemandem hingelegt wurde */
    recount: () => setSpreadRun((n) => n + 1),
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
