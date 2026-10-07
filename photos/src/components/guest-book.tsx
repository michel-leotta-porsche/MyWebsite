"use client";

import { useEffect, useMemo, useState } from "react";

import type { BookData } from "@/content/books";
import { inputClass, SlipDialog, TextButton } from "@/components/app-ui";
import { Library } from "@/components/books";
import { signIn } from "@/lib/firebase";
import { keepInInbox, leaveNote, loadShare, toBookData, type Share } from "@/lib/store";
import { useQueryParam } from "@/lib/use-query";
import { useUser } from "@/lib/use-user";

/** Ein Buch, das jemand für mich hingelegt hat: ohne Konto lesbar, mit Zettel und Eselsohr zurück */
export function GuestBook() {
  const token = useQueryParam("t");
  const user = useUser();
  const [share, setShare] = useState<Share | null | undefined>(undefined);
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [ears, setEars] = useState<number[]>([]);
  const [kept, setKept] = useState(false);

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

  // angemeldet: das Buch bleibt auf dem eigenen Tisch liegen
  useEffect(() => {
    if (!user || !share || kept) return;
    keepInInbox(user.uid, share)
      .then(() => setKept(true))
      .catch(() => {});
  }, [kept, share, user]);

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

  const from = user?.displayName ?? share.to;

  return (
    <main>
      <Library
        books={[book]}
        table={{
          label: `Ein Buch für ${share.to}`,
          note: () => `Für ${share.to}, von ${share.fromName}`,
          headerRight: (
            <p className="text-on-table-2 text-sm">
              {user ? (
                kept ? (
                  <span>Liegt auf deinem Tisch</span>
                ) : (
                  <span>…</span>
                )
              ) : (
                <TextButton onClick={() => signIn().catch(() => {})}>Auf meinen Tisch legen</TextButton>
              )}
            </p>
          ),
        }}
        ears={ears}
        onEar={(no) => {
          if (ears.includes(no) || !token) return;
          setEars((e) => [...e, no]);
          leaveNote(token, { kind: "ear", no, from }).catch(() => {});
        }}
        bookExtra={(_, plates) => {
          // Eselsohr an der ersten Tafel der aufgeschlagenen Seite
          const no = plates[0];
          return (
            <>
              {no !== undefined && (
                <TextButton
                  aria-pressed={ears.includes(no)}
                  onClick={() => {
                    if (ears.includes(no) || !token) return;
                    setEars((e) => [...e, no]);
                    leaveNote(token, { kind: "ear", no, from }).catch(() => {});
                  }}
                >
                  {ears.includes(no) ? "Eselsohr gesetzt" : "Eselsohr"}
                </TextButton>
              )}
              <TextButton onClick={() => setWriting(true)}>Zettel</TextButton>
            </>
          );
        }}
      />
      {writing && (
        <SlipDialog label={`Zettel an ${share.fromName}`} onClose={() => setWriting(false)}>
          {sent ? (
            <p className="text-sm">Liegt bei {share.fromName}. Danke!</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!text.trim() || !token) return;
                leaveNote(token, { kind: "note", text: text.trim(), from })
                  .then(() => setSent(text.trim()))
                  .catch(() => {});
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
                className={inputClass}
                placeholder="Was dir gefällt, eine Frage zum Rezept …"
              />
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-ink-2 text-[12px]">{text.length} / 280 · nur {share.fromName} liest das</span>
                <button
                  type="submit"
                  disabled={!text.trim()}
                  className="border-ink text-ink hover:bg-ink hover:text-paper border px-3 py-1.5 text-sm font-semibold transition-colors duration-150 disabled:opacity-50"
                >
                  Hinlegen
                </button>
              </div>
            </form>
          )}
        </SlipDialog>
      )}
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <main className="linen table-surface flex min-h-svh items-center justify-center bg-table px-6">
      <p className="text-on-table-2 max-w-sm text-center">{text}</p>
    </main>
  );
}

