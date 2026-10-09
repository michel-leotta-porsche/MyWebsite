"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

import { BookPlus, ChevronLeft, Pencil, Trash2 } from "lucide-react";

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
import { withExif } from "@/lib/exif-write";
import { haptic } from "@/lib/haptics";
import { SIZES, STUDIO_LONG } from "@/lib/ingest";
import { autoPhotos, editedPatch, loadBook, newId, numberWord, saveBook, SCHEMA, uploadEdited, uploadPhoto, type StoredBook, type StoredPhoto } from "@/lib/store";
import { listPrints, MAX_PRINTS, putPrint, removePrint, type Print } from "@/lib/studio-store";

// Fotostudio unten im Bücherzimmer (Workshop 9.10.2026, fotostudio-workshop/): ein Foto öffnen, mit dem Editor der Werkbank
// bearbeiten, dann sichern oder in ein Buch legen. Bis dahin bleibt alles auf dem Gerät. Die letzten Fotos liegen als Abzüge
// auf dem Pult und lassen sich wieder öffnen.

// der Editor ist groß und wird erst geladen, wenn jemand ein Foto öffnet
const DevelopDialog = dynamic(() => import("@/components/develop-dialog").then((m) => m.DevelopDialog), { ssr: false });

/** größer ist keine Fotodatei, sondern etwas, das beim Entpacken den Speicher sprengt */
const MAX_FILE = 60 * 1024 * 1024;
const ACCEPT = "image/*,.heic,.heif,.dng";
const N = 33;

