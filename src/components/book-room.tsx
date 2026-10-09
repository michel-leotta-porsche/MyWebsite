"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { books as sampleBooks, type BookData } from "@/content/books";
import { Archive, ArchiveRestore, ChevronRight, Ellipsis, EyeOff, Flag, Gift, Pencil, RotateCw, Trash2 } from "lucide-react";

import { RequireUser, RoomNav, Wordmark } from "@/components/app-ui";
import { Button, buttonClass, IconButton } from "@/components/ui/button";
import { ListGroup, ListRow } from "@/components/ui/list";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import { Sheet } from "@/components/ui/sheet";
import { notify, Toaster } from "@/components/ui/toaster";
import { Library } from "@/components/books";
import { ReportDialog } from "@/components/report-dialog";
import { ShareDialog } from "@/components/share-dialog";
import { Studio } from "@/components/studio";
import { Carousel, CoverEar, SlipTabs, type Slide } from "@/components/room-carousel";
import { OpenBook, Table } from "@/components/table";
import type { User } from "@/lib/firebase";
import { IS_APP } from "@/lib/app-mode";
import { friendlyError } from "@/lib/errors";
import { importBook, numberWord, saveBook, toBookData, type Share, type StoredBook } from "@/lib/store";
import { useRoom, type Feedback, type Spread } from "@/lib/use-room";
import { markSeen, seenSnapshot } from "@/lib/seen";
import { useShelf } from "@/lib/shelf";

/** Google-Konten, unter denen Michel angemeldet ist. Kein Schutz: die Fotos liegen ohnehin öffentlich unter /photos */
const OWNER_EMAILS = ["michel.julian.leotta@gmail.com"];
const isOwner = (u: User) => !!u.email && OWNER_EMAILS.includes(u.email.toLowerCase());
/** Das eine Beispielbuch für alle, die noch kein eigenes haben */
const SAMPLE_ID = "fuerteventura";

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

/** bundled: mitgeliefert (Beispielbuch oder Michels Bände), lässt sich nur weglegen */
type Item = { book: BookData; stored?: StoredBook; gift?: Share; bundled?: true };

