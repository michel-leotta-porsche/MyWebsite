"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type ReactNode } from "react";

import { books as sampleBooks, type BookData } from "@/content/books";
import { linkClass, RequireUser, RoomNav, SlipDialog, TextButton, UndoToast, Wordmark } from "@/components/app-ui";
import { Library } from "@/components/books";
import { ShareDialog } from "@/components/share-dialog";
import { Shelf, Table } from "@/components/table";
import type { User } from "@/lib/firebase";
import { friendlyError } from "@/lib/errors";
import { importBook, numberWord, saveBook, toBookData, type Share, type StoredBook } from "@/lib/store";
import { useRoom } from "@/lib/use-room";

/** Google-Konten, unter denen Michel angemeldet ist. Kein Schutz: die Fotos liegen ohnehin öffentlich unter /photos */
const OWNER_EMAILS = ["michel.julian.leotta@gmail.com"];
const isOwner = (u: User) => !!u.email && OWNER_EMAILS.includes(u.email.toLowerCase());

const books = (n: number) => (n === 0 ? "Keine Bücher" : n === 1 ? "Ein Buch" : `${numberWord(n)} Bücher`);
const some = (n: number) => (n === 1 ? "eines" : numberWord(n).toLowerCase());

/**
 * Bücherzimmer: der eine Raum hinter der Anmeldung. Oben „Von dir“ (eigene Bücher und ein leeres zum Anlegen),
 * darunter „Für dich“ (was Freunde hingelegt haben), am Ende der Papierkorb.
 * Gestaltet wird ein einzelnes Buch auf der Werkbank (/neu).
 */
export function BookRoom() {
  return (
    <RequireUser title="Dein Bücherzimmer" text="Hier liegen deine eigenen Fotobücher und die, die Freunde für dich hingelegt haben.">
      {(user) => <Room user={user} />}
    </RequireUser>
  );
}

type Item = { book: BookData; stored?: StoredBook; gift?: Share };
type More = { stored: StoredBook } | { gift: Share };

