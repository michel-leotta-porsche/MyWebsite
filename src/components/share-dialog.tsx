"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import { BookmarkCheck, Check, Copy, Gift, Link2, Link2Off, StickyNote, Undo2, X } from "lucide-react";

import { Button, IconButton } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ListGroup, ListRow } from "@/components/ui/list";
import { MountedSheet } from "@/components/ui/sheet";
import { SITE_URL } from "@/lib/share-meta";
import Link from "next/link";

import { acceptTerms, deleteNote, mySharesOf, notesOf, refreshShares, shareBook, termsAccepted, unshare, type Note, type Share, type StoredBook } from "@/lib/store";

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
  // Vor dem ersten Teilen einmal den Nutzungsbedingungen zustimmen (App Store 1.2); null solange unbekannt
  const [agreed, setAgreed] = useState<boolean | null>(null);
  const [agreeNow, setAgreeNow] = useState(false);
  useEffect(() => {
    let alive = true;
    termsAccepted(book.owner)
      .then((ok) => alive && setAgreed(ok))
      .catch(() => alive && setAgreed(false));
    return () => {
      alive = false;
    };
  }, [book.owner]);
  const mustAgree = agreed === false && !agreeNow;

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
    if (!to.trim() || (needsTitle && !title.trim()) || mustAgree) return;
    setBusy(true);
    try {
      if (agreed === false) {
        await acceptTerms(book.owner);
        setAgreed(true);
      }
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

  const allNotes = (shares ?? []).flatMap((s) => (notes[s.token] ?? []).map((n) => ({ n, s })));

  return (
    <MountedSheet
      title={needsTitle ? "Buch hinlegen" : `„${book.title}“ hinlegen`}
      description="Jede Person bekommt einen eigenen Link, ohne Konto. Der Link zeigt dieses Buch und sonst nichts."
      onClose={onClose}
    >
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
      >
        {needsTitle && <Field label="Titel des Buchs" hint="Steht auf dem Einband" value={title} onChange={(e) => setTitle(e.target.value.slice(0, 40))} />}
        <div className="flex items-end gap-3">
          <Field label="Für wen?" className="min-w-0 flex-1" value={to} onChange={(e) => setTo(e.target.value)} maxLength={40} />
          <Button
            type="submit"
            variant="ink"
            size="sm"
            className="mb-1.5"
            disabled={busy || !to.trim() || (needsTitle && !title.trim()) || mustAgree || agreed === null}
          >
            <Link2 aria-hidden />
            Link erstellen
          </Button>
        </div>
      </form>
      {agreed === false && (
        <label className="mt-3 flex min-h-11 items-center gap-3 text-[13px]">
          <input type="checkbox" checked={agreeNow} onChange={(e) => setAgreeNow(e.target.checked)} className="accent-ink size-[18px] shrink-0" />
          <span>
            Ich teile nur, woran ich die Rechte habe, und halte mich an die{" "}
            <Link href="/nutzungsbedingungen" className="underline underline-offset-4">
              Nutzungsbedingungen
            </Link>
            .
          </span>
        </label>
      )}

      <div className="mt-6">
        {shares === null && <p className="text-ink-2 text-sm">Lade …</p>}
        {shares && shares.length > 0 && (
          <ListGroup paper label="Links">
            {shares.map((s) => {
              const going = withdrawing.includes(s.token);
              const count = (notes[s.token] ?? []).length;
              return (
                <ListRow
                  key={s.token}
                  paper
                  lead={<Gift aria-hidden />}
                  title={`Für ${s.to}`}
                  detail={going ? "Wird zurückgezogen" : count ? `${count} ${count === 1 ? "Rückmeldung" : "Rückmeldungen"}` : "Liegt bereit"}
                  trail={
                    <span className="flex gap-1">
                      {going ? (
                        <IconButton variant="paper" label={`Link für ${s.to} behalten`} onClick={() => keep(s.token)}>
                          <Undo2 aria-hidden />
                        </IconButton>
                      ) : (
                        <>
                          <IconButton variant="paper" label={copied === s.token ? "Kopiert" : `Link für ${s.to} kopieren`} onClick={() => copy(s.token)}>
                            {copied === s.token ? <Check aria-hidden /> : <Copy aria-hidden />}
                          </IconButton>
                          <IconButton variant="paper" label={`Link für ${s.to} zurückziehen`} onClick={() => withdraw(s.token)}>
                            <Link2Off aria-hidden />
                          </IconButton>
                        </>
                      )}
                    </span>
                  }
                />
              );
            })}
          </ListGroup>
        )}
      </div>

      {allNotes.length > 0 && (
        <div className="mt-6">
          <h3 className="text-ink-2 mb-2 text-[13px] font-semibold">Zettel und Eselsohren</h3>
          <ListGroup paper label="Zettel und Eselsohren">
            {allNotes.map(({ n, s }) => (
              <ListRow
                key={n.id}
                paper
                lead={n.kind === "ear" ? <BookmarkCheck aria-hidden /> : <StickyNote aria-hidden />}
                title={<span className="block font-normal">{n.kind === "ear" ? `Eselsohr bei Tafel ${n.no}` : `„${n.text}“`}</span>}
                detail={`${n.from || "Gast"} · Link für ${s.to}`}
                trail={
                  <IconButton
                    variant="paper"
                    label={n.kind === "ear" ? `Eselsohr bei Tafel ${n.no} entfernen` : `Zettel von ${n.from || "Gast"} entfernen`}
                    onClick={() => {
                      setNotes((all) => ({ ...all, [s.token]: (all[s.token] ?? []).filter((x) => x.id !== n.id) }));
                      deleteNote(s.token, n.id).catch(() => {});
                    }}
                  >
                    <X aria-hidden />
                  </IconButton>
                }
              />
            ))}
          </ListGroup>
        </div>
      )}
    </MountedSheet>
  );
}
