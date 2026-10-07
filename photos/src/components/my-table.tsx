"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type { BookData } from "@/content/books";
import { linkClass, SignInTable, SlipDialog, TextButton } from "@/components/app-ui";
import { Library } from "@/components/books";
import { ShareDialog } from "@/components/share-dialog";
import { signOutNow } from "@/lib/firebase";
import { deleteBookForever, dropFromInbox, importBook, inbox, keepInInbox, myBooks, toBookData, trashBook, type Share, type StoredBook } from "@/lib/store";
import { useUser } from "@/lib/use-user";

/** Mein Tisch: eigene Bücher, Bücher, die jemand für mich hingelegt hat, und ein leeres zum Anlegen */
export function MyTable() {
  const user = useUser();
  const [own, setOwn] = useState<StoredBook[] | null>(null);
  const [gifts, setGifts] = useState<Share[]>([]);
  const [sharing, setSharing] = useState<StoredBook | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** zuletzt vom Tisch genommen: für „Rückgängig“ */
  const [removed, setRemoved] = useState<{ title: string; at: number; undo: () => void } | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [emptying, setEmptying] = useState(false);
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
    for (const b of (own ?? []).filter((b) => !b.trashed)) {
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
  const trash = (own ?? []).filter((b) => b.trashed).sort((a, b) => (b.trashed ?? 0) - (a.trashed ?? 0));

  const setTrashed = (id: string, on: boolean) => {
    const b = own?.find((x) => x.id === id);
    if (!b) return;
    setOwn((list) => list?.map((x) => (x.id === id ? { ...x, trashed: on ? Date.now() : undefined } : x)) ?? null);
    trashBook(b, on).catch((e) => setError(String(e?.message ?? e)));
  };
  const emptyTrash = async () => {
    setEmptying(true);
    const list = (own ?? []).filter((b) => b.trashed);
    for (const b of list) {
      try {
        await deleteBookForever(b);
        setOwn((all) => all?.filter((x) => x.id !== b.id) ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
    setEmptying(false);
    setConfirmEmpty(false);
  };
  const removeOwn = (s: StoredBook) => {
    setTrashed(s.id, true);
    setRemoved({ title: s.title || "Ohne Titel", at: Date.now(), undo: () => setTrashed(s.id, false) });
  };
  const removeGift = (g: Share) => {
    if (!user) return;
    setGifts((list) => list.filter((x) => x.token !== g.token));
    dropFromInbox(user.uid, g.token).catch((e) => setError(String(e?.message ?? e)));
    setRemoved({
      title: g.book.title || "Ohne Titel",
      at: Date.now(),
      undo: () => {
        setGifts((list) => [...list, g]);
        keepInInbox(user.uid, g).catch(() => {});
      },
    });
  };

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
            const d = byId(b.id);
            if (d?.gift)
              return (
                <TextButton onClick={() => removeGift(d.gift!)} title="Nur von deinem Tisch; beim Schenkenden bleibt das Buch">
                  Vom Tisch nehmen
                </TextButton>
              );
            const s = d?.stored;
            if (!s) return null;
            return (
              <>
                <Link href={`/neu?id=${s.id}`} className={linkClass}>
                  Bearbeiten
                </Link>
                <TextButton onClick={() => setSharing(s)}>Hinlegen für …</TextButton>
                <TextButton onClick={() => removeOwn(s)} title="Legt das Buch in den Papierkorb; von dort lässt es sich zurücklegen">
                  Entfernen
                </TextButton>
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
          <>
            {error && (
              <p role="alert" className="bg-table px-4 pb-6 text-sm text-on-table md:px-8">
                Konnte den Tisch nicht laden: {error}
              </p>
            )}
            {trash.length > 0 && (
              <section aria-label="Papierkorb" className="bg-table-deep px-4 pt-8 text-sm text-on-table-2 md:px-8">
                <TextButton aria-expanded={showTrash} onClick={() => setShowTrash((v) => !v)}>
                  Papierkorb ({trash.length})
                </TextButton>
                {showTrash && (
                  <p className="mt-2 max-w-xl text-[13px]">Bücher im Papierkorb liegen auf keinem Tisch, ihre geteilten Links zeigen nichts mehr.</p>
                )}
                {showTrash && (
                  <ul className="mt-4 max-w-xl">
                    {trash.map((b) => (
                      <li key={b.id} className="flex items-baseline justify-between gap-4 border-t border-on-table-2/25 py-2.5">
                        <span className="text-on-table min-w-0 truncate">
                          {b.title || "Ohne Titel"} <span className="text-on-table-2">· {b.photos.filter((p) => !p.shelved).length} Fotos</span>
                        </span>
                        <TextButton onClick={() => setTrashed(b.id, false)}>Zurück auf den Tisch</TextButton>
                      </li>
                    ))}
                    <li className="border-t border-on-table-2/25 pt-3">
                      <TextButton onClick={() => setConfirmEmpty(true)}>Papierkorb leeren …</TextButton>
                    </li>
                  </ul>
                )}
              </section>
            )}
            <footer className="linen table-surface relative flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 bg-table-deep px-4 py-10 text-sm text-on-table-2 md:px-8">
              <p>
                <span className="font-semibold text-on-table">Fujiventura</span> · Fotobücher gestalten und Freunden hinlegen
              </p>
              <Link href="/" className={linkClass}>
                Michels Bücher
              </Link>
            </footer>
          </>
        }
      />
      {sharing && <ShareDialog book={sharing} onClose={() => setSharing(null)} />}
      {confirmEmpty && (
        <SlipDialog label="Papierkorb leeren" onClose={() => !emptying && setConfirmEmpty(false)}>
          <p className="text-sm leading-relaxed">
            {trash.length === 1 ? "Ein Buch wird" : `${trash.length} Bücher werden`} endgültig gelöscht: mit allen Fotos, Zwischenständen und geteilten Links samt
            Zetteln der Gäste. Das lässt sich nicht rückgängig machen.
          </p>
          <ul className="text-ink-2 mt-3 text-[13px]">
            {trash.map((b) => (
              <li key={b.id}>· {b.title || "Ohne Titel"}</li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2 text-sm">
            <button
              type="button"
              disabled={emptying}
              onClick={emptyTrash}
              className="border-ink bg-ink text-paper hover:bg-ink/85 border px-3 py-2 font-semibold disabled:opacity-60"
            >
              {emptying ? "Löscht …" : "Endgültig löschen"}
            </button>
            <button type="button" disabled={emptying} onClick={() => setConfirmEmpty(false)} className="underline decoration-mark decoration-2 underline-offset-4">
              Abbrechen
            </button>
          </div>
        </SlipDialog>
      )}
      {removed && <UndoToast key={removed.at} text={`„${removed.title}“ liegt nicht mehr auf dem Tisch.`} onUndo={removed.undo} onClose={() => setRemoved(null)} />}
    </main>
  );
}

/** Hinweis mit Rückgängig; verschwindet nach zehn Sekunden */
function UndoToast({ text, onUndo, onClose }: { text: string; onUndo: () => void; onClose: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onClose, 10000);
    return () => window.clearTimeout(id);
  }, [onClose]);
  return (
    <div role="status" className="slip text-ink fixed right-4 bottom-4 z-[640] flex max-w-sm items-baseline gap-4 p-4 text-sm shadow-[0_18px_36px_-14px_rgb(12_10_8/0.8)]">
      <span>{text}</span>
      <button
        type="button"
        onClick={() => {
          onUndo();
          onClose();
        }}
        className="shrink-0 font-semibold underline decoration-mark decoration-2 underline-offset-4"
      >
        Rückgängig
      </button>
    </div>
  );
}
