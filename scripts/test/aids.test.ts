// Profi-Hilfen im Sucher (#185): einzeln an- und abschaltbar, gemerkt auf dem Gerät.
import assert from "node:assert/strict";
import { test } from "node:test";

import { AIDS_OFF, histogramPath, nextTimer, readAids } from "@/lib/aids";

test("ohne Gemerktes ist alles aus; Unsinn im Speicher fällt auf aus zurück", () => {
  assert.deepEqual(readAids(null), AIDS_OFF);
  assert.deepEqual(readAids("kaputt"), AIDS_OFF);
  assert.deepEqual(readAids(JSON.stringify({ peaking: true, timer: 7, raw: "ja" })), { ...AIDS_OFF, peaking: true });
  assert.deepEqual(readAids(JSON.stringify({ zebra: true, histogram: true, grid: true, timer: 10, raw: true })), {
    grid: true,
    peaking: false,
    zebra: true,
    histogram: true,
    timer: 10,
    raw: true,
  });
});

test("Selbstauslöser: aus → 3 s → 10 s → aus", () => {
  assert.equal(nextTimer(0), 3);
  assert.equal(nextTimer(3), 10);
  assert.equal(nextTimer(10), 0);
});

test("Histogramm als Fläche: links dunkel, rechts hell, der höchste Balken füllt die Höhe", () => {
  const d = histogramPath([0, 2, 1, 0], 30, 10);
  assert.equal(d, "M0,10 L0,10 L10,0 L20,5 L30,10 L30,10 Z");
  assert.equal(histogramPath([], 30, 10), "");
  assert.equal(histogramPath([0, 0], 30, 10), "M0,10 L0,10 L30,10 L30,10 Z", "schwarzes Bild: flach, kein Teilen durch null");
});
