// Kamera vom Sperrbildschirm (#187): die gesperrte Kamera bekommt eine kleine Auswahl Looks, und was sie aufnimmt,
// kommt beim nächsten Öffnen mit seinem Look auf den Abendstapel.
import assert from "node:assert/strict";
import { test } from "node:test";

import { editFor, LOCKED_MAX, lockedLooks, readLockedLooks, type LockedLook } from "@/lib/locked";

const look = (id: string, edit: unknown = { id }): LockedLook => ({ id, name: id.toUpperCase(), edit: edit as LockedLook["edit"] });

test("der gewählte Look zuerst, dann die übrigen, höchstens LOCKED_MAX", () => {
  const all = Array.from({ length: 12 }, (_, i) => look(`l${i}`));
  const out = lockedLooks(all, "l5");
  assert.equal(out.length, LOCKED_MAX);
  assert.equal(out[0].id, "l5");
  assert.equal(new Set(out.map((l) => l.id)).size, LOCKED_MAX, "keiner doppelt");
  assert.equal(lockedLooks(all, "gibts-nicht")[0].id, "l0");
});

test("ein gesperrt aufgenommenes Foto bekommt die Bearbeitung seines Looks", () => {
  const looks = [look("original", null), look("honig")];
  assert.deepEqual(editFor({ path: "a", at: 1, look: "honig" }, looks), { id: "honig" });
  assert.equal(editFor({ path: "a", at: 1, look: "original" }, looks), undefined);
  assert.equal(editFor({ path: "a", at: 1, look: "weg" }, looks), undefined, "Look nicht mehr da: Foto ohne Look");
  assert.equal(editFor({ path: "a", at: 1 }, looks), undefined);
});

test("gemerkte Looks lesen; Kaputtes ergibt keine", () => {
  assert.deepEqual(readLockedLooks(JSON.stringify([look("honig")])), [look("honig")]);
  assert.deepEqual(readLockedLooks("kaputt"), []);
  assert.deepEqual(readLockedLooks(JSON.stringify([{ name: "ohne id" }])), []);
  assert.deepEqual(readLockedLooks(null), []);
});
