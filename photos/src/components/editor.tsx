"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Eye, Gift, History, ImagePlus, LayoutGrid, MoreHorizontal, Redo2, SlidersHorizontal, Type, Undo2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { plateOf, typeArea, type BookData, type Page } from "@/content/books";
import { layoutPage, TEXT_STYLE } from "@/content/layout";
import { inputClass, SignInTable, SlipDialog, TextButton } from "@/components/app-ui";
import { Book } from "@/components/book";
import { buttonClass, Button, IconButton, ToolGroup } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Menu, MenuItem } from "@/components/ui/menu";
import { Swatches } from "@/components/ui/swatches";
import { notify, Toaster } from "@/components/ui/toaster";
import { CropDialog } from "@/components/crop-dialog";
import { DevelopDialog } from "@/components/develop-dialog";
import { PageView } from "@/components/page-view";
import { ShareDialog } from "@/components/share-dialog";
import { Stage } from "@/components/stage";
import { relayoutFree, spreadId, variantsOf, type SpreadDraft } from "@/lib/auto-sequence";
import { addKey, fromSpread, materialize, removeKey, toSpread, withPages, type SpreadItem } from "@/lib/free-layout";
import { ingest } from "@/lib/ingest";
import {
  autoPhotos,
  bottomFor,
  CLOTHS,
  exportBook,
  listVersions,
  loadBook,
  migrate,
  newId,
  refreshShares,
  saveBook,
  saveVersion,
  SCHEMA,
  toBookData,
  uploadPhoto,
  type ClothId,
  type StoredBook,
  type StoredPhoto,
  type Version,
} from "@/lib/store";
import { useQueryParam } from "@/lib/use-query";
import { useUser } from "@/lib/use-user";
import { useWide } from "@/lib/use-wide";

// Buch gestalten: Fotos reinziehen → automatisch gestalten → von Hand ändern.
// Was man selbst entscheidet, wird fixiert; „Automatisch gestalten“ rechnet nur freie Doppelseiten neu.
// Gespeichert wird von selbst, Zwischenstände entstehen vor großen Änderungen; Rückgängig geht mit ⌘Z.

type Pending = { key: string; name: string; state: "lesen" | "laden" | "fertig" | "fehler"; error?: string };
type Selection = { type: "photo"; key: string } | { type: "spread"; id: string } | null;

const MAX = 60;
/** Unter 768px: Panel des Gewählten als Blatt am unteren Rand, direkt beim Foto statt weit darunter */
const SHEET =
  "max-md:rounded-t-cut max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-[620] max-md:max-h-[60svh] max-md:overflow-y-auto max-md:overscroll-contain max-md:pb-[max(1.25rem,env(safe-area-inset-bottom))] max-md:shadow-[0_-16px_32px_-12px_rgb(12_10_8/0.7)]";

function SheetClose({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex justify-end md:hidden">
      <Button variant="ink" size="sm" onClick={onClose} className="-my-1">
        Fertig
      </Button>
    </div>
  );
}

/** Klickfläche kleiner Leistenknöpfe: 24px, mit dem Finger 44px hoch (WCAG 2.5.8, UX-Kritik K3) */
const HIT = "inline-flex min-h-6 min-w-6 items-center justify-center pointer-coarse:min-h-11 pointer-coarse:min-w-9";

/** Eine Doppelseite bleibt, solange etwas auf ihr liegt */
const keepSpread = (s: SpreadDraft) => s.keys.length > 0 || !!s.text || !!s.pages?.some((p) => p.items.length);
const UNDO = 60;
const AUTO_VERSION_MS = 10 * 60 * 1000;

/** Seitenformat nach den Fotos: iPhone-Hochformate 3:4, Kamera 2:3 */
function aspectFor(photos: StoredPhoto[]) {
  const portraits = photos.filter((p) => p.h > p.w && !p.shelved).map((p) => p.h / p.w);
  if (!portraits.length) return 1.5;
  const avg = portraits.reduce((a, b) => a + b, 0) / portraits.length;
  return Math.abs(avg - 4 / 3) < Math.abs(avg - 1.5) ? 4 / 3 : 1.5;
}

const recipeLabel = (p: StoredPhoto) =>
  p.recipe?.kind === "fuji"
    ? `Fuji-Rezept erkannt: ${p.recipe.film}`
    : p.recipe?.kind === "lightroom"
      ? "Lightroom-Einstellungen erkannt"
      : p.camera
        ? `Kein Rezept in der Datei, Kameradaten: ${p.camera.device}`
        : "Keine Metadaten in der Datei (z. B. aus einem Messenger)";

