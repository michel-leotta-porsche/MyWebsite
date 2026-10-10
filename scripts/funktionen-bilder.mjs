// Bildschirmfotos für /funktionen (#267) neu aufnehmen. Ablauf:
//   NEXT_PUBLIC_FUJI_MOCK=1 npm run build && npx next start -p 3100
//   node scripts/funktionen-bilder.mjs de /tmp/bilder/de   (dann en)
// Danach die PNGs auf 585 px Breite als JPEG (Qualität 80) nach public/funktionen/<lang>/ legen; fuji.png bis 770 px Höhe beschneiden
// (darunter steht der Platzhalter-Hinweis des Beispielbuchs). Braucht Playwright (global installiert).
// Im Testmodus heißt der Nutzer „Michel Test“ (src/lib/use-user.ts); für die Bilder dort vorübergehend „Michel Leotta“ eintragen.
// Das Kaktusfoto bekommt die Einstellungen eines Lightroom-Presets eingebettet, damit der Lightroom-Zettel erscheint.
import { execSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
const { chromium, devices } = createRequire(import.meta.url)(
  execSync("npm root -g").toString().trim() + "/playwright",
);
const dir = path.join(import.meta.dirname, "../public/photos/");
const [, , lang, out] = process.argv;
fs.mkdirSync(out, { recursive: true });
// XMP-Block (APP1) mit den Werten von public/presets/kyoto-temple.xmp, umbenannt
const xmp = fs
  .readFileSync(dir + "../presets/kyoto-temple.xmp", "utf8")
  .replaceAll("Kyoto Temple", "Warmer Nachmittag");
const payload = Buffer.concat([
  Buffer.from("http://ns.adobe.com/xap/1.0/\0", "binary"),
  Buffer.from(
    '<?xpacket begin="\ufeff" id="W5M0MpCehiHzreSzNTczkc9d"?>' +
      xmp +
      '<?xpacket end="w"?>',
    "utf8",
  ),
]);
const seg = Buffer.concat([
  Buffer.from([
    0xff,
    0xe1,
    (payload.length + 2) >> 8,
    (payload.length + 2) & 255,
  ]),
  payload,
]);
const jpg = fs.readFileSync(dir + "05-kaktus-dach.jpg");
const xmpPhoto = out + "/05-kaktus-dach.jpg";
fs.writeFileSync(
  xmpPhoto,
  Buffer.concat([jpg.subarray(0, 2), seg, jpg.subarray(2)]),
);
const pick = [
  "02-palme.jpg",
  "03-strand.jpg",
  "04-bougainvillea.jpg",
  "06-mittagsblume.jpg",
  "07-wolfsmilch.jpg",
  "08-drachenbaum.jpg",
  "09-rettungsturm.jpg",
  "10-stuhl.jpg",
  "01-schild-am-meer.jpg",
  "12-weihnachtsstern.jpg",
  "14-seetraube.jpg",
].map((f) => dir + f);
const files = [xmpPhoto, ...pick];
const L = (de, en) => (lang === "de" ? de : en);
(async () => {
  const b = await chromium.launch();
  const ctx = () =>
    b.newContext({
      ...devices["iPhone 13"],
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      locale: L("de-DE", "en-US"),
    });
  let c = await ctx();
  let p = await c.newPage();
  p.on("pageerror", (e) => console.log("ERR", e.message));
  const shot = async (n, top = 0, h = 844) => {
    await p.waitForTimeout(900);
    await p.evaluate(() => document.activeElement?.blur?.());
    await p.screenshot({
      path: `${out}/${n}.png`,
      clip: { x: 0, y: top, width: 390, height: Math.min(h, 844 - top) },
    });
    console.log("shot", n);
  };
  const btn = (name) => p.getByRole("button", { name });
  await p.goto("http://localhost:3100/zimmer");
  await p.waitForTimeout(2500);
  await p
    .locator('input[type=file][accept^="image"]')
    .first()
    .setInputFiles(files);
  await p.waitForTimeout(15000);
  await p
    .getByLabel(L("Titel", "Title"), { exact: true })
    .first()
    .fill("Fuerteventura");
  await p.waitForTimeout(1200);
  await shot("einband", 0, 700);
  // Doppelseiten
  await p.evaluate(() => {
    const h = [...document.querySelectorAll("h2,h3")].find((e) =>
      /Doppelseiten|spreads/.test(e.textContent),
    );
    window.scrollTo(0, h.getBoundingClientRect().top + scrollY - 24);
  });
  await shot("fotos", 0, 700);
  // anderes Layout
  const lay = btn(
    new RegExp(
      L("Anderes Layout für Doppelseite 3", "Another layout for spread 3"),
    ),
  );
  await lay.scrollIntoViewIfNeeded();
  await p.evaluate(() => window.scrollBy(0, -90));
  await lay.click();
  await p.waitForTimeout(1200);
  await shot("layouts", 0, 620);
  // Gestalten
  await btn(L("Doppelseite 2 gestalten", "Design spread 2")).click();
  await p.waitForTimeout(2500);
  await shot("gestalten", 0, 844);
  await btn(L("Zur Übersicht", "Back to overview"))
    .first()
    .click()
    .catch(() => console.log("noback"));
  await p.waitForTimeout(1500);
  // Looks
  await btn(
    new RegExp(L("Fotos von Doppelseite 2 bearbe", "Edit photos of spread 2")),
  ).click();
  await p.waitForTimeout(3500);
  await p.getByRole("tab", { name: "Looks" }).click();
  await p.waitForTimeout(1200);
  await p
    .locator("button:visible", { hasText: L("Sommer", "Summer") })
    .first()
    .click()
    .catch(() => console.log("nosommer"));
  await p.waitForTimeout(2500);
  await shot("looks", 0, 844);
  await btn(L("Abbrechen", "Cancel")).first().click();
  await p.waitForTimeout(1500);
  const discard = btn(new RegExp(L("Verwerfen", "Discard")));
  if (await discard.count()) await discard.first().click();
  await p.waitForTimeout(800);
  // Lightroom-Zettel im Leser
  await p.evaluate(() => window.scrollTo(0, 0));
  await btn(L("Ansehen", "View")).first().click();
  await p.waitForTimeout(3500);
  const rz = p.getByRole("button", { name: /Rezept zu|Recipe/ });
  for (let i = 0; i < 10 && !(await rz.count()); i++) {
    await p.keyboard.press("ArrowRight");
    await p.waitForTimeout(1200);
  }
  await rz
    .first()
    .click()
    .catch(() => console.log("norezept"));
  await p.waitForTimeout(2500);
  await shot("lightroom", 0, 844);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(800);
  await btn(new RegExp(L("zurück", "back"), "i"))
    .first()
    .click()
    .catch(() => {});
  await p.waitForTimeout(1500);
  console.log(p.url());
  // Hinlegen
  await p.evaluate(() => window.scrollTo(0, 0));
  await p
    .getByRole("button", { name: new RegExp(L("^Hinlegen", "^Hand")) })
    .last()
    .click();
  await p.waitForTimeout(1500);
  const who = p.getByLabel(L("Für wen?", "For whom?"));
  await who.fill("Jana");
  const cb = p.locator("input[type=checkbox]:visible");
  if (await cb.count()) await cb.first().check();
  await btn(L("Link erstellen", "Create link")).click();
  await p.waitForTimeout(1500);
  await who.fill("Paul");
  await btn(L("Link erstellen", "Create link")).click();
  await p.waitForTimeout(1500);
  await shot("link", 200, 644);
  await btn(L("Link für Paul zurückziehen", "Withdraw link for Paul")).click();
  await p.waitForTimeout(700);
  await shot("zurueckziehen", 200, 644);
  const tok = await p.evaluate(
    () =>
      JSON.parse(sessionStorage.getItem("fuji:mock-shares")).find(
        (x) => x.to === "Jana",
      ).token,
  );
  await p.keyboard.press("Escape");
  await p.waitForTimeout(800);
  await p.evaluate((t) => window.next.router.push("/b?t=" + t), tok);
  await p.waitForTimeout(4000);
  await btn(L("Buch aufschlagen", "Open book")).click();
  await p.waitForTimeout(3500);
  for (let i = 0; i < 4; i++) {
    await p.keyboard.press("ArrowRight");
    await p.waitForTimeout(1200);
  }
  const ear = p
    .getByRole("button", {
      name: new RegExp(L("^Eselsohr bei Tafel", "^Dog-ear")),
    })
    .last();
  await ear.focus();
  await p.keyboard.press("Enter");
  await p.waitForTimeout(1800);
  await shot("eselsohr", 100, 744);
  await p.waitForTimeout(6000);
  await btn(new RegExp(L("^Zettel", "^Note")))
    .first()
    .click();
  await p.waitForTimeout(1500);
  await p
    .locator("textarea:visible")
    .first()
    .fill(
      L("Da will ich nächsten Sommer hin!", "I want to go there next summer!"),
    );
  await p.waitForTimeout(900);
  await shot("zettel", 100, 744);
  await c.close();
  // Fotostudio
  c = await ctx();
  p = await c.newPage();
  await p.goto("http://localhost:3100/zimmer");
  await p.waitForTimeout(2500);
  await p
    .getByRole("region", { name: L("Fotostudio", "Photo studio") })
    .locator("input[type=file]")
    .setInputFiles(
      [
        "02-palme.jpg",
        "05-kaktus-dach.jpg",
        "09-rettungsturm.jpg",
        "04-bougainvillea.jpg",
        "03-strand.jpg",
        "07-wolfsmilch.jpg",
      ].map((f) => dir + f),
    );
  await p.waitForTimeout(8000);
  await shot("fotostudio", 0, 844);
  await c.close();
  // Fuji-Rezept im Beispielbuch
  c = await ctx();
  p = await c.newPage();
  await p.goto("http://localhost:3100/beispiel#fuerteventura");
  await p.waitForTimeout(3500);
  for (let i = 0; i < 5; i++) {
    await p.keyboard.press("ArrowRight");
    await p.waitForTimeout(1000);
  }
  await p
    .getByRole("button", { name: /Rezept zu|Recipe/ })
    .first()
    .click();
  await p.waitForTimeout(2500);
  await shot("fuji", 0, 844);
  await b.close();
})();
