"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type { BookData } from "@/content/books";
import { linkClass, RoomNav, RoomTitle, SignInTable, SlipDialog, TextButton, UndoToast } from "@/components/app-ui";
import { Library } from "@/components/books";
import { ShareDialog } from "@/components/share-dialog";
import { deleteBookForever, importBook, myBooks, saveBook, toBookData, trashBook, type StoredBook } from "@/lib/store";
import { friendlyError } from "@/lib/errors";
import { useUser } from "@/lib/use-user";

/** Werkbank: die eigenen Bücher zum Bearbeiten und Hinlegen, ein leeres zum Anlegen, der Papierkorb. Geschenkte liegen im Bücherzimmer. */
export function MyTable() {
  const user = useUser();
  const [own, setOwn] = useState<StoredBook[] | null>(null);
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
    myBooks(user.uid)
      .then((b) => alive && setOwn(b))
      .catch((e) => alive && setError(friendlyError(e)));
    return () => {
      alive = false;
    };
  }, [user]);

  const data = useMemo(() => {
    const list: { book: BookData; stored: StoredBook }[] = [];
    for (const b of (own ?? []).filter((b) => !b.trashed)) {
      try {
        list.push({ book: toBookData(b), stored: b });
      } catch {}
    }
    return list;
  }, [own]);

  if (user === undefined) return <main className="linen table-surface min-h-svh bg-table" />;
  if (user === null)
    return (
      <SignInTable title="Die Werkbank">
        Hier gestaltest du deine Fotobücher und legst sie Freunden hin.
      </SignInTable>
    );

  const byId = (id: string) => data.find((d) => d.book.id === id);
  const trash = (own ?? []).filter((b) => b.trashed).sort((a, b) => (b.trashed ?? 0) - (a.trashed ?? 0));

  const setTrashed = (id: string, on: boolean) => {
    const b = own?.find((x) => x.id === id);
    if (!b) return;
    setOwn((list) => list?.map((x) => (x.id === id ? { ...x, trashed: on ? Date.now() : undefined } : x)) ?? null);
    trashBook(b, on).catch((e) => setError(friendlyError(e)));
  };
  const emptyTrash = async () => {
    setEmptying(true);
    const list = (own ?? []).filter((b) => b.trashed);
    for (const b of list) {
      try {
        await deleteBookForever(b);
        setOwn((all) => all?.filter((x) => x.id !== b.id) ?? null);
      } catch (e) {
        setError(friendlyError(e));
      }
    }
    setEmptying(false);
    setConfirmEmpty(false);
  };
  const removeOwn = (s: StoredBook) => {
    setTrashed(s.id, true);
    setRemoved({ title: s.title || "Ohne Titel", at: Date.now(), undo: () => setTrashed(s.id, false) });
  };
  return (
    <main>
      <Library
        books={data.map((d) => d.book)}
        table={{
          label: "Werkbank",
          title: <RoomTitle>Werkbank</RoomTitle>,
          headerRight: <RoomNav />,
          extra: (b) => {
            const d = byId(b.id);
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
              <p className="mt-2 text-sm">
                <TextButton onClick={() => importInput.current?.click()}>Aus Datei öffnen</TextButton>
              </p>
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
                    setError(friendlyError(err));
                  }
                }}
              />
            </div>
          ),
        }}
        footer={
          <>
            {error && (
              <p role="alert" className="bg-table px-4 pb-6 text-sm text-on-table md:px-8">
                Konnte die Werkbank nicht laden: {error}
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
                        <TextButton onClick={() => setTrashed(b.id, false)}>Zurücklegen</TextButton>
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
              <Link href="/zimmer" className={linkClass}>
                Ins Bücherzimmer
              </Link>
            </footer>
          </>
        }
      />
      {sharing && (
        <ShareDialog
          book={sharing}
          onClose={() => setSharing(null)}
          onTitle={async (title) => {
            const b = { ...sharing, title };
            await saveBook(b);
            setOwn((all) => all?.map((x) => (x.id === b.id ? b : x)) ?? null);
            setSharing(b);
          }}
        />
      )}
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
      {removed && <UndoToast key={removed.at} text={`„${removed.title}“ liegt im Papierkorb.`} onUndo={removed.undo} onClose={() => setRemoved(null)} />}
    </main>
  );
}
