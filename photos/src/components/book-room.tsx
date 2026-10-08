"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { books as sampleBooks, type BookData } from "@/content/books";
import { linkClass, RequireUser, RoomNav, SlipDialog, TextButton, UndoToast, Wordmark } from "@/components/app-ui";
import { Library } from "@/components/books";
import { ReportDialog } from "@/components/report-dialog";
import { ShareDialog } from "@/components/share-dialog";
import { Carousel, CoverEar, SlipTabs, type Slide } from "@/components/room-carousel";
import { OpenBook, Table } from "@/components/table";
import type { User } from "@/lib/firebase";
import { IS_APP } from "@/lib/app-mode";
import { friendlyError } from "@/lib/errors";
import { importBook, numberWord, saveBook, toBookData, type Share, type StoredBook } from "@/lib/store";
import { useRoom, type Feedback, type Spread } from "@/lib/use-room";
import { markSeen, seenSnapshot } from "@/lib/seen";

/** Google-Konten, unter denen Michel angemeldet ist. Kein Schutz: die Fotos liegen ohnehin öffentlich unter /photos */
const OWNER_EMAILS = ["michel.julian.leotta@gmail.com"];
const isOwner = (u: User) => !!u.email && OWNER_EMAILS.includes(u.email.toLowerCase());

const books = (n: number) => (n === 0 ? "Keine Bücher" : n === 1 ? "Ein Buch" : `${numberWord(n)} Bücher`);
const some = (n: number) => (n === 1 ? "eines" : numberWord(n).toLowerCase());

