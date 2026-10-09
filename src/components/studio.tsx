"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

import { BookPlus, Camera as CameraIcon, ChevronLeft, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ListGroup, ListRow } from "@/components/ui/list";
import { Segmented } from "@/components/ui/segmented";
import { MountedSheet } from "@/components/ui/sheet";
import { notify } from "@/components/ui/toaster";
import type { User } from "@/lib/firebase";
import { pickCover, relayoutFree } from "@/lib/auto-sequence";
import { bakePhoto } from "@/lib/develop/bake";
import type { SharpenLevel } from "@/lib/develop/detail";
import { outSize } from "@/lib/develop/geo";
import { buildLut, describeEdit, isNeutral, neutralEdit, type PhotoEdit } from "@/lib/develop/model";
import { friendlyError } from "@/lib/errors";
import { fromEdit } from "@/lib/develop/settings";
import { withExif, withXmp } from "@/lib/exif-write";
import { hasCamera } from "@/lib/camera";
import { useQueryParam } from "@/lib/use-query";
import { calimaXmp } from "@/lib/xmp";
import { IS_APP } from "@/lib/app-mode";
import { haptic } from "@/lib/haptics";
import { safeFileName, saveFile, saveFilesInApp, type ShareResult } from "@/lib/native";
import { zipFiles } from "@/lib/zip";
import { SIZES, STUDIO_LONG } from "@/lib/ingest";
import { aspectFor, autoPhotos, editedPatch, loadBook, newId, numberWord, saveBook, SCHEMA, uploadEdited, uploadPhoto, type StoredBook, type StoredPhoto } from "@/lib/store";
import { listPrints, MAX_PRINTS, MAX_STACK, piles, putPrints, removePrint, trimPiles, type Print } from "@/lib/studio-store";
import { de, getLang, locale, t, useT } from "@/lib/i18n";

// Fotostudio unten im Bücherzimmer (Workshop 9.10.2026, fotostudio-workshop/): ein Foto öffnen, mit dem Editor der Werkbank
// bearbeiten, dann sichern oder in ein Buch legen. Bis dahin bleibt alles auf dem Gerät. Die letzten Fotos liegen als Abzüge
// auf dem Pult und lassen sich wieder öffnen. Mehrere Fotos auf einmal werden ein Stapel (mehrere-fotos-wettbewerb/): im
// Editor „Auf alle“ und Angleichen, danach alle zusammen sichern oder in ein Buch legen.

// der Editor ist groß und wird erst geladen, wenn jemand ein Foto öffnet
const DevelopDialog = dynamic(() => import("@/components/develop-dialog").then((m) => m.DevelopDialog), { ssr: false });
const Camera = dynamic(() => import("@/components/camera").then((m) => m.Camera), { ssr: false });

/** größer ist keine Fotodatei, sondern etwas, das beim Entpacken den Speicher sprengt */
const MAX_FILE = 60 * 1024 * 1024;
const ACCEPT = "image/*,.heic,.heif,.dng";
const N = 33;

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const abzuege = (n: number) => (n === 1 ? t("Ein Abzug") : t("{n} Abzüge", { n: numberWord(n) }));
const stem = (name: string) => name.replace(/\.[^.]+$/, "").slice(0, 60) || t("Foto");
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const when = (at: number) => {
  const d = new Date(at);
  const now = new Date();
  if (sameDay(d, now)) return t("heute");
  if (sameDay(d, new Date(now.getTime() - 864e5))) return t("gestern");
  return d.toLocaleDateString(locale(getLang()), { day: "numeric", month: "short" });
};
// Drehung der Abzüge auf dem Pult: aus der Hand gelegt, aber ruhig
const TILT = [-4, 2.5, -1.5, 3.5, -2.5, 1.5, -3, 2];

/** Objekt-URLs für Blobs, die beim Wechsel oder Aushängen wieder freigegeben werden */
function useBlobUrls(blobs: Record<string, Blob | undefined>) {
  const urls = useMemo(() => Object.fromEntries(Object.entries(blobs).map(([k, b]) => [k, b ? URL.createObjectURL(b) : undefined])), [blobs]);
  useEffect(() => () => Object.values(urls).forEach((u) => u && URL.revokeObjectURL(u)), [urls]);
  return urls;
}

