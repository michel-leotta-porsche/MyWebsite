"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type { BookData } from "@/content/books";
import { BookmarkPlus, Check, Flag, MoreHorizontal, PenLine } from "lucide-react";

import { Button, buttonClass, IconButton } from "@/components/ui/button";
import { noteClass } from "@/components/ui/field";
import { Menu, MenuItem } from "@/components/ui/menu";
import { Sheet } from "@/components/ui/sheet";
import { notify, Toaster } from "@/components/ui/toaster";
import { Library } from "@/components/books";
import { Shelf, Table } from "@/components/table";
import { signInError } from "@/lib/errors";
import { signIn, type SignInProvider } from "@/lib/firebase";
import { SignInButtons } from "@/components/sign-in-buttons";
import { ReportDialog } from "@/components/report-dialog";
import { isAbusive } from "@/lib/note-filter";
import { blockSender, keepInInbox, leaveNote, loadShare, toBookData, watchBlocked, type Blocked, type Share } from "@/lib/store";
import { useQueryParam } from "@/lib/use-query";
import { useUser } from "@/lib/use-user";

const EAR_DELAY_MS = 5000;

/** Ein Buch, das jemand für mich hingelegt hat: ohne Konto lesbar, mit Zettel und Eselsohr zurück */
export function GuestBook() {
  const token = useQueryParam("t");
  const user = useUser();
  const [share, setShare] = useState<Share | null | undefined>(undefined);
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");
  const [ears, setEars] = useState<number[]>([]);
  // Eselsohren gehen erst nach ein paar Sekunden raus; bis dahin lassen sie sich zurücknehmen (UX-Kritik K12)
  const earTimers = useRef(new Map<number, number>());
  const [earsSent, setEarsSent] = useState<number[]>([]);
  const [failed, setFailed] = useState<string | null>(null);
  const [kept, setKept] = useState(false);
  const [signInFailed, setSignInFailed] = useState<string | null>(null);
  const [keeping, setKeeping] = useState(false);
  const [signingIn, setSigningIn] = useState<SignInProvider | null>(null);
  const [reporting, setReporting] = useState(false);
  const [blocked, setBlocked] = useState<Blocked[] | null>(null);

  useEffect(() => {
    if (!user) return;
    return watchBlocked(user.uid, setBlocked);
  }, [user]);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    loadShare(token)
      .then((s) => alive && setShare(s))
      .catch(() => alive && setShare(null));
    return () => {
      alive = false;
    };
  }, [token]);

  const hidden = !!share && !!blocked?.some((b) => b.uid === share.owner);
  // angemeldet: das Buch bleibt im eigenen Bücherzimmer liegen (außer die Person ist ausgeblendet)
  useEffect(() => {
    if (!user || !share || kept || blocked === null || hidden) return;
    keepInInbox(user.uid, share)
      .then(() => setKept(true))
      .catch(() => {});
  }, [kept, share, user, blocked, hidden]);

  const book = useMemo<BookData | null>(() => {
    if (!share) return null;
    try {
      return toBookData(share.book);
    } catch {
      return null;
    }
  }, [share]);

  if (token === null && share === undefined)
    return <Empty text="Dieser Link ist unvollständig." />;
  if (share === undefined) return <main className="linen table-surface min-h-svh bg-table" />;
  if (!share || !book) return <Empty text="Dieses Buch liegt hier nicht mehr. Vielleicht wurde der Link zurückgezogen." />;

  if (hidden && !reporting) return <Empty text={`Bücher von ${share.fromName} hast du ausgeblendet. Im Profil kannst du das zurücknehmen.`} />;

  const from = user?.displayName ?? share.to;
  const mine = !!user && user.uid === share.owner;

  const toggleEar = (no: number) => {
    if (!token || earsSent.includes(no)) return;
    const pending = earTimers.current.get(no);
    if (pending !== undefined) {
      window.clearTimeout(pending);
      earTimers.current.delete(no);
      setEars((e) => e.filter((x) => x !== no));
      return;
    }
    setEars((e) => [...e, no]);
    notify(`Eselsohr bei Tafel ${no}`, { duration: EAR_DELAY_MS, action: { label: "Rückgängig", onClick: () => toggleEar(no) } });
    earTimers.current.set(
      no,
      window.setTimeout(() => {
        earTimers.current.delete(no);
        leaveNote(token, { kind: "ear", no, from })
          .then(() => setEarsSent((s) => [...s, no]))
          .catch(() => {
            setEars((e) => e.filter((x) => x !== no));
            notify("Das Eselsohr ist nicht angekommen. Versuch es bitte nochmal.");
          });
      }, EAR_DELAY_MS),
    );
  };

  return (
    <main>
      <Library
        books={[book]}
        ears={ears}
        onEar={toggleEar}
        bookExtra={(_, plates) => {
          // Eselsohr an der ersten Tafel der aufgeschlagenen Seite
          const no = plates[0];
          return (
            <>
              {no !== undefined &&
                (earsSent.includes(no) ? (
                  <span className="text-on-table-2 inline-flex min-h-9 items-center gap-1.5">
                    <Check aria-hidden className="size-4" />
                    Eselsohr bei {share.fromName}
                  </span>
                ) : (
                  <Button size="sm" aria-pressed={ears.includes(no)} haptic="select" className="aria-pressed:bg-on-table aria-pressed:text-table" onClick={() => toggleEar(no)}>
                    <Dogear on={ears.includes(no)} />
                    Eselsohr
                  </Button>
                ))}
              <Button size="sm" onClick={() => setWriting(true)}>
                <PenLine aria-hidden />
                Zettel
              </Button>
              {!mine && <MoreMenu onReport={() => setReporting(true)} />}
            </>
          );
        }}
      >
        <Table
          label={`Ein Buch für ${share.to}`}
          headerRight={
            <div className="flex items-center gap-2">
              {user ? (
                kept ? (
                  <Link href="/zimmer" className={buttonClass("quiet", "sm")}>
                    <Check aria-hidden />
                    Liegt in deinem Bücherzimmer
                  </Link>
                ) : (
                  <span aria-hidden className="inline-block min-h-9 w-24" />
                )
              ) : (
                <Button size="sm" onClick={() => setKeeping(true)}>
                  <BookmarkPlus aria-hidden />
                  <span className="max-sm:hidden">In mein Bücherzimmer legen</span>
                  <span className="sm:hidden">Behalten</span>
                </Button>
              )}
              {!mine && <MoreMenu onReport={() => setReporting(true)} />}
            </div>
          }
        >
          <Shelf feature books={[book]} note={() => `Für ${share.to}, von ${share.fromName}`} />
        </Table>
      </Library>
      <Sheet
        open={keeping && !user}
        onOpenChange={setKeeping}
        title="In dein Bücherzimmer legen"
        description={`Mit einem Konto liegt „${share.book?.title || "dieses Buch"}“ in deinem Bücherzimmer unter „Für dich“, und du kannst eigene Bücher machen.`}
      >
        <SignInButtons
          tone="cloth"
          busy={signingIn}
          onPick={(p) => {
            setSignInFailed(null);
            setSigningIn(p);
            signIn(p)
              .then(() => setKeeping(false))
              .catch((e) => setSignInFailed(signInError(e)))
              .finally(() => setSigningIn(null));
          }}
        />
        {signInFailed && (
          <p role="alert" className="text-danger mt-3 text-sm font-semibold">
            {signInFailed}
          </p>
        )}
        <p className="text-ink-2 mt-4 text-[13px]">
          Es gelten die{" "}
          <Link href="/nutzungsbedingungen" className="underline decoration-ink/40 underline-offset-4 hover:decoration-ink">
            Nutzungsbedingungen
          </Link>
          .
        </p>
      </Sheet>
      <Sheet open={writing} onOpenChange={setWriting} title={`Zettel an ${share.fromName}`} description={`Nur ${share.fromName} liest das.`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const note = text.trim();
            if (!note || !token) return;
            setFailed(null);
            if (isAbusive(note)) {
              setFailed("So etwas gehört nicht auf einen Zettel. Formulier es bitte anders.");
              return;
            }
            leaveNote(token, { kind: "note", text: note, from })
              .then(() => {
                setText("");
                setWriting(false);
                notify(`Dein Zettel liegt bei ${share.fromName}. Danke!`);
              })
              .catch(() => setFailed("Der Zettel ist nicht angekommen. Versuch es bitte nochmal."));
          }}
        >
          <label htmlFor="note" className="sr-only">
            Zettel
          </label>
          <textarea
            id="note"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 280))}
            rows={4}
            className={noteClass}
            placeholder="Was dir gefällt, eine Frage zum Rezept …"
          />
          {failed && (
            <p role="alert" className="text-danger mt-2 text-sm font-semibold">
              {failed}
            </p>
          )}
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-ink-2 text-[13px] tabular-nums">{text.length} / 280</span>
            <Button type="submit" variant="ink" disabled={!text.trim()}>
              Hinlegen
            </Button>
          </div>
        </form>
      </Sheet>
      {reporting && (
        <ReportDialog
          share={share}
          reporter={user?.uid ?? null}
          onClose={() => setReporting(false)}
          onBlock={user ? () => blockSender(user.uid, share.owner, share.fromName, [share.token]) : undefined}
        />
      )}
      <Toaster />
    </main>
  );
}

