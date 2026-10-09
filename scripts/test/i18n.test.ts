// Jeder Text in t("…") oder de("…") braucht einen englischen Eintrag in content/en.ts, und {platzhalter} müssen in beiden Fassungen gleich sein.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { EN, PARTS } from "@/content/en";
import { translate } from "@/lib/i18n";

const SRC = new URL("../../src/", import.meta.url).pathname;
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [];
  });

const used = new Map<string, string>();
for (const f of files(SRC)) {
  const code = readFileSync(f, "utf8");
  for (const m of code.matchAll(/\b(?:t|de)\(\s*"((?:\\.|[^"\\])*)"/g)) used.set(JSON.parse(`"${m[1]}"`), f.slice(SRC.length));
  // <T>…</T> in Server-Komponenten: JSX fasst Zeilenumbrüche samt Einrückung zu einem Leerzeichen zusammen
  for (const m of code.matchAll(/<T(?:\s[^>]*)?>([^<{]+)<\/T>/g)) used.set(m[1].trim().replace(/\s*\n\s*/g, " "), f.slice(SRC.length));
}

const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test("jeder Text hat eine englische Fassung", () => {
  const missing = [...used].filter(([de]) => !(de in EN)).map(([de, f]) => `${f}: ${de}`);
  assert.deepEqual(missing, []);
});

test("derselbe Text ist überall gleich übersetzt", () => {
  const seen = new Map<string, string>();
  const clashes: string[] = [];
  for (const [part, dict] of Object.entries(PARTS))
    for (const [de, en] of Object.entries(dict)) {
      if (seen.has(de) && seen.get(de) !== en) clashes.push(`${part}: ${de}`);
      seen.set(de, en);
    }
  assert.deepEqual(clashes, []);
});

test("Platzhalter stimmen überein", () => {
  for (const [de, en] of Object.entries(EN)) assert.deepEqual(holes(en), holes(de), de);
});

test("translate ersetzt Platzhalter und fällt auf Deutsch zurück", () => {
  assert.equal(translate("en", "Kostenlos, Anmeldung mit {providers}. Bücher sieht nur, wem du einen Link gibst.", { providers: "Google" }), "Free, sign in with Google. Only people you give a link to see your books.");
  assert.equal(translate("en", "Gibt es nicht"), "Gibt es nicht");
  assert.equal(translate("de", "Anmelden"), "Anmelden");
});