function Room({ user }: { user: User }) {
  const room = useRoom(user.uid);
  const [more, setMore] = useState<More | null>(null);
  const [sharing, setSharing] = useState<StoredBook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState<{ text: string; at: number; undo: () => void } | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [emptying, setEmptying] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);

  const { own, gifts, trash } = room;

  // geteilte Bücher bekommen eine eigene Kennung, damit sie neben gleichnamigen eigenen liegen können
  const mine = useMemo(() => {
    const list: Item[] = [];
    // Michels Bände Fuerteventura und Japan liegen nur für ihn hier, wie seine anderen Bücher
    if (isOwner(user)) for (const b of sampleBooks) list.push({ book: b });
    for (const b of own ?? []) {
      try {
        list.push({ book: toBookData(b), stored: b });
      } catch {}
    }
    return list;
  }, [own, user]);
  const given = useMemo(() => {
    const list: Item[] = [];
    for (const g of gifts ?? []) {
      try {
        list.push({ book: { ...toBookData(g.book), id: `geschenk-${g.token.slice(0, 10)}` }, gift: g });
      } catch {}
    }
    return list;
  }, [gifts]);

  const all = [...mine, ...given];
  const byId = (id: string) => all.find((d) => d.book.id === id);
  const ownLoaded = own !== null;
  const giftsLoaded = gifts !== null;

  const more$ = (b: BookData) => {
    const d = byId(b.id);
    if (!d?.stored && !d?.gift) return null;
    return (
      <>
        {d.stored && (
          <Link href={`/neu?id=${d.stored.id}`} className={linkClass}>
            Bearbeiten
          </Link>
        )}
        <TextButton className="text-on-table-2" onClick={() => setMore(d.stored ? { stored: d.stored } : { gift: d.gift! })}>
          Mehr …
        </TextButton>
      </>
    );
  };

  const zoneError = (text: string | undefined, zone: "own" | "gifts") =>
    text && (
      <p role="alert" className="text-on-table text-sm">
        Konnte {zone === "own" ? "deine Bücher" : "die Bücher von Freunden"} nicht laden: {text}{" "}
        <TextButton onClick={() => room.retry(zone)}>Nochmal versuchen</TextButton>
      </p>
    );

  // bis die Bücher da sind, hält ein unsichtbarer Platz die Höhe einer Reihe
  const placeholder = <li aria-hidden style={{ height: "calc(var(--tw) * 1.5 + 84px)" }} />;

  const fromYou = (
    <Shelf
      key="von-dir"
      id="von-dir"
      heading="Von dir"
      books={mine.map((d) => d.book)}
      actions={more$}
      meta={(b) => {
        const s = byId(b.id)?.stored;
        return s && !s.title.trim() ? `${s.photos.filter((p) => !p.shelved).length} Fotos · ohne Titel` : undefined;
      }}
      tiles={
        ownLoaded ? (
          <li className="table-book relative" style={{ ["--rot" as string]: "0deg" }}>
            <Link
              href="/neu"
              className="text-on-table-2 hover:text-on-table relative flex flex-col justify-between border border-dashed border-on-table-2/60 p-[9%] transition-colors duration-150"
              style={{ width: "calc(var(--tw) * 0.85)", aspectRatio: "2 / 3" }}
            >
              <span className="text-sm">Leeres Buch</span>
              <span className="text-on-table text-xl leading-tight font-bold tracking-[-0.02em]" style={{ fontVariationSettings: '"wdth" 80' }}>
                Neues Buch anlegen
              </span>
            </Link>
            <div className="mt-4 grid gap-0.5 text-sm">
              <p className="text-on-table-2">Fotos reinziehen, fertig.</p>
              <p className="mt-1.5">
                <TextButton className="text-on-table-2" onClick={() => importInput.current?.click()}>
                  Aus Datei öffnen
                </TextButton>
              </p>
            </div>
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
          </li>
        ) : (
          placeholder
        )
      }
    >
      {zoneError(room.errors.own, "own")}
    </Shelf>
  );

  const forYou = (
    <Shelf
      key="fuer-dich"
      id="fuer-dich"
      heading="Für dich"
      books={given.map((d) => d.book)}
      note={(b) => {
        const g = byId(b.id)?.gift;
        return g ? `von ${g.fromName}` : undefined;
      }}
      meta={(b) => {
        const g = byId(b.id)?.gift;
        return g ? `von ${g.fromName} · ${b.plates.length} Tafeln` : undefined;
      }}
      actions={more$}
      tiles={giftsLoaded ? undefined : placeholder}
    >
      {giftsLoaded && given.length === 0 && !room.errors.gifts && (
        <p className="text-on-table-2 max-w-md text-sm leading-relaxed">Bücher, die dir jemand hinlegt, landen von selbst hier, sobald du ihren Link öffnest.</p>
      )}
      {zoneError(room.errors.gifts, "gifts")}
    </Shelf>
  );

  // wer noch nichts gemacht, aber etwas geschenkt bekommen hat, sieht zuerst das Geschenk
  const giftsFirst = ownLoaded && mine.length === 0 && given.length > 0;
  const count = ownLoaded && giftsLoaded ? stock(mine.length, given.length) : " ";

  return (
    <main>
      <Library books={all.map((d) => d.book)}>
        <Table label="Bücherzimmer" title={<Wordmark />} headerRight={<RoomNav />}>
          <div className="grid gap-3">
            <h1
              className="text-on-table text-[clamp(44px,6.4vw,92px)] leading-[0.88] font-bold tracking-[-0.035em]"
              style={{ fontVariationSettings: '"wdth" 75, "opsz" 96' }}
            >
              Bücherzimmer
            </h1>
            <p className="text-on-table-2 text-base" aria-live="polite">
              {count}
            </p>
          </div>
          {giftsFirst ? [forYou, fromYou] : [fromYou, forYou]}
          {trash.length > 0 && (
            <section aria-label="Papierkorb" className="text-on-table-2 text-sm">
              <TextButton className="text-on-table-2" aria-expanded={showTrash} onClick={() => setShowTrash((v) => !v)}>
                Papierkorb ({trash.length})
              </TextButton>
              {showTrash && (
                <>
                  <p className="mt-2 max-w-xl text-[13px]">Bücher im Papierkorb liegen nirgends aus, ihre geteilten Links zeigen nichts mehr.</p>
                  <ul className="mt-4 max-w-xl">
                    {trash.map((b) => (
                      <li key={b.id} className="flex items-baseline justify-between gap-4 border-t border-on-table-2/25 py-2.5">
                        <span className="text-on-table min-w-0 truncate">
                          {b.title || "Ohne Titel"} <span className="text-on-table-2">· {b.photos.filter((p) => !p.shelved).length} Fotos</span>
                        </span>
                        <TextButton onClick={() => room.restore(b)}>Zurücklegen</TextButton>
                      </li>
                    ))}
                    <li className="border-t border-on-table-2/25 pt-3">
                      <TextButton onClick={() => setConfirmEmpty(true)}>Papierkorb leeren …</TextButton>
                    </li>
                  </ul>
                </>
              )}
            </section>
          )}
          {error && (
            <p role="alert" className="text-on-table text-sm">
              {error}
            </p>
          )}
        </Table>
      </Library>

      {more && (
        <SlipDialog label={"stored" in more ? more.stored.title || "Ohne Titel" : more.gift.book.title || "Ohne Titel"} onClose={() => setMore(null)}>
          {"stored" in more ? (
            <Actions>
              <Action
                onClick={() => {
                  setSharing(more.stored);
                  setMore(null);
                }}
                hint="Ein persönlicher Link pro Person, jederzeit zurückziehbar"
              >
                Hinlegen für …
              </Action>
              <Action
                onClick={() => {
                  const s = more.stored;
                  setMore(null);
                  setRemoved({ text: `„${s.title || "Ohne Titel"}“ liegt im Papierkorb.`, at: Date.now(), undo: room.toTrash(s) });
                }}
                hint="Von dort lässt es sich zurücklegen"
              >
                In den Papierkorb
              </Action>
            </Actions>
          ) : (
            <Actions>
              <p className="text-ink-2 text-sm">
                Für {more.gift.to}, von {more.gift.fromName}.
              </p>
              <Action
                onClick={() => {
                  const g = more.gift;
                  setMore(null);
                  setRemoved({ text: `„${g.book.title || "Ohne Titel"}“ liegt nicht mehr in deinem Zimmer.`, at: Date.now(), undo: room.dropGift(g) });
                }}
                hint={`Nur aus deinem Zimmer; bei ${more.gift.fromName} bleibt das Buch`}
              >
                Aus dem Zimmer nehmen
              </Action>
            </Actions>
          )}
        </SlipDialog>
      )}
      {sharing && (
        <ShareDialog
          book={sharing}
          onClose={() => setSharing(null)}
          onTitle={async (title) => {
            const b = { ...sharing, title };
            await saveBook(b);
            room.replace(b);
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
              onClick={async () => {
                setEmptying(true);
                await room.emptyTrash();
                setEmptying(false);
                setConfirmEmpty(false);
              }}
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
      {removed && <UndoToast key={removed.at} text={removed.text} onUndo={removed.undo} onClose={() => setRemoved(null)} />}
    </main>
  );
}

/** Bestand in einer Zeile: „Fünf Bücher: drei von dir, zwei für dich.“ */
function stock(mine: number, given: number) {
  if (mine + given === 0) return "Noch liegt hier nichts. Leg dein erstes Buch an.";
  if (given === 0) return `${books(mine)} von dir.`;
  if (mine === 0) return `${books(given)} für dich.`;
  return `${books(mine + given)}: ${some(mine)} von dir, ${some(given)} für dich.`;
}

function Actions({ children }: { children: ReactNode }) {
  return <div className="grid gap-1">{children}</div>;
}

/** Eine Zeile im Zettel: Handlung groß, was sie bewirkt klein darunter */
function Action({ onClick, hint, children }: { onClick: () => void; hint: string; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="group grid border-t border-ink/15 py-3 text-left first:border-t-0">
      <span className="text-ink font-semibold underline decoration-transparent decoration-2 underline-offset-4 transition-colors duration-150 group-hover:decoration-mark">
        {children}
      </span>
      <span className="text-ink-2 text-[13px]">{hint}</span>
    </button>
  );
}
