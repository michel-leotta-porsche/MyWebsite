"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type { BookData } from "@/content/books";
import { linkClass, SignInTable, TextButton } from "@/components/app-ui";
import { Library } from "@/components/books";
import { ShareDialog } from "@/components/share-dialog";
import { signOutNow } from "@/lib/firebase";
import { importBook, inbox, myBooks, toBookData, type Share, type StoredBook } from "@/lib/store";
import { useUser } from "@/lib/use-user";

/** Mein Tisch: eigene Bücher, Bücher, die jemand für mich hingelegt hat, und ein leeres zum Anlegen */
export function MyTable() {
  const user = useUser();
  const [own, setOwn] = useState<StoredBook[] | null>(null);
  const [gifts, setGifts] = useState<Share[]>([]);
  const [sharing, setSharing] = useState<StoredBook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const importInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    Promise.all([myBooks(user.uid), inbox(user.uid)])
      .then(([b, g]) => {
        if (!alive) return;
        setOwn(b);
        setGifts(g);
      })
      .catch((e) => alive && setError(String(e?.message ?? e)));
    return () => {
      alive = false;
    };
  }, [user]);

  // geteilte Bücher bekommen eine eigene Kennung, damit sie neben gleichnamigen eigenen liegen können
  const data = useMemo(() => {
    const list: { book: BookData; stored?: StoredBook; gift?: Share }[] = [];
    for (const b of own ?? []) {
      try {
        list.push({ book: toBookData(b), stored: b });
      } catch {}
    }
    for (const g of gifts) {
      try {
        list.push({ book: { ...toBookData(g.book), id: `geschenk-${g.token.slice(0, 10)}` }, gift: g });
      } catch {}
    }
    return list;
  }, [own, gifts]);

  if (user === undefined) return <main className="linen table-surface min-h-svh bg-table" />;
  if (user === null)
    return (
      <SignInTable title="Dein Tisch">
        Hier liegen deine eigenen Fotobücher und die, die Freunde für dich hingelegt haben.
      </SignInTable>
    );

  const byId = (id: string) => data.find((d) => d.book.id === id);

  return (
    <main>
      <Library
        books={data.map((d) => d.book)}
        table={{
          label: "Mein Tisch",
          headerRight: (
            <p className="text-on-table-2 flex items-baseline gap-4 text-sm">
              <span className="hidden md:inline">{user.displayName}</span>
              <TextButton onClick={() => importInput.current?.click()}>Aus Datei öffnen</TextButton>
              <input
                ref={importInput}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  try {
                    const b = await importBook(f, user.uid, user.displayName ?? "Ich");
                    location.href = `/neu?id=${b.id}`;
                  } catch (err) {
                    setError(err instanceof Error ? err.message : String(err));
                  }
                }}
              />
              <TextButton onClick={() => signOutNow()}>Abmelden</TextButton>
            </p>
          ),
          note: (b) => {
            const g = byId(b.id)?.gift;
            return g ? `Für ${g.to}, von ${g.fromName}` : undefined;
          },
          extra: (b) => {
            const s = byId(b.id)?.stored;
            if (!s) return null;
            return (
              <>
                <Link href={`/neu?id=${s.id}`} className={linkClass}>
                  Bearbeiten
                </Link>
                <TextButton onClick={() => setSharing(s)}>Hinlegen für …</TextButton>
              </>
            );
          },
          tiles: (
            <div className="table-book relative" style={{ ["--rot" as string]: "2deg", ["--dy" as string]: "24px" }}>
              <Link
                href="/neu"
                className="paper text-ink relative flex flex-col justify-between p-5 shadow-[0_22px_40px_-16px_rgb(12_10_8/0.8)] transition-transform duration-500 ease-out hover:-translate-y-2"
                style={{ width: "calc(var(--tw) * 0.85)", aspectRatio: "2 / 3" }}
              >
                <span className="text-ink-2 text-sm">Leeres Buch</span>
                <span className="text-xl leading-tight font-bold tracking-[-0.02em]" style={{ fontVariationSettings: '"wdth" 80' }}>
                  Neues Buch anlegen
                </span>
              </Link>
              <p className="text-on-table-2 mt-5 text-sm">Fotos reinziehen, fertig.</p>
            </div>
          ),
        }}
        footer={
          error ? (
            <p role="alert" className="bg-table px-4 pb-6 text-sm text-on-table md:px-8">
              Konnte den Tisch nicht laden: {error}
            </p>
          ) : null
        }
      />
      {sharing && <ShareDialog book={sharing} onClose={() => setSharing(null)} />}
    </main>
  );
}
