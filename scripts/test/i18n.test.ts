// Jeder Text in t("…") oder de("…") braucht einen englischen Eintrag in content/en.ts, und {platzhalter} müssen in beiden Fassungen gleich sein.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { EN } from "@/content/en";
import { translate } from "@/lib/i18n";

const SRC = new URL("../../src/", import.meta.url).pathname;
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [];
  });

const used = new Map<string, string>();
for (const f of files(SRC)) {
  for (const m of readFileSync(f, "utf8").matchAll(/\b(?:t|de)\(\s*"((?:\\.|[^"\\])*)"/g)) used.set(JSON.parse(`"${m[1]}"`), f.slice(SRC.length));
}

const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test("jeder Text hat eine englische Fassung", () => {
  const missing = [...used].filter(([de]) => !(de in EN)).map(([de, f]) => `${f}: ${de}`);
  assert.deepEqual(missing, []);
});

test("Platzhalter stimmen überein", () => {
  for (const [de, en] of Object.entries(EN)) assert.deepEqual(holes(en), holes(de), de);
});

test("translate ersetzt Platzhalter und fällt auf Deutsch zurück", () => {
  assert.equal(translate("en", "Kostenlos, Anmeldung mit {providers}. Bücher sieht nur, wem du einen Link gibst.", { providers: "Google" }), "Free, sign in with Google. Only people you give a link to see your books.");
  assert.equal(translate("en", "Gibt es nicht"), "Gibt es nicht");
  assert.equal(translate("de", "Anmelden"), "Anmelden");
});