/**
 * Bücherzimmer: der eine Raum hinter der Anmeldung. Oben „Von dir“ (eigene Bücher und ein leeres zum Anlegen),
 * darunter „Für dich“ (was Freunde hingelegt haben), am Ende der Papierkorb.
 * Jede Reihe ist ein Karussell: ein Buch liegt groß in der Mitte, Zettel mit den Namen schauen oben heraus,
 * und darunter steht, was Freunde zurückgelassen haben (Zettel, Eselsohren).
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
  // was beim Betreten schon gesehen war; neu ist, was danach kam
  const [seen] = useState(() => (typeof window === "undefined" ? null : seenSnapshot()));
  const isNew = (bookId: string, n: Feedback) => !!seen && (n.at?.seconds ?? 0) > seen.at(bookId);

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

  const zoneError = (text: string | undefined, zone: "own" | "gifts") =>
    text && (
      <p role="alert" className="text-on-table text-sm">
        Konnte {zone === "own" ? "deine Bücher" : "die Bücher von Freunden"} nicht laden: {text}{" "}
        <TextButton onClick={() => room.retry(zone)}>Nochmal versuchen</TextButton>
      </p>
    );

  // bis die Bücher da sind, hält ein unsichtbarer Platz die Höhe eines Buchs
  const placeholder = <div aria-hidden className="carousel" style={{ height: "calc(var(--tw) * 1.5 + 58px)" }} />;

  // das leere Buch: ein Rohling in ungefärbtem Leinen, wie ein Band vor dem Bezug
  const newTile = (
    <Link
      href="/neu"
      className="group relative block"
      style={{ width: "var(--tw)", aspectRatio: "2 / 3" }}
      aria-label="Neues Buch anlegen"
    >
      <span aria-hidden className="book-shadow-closed absolute inset-0" />
      <span aria-hidden className="book-block-r absolute top-[1.2%] bottom-[0.4%] left-full" style={{ width: 4 }} />
      <span className="linen bg-paper-shade absolute inset-0 grid content-end p-[11%]">
        <span
          className="text-cloth-ink/60 text-[clamp(22px,7vw,30px)] leading-[0.9] font-bold tracking-[-0.03em]"
          style={{ fontVariationSettings: '"wdth" 78, "opsz" 96', textShadow: "0 1px 0 rgb(255 255 255 / 0.35)" }}
        >
          Neues
          <br />
          Buch
        </span>
        <span aria-hidden className="text-cloth-ink/50 absolute top-[9%] left-[11%] text-3xl font-light transition-transform duration-500 ease-out group-hover:rotate-90">
          +
        </span>
      </span>
    </Link>
  );

  // wer noch nichts gemacht, aber etwas geschenkt bekommen hat, sieht zuerst das Geschenk
  const giftsFirst = ownLoaded && mine.length === 0 && given.length > 0;

  const ownSlides: Slide[] = [
    ...mine.map((d) => {
      const sp = d.stored ? room.spread[d.stored.id] : undefined;
      return {
        key: d.book.id,
        book: d.book,
        decor: sp && (
          <>
            <SlipTabs names={sp.to} fresh={sp.items.filter((n) => isNew(d.book.id, n)).map((n) => n.who)} />
            {sp.ears > 0 && <CoverEar />}
          </>
        ),
      };
    }),
    { key: "neu", tile: newTile },
  ];
  // erst wenn gezählt ist, steht fest, welches Buch Neues hat; bis dahin hält ein Platz die Höhe
  const ownReady = ownLoaded && room.spreadLoaded;
  const freshOf = (d: Item) => (d.stored ? (room.spread[d.stored.id]?.items ?? []).filter((n) => isNew(d.book.id, n)) : []);
  const newest = (d: Item) => freshOf(d)[0]?.at?.seconds ?? 0;
  // in der Mitte liegt zuerst das Buch mit der neuesten ungesehenen Rückmeldung
  const startAt = mine.reduce((best, d, i) => (newest(d) > (best < 0 ? 0 : newest(mine[best])) ? i : best), -1);
  const fresh = mine.flatMap((d) => freshOf(d).map((n) => ({ n, title: d.book.title })));

  const fromYou = (
    <Carousel
      key="von-dir"
      id="von-dir"
      heading="Von dir"
      showHeading={giftsFirst}
      slides={ownReady ? ownSlides : []}
      start={Math.max(0, startAt)}
      panel={(slide) => {
        if (!slide.book)
          return (
            <Panel
              title="Neues Buch"
              meta={IS_APP ? "Fotos wählen, fertig." : "Fotos reinziehen, fertig."}
              primary={
                <Link href="/neu" className={primaryClass}>
                  Fotos wählen
                </Link>
              }
            >
              <TextButton className="text-on-table-2" onClick={() => importInput.current?.click()}>
                Aus Datei öffnen
              </TextButton>
            </Panel>
          );
        const d = byId(slide.book.id);
        const s = d?.stored;
        const sp = s ? room.spread[s.id] : undefined;
        const base = !s ? `${slide.book.plates.length} Tafeln` : s.title.trim() ? `${slide.book.plates.length} Tafeln` : `${s.photos.filter((p) => !p.shelved).length} Fotos · ohne Titel`;
        return (
          <Panel
            title={slide.book.title}
            meta={s ? `${base} · ${whereOf(sp)}` : base}
            book={slide.book}
            after={
              s &&
              sp &&
              sp.to.length > 0 && (
                <Returns
                  book={slide.book}
                  spread={sp}
                  isNew={(n) => isNew(slide.book!.id, n)}
                  onAll={() => {
                    markSeen(slide.book!.id);
                    setReturns({ book: slide.book!, stored: s });
                  }}
                />
              )
            }
          >
            {s && (
              <Link href={`/neu?id=${s.id}`} className={linkClass}>
                Bearbeiten
              </Link>
            )}
            {s && !sp?.to.length && <TextButton onClick={() => setSharing(s)}>Hinlegen für …</TextButton>}
            {s && (
              <TextButton className="text-on-table-2" onClick={() => setMore({ stored: s })}>
                Mehr …
              </TextButton>
            )}
          </Panel>
        );
      }}
    >
      {!ownReady && placeholder}
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
      {zoneError(room.errors.own, "own")}
    </Carousel>
  );

  const forYou = (
    <Carousel
      key="fuer-dich"
      id="fuer-dich"
      heading="Für dich"
      slides={given.map((d) => ({ key: d.book.id, book: d.book, note: d.gift ? `von ${d.gift.fromName}` : undefined }))}
      panel={(slide) => {
        const g = slide.book && byId(slide.book.id)?.gift;
        if (!slide.book || !g) return null;
        return (
          <Panel title={slide.book.title} meta={`von ${g.fromName} · ${slide.book.plates.length} Tafeln`} book={slide.book}>
            <TextButton className="text-on-table-2" onClick={() => setMore({ gift: g })}>
              Mehr …
            </TextButton>
          </Panel>
        );
      }}
    >
      {!giftsLoaded && placeholder}
      {giftsLoaded && given.length === 0 && !room.errors.gifts && (
        <p className="text-on-table-2 max-w-md text-sm leading-relaxed">Bücher, die dir jemand hinlegt, landen von selbst hier, sobald du ihren Link öffnest.</p>
      )}
      {zoneError(room.errors.gifts, "gifts")}
    </Carousel>
  );

  const count = !ownLoaded || !giftsLoaded ? "\u00a0" : fresh.length > 0 ? news(fresh) : stock(mine.length, given.length);

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

// die eine gefüllte Taste unter dem Buch: Papier auf Basalt
const primaryClass =
  "press bg-on-table text-table hover:bg-paper inline-flex h-11 items-center px-5 text-[15px] font-semibold transition-[background-color,scale] duration-150";

/** Unter dem Buch in der Mitte: Titel, was dazugehört, Aufschlagen und weitere Knöpfe, darunter `after` */
function Panel({
  title,
  meta,
  book,
  primary,
  after,
  children,
}: {
  title: string;
  meta: string;
  book?: BookData;
  /** statt „Aufschlagen“ */
  primary?: ReactNode;
  after?: ReactNode;
  children?: ReactNode;
}) {
  const { open } = useContext(OpenBook);
  return (
    <div className="mx-auto grid w-full max-w-md gap-1">
      <h3 className="text-on-table text-[28px] leading-tight font-bold tracking-[-0.02em]" style={{ fontVariationSettings: '"wdth" 80' }}>
        {title}
      </h3>
      <p className="text-on-table-2 text-sm">{meta}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px]">
        {primary ??
          (book && (
            <button type="button" onClick={() => open(book.id)} className={primaryClass}>
              Aufschlagen
            </button>
          ))}
        {children}
      </div>
      {after}
    </div>
  );
}

