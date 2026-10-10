// Öffentliches Beispielbuch (#165): ein fester Link schlägt Fuerteventura ohne Konto auf, am Ende ein ruhiger Weg zum eigenen Buch.
import assert from "node:assert/strict";
import { test } from "node:test";

import { SAMPLE_PATH, atBookEnd, sampleBook } from "@/lib/sample-book";

test("der Link ist fest und kurz genug für einen QR-Code", () => {
  assert.equal(SAMPLE_PATH, "/beispiel");
});

test("das Beispielbuch ist Fuerteventura mit allen Tafeln", () => {
  const book = sampleBook();
  assert.equal(book.id, "fuerteventura");
  assert.equal(book.title, "Fuerteventura");
  assert.equal(book.plates.length, 26);
});

test("der Hinweis aufs eigene Buch kommt erst auf der letzten Doppelseite und auf dem Rückdeckel", () => {
  const count = 16;
  assert.equal(atBookEnd(0, count), false, "Einband");
  assert.equal(atBookEnd(1, count), false, "Titel");
  assert.equal(atBookEnd(count - 2, count), false, "vorletzte Doppelseite");
  assert.equal(atBookEnd(count - 1, count), true, "Kolophon");
  assert.equal(atBookEnd(count, count), true, "Rückdeckel");
});