function Room({ user }: { user: User }) {
  const room = useRoom(user.uid);
  const [returns, setReturns] = useState<{ book: BookData; stored: StoredBook } | null>(null);
  const [sharing, setSharing] = useState<StoredBook | null>(null);
  const [reporting, setReporting] = useState<Share | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [emptying, setEmptying] = useState(false);
  const router = useRouter();
  const importInput = useRef<HTMLInputElement>(null);

  const { own, gifts, trash } = room;
  const shelf = useShelf();
  const owner = isOwner(user);
  // was beim Betreten schon gesehen war; neu ist, was danach kam
  const [seen] = useState(() => (typeof window === "undefined" ? null : seenSnapshot()));
  const isNew = (bookId: string, n: Feedback) => !!seen && (n.at?.seconds ?? 0) > seen.at(bookId);

  // geteilte Bücher bekommen eine eigene Kennung, damit sie neben gleichnamigen eigenen liegen können
  // Michels Bände Fuerteventura und Japan liegen für ihn hier wie seine anderen Bücher;
  // alle anderen sehen Fuerteventura als Beispiel, bis ihr erstes eigenes Buch daliegt. Beides lässt sich weglegen.
  const bundled = useMemo(() => (owner ? sampleBooks : own?.length === 0 ? sampleBooks.filter((b) => b.id === SAMPLE_ID) : []), [owner, own]);
  const putAway = bundled.filter((b) => shelf.hidden.includes(b.id));
  const mine = useMemo(() => {
    const list: Item[] = [];
    for (const b of bundled) if (!shelf.hidden.includes(b.id)) list.push({ book: b, bundled: true });
    for (const b of own ?? []) {
      try {
        list.push({ book: toBookData(b), stored: b });
      } catch {}
    }
    return list;
  }, [own, bundled, shelf.hidden]);
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
      <div role="alert" className="text-on-table flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span>
          Konnte {zone === "own" ? "deine Bücher" : "die Bücher von Freunden"} nicht laden: {text}
        </span>
        <Button size="sm" onClick={() => room.retry(zone)}>
          <RotateCw aria-hidden />
          Nochmal versuchen
        </Button>
      </div>
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
        decor: d.bundled && !owner ? <SampleBand /> : sp && (
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
              <Button size="sm" onClick={() => importInput.current?.click()}>
                Aus Datei öffnen
              </Button>
            </Panel>
          );
        const d = byId(slide.book.id);
        if (d?.bundled) {
          const b = d.book;
          return (
            <Panel
              title={b.title}
              meta={owner ? `${b.plates.length} Tafeln · mitgeliefert` : `Beispiel · ${b.plates.length} Tafeln von Michel Leotta`}
              book={b}
              after={
                !owner && (
                  <div className="mt-6">
                    <div className="note-paper deal w-[86%] -rotate-1 px-4 pt-3 pb-3.5">
                      <p className="text-ink-2 text-[21px] leading-[1.05]" style={{ fontFamily: "var(--font-hand), cursive" }}>
                        So sieht ein fertiges Buch aus. Blätter rein, dann mach dein eigenes.
                      </p>
                    </div>
                  </div>
                )
              }
            >
              <Menu
                trigger={
                <IconButton label="Mehr">
                  <Ellipsis aria-hidden />
                </IconButton>
              }
              >
                <MenuItem
                  icon={<Archive aria-hidden />}
                  onClick={() => {
                    shelf.putAway(b.id);
                    undoable(`„${b.title}“ liegt nicht mehr in deinem Zimmer.`, () => shelf.putBack(b.id));
                  }}
                >
                  Aus dem Zimmer nehmen
                </MenuItem>
              </Menu>
            </Panel>
          );
        }
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
              <Link href={`/neu?id=${s.id}`} className={buttonClass("quiet", "sm")}>
                <Pencil aria-hidden />
                Bearbeiten
              </Link>
            )}
            {s && !sp?.to.length && <Button size="sm" onClick={() => setSharing(s)}>
                Hinlegen für …
              </Button>}
            {s && (
              <Menu
                trigger={
                <IconButton label="Mehr">
                  <Ellipsis aria-hidden />
                </IconButton>
              }
              >
                <MenuItem icon={<Gift aria-hidden />} onClick={() => setSharing(s)}>
                  Hinlegen für …
                </MenuItem>
                <MenuSeparator />
                <MenuItem danger icon={<Trash2 aria-hidden />} onClick={() => undoable(`„${s.title || "Ohne Titel"}“ liegt im Papierkorb.`, room.toTrash(s))}>
                  In den Papierkorb
                </MenuItem>
              </Menu>
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
            notify(friendlyError(err));
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
            <Menu
              trigger={
              <IconButton label="Mehr">
                <Ellipsis aria-hidden />
              </IconButton>
            }
            >
              <MenuItem icon={<Archive aria-hidden />} onClick={() => undoable(`„${g.book.title || "Ohne Titel"}“ liegt nicht mehr in deinem Zimmer.`, room.dropGift(g))}>
                Aus dem Zimmer nehmen
              </MenuItem>
              <MenuItem icon={<Flag aria-hidden />} onClick={() => setReporting(g)}>
                Melden …
              </MenuItem>
              <MenuSeparator />
              <MenuItem danger icon={<EyeOff aria-hidden />} onClick={() => room.block(g)}>
                Bücher von {g.fromName} ausblenden
              </MenuItem>
            </Menu>
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

  const count = !ownLoaded || !giftsLoaded ? "\u00a0" : fresh.length > 0 ? news(fresh) : stock(mine.filter((d) => owner || !d.bundled).length, given.length);

  return (
    <main>
      <Library
        books={all.map((d) => d.book)}
        ears={earsById}
        onEdit={(id) => {
          const s = byId(id)?.stored;
          if (!s) return undefined;
          // Schritt 0 Einband, 1 Titel, ab 2 die Doppelseiten der Werkbank (wie toBookData sie reiht)
          return (step) => router.push(`/neu?id=${s.id}${step >= 2 && step - 2 < s.spreads.length ? `&doppelseite=${step - 1}` : ""}`);
        }}
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
          <Studio user={user} books={own} />
          {putAway.length > 0 && (
            <section aria-labelledby="weggelegt-h" className="grid max-w-xl gap-2">
              <h2 id="weggelegt-h" className="text-on-table-2 text-sm">
                Weggelegt
              </h2>
              <ListGroup>
                {putAway.map((b) => (
                  <ListRow
                    key={b.id}
                    lead={<Archive aria-hidden />}
                    title={b.title}
                    detail={owner ? "Mitgeliefert" : "Beispiel"}
                    trail={
                      <IconButton label={`${b.title} zurücklegen`} onClick={() => shelf.putBack(b.id)}>
                        <ArchiveRestore aria-hidden />
                      </IconButton>
                    }
                  />
                ))}
              </ListGroup>
            </section>
          )}
          {trash.length > 0 && (
            <section aria-label="Papierkorb" className="grid max-w-xl justify-items-start gap-3">
              <Button size="sm" aria-expanded={showTrash} onClick={() => setShowTrash((v) => !v)}>
                <Trash2 aria-hidden />
                Papierkorb ({trash.length})
              </Button>
              {showTrash && (
                <>
                  <p className="text-on-table-2 text-[13px]">Bücher im Papierkorb liegen nirgends aus, ihre geteilten Links zeigen nichts mehr.</p>
                  <ListGroup className="w-full">
                    {trash.map((b) => (
                      <ListRow
                        key={b.id}
                        title={<span className="block truncate">{b.title || "Ohne Titel"}</span>}
                        detail={fotos(b.photos.filter((p) => !p.shelved).length)}
                        trail={
                          <IconButton label={`${b.title || "Ohne Titel"} zurücklegen`} onClick={() => room.restore(b)}>
                            <ArchiveRestore aria-hidden />
                          </IconButton>
                        }
                      />
                    ))}
                    <ListRow
                      danger
                      lead={<Trash2 aria-hidden />}
                      title="Papierkorb leeren …"
                      onClick={() => {
                        // kein Hinweis von vorhin soll über „Endgültig löschen“ liegen
                        notify.dismiss();
                        setConfirmEmpty(true);
                      }}
                    />
                  </ListGroup>
                </>
              )}
            </section>
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
        <RoomSheet title="Papierkorb leeren" onClose={() => !emptying && setConfirmEmpty(false)}>
          <p className="text-sm leading-relaxed">
            {trash.length === 1 ? "Ein Buch wird" : `${trash.length} Bücher werden`} endgültig gelöscht: mit allen Fotos, Zwischenständen und geteilten Links samt
            Zetteln der Gäste. Das lässt sich nicht rückgängig machen.
          </p>
          <ul className="text-ink-2 mt-3 text-[13px]">
            {trash.map((b) => (
              <li key={b.id}>· {b.title || "Ohne Titel"}</li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button
              variant="ink"
              disabled={emptying}
              onClick={async () => {
                setEmptying(true);
                await room.emptyTrash();
                setEmptying(false);
                setConfirmEmpty(false);
              }}
            >
              {emptying ? "Löscht …" : "Endgültig löschen"}
            </Button>
            <Button variant="paper" disabled={emptying} onClick={() => setConfirmEmpty(false)}>
              Abbrechen
            </Button>
          </div>
        </RoomSheet>
      )}
      <Toaster />
    </main>
  );
}

/** Hinweis unten mit Rückgängig, z. B. nach dem Wegräumen eines Buchs */
function undoable(text: string, undo: () => void) {
  notify(text, { action: { label: "Rückgängig", onClick: undo } });
}

/**
 * Blatt von unten für Zimmer-Dialoge, die nur da sind, solange sie gebraucht werden: fährt beim Erscheinen hoch,
 * beim Schließen (Wischen, Tippen daneben, Esc) erst wieder herunter und meldet sich dann ab.
 */
function RoomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <Sheet
      title={title}
      open={open}
      onOpenChange={(o) => {
        if (o) return;
        setOpen(false);
        window.setTimeout(onClose, 420);
      }}
    >
      {children}
    </Sheet>
  );
}

/** Bei wem ein eigenes Buch liegt: „bei Anna und Tom“, ab drei „bei Anna, Tom +1“ */
function whereOf(s: Spread | undefined): string {
  if (!s || s.to.length === 0) return "liegt noch bei niemandem";
  return `bei ${s.to.length <= 2 ? s.to.join(" und ") : `${s.to.slice(0, 2).join(", ")} +${s.to.length - 2}`}`;
}

const fotos = (n: number) => (n === 1 ? "Ein Foto" : `${n} Fotos`);
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

// die eine gefüllte Taste unter dem Buch: Buchleinen (Gelb als Fläche nur hier)
const primaryClass = buttonClass("cloth");

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
    <div className="mx-auto grid w-full max-w-lg gap-1">
      <h3 className="text-on-table text-[28px] leading-tight font-bold tracking-[-0.02em]" style={{ fontVariationSettings: '"wdth" 80' }}>
        {title}
      </h3>
      <p className="text-on-table-2 text-sm">{meta}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {primary ??
          (book && (
            <Button variant="cloth" onClick={() => open(book.id)}>
              Aufschlagen
            </Button>
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
      <div className="text-on-table-2 flex items-center justify-between gap-3 text-[13px]">
        <span>{head}</span>
        <Button size="sm" onClick={onAll}>
          Alle
          <ChevronRight aria-hidden />
        </Button>
      </div>
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
              className={`note-paper deal col-start-1 row-start-1 block w-[86%] px-4 pt-3 pb-3 ${isNew(n) ? "is-new" : ""}`}
              style={
                (i === 0
                  ? { rotate: "-1deg", zIndex: 2, ["--d" as string]: 1 }
                  : { rotate: "1.5deg", translate: "14px 12px", zIndex: 1, ["--d" as string]: 0 }) as CSSProperties
              }
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
            <li
              key={`${e.token}-${e.id}`}
              className={`deal ${i > 0 ? "-ml-6" : ""}`}
              style={{ rotate: `${[-3, 2, -1.5][i]}deg`, zIndex: 3 - i, ["--d" as string]: 2 + i } as CSSProperties}
            >
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
    <RoomSheet title={`Zurück von Freunden: ${book.title}`} onClose={onClose}>
      <p className="text-ink-2 text-sm">
        {[notes && `${notes} Zettel`, ears && `${ears} ${earWord(ears)}`].filter(Boolean).join(" · ")} · {whereOf(spread)}
      </p>
      <ListGroup paper className="mt-3" label="Zettel und Eselsohren">
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
      </ListGroup>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button
          variant="ink"
          onClick={() => {
            onClose();
            open(book.id);
          }}
        >
          Buch aufschlagen
        </Button>
        <Button variant="paper" onClick={onManage}>
          Links und Zettel verwalten …
        </Button>
      </div>
    </RoomSheet>
  );
}

function FeedbackRow({ book, n, onPlate }: { book: BookData; n: Feedback; onPlate: (no: number) => void }) {
  const when = n.at?.seconds ? new Date(n.at.seconds * 1000).toLocaleDateString("de-DE", { day: "numeric", month: "short" }) : null;
  const place = n.no ? `Tafel ${n.no}` : null;
  const sub = [n.who, place, when].filter(Boolean).join(" · ");
  // Eselsohren führen ins Buch (Pfeil), Zettel bleiben Zettel in Handschrift
  return n.kind === "ear" ? (
    <ListRow
      paper
      lead={<EarThumb book={book} no={n.no} className="h-12 w-9" cut="bg-[var(--slip)]" />}
      title={
        <span className="font-normal">
          <span className="font-semibold">{n.who}</span> hat {place ?? "eine Tafel"} geknickt
        </span>
      }
      detail={when ? `${when} · dort aufschlagen` : "Dort aufschlagen"}
      onClick={n.no ? () => onPlate(n.no!) : undefined}
    />
  ) : (
    <ListRow
      paper
      title={
        <span className="block text-[22px] leading-[1.05] font-normal" style={{ fontFamily: "var(--font-hand), cursive" }}>
          „{n.text}“
        </span>
      }
      detail={sub}
    />
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

/** Aufkleber auf dem Beispielbuch, damit niemand es für ein eigenes hält */
function SampleBand() {
  return (
    <span aria-hidden className="sample-band">
      Beispiel
    </span>
  );
}
