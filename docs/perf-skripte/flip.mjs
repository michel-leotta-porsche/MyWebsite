import { launch, mobile, rss } from "./common.mjs";
const base = process.argv[2] ?? "http://127.0.0.1:4300";
const browser = await launch();
const confs = [
  { name: "Handy CPU4x WebGL", w: 375, h: 812, dpr: 3, cpu: 4, q: "" },
  { name: "Handy CPU4x flach (ohne=biegung)", w: 375, h: 812, dpr: 3, cpu: 4, q: "?ohne=biegung" },
  { name: "Handy CPU1x WebGL", w: 375, h: 812, dpr: 3, cpu: 1, q: "" },
  { name: "Handy CPU1x flach", w: 375, h: 812, dpr: 3, cpu: 1, q: "?ohne=biegung" },
  { name: "Desktop 1440 CPU1x WebGL", w: 1440, h: 900, dpr: 2, cpu: 1, q: "" },
  { name: "Desktop 1440 CPU1x flach", w: 1440, h: 900, dpr: 2, cpu: 1, q: "?ohne=biegung" },
];
for (const conf of confs) {
  const { ctx, page } = await mobile(browser, conf);
  await page.addInitScript(() => sessionStorage.setItem("intro", "1"));
  await page.goto(base + "/" + conf.q + "#fuerteventura", { waitUntil: "load" });
  await page.waitForTimeout(4000);
  const gl = await page.evaluate(() => !!document.querySelector("canvas") && [...document.querySelectorAll("canvas")].map((c) => `${c.width}x${c.height}`));
  // erstes Blatt: Einband öffnen und Texturen anlegen lassen
  await page.evaluate(() => window.__start());
  const flips = 8;
  for (let i = 0; i < flips; i++) {
    if (conf.w < 800) await page.keyboard.press("ArrowRight");
    else await page.mouse.wheel(0, 900);
    await page.waitForTimeout(1400);
  }
  const r = await page.evaluate(() => window.__stop());
  // Leerlauf: läuft etwas weiter, obwohl niemand blättert?
  await page.evaluate(() => window.__start());
  await page.waitForTimeout(3000);
  const idle = await page.evaluate(() => window.__stop());
  console.log(JSON.stringify({ conf: conf.name, canvases: gl, flip: r, idle: { fps: idle.fps, longMs: idle.longMs, drawImage: idle.drawImage }, ...rss() }));
  await ctx.close();
}
if (process.env.SKIP_IDLE) { await browser.close(); process.exit(0); }
// Startseite im Leerlauf: Palmenschatten und Stapel
{
  const { ctx, page } = await mobile(browser, {});
  await page.addInitScript(() => sessionStorage.setItem("intro", "1"));
  await page.goto(base + "/", { waitUntil: "load" });
  await page.waitForTimeout(3000);
  await page.evaluate(() => window.__start());
  await page.waitForTimeout(4000);
  const idle = await page.evaluate(() => window.__stop());
  const anims = await page.evaluate(() => document.getAnimations().map((a) => a.animationName || a.constructor.name).slice(0, 10));
  console.log(JSON.stringify({ conf: "Startseite Leerlauf Handy", idle, anims, ...rss() }));
  await ctx.close();
}
await browser.close();
