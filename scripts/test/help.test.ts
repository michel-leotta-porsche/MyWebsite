// Hilfe als Landkarte (#215): /hilfe ist das Inhaltsverzeichnis, je Ablauf eine Seite unter /hilfe/…, Deutsch und Englisch,
// mit Bildern aus der App; Kamera und Abendstapel sagen im Browser, dass sie nur in der App gehen.
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { test } from "node:test";

import { FEATURE_GROUPS } from "@/lib/features";
import { ALSO, FIRST_HINT, GUIDES, MAP, guideOf, guidePath, hintDone, markHintDone, shotOf, stepText, tipsFor } from "@/lib/help";
import { EN } from "@/content/en";
import { translate } from "@/lib/i18n";
import { HOWTO } from "@/lib/landing";

const PUBLIC = new URL("../../public/", import.meta.url).pathname;
const sentences = (s: string) => (s.match(/[.!?](\s|$)/g) ?? []).length;
const slugs = GUIDES.map((g) => g.slug);
/** Pfad zeigt auf eine Anleitung, die es gibt (ein Anker auf einen Schritt ist erlaubt) */
const isGuide = (href: string) => {
  const m = href.match(/^\/hilfe\/([a-z-]+)(#schritt-(\d+))?$/);
  if (!m) return false;
  const g = guideOf(m[1]);
  return !!g && (!m[3] || Number(m[3]) <= g.steps.length);
};

test("Die Karte: Fotografieren → Abendstapel → Buch → Hinlegen → Lesen und Antworten, daneben das Fotostudio", () => {
  assert.deepEqual(MAP, ["kamera", "abendstapel", "erstes-buch", "hinlegen", "lesen"]);
  assert.deepEqual(ALSO, ["fotostudio"]);
  assert.deepEqual([...slugs].sort(), [...MAP, ...ALSO].sort());
});

test("Jede Anleitung liegt unter /hilfe/<slug>", () => {
  assert.equal(guidePath("hinlegen"), "/hilfe/hinlegen");
  assert.equal(guidePath("erstes-buch", 4), "/hilfe/erstes-buch#schritt-4");
  assert.equal(guideOf("gibt-es-nicht"), undefined);
});

test("Nur Kamera und Abendstapel sind App-only", () => {
  for (const g of GUIDES) assert.equal(!!g.appOnly, g.slug === "kamera" || g.slug === "abendstapel", g.slug);
});

test("Fragen aus Welle 1 stehen wörtlich als Titel", () => {
  assert.equal(guideOf("erstes-buch")?.title, "Wie mache ich mein erstes Buch?");
  assert.equal(guideOf("hinlegen")?.title, "Wie lege ich ein Buch jemandem hin?");
  assert.equal(guideOf("lesen")?.title, "Jemand hat mir ein Buch hingelegt. Wie lese ich es?");
  assert.equal(guideOf("fotostudio")?.title, "Wie bearbeite ich Fotos im Fotostudio?");
});

for (const g of GUIDES) {
  const texts = [
    g.title,
    g.label,
    g.lead,
    ...(g.intro ? [g.intro] : []),
    ...g.steps.flatMap((s) => [s.title, s.text, ...(s.app ? [s.app] : []), ...(s.web ? [s.web] : [])]),
    ...g.tips.flatMap((tip) => [tip.text, ...(tip.link ? [tip.link.label] : [])]),
  ];

  test(`${g.slug}: alles auf Englisch`, () => {
    for (const s of texts) assert.ok(s in EN, `englischer Text fehlt: ${s}`);
  });

  test(`${g.slug}: mindestens drei Schritte, Weiter zeigt auf eine Anleitung`, () => {
    assert.ok(g.steps.length >= 3);
    if (g.next) assert.ok(slugs.includes(g.next), g.next);
  });

  test(`${g.slug}: Bilder liegen je Sprache bereit, klein genug`, () => {
    const shots = g.steps.flatMap((s) => (s.shot ? [s.shot] : []));
    // Anleitungen fürs Web zeigen den Weg mit Bildern; Kamera und Abendstapel gibt es im Browser nicht zu fotografieren
    if (!g.appOnly) assert.ok(shots.length >= 2, "zu wenig Bilder");
    for (const shot of shots)
      for (const lang of ["de", "en"] as const) {
        const { src, width, height } = shotOf(shot, lang);
        assert.ok(width > 0 && height > 0);
        assert.ok(existsSync(PUBLIC + src.slice(1)), src);
        assert.ok(statSync(PUBLIC + src.slice(1)).size < 300 * 1024, `${src} zu groß`);
      }
  });
}

test("App- und Web-Fassung: jede zeigt nur ihren Teil", () => {
  const send = guideOf("hinlegen")!.steps[2];
  assert.ok(send.app && send.web);
  assert.ok(stepText(send, true).includes(send.app));
  assert.ok(!stepText(send, true).includes(send.web));
  assert.ok(stepText(send, false).includes(send.web));
  assert.ok(!stepText(send, false).includes(send.app));
  const mac = guideOf("erstes-buch")!.tips.find((tip) => tip.only === "web")!;
  assert.ok(tipsFor(guideOf("erstes-buch")!, false).includes(mac));
  assert.ok(!tipsFor(guideOf("erstes-buch")!, true).includes(mac));
});

test("„So geht’s“ auf der Landing führt auf die passende Anleitung, nicht nur auf /hilfe", () => {
  for (const s of HOWTO) assert.ok(isGuide(s.href), s.href);
  assert.match(HOWTO[2].href, /^\/hilfe\/hinlegen/);
});

test("„So geht’s“ auf /funktionen führt auf die passende Anleitung", () => {
  const help = Object.fromEntries(FEATURE_GROUPS.map((g) => [g.id, g.help]));
  for (const [id, href] of Object.entries(help)) assert.ok(isGuide(href), `${id}: ${href}`);
  assert.equal(help.kamera, "/hilfe/kamera");
  assert.equal(help.hinlegen, "/hilfe/hinlegen");
});

test("Erster Start: ein Satz mit dem Weg Fotografieren → Abendstapel → Buch und einem Link in die Hilfe", () => {
  assert.equal(sentences(FIRST_HINT.text), 1, FIRST_HINT.text);
  assert.match(FIRST_HINT.text, /Abendstapel/);
  assert.notEqual(translate("en", FIRST_HINT.text), FIRST_HINT.text);
  assert.notEqual(translate("en", FIRST_HINT.link), FIRST_HINT.link);
  assert.match(FIRST_HINT.href, /^\/hilfe/);
});

test("Erster Start: der Hinweis kommt einmal, bis er weggetippt ist oder das erste Foto entsteht", () => {
  const box = new Map<string, string>();
  const store = { getItem: (k: string) => box.get(k) ?? null, setItem: (k: string, v: string) => void box.set(k, v) };
  assert.equal(hintDone(store), false);
  markHintDone(store);
  assert.equal(hintDone(store), true);
  // ohne Speicher (privates Fenster, gesperrt) lieber gar kein Hinweis als bei jedem Start
  const broken = {
    getItem: () => {
      throw new Error("gesperrt");
    },
    setItem: () => {
      throw new Error("gesperrt");
    },
  };
  assert.equal(hintDone(broken), true);
  assert.doesNotThrow(() => markHintDone(broken));
});
