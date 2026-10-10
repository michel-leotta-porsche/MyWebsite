// Seite „Was Calima kann“ (#267): nach Absicht gruppiert, je Funktion ein echtes Bild pro Sprache und höchstens zwei Sätze,
// je Gruppe ein Weg in die Hilfe; was es nur in der iPhone-App gibt, ist so markiert.
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { test } from "node:test";

import { FEATURE_GROUPS, FEATURES_PATH, shotOf } from "@/lib/features";
import { translate } from "@/lib/i18n";

const PUBLIC = new URL("../../public/", import.meta.url).pathname;
const sentences = (s: string) => (s.match(/[.!?](\s|$)/g) ?? []).length;

test("Gruppen nach Absicht: Buch machen, Fotos bearbeiten, Rezepte, Hinlegen, Kamera", () => {
  assert.deepEqual(
    FEATURE_GROUPS.map((g) => g.id),
    ["buch", "fotos", "rezepte", "hinlegen", "kamera"],
  );
});

test("Funktionen je Gruppe wie im Issue", () => {
  const ids = Object.fromEntries(FEATURE_GROUPS.map((g) => [g.id, g.features.map((f) => f.id)]));
  assert.deepEqual(ids.buch, ["fotos", "layouts", "gestalten", "einband"]);
  assert.deepEqual(ids.fotos, ["looks", "fotostudio"]);
  assert.deepEqual(ids.rezepte, ["fuji", "lightroom"]);
  assert.deepEqual(ids.hinlegen, ["link", "zettel", "eselsohr", "zurueckziehen"]);
  assert.equal(ids.kamera.length, 3);
});

test("Die Seite liegt unter /funktionen", () => {
  assert.equal(FEATURES_PATH, "/funktionen");
});

for (const g of FEATURE_GROUPS) {
  test(`${g.id}: „So geht’s“ führt in die Hilfe`, () => {
    assert.match(g.help, /^\/hilfe(#[a-z-]+)?$/);
  });

  for (const f of g.features) {
    test(`${g.id}/${f.id}: höchstens zwei Sätze, auf Deutsch und Englisch`, () => {
      assert.ok(sentences(f.text) <= 2, f.text);
      const en = translate("en", f.text);
      assert.notEqual(en, f.text, "englischer Text fehlt");
      assert.ok(sentences(en) <= 2, en);
    });

    if (f.app) {
      test(`${g.id}/${f.id}: nur in der iPhone-App, ohne Bild aus dem Browser`, () => {
        assert.equal(shotOf(f, "de"), null);
      });
    } else {
      test(`${g.id}/${f.id}: echtes Bild je Sprache, klein genug`, () => {
        for (const lang of ["de", "en"] as const) {
          const src = shotOf(f, lang);
          assert.ok(src, "kein Bild");
          assert.ok(existsSync(PUBLIC + src.slice(1)), src);
          assert.ok(statSync(PUBLIC + src.slice(1)).size < 300 * 1024, `${src} zu groß`);
        }
      });
    }
  }
}

test("Nur die Kamera ist App-only", () => {
  for (const g of FEATURE_GROUPS) for (const f of g.features) assert.equal(!!f.app, g.id === "kamera", `${g.id}/${f.id}`);
});
