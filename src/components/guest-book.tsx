"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { BookData } from "@/content/books";
import { BookmarkPlus, Check, Flag, MoreHorizontal } from "lucide-react";

import { Button, buttonClass, IconButton } from "@/components/ui/button";
import { Menu, MenuItem } from "@/components/ui/menu";
import { Sheet } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/toaster";
import { Library } from "@/components/books";
import { useFeedback } from "@/components/leave-feedback";
import { Shelf, Table } from "@/components/table";
import { signInError } from "@/lib/errors";
import { signIn, type SignInProvider } from "@/lib/firebase";
import { SignInButtons } from "@/components/sign-in-buttons";
import { ReportDialog } from "@/components/report-dialog";
import { blockSender, keepInInbox, loadShare, toBookData, watchBlocked, type Blocked, type Share } from "@/lib/store";
import { useQueryParam } from "@/lib/use-query";
import { useUser } from "@/lib/use-user";

/** Ein Buch, das jemand für mich hingelegt hat: ohne Konto lesbar, mit Zettel und Eselsohr zurück */
export function GuestBook() {
  const token = useQueryParam("t");
  const user = useUser();
  const [share, setShare] = useState<Share | null | undefined>(undefined);
  const [kept, setKept] = useState(false);
  const [signInFailed, setSignInFailed] = useState<string | null>(null);
  const [keeping, setKeeping] = useState(false);
  const [signingIn, setSigningIn] = useState<SignInProvider | null>(null);
  const [reporting, setReporting] = useState(false);
  const [blocked, setBlocked] = useState<Blocked[] | null>(null);
  const feedback = useFeedback((s) => user?.displayName ?? s.to);

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

  const mine = !!user && user.uid === share.owner;

  return (
    <main>
      <Library
        books={[book]}
        ears={feedback.earsOf(share)}
        onEar={(no) => feedback.toggleEar(share, no)}
        bookExtra={(_, plates) => feedback.extra(share, plates, !mine && <MoreMenu onReport={() => setReporting(true)} />)}
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
      {feedback.sheet}
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

