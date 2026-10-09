// Abendstapel: ein Tag ist ein Stapel, der Tag wechselt um 4 Uhr früh, und Tagesstapel räumt das Fotostudio nicht selbst
// weg, nur was dort seit einer Woche weggelegt ist.
import assert from "node:assert/strict";
import { test } from "node:test";

import { dayOf, daysAgo, dayStack, isDayStack } from "@/lib/day-stack";
import { KEEP_AWAY, piles, trimPiles, type Print } from "@/lib/studio-store";

const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();

test("ein Tag, ein Stapel; nach Mitternacht gehört der Abend noch zum selben Tag", () => {
  assert.equal(dayStack(at(2026, 10, 9, 9)), "tag-2026-10-09");
  assert.equal(dayStack(at(2026, 10, 9, 23, 59)), "tag-2026-10-09");
  assert.equal(dayStack(at(2026, 10, 10, 1, 30)), "tag-2026-10-09");
  assert.equal(dayStack(at(2026, 10, 10, 4, 0)), "tag-2026-10-10");
  assert.ok(isDayStack("tag-2026-10-09"));
  assert.ok(!isDayStack(undefined));
  assert.ok(!isDayStack("k3j4h5g6"));
  assert.equal(dayOf("tag-2026-10-09").getDate(), 9);
  assert.equal(daysAgo("tag-2026-10-09", at(2026, 10, 9, 20)), 0);
  assert.equal(daysAgo("tag-2026-10-08", at(2026, 10, 10, 2)), 1);
  assert.equal(daysAgo("tag-2026-09-30", at(2026, 10, 2)), 2);
});

const blob = new Blob([]);
const print = (id: string, stamp: number, stack?: string): Print => ({ id, name: id, at: stamp, w: 4, h: 3, work: blob, page: blob, thumb: blob, meta: { exif: {} } as Print["meta"], stack, pos: stamp });

test("Tagesstapel bleiben liegen, auch über die Grenzen des Fotostudios", () => {
  const day1 = Array.from({ length: 35 }, (_, i) => print(`a${i}`, at(2026, 10, 8, 10, i), "tag-2026-10-08"));
  const day2 = Array.from({ length: 30 }, (_, i) => print(`b${i}`, at(2026, 10, 9, 10, i), "tag-2026-10-09"));
  const loose = Array.from({ length: 10 }, (_, i) => print(`c${i}`, at(2026, 10, 7, 10, i)));
  const { keep, drop } = trimPiles(piles([...day1, ...day2, ...loose]));
  assert.equal(keep.flat().filter((p) => p.stack?.startsWith("tag-")).length, 65, "kein Foto eines Tages geht verloren");
  assert.equal(keep.length, 2 + 8, "dazu höchstens acht andere Stapel");
  assert.equal(drop.length, 2);
  assert.ok(drop.every((p) => !p.stack));
});

test("ein Tag liegt in der Reihenfolge der Aufnahme", () => {
  const s = "tag-2026-10-09";
  const [pile] = piles([print("spät", at(2026, 10, 9, 18), s), print("früh", at(2026, 10, 9, 8), s)]);
  assert.deepEqual(pile.map((p) => p.id), ["früh", "spät"]);
});

test("Weggelegtes bleibt eine Woche zum Zurückholen, dann geht es", () => {
  const s = "tag-2026-10-01";
  const now = at(2026, 10, 9, 20);
  const out = (id: string, ago: number): Print => ({ ...print(id, at(2026, 10, 1), s), pick: "out", pickAt: now - ago });
  const ps = [print("offen", at(2026, 10, 1), s), out("gestern", 864e5), out("alt", KEEP_AWAY + 1)];
  const { keep, drop } = trimPiles(piles(ps), now);
  assert.deepEqual(keep.flat().map((p) => p.id).sort(), ["gestern", "offen"]);
  assert.deepEqual(drop.map((p) => p.id), ["alt"]);
  // nur noch Abgelaufenes: der Tag verschwindet ganz
  assert.equal(trimPiles(piles([out("alt", KEEP_AWAY + 1)]), now).keep.length, 0);
});

test("unentwickelte Filme räumt das Fotostudio nicht weg, auch hinter acht neueren Stapeln", () => {
  const film = Array.from({ length: 24 }, (_, i) => print(`f${i}`, at(2026, 10, 1, 10, i), "film-1"));
  const newer = Array.from({ length: 9 }, (_, i) => print(`n${i}`, at(2026, 10, 8, 10, i), `s${i}`));
  const { keep, drop } = trimPiles(piles([...film, ...newer]), at(2026, 10, 9), new Set(["film-1"]));
  assert.equal(keep.flat().filter((p) => p.stack === "film-1").length, 24, "kein Bild des Films geht verloren");
  assert.equal(keep.length, 1 + 8, "der Film zählt nicht zu den acht Stapeln");
  assert.deepEqual(drop.map((p) => p.id), ["n0"]);
  // entwickelt (nicht mehr im Dunkeln) gilt er wieder als gewöhnlicher, ältester Stapel
  assert.equal(trimPiles(piles([...film, ...newer]), at(2026, 10, 9), new Set()).drop.filter((p) => p.stack === "film-1").length, 24);
});
