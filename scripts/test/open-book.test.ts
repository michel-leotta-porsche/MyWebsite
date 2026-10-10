// Werkbank mit kaputtem Link (#213): ein gelöschtes, fremdes oder nicht ladbares Buch zeigt eine Meldung statt eines leeren Tischs.
import assert from "node:assert/strict";
import { test } from "node:test";

import { openBook } from "@/lib/open-book";
import type { StoredBook } from "@/lib/store";

const book = (owner: string) => ({ id: "b1", owner, title: "Fuerteventura" }) as StoredBook;
const failing = (code: string) => async () => {
  throw Object.assign(new Error(code), { code });
};

test("das eigene Buch öffnet sich, auch aus dem Cache ohne Netz", async () => {
  const b = book("ich");
  assert.deepEqual(await openBook("b1", "ich", async () => b), { state: "open", book: b });
});

test("ein gelöschtes Buch liegt hier nicht mehr", async () => {
  assert.deepEqual(await openBook("b1", "ich", async () => null), { state: "gone" });
  // die Regeln lassen ein fehlendes Dokument gar nicht lesen: Firestore meldet dann fehlende Rechte
  assert.deepEqual(await openBook("b1", "ich", failing("permission-denied")), { state: "gone" });
  assert.deepEqual(await openBook("b1", "ich", failing("not-found")), { state: "gone" });
});

test("ein fremdes Buch liegt hier auch nicht", async () => {
  assert.deepEqual(await openBook("b1", "ich", async () => book("jemand")), { state: "gone" });
});

test("ohne Netz und ohne Cache oder bei anderem Fehler: ließ sich nicht laden", async () => {
  assert.deepEqual(await openBook("b1", "ich", failing("unavailable")), { state: "failed" });
  assert.deepEqual(await openBook("b1", "ich", async () => Promise.reject(new Error("kaputt"))), { state: "failed" });
});
