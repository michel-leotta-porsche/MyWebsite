"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useContext, useMemo, useRef, useState, type ReactNode } from "react";

import { books as sampleBooks, type BookData } from "@/content/books";
import { linkClass, RequireUser, RoomNav, SlipDialog, TextButton, UndoToast, Wordmark } from "@/components/app-ui";
import { Library } from "@/components/books";
import { ReportDialog } from "@/components/report-dialog";
import { ShareDialog } from "@/components/share-dialog";
import { OpenBook, Shelf, Table } from "@/components/table";
import type { User } from "@/lib/firebase";
import { IS_APP } from "@/lib/app-mode";
import { friendlyError } from "@/lib/errors";
import { importBook, numberWord, saveBook, toBookData, type Share, type StoredBook } from "@/lib/store";
import { useRoom, type Feedback, type Spread } from "@/lib/use-room";

/** Google-Konten, unter denen Michel angemeldet ist. Kein Schutz: die Fotos liegen ohnehin öffentlich unter /photos */
const OWNER_EMAILS = ["michel.julian.leotta@gmail.com"];
const isOwner = (u: User) => !!u.email && OWNER_EMAILS.includes(u.email.toLowerCase());

const books = (n: number) => (n === 0 ? "Keine Bücher" : n === 1 ? "Ein Buch" : `${numberWord(n)} Bücher`);
const some = (n: number) => (n === 1 ? "eines" : numberWord(n).toLowerCase());

/**
 * Bücherzimmer: der eine Raum hinter der Anmeldung. Oben „Von dir“ (eigene Bücher und ein leeres zum Anlegen),
 * darunter „Für dich“ (was Freunde hingelegt haben), am Ende der Papierkorb.
 * Die Bücher stehen als Regal, eins pro Zeile: daneben liegen, was Freunde zurückgelassen haben (Zettel, Eselsohren).
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
  const [returns, setReturns] = useState<{ book: BookData; stored: StoredBook } | null>(null);
  const [sharing, setSharing] = useState<StoredBook | null>(null);
  const [reporting, setReporting] = useState<Share | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState<{ text: string; at: number; undo: () => void } | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [emptying, setEmptying] = useState(false);
  const router = useRouter();
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
  // im eigenen Buch stehen die Eselsohren der Freunde, wie sie sie geknickt haben
  const earsById = Object.fromEntries(
    mine.flatMap((d) => (d.stored ? [[d.book.id, (room.spread[d.stored.id]?.items ?? []).flatMap((n) => (n.kind === "ear" && n.no ? [n.no] : []))]] : [])),
  );
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
        {d.stored && !room.spread[d.stored.id]?.to.length && (
          <TextButton onClick={() => setSharing(d.stored!)}>Hinlegen für …</TextButton>
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
  const placeholder = <li aria-hidden style={{ height: "calc(var(--tw) * 1.5 + 44px)" }} />;

  const fromYou = (
    <Shelf
      key="von-dir"
      id="von-dir"
      heading="Von dir"
      books={mine.map((d) => d.book)}
      rows
      actions={more$}
      meta={(b) => {
        const s = byId(b.id)?.stored;
        if (!s) return undefined;
        const base = s.title.trim() ? `${b.plates.length} Tafeln` : `${s.photos.filter((p) => !p.shelved).length} Fotos · ohne Titel`;
        return (
          <>
            {base}
            <span className="block">{whereOf(room.spread[s.id])}</span>
          </>
        );
      }}
      extra={(b) => {
        const s = byId(b.id)?.stored;
        const sp = s && room.spread[s.id];
        return sp && sp.items.length > 0 ? <Returns book={b} spread={sp} onAll={() => setReturns({ book: b, stored: s })} /> : undefined;
      }}
      tiles={
        ownLoaded ? (
          <li className="table-book shelf-row relative" style={{ ["--rot" as string]: "0deg" }}>
            <Link
              href="/neu"
              className="text-on-table-2 hover:text-on-table relative flex flex-col justify-between border border-dashed border-on-table-2/60 p-[9%] transition-colors duration-150"
              style={{ width: "var(--tw)", aspectRatio: "2 / 3" }}
            >
              <span className="text-sm">Leeres Buch</span>
              <span className="text-on-table text-lg leading-tight font-bold tracking-[-0.02em]" style={{ fontVariationSettings: '"wdth" 80' }}>
                Neues Buch anlegen
              </span>
            </Link>
            <div className="grid content-start gap-0.5 text-sm">
              <p className="text-on-table-2">{IS_APP ? "Fotos wählen, fertig." : "Fotos reinziehen, fertig."}</p>
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
                  router.push(`/neu?id=${b.id}`);
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
      rows
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
      <Library
        books={all.map((d) => d.book)}
        ears={earsById}
      >
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
          {returns && (
            <ReturnsDialog
              book={returns.book}
              spread={room.spread[returns.stored.id]}
              onClose={() => setReturns(null)}
              onManage={() => {
                setSharing(returns.stored);
                setReturns(null);
              }}
            />
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
              <Action
                onClick={() => {
                  setReporting(more.gift);
                  setMore(null);
                }}
                hint="Wenn das Buch gegen die Nutzungsbedingungen verstößt"
              >
                Melden …
              </Action>
              <Action
                onClick={() => {
                  const g = more.gift;
                  setMore(null);
                  room.block(g);
                }}
                hint={`Alle Bücher von ${more.gift.fromName} verschwinden; im Profil zurücknehmbar`}
              >
                Bücher von {more.gift.fromName} ausblenden
              </Action>
            </Actions>
          )}
        </SlipDialog>
      )}
      {reporting && (
        <ReportDialog share={reporting} reporter={user.uid} onClose={() => setReporting(null)} onBlock={() => room.block(reporting)} />
      )}
      {sharing && (
        <ShareDialog
          book={sharing}
          onClose={() => {
            setSharing(null);
            room.recount();
          }}
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

/** Bei wem ein eigenes Buch liegt: „bei Anna und Tom“, ab drei „bei Anna, Tom +1“ */
function whereOf(s: Spread | undefined): string {
  if (!s || s.to.length === 0) return "liegt noch bei niemandem";
  return `bei ${s.to.length <= 2 ? s.to.join(" und ") : `${s.to.slice(0, 2).join(", ")} +${s.to.length - 2}`}`;
}

