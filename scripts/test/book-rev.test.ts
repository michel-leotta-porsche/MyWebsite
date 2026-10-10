// Zwei Geräte am selben Buch (#287): die Werkbank am Mac darf einen Tag, den das iPhone eingelegt hat, nicht mit ihrem
// alten Stand überschreiben. Jedes Speichern zählt den Stand (rev) hoch; wer auf einem älteren Stand speichert, erfährt es.
import assert from "node:assert/strict";
import { test } from "node:test";

import { BookConflict, commitBook, keepMine, remoteChange, revOf } from "@/lib/book-rev";
import { SCHEMA, type StoredBook, type StoredPhoto } from "@/lib/store";

const photo = (key: string): StoredPhoto => ({ key, title: "", alt: "", w: 4, h: 3, src: `${key}.jpg`, large: `${key}.jpg`, thumb: `${key}.jpg`, color: [128, 128, 128] });
const book: StoredBook = { schema: SCHEMA, id: "b1", owner: "u1", ownerName: "Michel", title: "Lanzarote", subtitle: "", cloth: "ringelblume", aspect: 4 / 3, coverKey: "a", photos: [photo("a")], spreads: [] };

/** Firestore im Kleinen: ein Dokument, gespeichert wird wie in saveBook (lesen, prüfen, schreiben) */
function server(start: StoredBook | null) {
  let doc = start;
  return {
    get: () => doc,
    save: (next: StoredBook, base?: number) => (doc = commitBook(doc, next, base)),
  };
}

test("ein neues Buch beginnt bei Stand 1", () => {
  const s = server(null);
  assert.equal(revOf(s.save(book)), 1);
});

test("zwei konkurrierende Speicherungen: die zweite auf altem Stand wird abgewiesen statt den Tag zu löschen", () => {
  const s = server({ ...book, rev: 3 });
  const mac = s.get()!; // Werkbank am Mac offen, Stand 3
  // iPhone: „Fertig für heute“ lädt frisch und legt einen Tag dazu
  const fresh = s.get()!;
  s.save({ ...fresh, photos: [...fresh.photos, photo("tag")] });
  assert.equal(revOf(s.get()), 4);
  // Mac ändert den Titel auf seinem alten Stand
  assert.throws(
    () => s.save({ ...mac, title: "Lanzarote 2026" }, revOf(mac)),
    (e: unknown) => e instanceof BookConflict && e.current.photos.some((p) => p.key === "tag"),
  );
  assert.ok(s.get()!.photos.some((p) => p.key === "tag"), "der Tag ist noch im Buch");
  assert.equal(s.get()!.title, "Lanzarote");
});

test("„Meine behalten“ speichert bewusst auf dem neuen Stand", () => {
  const s = server({ ...book, rev: 4 });
  const saved = s.save({ ...book, title: "Mein Titel" }, 4);
  assert.equal(saved.title, "Mein Titel");
  assert.equal(revOf(saved), 5);
});

test("ohne Grundstand (Abendstapel, Fotostudio) wird immer geschrieben und hochgezählt", () => {
  const s = server({ ...book, rev: 7 });
  assert.equal(revOf(s.save({ ...book, rev: 2 })), 8, "der Stand im Buch zählt nicht, nur der auf dem Server");
});

test("ein Buch aus der Zeit vor dem Stand zählt als Stand 0", () => {
  const s = server(book);
  assert.equal(revOf(s.save({ ...book, title: "x" }, 0)), 1);
  assert.throws(() => s.save({ ...book, title: "y" }, 0), BookConflict);
});

test("was die Werkbank mit einem Stand vom Server macht", () => {
  const at = (rev: number, over: Partial<Parameters<typeof remoteChange>[0]> = {}) => remoteChange({ remote: rev, known: 4, writing: null, dirty: false, ...over });
  assert.equal(at(4), "ignore", "derselbe Stand");
  assert.equal(at(3), "ignore", "ein älterer Stand aus dem Cache");
  assert.equal(at(5, { writing: 5 }), "ignore", "die eigene Speicherung kommt zurück");
  assert.equal(at(5), "adopt", "fremde Änderung, hier nichts offen: still übernehmen");
  assert.equal(at(5, { dirty: true }), "ask", "fremde Änderung und eigene offen: fragen");
});

test("„Meine behalten“ nimmt mit, was das andere Gerät dazugelegt hat, statt es zu löschen", () => {
  const spread = (id: string, keys: string[]) => ({ id, keys, pinned: true }) as StoredBook["spreads"][number];
  const base: StoredBook = { ...book, rev: 3, photos: [photo("a"), photo("b")], spreads: [spread("s1", ["a", "b"])] };
  // hier: Titel geändert und Foto b gelöscht
  const mine: StoredBook = { ...base, title: "Neu", photos: [photo("a")], spreads: [spread("s1", ["a"])] };
  // dort: ein Tag mit Foto t auf Doppelseite s2
  const theirs: StoredBook = { ...base, rev: 4, photos: [...base.photos, photo("t")], spreads: [...base.spreads, spread("s2", ["t"])] };
  const kept = keepMine(mine, base, theirs);
  assert.equal(kept.title, "Neu");
  assert.deepEqual(kept.photos.map((p) => p.key), ["a", "t"], "b bleibt gelöscht, t kommt dazu");
  assert.deepEqual(kept.spreads.map((s) => s.id), ["s1", "s2"]);
  assert.equal(kept.rev, 4, "gespeichert wird auf dem Stand von dort");
});
