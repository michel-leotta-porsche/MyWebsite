// 60-Fotos-Grenze (#212): ein Tag kommt nur ganz in ein Buch. Passt er nicht mehr, wird ein zweiter Band angeboten,
// mit gleichem Stoff und der nächsten Nummer im Titel. Ein Tag wird nie auf zwei Bücher verteilt.
import assert from "node:assert/strict";
import { test } from "node:test";

import { BOOK_MAX, BookFull, checkRoom, nextVolume, roomIn } from "@/lib/book-limit";

const book = (n: number, title = "Japan") => ({
  id: "b1",
  title,
  cloth: "meer" as const,
  photos: Array.from({ length: n }, (_, i) => ({ key: `p${i}` })),
});

test("ein Buch fasst 60 Fotos", () => {
  assert.equal(BOOK_MAX, 60);
  assert.equal(roomIn(book(0)), 60);
  assert.equal(roomIn(book(52)), 8);
  assert.equal(roomIn(book(60)), 0);
  assert.equal(roomIn(book(63)), 0);
});

test("der Tag passt ganz hinein oder gar nicht", () => {
  assert.doesNotThrow(() => checkRoom(book(50), 10));
  assert.doesNotThrow(() => checkRoom(book(0), 60));
  const e = (() => {
    try {
      checkRoom(book(52), 10);
    } catch (err) {
      return err;
    }
  })();
  assert.ok(e instanceof BookFull);
  assert.equal(e.room, 8);
  assert.equal(e.book.id, "b1");
  assert.throws(() => checkRoom(book(60), 1), BookFull);
});

test("Band 2 trägt die nächste Nummer im Titel", () => {
  assert.equal(nextVolume("Reisetagebuch"), "Reisetagebuch 2");
  assert.equal(nextVolume("Japan 2"), "Japan 3");
  assert.equal(nextVolume("Japan 9"), "Japan 10");
  assert.equal(nextVolume("  Japan  "), "Japan 2");
  assert.equal(nextVolume("Sommer 2026"), "Sommer 2026 2");
});
