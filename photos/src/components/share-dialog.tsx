"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import { inputClass, SlipDialog } from "@/components/app-ui";
import { SITE_URL } from "@/lib/share-meta";
import { mySharesOf, notesOf, refreshShares, shareBook, unshare, type Note, type Share, type StoredBook } from "@/lib/store";

// In der iOS-App ist die eigene Adresse capacitor://localhost; geteilt wird immer eine Web-Adresse
const linkFor = (token: string) => `${location.protocol.startsWith("http") ? location.origin : SITE_URL}/b?t=${token}`;

/** So lange lässt sich „Zurückziehen“ noch rückgängig machen, bevor der Link gelöscht wird */
const WITHDRAW_MS = 5000;

/**
 * „Hinlegen für …“: persönlicher Link pro Person, einzeln zurückziehbar; darunter Zettel und Eselsohren.
 * onTitle: Buch ohne Titel bekommt ihn hier, bevor es jemand sieht (UX-Kritik K6).
 */
export function ShareDialog({ book, onClose, onTitle }: { book: StoredBook; onClose: () => void; onTitle?: (title: string) => void | Promise<void> }) {
  const [to, setTo] = useState("");
  const [title, setTitle] = useState("");
  const needsTitle = !book.title.trim();
  // zurückgezogen, aber noch nicht gelöscht: Token → Zeitgeber
  const timers = useRef(new Map<string, number>());
  const [withdrawing, setWithdrawing] = useState<string[]>([]);
  const [shares, setShares] = useState<Share[] | null>(null);
  const [notes, setNotes] = useState<Record<string, Note[]>>({});
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Links aus der Zeit, als sie noch beim Stand des Teilens stehen blieben, holen beim Öffnen auf
  const catchUp = useEffectEvent((mine: Share[]) => refreshShares(book, mine).catch(() => {}));
  useEffect(() => {
    let alive = true;
    mySharesOf(book.owner)
      .then(async (all) => {
        const mine = all.filter((s) => (s.bookId ?? s.book?.id) === book.id && !s.paused);
        catchUp(mine);
        if (!alive) return;
        setShares(mine);
        const entries = await Promise.all(mine.map(async (s) => [s.token, await notesOf(s.token).catch(() => [])] as const));
        if (alive) setNotes(Object.fromEntries(entries));
      })
      .catch(() => alive && setShares([]));
    return () => {
      alive = false;
    };
  }, [book.id, book.owner]);

  const create = async () => {
    if (!to.trim() || (needsTitle && !title.trim())) return;
    setBusy(true);
    try {
      const named = needsTitle ? { ...book, title: title.trim() } : book;
      if (needsTitle) await onTitle?.(named.title);
      const token = await shareBook(named, to.trim());
      setShares((s) => [{ token, owner: book.owner, fromName: book.ownerName, to: to.trim(), book: named }, ...(s ?? [])]);
      setTo("");
      const url = linkFor(token);
      // auf dem Telefon gleich das Teilen-Menü (WhatsApp, Nachrichten …)
      if (navigator.share) navigator.share({ title: named.title, text: `Für ${to.trim()}`, url }).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  // Zurückziehen mit kurzer Frist zum Rückgängigmachen (UX-Kritik K13)
  const withdraw = (token: string) => {
    const id = window.setTimeout(() => {
      timers.current.delete(token);
      unshare(token).catch(() => {});
      setShares((all) => all?.filter((x) => x.token !== token) ?? null);
      setWithdrawing((w) => w.filter((t) => t !== token));
    }, WITHDRAW_MS);
    timers.current.set(token, id);
    setWithdrawing((w) => [...w, token]);
  };
  const keep = (token: string) => {
    window.clearTimeout(timers.current.get(token));
    timers.current.delete(token);
    setWithdrawing((w) => w.filter((t) => t !== token));
  };
  // Dialog zu, solange etwas aussteht: das Zurückziehen gilt trotzdem
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const [token, id] of pending) {
        window.clearTimeout(id);
        unshare(token).catch(() => {});
      }
    };
  }, []);

  const copy = async (token: string) => {
    await navigator.clipboard.writeText(linkFor(token)).catch(() => {});
    setCopied(token);
    window.setTimeout(() => setCopied(null), 1600);
  };

  return (
    <SlipDialog label={needsTitle ? "Buch hinlegen" : `„${book.title}“ hinlegen`} onClose={onClose}>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
      >
        {needsTitle && (
          <label className="mb-2 block w-full text-[13px]">
            <span className="text-ink-2">Titel des Buchs, steht auf dem Einband</span>
            <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 40))} placeholder="z. B. Lissabon im Mai" className={inputClass} />
          </label>
        )}
        <label className="sr-only" htmlFor="share-to">
          Für wen
        </label>
        <input
          id="share-to"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="Für wen? z. B. Lena"
          className={`${inputClass} min-w-0 flex-1`}
          maxLength={40}
        />
        <button
          type="submit"
          disabled={busy || !to.trim() || (needsTitle && !title.trim())}
          className="border-ink text-ink hover:bg-ink hover:text-paper shrink-0 border px-3 text-sm font-semibold transition-colors duration-150 disabled:opacity-50"
        >
          Link erstellen
        </button>
      </form>
      <p className="text-ink-2 mt-2 text-[13px]">
        Hinlegen heißt: Jede Person bekommt einen eigenen Link zum Teilen, ohne Konto. Der Link zeigt dieses Buch und sonst nichts.
      </p>

      <ul className="mt-5 space-y-4">
        {shares === null && <li className="text-ink-2 text-sm">Lade …</li>}
        {shares?.map((s) => (
          <li key={s.token} className="border-t border-ink/15 pt-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold">Für {s.to}</p>
              <span className="flex gap-3 text-sm">
                <button type="button" onClick={() => copy(s.token)} className="underline decoration-mark decoration-2 underline-offset-4">
                  {copied === s.token ? "Kopiert" : "Link kopieren"}
                </button>
                {withdrawing.includes(s.token) ? (
                  <button type="button" onClick={() => keep(s.token)} className="underline decoration-mark decoration-2 underline-offset-4">
                    Zurückgezogen · Rückgängig
                  </button>
                ) : (
                  <button type="button" onClick={() => withdraw(s.token)} className="text-ink-2 underline underline-offset-4">
                    Zurückziehen
                  </button>
                )}
              </span>
            </div>
            {(notes[s.token] ?? []).map((n) => (
              <p key={n.id} className="text-ink-2 mt-1 text-[13px]">
                {n.kind === "ear" ? `Eselsohr bei Tafel ${n.no}` : `„${n.text}“`}
                {n.from ? ` · ${n.from}` : ""}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </SlipDialog>
  );
}