export function Studio({ user, books }: { user: User; books: StoredBook[] | null }) {
  const [prints, setPrints] = useState<Print[]>([]);
  const [preparing, setPreparing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Print[] | null>(null);
  const [openNote, setOpenNote] = useState<string | null>(null);
  const [done, setDone] = useState<Print[] | null>(null);
  const [over, setOver] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  // eine Kamera-Sitzung ist ein Stapel: alle Aufnahmen bis zum Schließen
  const session = useRef<{ stack: string; prints: Print[] }>({ stack: newId(), prints: [] });
  const input = useRef<HTMLInputElement>(null);
  const t = useT();
  const router = useRouter();
  // „So fotografieren“ vom Rezeptzettel: das Zimmer öffnet mit ?kamera=1, der Look liegt schon im Zwischenspeicher
  const wantsCamera = useQueryParam("kamera") === "1" && hasCamera();
  const camera = cameraOpen || wantsCamera;

  useEffect(() => {
    listPrints(user.uid)
      .then((p) => setPrints(trimPiles(piles(p)).keep.flat()))
      .catch(() => {});
  }, [user.uid]);

  // ohne IndexedDB (privates Fenster) hält das Studio die Abzüge nur, solange die Seite offen ist
  const keep = (ps: Print[]) => {
    setPrints((list) => trimPiles(piles([...ps, ...list.filter((x) => !ps.some((p) => p.id === x.id))])).keep.flat());
    putPrints(user.uid, ps).catch(() => {});
  };
  const stacks = piles(prints);

  const openCamera = () => setCameraOpen(true);
  const onShot = (p: Print) => {
    const cur = session.current;
    const i = cur.prints.findIndex((x) => x.id === p.id);
    const print = { ...p, stack: cur.stack, pos: i < 0 ? cur.prints.length : cur.prints[i].pos };
    if (i < 0) cur.prints.push(print);
    else cur.prints[i] = print;
    keep([print]);
  };
  const closeCamera = () => {
    setCameraOpen(false);
    if (wantsCamera) router.replace("/zimmer");
    const made = session.current.prints;
    session.current = { stack: newId(), prints: [] };
    if (!made.length) return;
    // ein einzelnes Foto ist ein Abzug, kein Stapel
    const ps = made.length === 1 ? [{ ...made[0], stack: undefined, pos: undefined }] : made;
    keep(ps);
    setDone(ps);
  };

  const open = async (given: File[]) => {
    setError(null);
    // Safari liefert manche Fotos ohne oder mit allgemeinem Typ; versucht wird alles außer Videos, statt es still zu verwerfen
    const images = given.filter((x) => !x.type.startsWith("video/"));
    const files = images.filter((f) => f.size <= MAX_FILE).slice(0, MAX_STACK);
    const notes: string[] = [];
    if (images.length > MAX_STACK) notes.push(t("Höchstens {max} Fotos auf einmal, die ersten {max} sind offen.", { max: MAX_STACK }));
    if (images.some((f) => f.size > MAX_FILE)) notes.push(t("Fotos über 60 MB bleiben draußen."));
    if (!files.length) return setError(notes.join(" ") || t("Dieses Foto lässt sich nicht öffnen."));
    const stack = files.length > 1 ? newId() : undefined;
    const at = Date.now();
    const made: Print[] = [];
    let broken = 0;
    let reason = "";
    setPreparing(files.length > 1 ? t("Öffne {i} von {n} …", { i: 1, n: files.length }) : t("Wird geöffnet …"));
    try {
      const { studioSource } = await import("@/lib/ingest");
      // nacheinander, nie alle zugleich: jedes Foto wird in voller Größe entpackt
      for (const [i, file] of files.entries()) {
        if (files.length > 1) setPreparing(t("Öffne {i} von {n} …", { i: i + 1, n: files.length }));
        // Safari verschluckt sich bei vielen großen Fotos hintereinander am Speicher: ein zweiter Versuch nach kurzer Pause
        const s = await studioSource(file).catch(() => pause(400).then(() => studioSource(file))).catch((e) => {
          broken++;
          if (e instanceof Error && /format|DNG/i.test(e.message)) reason = e.message;
          return null;
        });
        if (s) made.push({ id: newId(), name: stem(file.name), at, w: s.w, h: s.h, work: s.work, page: s.page, thumb: s.thumb, meta: s.meta, stack, pos: made.length });
      }
    } finally {
      setPreparing(null);
    }
    if (broken)
      notes.push(
        files.length === 1
          ? reason
            ? t("Dieses Foto lässt sich nicht öffnen: {reason}.", { reason })
            : t("Dieses Foto lässt sich nicht öffnen.")
          : broken === 1
            ? t("Ein Foto ließ sich nicht öffnen.")
            : t("{n} Fotos ließen sich nicht öffnen.", { n: numberWord(broken) }),
      );
    if (!made.length) return setError(notes.join(" "));
    // bleibt nur eins übrig, ist es ein einzelner Abzug
    const ps = made.length === 1 ? [{ ...made[0], stack: undefined, pos: undefined }] : made;
    keep(ps);
    // der Hinweis gehört in den Editor, der das Studio sonst verdeckt
    setOpenNote(
      !notes.length
        ? null
        : !broken
          ? notes.join(" ")
          : `${notes.join(" ")} ${made.length === 1 ? t("Ein Foto ist offen.") : t("{n} Fotos sind offen.", { n: numberWord(made.length) })}`,
    );
    setEditing(ps);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (e.dataTransfer.files.length) open([...e.dataTransfer.files]);
  };

  const sub = prints.length
    ? `${
        stacks.length < prints.length
          ? stacks.length === 1
            ? t("{prints} in einem Stapel", { prints: abzuege(prints.length) })
            : t("{prints} in {n} Stapeln", { prints: abzuege(prints.length), n: numberWord(stacks.length).toLowerCase() })
          : abzuege(prints.length)
      } · ${t("zuletzt {when}", { when: when(prints[0].at) })}`
    : t("Fotos bearbeiten, sichern oder in ein Buch legen. Gern mehrere auf einmal.");

  return (
    <section
      aria-labelledby="studio-h"
      className={`grid gap-4 outline-2 outline-offset-8 transition-[outline-color] duration-150 ${over ? "outline-cloth" : "outline-transparent"}`}
      onDragOver={(e) => {
        if (![...e.dataTransfer.types].includes("Files")) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOver(false)}
      onDrop={onDrop}
    >
      <div className="grid gap-1">
        <h2 id="studio-h" className="text-on-table text-[28px] leading-tight font-bold tracking-[-0.02em]" style={{ fontVariationSettings: '"wdth" 80' }}>
          {t("Fotostudio")}
        </h2>
        <p className="text-on-table-2 text-sm">{sub}</p>
      </div>

      <ul className="flex flex-wrap items-end gap-y-7 pt-2 pl-7 md:pl-8" aria-label={t("Abzüge")}>
        {stacks.map((pile, i) => (pile.length > 1 ? <StackTile key={pile[0].stack} pile={pile} i={i} onOpen={() => setEditing(pile)} /> : <PrintTile key={pile[0].id} print={pile[0]} i={i} onOpen={() => setEditing(pile)} />))}
        {hasCamera() && (
          <OnTable i={stacks.length} tilt={-2} className={prints.length ? "ml-4" : "-ml-5 md:-ml-6"}>
            <button
              type="button"
              onClick={openCamera}
              disabled={!!preparing}
              className="studio-sheet linen bg-paper-shade text-cloth-ink/70 grid h-[132px] w-[104px] content-between p-3 text-left disabled:opacity-70 md:h-[156px] md:w-[124px]"
              aria-describedby="studio-h"
            >
              <CameraIcon aria-hidden className="h-7 w-7" strokeWidth={1.5} />
              <span className="text-[15px] leading-tight font-bold">{t("Kamera")}</span>
            </button>
          </OnTable>
        )}
        <OnTable i={stacks.length + (hasCamera() ? 1 : 0)} tilt={2} className={prints.length || hasCamera() ? "ml-4" : "-ml-5 md:-ml-6"}>
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={!!preparing}
            className="studio-sheet linen bg-paper-shade text-cloth-ink/70 grid h-[132px] w-[104px] content-between p-3 text-left disabled:opacity-70 md:h-[156px] md:w-[124px]"
            aria-describedby="studio-h"
          >
            <span aria-hidden className="text-3xl leading-none font-light">
              +
            </span>
            <span className="text-[15px] leading-tight font-bold" aria-live="polite">
              {preparing ?? (prints.length ? t("Neue Fotos") : t("Fotos wählen"))}
            </span>
          </button>
        </OnTable>
      </ul>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const el = e.currentTarget;
          const fs = [...(el.files ?? [])];
          // erst leeren, wenn alles gelesen ist: Safari gibt die gewählten Dateien sonst schon frei
          if (fs.length) open(fs).finally(() => (el.value = ""));
        }}
      />
      {prints.length > 0 && (
        <p className="text-on-table-2 mt-2 text-[13px]">
          {t("Ein Abzug öffnet das Foto wieder, ein Stapel die ganze Serie, so wie du sie bearbeitet hast. Nichts davon wird hochgeladen.")}
        </p>
      )}
      {error && (
        <p role="alert" className="text-on-table text-sm">
          {error}
        </p>
      )}

      {camera && <Camera uid={user.uid} onShot={onShot} onClose={closeCamera} />}
      {editing && (
        <StudioEditor
          prints={editing}
          uid={user.uid}
          note={openNote}
          onClose={() => {
            setEditing(null);
            setOpenNote(null);
          }}
          onFinish={(edits) => {
            const at = Date.now();
            const ps = editing.map((p) => ({ ...p, edit: edits[p.id] ?? p.edit, at }));
            keep(ps);
            setEditing(null);
            setOpenNote(null);
            setDone(ps);
          }}
        />
      )}
      {done && (
        <DoneSheet
          key={`${done[0].id}-${done[0].at}`}
          prints={done}
          user={user}
          books={books}
          onClose={() => setDone(null)}
          onShots={(shots) => keep(done.filter((p) => shots[p.id]).map((p) => ({ ...p, shot: shots[p.id] })))}
          onEdit={() => {
            setDone(null);
            setEditing(done);
          }}
          onRemove={() => {
            setPrints((list) => list.filter((x) => !done.some((p) => p.id === x.id)));
            for (const p of done) removePrint(p.id).catch(() => {});
            setDone(null);
          }}
        />
      )}
    </section>
  );
}

