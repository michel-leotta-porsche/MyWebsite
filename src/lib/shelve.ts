"use client";

import { autoSequence, pickCover, type SpreadDraft } from "@/lib/auto-sequence";
import { checkRoom } from "@/lib/book-limit";
import { dayPage, pickForPage } from "@/lib/day-page";
import { bakePhoto } from "@/lib/develop/bake";
import { buildLut, isNeutral } from "@/lib/develop/model";
import type { User } from "@/lib/firebase";
import type { Geom } from "@/lib/free-layout";
import { aspectFor, autoPhotos, bottomFor, pageAspect, editedPatch, loadBook, newId, refreshShares, saveBook, SCHEMA, uploadEdited, uploadPhoto, type ClothId, type StoredBook, type StoredPhoto } from "@/lib/store";
import { workOf, type Print } from "@/lib/studio-store";

// Abzüge vom Pult in ein Buch legen: hochladen, Bearbeitung einrechnen, ins Buch schreiben. Das Fotostudio legt sie
// in die Ablage eines Buchs (Seiten bleiben, wie sie sind), der Abendstapel legt einen ganzen Tag als neue Seiten an.

const N = 33;

/**
 * Abzüge als Fotos eines Buchs hochladen, nacheinander (jedes braucht in voller Größe viel Speicher).
 * Das unbearbeitete Foto wird das Original im Buch, die Bearbeitung liegt darüber: auf der Werkbank bleibt sie änderbar.
 * Der Satz vom Einsortieren wird der Titel des Fotos.
 */
export async function uploadPrints(uid: string, bookId: string, prints: Print[], step?: (i: number) => void): Promise<StoredPhoto[]> {
  const { ingest } = await import("@/lib/ingest");
  const photos: StoredPhoto[] = [];
  for (const [i, p] of prints.entries()) {
    step?.(i);
    const key = newId().slice(0, 10);
    const edit = p.edit;
    const ph = await ingest(new File([await workOf(p)], `${p.name}.jpg`, { type: "image/jpeg" }), key, p.meta);
    const urls = await uploadPhoto(uid, bookId, ph);
    let photo: StoredPhoto = {
      key,
      title: p.line?.trim().slice(0, 50) ?? "",
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
        const edited = await uploadEdited(uid, bookId, key, out.blobs);
        photo = { ...photo, ...editedPatch(photo, edit, { urls: edited, color: out.color }) };
      } finally {
        URL.revokeObjectURL(local);
      }
    }
    photos.push(photo);
  }
  return photos;
}

/** Ein neues Buch nur aus diesen Fotos und Doppelseiten */
export function newBook(user: User, id: string, photos: StoredPhoto[], spreads: SpreadDraft[], coverKey: string, look: { title?: string; cloth?: ClothId } = {}): StoredBook {
  return {
    schema: SCHEMA,
    id,
    owner: user.uid,
    ownerName: user.displayName ?? "Ich",
    title: look.title ?? "",
    subtitle: "",
    cloth: look.cloth ?? "ringelblume",
    aspect: aspectFor(photos),
    coverKey: coverKey || photos[0].key,
    photos,
    spreads,
  };
}

/**
 * Die Doppelseiten eines Tages: vorn die Tagesseite wie eingeklebt (Datum von Hand, der Text zum Tag, bis zu vier Fotos
 * mit ihren Sätzen), dahinter die übrigen in der Reihenfolge der Aufnahme. Alle fixiert, damit die Automatik die Tage
 * später nicht ineinander mischt.
 */
export function daySpreads(photos: StoredPhoto[], heading: string, story: string, g: Geom): { spreads: SpreadDraft[]; coverKey: string } {
  const auto = autoPhotos(photos);
  const coverKey = pickCover(auto);
  const { lead, others } = pickForPage(photos, coverKey);
  const page = dayPage(g, heading, story, lead, others);
  const onPage = new Set(page.keys);
  const rest = autoSequence(auto.filter((p) => !onPage.has(p.key)));
  return { spreads: [page, ...rest.spreads.map((s) => ({ ...s, pinned: true }))], coverKey };
}

/** Was layDay nach draußen braucht; der Test tauscht es aus, damit er ohne Netz läuft */
export type LayIo = {
  uploadPrints: typeof uploadPrints;
  loadBook: typeof loadBook;
  saveBook: typeof saveBook;
  refreshShares: typeof refreshShares;
};

/**
 * Einen Tag hinten an ein Buch legen oder ein neues damit anfangen. Das bestehende Buch wird frisch geladen:
 * auf einem anderen Gerät kann es sich seitdem geändert haben. Die Tagesseite ist frei gestaltet, deshalb bleibt das
 * Seitenformat ab jetzt, wie es ist (wie nach der Bühne). spread ist die Stelle der Tagesseite im Buch.
 * Passt der Tag nicht mehr ganz ins Buch (höchstens BOOK_MAX Fotos), wirft das BookFull mit dem frischen Stand.
 * Geteilte Links bekommen den Tag gleich mit, wie nach jedem Speichern in der Werkbank.
 */
export async function layDay(
  user: User,
  prints: Print[],
  day: { heading: string; story: string },
  into: { book: StoredBook } | { title: string; cloth: ClothId },
  step?: (i: number) => void,
  io: LayIo = { uploadPrints, loadBook, saveBook, refreshShares },
): Promise<{ book: StoredBook; firstKey: string; spread: number }> {
  // Ein Tag kommt nur ganz in ein Buch (#212): vor dem Hochladen prüfen und nach dem Hochladen noch einmal,
  // falls ein anderes Gerät das Buch inzwischen gefüllt hat. Passt er nicht, wirft das BookFull.
  const fresh = async (b: StoredBook) => {
    const now = (await io.loadBook(b.id)) ?? b;
    checkRoom(now, prints.length);
    return now;
  };
  if ("book" in into) await fresh(into.book);
  else checkRoom({ id: "", title: into.title, photos: [] }, prints.length);
  const bookId = "book" in into ? into.book.id : newId();
  const photos = await io.uploadPrints(user.uid, bookId, prints, step);
  const base = "book" in into ? await fresh(into.book) : newBook(user, bookId, photos, [], photos[0].key, into);
  const aspect = pageAspect(base.aspect);
  const g = { aspect, bottom: bottomFor(aspect) };
  const d = daySpreads(photos, day.heading, day.story, g);
  const book: StoredBook =
    "book" in into
      ? { ...base, photos: [...base.photos, ...photos], spreads: [...base.spreads, ...d.spreads], aspectLocked: true }
      : { ...base, coverKey: d.coverKey, spreads: d.spreads, aspectLocked: true };
  await io.saveBook(book);
  // nicht abwarten: ein Link, der nicht nachkommt, hält den Tag nicht auf; Firestore schickt es nach, sobald Netz da ist
  io.refreshShares(book).catch(() => {});
  return { book, firstKey: d.coverKey, spread: book.spreads.length - d.spreads.length };
}
