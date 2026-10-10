// Firestore speichert keine Arrays in Arrays (#300). Der Feinschliff eines Fotos hat aber welche (HSL je Farbton,
// Punkte der Kurve), und ein Tag mit Einwegkamera-Fotos ließ sich deshalb nicht hinlegen. Beim Schreiben werden
// innere Arrays eingepackt, beim Lesen wieder ausgepackt. writeBatch().set prüft die Daten wie setDoc, ohne Netz.
import assert from "node:assert/strict";
import { test } from "node:test";

import { initializeApp } from "firebase/app";
import { doc, getFirestore, serverTimestamp, writeBatch } from "firebase/firestore";

import { packNested, unpackNested } from "@/lib/nested-arrays";

const db = getFirestore(initializeApp({ projectId: "test", apiKey: "test" }, "nested-arrays-test"));
const accepts = (data: Record<string, unknown>) => writeBatch(db).set(doc(db, "books", "b1"), data);

const more = {
  highlights: 0,
  whites: 0,
  blacks: 0.08,
  tint: 0,
  vibrance: 0,
  hsl: [[0, 0.25, 0], [-0.2, 0, 0], [0, 0, 0]],
  vignette: -0.35,
  clarity: 0,
  curve: [[0, 0], [0.5, 0.6], [1, 1]],
};
const book = { id: "b1", title: "", photos: [{ key: "a", color: [1, 2, 3], edit: { rec: { film: null }, more } }], spreads: [{ keys: ["a"] }] };

test("ein Buch mit Feinschliff im Foto nimmt Firestore so nicht an", () => {
  assert.throws(() => accepts(book), /Nested arrays/);
});

test("eingepackt nimmt Firestore es an", () => {
  assert.doesNotThrow(() => accepts(packNested(book)));
});

test("ausgepackt kommt dasselbe Buch zurück", () => {
  assert.deepEqual(unpackNested(packNested(book)), book);
});

test("ohne innere Arrays bleibt alles, wie es ist", () => {
  const plain = { id: "b1", photos: [{ key: "a", color: [1, 2, 3] }], spreads: [] };
  assert.deepEqual(packNested(plain), plain);
  assert.deepEqual(unpackNested(plain), plain);
});

test("Firestore-Werte wie serverTimestamp bleiben unangetastet", () => {
  const at = serverTimestamp();
  const packed = packNested({ book, at });
  assert.equal(packed.at, at);
  assert.doesNotThrow(() => accepts(packed));
});

test("mehrfach verschachtelt geht auch", () => {
  const deep = { m: [[[1, 2], [3]], []] };
  assert.doesNotThrow(() => accepts(packNested(deep)));
  assert.deepEqual(unpackNested(packNested(deep)), deep);
});
