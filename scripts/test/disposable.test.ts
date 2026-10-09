// Einwegkamera-Vorlagen: jede Vorlage ergibt eine gültige Bearbeitung, Farben einzeln landen auf dem richtigen Farbton
import assert from "node:assert/strict";
import { test } from "node:test";

import { cleanEdit, HUES } from "@/lib/develop/model";
import { DISPOSABLES, disposableEdit } from "@/lib/disposable";

test("jede Vorlage ist eine gültige Bearbeitung mit eigenem Namen", () => {
  const ids = new Set(DISPOSABLES.map((d) => d.id));
  assert.equal(ids.size, DISPOSABLES.length);
  for (const d of DISPOSABLES) {
    const e = disposableEdit(d);
    assert.deepEqual(JSON.parse(JSON.stringify(cleanEdit(e))), JSON.parse(JSON.stringify(e)), `${d.name} übersteht das Aufräumen unverändert`);
    assert.equal(e.recName, d.name);
  }
});

test("Großstadt hebt Rot und Orange, Kiosk dreht Türkis", () => {
  const at = (name: string) => HUES.findIndex((h) => h[0] === name);
  const city = disposableEdit(DISPOSABLES.find((d) => d.id === "grossstadt")!);
  assert.deepEqual(city.more?.hsl[at("Rot")], [0, 0.4, 0]);
  assert.deepEqual(city.more?.hsl[at("Orange")], [0, 0.1, 0]);
  const kiosk = disposableEdit(DISPOSABLES.find((d) => d.id === "kiosk")!);
  assert.deepEqual(kiosk.more?.hsl[at("Türkis")], [-0.2, 0, 0]);
  assert.deepEqual(kiosk.more?.hsl[at("Grün")], [0, 0.25, 0]);
});
