// Tagesseite: „Fertig für heute“ legt den Tag wie eingeklebt auf eine freie Doppelseite. Nichts darf über den Rand
// laufen, Fotos und Texte liegen nicht übereinander, und was nicht draufpasst, bleibt für die Seiten dahinter.
import assert from "node:assert/strict";
import { test } from "node:test";

import { dayPage, pickForPage, STORY_MAX, type DayPhoto } from "@/lib/day-page";
import { boxOf, collides, toSpread } from "@/lib/free-layout";

const portrait = (key: string, title?: string): DayPhoto & { taken: string } => ({ key, w: 2000, h: 3000, title, taken: key });
const landscape = (key: string, title?: string): DayPhoto & { taken: string } => ({ key, w: 3000, h: 2000, title, taken: key });

function check(aspect: number, bottom: number, story: string, photos: (DayPhoto & { taken: string })[]) {
  const g = { aspect, bottom };
  const { lead, others } = pickForPage(photos, photos[0].key);
  const sp = dayPage(g, "Freitag, 9. Oktober", story, lead, others);
  assert.ok(sp.pages && sp.pinned);
  const items = toSpread(sp.pages);
  for (const it of items) {
    const b = boxOf(it, g);
    assert.ok(b.x >= -0.01 && b.x + b.w <= 200.01, `${it.t} läuft seitlich raus`);
    assert.ok(b.y >= 0 && b.y + b.h <= 100.01, `${it.t} läuft unten raus (${b.y + b.h})`);
    assert.ok(!collides(items, it.id, b, g), `${it.t} liegt auf etwas`);
  }
  return sp;
}

test("Tagesseite: höchstens vier Fotos, alles auf der Seite, nichts übereinander", () => {
  for (const [aspect, bottom] of [
    [1.5, 18],
    [4 / 3, 15],
  ]) {
    for (const story of ["", "Früh los, Nebel am See. Abends Ramen.", "x".repeat(STORY_MAX)]) {
      for (let n = 1; n <= 7; n++) {
        const photos = Array.from({ length: n }, (_, i) => (i % 2 ? landscape(`p${i}`, i % 3 ? "Ramen mit Ei. Wieder hin." : undefined) : portrait(`p${i}`, "Nebel")));
        const sp = check(aspect, bottom, story, photos);
        // passt unter einem langen Text kein Foto mehr, wandert das schönste nach rechts und die Seite trägt drei
        assert.ok(sp.keys.length === Math.min(n, 4) || (story && sp.keys.length === 3), `n=${n}: ${sp.keys.length}`);
        if (!story) assert.equal(sp.keys.length, Math.min(n, 4));
        assert.ok(sp.keys.includes("p0"), "das schönste Foto liegt auf der Tagesseite");
      }
    }
  }
});

test("Fotos mit einem Satz kommen zuerst auf die Tagesseite", () => {
  const photos = [portrait("a"), portrait("b"), portrait("c"), portrait("d", "Satz"), portrait("e"), portrait("f", "Noch einer")];
  const { lead, others } = pickForPage(photos, "a");
  assert.equal(lead.key, "a");
  assert.deepEqual(
    others.map((p) => p.key),
    ["b", "d", "f"],
  );
});