const shortDate = (n: Feedback) => (n.at?.seconds ? new Date(n.at.seconds * 1000).toLocaleDateString("de-DE", { day: "numeric", month: "short" }) : null);

/**
 * Was Freunde im Buch zurückgelassen haben, ohne Kästchenreihe: höchstens zwei Zettel als kleiner Stapel,
 * die Eselsohren als Abzüge, die übereinander liegen. Ein Abzug schlägt das Buch an seiner Tafel auf.
 * Liegt das Buch 1,5 s in der Mitte, gilt es als gesehen (die Markierung „neu“ bleibt bis zum nächsten Besuch).
 */
function Returns({ book, spread, isNew, onAll }: { book: BookData; spread: Spread; isNew: (n: Feedback) => boolean; onAll: () => void }) {
  const { open } = useContext(OpenBook);
  const notes = spread.items.filter((n) => n.kind === "note");
  const ears = spread.items.filter((n) => n.kind === "ear");
  const fresh = spread.items.filter(isNew).length;
  useEffect(() => {
    const id = window.setTimeout(() => markSeen(book.id), 1500);
    return () => window.clearTimeout(id);
  }, [book.id]);

  if (spread.items.length === 0)
    return (
      <div className="mt-6">
        <div className="note-paper w-[86%] -rotate-1 px-4 pt-3 pb-3.5">
          <p className="text-ink-2 text-[21px] leading-[1.05]" style={{ fontFamily: "var(--font-hand), cursive" }}>
            Noch nichts zurück. Zettel und Eselsohren landen hier.
          </p>
        </div>
      </div>
    );

  const head = [notes.length && `${notes.length} Zettel`, ears.length && `${ears.length} ${earWord(ears.length)}`, fresh && `${fresh} neu`].filter(Boolean).join(" · ");
  return (
    <div className="mt-6 grid gap-4">
      <p className="text-on-table-2 flex items-baseline justify-between gap-3 text-[13px]">
        <span>{head}</span>
        <TextButton className="text-on-table-2" onClick={onAll}>
          Alle
        </TextButton>
      </p>
      {notes.length > 0 && (
        <button
          type="button"
          onClick={onAll}
          className="press relative grid text-left"
          aria-label={`Zettel von ${notes[0].who}: ${notes[0].text}. Alle Rückmeldungen ansehen`}
        >
          {notes.slice(0, 2).map((n, i) => (
            <span
              key={`${n.token}-${n.id}`}
              className={`note-paper col-start-1 row-start-1 block w-[86%] px-4 pt-3 pb-3 ${isNew(n) ? "is-new" : ""}`}
              style={i === 0 ? { rotate: "-1deg", zIndex: 2 } : { rotate: "1.5deg", translate: "14px 12px", zIndex: 1 }}
              aria-hidden={i > 0}
            >
              <span className="line-clamp-2 text-[23px] leading-[1.02]" style={{ fontFamily: "var(--font-hand), cursive" }}>
                „{n.text}“
              </span>
              <span className="text-ink-2 mt-1.5 block text-xs">{[n.who, n.no && `Tafel ${n.no}`, shortDate(n)].filter(Boolean).join(" · ")}</span>
            </span>
          ))}
        </button>
      )}
      {ears.length > 0 && (
        <ul className={`flex items-end ${notes.length > 1 ? "mt-3" : ""}`}>
          {ears.slice(0, 3).map((e, i) => (
            <li key={`${e.token}-${e.id}`} className={i > 0 ? "-ml-6" : ""} style={{ rotate: `${[-3, 2, -1.5][i]}deg`, zIndex: 3 - i }}>
              <button type="button" onClick={() => open(book.id, e.no)} className="press ear-print" aria-label={`${e.who} hat Tafel ${e.no} geknickt. Dort aufschlagen`}>
                <EarPhoto book={book} no={e.no} />
              </button>
            </li>
          ))}
          <li className="text-on-table-2 ml-4 self-center text-[13px] leading-snug">
            {ears.length > 3 && (
              <span className="text-on-table block text-xl" style={{ fontFamily: "var(--font-hand), cursive" }}>
                +{ears.length - 3}
              </span>
            )}
            {earLine(ears)}
          </li>
        </ul>
      )}
    </div>
  );
}

