import { launch, mobile, rss } from "./common.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
const base = "http://127.0.0.1:4301";
const mode = process.argv[2] ?? "30";
const browser = await launch();
const { ctx, page, cdp } = await mobile(browser, {});
const out = {};
page.on("pageerror", (e) => console.error("pageerror", e.message));
await page.goto(base + "/neu", { waitUntil: "load" });
await page.getByText("Fotos hier hineinziehen").waitFor({ timeout: 30000 });
const urls = mode === "big"
  ? ["bambus", "bruecke", "fenster", "fisch", "hirsche", "jizo", "leuchtreklame", "neujahrsfahnen", "ramen", "reiher"].map((n) => `/fake-big/${n}.jpg`)
  : [...["01-schild-am-meer","02-palme","03-strand","04-bougainvillea","05-kaktus-dach","06-mittagsblume","07-wolfsmilch","08-drachenbaum","09-rettungsturm","10-stuhl","11-felsbogen","12-weihnachtsstern","13-trompetenblume","14-seetraube","15-hunde","blumentopf"].map((n) => `/photos/${n}.jpg`),
     ...["bambus","bruecke","fenster","fisch","hirsche","jizo","leuchtreklame","neujahrsfahnen","ramen","reiher","sake-saeule","sake-saeulen","stadt","torii"].map((n) => `/photos/japan/${n}.jpg`)];
// RSS-Spitze während des Einlesens
let peak = { rendererMB: 0, gpuMB: 0 };
const sampler = setInterval(() => { const r = rss(); if (r.rendererMB > peak.rendererMB) peak = r; }, 200);
await page.evaluate(() => window.__start());
const t0 = Date.now();
await page.evaluate(async (urls) => {
  const dt = new DataTransfer();
  for (const u of urls) { const b = await (await fetch(u)).blob(); dt.items.add(new File([b], u.split("/").pop(), { type: "image/jpeg" })); }
  const target = document.querySelector("header");
  for (const type of ["dragenter", "dragover", "drop"]) target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }));
}, urls);
// die Werkbank zeigt keinen Messwert mehr an (#43), die Zeit steht als performance.measure bereit
await page.waitForFunction(() => performance.getEntriesByName("fuji:erstentwurf").length > 0, null, { timeout: 600000 });
const appSays = await page.evaluate(() => `Erstentwurf nach ${(performance.getEntriesByName("fuji:erstentwurf")[0].duration / 1000).toFixed(1)} s`);
out.ingest = { photos: urls.length, wallS: (Date.now() - t0) / 1000, appSays, ...(await page.evaluate(() => window.__stop())), peak };
clearInterval(sampler);
out.afterIngest = rss();
if (mode === "big") { console.log(JSON.stringify(out, null, 1)); await browser.close(); process.exit(0); }

// Übersicht: einmal durchscrollen
await page.waitForTimeout(2000);
await page.evaluate(() => window.__start());
await page.evaluate(async () => {
  const H = document.documentElement.scrollHeight;
  await new Promise((res) => { const step = () => { window.scrollBy(0, 40); if (window.scrollY + innerHeight < H - 5) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });
});
await page.waitForTimeout(1500);
out.overview = { ...(await page.evaluate(() => window.__stop())), spreads: await page.locator("ol > li").count(), ...rss() };
// Quellbreite der Bilder in der Übersicht
out.overviewImgs = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll("ol img")];
  const w = imgs.map((i) => [i.naturalWidth, Math.round(i.getBoundingClientRect().width * devicePixelRatio)]);
  return { n: imgs.length, avgNatural: Math.round(w.reduce((a, x) => a + x[0], 0) / w.length), avgShown: Math.round(w.reduce((a, x) => a + x[1], 0) / w.length) };
});

