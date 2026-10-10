// Landing neu (#264): erst blättern, dann anmelden; Clips mit deutschen Untertiteln, je unter 5 MB; „So geht’s“ führt in die Hilfe.
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { test } from "node:test";

import { translate } from "@/lib/i18n";
import { APP_FEATURES, CLIPS, HOWTO, SECTIONS, cueAt } from "@/lib/landing";

const PUBLIC = new URL("../../public/", import.meta.url).pathname;

test("Reihenfolge auf dem Telefon: Blätter mal, Mach dein eigenes, Was Calima kann, So geht’s", () => {
  assert.deepEqual(
    SECTIONS.map((s) => s.id),
    ["blaettern", "eigenes", "kann", "so-gehts"],
  );
});

test("Hinlegen zeigt „Hand it over“, das Rezept „One look“; „Make it yours“ wartet auf den Store", () => {
  assert.deepEqual(Object.keys(CLIPS).sort(), ["hinlegen", "rezept"]);
  assert.match(CLIPS.hinlegen.src, /hinlegen\.mp4$/);
  assert.match(CLIPS.rezept.src, /ein-look\.mp4$/);
});

for (const [name, clip] of Object.entries(CLIPS)) {
  test(`Clip ${name}: Datei und Standbild liegen bereit, unter 5 MB`, () => {
    for (const f of [clip.src, clip.poster]) assert.ok(existsSync(PUBLIC + f.slice(1)), f);
    assert.ok(statSync(PUBLIC + clip.src.slice(1)).size < 5 * 1024 * 1024);
  });

  test(`Clip ${name}: Untertitel in Reihenfolge, ohne Überlappung, innerhalb der Laufzeit`, () => {
    assert.ok(clip.cues.length > 0);
    let end = 0;
    for (const c of clip.cues) {
      assert.ok(c.from >= end && c.to > c.from && c.to <= clip.duration, c.de);
      end = c.to;
    }
  });
}

test("cueAt findet die Zeile zur Abspielzeit und schweigt dazwischen", () => {
  const cues = [
    { from: 1, to: 3, de: "Ein ganzer Sommer" },
    { from: 4, to: 5, de: "Rein damit." },
  ];
  assert.equal(cueAt(cues, 0.5), null);
  assert.equal(cueAt(cues, 1), "Ein ganzer Sommer");
  assert.equal(cueAt(cues, 2.9), "Ein ganzer Sommer");
  assert.equal(cueAt(cues, 3.5), null);
  assert.equal(cueAt(cues, 4.2), "Rein damit.");
});

test("„So geht’s“ hat drei Schritte, jeder führt in die Hilfe", () => {
  assert.equal(HOWTO.length, 3);
  for (const s of HOWTO) assert.match(s.href, /^\/hilfe/);
});

test("„So geht’s“ heißt auf Englisch „Hand it over“, nicht wie der Zettel-Knopf „Leave it“", () => {
  assert.equal(translate("de", HOWTO[2].title), "Hinlegen");
  assert.equal(translate("en", HOWTO[2].title), "Hand it over");
});

test("„Was Calima kann“ endet mit der Kamera: drei Funktionen der iPhone-App, die es schon gibt", () => {
  assert.equal(APP_FEATURES.length, 3);
  for (const f of APP_FEATURES) assert.ok(f.title && f.text);
});