const earWord = (n: number) => (n === 1 ? "Eselsohr" : "Eselsohren");
const plateOf = (book: BookData, no?: number) => (no ? book.plates.find((p) => p.no === no) : undefined);

/** Kleines Foto einer Tafel mit umgeknickter Ecke, wie das Eselsohr im Buch */
function EarThumb({ book, no, className = "h-10 w-[30px]", cut = "bg-table" }: { book: BookData; no?: number; className?: string; /** Farbe hinter der Ecke */ cut?: string }) {
  const plate = plateOf(book, no);
  return (
    <span aria-hidden className={`bg-paper-shade relative block shrink-0 overflow-hidden ${className}`}>
      {plate && <Image src={plate.thumb} alt="" fill sizes="64px" className="object-cover" />}
      <span className="bg-paper-shade absolute top-0 right-0 size-[34%] shadow-[-1px_1px_2px_rgb(12_10_8/0.35)] [clip-path:polygon(0_0,100%_100%,0_100%)]" />
      <span className={`${cut} absolute top-0 right-0 size-[34%] [clip-path:polygon(0_0,100%_0,100%_100%)]`} />
    </span>
  );
}

/** Neben dem Buch: der neueste Zettel in Handschrift und die Eselsohren als kleine Tafeln. Antippen zeigt alles */
function Returns({ book, spread, onAll }: { book: BookData; spread: Spread; onAll: () => void }) {
  const notes = spread.items.filter((n) => n.kind === "note");
  const ears = spread.items.filter((n) => n.kind === "ear");
  const latest = notes[0];
  return (
    <div className="mt-3 grid justify-items-start gap-3">
      {latest && (
        <button
          type="button"
          onClick={onAll}
          aria-label={`Zettel von ${latest.who}: ${latest.text}. Alle Rückmeldungen ansehen`}
          className="slip text-ink relative w-full max-w-72 -rotate-1 px-3 pt-2 pb-2.5 text-left shadow-[2px_4px_10px_-4px_rgb(12_10_8/0.7)] transition-transform duration-150 hover:rotate-0"
        >
          <span className="line-clamp-3 text-[21px] leading-[1.02]" style={{ fontFamily: "var(--font-hand), cursive" }}>
            „{latest.text}“
          </span>
          <span className="text-ink-2 mt-1.5 block text-xs">
            {latest.who}
            {notes.length > 1 && ` · ${notes.length - 1} ${notes.length === 2 ? "weiterer Zettel" : "weitere Zettel"}`}
          </span>
        </button>
      )}
      {ears.length > 0 && (
        <button type="button" onClick={onAll} className="group flex items-center gap-1.5 text-left" aria-label={`${ears.length} ${earWord(ears.length)} ansehen`}>
          {ears.slice(0, 4).map((e) => (
            <EarThumb key={e.id} book={book} no={e.no} />
          ))}
          <span className="text-on-table-2 group-hover:text-on-table ml-1.5 text-xs transition-colors duration-150">
            {ears.length > 4 && `+${ears.length - 4} · `}
            {ears.length} {earWord(ears.length)}
          </span>
        </button>
      )}
    </div>
  );
}

