"use client";

import Image from "next/image";
import { Bookmark, BookmarkPlus, Check, ChevronDown, ClipboardCopy, ClipboardPaste, ChevronLeft, CircleAlert, ChevronRight, Download, Eye, Gift, History, ImagePlus, LayoutGrid, LoaderCircle, MoreHorizontal, Redo2, RotateCcw, Share, SlidersHorizontal, Type, Undo2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { plateOf, typeArea, type BookData, type Page } from "@/content/books";
import { layoutPage, TEXT_STYLE } from "@/content/layout";
import { SignInTable } from "@/components/app-ui";
import { Book } from "@/components/book";
import { buttonClass, Button, IconButton, ToolGroup } from "@/components/ui/button";
import { Field, noteClass } from "@/components/ui/field";
import { ListGroup, ListRow } from "@/components/ui/list";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { MountedSheet, Sheet } from "@/components/ui/sheet";
import { Swatches } from "@/components/ui/swatches";
import { notify, Toaster } from "@/components/ui/toaster";
import { CropDialog } from "@/components/crop-dialog";
import { DevelopDialog } from "@/components/develop-dialog";
import { PageView } from "@/components/page-view";
import { ShareDialog } from "@/components/share-dialog";
import { Stage } from "@/components/stage";
import { pickCover, relayoutFree, spreadId, variantsOf, type SpreadDraft } from "@/lib/auto-sequence";
import { addKey, fromSpread, materialize, removeKey, toSpread, withPages, type SpreadItem } from "@/lib/free-layout";
import { bakePhoto } from "@/lib/develop/bake";
import { buildLut, cleanEdit, neutralEdit } from "@/lib/develop/model";
import { applySettings, bookLooks, fromEdit, fromRecipe, sameSettings, type CopiedSettings } from "@/lib/develop/settings";
import { ingest } from "@/lib/ingest";
import {
  aspectFor,
  autoPhotos,
  bottomFor,
  CLOTHS,
  editedPatch,
  exportBook,
  listVersions,
  loadBook,
  migrate,
  newId,
  origOf,
  refreshShares,
  saveBook,
  saveVersion,
  SCHEMA,
  toBookData,
  uploadEdited,
  uploadPhoto,
  type ClothId,
  type StoredBook,
  type StoredPhoto,
  type Version,
} from "@/lib/store";
import { IS_APP, withKeys } from "@/lib/app-mode";
import { friendlyError } from "@/lib/errors";
import { takeHandover } from "@/lib/handoff";
import { haptic } from "@/lib/haptics";
import { safeFileName, saveFile } from "@/lib/native";
import { copySettings, useRecentSettings } from "@/lib/settings-clipboard";
import { useQueryParam } from "@/lib/use-query";
import { useUser } from "@/lib/use-user";
import { useWide } from "@/lib/use-wide";
import { de, getLang, locale, t, useT } from "@/lib/i18n";

// Buch gestalten: Fotos reinziehen → automatisch gestalten → von Hand ändern.
// Was man selbst entscheidet, wird fixiert; „Automatisch gestalten“ rechnet nur freie Doppelseiten neu.
// Gespeichert wird von selbst, Zwischenstände entstehen vor großen Änderungen; Rückgängig geht mit ⌘Z.

type Pending = { key: string; name: string; state: "lesen" | "laden" | "fertig" | "fehler"; error?: string };
type Selection = { type: "photo"; key: string } | { type: "spread"; id: string } | null;

const MAX = 60;
/** so viele Fotos laden höchstens gleichzeitig hoch (je drei Größen) */
const MAX_UPLOADS = 3;
/** Unter 768px: Panel des Gewählten als Blatt am unteren Rand, direkt beim Foto statt weit darunter */
const SHEET =
  "md:rounded-cut max-md:rounded-t-cut max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-[620] max-md:max-h-[60svh] max-md:overflow-y-auto max-md:overscroll-contain max-md:pb-[max(1.25rem,env(safe-area-inset-bottom))] max-md:shadow-[0_-16px_32px_-12px_rgb(12_10_8/0.7)]";

function SheetClose({ onClose }: { onClose: () => void }) {
  const t = useT();
  return (
    <div className="flex justify-end md:hidden">
      <Button variant="ink" size="sm" onClick={onClose} className="-my-1">
        {t("Fertig")}
      </Button>
    </div>
  );
}

/** Klickfläche kleiner Leistenknöpfe: 24px, mit dem Finger 44px hoch (WCAG 2.5.8, UX-Kritik K3) */
const HIT = "inline-flex min-h-6 min-w-6 items-center justify-center pointer-coarse:min-h-11 pointer-coarse:min-w-9";
/** runder Symbolknopf in der Leiste über einer Doppelseite */
const ROUND =
  "grid size-8 place-items-center rounded-full text-on-table-2 transition-colors duration-150 hover:bg-on-table/10 hover:text-on-table disabled:opacity-35 disabled:hover:bg-transparent pointer-coarse:size-11";

/** Eine Doppelseite bleibt, solange etwas auf ihr liegt */
const keepSpread = (s: SpreadDraft) => s.keys.length > 0 || !!s.text || !!s.pages?.some((p) => p.items.length);
const UNDO = 60;
const AUTO_VERSION_MS = 10 * 60 * 1000;

/** Seitenformat nach den Fotos: iPhone-Hochformate 3:4, Kamera 2:3 */
const recipeLabel = (p: StoredPhoto) =>
  p.recipe?.kind === "fuji"
    ? t("Fuji-Rezept erkannt: {film}", { film: p.recipe.film })
    : p.recipe?.kind === "lightroom"
      ? t("Lightroom-Einstellungen erkannt")
      : p.camera
        ? t("Kein Rezept in der Datei, Kameradaten: {device}", { device: p.camera.device })
        : t("Keine Metadaten in der Datei (z. B. aus einem Messenger)");

/** Meldungen aus Rückrufen, die nicht bei jedem Zeichnen neu entstehen sollen: lesen die Sprache beim Aufruf */
const msg = {
  undo: () => t("Rückgängig"),
  notFiles: () => t("Diese Fotos kamen nicht als Dateien an. Aus der Fotos-App bitte erst in den Finder ziehen oder „Fotos auswählen“ nutzen."),
  notPhoto: () => t("Kein Foto"),
  cantOpen: () => t("Ließ sich nicht öffnen"),
  full: (n: number, all: number, over: number) =>
    t("{n} von {all} Fotos aufgenommen, damit ist das Buch voll (bis zu {max} Fotos). Die übrigen {over} passen in ein zweites Buch.", { n, all, max: MAX, over }),
  fullAlready: (over: number) => t("Das Buch ist schon voll (bis zu {max} Fotos). Die {over} Fotos passen in ein zweites Buch.", { max: MAX, over }),
};

const when = (v: Version) =>
  v.at
    ? new Date(v.at.seconds * 1000).toLocaleString(locale(getLang()), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : t("gerade eben");

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
  const t = useT();

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
  const [coverSheet, setCoverSheet] = useState(false);
  const coverStrip = useRef<HTMLUListElement>(null);
  // das gewählte Titelbild steht beim Öffnen im Blick, auch wenn es weit hinten im Streifen liegt
  useEffect(() => {
    if (!coverSheet) return;
    const timer = window.setTimeout(() => {
      const strip = coverStrip.current;
      const on = strip?.querySelector<HTMLElement>("[aria-pressed=true]");
      if (strip && on) strip.scrollLeft = on.offsetLeft - (strip.clientWidth - on.offsetWidth) / 2;
    }, 50);
    return () => window.clearTimeout(timer);
  }, [coverSheet]);
  const [crop, setCrop] = useState<string | null>(null);
  const [develop, setDevelop] = useState<string | null>(null);
  // Looks übernehmen: zuletzt mitgenommen und was im Buch schon liegt (siehe pasteOn)
  const recent = useRecentSettings();
  const copied = recent[0] ?? null;
  const [pasting, setPasting] = useState<string | null>(null);
  const [stageId, setStageId] = useState<string | null>(null);
  const lastClick = useRef<{ i: number; at: number } | null>(null);
  // Hinweise als Pille von unten (Sonner), nach dem Ablegen mit Rückgängig. Solange einer steht, weicht der Rückgängig-Knopf am Telefon
  const [toastOpen, setToastOpen] = useState(false);
  const say = useCallback((text: string, onUndo?: () => void) => {
    setToastOpen(true);
    const done = () => setToastOpen(false);
    notify(text, { duration: onUndo ? 10000 : 6000, onDismiss: done, onAutoClose: done, ...(onUndo && { action: { label: msg.undo(), onClick: onUndo } }) });
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
  // die Änderung, deren Speichern noch auf den Zeitgeber wartet
  const unsaved = useRef<StoredBook | null>(null);
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
        // aus dem offenen Buch (langes Drücken, „Bearbeiten“): gleich die Doppelseite, die dort aufgeschlagen war
        const at = new URLSearchParams(location.search).get("doppelseite");
        if (!at) return;
        window.history.replaceState(null, "", `/neu?id=${b.id}`);
        // auch eine Textseite: auf der Bühne lässt sie sich beschreiben und bekleben, das Formular bleibt in der Liste
        const s = b.spreads[Number(at) - 1];
        if (s?.id) setStageId(s.id);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [idParam, user]);

  // nach jeder Änderung speichern; ohne Netz bleibt die Änderung im Browser und geht später raus
  useEffect(() => {
    if (!book || !touched || !book.photos.length) return;
    unsaved.current = book;
    const id = window.setTimeout(() => {
      unsaved.current = null;
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
            saveVersion(book, de("Zwischenstand"), true).catch(() => {});
          }
        })
        .catch(() => setSaved("fehler"));
    }, 900);
    return () => window.clearTimeout(id);
  }, [book, idParam, touched]);

  // Wer die Werkbank verlässt oder die App weglegt, bevor der Zeitgeber oben läuft, verliert sonst die letzte Änderung,
  // beim neuen Buch sogar das ganze Buch: was noch aussteht, geht dann sofort raus
  useEffect(() => {
    const flush = () => {
      const b = unsaved.current;
      if (b) saveBook(b).catch(() => {});
    };
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

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
    // ohne eigene Wahl: liegt ein Foto mit Stern im Buch, kommt eines davon auf den Einband
    const starred = autoPhotos(b.photos).filter((p) => p.star && inBook.has(p.key));
    const keep = b.coverKey && inBook.has(b.coverKey) && (b.coverPicked || !starred.length || starred.some((p) => p.key === b.coverKey));
    return {
      ...b,
      spreads,
      coverKey: keep ? b.coverKey : starred.length ? pickCover(starred) : coverKey,
      coverPicked: keep ? b.coverPicked : undefined,
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
        setDropHint(msg.notFiles());
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

  // Fotos reinziehen: zwei gleichzeitig lesen und kodieren (in der App eins), Hochladen läuft neben dem nächsten Foto her.
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
        ...skipped.map((f) => ({ key: newId().slice(0, 10), name: f.name, state: "fehler" as const, error: msg.notPhoto() })),
      ]);
      // die Grenze klar benennen: wie viele aufgenommen wurden und wohin der Rest kann (#44)
      if (over > 0)
        setDropHint(
          list.length
            ? msg.full(list.length, list.length + over, over)
            : msg.fullAlready(over),
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
      // Gegendruck: höchstens so viele Fotos gleichzeitig in der Leitung, sonst stauen sich bei langsamem Netz
      // Dutzende MB fertiger Bilder im Speicher (Workshop Paket 6, S7)
      let inFlight = 0;
      const waiting: (() => void)[] = [];
      const lane = async () => {
        while (inFlight >= MAX_UPLOADS) await new Promise<void>((ok) => waiting.push(ok));
      };
      const done = () => {
        inFlight--;
        waiting.shift()?.();
      };
      let next = 0;
      const work = async () => {
        while (next < list.length) {
          const i = next++;
          const it = items[i];
          try {
            await lane();
            const ph = await ingest(list[i], it.key).catch(() => {
              throw new Error(msg.cantOpen());
            });
            mark(it.key, "laden");
            inFlight++;
            // Hochladen nicht abwarten: das nächste Foto wird schon gelesen
            uploads.push(
              uploadPhoto(user.uid, b.id, ph).finally(done).then(
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
                (e) => mark(it.key, "fehler", friendlyError(e)),
              ),
            );
          } catch (e) {
            mark(it.key, "fehler", e instanceof Error ? e.message : msg.cantOpen());
          }
        }
      };
      // in der App ein Strang: zwei gleichzeitig dekodierte 24-MP-Fotos sprengen auf kleinen iPhones den Speicher
      await Promise.all(IS_APP ? [work()] : [work(), work()]);
      await Promise.all(uploads);
      flush();
      // Messgrundlage T2: Zeit vom Reinziehen bis zum fertigen Erstentwurf (nur für die Messskripte, nicht in der Oberfläche)
      performance.measure("fuji:erstentwurf", "fuji:upload-start");
      window.setTimeout(() => setPending((p) => p.filter((x) => x.state !== "fertig")), 1500);
    },
    [relayout, update, user],
  );

  // Fotos, die im Bücherzimmer schon gewählt wurden (App): aufnehmen, sobald das neue Buch steht
  const hasBook = !!book;
  useEffect(() => {
    if (!hasBook || idParam) return;
    const files = takeHandover();
    if (files) addFiles(files);
  }, [hasBook, idParam, addFiles]);
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
      <SignInTable title={t("Ein Buch gestalten")}>
        {t("Melde dich an, dann ziehst du deine Fotos hier hinein. Rezepte und Kameradaten werden gelesen, GPS-Daten fallen weg.")}
      </SignInTable>
    );
  if (!book) return <main className="linen table-surface min-h-svh bg-table" />;

  if (preview && data && wide !== null)
    // auch auf dem Telefon die ganze Doppelseite, wie das Buch auf der Startseite
    return (
      <Book
        book={data}
        mode="spread"
        autoOpen
        onClose={() => setPreview(false)}
        onEdit={(step) => {
          setPreview(false);
          const s = book.spreads[step - 2];
          if (s?.id) setStageId(s.id);
        }}
      />
    );

  const byKey = new Map(book.photos.map((p) => [p.key, p]));
  const auto = new Map(autoPhotos(book.photos).map((p) => [p.key, p]));
  const shelf = book.photos.filter((p) => p.shelved);
  const pageW = wide ? 150 : 132;
  const selPhoto = sel?.type === "photo" ? byKey.get(sel.key) : undefined;
  const selSpreadIndex = sel?.type === "spread" ? book.spreads.findIndex((s) => s.id === sel.id) : -1;
  const selSpread = selSpreadIndex >= 0 ? book.spreads[selSpreadIndex] : undefined;
  const spreadOf = (key: string) => book.spreads.findIndex((s) => s.keys.includes(key));
  /** Looks, die im Buch schon auf Fotos liegen, mit ihren Doppelseiten */
  const looksInBook = () => bookLooks(book.photos.filter((p) => !p.shelved).map((p) => ({ key: p.key, edit: p.edit, at: spreadOf(p.key) + 1 || undefined })));

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
    snapshot(de("vor dem Entfernen einer Doppelseite"));
    update((b) => {
      const keys = new Set(b.spreads[i]?.keys ?? []);
      return {
        ...mapSpreads(b, (ss) => ss.filter((_, n) => n !== i)),
        photos: b.photos.map((p) => (keys.has(p.key) ? { ...p, shelved: true } : p)),
      };
    });
    setSel(null);
    say(
      book.spreads[i]?.keys.length
        ? t("Doppelseite {n} entfernt, die Fotos sind beiseitegelegt.", { n: i + 1 })
        : t("Doppelseite {n} entfernt.", { n: i + 1 }),
      undo,
    );
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
              say(t("Auf dieser Doppelseite ist kein Platz frei. Öffne sie mit „Gestalten“ und mach Platz."));
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
    snapshot(de("vor dem Zurücksetzen einer Doppelseite"));
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
    say(t("Beiseitegelegt, nicht mehr im Buch."), undo);
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
  /* Einstellungen kopieren und einfügen: Farbe und Licht, nie der Zuschnitt. Einfügen rechnet das Foto neu ein. */
  const editOf = (p: StoredPhoto) => {
    const e = cleanEdit(p.edit);
    return e ? fromEdit(e, undefined, p.title || undefined) : null;
  };
  const fileOf = (p: StoredPhoto) => (p.recipe ? fromRecipe(p.recipe, p.title || undefined) : null);
  const copyFrom = (s: CopiedSettings | null) => {
    if (!s) return say(t("Dieses Foto hat noch keine Einstellungen zum Kopieren."));
    copySettings(s);
    haptic("select");
    say(
      s.approx
        ? t("„{name}“ mitgenommen, in Calima nachempfunden. Liegt im Fotostudio oben bei „Deine Looks“.", { name: s.name })
        : t("„{name}“ mitgenommen. Liegt im Fotostudio oben bei „Deine Looks“.", { name: s.name }),
    );
  };
  const pasteOn = async (p: StoredPhoto, s: CopiedSettings | null = copied) => {
    if (!s || !user || pasting) return;
    const e = applySettings(cleanEdit(p.edit) ?? neutralEdit(), s);
    setPasting(p.key);
    try {
      const out = await bakePhoto({ url: origOf(p).large, lut: buildLut(e, 33), n: 33, rec: e.rec, geo: e.geo, vignette: e.more?.vignette, clarity: e.more?.clarity });
      const urls = await uploadEdited(user.uid, book.id, p.key, out.blobs);
      update((b) => ({ ...b, photos: b.photos.map((x) => (x.key === p.key ? { ...x, ...editedPatch(x, e, { urls, color: out.color }) } : x)) }));
      say(
        s.approx
          ? t("„{name}“ übernommen, nachempfunden. Der Zuschnitt bleibt.", { name: s.name })
          : t("„{name}“ übernommen. Der Zuschnitt bleibt.", { name: s.name }),
        undo,
      );
    } catch {
      say(t("Übernehmen hat nicht geklappt. Prüf die Verbindung und versuch es noch einmal."));
    } finally {
      setPasting(null);
    }
  };
  /** Titelbild von Hand: bleibt, bis man ein anderes wählt */
  const setCover = (key: string) => update((b) => ({ ...b, coverKey: key, coverPicked: true }));
  const toggleStar = (key: string) =>
    update((b) => relayout({ ...b, photos: b.photos.map((p) => (p.key === key ? { ...p, star: !p.star } : p)) }));

  // Tastatur: Rückgängig, Wiederholen; gewähltes Foto mit Alt+Pfeil auf die Nachbarseite, Entf in die Ablage
  const onKey = (e: KeyboardEvent) => {
    // die Bildbearbeitung hat ihr eigenes Rückgängig
    if (develop) return;
    const el = e.target as HTMLElement;
    const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !typing) {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (typing || !selPhoto || stageId) return;
    // ⇧⌘C / ⇧⌘V: Einstellungen des gewählten Fotos, wie in Lightroom (die Seitenbühne kopiert mit ⌘C Elemente)
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey && (e.key.toLowerCase() === "c" || e.key.toLowerCase() === "v")) {
      e.preventDefault();
      if (e.key.toLowerCase() === "c") copyFrom(editOf(selPhoto) ?? fileOf(selPhoto));
      else if (copied) pasteOn(selPhoto);
      else say(t("Erst bei einem Foto einen Look mitnehmen."));
      return;
    }
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
      ? t("Speichert …")
      : saved === "gespeichert"
        ? t("Gespeichert")
        : saved === "offline"
          ? wide
            ? t("Offline gespeichert, geht raus, sobald Netz da ist")
            : t("Offline gespeichert")
          : saved === "fehler"
            ? t("Speichern fehlgeschlagen")
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
            {t("Bücherzimmer")}
          </Link>
          <span aria-live="polite" className="text-on-table-2 text-[13px]">
            {status}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <ToolGroup label={t("Bearbeiten")}>
            <IconButton label={withKeys(t("Rückgängig"), "⌘Z")} disabled={!undoState.past} onClick={undo}>
              <Undo2 aria-hidden />
            </IconButton>
            <IconButton label={withKeys(t("Wiederholen"), "⇧⌘Z")} disabled={!undoState.future} onClick={redo} className="max-md:hidden">
              <Redo2 aria-hidden />
            </IconButton>
            <IconButton label={t("Verlauf")} onClick={() => setHistory(true)} className="max-md:hidden">
              <History aria-hidden />
            </IconButton>
            <IconButton label={t("Ansehen")} disabled={!data} onClick={() => setPreview(true)}>
              <Eye aria-hidden />
            </IconButton>
            {/* Telefon: Wiederholen und Verlauf hinter „Mehr“ (#43) */}
            <span className="contents md:hidden">
              <Menu
                align="start"
                trigger={
                  <IconButton label={t("Mehr")}>
                    <MoreHorizontal aria-hidden />
                  </IconButton>
                }
              >
                <MenuItem icon={<Redo2 aria-hidden />} disabled={!undoState.future} onClick={redo}>
                  {t("Wiederholen")}
                </MenuItem>
                <MenuItem icon={<History aria-hidden />} onClick={() => setHistory(true)}>
                  {t("Verlauf")}
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
              <span className="max-md:sr-only">{t("Bearbeiten")}</span>
            </Button>
            <Button variant="cloth" size="sm" disabled={!data || saved === "speichert"} onClick={() => setSharing(true)} className="pointer-coarse:min-h-11 md:min-h-11 md:px-5">
              <Gift aria-hidden />
              <span className="max-md:hidden">{t("Hinlegen für …")}</span>
              <span className="md:hidden">{t("Hinlegen …")}</span>
            </Button>
          </span>
        </div>
      </header>

      <div className={`grid gap-8 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:grid-cols-[minmax(0,1fr)_320px] md:px-8 ${selPhoto || selSpread?.text ? "max-md:pb-[62svh]" : ""}`}>
        <section aria-label={t("Doppelseiten")} className="min-w-0">
          {/* Fotos */}
          <div className="bg-on-table/5 flex flex-col items-start gap-3 rounded-tool p-5 shadow-[inset_0_0_0_1px_rgb(236_230_220/0.08)] md:p-6">
            <span aria-hidden className="bg-on-table/8 text-on-table grid size-11 place-items-center rounded-full">
              <ImagePlus className="size-5" />
            </span>
            <p className="text-on-table text-lg font-semibold">
              <span className="pointer-coarse:hidden">{book.photos.length ? t("Weitere Fotos hineinziehen") : t("Fotos hier hineinziehen")}</span>
              <span className="hidden pointer-coarse:inline">{book.photos.length ? t("Weitere Fotos vom Handy") : t("Fotos vom Handy")}</span>
            </p>
            <p className="text-on-table-2 max-w-[60ch] text-sm leading-relaxed">
              {t(
                "Originale direkt von der Kamera bringen ihr Fuji-Rezept mit, Lightroom-Exporte mit „Alle Metadaten“ ihre Einstellungen. Beim Hochladen werden die Fotos neu gespeichert, GPS und Seriennummer fallen weg. JPEG, HEIC und DNG vom iPhone.",
              )}
            </p>
            {/* die Grenze steht direkt am Knopf, nicht versteckt im Absatz (#44) */}
            <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <Button size="sm" onClick={() => fileInput.current?.click()} aria-describedby="photo-limit">
                {t("Fotos auswählen")}
              </Button>
              <span id="photo-limit" className="text-on-table-2 text-sm tabular-nums">
                {t("bis zu {max} Fotos", { max: MAX })}
                {book.photos.length ? ` · ${book.photos.length >= MAX ? t("Buch ist voll") : t("noch {n} frei", { n: MAX - book.photos.length })}` : ""}
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
            {pending.length > 0 &&
              (() => {
                const total = pending.filter((p) => p.error !== msg.notPhoto()).length;
                const done = pending.filter((p) => p.state === "fertig").length;
                return (
                  total > 0 && (
                    <div className="w-full max-w-sm">
                      <p className="text-on-table text-sm tabular-nums" aria-live="polite">
                        {t("{done} von {total} Fotos im Buch", { done, total })}
                      </p>
                      {/* Fortschritt als Linie, die mit scaleX wächst (Signal, keine Fläche) */}
                      <span aria-hidden className="bg-on-table/12 mt-2 block h-1 overflow-hidden rounded-full">
                        <span className="bg-cloth block h-full origin-left rounded-full transition-transform duration-500 ease-out" style={{ transform: `scaleX(${done / total})` }} />
                      </span>
                    </div>
                  )
                );
              })()}
            {pending.length > 0 && (
              <ul className="text-on-table-2 max-h-48 w-full space-y-1.5 overflow-y-auto text-sm" tabIndex={0} aria-label={t("Fortschritt je Foto")}>
                {pending.map((p) => (
                  <li key={p.key} className="flex items-center gap-2.5">
                    <span aria-hidden className={`shrink-0 [&_svg]:size-4 ${p.state === "fehler" ? "text-danger-on-table" : p.state === "fertig" ? "text-on-table" : ""}`}>
                      {p.state === "fertig" ? <Check /> : p.state === "fehler" ? <CircleAlert /> : <LoaderCircle className="motion-safe:animate-spin" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <span className={`shrink-0 ${p.state === "fehler" ? "text-on-table" : ""}`}>
                      {p.state === "lesen" ? t("liest …") : p.state === "laden" ? t("lädt hoch …") : p.state === "fertig" ? t("fertig") : p.error}
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
                <h2 className="text-on-table text-lg font-semibold">{book.spreads.length === 1 ? t("1 Doppelseite") : t("{n} Doppelseiten", { n: book.spreads.length })}</h2>
                <span className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => insertText(book.spreads.length)}>
                    <Type aria-hidden />
                    {t("Textseite")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      snapshot(de("vor „Automatisch gestalten“"));
                      update(relayout);
                    }}
                    title={t("Fixierte Doppelseiten und Textseiten bleiben, wie sie sind")}
                  >
                    <LayoutGrid aria-hidden />
                    {t("Automatisch gestalten")}
                  </Button>
                </span>
              </div>
              <p className="text-on-table-2 mt-1 text-[13px]">
                <Lock on /> {t("bleibt, wie du es gesetzt hast.")}
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
                            {s.text ? t("Textseite") : s.pages ? t("Doppelseite {n} · frei", { n: i + 1 }) : t("Doppelseite {n}", { n: i + 1 })}
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePin(i)}
                            disabled={!!s.text}
                            aria-pressed={!!s.pinned || !!s.text}
                            aria-label={s.pinned || s.text ? t("Doppelseite {n} lösen", { n: i + 1 }) : t("Doppelseite {n} fixieren", { n: i + 1 })}
                            className={`${HIT} ${s.pinned || s.text ? "text-mark" : "text-on-table-2 hover:text-on-table"}`}
                            title={s.pinned ? t("fixiert: die Automatik lässt sie in Ruhe") : t("frei: die Automatik darf sie neu ordnen")}
                          >
                            <Lock on={!!s.pinned || !!s.text} />
                          </button>
                        </span>
                        <span className="flex flex-wrap items-center gap-x-1.5">
                          <button type="button" className={buttonClass("quiet", "sm", "min-h-8")} onClick={() => openStage(i)} aria-label={t("Doppelseite {n} gestalten", { n: i + 1 })}>
                            {t("Gestalten")}
                          </button>
                          {!s.text && s.keys.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setDevelop(s.keys[0])}
                              aria-label={t("Fotos von Doppelseite {n} bearbeiten", { n: i + 1 })}
                              title={t("Fotos bearbeiten: Looks, Vorschläge, Feinschliff")}
                              className={ROUND}
                            >
                              <SlidersHorizontal aria-hidden className="size-4" />
                            </button>
                          )}
                          {!s.pages && variantsOf(s, auto).length > 1 && (
                            <button
                              type="button"
                              className={buttonClass("quiet", "sm", "min-h-8")}
                              onClick={() => cycle(i)}
                              aria-label={t("Anderes Layout für Doppelseite {n}, jetzt {k} von {all}", { n: i + 1, k: s.layout + 1, all: variantsOf(s, auto).length })}
                              title={t("Layout {k} von {all}", { k: s.layout + 1, all: variantsOf(s, auto).length })}
                            >
                              {t("Anderes Layout")}
                            </button>
                          )}
                          <span className="flex items-center gap-x-1">
                            <button type="button" className={ROUND} onClick={() => moveSpread(i, i - 1)} disabled={i === 0} aria-label={t("Doppelseite {n} nach vorn", { n: i + 1 })}>
                              <ChevronLeft aria-hidden className="size-4" />
                            </button>
                            <button
                              type="button"
                              className={ROUND}
                              onClick={() => moveSpread(i, i + 1)}
                              disabled={i === book.spreads.length - 1}
                              aria-label={t("Doppelseite {n} nach hinten", { n: i + 1 })}
                            >
                              <ChevronRight aria-hidden className="size-4" />
                            </button>
                          </span>
                          {/* Entfernen mit Strich und Abstand zu den Pfeilen, damit ein Fehltreffer nicht löscht */}
                          <span aria-hidden className="bg-on-table-2/40 h-4 w-px" />
                          <button
                            type="button"
                            className={ROUND}
                            onClick={() => removeSpread(i)}
                            aria-label={t("Doppelseite {n} entfernen, die Fotos werden beiseitegelegt", { n: i + 1 })}
                            title={t("Doppelseite entfernen, die Fotos werden beiseitegelegt")}
                          >
                            <X aria-hidden className="size-4" />
                          </button>
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
                        title={IS_APP ? undefined : t("Doppelklick: gestalten")}
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
                                  aria-label={t("Foto auswählen: {title}", { title: byKey.get(key)?.title || t("ohne Titel") })}
                                  aria-pressed={sel?.type === "photo" && sel.key === key}
                                  className={`absolute inset-0 z-30 ${sel?.type === "photo" && sel.key === key ? "outline-mark outline-2 -outline-offset-2" : ""}`}
                                />
                              )}
                              {page?.kind === "free" && (
                                <button
                                  type="button"
                                  onClick={() => openStage(i)}
                                  aria-label={t("Doppelseite {n} gestalten", { n: i + 1 })}
                                  className="absolute inset-0 z-30"
                                />
                              )}
                              {isText && s.id && (
                                <button
                                  type="button"
                                  onClick={() => setSel({ type: "spread", id: s.id! })}
                                  aria-label={t("Text bearbeiten")}
                                  className="absolute inset-0 z-30"
                                />
                              )}
                              {key && byKey.get(key)?.star && (
                                <span aria-label={t("wichtig")} className="text-mark pointer-events-none absolute top-1 right-1 z-40">
                                  <Star on />
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {!textFits(s) && (
                        <p className="text-on-table mt-2 text-xs">{t("Der Text ist etwa {n} Zeilen zu lang für die Seite.", { n: textOverflow(s, data) })}</p>
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
              <h2 className="text-on-table text-lg font-semibold">{t("Beiseitegelegt")}</h2>
              <p className="text-on-table-2 mt-1 text-[13px]">{t("Nicht im Buch. „Ins Buch“ legt ein Foto zurück.")}</p>
              <ul className="mt-3 flex flex-wrap gap-3">
                {shelf.map((p) => (
                  <li key={p.key} className="flex flex-col items-start gap-1">
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/x-photo", p.key)}
                      onClick={() => setSel({ type: "photo", key: p.key })}
                      aria-label={t("Beiseitegelegtes Foto auswählen: {title}", { title: p.title || t("ohne Titel") })}
                      className="relative h-20 w-20"
                    >
                      <Image src={p.thumb} alt="" fill sizes="80px" className="object-cover" />
                    </button>
                    <Button size="sm" className="w-20 px-0" onClick={() => unshelvePhoto(p.key)} aria-label={t("{title} ins Buch", { title: p.title || t("Foto") })}>
                      {t("Ins Buch")}
                    </Button>
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
            {/* Einband als Vorschau: derselbe Satz wie im Buch (Titelbild, Titel, Zeile darunter, Name), ändert sich beim Tippen */}
            <div className="flex items-end gap-4">
              {data ? (
                // Einband antippen öffnet das Blatt „Einband“ mit der Wahl des Titelbilds (Workshop Umschlag)
                <button
                  type="button"
                  onClick={() => setCoverSheet(true)}
                  aria-label={t("Einband: Titelbild wählen")}
                  className="relative w-32 shrink-0 shadow-[0_14px_20px_-12px_rgb(12_10_8/0.8)] transition-transform duration-150 ease-out active:scale-[0.97]"
                  style={{ aspectRatio: `1 / ${data.aspect}` }}
                >
                  <PageView book={data} page={{ kind: "cover" }} side="right" sizes={() => "128px"} />
                </button>
              ) : (
                // noch ohne Fotos: nur Leinen mit Titel; die Zeile darunter wäre auf 128px neben dem 12px-Titel unter der Lesegrenze (HIG 11px) und steht im Feld daneben
                <div
                  aria-hidden
                  className="linen relative aspect-[2/3] w-32 shrink-0 shadow-[0_14px_20px_-12px_rgb(12_10_8/0.8)] transition-colors duration-500 ease-out"
                  style={{ backgroundColor: CLOTHS[book.cloth]?.base ?? CLOTHS.ringelblume.base, color: CLOTHS[book.cloth]?.ink ?? CLOTHS.ringelblume.ink }}
                >
                  <span className="absolute inset-y-0 left-0 w-[5%] bg-[rgb(12_10_8/0.22)]" />
                  <span className="absolute right-1.5 bottom-3 left-2.5">
                    <span className="line-clamp-3 text-[12px] leading-[0.95] font-bold tracking-[-0.03em] break-words" style={{ fontVariationSettings: '"wdth" 76' }}>
                      {book.title || t("Ohne Titel")}
                    </span>
                  </span>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-lg font-bold tracking-[-0.02em]" style={{ fontVariationSettings: '"wdth" 82' }}>
                  {t("Buch")}
                </p>
                {data && (
                  <button type="button" className={buttonClass("paper", "sm")} onClick={() => setCoverSheet(true)}>
                    <ImagePlus aria-hidden />
                    {t("Titelbild …")}
                  </button>
                )}
              </div>
            </div>
            <Field label={t("Titel")} value={book.title} maxLength={40} onChange={(e) => update((b) => ({ ...b, title: e.target.value.slice(0, 40) }), "title")} />
            <Field
              label={t("Zeile darunter")}
              hint={t("Leer lassen: Anzahl der Fotos")}
              value={book.subtitle}
              maxLength={60}
              onChange={(e) => update((b) => ({ ...b, subtitle: e.target.value.slice(0, 60) }), "subtitle")}
            />
            <Swatches
              label={t("Farbe des Einbands")}
              items={(Object.keys(CLOTHS) as ClothId[]).map((id) => ({ id, label: t(CLOTHS[id].label), color: CLOTHS[id].base, ink: CLOTHS[id].ink }))}
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
                <Star on={!!selPhoto.star} /> {selPhoto.star ? t("Wichtig: kommt groß ins Buch") : t("Als wichtig markieren")}
              </button>
              <Field label={t("Titel")} value={selPhoto.title} maxLength={50} onChange={(e) => setPhoto(selPhoto.key, { title: e.target.value.slice(0, 50) }, `t-${selPhoto.key}`)} />
              <Field
                label={t("Zusatz (Ort, Notiz)")}
                value={selPhoto.note ?? ""}
                maxLength={50}
                onChange={(e) => setPhoto(selPhoto.key, { note: e.target.value.slice(0, 50) || undefined }, `n-${selPhoto.key}`)}
              />
              <Field
                label={t("Beschreibung für Screenreader")}
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
                    {t("Ausschnitt …")}
                  </button>
                )}
                <button type="button" className={buttonClass("paper", "sm")} onClick={() => setDevelop(selPhoto.key)}>
                  {t("Bearbeiten …")}
                </button>
                {fileOf(selPhoto) && (
                  <button type="button" className={buttonClass("paper", "sm", "pl-2.5")} onClick={() => copyFrom(fileOf(selPhoto))} title={t("für andere Fotos und Bücher, in Calima nachempfunden")}>
                    <ClipboardCopy aria-hidden />
                    {selPhoto.recipe?.kind === "fuji" ? t("Fuji-Rezept mitnehmen") : t("Lightroom-Werte mitnehmen")}
                  </button>
                )}
                {(() => {
                  // was hier schon liegt, steht nicht zur Wahl
                  const mineNow = editOf(selPhoto);
                  const here = looksInBook().filter((l) => !l.keys.includes(selPhoto.key));
                  const fresh = recent.filter((c) => (!mineNow || !sameSettings(c, mineNow)) && !here.some((l) => sameSettings(l, c)));
                  if (!here.length && !fresh.length) return null;
                  return (
                    <Menu
                      align="start"
                      trigger={
                        <button type="button" className={buttonClass("paper", "sm", "pl-2.5")} disabled={!!pasting} title={t("Farbe und Licht von einem anderen Foto, der Zuschnitt bleibt. ⇧⌘V nimmt den zuletzt mitgenommenen")}>
                          {pasting === selPhoto.key ? <LoaderCircle aria-hidden className="animate-spin" /> : <ClipboardPaste aria-hidden />}
                          {pasting === selPhoto.key ? t("Übernehme …") : t("Look übernehmen")}
                          <ChevronDown aria-hidden />
                        </button>
                      }
                    >
                      {fresh.length > 0 && <MenuLabel>{t("Zuletzt mitgenommen")}</MenuLabel>}
                      {fresh.map((c, i) => (
                        <MenuItem key={`r${i}`} hint={[c.from, c.approx && t("nachempfunden")].filter(Boolean).join(", ") || undefined} onClick={() => pasteOn(selPhoto, c)}>
                          {c.name}
                        </MenuItem>
                      ))}
                      {fresh.length > 0 && here.length > 0 && <MenuSeparator />}
                      {here.length > 0 && <MenuLabel>{t("In diesem Buch")}</MenuLabel>}
                      {here.map((l) => (
                        <MenuItem key={l.keys.join()} hint={l.where || undefined} onClick={() => pasteOn(selPhoto, l)}>
                          {l.name}
                        </MenuItem>
                      ))}
                    </Menu>
                  );
                })()}
                <button
                  type="button"
                  className={buttonClass("paper", "sm")}
                  onClick={() => setCover(selPhoto.key)}
                  disabled={book.coverKey === selPhoto.key || !!selPhoto.shelved}
                >
                  {book.coverKey === selPhoto.key ? t("Auf dem Einband") : t("Auf den Einband")}
                </button>
                {selPhoto.shelved ? (
                  <button type="button" className={buttonClass("paper", "sm")} onClick={() => unshelvePhoto(selPhoto.key)}>
                    {t("Ins Buch")}
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
                    {t("Beiseitelegen")}
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
                    {t("← Nach vorn")}
                  </button>
                  <button
                    type="button"
                    className={buttonClass("paper", "sm")}
                    disabled={spreadOf(selPhoto.key) >= book.spreads.length - 1}
                    onClick={() => movePhoto(selPhoto.key, spreadOf(selPhoto.key) + 1)}
                  >
                    {t("Nach hinten →")}
                  </button>
                </div>
              )}
              {!selPhoto.shelved && (
                <p className="text-ink-2 text-[12px] pointer-coarse:hidden">{t("Ziehen auf eine andere Doppelseite verschiebt das Foto auch. Tastatur: Alt + ← / → , Entf legt es beiseite.")}</p>
              )}
            </div>
          )}

          {selSpread?.text && (
            <div className={`slip text-ink space-y-3 p-5 ${SHEET}`}>
              <SheetClose onClose={() => setSel(null)} />
              <p className="text-sm font-semibold">{t("Textseite")}</p>
              <Field
                label={t("Überschrift (optional)")}
                hint={t("z. B. Drei Tage am Meer")}
                value={selSpread.text.heading ?? ""}
                maxLength={60}
                onChange={(e) => setText(selSpreadIndex, { heading: e.target.value.slice(0, 60) })}
              />
              <label className="block text-[13px]">
                <span className="text-ink-2">{t("Text")}</span>
                <textarea
                  className={noteClass}
                  rows={7}
                  value={selSpread.text.body}
                  placeholder={t("Ein paar Sätze zu eurer Geschichte. Leerzeile = neuer Absatz.")}
                  onChange={(e) => setText(selSpreadIndex, { body: e.target.value.slice(0, 1200) })}
                />
              </label>
              <fieldset className="flex gap-2 text-sm">
                <legend className="text-ink-2 mb-1 text-[13px]">{t("Schrift")}</legend>
                {(["text", "gross"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    aria-pressed={(selSpread.text?.style ?? "text") === st}
                    onClick={() => setText(selSpreadIndex, { style: st })}
                    className={buttonClass((selSpread.text?.style ?? "text") === st ? "ink" : "paper", "sm")}
                  >
                    {st === "text" ? t("Absatz") : t("Groß")}
                  </button>
                ))}
              </fieldset>
              <p className={`text-[12px] ${textFits(selSpread) ? "text-ink-2" : "text-ink font-semibold"}`}>
                {textFits(selSpread)
                  ? t("Passt auf die Seite. Daneben kann ein Foto stehen: einfach hierher ziehen.")
                  : selSpread.text.style === "gross"
                    ? t("Etwa {n} Zeilen zu lang für die Seite: kürzen oder „Absatz“ wählen.", { n: textOverflow(selSpread, data) })
                    : t("Etwa {n} Zeilen zu lang für die Seite: kürzen.", { n: textOverflow(selSpread, data) })}
              </p>
            </div>
          )}

          {!selPhoto && !selSpread && data && (
            <p className="text-on-table-2 text-sm leading-relaxed">
              {t("Tippe auf ein Foto für Titel, Ausschnitt und Stern, oder auf eine Textseite zum Schreiben.")}{" "}
              <span className="pointer-coarse:hidden">{t("Doppelklick auf eine Doppelseite öffnet sie zum Gestalten. Fotos und Doppelseiten lassen sich ziehen.")}</span>
              <span className="hidden pointer-coarse:inline">{t("„Gestalten“ öffnet eine Doppelseite zum freien Anordnen.")}</span>
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
          {t("Rückgängig")}
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
            {t("Loslassen, dann kommen die Fotos ins Buch")}
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
          looks={looksInBook()}
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
            snapshot(de("vor dem Zurückholen"));
            update(() => migrate({ ...v.book, id: book.id, owner: book.owner }));
            setHistory(false);
          }}
          onClose={() => setHistory(false)}
        />
      )}
      {data && (
        <Sheet title={t("Einband")} description={t("Tippe auf ein Foto, es kommt auf den Einband. Fotos mit Stern stehen vorn.")} open={coverSheet} onOpenChange={setCoverSheet}>
          <div className="relative mx-auto w-[170px] shadow-[0_14px_20px_-12px_rgb(12_10_8/0.8)]" style={{ aspectRatio: `1 / ${data.aspect}` }}>
            <PageView book={data} page={{ kind: "cover" }} side="right" sizes={() => "170px"} />
          </div>
          <p className="text-ink-2 mt-5 mb-2 text-[13px]">{t("Titelbild")}</p>
          <ul
            ref={coverStrip}
            className="relative -mx-5 flex gap-2 overflow-x-auto overscroll-x-contain px-5 pt-1 pb-2"
          >
            {coverChoices(book).map((p, i) => {
              const on = p.key === book.coverKey;
              return (
                <li key={p.key} className="shrink-0">
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={`${p.title || t("Foto {n}", { n: i + 1 })}${p.star ? `, ${t("wichtig")}` : ""}`}
                    onClick={() => !on && setCover(p.key)}
                    className={`relative block h-24 outline-offset-2 ${on ? "outline-ink outline-2 outline-solid" : ""}`}
                    style={{ aspectRatio: `${p.w} / ${p.h}` }}
                  >
                    <Image src={p.thumb} alt="" fill sizes="160px" className="object-cover" />
                    {p.star && (
                      <span aria-hidden className="bg-paper text-ink absolute top-1 left-1 grid size-5 place-items-center">
                        <Star on />
                      </span>
                    )}
                    {on && (
                      <span aria-hidden className="bg-ink text-paper absolute right-1 bottom-1 grid size-6 place-items-center rounded-full">
                        <Check className="size-4" />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </Sheet>
      )}
      {sharing && book && (
        <ShareDialog book={book} onClose={() => setSharing(false)} onTitle={(title) => update((b) => ({ ...b, title }), "title")} />
      )}
    </main>
  );
}

/** Fotos im Buch für die Wahl des Titelbilds: in Buchreihenfolge, die mit Stern zuerst */
function coverChoices(book: StoredBook) {
  const byKey = new Map(book.photos.map((p) => [p.key, p]));
  const inBook = [...new Set(book.spreads.flatMap((s) => s.keys))].flatMap((k) => byKey.get(k) ?? []).filter((p) => !p.shelved);
  return [...inBook.filter((p) => p.star), ...inBook.filter((p) => !p.star)];
}

/** Tastenkürzel des Editors; hängt am Fenster, solange der Editor offen ist */
function Keys({ onKey }: { onKey: (e: KeyboardEvent) => void }) {
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);
  return null;
}

/** Verlauf: Zwischenstände ansehen und zurückholen, eigenen Stand sichern, Projekt als Datei. Blatt von unten wie die übrigen Dialoge */
function HistoryDialog({ book, onRestore, onClose }: { book: StoredBook; onRestore: (v: Version) => void; onClose: () => void }) {
  const [list, setList] = useState<Version[] | null>(null);
  const [all, setAll] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const t = useT();
  const load = useCallback(() => {
    listVersions(book.id)
      .then(setList)
      .catch(() => setList([]));
  }, [book.id]);
  useEffect(() => {
    load();
  }, [load]);
  // Datei erst beim Tippen erzeugen; in der App über das Teilen-Blatt („In Dateien sichern“), im Browser als Download
  const saveProject = async () => {
    const r = await saveFile(safeFileName(book.title || t("Fotobuch"), ".calima.json"), exportBook(book), "application/json");
    if (r === "shared" && IS_APP) {
      notify(t("Projekt gesichert."));
      haptic("success");
    } else if (r === "failed") notify(t("Die Datei ließ sich nicht anlegen. Versuch es bitte noch einmal."));
  };

  const shown = list && !all ? list.slice(0, 8) : list;

  return (
    <MountedSheet title={t("Verlauf")} description={t("Zwischenstände entstehen von selbst vor großen Änderungen und alle zehn Minuten.")} onClose={onClose}>
      {(close) => (
        <>
          <form
            className="flex items-end gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              await saveVersion(book, name.trim() || de("Eigener Stand"), false).catch(() => {});
              setName("");
              setBusy(false);
              load();
            }}
          >
            <Field label={t("Eigenen Stand benennen")} className="min-w-0 flex-1" value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} />
            <Button type="submit" variant="paper" size="sm" disabled={busy} className="mb-1.5">
              <BookmarkPlus aria-hidden />
              {t("Sichern")}
            </Button>
          </form>

          <div className="mt-6">
            {list === null && <p className="text-ink-2 text-sm">{t("Lade …")}</p>}
            {list?.length === 0 && <p className="text-ink-2 text-sm">{t("Noch keine Zwischenstände.")}</p>}
            {shown && shown.length > 0 && (
              <ListGroup paper label={t("Zwischenstände")}>
                {shown.map((v) => (
                  <ListRow
                    key={v.id}
                    paper
                    lead={v.auto ? <History aria-hidden /> : <Bookmark aria-hidden />}
                    title={<span className={`block truncate ${v.auto ? "font-normal" : ""}`}>{t(v.label)}</span>}
                    detail={`${when(v)} · ${v.book.spreads.length === 1 ? t("1 Doppelseite") : t("{n} Doppelseiten", { n: v.book.spreads.length })}`}
                    trail={
                      // Telefon: nur das Symbol, damit Name und Datum Platz haben
                      <Button variant="paper" size="sm" onClick={() => close(() => onRestore(v))} aria-label={t("{label} vom {when} zurückholen", { label: t(v.label), when: when(v) })} className="max-sm:size-11 max-sm:px-0">
                        <RotateCcw aria-hidden />
                        <span className="max-sm:sr-only">{t("Zurückholen")}</span>
                      </Button>
                    }
                  />
                ))}
              </ListGroup>
            )}
            {list && !all && list.length > 8 && (
              <Button variant="paper" size="sm" className="mt-3" onClick={() => setAll(true)}>
                {t("Ältere zeigen ({n})", { n: list.length - 8 })}
              </Button>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <Button variant="paper" size="sm" onClick={saveProject}>
              {IS_APP ? <Share aria-hidden /> : <Download aria-hidden />}
              {IS_APP ? t("Projekt als Datei sichern …") : t("Projekt als Datei sichern")}
            </Button>
          </div>
          <p className="text-ink-2 mt-2 text-[13px] leading-relaxed">
            {t("Enthält Aufbau und Texte, nicht die Fotos: Die bleiben in deinem Konto. Wieder öffnen: Bücherzimmer › Neues Buch › Aus Datei öffnen.")}
          </p>
        </>
      )}
    </MountedSheet>
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
