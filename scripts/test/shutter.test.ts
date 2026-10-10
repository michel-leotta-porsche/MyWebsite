// #242: Der Auslöser unten rechts im Bücherzimmer darf die Knöpfe unter dem Buch nicht verdecken.
// Prüft die Quellen; ob die Reihe wirklich umbricht, zeigt erst der Browser (QA auf 320–430 px, große Schrift).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { SHUTTER, SHUTTER_ROOM } from "@/lib/shutter";

const src = (p: string) => readFileSync(new URL(`../../src/${p}`, import.meta.url), "utf8");

test("der freie Platz reicht vom Bildschirmrand bis hinter den Auslöser", () => {
  assert.ok(SHUTTER_ROOM >= SHUTTER.edge + SHUTTER.size + 8);
});

test("Auslöser und Knopfreihen lesen dieselben Maße", () => {
  assert.match(src("components/studio.tsx"), /SHUTTER\.size/, "Auslöser nimmt seine Größe aus lib/shutter");
  const room = src("components/book-room.tsx");
  assert.match(room, /SHUTTER_ROOM\}px - 1rem\)/, "der Tischrand wächst mit der Schrift, der Auslöser nicht");
  const rows = [...room.matchAll(/className="([^"]*max-md:pr-\(--shutter-room\)[^"]*)" style=\{shutterRow\}/g)].map((m) => m[1]);
  assert.equal(rows.length, 2, "Knopfreihe unter dem Buch und Kopf der Rückmeldungen („Alle“)");
  assert.ok(rows.every((c) => /\bmin-w-0\b/.test(c)), "bei sehr großer Schrift macht der freie Platz das Buch nicht breiter als den Bildschirm");
  assert.ok(rows.every((c) => /\[&>(?:\*|button)\]:shrink-0/.test(c)), "Knöpfe werden dabei nicht gequetscht, ihre Schrift bleibt in der Pille");
});
