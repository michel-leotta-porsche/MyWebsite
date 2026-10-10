// Menü beim langen Drücken am Handy (#275) und aufs leere Papier (#218): was im Blatt steht, für jede Art von Ziel.
import assert from "node:assert/strict";
import { test } from "node:test";

import { pressMoved, sheetPlan } from "@/lib/stage-menu";

test("Foto: Kacheln oben, Löschen zuletzt, Zuschneiden und Unterschrift darunter, Ebene als eine Zeile", () => {
  assert.deepEqual(sheetPlan("photo", { clip: false }), { tiles: ["copy", "duplicate", "cut", "delete"], rows: ["crop", "caption"], layer: true });
});

test("Einfügen nur, wenn etwas in der Zwischenablage liegt; am Element als Zeile, damit die vier Kacheln lesbar bleiben", () => {
  assert.deepEqual(sheetPlan("photo", { clip: true }), { tiles: ["copy", "duplicate", "cut", "delete"], rows: ["crop", "caption", "paste"], layer: true });
  assert.ok(!sheetPlan("text", { clip: false }).rows.includes("paste"));
  assert.deepEqual(sheetPlan("shape", { clip: true }).rows, ["paste"]);
});

test("Text: schreiben, Art und helle Schrift", () => {
  assert.deepEqual(sheetPlan("text", { clip: false }), { tiles: ["copy", "duplicate", "cut", "delete"], rows: ["write", "role", "light"], layer: true });
});

test("Form und Zeichnung: nur Kacheln und Ebene", () => {
  for (const kind of ["shape", "ink"] as const) assert.deepEqual(sheetPlan(kind, { clip: false }), { tiles: ["copy", "duplicate", "cut", "delete"], rows: [], layer: true });
});

test("leeres Papier: Text anlegen, Formen, Einfügen immer (Text aus anderen Apps), keine Ebene", () => {
  for (const clip of [true, false]) assert.deepEqual(sheetPlan("paper", { clip }), { tiles: ["heading", "body", "note", "paste"], rows: ["shapes"], layer: false });
});

test("langes Drücken: Ziehen über die Totzone hebt es auf", () => {
  assert.equal(pressMoved({ x: 100, y: 100 }, { x: 104, y: 103 }), false);
  assert.equal(pressMoved({ x: 100, y: 100 }, { x: 110, y: 100 }), true);
});
