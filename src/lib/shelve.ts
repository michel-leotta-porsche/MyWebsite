"use client";

import { autoSequence, pickCover, spreadId, type SpreadDraft } from "@/lib/auto-sequence";
import { bakePhoto } from "@/lib/develop/bake";
import { buildLut, isNeutral } from "@/lib/develop/model";
import type { User } from "@/lib/firebase";
import { aspectFor, autoPhotos, editedPatch, loadBook, newId, saveBook, SCHEMA, uploadEdited, uploadPhoto, type ClothId, type StoredBook, type StoredPhoto } from "@/lib/store";
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
 * Die Doppelseiten eines Tages: vorn das Datum als Textseite neben dem schönsten Foto, dahinter die übrigen in der
 * Reihenfolge der Aufnahme. Alle fixiert, damit die Automatik die Tage später nicht ineinander mischt.
 */
export function daySpreads(photos: StoredPhoto[], heading: string): { spreads: SpreadDraft[]; coverKey: string } {
  const auto = autoPhotos(photos);
  const lead = pickCover(auto);
  const rest = autoSequence(auto.filter((p) => p.key !== lead));
  const opener: SpreadDraft = { id: spreadId(), keys: [lead], layout: 0, pinned: true, text: { heading, body: "" } };
  return { spreads: [opener, ...rest.spreads.map((s) => ({ ...s, pinned: true }))], coverKey: lead };
}

/**
 * Einen Tag hinten an ein Buch legen oder ein neues damit anfangen. Das bestehende Buch wird frisch geladen:
 * auf einem anderen Gerät kann es sich seitdem geändert haben.
 */
export async function layDay(user: User, prints: Print[], heading: string, into: { book: StoredBook } | { title: string; cloth: ClothId }, step?: (i: number) => void): Promise<{ book: StoredBook; firstKey: string }> {
  const bookId = "book" in into ? into.book.id : newId();
  const photos = await uploadPrints(user.uid, bookId, prints, step);
  const day = daySpreads(photos, heading);
  let book: StoredBook;
  if ("book" in into) {
    const fresh = (await loadBook(into.book.id)) ?? into.book;
    book = { ...fresh, photos: [...fresh.photos, ...photos], spreads: [...fresh.spreads, ...day.spreads] };
  } else book = newBook(user, bookId, photos, day.spreads, day.coverKey, into);
  await saveBook(book);
  return { book, firstKey: day.coverKey };
}