const visibleItem = () => page.evaluate(() => {
  for (const b of document.querySelectorAll("[role=dialog] [data-stage-layer] button[aria-pressed]")) {
    const r = b.getBoundingClientRect(); const x = r.x + r.width / 2, y = r.y + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    if (hit === b || b.contains(hit)) return { x, y, label: b.getAttribute("aria-label") };
  }
  return null;
});
// Bühne: Doppelseite 2 gestalten
await page.evaluate(() => scrollTo(0, 0));
await page.getByRole("button", { name: "Doppelseite 2 gestalten" }).first().click();
await page.getByRole("dialog").waitFor();
await page.waitForTimeout(1500);
await page.screenshot({ path: '/tmp/claude-0/perf/stage.png' });
let vi = await visibleItem();
if (!vi) { await page.getByRole('button', { name: 'Rechte Seite' }).click(); await page.waitForTimeout(900); vi = await visibleItem(); }
console.error(await page.evaluate(() => [...document.querySelectorAll('[role=dialog]')].map(d => d.getAttribute('aria-label') + ' ' + d.querySelectorAll('[data-stage-layer] button').length)));
out.stageItem = vi?.label;
const cx = vi.x, cy = vi.y;
console.error(JSON.stringify(out));
// ziehen (Maus, damit kein Antippen-vorher nötig ist)
await page.mouse.move(cx, cy); await page.mouse.down();
await page.evaluate(() => window.__start());
for (let i = 0; i < 60; i++) { await page.mouse.move(cx + Math.sin(i / 6) * 60, cy + i * 1.5); await page.waitForTimeout(16); }
out.drag = await page.evaluate(() => window.__stop());
await page.mouse.up();
await page.waitForTimeout(800);
// Zuschneiden: Doppelklick, dann Bild verschieben
let vi2 = await visibleItem();
if (!vi2) { await page.getByRole('button', { name: 'Rechte Seite' }).click(); await page.waitForTimeout(900); vi2 = await visibleItem(); }
await page.mouse.dblclick(vi2.x, vi2.y);
await page.waitForTimeout(800);
const crop = await page.locator("img.cursor-move").first().boundingBox().catch(() => null);
if (crop) {
  const x = crop.x + crop.width / 2, y = crop.y + crop.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.evaluate(() => window.__start());
  for (let i = 0; i < 60; i++) { await page.mouse.move(x + Math.sin(i / 5) * 40, y + Math.cos(i / 5) * 30); await page.waitForTimeout(16); }
  out.crop = await page.evaluate(() => window.__stop());
  await page.mouse.up();
  await page.getByRole("button", { name: "Fertig", exact: true }).click();
} else out.crop = "kein Zuschneide-Bild gefunden";
await page.waitForTimeout(800);
// Tippen: Überschrift hinzufügen und 40 Zeichen schreiben
console.error(JSON.stringify({drag: out.drag, crop: out.crop}));
await page.screenshot({ path: "/tmp/claude-0/perf/stage2.png" });
const roles = page.locator("button", { hasText: /^\+ / });
await roles.first().click();
await page.waitForTimeout(600);
await page.evaluate(() => window.__start());
await page.keyboard.type("Ein Sommer am Meer mit vielen Freunden.", { delay: 60 });
out.typing = await page.evaluate(() => window.__stop());
out.stageMem = rss();
console.error(JSON.stringify({typing: out.typing, stageMem: out.stageMem}));
// Gastlink anlegen: Bühne schließen, Hinlegen für …
await page.keyboard.press("Escape"); await page.keyboard.press("Escape");
await page.waitForTimeout(1500);
if (await page.getByRole("dialog").count()) await page.getByText("Zur Übersicht").first().click().catch((e) => console.error("close", e.message));
await page.waitForTimeout(1500);
await page.getByRole("button", { name: "Hinlegen für …" }).click();
await page.locator("#share-to").fill("Lena");
await page.getByRole("button", { name: "Hinlegen", exact: true }).click();
await page.waitForTimeout(1500);
// Freigabe samt Fotos sichern: Blob-URLs gelten nur in dieser Seite, deshalb als Dateien ablegen
const share = await page.evaluate(async () => {
  const s = JSON.parse(sessionStorage.getItem("fuji:mock-shares") ?? "[]").at(-1);
  if (!s) return null;
  const files = {};
  for (const p of s.book.photos) for (const k of ["src", "thumb", "large"]) {
    const u = p[k]; if (!u?.startsWith("blob:") || files[u]) continue;
    const b = await (await fetch(u)).arrayBuffer();
    let bin = ""; const a = new Uint8Array(b); for (let i = 0; i < a.length; i += 0x8000) bin += String.fromCharCode(...a.subarray(i, i + 0x8000));
    files[u] = { name: `${p.key}-${k}.jpg`, b64: btoa(bin) };
  }
  return { s, files };
});
if (share) {
  console.error('share ok');
  mkdirSync("/tmp/mock-out/fake-storage", { recursive: true });
  let json = JSON.stringify(share.s);
  for (const [u, f] of Object.entries(share.files)) { writeFileSync(`/tmp/mock-out/fake-storage/${f.name}`, Buffer.from(f.b64, "base64")); json = json.split(u).join(`${base}/fake-storage/${f.name}`); }
  writeFileSync("/tmp/claude-0/perf/share.json", json);
  out.share = { token: share.s.token, files: Object.keys(share.files).length };
}
console.log(JSON.stringify(out));
await browser.close();
