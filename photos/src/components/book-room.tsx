"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { books as sampleBooks, type BookData } from "@/content/books";
import { linkClass, RequireUser, RoomNav, RoomTitle, TextButton, UndoToast } from "@/components/app-ui";
import { Library } from "@/components/books";
import type { User } from "@/lib/firebase";
import { dropFromInbox, inbox, keepInInbox, myBooks, toBookData, type Share, type StoredBook } from "@/lib/store";
import { friendlyError } from "@/lib/errors";

/** Google-Konten, unter denen Michel angemeldet ist. Kein Schutz: die Fotos liegen ohnehin öffentlich unter /photos */
const OWNER_EMAILS = ["michel.julian.leotta@gmail.com"];
const isOwner = (u: User) => !!u.email && OWNER_EMAILS.includes(u.email.toLowerCase());

/** Bücherzimmer: alles zum Lesen, die eigenen Bücher und die, die Freunde hingelegt haben */
export function BookRoom() {
  return (
    <RequireUser title="Dein Bücherzimmer" text="Hier liegen deine eigenen Fotobücher und die, die Freunde für dich hingelegt haben.">
      {(user) => <Room user={user} />}
    </RequireUser>
  );
}

function Room({ user }: { user: User }) {
  const [own, setOwn] = useState<StoredBook[] | null>(null);
  const [gifts, setGifts] = useState<Share[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState<{ title: string; at: number; undo: () => void } | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([myBooks(user.uid), inbox(user.uid)])
      .then(([b, g]) => {
        if (!alive) return;
        setOwn(b);
        setGifts(g);
      })
      .catch((e) => alive && setError(friendlyError(e)));
    return () => {
      alive = false;
    };
  }, [user.uid]);

  // geteilte Bücher bekommen eine eigene Kennung, damit sie neben gleichnamigen eigenen liegen können
  const data = useMemo(() => {
    const list: { book: BookData; stored?: StoredBook; gift?: Share }[] = [];
    // Michels eigene Bände (Fuerteventura, Japan) lagen früher auf der Landing Page; jetzt nur noch hier, für ihn
    if (isOwner(user)) for (const b of sampleBooks) list.push({ book: b });
    for (const b of (own ?? []).filter((b) => !b.trashed)) {
      try {
        list.push({ book: toBookData(b), stored: b });
      } catch {}
    }
    for (const g of gifts ?? []) {
      try {
        list.push({ book: { ...toBookData(g.book), id: `geschenk-${g.token.slice(0, 10)}` }, gift: g });
      } catch {}
    }
    return list;
  }, [own, gifts, user]);

  const byId = (id: string) => data.find((d) => d.book.id === id);
  const loaded = own !== null && gifts !== null;

  const removeGift = (g: Share) => {
    setGifts((list) => list?.filter((x) => x.token !== g.token) ?? null);
    dropFromInbox(user.uid, g.token).catch((e) => setError(friendlyError(e)));
    setRemoved({
      title: g.book.title || "Ohne Titel",
      at: Date.now(),
      undo: () => {
        setGifts((list) => [...(list ?? []), g]);
        keepInInbox(user.uid, g).catch(() => {});
      },
    });
  };

  return (
    <main>
      <Library
        books={data.map((d) => d.book)}
        table={{
          label: "Bücherzimmer",
          title: <RoomTitle>Bücherzimmer</RoomTitle>,
          headerRight: <RoomNav />,
          note: (b) => {
            const g = byId(b.id)?.gift;
            return g ? `Für ${g.to}, von ${g.fromName}` : undefined;
          },
          extra: (b) => {
            const d = byId(b.id);
            if (d?.gift)
              return (
                <TextButton onClick={() => removeGift(d.gift!)} title="Nur aus deinem Zimmer; beim Schenkenden bleibt das Buch">
                  Aus dem Zimmer nehmen
                </TextButton>
              );
            if (!d?.stored) return null;
            return (
              <Link href={`/neu?id=${d.stored.id}`} className={linkClass}>
                Auf die Werkbank
              </Link>
            );
          },
          tiles:
            loaded && data.length === 0 ? (
              <div className="max-w-sm">
                <p className="text-on-table text-xl leading-snug font-semibold tracking-[-0.01em]">Noch liegt hier nichts.</p>
                <p className="text-on-table-2 mt-3 text-base leading-relaxed">
                  Auf der Werkbank legst du dein erstes Buch an. Bücher, die dir jemand hinlegt, landen von selbst hier.
                </p>
                <p className="mt-5">
                  <Link href="/neu" className={linkClass}>
                    Erstes Buch anlegen
                  </Link>
                </p>
              </div>
            ) : undefined,
        }}
        footer={
          <>
            {error && (
              <p role="alert" className="bg-table px-4 pb-6 text-sm text-on-table md:px-8">
                Konnte das Bücherzimmer nicht laden: {error}
              </p>
            )}
            <footer className="linen table-surface relative flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 bg-table-deep px-4 py-10 text-sm text-on-table-2 md:px-8">
              <p>
                <span className="font-semibold text-on-table">Fujiventura</span> · Deine Bücher und die von Freunden
              </p>
              <Link href="/tisch" className={linkClass}>
                Zur Werkbank
              </Link>
            </footer>
          </>
        }
      />
      {removed && <UndoToast key={removed.at} text={`„${removed.title}“ liegt nicht mehr in deinem Zimmer.`} onUndo={removed.undo} onClose={() => setRemoved(null)} />}
    </main>
  );
}