const when = (v: Version) =>
  v.at ? new Date(v.at.seconds * 1000).toLocaleString("de-DE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "gerade eben";

function Lock({ on }: { on: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 12 14" className="inline-block h-3 w-3 align-[-1px]">
      <rect x="1.5" y="6" width="9" height="7" className={on ? "fill-current" : "fill-none stroke-current"} strokeWidth="1.3" />
      <path d={on ? "M3.5 6V4a2.5 2.5 0 0 1 5 0v2" : "M3.5 6V4a2.5 2.5 0 0 1 5 0"} className="fill-none stroke-current" strokeWidth="1.3" />
    </svg>
  );
}

function Star({ on }: { on: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 14 14" className="inline-block h-3.5 w-3.5 align-[-2px]">
      <path d="M7 1l1.8 3.8 4.2.5-3.1 2.9.8 4.1L7 10.3 3.3 12.3l.8-4.1L1 5.3l4.2-.5z" className={on ? "fill-current" : "fill-none stroke-current"} strokeWidth="1.1" />
    </svg>
  );
}

export function Editor() {
  const user = useUser();
  const idParam = useQueryParam("id");
  const wide = useWide();

  const [loaded, setLoaded] = useState<StoredBook | null>(null);
  // neues Buch: leer, bis das erste Foto kommt
  const blank = useMemo<StoredBook | null>(
    () =>
      user && !idParam
        ? {
            schema: SCHEMA,
            id: newId(),
            owner: user.uid,
            ownerName: user.displayName ?? "Ich",
            title: "",
            subtitle: "",
            cloth: "ringelblume",
            aspect: 1.5,
            coverKey: "",
            photos: [],
            spreads: [],
          }
        : null,
    [idParam, user],
  );
  const book = loaded ?? blank;
  const [pending, setPending] = useState<Pending[]>([]);
  const [sel, setSel] = useState<Selection>(null);
  const [preview, setPreview] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [history, setHistory] = useState(false);
  const [crop, setCrop] = useState<string | null>(null);
  const [develop, setDevelop] = useState<string | null>(null);
  const [stageId, setStageId] = useState<string | null>(null);
  const lastClick = useRef<{ i: number; at: number } | null>(null);
  // Hinweise als Pille von unten (Sonner), nach dem Ablegen mit Rückgängig. Solange einer steht, weicht der Rückgängig-Knopf am Telefon
  const [toastOpen, setToastOpen] = useState(false);
  const say = useCallback((text: string, onUndo?: () => void) => {
    setToastOpen(true);
    const done = () => setToastOpen(false);
    notify(text, { duration: onUndo ? 10000 : 6000, onDismiss: done, onAutoClose: done, ...(onUndo && { action: { label: "Rückgängig", onClick: onUndo } }) });
  }, []);
  const [saved, setSaved] = useState<"gespeichert" | "speichert" | "fehler" | "offline" | null>(null);
  const [touched, setTouched] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dropHint, setDropHint] = useState<string | null>(null);
  const [undoState, setUndoState] = useState({ past: 0, future: 0 });
  const fileInput = useRef<HTMLInputElement>(null);
  const bookRef = useRef<StoredBook | null>(null);
  const past = useRef<StoredBook[]>([]);
  const future = useRef<StoredBook[]>([]);
  const lastTag = useRef<{ tag: string; at: number } | null>(null);
  const savedOnce = useRef(false);
  const lastAutoVersion = useRef(0);
  useEffect(() => {
    bookRef.current = book;
  }, [book]);

  // vorhandenes Buch laden
  useEffect(() => {
    if (!user || !idParam || bookRef.current?.id === idParam) return;
    let alive = true;
    loadBook(idParam)
      .then((b) => {
        if (!alive || !b) return;
        savedOnce.current = true;
        setLoaded(b);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [idParam, user]);

  // nach jeder Änderung speichern; ohne Netz bleibt die Änderung im Browser und geht später raus
  useEffect(() => {
    if (!book || !touched || !book.photos.length) return;
    const id = window.setTimeout(() => {
      const done = saveBook(book);
      // Firestore bestätigt erst mit Netz; offline zeigt der Kopf das an
      const offline = window.setTimeout(() => !navigator.onLine && setSaved("offline"), 1500);
      done
        .then(() => {
          window.clearTimeout(offline);
          setSaved("gespeichert");
          savedOnce.current = true;
          // geteilte Links bekommen denselben Stand wie das Buch
          refreshShares(book).catch(() => {});
          if (!idParam) window.history.replaceState(null, "", `/neu?id=${book.id}`);
          if (Date.now() - lastAutoVersion.current > AUTO_VERSION_MS) {
            lastAutoVersion.current = Date.now();
            saveVersion(book, "Zwischenstand", true).catch(() => {});
          }
        })
        .catch(() => setSaved("fehler"));
    }, 900);
    return () => window.clearTimeout(id);
  }, [book, idParam, touched]);

  /** Zwischenstand vor einer großen Änderung */
  const snapshot = useCallback((label: string) => {
    const b = bookRef.current;
    if (b && savedOnce.current && b.photos.length) saveVersion(b, label, true).catch(() => {});
  }, []);

  /** Jede Änderung geht hierdurch: Rückgängig-Stapel, Speichern. tag fasst schnelles Tippen zu einem Schritt zusammen */
  const update = useCallback(
    (f: (b: StoredBook) => StoredBook, tag?: string) => {
      setTouched(true);
      setSaved("speichert");
      setLoaded((b) => {
        const cur = b ?? blank;
        if (!cur) return b;
        const next = f(cur);
        if (next === cur) return b;
        const now = Date.now();
        const coalesce = tag && lastTag.current?.tag === tag && now - lastTag.current.at < 1200;
        if (!coalesce) {
          past.current = [...past.current.slice(-UNDO + 1), cur];
          future.current = [];
        }
        lastTag.current = tag ? { tag, at: now } : null;
        setUndoState({ past: past.current.length, future: 0 });
        return next;
      });
    },
    [blank],
  );

  const undo = useCallback(() => {
    const prev = past.current.pop();
    const cur = bookRef.current;
    if (!prev || !cur) return;
    future.current.push(cur);
    lastTag.current = null;
    setTouched(true);
    setLoaded(prev);
    setUndoState({ past: past.current.length, future: future.current.length });
  }, []);
  const redo = useCallback(() => {
    const next = future.current.pop();
    const cur = bookRef.current;
    if (!next || !cur) return;
    past.current.push(cur);
    setTouched(true);
    setLoaded(next);
    setUndoState({ past: past.current.length, future: future.current.length });
  }, []);

  /** Freie Doppelseiten neu rechnen; fixierte und Textseiten bleiben, wie sie sind */
  const relayout = useCallback((b: StoredBook): StoredBook => {
    const shelved = new Set(b.photos.filter((p) => p.shelved).map((p) => p.key));
    const { spreads, coverKey } = relayoutFree(b.spreads, autoPhotos(b.photos), shelved);
    const inBook = new Set(spreads.flatMap((s) => s.keys));
    return {
      ...b,
      spreads,
      coverKey: b.coverKey && inBook.has(b.coverKey) ? b.coverKey : coverKey,
      // frei gestaltete Seiten frieren das Format ein, sonst verrutscht, was man von Hand gesetzt hat
      aspect: b.aspectLocked ? b.aspect : aspectFor(b.photos),
    };
  }, []);

  // Dateien irgendwo auf der Seite ablegen; nie die Datei im Browser öffnen
  // alles, was nicht aus dem Editor selbst kommt, gilt als Datei von außen (Safari und Firefox melden die Typen unterschiedlich)
  const hasFiles = (e: DragEvent | React.DragEvent) => {
    const types = Array.from(e.dataTransfer?.types ?? []);
    if (types.includes("text/x-spread") || types.includes("text/x-photo")) return false;
    return types.includes("Files") || types.includes("application/x-moz-file") || Array.from(e.dataTransfer?.items ?? []).some((i) => i.kind === "file");
  };
  const isInternal = (e: DragEvent) => {
    const types = Array.from(e.dataTransfer?.types ?? []);
    return types.includes("text/x-spread") || types.includes("text/x-photo") || types.includes("text/x-role");
  };
  const filesOf = (dt: DataTransfer) => {
    const direct = Array.from(dt.files ?? []);
    if (direct.length) return direct;
    return Array.from(dt.items ?? [])
      .filter((i) => i.kind === "file")
      .map((i) => i.getAsFile())
      .filter((f): f is File => !!f);
  };
  const addRef = useRef<(files: File[]) => void>(() => {});
  useEffect(() => {
    let depth = 0;
    const over = (e: DragEvent) => {
      if (isInternal(e)) return;
      // immer erlauben, sonst öffnet der Browser die Datei selbst
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setDragOver(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (!depth) setDragOver(false);
    };
    const drop = (e: DragEvent) => {
      if (!e.dataTransfer || isInternal(e)) return;
      e.preventDefault();
      depth = 0;
      setDragOver(false);
      const files = filesOf(e.dataTransfer);
      if (files.length) {
        setDropHint(null);
        addRef.current(files);
      } else {
        // z. B. aus der Fotos-App am Mac: dort kommen keine Dateien im Browser an
        if (!hasFiles(e) && !e.dataTransfer.types.includes("text/uri-list")) return;
        setDropHint("Diese Fotos kamen nicht als Dateien an. Aus der Fotos-App bitte erst in den Finder ziehen oder „Fotos auswählen“ nutzen.");
      }
    };
    window.addEventListener("dragover", over, true);
    window.addEventListener("dragenter", enter, true);
    window.addEventListener("dragleave", leave, true);
    window.addEventListener("drop", drop, true);
    return () => {
      window.removeEventListener("dragover", over, true);
      window.removeEventListener("dragenter", enter, true);
      window.removeEventListener("dragleave", leave, true);
      window.removeEventListener("drop", drop, true);
    };
  }, []);

  // Fotos reinziehen: zwei gleichzeitig lesen und kodieren, Hochladen läuft neben dem nächsten Foto her.
  // Das Buch wird gesammelt neu gerechnet (höchstens alle 800 ms), nicht nach jedem Foto.
  const addFiles = useCallback(
    async (files: File[]) => {
      const b = bookRef.current;
      if (!user || !b) return;
      setDropHint(null);
      performance.mark("fuji:upload-start");
      const room = MAX - b.photos.length;
      const isImage = (f: File) => f.type.startsWith("image/") || /\.(jpe?g|heic|heif|png|webp|avif|dng|tiff?)$/i.test(f.name);
      const skipped = files.filter((f) => !isImage(f));
      const list = files.filter(isImage).slice(0, room);
      const over = files.filter(isImage).length - list.length;
      const items: Pending[] = list.map((f) => ({ key: newId().slice(0, 10), name: f.name, state: "lesen" }));
      setPending((p) => [
        ...p,
        ...items,
        ...skipped.map((f) => ({ key: newId().slice(0, 10), name: f.name, state: "fehler" as const, error: "kein Foto" })),
      ]);
      // die Grenze klar benennen: wie viele aufgenommen wurden und wohin der Rest kann (#44)
      if (over > 0)
        setDropHint(
          list.length
            ? `${list.length} von ${list.length + over} Fotos aufgenommen, damit ist das Buch voll (bis zu ${MAX} Fotos). Die übrigen ${over} passen in ein zweites Buch.`
            : `Das Buch ist schon voll (bis zu ${MAX} Fotos). Die ${over} Fotos passen in ein zweites Buch.`,
        );
      const mark = (key: string, state: Pending["state"], error?: string) =>
        setPending((p) => p.map((x) => (x.key === key ? { ...x, state, error } : x)));

      let ready: StoredPhoto[] = [];
      let timer = 0;
      const flush = () => {
        window.clearTimeout(timer);
        timer = 0;
        if (!ready.length) return;
        const add = ready;
        ready = [];
        update((cur) => relayout({ ...cur, photos: [...cur.photos, ...add] }), "upload");
        setPending((p) => p.map((x) => (add.some((a) => a.key === x.key) ? { ...x, state: "fertig" } : x)));
      };

      const uploads: Promise<void>[] = [];
      let next = 0;
      const work = async () => {
        while (next < list.length) {
          const i = next++;
          const it = items[i];
          try {
            const ph = await ingest(list[i], it.key);
            mark(it.key, "laden");
            // Hochladen nicht abwarten: das nächste Foto wird schon gelesen
            uploads.push(
              uploadPhoto(user.uid, b.id, ph).then(
                (urls) => {
                  ready.push({
                    key: ph.key,
                    title: "",
                    alt: "",
                    w: ph.w,
                    h: ph.h,
                    src: urls.page,
                    large: urls.large,
                    thumb: urls.thumb,
                    color: ph.color,
                    subject: ph.subject,
                    taken: ph.taken,
                    recipe: ph.recipe,
                    camera: ph.camera,
                  });
                  if (!timer) timer = window.setTimeout(flush, 800);
                },
                (e) => mark(it.key, "fehler", e instanceof Error ? e.message : "Hochladen fehlgeschlagen"),
              ),
            );
          } catch (e) {
            mark(it.key, "fehler", e instanceof Error ? e.message : "Fehler");
          }
        }
      };
      await Promise.all([work(), work()]);
      await Promise.all(uploads);
      flush();
      // Messgrundlage T2: Zeit vom Reinziehen bis zum fertigen Erstentwurf (nur für die Messskripte, nicht in der Oberfläche)
      performance.measure("fuji:erstentwurf", "fuji:upload-start");
      window.setTimeout(() => setPending((p) => p.filter((x) => x.state !== "fertig")), 1500);
    },
    [relayout, update, user],
  );
  useEffect(() => {
    addRef.current = addFiles;
  }, [addFiles]);

  const data: BookData | null = useMemo(() => {
    if (!book || !book.spreads.some((s) => s.keys.length)) return null;
    try {
      return toBookData(book);
    } catch {
      return null;
    }
  }, [book]);

  if (user === undefined) return <main className="linen table-surface min-h-svh bg-table" />;
  if (user === null)
    return (
      <SignInTable title="Ein Buch gestalten">
        Melde dich an, dann ziehst du deine Fotos hier hinein. Rezepte und Kameradaten werden gelesen, GPS-Daten fallen weg.
      </SignInTable>
    );
  if (!book) return <main className="linen table-surface min-h-svh bg-table" />;

  if (preview && data && wide !== null)
    // auch auf dem Telefon die ganze Doppelseite, wie das Buch auf der Startseite
    return <Book book={data} mode="spread" autoOpen onClose={() => setPreview(false)} />;

  const byKey = new Map(book.photos.map((p) => [p.key, p]));
  const auto = new Map(autoPhotos(book.photos).map((p) => [p.key, p]));
  const shelf = book.photos.filter((p) => p.shelved);
  const pageW = wide ? 150 : 132;
  const selPhoto = sel?.type === "photo" ? byKey.get(sel.key) : undefined;
  const selSpreadIndex = sel?.type === "spread" ? book.spreads.findIndex((s) => s.id === sel.id) : -1;
  const selSpread = selSpreadIndex >= 0 ? book.spreads[selSpreadIndex] : undefined;
  const spreadOf = (key: string) => book.spreads.findIndex((s) => s.keys.includes(key));

  // ---- Änderungen an Doppelseiten und Fotos ----
  const mapSpreads = (b: StoredBook, f: (s: SpreadDraft[]) => SpreadDraft[]) => ({ ...b, spreads: f(b.spreads.map((s) => ({ ...s, keys: [...s.keys] }))) });

  const geom = { aspect: book.aspect, bottom: bottomFor(book.aspect) };
  const cycle = (i: number) =>
    update((b) =>
      mapSpreads(b, (ss) =>
        ss.map((s, n) => (n === i ? { ...s, pinned: true, layout: (s.layout + 1) % variantsOf(s, auto).length } : s)),
      ),
    );
  const togglePin = (i: number) => update((b) => mapSpreads(b, (ss) => ss.map((s, n) => (n === i ? { ...s, pinned: !s.pinned } : s))));
  const moveSpread = (from: number, to: number) =>
    update((b) =>
      mapSpreads(b, (ss) => {
        if (to < 0 || to >= ss.length || from === to) return ss;
        const [m] = ss.splice(from, 1);
        ss.splice(to, 0, { ...m, pinned: true });
        return ss;
      }),
    );
  const insertText = (at: number) => {
    const id = spreadId();
    update((b) => mapSpreads(b, (ss) => (ss.splice(at, 0, { id, keys: [], layout: 0, pinned: true, text: { heading: "", body: "", style: "text" } }), ss)));
    setSel({ type: "spread", id });
  };
  const removeSpread = (i: number) => {
    snapshot("vor dem Entfernen einer Doppelseite");
    update((b) => {
      const keys = new Set(b.spreads[i]?.keys ?? []);
      return {
        ...mapSpreads(b, (ss) => ss.filter((_, n) => n !== i)),
        photos: b.photos.map((p) => (keys.has(p.key) ? { ...p, shelved: true } : p)),
      };
    });
    setSel(null);
    say(`Doppelseite ${i + 1} entfernt${book.spreads[i]?.keys.length ? ", die Fotos sind beiseitegelegt" : ""}.`, undo);
  };
  /** Foto auf eine andere Doppelseite: ist sie voll, tauscht ihr letztes Foto den Platz; freie Seiten bekommen es in die erste freie Zelle */
  const movePhoto = (key: string, to: number) =>
    update((b) =>
      mapSpreads(
        { ...b, photos: b.photos.map((p) => (p.key === key ? { ...p, shelved: false } : p)) },
        (ss) => {
          const from = ss.findIndex((s) => s.keys.includes(key));
          const target = ss[to];
          if (!target || from === to) return ss;
          const ph = b.photos.find((p) => p.key === key);
          if (target.pages) {
            const added = ph ? addKey(target, key, ph.w / ph.h, { aspect: b.aspect, bottom: bottomFor(b.aspect) }) : null;
            if (!added) {
              say("Auf dieser Doppelseite ist kein Platz frei. Öffne sie mit „Gestalten“ und mach Platz.");
              return ss;
            }
            ss[to] = added;
            if (from >= 0) ss[from] = ss[from].pages ? removeKey(ss[from], key) : { ...ss[from], keys: ss[from].keys.filter((k) => k !== key), pinned: true, layout: 0 };
            return ss.filter(keepSpread);
          }
          if (from >= 0 && ss[from].pages) {
            ss[from] = removeKey(ss[from], key);
            const cap = target.text ? 1 : 2;
            if (target.keys.length >= cap) return ss;
            target.keys.push(key);
            Object.assign(target, { pinned: true, layout: 0 });
            return ss.filter(keepSpread);
          }
          const cap = target.text ? 1 : 2;
          const displaced = target.keys.length >= cap ? target.keys.pop() : undefined;
          target.keys.push(key);
          Object.assign(target, { pinned: true, layout: 0 });
          if (from >= 0) {
            const src = ss[from];
            src.keys = src.keys.filter((k) => k !== key);
            if (displaced) src.keys.push(displaced);
            Object.assign(src, { pinned: true, layout: 0 });
          }
          return ss.filter(keepSpread);
        },
      ),
    );

  // ---- Bühne: eine Doppelseite frei gestalten ----
  const stageIndex = stageId ? book.spreads.findIndex((s) => s.id === stageId) : -1;
  const stageSpread = stageIndex >= 0 ? book.spreads[stageIndex] : undefined;
  const stageItems: SpreadItem[] = stageSpread && data ? toSpread(stageSpread.pages ?? materialize(data, stageIndex)) : [];
  /** Änderung auf der Bühne übernehmen: Doppelseite wird frei, Fotos von anderswo wandern mit */
  const commitStage = (items: SpreadItem[], tag?: string, pulled: string[] = []) => {
    if (!stageId) return;
    update((b) => {
      const id = stageId;
      const pages = fromSpread(items);
      // nur hereingeholte Fotos verlassen ihre alte Doppelseite; kopierte dürfen mehrfach im Buch stehen
      const here = new Set(pulled);
      const spreads = b.spreads
        .map((s) => {
          if (s.id === id) return withPages(s, pages);
          const moved = s.keys.filter((k) => here.has(k));
          if (!moved.length) return s;
          return moved.reduce((acc, k) => (acc.pages ? removeKey(acc, k) : { ...acc, keys: acc.keys.filter((x) => x !== k), layout: 0 }), s);
        })
        .filter((s) => s.id === id || keepSpread(s));
      const onStage = new Set(items.flatMap((i) => (i.t === "photo" ? [i.key] : [])));
      return { ...b, spreads, aspectLocked: true, photos: b.photos.map((p) => (onStage.has(p.key) && p.shelved ? { ...p, shelved: false } : p)) };
    }, tag);
  };
  const resetStage = () => {
    if (!stageId) return;
    snapshot("vor dem Zurücksetzen einer Doppelseite");
    // auf den Vorschlag zurück; was über zwei Fotos hinausgeht, verteilt die Automatik neu
    update((b) => relayout(mapSpreads(b, (ss) => ss.map((s) => (s.id === stageId ? { ...s, pages: undefined, pinned: false, layout: 0 } : s)))));
  };
  const openStage = (i: number) => {
    const s = book.spreads[i];
    if (!s?.id) return;
    setSel(null);
    setStageId(s.id);
  };
  /**
   * Foto in die Ablage. Auf einer Doppelseite nach Vorschlag schließt sich die Lücke: die Doppelseite
   * wird wieder frei und die Automatik verteilt die Fotos neu, statt eine leere Seite stehen zu lassen.
   * Frei gestaltete Seiten und Textseiten behalten ihre Form; auf der Bühne bleibt die Doppelseite stehen.
   */
  const shelvePhoto = (key: string, close = true) => {
    say("Beiseitegelegt, nicht mehr im Buch.", undo);
    update((b) => {
      let gap = false;
      const next = {
        ...mapSpreads(b, (ss) =>
          ss
            .map((s) => {
              if (!s.keys.includes(key)) return s;
              if (s.pages) return removeKey(s, key);
              const keys = s.keys.filter((k) => k !== key);
              if (s.text || !close) return { ...s, keys, layout: 0 };
              gap = true;
              return { ...s, keys, layout: 0, pinned: false };
            })
            .filter(keepSpread),
        ),
        photos: b.photos.map((p) => (p.key === key ? { ...p, shelved: true } : p)),
      };
      return gap ? relayout(next) : next;
    });
  };
  const unshelvePhoto = (key: string) =>
    update((b) => relayout({ ...b, photos: b.photos.map((p) => (p.key === key ? { ...p, shelved: false } : p)) }));
  const setPhoto = (key: string, patch: Partial<StoredPhoto>, tag?: string) =>
    update((b) => ({ ...b, photos: b.photos.map((p) => (p.key === key ? { ...p, ...patch } : p)) }), tag);
  const setText = (i: number, patch: Partial<NonNullable<SpreadDraft["text"]>>) =>
    update((b) => mapSpreads(b, (ss) => ss.map((s, n) => (n === i && s.text ? { ...s, text: { ...s.text, ...patch } } : s))), `text-${i}`);
  const toggleStar = (key: string) =>
    update((b) => relayout({ ...b, photos: b.photos.map((p) => (p.key === key ? { ...p, star: !p.star } : p)) }));

  // Tastatur: Rückgängig, Wiederholen; gewähltes Foto mit Alt+Pfeil auf die Nachbarseite, Entf in die Ablage
  const onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA");
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !typing) {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (typing || !selPhoto || stageId) return;
    const i = spreadOf(selPhoto.key);
    if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      const to = i + (e.key === "ArrowLeft" ? -1 : 1);
      if (i >= 0 && to >= 0 && to < book.spreads.length) movePhoto(selPhoto.key, to);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      shelvePhoto(selPhoto.key);
      setSel(null);
    }
  };

  // Ziehen: Doppelseiten umsortieren, Fotos auf andere Doppelseiten oder aus der Ablage
  const onDrop = (to: number, e: React.DragEvent) => {
    if (hasFiles(e)) return;
    const photo = e.dataTransfer.getData("text/x-photo");
    if (photo) {
      e.preventDefault();
      movePhoto(photo, to);
      return;
    }
    const raw = e.dataTransfer.getData("text/x-spread");
    const from = raw === "" ? NaN : Number(raw);
    if (!Number.isNaN(from)) moveSpread(from, to);
  };
  const accepts = (e: React.DragEvent) => {
    const types = Array.from(e.dataTransfer.types);
    if (types.includes("text/x-spread") || types.includes("text/x-photo")) e.preventDefault();
  };

  // Bildfeld eines Fotos im aktuellen Layout: Seitenverhältnis und ob es über den Bund läuft
  const slotOf = (key: string) => {
    if (!data) return { aspect: 2 / 3, gutter: false };
    for (const s of data.spreads)
      for (const side of ["left", "right"] as const) {
        const page = s[side];
        if (!("no" in page) || plateOf(data, page.no)?.key !== key) continue;
        const el = layoutPage(data, page, side).els.find((x) => x.t === "img" && x.plate);
        if (el && el.t === "img") return { aspect: el.w / el.h, gutter: page.kind === "across" };
      }
    return { aspect: 2 / 3, gutter: false };
  };

  // Textseite: passt der Text? Gemessen in echter Schrift auf einer Leseseite, nicht geschätzt
  const textFits = (s: SpreadDraft) => textOverflow(s, data) === 0;

  const status =
    saved === "speichert"
      ? "Speichert …"
      : saved === "gespeichert"
        ? "Gespeichert"
        : saved === "offline"
          ? wide
            ? "Offline gespeichert, geht raus, sobald Netz da ist"
            : "Offline gespeichert"
          : saved === "fehler"
            ? "Speichern fehlgeschlagen"
            : "";

  return (
    <main className="linen table-surface relative min-h-svh bg-table">
      <Keys onKey={onKey} />
      {/* Telefon: zwei Zeilen, scrollt mit weg (verdeckt sonst die Doppelseiten); Wiederholen und Verlauf unter „Mehr“.
          Der Hauptknopf steht in beiden Größen rechts (#43) */}
      <header className="z-30 bg-table/95 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-3 md:sticky md:top-0 md:px-8 md:py-3">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/zimmer"
            className="text-on-table -ml-1 inline-flex min-h-11 items-center gap-0.5 pr-2 text-base font-medium transition-opacity duration-150 active:opacity-60"
          >
            <ChevronLeft aria-hidden className="size-5" />
            Bücherzimmer
          </Link>
          <span aria-live="polite" className="text-on-table-2 text-[13px]">
            {status}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <ToolGroup label="Bearbeiten">
            <IconButton label="Rückgängig (⌘Z)" disabled={!undoState.past} onClick={undo}>
              <Undo2 aria-hidden />
            </IconButton>
            <IconButton label="Wiederholen (⇧⌘Z)" disabled={!undoState.future} onClick={redo} className="max-md:hidden">
              <Redo2 aria-hidden />
            </IconButton>
            <IconButton label="Verlauf" onClick={() => setHistory(true)} className="max-md:hidden">
              <History aria-hidden />
            </IconButton>
            <IconButton label="Ansehen" disabled={!data} onClick={() => setPreview(true)}>
              <Eye aria-hidden />
            </IconButton>
            {/* Telefon: Wiederholen und Verlauf hinter „Mehr“ (#43) */}
            <span className="contents md:hidden">
              <Menu
                align="start"
                trigger={
                  <IconButton label="Mehr">
                    <MoreHorizontal aria-hidden />
                  </IconButton>
                }
              >
                <MenuItem icon={<Redo2 aria-hidden />} disabled={!undoState.future} onClick={redo}>
                  Wiederholen
                </MenuItem>
                <MenuItem icon={<History aria-hidden />} onClick={() => setHistory(true)}>
                  Verlauf
                </MenuItem>
              </Menu>
            </span>
          </ToolGroup>
          <span className="flex items-center gap-2">
            {/* Bildbearbeitung (Looks, Vorschläge, Feinschliff): das gewählte Foto, sonst das erste des Buchs */}
            <Button
              size="sm"
              disabled={!book.photos.length}
              onClick={() => setDevelop(selPhoto?.key ?? book.spreads.find((s) => s.keys.length)?.keys[0] ?? book.photos[0].key)}
              className="pointer-coarse:min-h-11 max-md:min-w-11 max-md:px-0 md:min-h-11 md:px-5"
            >
              <SlidersHorizontal aria-hidden />
              {/* Telefon: nur das Zeichen, sonst passt „Hinlegen“ nicht mehr in die Zeile */}
              <span className="max-md:sr-only">Bearbeiten</span>
            </Button>
            <Button variant="cloth" size="sm" disabled={!data || saved === "speichert"} onClick={() => setSharing(true)} className="pointer-coarse:min-h-11 md:min-h-11 md:px-5">
              <Gift aria-hidden />
              Hinlegen<span className="max-md:hidden"> für …</span>
            </Button>
          </span>
        </div>
      </header>

      <div className={`grid gap-8 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:grid-cols-[minmax(0,1fr)_320px] md:px-8 ${selPhoto || selSpread?.text ? "max-md:pb-[62svh]" : ""}`}>
        <section aria-label="Doppelseiten" className="min-w-0">
          {/* Fotos */}
          <div className="bg-on-table/5 flex flex-col items-start gap-3 rounded-tool p-5 shadow-[inset_0_0_0_1px_rgb(236_230_220/0.08)] md:p-6">
            <span aria-hidden className="bg-on-table/8 text-on-table grid size-11 place-items-center rounded-full">
              <ImagePlus className="size-5" />
            </span>
            <p className="text-on-table text-lg font-semibold">
              <span className="pointer-coarse:hidden">{book.photos.length ? "Weitere Fotos hineinziehen" : "Fotos hier hineinziehen"}</span>
              <span className="hidden pointer-coarse:inline">{book.photos.length ? "Weitere Fotos vom Handy" : "Fotos vom Handy"}</span>
            </p>
            <p className="text-on-table-2 max-w-[60ch] text-sm leading-relaxed">
              Originale direkt von der Kamera bringen ihr Fuji-Rezept mit, Lightroom-Exporte mit „Alle Metadaten“ ihre Einstellungen. Beim Hochladen
              werden die Fotos neu gespeichert, GPS und Seriennummer fallen weg. JPEG, HEIC und DNG vom iPhone.
            </p>
            {/* die Grenze steht direkt am Knopf, nicht versteckt im Absatz (#44) */}
            <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <Button size="sm" onClick={() => fileInput.current?.click()} aria-describedby="photo-limit">
                Fotos auswählen
              </Button>
              <span id="photo-limit" className="text-on-table-2 text-sm tabular-nums">
                bis zu {MAX} Fotos{book.photos.length ? ` · ${book.photos.length >= MAX ? "Buch ist voll" : `noch ${MAX - book.photos.length} frei`}` : ""}
              </span>
            </span>
            <input
              ref={fileInput}
              type="file"
              accept="image/*,.heic,.heif,.dng"
              multiple
              className="sr-only"
              onChange={(e) => {
                addFiles(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
            {dropHint && (
              <p role="alert" className="text-on-table text-sm">
                {dropHint}
              </p>
            )}
            {pending.length > 0 && (
              <p className="text-on-table text-sm tabular-nums" aria-live="polite">
                {pending.filter((p) => p.state === "fertig").length} von {pending.filter((p) => p.error !== "kein Foto").length} Fotos im Buch
              </p>
            )}
            {pending.length > 0 && (
              <ul className="text-on-table-2 max-h-48 w-full space-y-1 overflow-y-auto text-sm" tabIndex={0} aria-label="Fortschritt je Foto">
                {pending.map((p) => (
                  <li key={p.key} className="flex justify-between gap-4">
                    <span className="truncate">{p.name}</span>
                    <span className={p.state === "fehler" ? "text-on-table" : ""}>
                      {p.state === "lesen" ? "liest …" : p.state === "laden" ? "lädt hoch …" : p.state === "fertig" ? "fertig" : `Fehler: ${p.error}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Doppelseiten */}
          {data && (
            <>
              <div className="mt-8 flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-on-table text-lg font-semibold">{book.spreads.length} Doppelseiten</h2>
                <span className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => insertText(book.spreads.length)}>
                    <Type aria-hidden />
                    Textseite
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      snapshot("vor „Automatisch gestalten“");
                      update(relayout);
                    }}
                    title="Fixierte Doppelseiten und Textseiten bleiben, wie sie sind"
                  >
                    <LayoutGrid aria-hidden />
                    Automatisch gestalten
                  </Button>
                </span>
              </div>
              <p className="text-on-table-2 mt-1 text-[13px]">
                <Lock on /> bleibt, wie du es gesetzt hast.
              </p>
              <ol className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
                {book.spreads.map((s, i) => {
                  const sp = data.spreads[i + 1]; // 0 ist die Titelseite
                  const active = sel?.type === "spread" && sel.id === s.id;
                  return (
                    <li
                      key={s.id ?? s.keys.join("+")}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/x-spread", String(i))}
                      onDragOver={accepts}
                      onDrop={(e) => onDrop(i, e)}
                      className="p-3"
                    >
                      {/* Leiste: Knöpfe mindestens 24px hoch, mit dem Finger 44px; Entfernen abgesetzt von den Pfeilen (#43) */}
                      <div className="text-on-table-2 mb-1 flex flex-wrap items-center justify-between gap-x-3 text-[13px]">
                        <span className="flex items-center gap-x-1">
                          <button
                            type="button"
                            onClick={() => s.id && setSel(active ? null : { type: "spread", id: s.id })}
                            className={`inline-flex min-h-6 items-center text-left pointer-coarse:min-h-11 ${active ? "text-on-table font-semibold" : ""}`}
                            aria-pressed={active}
                          >
                            {s.text ? "Textseite" : s.pages ? `Doppelseite ${i + 1} · frei` : `Doppelseite ${i + 1}`}
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePin(i)}
                            disabled={!!s.text}
                            aria-pressed={!!s.pinned || !!s.text}
                            aria-label={s.pinned || s.text ? `Doppelseite ${i + 1} lösen` : `Doppelseite ${i + 1} fixieren`}
                            className={`${HIT} ${s.pinned || s.text ? "text-mark" : "text-on-table-2 hover:text-on-table"}`}
                            title={s.pinned ? "fixiert: die Automatik lässt sie in Ruhe" : "frei: die Automatik darf sie neu ordnen"}
                          >
                            <Lock on={!!s.pinned || !!s.text} />
                          </button>
                        </span>
                        <span className="flex flex-wrap items-center gap-x-3">
                          <TextButton className={HIT} onClick={() => openStage(i)} aria-label={`Doppelseite ${i + 1} gestalten`}>
                            Gestalten
                          </TextButton>
                          {!s.text && s.keys.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setDevelop(s.keys[0])}
                              aria-label={`Fotos von Doppelseite ${i + 1} bearbeiten`}
                              title="Fotos bearbeiten: Looks, Vorschläge, Feinschliff"
                              className={`${HIT} text-on-table-2 hover:text-on-table`}
                            >
                              <SlidersHorizontal aria-hidden className="size-4" />
                            </button>
                          )}
                          {!s.pages && variantsOf(s, auto).length > 1 && (
                            <TextButton
                              className={HIT}
                              onClick={() => cycle(i)}
                              aria-label={`Anderes Layout für Doppelseite ${i + 1}, jetzt ${s.layout + 1} von ${variantsOf(s, auto).length}`}
                              title={`Layout ${s.layout + 1} von ${variantsOf(s, auto).length}`}
                            >
                              Anderes Layout
                            </TextButton>
                          )}
                          <span className="flex items-center gap-x-1">
                            <TextButton className={HIT} onClick={() => moveSpread(i, i - 1)} disabled={i === 0} aria-label={`Doppelseite ${i + 1} nach vorn`}>
                              <ChevronLeft aria-hidden className="size-4" />
                            </TextButton>
                            <TextButton
                              className={HIT}
                              onClick={() => moveSpread(i, i + 1)}
                              disabled={i === book.spreads.length - 1}
                              aria-label={`Doppelseite ${i + 1} nach hinten`}
                            >
                              <ChevronRight aria-hidden className="size-4" />
                            </TextButton>
                          </span>
                          {/* Entfernen mit Strich und Abstand zu den Pfeilen, damit ein Fehltreffer nicht löscht */}
                          <span aria-hidden className="bg-on-table-2/40 h-4 w-px" />
                          <TextButton
                            className={HIT}
                            onClick={() => removeSpread(i)}
                            aria-label={`Doppelseite ${i + 1} entfernen, die Fotos werden beiseitegelegt`}
                            title="Doppelseite entfernen, die Fotos werden beiseitegelegt"
                          >
                            <X aria-hidden className="size-4" />
                          </TextButton>
                        </span>
                      </div>
                      <div
                        onDoubleClick={() => openStage(i)}
                        onClickCapture={(e) => {
                          // eigene Erkennung: auf ziehbaren Fotos meldet Safari keinen Doppelklick.
                          // detail ist die Klickzahl nach der Systemeinstellung; die Zeit ist der Rückfall
                          const now = performance.now();
                          const prev = lastClick.current;
                          lastClick.current = { i, at: now };
                          if (e.detail >= 2 || (prev && prev.i === i && now - prev.at < 600)) {
                            lastClick.current = null;
                            e.stopPropagation();
                            openStage(i);
                          }
                        }}
                        title="Doppelklick: gestalten"
                        className={`flex cursor-grab justify-center shadow-[0_12px_24px_-12px_rgb(12_10_8/0.8)] active:cursor-grabbing ${active ? "outline-mark outline-2 outline-offset-2" : ""}`}
                      >
                        {(["left", "right"] as const).map((side) => {
                          const page: Page | undefined = sp?.[side];
                          const key = page && "no" in page ? plateOf(data, page.no)?.key : undefined;
                          const isText = page?.kind === "text";
                          return (
                            <div key={side} className="relative" style={{ width: pageW, height: pageW * data.aspect }}>
                              {/* Textseiten in Lesegröße setzen und verkleinern: sonst greift die Mindestschrift und der Text läuft scheinbar über (UX-Kritik K1) */}
                              {page && isText && (
                                <div
                                  className="absolute top-0 left-0 origin-top-left"
                                  style={{ width: MEASURE_W, height: MEASURE_W * data.aspect, transform: `scale(${pageW / MEASURE_W})` }}
                                >
                                  <PageView book={data} page={page} side={side} />
                                </div>
                              )}
                              {page && !isText && <PageView book={data} page={page} side={side} />}
                              {key && (
                                <button
                                  type="button"
                                  draggable
                                  onDragStart={(e) => {
                                    e.stopPropagation();
                                    e.dataTransfer.setData("text/x-photo", key);
                                  }}
                                  onClick={() => setSel(sel?.type === "photo" && sel.key === key ? null : { type: "photo", key })}
                                  aria-label={`Foto auswählen: ${byKey.get(key)?.title || "ohne Titel"}`}
                                  aria-pressed={sel?.type === "photo" && sel.key === key}
                                  className={`absolute inset-0 z-30 ${sel?.type === "photo" && sel.key === key ? "outline-mark outline-2 -outline-offset-2" : ""}`}
                                />
                              )}
                              {page?.kind === "free" && (
                                <button
                                  type="button"
                                  onClick={() => openStage(i)}
                                  aria-label={`Doppelseite ${i + 1} gestalten`}
                                  className="absolute inset-0 z-30"
                                />
                              )}
                              {isText && s.id && (
                                <button
                                  type="button"
                                  onClick={() => setSel({ type: "spread", id: s.id! })}
                                  aria-label="Text bearbeiten"
                                  className="absolute inset-0 z-30"
                                />
                              )}
                              {key && byKey.get(key)?.star && (
                                <span aria-label="wichtig" className="text-mark pointer-events-none absolute top-1 right-1 z-40">
                                  <Star on />
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {!textFits(s) && (
                        <p className="text-on-table mt-2 text-xs">Der Text ist etwa {textOverflow(s, data)} Zeilen zu lang für die Seite.</p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </>
          )}

          {/* Ablage: hochgeladen, gerade nicht im Buch */}
          {shelf.length > 0 && (
            <div className="mt-10">
              <h2 className="text-on-table text-lg font-semibold">Beiseitegelegt</h2>
              <p className="text-on-table-2 mt-1 text-[13px]">Nicht im Buch. „Ins Buch“ legt ein Foto zurück.</p>
              <ul className="mt-3 flex flex-wrap gap-3">
                {shelf.map((p) => (
                  <li key={p.key} className="flex flex-col items-start gap-1">
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/x-photo", p.key)}
                      onClick={() => setSel({ type: "photo", key: p.key })}
                      aria-label={`Beiseitegelegtes Foto auswählen: ${p.title || "ohne Titel"}`}
                      className="relative h-20 w-20"
                    >
                      <Image src={p.thumb} alt="" fill sizes="80px" className="object-cover" />
                    </button>
                    <TextButton className="text-[12px]" onClick={() => unshelvePhoto(p.key)}>
                      Ins Buch
                    </TextButton>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Buch, gewähltes Foto, gewählte Textseite */}
        {/* Telefon: Buch-Angaben über den Doppelseiten, Werkzeuge des Gewählten als Blatt am unteren Rand (UX-Kritik K4) */}
        <aside className="space-y-6 max-md:order-first md:sticky md:top-20 md:self-start">
          <div className="slip text-ink relative space-y-5 rounded-cut p-5">
            {/* Einband als Vorschau: Titel und Leinen ändern sich, während man tippt und wählt */}
            <div className="flex items-end gap-4">
              <div
                aria-hidden
                className="linen relative aspect-[2/3] w-20 shrink-0 shadow-[0_14px_20px_-12px_rgb(12_10_8/0.8)] transition-colors duration-500 ease-out"
                style={{ backgroundColor: CLOTHS[book.cloth]?.base ?? CLOTHS.ringelblume.base, color: CLOTHS[book.cloth]?.ink ?? CLOTHS.ringelblume.ink }}
              >
                <span className="absolute inset-y-0 left-0 w-[5%] bg-[rgb(12_10_8/0.22)]" />
                <span
                  className="absolute right-1.5 bottom-2 left-2.5 line-clamp-3 text-[11px] leading-[0.95] font-bold tracking-[-0.03em] break-words"
                  style={{ fontVariationSettings: '"wdth" 76' }}
                >
                  {book.title || "Ohne Titel"}
                </span>
              </div>
              <p className="text-lg font-bold tracking-[-0.02em]" style={{ fontVariationSettings: '"wdth" 82' }}>
                Buch
              </p>
            </div>
            <Field label="Titel" value={book.title} maxLength={40} onChange={(e) => update((b) => ({ ...b, title: e.target.value.slice(0, 40) }), "title")} />
            <Field
              label="Zeile darunter"
              hint="Leer lassen: Anzahl der Fotos"
              value={book.subtitle}
              maxLength={60}
              onChange={(e) => update((b) => ({ ...b, subtitle: e.target.value.slice(0, 60) }), "subtitle")}
            />
            <Swatches
              label="Farbe des Einbands"
              items={(Object.keys(CLOTHS) as ClothId[]).map((id) => ({ id, label: CLOTHS[id].label, color: CLOTHS[id].base, ink: CLOTHS[id].ink }))}
              value={book.cloth}
              onChange={(id) => update((b) => ({ ...b, cloth: id as ClothId }))}
            />
          </div>

          {selPhoto && (
            <div className={`slip text-ink space-y-3 p-5 ${SHEET}`}>
              <SheetClose onClose={() => setSel(null)} />
              <div className="flex gap-3">
                <div className="relative h-24 w-24 shrink-0">
                  <Image src={selPhoto.thumb} alt="" fill sizes="96px" className="object-contain object-left-top" />
                </div>
                <p className="text-ink-2 text-[13px] leading-snug">{recipeLabel(selPhoto)}</p>
              </div>
              <button
                type="button"
                aria-pressed={!!selPhoto.star}
                onClick={() => toggleStar(selPhoto.key)}
                className={buttonClass(selPhoto.star ? "ink" : "paper", "sm")}
              >
                <Star on={!!selPhoto.star} /> {selPhoto.star ? "Wichtig: kommt groß ins Buch" : "Als wichtig markieren"}
              </button>
              <Field label="Titel" value={selPhoto.title} maxLength={50} onChange={(e) => setPhoto(selPhoto.key, { title: e.target.value.slice(0, 50) }, `t-${selPhoto.key}`)} />
              <Field
                label="Zusatz (Ort, Notiz)"
                value={selPhoto.note ?? ""}
                maxLength={50}
                onChange={(e) => setPhoto(selPhoto.key, { note: e.target.value.slice(0, 50) || undefined }, `n-${selPhoto.key}`)}
              />
              <Field
                label="Beschreibung für Screenreader"
                value={selPhoto.alt}
                maxLength={200}
                onChange={(e) => setPhoto(selPhoto.key, { alt: e.target.value.slice(0, 200) }, `a-${selPhoto.key}`)}
              />
              <div className="flex flex-wrap gap-2">
                {!selPhoto.shelved && (
                  <button
                    type="button"
                    className={buttonClass("paper", "sm")}
                    onClick={() => {
                      const i = spreadOf(selPhoto.key);
                      if (i >= 0 && book.spreads[i].pages) openStage(i);
                      else setCrop(selPhoto.key);
                    }}
                  >
                    Ausschnitt …
                  </button>
                )}
                <button type="button" className={buttonClass("paper", "sm")} onClick={() => setDevelop(selPhoto.key)}>
                  Bearbeiten …
                </button>
                <button
                  type="button"
                  className={buttonClass("paper", "sm")}
                  onClick={() => update((b) => ({ ...b, coverKey: selPhoto.key }))}
                  disabled={book.coverKey === selPhoto.key || !!selPhoto.shelved}
                >
                  {book.coverKey === selPhoto.key ? "Auf dem Einband" : "Auf den Einband"}
                </button>
                {selPhoto.shelved ? (
                  <button type="button" className={buttonClass("paper", "sm")} onClick={() => unshelvePhoto(selPhoto.key)}>
                    Ins Buch
                  </button>
                ) : (
                  <button
                    type="button"
                    className={buttonClass("paper", "sm", "text-ink-2")}
                    onClick={() => {
                      shelvePhoto(selPhoto.key);
                      setSel(null);
                    }}
                  >
                    Beiseitelegen
                  </button>
                )}
              </div>
              {!selPhoto.shelved && spreadOf(selPhoto.key) >= 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={buttonClass("paper", "sm")}
                    disabled={spreadOf(selPhoto.key) <= 0}
                    onClick={() => movePhoto(selPhoto.key, spreadOf(selPhoto.key) - 1)}
                  >
                    ← Nach vorn
                  </button>
                  <button
                    type="button"
                    className={buttonClass("paper", "sm")}
                    disabled={spreadOf(selPhoto.key) >= book.spreads.length - 1}
                    onClick={() => movePhoto(selPhoto.key, spreadOf(selPhoto.key) + 1)}
                  >
                    Nach hinten →
                  </button>
                </div>
              )}
              {!selPhoto.shelved && (
                <p className="text-ink-2 text-[12px] pointer-coarse:hidden">Ziehen auf eine andere Doppelseite verschiebt das Foto auch. Tastatur: Alt + ← / → , Entf legt es beiseite.</p>
              )}
            </div>
          )}

          {selSpread?.text && (
            <div className={`slip text-ink space-y-3 p-5 ${SHEET}`}>
              <SheetClose onClose={() => setSel(null)} />
              <p className="text-sm font-semibold">Textseite</p>
              <Field
                label="Überschrift (optional)"
                hint="z. B. Drei Tage am Meer"
                value={selSpread.text.heading ?? ""}
                maxLength={60}
                onChange={(e) => setText(selSpreadIndex, { heading: e.target.value.slice(0, 60) })}
              />
              <label className="block text-[13px]">
                <span className="text-ink-2">Text</span>
                <textarea
                  className={inputClass}
                  rows={7}
                  value={selSpread.text.body}
                  placeholder="Ein paar Sätze zu eurer Geschichte. Leerzeile = neuer Absatz."
                  onChange={(e) => setText(selSpreadIndex, { body: e.target.value.slice(0, 1200) })}
                />
              </label>
              <fieldset className="flex gap-2 text-sm">
                <legend className="text-ink-2 mb-1 text-[13px]">Schrift</legend>
                {(["text", "gross"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    aria-pressed={(selSpread.text?.style ?? "text") === st}
                    onClick={() => setText(selSpreadIndex, { style: st })}
                    className={buttonClass((selSpread.text?.style ?? "text") === st ? "ink" : "paper", "sm")}
                  >
                    {st === "text" ? "Absatz" : "Groß"}
                  </button>
                ))}
              </fieldset>
              <p className={`text-[12px] ${textFits(selSpread) ? "text-ink-2" : "text-ink font-semibold"}`}>
                {textFits(selSpread)
                  ? "Passt auf die Seite. Daneben kann ein Foto stehen: einfach hierher ziehen."
                  : `Etwa ${textOverflow(selSpread, data)} Zeilen zu lang für die Seite: kürzen${selSpread.text.style === "gross" ? " oder „Absatz“ wählen" : ""}.`}
              </p>
            </div>
          )}

          {!selPhoto && !selSpread && data && (
            <p className="text-on-table-2 text-sm leading-relaxed">
              Tippe auf ein Foto für Titel, Ausschnitt und Stern, oder auf eine Textseite zum Schreiben.{" "}
              <span className="pointer-coarse:hidden">Doppelklick auf eine Doppelseite öffnet sie zum Gestalten. Fotos und Doppelseiten lassen sich ziehen.</span>
              <span className="hidden pointer-coarse:inline">„Gestalten“ öffnet eine Doppelseite zum freien Anordnen.</span>
            </p>
          )}
        </aside>
      </div>

      {/* Telefon: Rückgängig in Daumennähe; der Kopf scrollt dort weg (iPhone-Workshop, Befund 8). Hinweise und Blätter haben Vorrang */}
      {undoState.past > 0 && !toastOpen && !selPhoto && !selSpread?.text && (
        <Button
          onClick={undo}
          className="bg-table-raised fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-[500] shadow-[0_18px_36px_-14px_rgb(0_0_0/0.8),inset_0_0_0_1px_rgb(236_230_220/0.1)] hover:bg-table-raised md:hidden"
        >
          <Undo2 aria-hidden />
          Rückgängig
        </Button>
      )}
      <Toaster />
      {stageSpread && data && (
        <Stage
          data={data}
          geom={geom}
          index={stageIndex}
          items={stageItems}
          photos={byKey}
          shelf={shelf}
          elsewhere={book.spreads.flatMap((sp, n) =>
            n === stageIndex ? [] : sp.keys.flatMap((k) => (byKey.get(k) ? [{ photo: byKey.get(k)!, spread: n }] : [])),
          )}
          free={!!stageSpread.pages}
          canUndo={undoState.past > 0}
          canRedo={undoState.future > 0}
          onUndo={undo}
          onRedo={redo}
          onCommit={commitStage}
          onShelve={(key) => shelvePhoto(key, false)}
          onPhoto={setPhoto}
          onReset={resetStage}
          onClose={() => setStageId(null)}
          onDevelop={setDevelop}
        />
      )}
      {dragOver && (
        <div aria-hidden className="pointer-events-none fixed inset-3 z-[650] flex items-center justify-center border-2 border-dashed border-mark bg-[rgb(12_10_8/0.6)]">
          <p className="text-on-table text-2xl font-bold tracking-[-0.02em]" style={{ fontVariationSettings: '"wdth" 80' }}>
            Loslassen, dann kommen die Fotos ins Buch
          </p>
        </div>
      )}
      {crop && byKey.get(crop) && (
        <CropDialog
          photo={byKey.get(crop)!}
          {...slotOf(crop)}
          onChange={(v) => {
            setPhoto(crop, v, `crop-${crop}`);
            // ein von Hand gesetzter Ausschnitt fixiert seine Doppelseite
            const i = spreadOf(crop);
            if (i >= 0 && !book.spreads[i].pinned) update((b) => mapSpreads(b, (ss) => ss.map((s, n) => (n === i ? { ...s, pinned: true } : s))), `crop-${crop}`);
          }}
          onClose={() => setCrop(null)}
        />
      )}
      {develop && byKey.get(develop) && (
        <DevelopDialog
          // bearbeitet wird ein Foto; die anderen der Doppelseite liegen zum Wechseln und Angleichen daneben
          photos={(() => {
            const i = spreadOf(develop);
            const keys = i >= 0 ? book.spreads[i].keys : [develop];
            return keys.map((k) => byKey.get(k)).filter((p): p is StoredPhoto => !!p);
          })()}
          start={develop}
          uid={user.uid}
          bookId={book.id}
          onDone={(patches) => {
            if (Object.keys(patches).length) update((b) => ({ ...b, photos: b.photos.map((p) => (patches[p.key] ? { ...p, ...patches[p.key] } : p)) }));
            setDevelop(null);
          }}
          onClose={() => setDevelop(null)}
        />
      )}
      {history && (
        <HistoryDialog
          book={book}
          onRestore={(v) => {
            snapshot("vor dem Zurückholen");
            update(() => migrate({ ...v.book, id: book.id, owner: book.owner }));
            setHistory(false);
          }}
          onClose={() => setHistory(false)}
        />
      )}
      {sharing && book && (
        <ShareDialog book={book} onClose={() => setSharing(false)} onTitle={(title) => update((b) => ({ ...b, title }), "title")} />
      )}
    </main>
  );
}

/** Tastenkürzel des Editors; hängt am Fenster, solange der Editor offen ist */
function Keys({ onKey }: { onKey: (e: KeyboardEvent) => void }) {
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);
  return null;
}

/** Verlauf: Zwischenstände ansehen und zurückholen, eigenen Stand sichern, Projekt als Datei */
function HistoryDialog({ book, onRestore, onClose }: { book: StoredBook; onRestore: (v: Version) => void; onClose: () => void }) {
  const [list, setList] = useState<Version[] | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    listVersions(book.id)
      .then(setList)
      .catch(() => setList([]));
  }, [book.id]);
  useEffect(() => {
    load();
  }, [load]);
  const fileUrl = useMemo(() => URL.createObjectURL(exportBook(book)), [book]);
  useEffect(() => () => URL.revokeObjectURL(fileUrl), [fileUrl]);

  return (
    <SlipDialog label="Verlauf" onClose={onClose}>
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          await saveVersion(book, name.trim() || "Eigener Stand", false).catch(() => {});
          setName("");
          setBusy(false);
          load();
        }}
      >
        <label htmlFor="version-name" className="sr-only">
          Name des Stands
        </label>
        <input id="version-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} placeholder="z. B. vor dem Umsortieren" />
        <button type="submit" disabled={busy} className="border-ink text-ink hover:bg-ink hover:text-paper shrink-0 border px-3 text-sm font-semibold transition-colors duration-150">
          Stand sichern
        </button>
      </form>
      <ul className="mt-5 max-h-[40svh] space-y-0 overflow-y-auto" tabIndex={0} aria-label="Zwischenstände">
        {list === null && <li className="text-ink-2 text-sm">Lade …</li>}
        {list?.length === 0 && <li className="text-ink-2 text-sm">Noch keine Zwischenstände. Sie entstehen von selbst vor großen Änderungen und alle zehn Minuten.</li>}
        {list?.map((v) => (
          <li key={v.id} className="flex items-baseline justify-between gap-3 border-t border-ink/15 py-2.5">
            <span className="min-w-0">
              <span className={`block truncate text-sm ${v.auto ? "" : "font-semibold"}`}>{v.label}</span>
              <span className="text-ink-2 text-[12px]">
                {when(v)} · {v.book.spreads.length} Doppelseiten
              </span>
            </span>
            <button type="button" onClick={() => onRestore(v)} className="shrink-0 text-sm underline decoration-mark decoration-2 underline-offset-4">
              Zurückholen
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-3 border-t border-ink/15 pt-4 text-sm">
        <a href={fileUrl} download={`${book.title || "fotobuch"}.calima.json`} className={buttonClass("paper", "sm")}>
          Projekt als Datei sichern
        </a>
        <span className="text-ink-2 text-[12px]">Öffnen über das Bücherzimmer</span>
      </div>
    </SlipDialog>
  );
}

// ---- Überlauf der Textseite ----
// Gemessen wird mit derselben Schrift, Größe und Breite wie im Lesebuch (page-view.tsx), auf einer
// Seite von 480px. Die Schätzung in layout.ts liegt bei langen Absätzen deutlich daneben (UX-Kritik K1).
const MEASURE_W = 480;
const overflowCache = new Map<string, number>();

/** Wie viele Zeilen zu viel auf der Textseite stehen (0 = passt) */
function textOverflow(s: SpreadDraft, data: BookData | null): number {
  if (!s.text || !data || typeof document === "undefined") return 0;
  const style = s.text.style ?? "text";
  const key = `${data.aspect}|${data.bottom}|${style}|${s.text.heading ?? ""}|${s.text.body}`;
  const hit = overflowCache.get(key);
  if (hit !== undefined) return hit;

  const st = TEXT_STYLE[style];
  const ta = typeArea(data, "right");
  const px = (cqw: number) => (cqw * MEASURE_W) / 100;
  const host = document.createElement("div");
  host.style.cssText = `position:absolute;left:-9999px;top:0;visibility:hidden;width:${MEASURE_W}px`;
  const block = (text: string, size: number, lh: number, width: number, heading: boolean) => {
    const el = document.createElement(heading ? "h2" : "p");
    el.textContent = text;
    el.style.cssText = `margin:0;width:${px(width)}px;font-size:${px(size)}px;line-height:${lh};white-space:pre-line;font-weight:${heading ? 700 : 400}`;
    if (heading) Object.assign(el.style, { letterSpacing: "-0.035em", fontVariationSettings: '"wdth" 78, "opsz" 96' });
    host.appendChild(el);
    return el;
  };
  const head = s.text.heading ? block(s.text.heading, 6, 1.02, ta.w, true) : null;
  const body = block(s.text.body || " ", st.size, st.lh, 66, false);
  document.body.appendChild(host);
  const used = (head ? head.offsetHeight + px(5) : 0) + body.offsetHeight;
  host.remove();

  const lineH = px(st.size) * st.lh;
  // eine halbe Zeile Spiel gegen Rundung
  const over = used > px(ta.h) + lineH / 2 ? Math.ceil((used - px(ta.h)) / lineH) : 0;
  if (overflowCache.size > 200) overflowCache.clear();
  overflowCache.set(key, over);
  return over;
}
