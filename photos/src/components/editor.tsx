"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { plateOf, type BookData } from "@/content/books";
import { FrameButton, inputClass, linkClass, SignInTable, TextButton, Wordmark } from "@/components/app-ui";
import { Book } from "@/components/book";
import { PageView } from "@/components/page-view";
import { ShareDialog } from "@/components/share-dialog";
import { autoSequence, variants } from "@/lib/auto-sequence";
import { ingest } from "@/lib/ingest";
import { autoPhotos, CLOTHS, loadBook, newId, saveBook, toBookData, uploadPhoto, type ClothId, type StoredBook, type StoredPhoto } from "@/lib/store";
import { useQueryParam } from "@/lib/use-query";
import { useUser } from "@/lib/use-user";
import { useWide } from "@/lib/use-wide";

// Buch gestalten in drei Schritten: Fotos reinziehen → automatisch gestalten → von Hand ändern.
// Gespeichert wird von selbst, kurz nach jeder Änderung.

type Pending = { key: string; name: string; state: "lesen" | "laden" | "fertig" | "fehler"; error?: string };

const MAX = 60;

/** Seitenformat nach den Fotos: iPhone-Hochformate 3:4, Kamera 2:3 */
function aspectFor(photos: StoredPhoto[]) {
  const portraits = photos.filter((p) => p.h > p.w).map((p) => p.h / p.w);
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
  const [selected, setSelected] = useState<string | null>(null);
  const [swapFrom, setSwapFrom] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [saved, setSaved] = useState<"gespeichert" | "speichert" | "fehler" | null>(null);
  const [touched, setTouched] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dropHint, setDropHint] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const bookRef = useRef<StoredBook | null>(null);
  useEffect(() => {
    bookRef.current = book;
  }, [book]);

  // vorhandenes Buch laden
  useEffect(() => {
    if (!user || !idParam || bookRef.current?.id === idParam) return;
    let alive = true;
    loadBook(idParam)
      .then((b) => alive && b && setLoaded(b))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [idParam, user]);

  // nach jeder Änderung speichern, sobald es Fotos gibt
  useEffect(() => {
    if (!book || !touched || !book.photos.length) return;
    const id = window.setTimeout(() => {
      saveBook(book)
        .then(() => {
          setSaved("gespeichert");
          if (!idParam) history.replaceState(null, "", `/neu?id=${book.id}`);
        })
        .catch(() => setSaved("fehler"));
    }, 900);
    return () => window.clearTimeout(id);
  }, [book, idParam, touched]);

  // Dateien irgendwo auf der Seite ablegen; nie die Datei im Browser öffnen
  const hasFiles = (e: DragEvent | React.DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
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
      if (!hasFiles(e)) return;
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
      if (!e.dataTransfer || !hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragOver(false);
      const files = filesOf(e.dataTransfer);
      if (files.length) {
        setDropHint(null);
        addRef.current(files);
      } else {
        // z. B. aus der Fotos-App am Mac: dort kommen keine Dateien im Browser an
        setDropHint("Diese Fotos kamen nicht als Dateien an. Aus der Fotos-App bitte erst in den Finder ziehen oder „Fotos auswählen“ nutzen.");
      }
    };
    window.addEventListener("dragover", over);
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, []);

  const update = useCallback(
    (f: (b: StoredBook) => StoredBook) => {
      setTouched(true);
      setSaved("speichert");
      setLoaded((b) => {
        const cur = b ?? blank;
        return cur ? f(cur) : b;
      });
    },
    [blank],
  );

  const relayout = useCallback(
    (b: StoredBook): StoredBook => {
      const { spreads, coverKey } = autoSequence(autoPhotos(b.photos));
      return { ...b, spreads, coverKey: b.coverKey && b.photos.some((p) => p.key === b.coverKey) ? b.coverKey : coverKey, aspect: aspectFor(b.photos) };
    },
    [],
  );

  // Fotos reinziehen: eins nach dem anderen lesen, kodieren, hochladen
  const addFiles = useCallback(
    async (files: File[]) => {
      const b = bookRef.current;
      if (!user || !b) return;
      const room = MAX - b.photos.length;
      const list = files.filter((f) => f.type.startsWith("image/") || /\.(jpe?g|heic|png)$/i.test(f.name)).slice(0, room);
      const items: Pending[] = list.map((f) => ({ key: newId().slice(0, 10), name: f.name, state: "lesen" }));
      setPending((p) => [...p, ...items]);
      const editedByHand = b.spreads.length > 0;
      for (let i = 0; i < list.length; i++) {
        const it = items[i];
        const mark = (state: Pending["state"], error?: string) =>
          setPending((p) => p.map((x) => (x.key === it.key ? { ...x, state, error } : x)));
        try {
          const ph = await ingest(list[i], it.key);
          mark("laden");
          const urls = await uploadPhoto(user.uid, b.id, ph);
          const stored: StoredPhoto = {
            key: ph.key,
            title: "",
            alt: "",
            w: ph.w,
            h: ph.h,
            src: urls.page,
            large: urls.large,
            thumb: urls.thumb,
            color: ph.color,
            taken: ph.taken,
            recipe: ph.recipe,
            camera: ph.camera,
          };
          update((cur) => {
            const photos = [...cur.photos, stored];
            // neue Fotos landen hinten, als eigene Doppelseiten; ein frisches Buch wird ganz neu gestaltet
            if (!editedByHand) return relayout({ ...cur, photos });
            return { ...cur, photos, spreads: [...cur.spreads, { keys: [stored.key], layout: 0 }] };
          });
          mark("fertig");
        } catch (e) {
          mark("fehler", e instanceof Error ? e.message : "Fehler");
        }
      }
      window.setTimeout(() => setPending((p) => p.filter((x) => x.state !== "fertig")), 1500);
    },
    [relayout, update, user],
  );

  useEffect(() => {
    addRef.current = addFiles;
  }, [addFiles]);

  const data: BookData | null = useMemo(() => {
    if (!book || !book.spreads.length) return null;
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
    return <Book book={data} mode={wide ? "spread" : "single"} autoOpen onClose={() => setPreview(false)} />;

  const byKey = new Map(book.photos.map((p) => [p.key, p]));
  const auto = new Map(autoPhotos(book.photos).map((p) => [p.key, p]));
  const sel = selected ? byKey.get(selected) : undefined;
  const pageW = wide ? 150 : 132;

  const pick = (key: string) => {
    if (swapFrom && swapFrom !== key) {
      // zwei Fotos tauschen ihre Plätze
      update((b) => ({
        ...b,
        spreads: b.spreads.map((s) => ({ ...s, keys: s.keys.map((k) => (k === swapFrom ? key : k === key ? swapFrom : k)) })),
      }));
      setSwapFrom(null);
      setSelected(key);
      return;
    }
    setSelected(key === selected ? null : key);
  };
  const move = (i: number, d: number) =>
    update((b) => {
      const s = [...b.spreads];
      const j = i + d;
      if (j < 0 || j >= s.length) return b;
      [s[i], s[j]] = [s[j], s[i]];
      return { ...b, spreads: s };
    });
  const cycle = (i: number) =>
    update((b) => ({
      ...b,
      spreads: b.spreads.map((s, n) => (n === i ? { ...s, layout: (s.layout + 1) % variants(s.keys, auto).length } : s)),
    }));
  const removePhoto = (key: string) =>
    update((b) => ({
      ...b,
      photos: b.photos.filter((p) => p.key !== key),
      spreads: b.spreads.map((s) => ({ keys: s.keys.filter((k) => k !== key), layout: 0 })).filter((s) => s.keys.length),
    }));
  const setPhoto = (key: string, patch: Partial<StoredPhoto>) =>
    update((b) => ({ ...b, photos: b.photos.map((p) => (p.key === key ? { ...p, ...patch } : p)) }));

  // Ziehen zum Umsortieren der Doppelseiten
  const onDrop = (to: number, e: React.DragEvent) => {
    if (hasFiles(e)) return;
    const raw = e.dataTransfer.getData("text/x-spread");
    const from = raw === "" ? NaN : Number(raw);
    if (Number.isNaN(from) || from === to) return;
    update((b) => {
      const s = [...b.spreads];
      const [m] = s.splice(from, 1);
      s.splice(to, 0, m);
      return { ...b, spreads: s };
    });
  };

  return (
    <main
      className="linen table-surface relative min-h-svh bg-table"
    >
      <header className="sticky top-0 z-30 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 bg-table/95 px-4 py-4 md:px-8">
        <span className="flex items-baseline gap-5">
          <Wordmark href="/tisch" />
          <Link href="/tisch" className={`${linkClass} text-sm`}>
            Zum Tisch
          </Link>
        </span>
        <span className="text-on-table-2 flex flex-wrap items-baseline gap-5 text-sm">
          <span aria-live="polite">{saved === "speichert" ? "Speichert …" : saved === "gespeichert" ? "Gespeichert" : saved === "fehler" ? "Speichern fehlgeschlagen" : ""}</span>
          <TextButton disabled={!data} onClick={() => setPreview(true)}>
            Ansehen
          </TextButton>
          <FrameButton disabled={!data || saved === "speichert"} onClick={() => setSharing(true)}>
            Hinlegen für …
          </FrameButton>
        </span>
      </header>

      <div className="grid gap-8 px-4 pb-24 md:grid-cols-[minmax(0,1fr)_320px] md:px-8">
        <section aria-label="Doppelseiten" className="min-w-0">
          {/* Schritt 1: Fotos */}
          <div
            className="border-on-table-2/50 flex flex-col items-start gap-3 border border-dashed p-6"
          >
            <p className="text-on-table text-lg font-semibold">
              {book.photos.length ? "Weitere Fotos hineinziehen" : "Fotos hier hineinziehen"}
            </p>
            <p className="text-on-table-2 max-w-[60ch] text-sm leading-relaxed">
              Originale direkt von der Kamera bringen ihr Fuji-Rezept mit, Lightroom-Exporte mit „Alle Metadaten“ ihre Einstellungen.
              Beim Hochladen werden die Fotos neu gespeichert, GPS und Seriennummer fallen weg. Bis zu {MAX} Fotos.
            </p>
            <TextButton onClick={() => fileInput.current?.click()}>Fotos auswählen</TextButton>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/heic,image/png"
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
              <ul className="text-on-table-2 w-full space-y-1 text-sm" aria-live="polite">
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

          {/* Schritt 2 und 3: Doppelseiten */}
          {data && (
            <>
              <div className="mt-8 flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-on-table text-lg font-semibold">
                  {book.spreads.length} Doppelseiten
                  {swapFrom && <span className="text-on-table-2 ml-3 text-sm font-normal">Wähle das Foto zum Tauschen</span>}
                </h2>
                <TextButton
                  onClick={() => {
                    if (touched && book.spreads.some((s) => s.layout) && !window.confirm("Alle Seiten neu gestalten? Deine Änderungen an der Folge gehen verloren.")) return;
                    update(relayout);
                  }}
                  className="text-sm"
                >
                  Automatisch gestalten
                </TextButton>
              </div>
              <ol className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-px bg-line/0">
                {book.spreads.map((s, i) => {
                  const spreadIndex = i + 1; // 0 ist die Titelseite
                  const sp = data.spreads[spreadIndex];
                  return (
                    <li
                      key={s.keys.join("+")}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/x-spread", String(i))}
                      onDragOver={(e) => Array.from(e.dataTransfer.types).includes("text/x-spread") && e.preventDefault()}
                      onDrop={(e) => onDrop(i, e)}
                      className="p-3"
                    >
                      <div className="text-on-table-2 mb-2 flex items-baseline justify-between text-xs">
                        <span>Doppelseite {i + 1}</span>
                        <span className="flex gap-3">
                          <TextButton onClick={() => cycle(i)} aria-label={`Layout von Doppelseite ${i + 1} wechseln`}>
                            Layout
                          </TextButton>
                          <TextButton onClick={() => move(i, -1)} disabled={i === 0} aria-label="Nach vorn">
                            ←
                          </TextButton>
                          <TextButton onClick={() => move(i, 1)} disabled={i === book.spreads.length - 1} aria-label="Nach hinten">
                            →
                          </TextButton>
                        </span>
                      </div>
                      <div className="flex cursor-grab justify-center shadow-[0_12px_24px_-12px_rgb(12_10_8/0.8)] active:cursor-grabbing">
                        {(["left", "right"] as const).map((side) => {
                          const page = sp?.[side];
                          const key = page && "no" in page ? plateOf(data, page.no)?.key : undefined;
                          return (
                            <div key={side} className="relative" style={{ width: pageW, height: pageW * data.aspect }}>
                              {page && <PageView book={data} page={page} side={side} />}
                              {key && (
                                <button
                                  type="button"
                                  onClick={() => pick(key)}
                                  aria-label={`Foto auswählen: ${byKey.get(key)?.title || "ohne Titel"}`}
                                  aria-pressed={selected === key}
                                  className={`absolute inset-0 z-30 ${selected === key ? "outline-mark outline-2 -outline-offset-2" : ""}`}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </section>

        {/* Buch und gewähltes Foto */}
        <aside className="space-y-6 md:sticky md:top-20 md:self-start">
          <div className="slip text-ink space-y-3 p-5">
            <p className="text-sm font-semibold">Buch</p>
            <label className="block text-[13px]">
              <span className="text-ink-2">Titel</span>
              <input
                className={inputClass}
                value={book.title}
                placeholder="z. B. Lissabon"
                onChange={(e) => update((b) => ({ ...b, title: e.target.value.slice(0, 40) }))}
              />
            </label>
            <label className="block text-[13px]">
              <span className="text-ink-2">Zeile darunter</span>
              <input
                className={inputClass}
                value={book.subtitle}
                placeholder="automatisch: Anzahl der Fotos"
                onChange={(e) => update((b) => ({ ...b, subtitle: e.target.value.slice(0, 60) }))}
              />
            </label>
            <fieldset>
              <legend className="text-ink-2 mb-2 text-[13px]">Leinen</legend>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(CLOTHS) as ClothId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => update((b) => ({ ...b, cloth: id }))}
                    aria-pressed={book.cloth === id}
                    aria-label={CLOTHS[id].label}
                    title={CLOTHS[id].label}
                    className={`linen relative h-9 w-9 ${book.cloth === id ? "outline-ink outline-2 outline-offset-2" : ""}`}
                    style={{ backgroundColor: CLOTHS[id].base }}
                  />
                ))}
              </div>
            </fieldset>
          </div>

          {sel ? (
            <div className="slip text-ink space-y-3 p-5">
              <div className="flex gap-3">
                <div className="relative h-24 w-24 shrink-0">
                  <Image src={sel.thumb} alt="" fill sizes="96px" className="object-contain object-left-top" />
                </div>
                <p className="text-ink-2 text-[13px] leading-snug">{recipeLabel(sel)}</p>
              </div>
              <label className="block text-[13px]">
                <span className="text-ink-2">Titel</span>
                <input className={inputClass} value={sel.title} onChange={(e) => setPhoto(sel.key, { title: e.target.value.slice(0, 50) })} />
              </label>
              <label className="block text-[13px]">
                <span className="text-ink-2">Zusatz (Ort, Notiz)</span>
                <input className={inputClass} value={sel.note ?? ""} onChange={(e) => setPhoto(sel.key, { note: e.target.value.slice(0, 50) || undefined })} />
              </label>
              <label className="block text-[13px]">
                <span className="text-ink-2">Beschreibung für Screenreader</span>
                <input className={inputClass} value={sel.alt} onChange={(e) => setPhoto(sel.key, { alt: e.target.value.slice(0, 200) })} />
              </label>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                <button type="button" className="underline decoration-mark decoration-2 underline-offset-4" onClick={() => setSwapFrom(sel.key)}>
                  Tauschen mit …
                </button>
                <button
                  type="button"
                  className="underline decoration-mark decoration-2 underline-offset-4"
                  onClick={() => update((b) => ({ ...b, coverKey: sel.key }))}
                  disabled={book.coverKey === sel.key}
                >
                  {book.coverKey === sel.key ? "Auf dem Einband" : "Auf den Einband"}
                </button>
                <button
                  type="button"
                  className="text-ink-2 underline underline-offset-4"
                  onClick={() => {
                    removePhoto(sel.key);
                    setSelected(null);
                  }}
                >
                  Entfernen
                </button>
              </div>
            </div>
          ) : (
            data && <p className="text-on-table-2 text-sm leading-relaxed">Tippe auf ein Foto, um Titel und Platz zu ändern. Doppelseiten lassen sich ziehen.</p>
          )}
        </aside>
      </div>

      {dragOver && (
        <div aria-hidden className="pointer-events-none fixed inset-3 z-[650] flex items-center justify-center border-2 border-dashed border-mark bg-[rgb(12_10_8/0.6)]">
          <p className="text-on-table text-2xl font-bold tracking-[-0.02em]" style={{ fontVariationSettings: '"wdth" 80' }}>
            Loslassen, dann kommen die Fotos ins Buch
          </p>
        </div>
      )}
      {sharing && book && <ShareDialog book={book} onClose={() => setSharing(false)} />}
    </main>
  );
}
