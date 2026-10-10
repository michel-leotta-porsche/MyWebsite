// Umschlag (#244): ein entwickelter Film kommt als ein Stapel auf den Pult, mit Filmname und Zeitraum, vorn, und das
// Fotostudio räumt ihn nie selbst weg.
import assert from "node:assert/strict";
import { test } from "node:test";

import { envelopeLabel, envelopeOf, framesMissing, isEnvelope, isSortPile, missingFrames, toEnvelope } from "@/lib/envelope";
import { piles, trimPiles, type Print } from "@/lib/studio-store";

const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const blob = new Blob([]);
const print = (id: string, stamp: number, stack?: string, pos = stamp): Print => ({ id, name: id, at: stamp, w: 4, h: 3, page: blob, thumb: blob, meta: { exif: {} } as Print["meta"], stack, pos });

test("ein Film wird ein Umschlag: eigener Stapel, Bilder in der Reihenfolge des Films, mit Name und Entwicklungszeit", () => {
  const roll = [print("b", at(2026, 10, 15), "f1", 1), print("a", at(2026, 10, 8), "f1", 0)];
  const env = toEnvelope(roll, "f1", "Sonnenschein", at(2026, 10, 20));
  assert.ok(env.every((p) => p.stack === envelopeOf("f1") && p.roll === "Sonnenschein" && p.dev === at(2026, 10, 20)));
  assert.deepEqual(piles(env)[0].map((p) => p.id), ["a", "b"]);
  // das Aufnahmedatum bleibt
  assert.equal(env.find((p) => p.id === "a")!.at, at(2026, 10, 8));
  assert.ok(isEnvelope(envelopeOf("f1")));
  assert.ok(!isEnvelope("tag-2026-10-08") && !isEnvelope(undefined) && !isEnvelope("f1"));
  assert.ok(isSortPile(envelopeOf("f1")) && isSortPile("tag-2026-10-08") && !isSortPile("f1"));
});

test("der Zettel trägt Filmname und Zeitraum", () => {
  const one = toEnvelope([print("a", at(2026, 10, 8, 9), "h"), print("b", at(2026, 10, 9, 1), "h")], "h", "Hafen", 0);
  assert.equal(envelopeLabel(one, "de-DE"), "Hafen · 8. Okt.", "nach Mitternacht gehört noch zum Tag davor");
  const week = toEnvelope([print("a", at(2026, 10, 8), "s"), print("b", at(2026, 10, 15), "s")], "s", "Sonnenschein", 0);
  assert.equal(envelopeLabel(week, "de-DE"), "Sonnenschein · 8.–15. Okt.");
  // Leerzeichen um den Strich setzt jede ICU-Fassung anders
  assert.equal(envelopeLabel(week, "en-GB").replace(/\s/g, ""), "Sonnenschein·8–15Oct");
});

test("frisch entwickelt liegt vorn, auch wenn die Bilder älter sind als der Tag von heute", () => {
  const today = [print("h", at(2026, 10, 20, 9), "tag-2026-10-20")];
  const env = toEnvelope([print("a", at(2026, 10, 8), "f1")], "f1", "Hafen", at(2026, 10, 20, 18));
  assert.equal(piles([...today, ...env])[0][0].stack, envelopeOf("f1"));
});

test("Umschläge räumt das Fotostudio nie weg und zählt sie nicht zu den acht Stapeln", () => {
  const env = toEnvelope(Array.from({ length: 27 }, (_, i) => print(`f${i}`, at(2026, 10, 1, 10, i), "f1")), "f1", "Hafen", at(2026, 10, 2));
  const newer = Array.from({ length: 9 }, (_, i) => print(`n${i}`, at(2026, 10, 8, 10, i), `s${i}`));
  const { keep, drop } = trimPiles(piles([...env, ...newer]), at(2026, 10, 9), new Set());
  assert.equal(keep.flat().filter((p) => isEnvelope(p.stack)).length, 27);
  assert.equal(keep.length, 1 + 8);
  assert.deepEqual(drop.map((p) => p.id), ["n0"]);
});

test("Film ohne Bilder auf dem Gerät: entwickeln meldet, wie viele fehlen, statt still nichts zu tun", () => {
  const film = (stack: string, name: string, count: number) => ({ stack, name, count, approx: false, edit: null });
  const rolls = [[print("a", 1, "f1")], []];
  assert.deepEqual(missingFrames([film("f1", "Hafen", 3), film("f2", "Sonnenhut", 3)], rolls), [
    { name: "Hafen", missing: 2, count: 3 },
    { name: "Sonnenhut", missing: 3, count: 3 },
  ]);
  assert.deepEqual(missingFrames([film("f1", "Hafen", 1)], [[print("a", 1, "f1")]]), []);
  assert.equal(framesMissing({ name: "Sonnenhut", missing: 3, count: 3 }), "Auf dem Film „Sonnenhut“ liegen keine Bilder mehr auf diesem Gerät.");
  assert.equal(framesMissing({ name: "Hafen", missing: 2, count: 3 }), "Vom Film „Hafen“ fehlen 2 von 3 Bildern auf diesem Gerät.");
});
