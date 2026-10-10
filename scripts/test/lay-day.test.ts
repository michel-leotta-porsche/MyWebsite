// Abendstapel ins Buch: geteilte Links bekommen den neuen Tag gleich mit (#211), nicht erst bei der nächsten Änderung
// in der Werkbank. Hochladen und Speichern sind hier ausgetauscht, damit der Test ohne Netz läuft.
import assert from "node:assert/strict";
import { test } from "node:test";

import type { User } from "@/lib/firebase";
import { layDay, type LayIo } from "@/lib/shelve";
import { SCHEMA, type StoredBook, type StoredPhoto } from "@/lib/store";

const user = { uid: "u1", displayName: "Michel" } as User;
const photo = (key: string): StoredPhoto => ({ key, title: "", alt: "", w: 4, h: 3, src: `${key}.jpg`, large: `${key}.jpg`, thumb: `${key}.jpg`, color: [128, 128, 128] });
const shared: StoredBook = { schema: SCHEMA, id: "b1", owner: "u1", ownerName: "Michel", title: "Lanzarote", subtitle: "", cloth: "ringelblume", aspect: 4 / 3, coverKey: "a", photos: [photo("a")], spreads: [] };

function io(over: Partial<LayIo> = {}) {
  const calls = { saved: [] as StoredBook[], refreshed: [] as StoredBook[] };
  const fake: LayIo = {
    uploadPrints: async () => [photo("n1"), photo("n2")],
    loadBook: async () => shared,
    saveBook: async (b) => void calls.saved.push(b),
    refreshShares: async (b) => void calls.refreshed.push(b),
    ...over,
  };
  return { fake, calls };
}

test("ein Tag im geteilten Buch geht auch an die Links", async () => {
  const { fake, calls } = io();
  const r = await layDay(user, [], { heading: "Samstag, 10. Oktober", story: "" }, { book: shared }, undefined, fake);
  assert.equal(calls.saved.length, 1);
  assert.deepEqual(calls.refreshed, [r.book], "die Links bekommen genau das gespeicherte Buch");
  assert.ok(r.book.photos.some((p) => p.key === "n1"));
});

test("ein Fehler beim Aktualisieren der Links bricht das Einlegen nicht ab", async () => {
  const { fake, calls } = io({ refreshShares: async () => Promise.reject(new Error("offline")) });
  const r = await layDay(user, [], { heading: "Samstag, 10. Oktober", story: "" }, { book: shared }, undefined, fake);
  assert.equal(calls.saved.length, 1);
  assert.equal(r.book.id, "b1");
});

test("ohne gespeichertes Buch werden keine Links angefasst", async () => {
  const { fake, calls } = io({ saveBook: async () => Promise.reject(new Error("kaputt")) });
  await assert.rejects(layDay(user, [], { heading: "x", story: "" }, { book: shared }, undefined, fake));
  assert.equal(calls.refreshed.length, 0);
});

// 60-Fotos-Grenze (#212): ein Tag kommt nur ganz in ein Buch; in ein volles wird nichts hochgeladen und nichts gespeichert
const prints = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}` })) as unknown as Parameters<typeof layDay>[1];
const filled = (n: number): StoredBook => ({ ...shared, photos: Array.from({ length: n }, (_, i) => photo(`f${i}`)) });

test("passt der Tag nicht mehr ins Buch, wird nichts hochgeladen und nichts gespeichert", async () => {
  let uploads = 0;
  const { fake, calls } = io({ loadBook: async () => filled(59), uploadPrints: async () => (uploads++, [photo("n1"), photo("n2")]) });
  await assert.rejects(layDay(user, prints(2), { heading: "x", story: "" }, { book: shared }, undefined, fake), (e: Error) => e.name === "BookFull");
  assert.equal(uploads, 0);
  assert.equal(calls.saved.length, 0);
});

test("wird das Buch während des Hochladens voll, wird es nicht über die Grenze gespeichert", async () => {
  const fills = [filled(58), filled(60)];
  const { fake, calls } = io({ loadBook: async () => fills.shift() ?? filled(60) });
  await assert.rejects(layDay(user, prints(2), { heading: "x", story: "" }, { book: shared }, undefined, fake), (e: Error) => e.name === "BookFull");
  assert.equal(calls.saved.length, 0);
});

test("ein Tag, der genau passt, kommt ganz hinein", async () => {
  const { fake, calls } = io({ loadBook: async () => filled(58) });
  const r = await layDay(user, prints(2), { heading: "x", story: "" }, { book: shared }, undefined, fake);
  assert.equal(r.book.photos.length, 60);
  assert.equal(calls.saved.length, 1);
});
