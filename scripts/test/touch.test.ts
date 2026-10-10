// Feinschliff 1.0 (#202): Touch-Verhalten auf dem iPhone und kleine Ausreißer. Prüft die Quellen, das Verhalten selbst zeigt erst das Gerät.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const src = (p: string) => readFileSync(new URL(`../../src/${p}`, import.meta.url), "utf8");
const css = src("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");

/** Deklarationen aller Regeln, deren Selektor `sel` enthält (ohne Verschachtelung über eine Ebene hinaus) */
const rules = (sel: string) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, s]) => s.split(",").some((x) => x.trim() === sel)).map(([, , body]) => body);

test("kein grauer Tipp-Blitz, kein Doppeltipp-Zoom, App federt nicht als Ganzes", () => {
  const html = rules("html").join("");
  assert.match(html, /-webkit-tap-highlight-color:\s*transparent/);
  assert.match(html, /overscroll-behavior-y:\s*none/);
  assert.ok(rules("button").some((b) => /touch-action:\s*manipulation/.test(b)), "Knöpfe ohne Doppeltipp-Verzögerung");
});

test("langes Drücken auf Knöpfe markiert keinen Text, Eingaben bleiben markierbar", () => {
  const button = rules("button").join("");
  assert.match(button, /user-select:\s*none/);
  assert.match(button, /-webkit-touch-callout:\s*none/);
  assert.ok(rules("input").some((b) => /user-select:\s*text/.test(b)), "Eingabefelder bleiben markierbar");
  assert.ok(rules('[contenteditable]:not([contenteditable="false"])').some((b) => /user-select:\s*text/.test(b)), "contenteditable bleibt markierbar");
});

test("Verweise bleiben markierbar, Einbände als Verweis nicht", () => {
  assert.ok(!rules("a").some((b) => /user-select:\s*none/.test(b)), "Anschrift im Impressum muss kopierbar bleiben");
  assert.match(src("components/book-room.tsx"), /href="\/neu"\s+className="[^"]*select-none \[-webkit-touch-callout:none\]/, "Rohling „Neues Buch“");
  assert.match(src("components/ui/button-class.ts"), /select-none \[-webkit-touch-callout:none\]/, "Verweise, die wie Knöpfe aussehen");
});

test(".press:active ist nur einmal definiert", () => {
  assert.equal(css.match(/\.press:active/g)?.length, 1);
});

test("kein Text unter 11px", () => {
  for (const f of ["components/white-dial.tsx", "components/editor.tsx"]) assert.doesNotMatch(src(f), /text-\[(?:[0-9]|10)(?:\.[0-9]+)?px\]/, f);
});

test("Eselsohr und Zettel wachsen nicht aus dem Nichts", () => {
  const scales = (f: string) => [...src(f).matchAll(/scale:\s*([0-9.]+)/g)].map((m) => Number(m[1]));
  for (const f of ["components/book.tsx", "components/pin-note.tsx"]) for (const s of scales(f)) assert.ok(s >= 0.9, `${f}: scale ${s}`);
});