/** Ecke eines Blatts, umgeknickt solange das Eselsohr gesetzt ist */
function Dogear({ on }: { on: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round">
      <path d="M5 3h9l5 5v13H5z" />
      <path d="M14 3v5h5" className={on ? "fill-current" : ""} />
    </svg>
  );
}

/** Seltene Handgriffe hinter „Mehr“, damit Melden nicht neben Zettel und Eselsohr steht */
function MoreMenu({ onReport }: { onReport: () => void }) {
  return (
    <Menu trigger={<IconButton label="Mehr"><MoreHorizontal aria-hidden /></IconButton>}>
      <MenuItem icon={<Flag />} onClick={onReport}>
        Buch melden
      </MenuItem>
    </Menu>
  );
}

/** Leerer Tisch mit Weg zurück: in der App gibt es keine Zurück-Taste des Browsers */
function Empty({ text }: { text: string }) {
  const user = useUser();
  return (
    <main className="linen table-surface flex min-h-svh flex-col items-center justify-center gap-6 bg-table px-6">
      <p className="text-on-table-2 max-w-sm text-center">{text}</p>
      {user !== undefined && (
        <Link href={user ? "/zimmer" : "/"} className={buttonClass("quiet")}>
          {user ? "Zum Bücherzimmer" : "Zur Startseite"}
        </Link>
      )}
    </main>
  );
}

