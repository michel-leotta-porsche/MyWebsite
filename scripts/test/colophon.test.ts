// Kolophon auf dem Telefon (#268): Kleine Schrift wird dort auf mindestens 11px angehoben und bricht öfter um.
// Darum stehen die Zeilen nicht mehr einzeln an geschätzten Höhen, sondern als ein Block, der von unten wächst.
import assert from "node:assert/strict";
import { test } from "node:test";

import { bookById } from "@/content/books";
import { layoutPage, stackFromBottom } from "@/content/layout";

const book = bookById("fuerteventura")!;

test("das Kolophon ist ein Block mit allen Zeilen, unten bündig", () => {
  const { els } = layoutPage(book, { kind: "colophon" }, "right");
  assert.equal(els.length, 1);
  const [el] = els;
  assert.equal(el.t, "colophon");
  if (el.t !== "colophon") return;
  assert.deepEqual(el.lines, book.colophon);
});

test("Zeilen von unten gestapelt überlappen nie, egal wie hoch sie werden", () => {
  // Höhen wie auf dem Telefon: dieselbe Zeile bricht dreimal um statt einmal
  const heights = [15, 45, 30, 15, 15];
  const tops = stackFromBottom(heights, 4, 500);
  for (let i = 1; i < tops.length; i++) assert.ok(tops[i] >= tops[i - 1] + heights[i - 1] + 4, `Zeile ${i} beginnt unter Zeile ${i - 1}`);
  assert.equal(tops.at(-1)! + heights.at(-1)!, 500, "letzte Zeile endet am Fuß");
});
