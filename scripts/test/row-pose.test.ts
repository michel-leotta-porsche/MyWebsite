// Karussell mit Wölbung und Tiefe (#270): Lage und Licht jedes Buchs aus seinem Abstand zur Mitte.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { rowPose, TURN } from "@/lib/row-pose";

const W = 220;
const angle = (t: string) => Number(/rotateY\((-?[\d.]+)deg\)/.exec(t)?.[1]);
const back = (t: string) => Number(/translateZ\((-?[\d.]+)px\)/.exec(t)?.[1]);

test("die Nachbarn drehen sich um 34° zur Mitte und weichen nach hinten", () => {
  assert.equal(TURN, 34);
  const left = rowPose(-W, W, 0, false);
  const right = rowPose(W, W, 0, false);
  // links: die Innenkante (rechts) weicht nach hinten, das Buch schaut zur Mitte
  assert.equal(angle(left.transform), 34);
  assert.equal(angle(right.transform), -34);
  assert.ok(back(left.transform) < -50, "Nachbar weicht zurück");
});

test("das Buch in der Mitte liegt gerade, hebt sich und hat den großen Schatten", () => {
  const mid = rowPose(0, W, 1.2, false);
  assert.equal(Math.abs(angle(mid.transform)), 0);
  assert.equal(Math.abs(back(mid.transform)), 0);
  assert.equal(mid.lift, 1);
  assert.equal(mid.shade, 0);
  assert.equal(mid.cast, 0);
  assert.match(mid.transform, /translate\(0\.00%, -1[0-9]\.00px\)/, "hebt sich vom Tisch");
});

test("die Mitte wirft ihren Schatten auf die Innenkante der Nachbarn", () => {
  const left = rowPose(-W, W, 0, false);
  const right = rowPose(W, W, 0, false);
  assert.ok(left.cast > 0.4 && right.cast > 0.4);
  assert.equal(left.castFrom, "right");
  assert.equal(right.castFrom, "left");
  assert.equal(left.lift, 0);
  assert.ok(left.shade > 0.3, "Nachbar im Halbschatten");
  // zwei Plätze weiter liegt das Buch hinter dem Nachbarn, nicht neben der Mitte
  assert.equal(rowPose(2 * W, W, 0, false).cast, 0);
});

test("beim Wischen wächst alles stufenlos, ohne Sprung", () => {
  let last = rowPose(0, W, 0, false);
  for (let d = 4; d <= W; d += 4) {
    const p = rowPose(d, W, 0, false);
    assert.ok(Math.abs(angle(p.transform) - angle(last.transform)) < 1.5, `Drehung springt bei ${d}`);
    assert.ok(Math.abs(p.lift - last.lift) < 0.05 && Math.abs(p.cast - last.cast) < 0.05);
    last = p;
  }
});

test("Bewegung reduzieren: keine Drehung, kein Zurückweichen, Licht bleibt", () => {
  const p = rowPose(W, W, 0, true);
  assert.doesNotMatch(p.transform, /rotateY|perspective|translateZ/);
  assert.equal(p.sheen, 0);
  assert.ok(p.cast > 0);
  // ohne Perspektive zeigt allein die Größe, dass der Nachbar hinten liegt
  assert.match(p.transform, /scale\(0\.86/);
});

test("die Reihe zeigt Buchrücken und Papierkanten in 3D", () => {
  const css = readFileSync(new URL("../../src/app/globals.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.match(css, /\.carousel > li \{[^}]*transform-style:\s*preserve-3d/);
  assert.match(css, /\.carousel \.book-block-r[^{]*\{[^}]*rotateY\(90deg\)/);
  assert.match(css, /\.carousel \.book-spine[^{]*\{[^}]*rotateY\(90deg\)/);
  // der Schatten der Mitte wird per Deckkraft gesetzt, nicht übergeblendet (sonst hinkt er dem Finger nach)
  assert.match(css, /\.carousel \.lift-shadow[^{]*\{[^}]*transition:\s*none/);
});