function PrintTile({ print, i, onOpen }: { print: Print; i: number; onOpen: () => void }) {
  const blobs = useMemo(() => ({ img: print.shot ?? print.thumb }), [print.shot, print.thumb]);
  const { img } = useBlobUrls(blobs);
  const [pw, ph] = outSize(print.edit?.geo, print.w, print.h);
  const land = pw >= ph;
  const t = useT();
  return (
    <OnTable i={i} tilt={TILT[i % TILT.length]} className="-ml-5 md:-ml-6">
      <button type="button" onClick={onOpen} className="studio-sheet" aria-label={t("{name}, {when} bearbeitet. Öffnen", { name: print.name, when: when(print.at) })}>
        <span className="studio-paper">
          {/* eslint-disable-next-line @next/next/no-img-element -- Blob vom Gerät, kein Bild für next/image */}
          {img && <img src={img} alt="" draggable={false} className={`block object-cover ${land ? "h-[96px] w-[132px] md:h-[112px] md:w-[156px]" : "h-[132px] w-[96px] md:h-[156px] md:w-[112px]"}`} />}
          <span aria-hidden className="studio-sheen" />
        </span>
      </button>
    </OnTable>
  );
}

/** Fotopapier mit dem Abzug eines Fotos, quer oder hoch wie sein Zuschnitt */
function Paper({ print, className = "", children }: { print: Print; className?: string; children?: ReactNode }) {
  const blobs = useMemo(() => ({ img: print.shot ?? print.thumb }), [print.shot, print.thumb]);
  const { img } = useBlobUrls(blobs);
  const [pw, ph] = outSize(print.edit?.geo, print.w, print.h);
  const land = pw >= ph;
  return (
    <span className={`studio-paper ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Blob vom Gerät, kein Bild für next/image */}
      {img && <img src={img} alt="" draggable={false} className={`block object-cover ${land ? "h-[96px] w-[132px] md:h-[112px] md:w-[156px]" : "h-[132px] w-[96px] md:h-[156px] md:w-[112px]"}`} />}
      {children}
    </span>
  );
}

/** Ein Stapel auf dem Pult: oben der erste Abzug, darunter zwei weitere, die sich beim Anheben auffächern */
function StackTile({ pile, i, onOpen }: { pile: Print[]; i: number; onOpen: () => void }) {
  const t = useT();
  return (
    <OnTable i={i} tilt={TILT[i % TILT.length]} className="-ml-5 md:-ml-6">
      <button type="button" onClick={onOpen} className="studio-sheet" aria-label={t("Stapel mit {n} Fotos, {when} bearbeitet. Öffnen", { n: numberWord(pile.length).toLowerCase(), when: when(pile[0].at) })}>
        {pile.slice(1, 3).map((p, j) => (
          <span key={p.id} aria-hidden className="studio-fan absolute inset-0 grid place-items-end" style={{ ["--f" as string]: j ? -1 : 1 } as CSSProperties}>
            <Paper print={p} className="shadow-[1px_2px_4px_rgb(12_10_8/0.35)]" />
          </span>
        ))}
        <Paper print={pile[0]}>
          <span aria-hidden className="studio-sheen" />
        </Paper>
        <span aria-hidden className="bg-cloth text-cloth-ink absolute -top-2.5 -right-2.5 z-[1] grid h-7 min-w-7 place-items-center rounded-full px-2 text-[13px] font-bold tabular-nums shadow-[0_2px_6px_rgb(12_10_8/0.45)]">
          {pile.length}
        </span>
      </button>
    </OnTable>
  );
}

const still = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Etwas, das auf dem Tisch liegt: Schatten bleibt liegen, das Blatt darüber hebt sich beim Zeigen (Maus) oder Drücken (Finger)
 * und kippt zur Hand hin. Die Neigung läuft über CSS-Variablen am Element, nicht über React, damit nichts neu rendert.
 */
function OnTable({ i, tilt, className = "", children }: { i: number; tilt: number; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLLIElement>(null);
  const set = (rx: number, ry: number) => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", `${rx}deg`);
    el.style.setProperty("--ry", `${ry}deg`);
    el.style.setProperty("--gx", `${-ry * 2.4}px`);
    el.style.setProperty("--gy", `${rx * 2.4}px`);
  };
  const lift = (on: boolean) => {
    const el = ref.current;
    if (!el || still()) return;
    if (on) el.dataset.lift = "";
    else {
      delete el.dataset.lift;
      delete el.dataset.move;
      set(0, 0);
    }
  };
  const lean = (e: ReactPointerEvent) => {
    const el = ref.current;
    if (!el || still() || !("lift" in el.dataset)) return;
    const r = el.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    el.dataset.move = "";
    // die Seite unter der Hand sinkt ein wenig, wie ein Blatt, das man antippt
    set(ny * 9, nx * -9);
  };
  return (
    <li
      ref={ref}
      className={`studio-slot deal ${className}`}
      style={{ rotate: `${tilt}deg`, zIndex: MAX_PRINTS + 1 - i, ["--d" as string]: i } as CSSProperties}
      onPointerEnter={(e) => e.pointerType === "mouse" && lift(true)}
      onPointerDown={(e) => e.pointerType !== "mouse" && lift(true)}
      onPointerMove={lean}
      onPointerLeave={() => lift(false)}
      onPointerUp={(e) => e.pointerType !== "mouse" && lift(false)}
      onPointerCancel={() => lift(false)}
      onFocus={() => lift(true)}
      onBlur={() => lift(false)}
    >
      <span aria-hidden className="studio-shadow" />
      <span aria-hidden className="studio-shadow-lift" />
      {children}
    </li>
  );
}

/** Der Editor der Werkbank für Fotos vom Gerät: Vorschau aus der Seitengröße, eingerechnet wird später aus der Arbeitsfassung */
function StudioEditor({ prints, uid, note, onClose, onFinish }: { prints: Print[]; uid: string; note?: string | null; onClose: () => void; onFinish: (e: Record<string, PhotoEdit>) => void }) {
  // Seitengröße und Abzug genügen der Vorschau; die Arbeitsfassung (4096 px) bleibt als Blob, bis gerechnet wird
  const blobs = useMemo(() => Object.fromEntries(prints.flatMap((p) => [[`${p.id}:page`, p.page], [`${p.id}:thumb`, p.thumb]])), [prints]);
  const urls = useBlobUrls(blobs);
  const t = useT();
  const [photos] = useState<StoredPhoto[]>(() =>
    prints.map((p) => ({
      key: p.id,
      title: prints.length > 1 ? "" : p.name,
      alt: "",
      w: p.w,
      h: p.h,
      src: urls[`${p.id}:page`]!,
      large: urls[`${p.id}:page`]!,
      thumb: urls[`${p.id}:thumb`]!,
      color: [0, 0, 0],
      edit: p.edit,
      // Rezept aus der Datei: im Bearbeiten lässt es sich kopieren
      recipe: p.meta?.recipe,
      camera: p.meta?.camera,
    })),
  );
  return <DevelopDialog photos={photos} start={prints[0].id} uid={uid} title={prints.length > 1 ? t("{n} Fotos", { n: prints.length }) : t("Fotostudio")} long={STUDIO_LONG} note={note} onFinish={onFinish} onClose={onClose} />;
}

/** „Kalkwand · Licht +0,3“: was am Foto gemacht ist, kurz */
function summary(e: PhotoEdit | undefined) {
  if (!e || isNeutral(e)) return t("Unbearbeitet");
  // describeEdit liefert die Bezeichnungen schon übersetzt, verglichen wird deshalb mit t()
  const rows = describeEdit(e);
  const lead = [t("Vorschlag"), t("Rezept"), "Look"];
  const head = rows.filter((r) => lead.includes(r.label)).map((r) => r.value);
  const skip = [...lead, t("Filmlook"), t("Weißabgleich"), t("Dynamikbereich"), t("Lichter / Schatten"), t("Farbe"), t("Color Chrome / FX Blau"), t("Körnung")];
  const fine = rows.filter((r) => !skip.includes(r.label));
  return [...head, ...fine.map((r) => (r.label === t("Zuschnitt") ? r.value : `${r.label} ${r.value}`))].slice(0, 3).join(" · ");
}

const coarse = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

/** „Für die Datei schärfen“ gilt fürs Gerät, nicht pro Foto: es hängt an der Größe der Datei, nicht am Bild */
const SHARPEN_KEY = "calima-studio-sharpen";
const SHARPEN_OPTS: { value: `${SharpenLevel}`; label: string }[] = [
  { value: "0", label: de("Aus") },
  { value: "1", label: de("Leicht") },
  { value: "2", label: de("Stark") },
];
const savedSharpen = (): SharpenLevel => {
  try {
    const v = Number(localStorage.getItem(SHARPEN_KEY));
    return v === 1 || v === 2 ? v : 0;
  } catch {
    return 0;
  }
};

/**
 * Blatt nach „Fertig“: rechnet beim Öffnen die Dateien (4096 px, Aufnahmedaten ohne Ort), bei einem Stapel nacheinander.
 * Das Teilen-Blatt von iOS öffnet sich nur direkt auf einen Tipp, deshalb wird vorher gerechnet und der Knopf erst dann aktiv.
 */
function DoneSheet({
  prints,
  user,
  books,
  onClose,
  onShots,
  onEdit,
  onRemove,
}: {
  prints: Print[];
  user: User;
  books: StoredBook[] | null;
  onClose: () => void;
  onShots: (shots: Record<string, Blob>) => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const router = useRouter();
  const t = useT();
  const many = prints.length > 1;
  const [files, setFiles] = useState<File[]>([]);
  const [zip, setZip] = useState<Blob | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [view, setView] = useState<"main" | "books">("main");
  const [busy, setBusy] = useState<string | null>(null);
  const [bookError, setBookError] = useState<string | null>(null);
  const [touch] = useState(coarse);
  // die eben eingerechnete Fassung des ersten Fotos; bis dahin das Foto ohne Bearbeitung
  const [shot, setShot] = useState<Blob | null>(null);
  const [sharpen, setSharpen] = useState<SharpenLevel>(savedSharpen);
  const first = prints[0];
  const shotsRef = useRef(onShots);
  useEffect(() => {
    shotsRef.current = onShots;
  });
  const ready = files.length === prints.length;

  useEffect(() => {
    let live = true;
    const shots: Record<string, Blob> = {};
    (async () => {
      const out: File[] = [];
      // nacheinander: jedes Foto braucht in voller Größe viel Speicher
      for (const p of prints) {
        const url = URL.createObjectURL(p.work);
        const e = p.edit ?? neutralEdit();
        try {
          const baked = await bakePhoto({
            url,
            lut: buildLut(e, N),
            n: N,
            rec: e.rec,
            geo: e.geo,
            vignette: e.more?.vignette,
            clarity: e.more?.clarity,
            sharpen,
            sizes: { large: STUDIO_LONG, page: SIZES.page, thumb: SIZES.thumb },
            quality: 0.92,
            maxBytes: 40 * 1024 * 1024,
          });
          let jpeg = await withExif(baked.blobs.large, p.meta.exif);
          // der Look fährt als Rezept in der Datei mit: wer sie öffnet, sieht ihn auf dem Rezeptzettel
          const own = fromEdit(e, e.recName);
          if (own) jpeg = await withXmp(jpeg, calimaXmp(own));
          if (!live) return;
          out.push(new File([jpeg], `${p.name}-calima.jpg`, { type: "image/jpeg", lastModified: Date.now() }));
          shots[p.id] = baked.blobs.thumb;
          if (p === first) setShot(baked.blobs.thumb);
          setFiles([...out]);
        } finally {
          URL.revokeObjectURL(url);
        }
      }
      shotsRef.current(shots);
      // am Rechner wird ein Stapel eine ZIP-Datei, damit der Browser nicht für jedes Foto fragt
      if (many && !IS_APP && !touch) {
        const z = await zipFiles(out);
        if (live) setZip(z);
      }
    })().catch((err) => live && setFailed(err instanceof Error ? err.message : String(err)));
    return () => {
      live = false;
    };
  }, [prints, first, many, touch, attempt, sharpen]);
  const restart = () => {
    setFiles([]);
    setZip(null);
    setFailed(null);
  };
  const pickSharpen = (v: SharpenLevel) => {
    setSharpen(v);
    // neu rechnen; bis dahin sind die alten Dateien nicht mehr die gewählten
    restart();
    try {
      localStorage.setItem(SHARPEN_KEY, String(v));
    } catch {
      // privates Fenster: gilt dann nur jetzt
    }
  };

  const blobs = useMemo(() => ({ img: shot ?? first.thumb }), [shot, first.thumb]);
  const { img } = useBlobUrls(blobs);

  const share = ready && touch && typeof navigator.canShare === "function" && navigator.canShare({ files });
  const download = (b: Blob, name: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
  };
  const downloadAll = () => {
    if (zip) download(zip, `Calima ${t("{n} Fotos", { n: prints.length })}.zip`);
    else for (const f of files) download(f, f.name);
  };
  const canSave = ready && (!many || IS_APP || touch || !!zip);
  const save = () => {
    if (!canSave) return;
    // in der App: Dateien ins Teilen-Blatt, dort „Bild sichern“; einen Download gibt es dort nicht
    if (IS_APP) {
      const done = (r: ShareResult) => {
        if (r === "shared") haptic("success");
        else if (r === "failed") notify(many ? t("Die Dateien ließen sich nicht sichern. Versuch es bitte noch einmal.") : t("Die Datei ließ sich nicht sichern. Versuch es bitte noch einmal."));
      };
      if (many) saveFilesInApp(files).then(done);
      else saveFile(safeFileName(files[0].name.replace(/\.jpe?g$/i, ""), ".jpg"), files[0], files[0].type).then(done);
    } else if (share)
      // muss direkt im Tipp laufen, sonst lehnt Safari ab
      navigator.share({ files }).then(
        () => haptic("success"),
        (e) => e?.name !== "AbortError" && downloadAll(),
      );
    else {
      downloadAll();
      haptic("success");
      notify(touch ? t("Gesichert.") : t("Liegt in deinen Downloads."));
    }
  };

  const shelve = async (target: StoredBook | null) => {
    setBookError(null);
    const into = target ? `„${target.title || t("Ohne Titel")}“` : t("ein neues Buch");
    setBusy(many ? t("Lege Foto {i} von {n} in {into} …", { i: 1, n: prints.length, into }) : target ? t("Lege das Foto in {into} …", { into }) : t("Lege ein neues Buch an …"));
    try {
      const { ingest } = await import("@/lib/ingest");
      const bookId = target?.id ?? newId();
      const photos: StoredPhoto[] = [];
      for (const [i, p] of prints.entries()) {
        if (many) setBusy(t("Lege Foto {i} von {n} in {into} …", { i: i + 1, n: prints.length, into }));
        const key = newId().slice(0, 10);
        const edit = p.edit;
        // das unbearbeitete Foto wird zum Original im Buch, die Bearbeitung liegt darüber: auf der Werkbank bleibt sie änderbar
        const ph = await ingest(new File([p.work], `${p.name}.jpg`, { type: "image/jpeg" }), key, p.meta);
        const urls = await uploadPhoto(user.uid, bookId, ph);
        let photo: StoredPhoto = {
          key,
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
        };
        if (edit && !isNeutral(edit)) {
          const local = URL.createObjectURL(ph.blobs.large);
          try {
            const out = await bakePhoto({ url: local, lut: buildLut(edit, N), n: N, rec: edit.rec, geo: edit.geo, vignette: edit.more?.vignette, clarity: edit.more?.clarity });
            const urls = await uploadEdited(user.uid, bookId, key, out.blobs);
            photo = { ...photo, ...editedPatch(photo, edit, { urls, color: out.color }) };
          } finally {
            URL.revokeObjectURL(local);
          }
        }
        photos.push(photo);
      }
      if (target) {
        // frisch laden: auf einem anderen Gerät kann sich das Buch seitdem geändert haben
        const fresh = (await loadBook(target.id)) ?? target;
        await saveBook({ ...fresh, photos: [...fresh.photos, ...photos.map((p) => ({ ...p, shelved: true }))] });
      } else {
        const auto = autoPhotos(photos);
        const { spreads, coverKey } = relayoutFree([], auto, new Set());
        await saveBook({
          schema: SCHEMA,
          id: bookId,
          owner: user.uid,
          ownerName: user.displayName ?? "Ich",
          title: "",
          subtitle: "",
          cloth: "ringelblume",
          aspect: aspectFor(photos),
          coverKey: coverKey || pickCover(auto) || photos[0].key,
          photos,
          spreads,
        });
      }
      haptic("success");
      const name = target?.title || t("Ohne Titel");
      const words = numberWord(prints.length).toLowerCase();
      notify(
        target
          ? many
            ? t("Die {n} Fotos liegen in der Ablage von „{name}“.", { n: words, name })
            : t("Liegt in der Ablage von „{name}“.", { name })
          : many
            ? t("Neues Buch mit {n} Fotos angelegt.", { n: words })
            : t("Neues Buch mit diesem Foto angelegt."),
        {
          duration: 8000,
          action: { label: t("Öffnen"), onClick: () => router.push(`/neu?id=${bookId}`) },
        },
      );
      onClose();
    } catch (e) {
      setBookError(t("Hat nicht geklappt. Prüf die Verbindung und tipp noch einmal. ({error})", { error: friendlyError(e) }));
    } finally {
      setBusy(null);
    }
  };

  const own = (books ?? []).filter((b) => !b.trashed);
  const coverOf = (b: StoredBook) => (b.photos.find((p) => p.key === b.coverKey) ?? b.photos.find((p) => !p.shelved))?.thumb;
  const title = many ? t("{n} Fotos fertig", { n: numberWord(prints.length) }) : t("Fertig bearbeitet");
  const label =
    !canSave && !failed
      ? many
        ? t("Rechne {i} von {n} …", { i: Math.min(files.length + 1, prints.length), n: prints.length })
        : t("Wird vorbereitet …")
      : IS_APP || share || touch
        ? many
          ? t("Alle {n} in Fotos sichern …", { n: prints.length })
          : t("In Fotos sichern …")
        : many
          ? t("Alle herunterladen")
          : t("Herunterladen");

  return (
    <MountedSheet title={view === "main" ? title : t("In welches Buch?")} hideTitle={view === "main"} onClose={onClose} locked={!!busy}>
      {(close) =>
        view === "main" ? (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
            <div className="flex items-center gap-3.5">
              <span className="relative flex-none">
                {many && <span aria-hidden className="bg-paper-shade absolute inset-0 rotate-[5deg] shadow-[1px_2px_3px_rgb(58_39_6/0.3)]" />}
                {/* eslint-disable-next-line @next/next/no-img-element -- Blob vom Gerät */}
                {img && <img src={img} alt="" className="relative h-[68px] w-auto max-w-[96px] object-cover shadow-[1px_2px_3px_rgb(58_39_6/0.35)]" />}
              </span>
              <div className="min-w-0">
                <p className="text-xl font-bold tracking-[-0.02em] first-letter:uppercase" style={{ fontVariationSettings: '"wdth" 82' }}>
                  {title}
                </p>
                <p className="text-ink-2 truncate text-sm">{summary(first.edit)}</p>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Button variant="cloth" onClick={save} disabled={!canSave} className="w-full">
                {label}
              </Button>
              {many && !canSave && !failed && (
                <span aria-hidden className="bg-ink/10 block h-1 overflow-hidden rounded-full">
                  <span className="bg-cloth-deep block h-full transition-[width] duration-300" style={{ width: `${(files.length / prints.length) * 100}%` }} />
                </span>
              )}
              <p className="text-ink-2 text-center text-[13px]" aria-live="polite">
                {failed
                  ? many
                    ? t("Die Dateien ließen sich nicht rechnen.")
                    : t("Die Datei ließ sich nicht rechnen.")
                  : IS_APP || share
                    ? many
                      ? t("Im nächsten Fenster „{n} Bilder sichern“ wählen. Ohne Ortsangabe.", { n: prints.length })
                      : t("Im nächsten Fenster „Bild sichern“ wählen. Ohne Ortsangabe.")
                    : many && !touch
                      ? t("Eine ZIP-Datei mit {n} JPEGs, {px} px, ohne Ortsangabe.", { n: prints.length, px: STUDIO_LONG })
                      : t("JPEG, {px} px, ohne Ortsangabe.", { px: STUDIO_LONG })}
              </p>
              {failed && (
                <Button
                  variant="paper"
                  size="sm"
                  className="justify-self-center"
                  onClick={() => {
                    restart();
                    setAttempt((n) => n + 1);
                  }}
                >
                  {t("Noch einmal versuchen")}
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <span aria-hidden className="text-[15px] font-semibold">
                {t("Für die Datei schärfen")}
              </span>
              <Segmented
                label={t("Für die Datei schärfen")}
                tone="paper"
                options={SHARPEN_OPTS.map((o) => ({ ...o, label: t(o.label) }))} value={`${sharpen}`} onChange={(v) => pickSharpen(Number(v) as SharpenLevel)} />
            </div>
            <ListGroup paper>
              <ListRow paper lead={<BookPlus aria-hidden />} title={many ? t("Alle in ein Buch legen …") : t("In ein Buch legen …")} onClick={() => setView("books")} />
              <ListRow paper lead={<Pencil aria-hidden />} title={t("Weiter bearbeiten")} onClick={() => close(onEdit)} />
              <ListRow paper danger lead={<Trash2 aria-hidden />} title={many ? t("Stapel vom Pult nehmen") : t("Vom Pult nehmen")} onClick={() => close(onRemove)} />
            </ListGroup>
          </div>
        ) : (
          <div className="grid gap-3">
            <Button size="sm" variant="paper" className="justify-self-start pl-2" onClick={() => setView("main")} disabled={!!busy}>
              <ChevronLeft aria-hidden />
              {t("Zurück")}
            </Button>
            <p className="text-ink-2 text-sm">
              {many ? t("Die {n} Fotos kommen in die Ablage.", { n: numberWord(prints.length).toLowerCase() }) : t("Das Foto kommt in die Ablage.")} {t("Deine Seiten bleiben, wie sie sind.")}
            </p>
            <ListGroup paper label={t("Deine Bücher")}>
              {own.map((b) => {
                const thumb = coverOf(b);
                return (
                  <ListRow
                    key={b.id}
                    paper
                    lead={
                      thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element -- Einband-Miniatur aus dem eigenen Speicher
                        <img src={thumb} alt="" className="h-10 w-[30px] object-cover" />
                      ) : (
                        <span className="bg-paper-shade block h-10 w-[30px]" />
                      )
                    }
                    title={b.title || t("Ohne Titel")}
                    detail={b.photos.length === 1 ? t("1 Foto") : t("{n} Fotos", { n: b.photos.length })}
                    onClick={busy ? undefined : () => shelve(b)}
                  />
                );
              })}
              <ListRow paper lead={<BookPlus aria-hidden />} title={many ? t("Neues Buch mit diesen Fotos") : t("Neues Buch mit diesem Foto")} onClick={busy ? undefined : () => shelve(null)} />
            </ListGroup>
            <p className="text-ink-2 min-h-5 text-[13px]" aria-live="polite">
              {busy ?? bookError}
            </p>
          </div>
        )
      }
    </MountedSheet>
  );
}
