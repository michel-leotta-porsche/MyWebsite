"use client";

import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";

import { BookmarkCheck, Check, Copy, Gift, Link2, Link2Off, Share, StickyNote, Undo2, X } from "lucide-react";

import { Button, IconButton } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ListGroup, ListRow } from "@/components/ui/list";
import { MountedSheet } from "@/components/ui/sheet";
import { notify } from "@/components/ui/toaster";
import { haptic } from "@/lib/haptics";
import { useT } from "@/lib/i18n";
import { copyText, shareLink } from "@/lib/native";
import { IS_APP } from "@/lib/app-mode";
import { SITE_URL } from "@/lib/share-meta";
import Link from "next/link";

import { acceptTerms, deleteNote, mySharesOf, notesOf, refreshShares, shareBook, termsAccepted, unshare, type Note, type Share as BookShare, type StoredBook } from "@/lib/store";

// In der iOS-App ist die eigene Adresse capacitor://localhost; geteilt wird immer eine Web-Adresse
const linkFor = (token: string) => `${location.protocol.startsWith("http") ? location.origin : SITE_URL}/b?t=${token}`;

const noSubscribe = () => () => {};
const hasShare = () => typeof navigator.share === "function";

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
  const [shares, setShares] = useState<BookShare[] | null>(null);
  const [notes, setNotes] = useState<Record<string, Note[]>>({});
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const t = useT();
  // Teilen-Knopf im Browser nur, wo es ein Teilen-Menü gibt (Telefon, Safari); erst nach dem Laden bekannt
  const canShare = useSyncExternalStore(noSubscribe, hasShare, () => false);
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
  const catchUp = useEffectEvent((mine: BookShare[]) => refreshShares(book, mine).catch(() => {}));
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
      // auf dem Telefon gleich das Teilen-Menü (WhatsApp, Nachrichten …); in der App zuverlässig auch nach dem Speichern
      if (canShare || IS_APP) send(token, to.trim(), named.title);
    } catch {
      notify(t("Der Link ließ sich nicht anlegen. Prüf die Verbindung und tipp noch einmal."));
      haptic("warning");
    } finally {
      setBusy(false);
    }
  };

  // Teilen-Blatt mit einem Satz, wie man ihn selbst schreiben würde; Rückmeldung nur, wenn es wirklich geklappt hat
  const send = async (token: string, name: string, title: string) => {
    const r = await shareLink({ title, text: t("Ich hab dir ein Fotobuch hingelegt: „{title}“. Zum Blättern, ohne Konto.", { title }), url: linkFor(token) });
    if (r === "shared") {
      notify(t("Link für {name} ist unterwegs.", { name }));
      haptic("success");
    } else if (r === "failed") copy(token, name);
  };

  // Zurückziehen mit kurzer Frist zum Rückgängigmachen (UX-Kritik K13)
  const withdraw = (token: string) => {
    const id = window.setTimeout(() => {
      timers.current.delete(token);
      unshare(token).catch(() => {});
      setShares((all) => all?.filter((x) => x.token !== token) ?? null);
      setWithdrawing((w) => w.filter((x) => x !== token));
    }, WITHDRAW_MS);
    timers.current.set(token, id);
    setWithdrawing((w) => [...w, token]);
  };
  const keep = (token: string) => {
    window.clearTimeout(timers.current.get(token));
    timers.current.delete(token);
    setWithdrawing((w) => w.filter((x) => x !== token));
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

  const copy = async (token: string, name: string) => {
    if (!(await copyText(linkFor(token)))) {
      notify(t("Kopieren hat nicht geklappt. Tipp auf Teilen und wähl dort Kopieren."));
      return;
    }
    notify(t("Link für {name} kopiert.", { name }));
    haptic("success");
    setCopied(token);
    window.setTimeout(() => setCopied(null), 1600);
  };

  const allNotes = (shares ?? []).flatMap((s) => (notes[s.token] ?? []).map((n) => ({ n, s })));

  return (
    <MountedSheet
      title={needsTitle ? t("Buch hinlegen") : t("„{title}“ hinlegen", { title: book.title })}
      description={t("Jede Person bekommt einen eigenen Link, ohne Konto. Wer den Link hat, kann das Buch ansehen, und sonst nichts. Du kannst ihn jederzeit zurückziehen.")}
      onClose={onClose}
    >
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
      >
        {needsTitle && <Field label={t("Titel des Buchs")} hint={t("Steht auf dem Einband")} value={title} onChange={(e) => setTitle(e.target.value.slice(0, 40))} />}
        <div className="flex items-end gap-3">
          <Field label={t("Für wen?")} className="min-w-0 flex-1" value={to} onChange={(e) => setTo(e.target.value)} maxLength={40} />
          <Button
            type="submit"
            variant="ink"
            size="sm"
            className="mb-1.5"
            disabled={busy || !to.trim() || (needsTitle && !title.trim()) || mustAgree || agreed === null}
          >
            <Link2 aria-hidden />
            {t("Link erstellen")}
          </Button>
        </div>
      </form>
      {agreed === false && (
        <label className="mt-3 flex min-h-11 items-center gap-3 text-[13px]">
          <input type="checkbox" checked={agreeNow} onChange={(e) => setAgreeNow(e.target.checked)} className="accent-ink size-[18px] shrink-0" />
          <span>
            {t("Ich teile nur, woran ich die Rechte habe, und halte mich an die")}{" "}
            <Link href="/nutzungsbedingungen" className="underline underline-offset-4">
              {t("Nutzungsbedingungen")}
            </Link>
            .
          </span>
        </label>
      )}

      <div className="mt-6">
        {shares === null && <p className="text-ink-2 text-sm">{t("Lade …")}</p>}
        {shares && shares.length > 0 && (
          <ListGroup paper label={t("Geteilte Links")}>
            {shares.map((s) => {
              const going = withdrawing.includes(s.token);
              const count = (notes[s.token] ?? []).length;
              return (
                <ListRow
                  key={s.token}
                  paper
                  lead={<Gift aria-hidden />}
                  title={t("Für {name}", { name: s.to })}
                  detail={going ? t("Wird zurückgezogen") : count === 1 ? t("1 Rückmeldung") : count ? t("{n} Rückmeldungen", { n: count }) : t("Liegt bereit")}
                  trail={
                    <span className="flex gap-1">
                      {going ? (
                        <IconButton variant="paper" label={t("Link für {name} behalten", { name: s.to })} onClick={() => keep(s.token)}>
                          <Undo2 aria-hidden />
                        </IconButton>
                      ) : (
                        <>
                          {(IS_APP || canShare) && (
                            <IconButton variant="paper" label={t("Link für {name} teilen", { name: s.to })} onClick={() => send(s.token, s.to, book.title)}>
                              <Share aria-hidden />
                            </IconButton>
                          )}
                          <IconButton variant="paper" label={copied === s.token ? t("Kopiert") : t("Link für {name} kopieren", { name: s.to })} onClick={() => copy(s.token, s.to)}>
                            {copied === s.token ? <Check aria-hidden /> : <Copy aria-hidden />}
                          </IconButton>
                          <IconButton variant="paper" label={t("Link für {name} zurückziehen", { name: s.to })} onClick={() => withdraw(s.token)}>
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
          <h3 className="text-ink-2 mb-2 text-[13px] font-semibold">{t("Zettel und Eselsohren")}</h3>
          <ListGroup paper label={t("Zettel und Eselsohren")}>
            {allNotes.map(({ n, s }) => (
              <ListRow
                key={n.id}
                paper
                lead={n.kind === "ear" ? <BookmarkCheck aria-hidden /> : <StickyNote aria-hidden />}
                title={<span className="block font-normal">{n.kind === "ear" ? t("Eselsohr bei Tafel {no}", { no: n.no ?? "" }) : `„${n.text}“`}</span>}
                detail={t("{from} · Link für {name}", { from: n.from || t("Gast"), name: s.to })}
                trail={
                  <IconButton
                    variant="paper"
                    label={n.kind === "ear" ? t("Eselsohr bei Tafel {no} entfernen", { no: n.no ?? "" }) : t("Zettel von {name} entfernen", { name: n.from || t("Gast") })}
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
