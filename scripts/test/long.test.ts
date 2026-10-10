// Langzeitbelichtung (#249): über 1 s aus vielen Einzelbildern, ehrlich angesagt.
import assert from "node:assert/strict";
import { test } from "node:test";

import { AUTO, SHUTTER_STOPS } from "@/lib/camera";
import { deviceDials, isLong, LONG_STOPS, longPlan, withLong } from "@/lib/long";

test("Das Zeit-Rad geht nach 1 s weiter bis 30 s", () => {
  assert.deepEqual(LONG_STOPS, [2, 4, 8, 15, 30]);
  const stops = withLong(SHUTTER_STOPS.filter((s) => s <= 1));
  assert.equal(stops.at(-1), 30);
  assert.equal(stops.filter((s) => s === 1).length, 1);
  assert.ok(stops.every((s, i) => i === 0 || s > stops[i - 1]));
});

test("Lang ist erst, was über 1 s geht", () => {
  assert.equal(isLong({ ...AUTO, duration: 1 }), false);
  assert.equal(isLong({ ...AUTO, duration: 2 }), true);
  assert.equal(isLong(AUTO), false);
});

test("Die Kamera selbst bekommt nie mehr als 1 s: bei lang stellt sie die Einzelbilder selbst", () => {
  assert.deepEqual(deviceDials({ ...AUTO, duration: 8, iso: 100 }), { ...AUTO, duration: null, iso: 100 });
  assert.deepEqual(deviceDials({ ...AUTO, duration: 1 / 4 }), { ...AUTO, duration: 1 / 4 });
});

test("Lichtspuren: Einzelbilder so lang wie die Messung sagt, höchstens 1 s", () => {
  assert.deepEqual(longPlan(8, "spuren", 1 / 4), { frames: 32, each: 1 / 4 });
  assert.deepEqual(longPlan(30, "spuren", 2), { frames: 30, each: 1 });
});

test("Fließend: viele kurze Bilder, höchstens 30 je Sekunde", () => {
  assert.deepEqual(longPlan(4, "fliessend", 1 / 500), { frames: 120, each: 1 / 500 });
  // dunkel: das Einzelbild ist länger, also weniger Bilder
  assert.deepEqual(longPlan(4, "fliessend", 1 / 10), { frames: 40, each: 1 / 10 });
});