/** „Flo hat Tafel 3 geknickt“, bei mehreren „Flo und Anna haben Ecken geknickt“ */
function earLine(ears: Feedback[]) {
  const who = [...new Set(ears.map((e) => e.who))];
  if (ears.length === 1) return `${who[0]} hat Tafel ${ears[0].no} geknickt`;
  return `${who.length <= 2 ? who.join(" und ") : `${who.slice(0, 2).join(", ")} +${who.length - 2}`} ${who.length === 1 ? "hat" : "haben"} Ecken geknickt`;
}

function EarPhoto({ book, no }: { book: BookData; no?: number }) {
  const plate = plateOf(book, no);
  return (
    <span aria-hidden className="bg-paper-shade relative block aspect-[3/4] overflow-hidden">
      {plate && <Image src={plate.thumb} alt="" fill sizes="64px" className="object-cover" />}
    </span>
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
          <FeedbackRow
            key={`${n.token}-${n.id}`}
            book={book}
            n={n}
            onPlate={(no) => {
              onClose();
              open(book.id, no);
            }}
          />
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

function FeedbackRow({ book, n, onPlate }: { book: BookData; n: Feedback; onPlate: (no: number) => void }) {
  const when = n.at?.seconds ? new Date(n.at.seconds * 1000).toLocaleDateString("de-DE", { day: "numeric", month: "short" }) : null;
  const place = n.no ? `Tafel ${n.no}` : null;
  const sub = [n.who, place, when].filter(Boolean).join(" · ");
  return n.kind === "ear" ? (
    <li className="border-t border-ink/15">
      <button type="button" onClick={() => n.no && onPlate(n.no)} className="group flex w-full items-center gap-3 py-2.5 text-left">
        <EarThumb book={book} no={n.no} className="h-12 w-9" cut="bg-[var(--slip)]" />
        <span className="text-sm">
          <span className="font-semibold">{n.who}</span> hat {place ?? "eine Tafel"} geknickt
          <span className="text-ink-2 block text-xs">
            {when ? `${when} · ` : ""}
            <span className="underline decoration-transparent decoration-2 underline-offset-4 group-hover:decoration-mark">dort aufschlagen</span>
          </span>
        </span>
      </button>
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

/** Was neu ist, in einer Zeile: „2 neue Zettel bei Fuerte“, „1 neuer Zettel und 2 neue Eselsohren in 2 Büchern“ */
function news(fresh: { n: Feedback; title: string }[]) {
  const notes = fresh.filter((f) => f.n.kind === "note").length;
  const ears = fresh.length - notes;
  const titles = [...new Set(fresh.map((f) => f.title))];
  const what = [notes && `${notes} ${notes === 1 ? "neuer Zettel" : "neue Zettel"}`, ears && `${ears} ${ears === 1 ? "neues Eselsohr" : "neue Eselsohren"}`]
    .filter(Boolean)
    .join(" und ");
  return titles.length === 1 ? `${what} bei ${titles[0]}` : `${what} in ${titles.length} Büchern`;
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