/** Alles, was zu einem Buch zurückkam, mit Weg ins Buch; Entfernen und Links bleiben bei „Hinlegen für …“ */
function ReturnsDialog({ book, spread, onClose, onManage }: { book: BookData; spread?: Spread; onClose: () => void; onManage: () => void }) {
  const { open } = useContext(OpenBook);
  const items = spread?.items ?? [];
  const notes = items.filter((n) => n.kind === "note").length;
  const ears = items.length - notes;
  return (
    <SlipDialog label={`Zurück von Freunden: ${book.title}`} onClose={onClose}>
      <p className="text-ink-2 text-sm">
        {[notes && `${notes} Zettel`, ears && `${ears} ${earWord(ears)}`].filter(Boolean).join(" · ")} · {whereOf(spread)}
      </p>
      <ul className="mt-3">
        {items.map((n) => (
          <FeedbackRow key={`${n.token}-${n.id}`} book={book} n={n} />
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2 text-sm">
        <button
          type="button"
          onClick={() => {
            onClose();
            open(book.id);
          }}
          className="border-ink bg-ink text-paper hover:bg-ink/85 border px-3 py-2 font-semibold"
        >
          Buch aufschlagen
        </button>
        <button type="button" onClick={onManage} className="underline decoration-mark decoration-2 underline-offset-4">
          Links und Zettel verwalten …
        </button>
      </div>
    </SlipDialog>
  );
}

function FeedbackRow({ book, n }: { book: BookData; n: Feedback }) {
  const when = n.at?.seconds ? new Date(n.at.seconds * 1000).toLocaleDateString("de-DE", { day: "numeric", month: "short" }) : null;
  const place = n.no ? `Tafel ${n.no}` : null;
  const sub = [n.who, place, when].filter(Boolean).join(" · ");
  return n.kind === "ear" ? (
    <li className="flex items-center gap-3 border-t border-ink/15 py-2.5">
      <EarThumb book={book} no={n.no} className="h-12 w-9" cut="bg-[var(--slip)]" />
      <span className="text-sm">
        <span className="font-semibold">{n.who}</span> hat {place ? `bei ${place}` : ""} ein Eselsohr gemacht
        {when && <span className="text-ink-2 block text-xs">{when}</span>}
      </span>
    </li>
  ) : (
    <li className="border-t border-ink/15 py-2.5">
      <p className="text-[22px] leading-[1.05]" style={{ fontFamily: "var(--font-hand), cursive" }}>
        „{n.text}“
      </p>
      <p className="text-ink-2 mt-1 text-xs">{sub}</p>
    </li>
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