const abzuege = (n: number) => (n === 1 ? "Ein Abzug" : `${numberWord(n)} Abzüge`);
const stem = (name: string) => name.replace(/\.[^.]+$/, "").slice(0, 60) || "Foto";
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const when = (at: number) => {
  const d = new Date(at);
  const now = new Date();
  if (sameDay(d, now)) return "heute";
  if (sameDay(d, new Date(now.getTime() - 864e5))) return "gestern";
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
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
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Print | null>(null);
  const [done, setDone] = useState<Print | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listPrints()
      .then((p) => setPrints(p.slice(0, MAX_PRINTS)))
      .catch(() => {});
  }, []);

  // ohne IndexedDB (privates Fenster) hält das Studio den Abzug nur, solange die Seite offen ist
  const keep = (p: Print) => {
    setPrints((list) => [p, ...list.filter((x) => x.id !== p.id)].slice(0, MAX_PRINTS));
    putPrint(p).catch(() => {});
  };

  const open = async (file: File) => {
    setError(null);
    if (file.size > MAX_FILE) return setError("Die Datei ist zu groß. Fotos bis 60 MB lassen sich öffnen.");
    setPreparing(true);
    try {
      const { studioSource } = await import("@/lib/ingest");
      const s = await studioSource(file);
      const p: Print = { id: newId(), name: stem(file.name), at: Date.now(), w: s.w, h: s.h, work: s.work, page: s.page, thumb: s.thumb, meta: s.meta };
      keep(p);
      setEditing(p);
    } catch (e) {
      setError(e instanceof Error && /format|DNG/i.test(e.message) ? `Dieses Foto lässt sich nicht öffnen: ${e.message}.` : "Dieses Foto lässt sich nicht öffnen.");
    } finally {
      setPreparing(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const f = [...e.dataTransfer.files].find((x) => x.type.startsWith("image/") || /\.(heic|heif|dng)$/i.test(x.name));
    if (f) open(f);
  };

  const sub = prints.length ? `${abzuege(prints.length)} · zuletzt ${when(prints[0].at)}` : "Ein Foto bearbeiten, sichern oder in ein Buch legen.";

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
          Fotostudio
        </h2>
        <p className="text-on-table-2 text-sm">{sub}</p>
      </div>

      <ul className="flex flex-wrap items-end gap-y-7 pt-2 pl-7 md:pl-8" aria-label="Abzüge">
        {prints.map((p, i) => (
          <PrintTile key={p.id} print={p} i={i} onOpen={() => setEditing(p)} />
        ))}
        <OnTable i={prints.length} tilt={2} className={prints.length ? "ml-4" : "-ml-5 md:-ml-6"}>
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={preparing}
            className="studio-sheet linen bg-paper-shade text-cloth-ink/70 grid h-[132px] w-[104px] content-between p-3 text-left disabled:opacity-70 md:h-[156px] md:w-[124px]"
            aria-describedby="studio-h"
          >
            <span aria-hidden className="text-3xl leading-none font-light">
              +
            </span>
            <span className="text-[15px] leading-tight font-bold" aria-live="polite">
              {preparing ? "Wird geöffnet …" : prints.length ? "Neues Foto" : "Foto wählen"}
            </span>
          </button>
        </OnTable>
      </ul>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) open(f);
        }}
      />
      {prints.length > 0 && <p className="text-on-table-2 mt-2 text-[13px]">Ein Abzug öffnet das Foto wieder, so wie du es bearbeitet hast. Nichts davon wird hochgeladen.</p>}
      {error && (
        <p role="alert" className="text-on-table text-sm">
          {error}
        </p>
      )}

      {editing && (
        <StudioEditor
          print={editing}
          uid={user.uid}
          onClose={() => setEditing(null)}
          onFinish={(edit) => {
            const p = { ...editing, edit, at: Date.now() };
            keep(p);
            setEditing(null);
            setDone(p);
          }}
        />
      )}
      {done && (
        <DoneSheet
          key={`${done.id}-${done.at}`}
          print={done}
          user={user}
          books={books}
          onClose={() => setDone(null)}
          onShot={(shot) => keep({ ...done, shot })}
          onEdit={() => {
            setDone(null);
            setEditing(done);
          }}
          onRemove={() => {
            setPrints((list) => list.filter((x) => x.id !== done.id));
            removePrint(done.id).catch(() => {});
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
  return (
    <OnTable i={i} tilt={TILT[i % TILT.length]} className="-ml-5 md:-ml-6">
      <button type="button" onClick={onOpen} className="studio-sheet" aria-label={`${print.name}, ${when(print.at)} bearbeitet. Öffnen`}>
        <span className="studio-paper">
          {/* eslint-disable-next-line @next/next/no-img-element -- Blob vom Gerät, kein Bild für next/image */}
          {img && <img src={img} alt="" draggable={false} className={`block object-cover ${land ? "h-[96px] w-[132px] md:h-[112px] md:w-[156px]" : "h-[132px] w-[96px] md:h-[156px] md:w-[112px]"}`} />}
          <span aria-hidden className="studio-sheen" />
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

/** Der Editor der Werkbank für ein Foto vom Gerät: Vorschau aus der Seitengröße, eingerechnet wird später aus der Arbeitsfassung */
function StudioEditor({ print, uid, onClose, onFinish }: { print: Print; uid: string; onClose: () => void; onFinish: (e: PhotoEdit) => void }) {
  const blobs = useMemo(() => ({ work: print.work, page: print.page, thumb: print.thumb }), [print.work, print.page, print.thumb]);
  const urls = useBlobUrls(blobs);
  const photo: StoredPhoto = {
    key: print.id,
    title: print.name,
    alt: "",
    w: print.w,
    h: print.h,
    src: urls.page!,
    large: urls.work!,
    thumb: urls.thumb!,
    color: [0, 0, 0],
    edit: print.edit,
  };
  return <DevelopDialog photos={[photo]} start={print.id} uid={uid} title="Fotostudio" long={STUDIO_LONG} onFinish={onFinish} onClose={onClose} />;
}

/** „Kalkwand · Licht +0,3“: was am Foto gemacht ist, kurz */
function summary(e: PhotoEdit | undefined) {
  if (!e || isNeutral(e)) return "Unbearbeitet";
  const rows = describeEdit(e);
  const head = rows.filter((r) => r.label === "Vorschlag" || r.label === "Rezept" || r.label === "Look").map((r) => r.value);
  const fine = rows.filter((r) => !["Vorschlag", "Rezept", "Look", "Filmlook", "Weißabgleich", "Dynamikbereich", "Lichter / Schatten", "Farbe", "Color Chrome / FX Blau", "Körnung"].includes(r.label));
  return [...head, ...fine.map((r) => (r.label === "Zuschnitt" ? r.value : `${r.label} ${r.value}`))].slice(0, 3).join(" · ");
}

const coarse = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

/** „Für die Datei schärfen“ gilt fürs Gerät, nicht pro Foto: es hängt an der Größe der Datei, nicht am Bild */
const SHARPEN_KEY = "calima-studio-sharpen";
const SHARPEN_OPTS: { value: `${SharpenLevel}`; label: string }[] = [
  { value: "0", label: "Aus" },
  { value: "1", label: "Leicht" },
  { value: "2", label: "Stark" },
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
 * Blatt nach „Fertig“: rechnet beim Öffnen die Datei (4096 px, Aufnahmedaten ohne Ort). Das Teilen-Blatt von iOS
 * öffnet sich nur direkt auf einen Tipp, deshalb wird vorher gerechnet und der Knopf erst dann aktiv.
 */
function DoneSheet({
  print,
  user,
  books,
  onClose,
  onShot,
  onEdit,
  onRemove,
}: {
  print: Print;
  user: User;
  books: StoredBook[] | null;
  onClose: () => void;
  onShot: (b: Blob) => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [view, setView] = useState<"main" | "books">("main");
  const [busy, setBusy] = useState<string | null>(null);
  const [bookError, setBookError] = useState<string | null>(null);
  const [touch] = useState(coarse);
  // die eben eingerechnete Fassung; bis dahin das Foto ohne Bearbeitung
  const [shot, setShot] = useState<Blob | null>(null);
  const [sharpen, setSharpen] = useState<SharpenLevel>(savedSharpen);
  const edit = print.edit;
  const shotRef = useRef(onShot);
  useEffect(() => {
    shotRef.current = onShot;
  });

  useEffect(() => {
    let live = true;
    const url = URL.createObjectURL(print.work);
    const e = edit ?? neutralEdit();
    bakePhoto({
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
    })
      .then(async (out) => {
        const jpeg = await withExif(out.blobs.large, print.meta.exif);
        if (!live) return;
        setFile(new File([jpeg], `${print.name}-calima.jpg`, { type: "image/jpeg", lastModified: Date.now() }));
        setShot(out.blobs.thumb);
        shotRef.current(out.blobs.thumb);
      })
      .catch((err) => live && setFailed(err instanceof Error ? err.message : String(err)))
      .finally(() => URL.revokeObjectURL(url));
    return () => {
      live = false;
    };
  }, [print, edit, attempt, sharpen]);
  const pickSharpen = (v: SharpenLevel) => {
    setSharpen(v);
    // neu rechnen; bis dahin ist die alte Datei nicht mehr die gewählte
    setFile(null);
    setFailed(null);
    try {
      localStorage.setItem(SHARPEN_KEY, String(v));
    } catch {
      // privates Fenster: gilt dann nur jetzt
    }
  };

  const blobs = useMemo(() => ({ img: shot ?? print.thumb }), [shot, print.thumb]);
  const { img } = useBlobUrls(blobs);

  const share = !!file && touch && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
  const download = (f: File) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(f);
    a.download = f.name;
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
  };
  const save = () => {
    if (!file) return;
    if (share)
      // muss direkt im Tipp laufen, sonst lehnt Safari ab
      navigator.share({ files: [file] }).then(
        () => haptic("success"),
        (e) => e?.name !== "AbortError" && download(file),
      );
    else {
      download(file);
      haptic("success");
      notify(touch ? "Gesichert." : "Liegt in deinen Downloads.");
    }
  };

  const shelve = async (target: StoredBook | null) => {
    setBookError(null);
    setBusy(target ? `Lege das Foto in „${target.title || "Ohne Titel"}“ …` : "Lege ein neues Buch an …");
    try {
      const { ingest } = await import("@/lib/ingest");
      const bookId = target?.id ?? newId();
      const key = newId().slice(0, 10);
      // das unbearbeitete Foto wird zum Original im Buch, die Bearbeitung liegt darüber: auf der Werkbank bleibt sie änderbar
      const ph = await ingest(new File([print.work], `${print.name}.jpg`, { type: "image/jpeg" }), key, print.meta);
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
      if (target) {
        // frisch laden: auf einem anderen Gerät kann sich das Buch seitdem geändert haben
        const fresh = (await loadBook(target.id)) ?? target;
        await saveBook({ ...fresh, photos: [...fresh.photos, { ...photo, shelved: true }] });
      } else {
        const { spreads, coverKey } = relayoutFree([], autoPhotos([photo]), new Set());
        await saveBook({
          schema: SCHEMA,
          id: bookId,
          owner: user.uid,
          ownerName: user.displayName ?? "Ich",
          title: "",
          subtitle: "",
          cloth: "ringelblume",
          aspect: photo.h > photo.w ? 0.75 : 1.5,
          coverKey: coverKey || pickCover(autoPhotos([photo])) || key,
          photos: [photo],
          spreads,
        });
      }
      haptic("success");
      notify(target ? `Liegt in der Ablage von „${target.title || "Ohne Titel"}“.` : "Neues Buch mit diesem Foto angelegt.", {
        duration: 8000,
        action: { label: "Öffnen", onClick: () => router.push(`/neu?id=${bookId}`) },
      });
      onClose();
    } catch (e) {
      setBookError(`Hat nicht geklappt. Prüf die Verbindung und tipp noch einmal. (${friendlyError(e)})`);
    } finally {
      setBusy(null);
    }
  };

  const own = (books ?? []).filter((b) => !b.trashed);
  const coverOf = (b: StoredBook) => (b.photos.find((p) => p.key === b.coverKey) ?? b.photos.find((p) => !p.shelved))?.thumb;

  return (
    <MountedSheet title={view === "main" ? "Fertig bearbeitet" : "In welches Buch?"} hideTitle={view === "main"} onClose={onClose} locked={!!busy}>
      {(close) =>
        view === "main" ? (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
            <div className="flex items-center gap-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- Blob vom Gerät */}
              {img && <img src={img} alt="" className="h-[68px] w-auto max-w-[96px] flex-none object-cover shadow-[1px_2px_3px_rgb(58_39_6/0.35)]" />}
              <div className="min-w-0">
                <p className="text-xl font-bold tracking-[-0.02em]" style={{ fontVariationSettings: '"wdth" 82' }}>
                  Fertig bearbeitet
                </p>
                <p className="text-ink-2 truncate text-sm">{summary(edit)}</p>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Button variant="cloth" onClick={save} disabled={!file} className="w-full">
                {!file && !failed ? "Wird vorbereitet …" : share || touch ? "In Fotos sichern …" : "Herunterladen"}
              </Button>
              <p className="text-ink-2 text-center text-[13px]" aria-live="polite">
                {failed
                  ? "Die Datei ließ sich nicht rechnen."
                  : share
                    ? "Im nächsten Fenster „Bild sichern“ wählen. Ohne Ortsangabe."
                    : `JPEG, ${STUDIO_LONG} px, ohne Ortsangabe.`}
              </p>
              {failed && (
                <Button
                  variant="paper"
                  size="sm"
                  className="justify-self-center"
                  onClick={() => {
                    setFailed(null);
                    setAttempt((n) => n + 1);
                  }}
                >
                  Noch einmal versuchen
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <span aria-hidden className="text-[15px] font-semibold">
                Für die Datei schärfen
              </span>
              <Segmented label="Für die Datei schärfen" tone="paper" options={SHARPEN_OPTS} value={`${sharpen}`} onChange={(v) => pickSharpen(Number(v) as SharpenLevel)} />
            </div>
            <ListGroup paper>
              <ListRow paper lead={<BookPlus aria-hidden />} title="In ein Buch legen …" onClick={() => setView("books")} />
              <ListRow paper lead={<Pencil aria-hidden />} title="Weiter bearbeiten" onClick={() => close(onEdit)} />
              <ListRow paper danger lead={<Trash2 aria-hidden />} title="Vom Pult nehmen" onClick={() => close(onRemove)} />
            </ListGroup>
          </div>
        ) : (
          <div className="grid gap-3">
            <Button size="sm" variant="paper" className="justify-self-start pl-2" onClick={() => setView("main")} disabled={!!busy}>
              <ChevronLeft aria-hidden />
              Zurück
            </Button>
            <p className="text-ink-2 text-sm">Das Foto kommt in die Ablage. Deine Seiten bleiben, wie sie sind.</p>
            <ListGroup paper label="Deine Bücher">
              {own.map((b) => {
                const t = coverOf(b);
                return (
                  <ListRow
                    key={b.id}
                    paper
                    lead={
                      t ? (
                        // eslint-disable-next-line @next/next/no-img-element -- Einband-Miniatur aus dem eigenen Speicher
                        <img src={t} alt="" className="h-10 w-[30px] object-cover" />
                      ) : (
                        <span className="bg-paper-shade block h-10 w-[30px]" />
                      )
                    }
                    title={b.title || "Ohne Titel"}
                    detail={`${b.photos.length} ${b.photos.length === 1 ? "Foto" : "Fotos"}`}
                    onClick={busy ? undefined : () => shelve(b)}
                  />
                );
              })}
              <ListRow paper lead={<BookPlus aria-hidden />} title="Neues Buch mit diesem Foto" onClick={busy ? undefined : () => shelve(null)} />
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
