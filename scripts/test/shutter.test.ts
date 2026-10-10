// #242: Der Auslöser unten rechts im Bücherzimmer darf die Knopfreihe unter dem Buch nicht verdecken.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { SHUTTER, shutterRoom } from "@/lib/shutter";

const src = (p: string) => readFileSync(new URL(`../../src/${p}`, import.meta.url), "utf8");

test("auf iPhone-Breite endet die Knopfreihe links vom Auslöser", () => {
  for (const width of [320, 375, 390, 430]) {
    const rowRight = width - 16 - shutterRoom(16); // Tisch mit px-4
    const shutterLeft = width - SHUTTER.edge - SHUTTER.size;
    assert.ok(rowRight <= shutterLeft - 8, `${width} pt: Reihe endet bei ${rowRight}, Auslöser beginnt bei ${shutterLeft}`);
  }
});

test("Auslöser und Knopfreihe lesen dieselben Maße", () => {
  assert.match(src("components/studio.tsx"), /SHUTTER\.size/, "Auslöser nimmt seine Größe aus lib/shutter");
  const room = src("components/book-room.tsx");
  assert.match(room, /shutterRoom\(/, "Knopfreihe hält Platz frei");
  assert.match(room, /max-md:pr-\(--shutter-room\)/, "nur auf schmalen Bildschirmen");
});
