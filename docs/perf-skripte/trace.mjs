import { launch, mobile } from "./common.mjs";
const base = "http://127.0.0.1:4300";
const browser = await launch();
for (const q of ["", "?ohne=biegung"]) {
  const { ctx, page, cdp } = await mobile(browser, {});
  await page.addInitScript(() => sessionStorage.setItem("intro", "1"));
  await page.goto(base + "/" + q + "#fuerteventura", { waitUntil: "load" });
  await page.waitForTimeout(4000);
  const events = [];
  cdp.on("Tracing.dataCollected", (e) => events.push(...e.value));
  await cdp.send("Tracing.start", { traceConfig: { includedCategories: ["devtools.timeline", "disabled-by-default-devtools.timeline", "blink", "gpu"] }, transferMode: "ReportEvents" });
  for (let i = 0; i < 6; i++) { await page.keyboard.press("ArrowRight"); await page.waitForTimeout(1400); }
  const done = new Promise((r) => cdp.once("Tracing.tracingComplete", r));
  await cdp.send("Tracing.end"); await done;
  const main = events.find((e) => e.name === "thread_name" && e.args?.name === "CrRendererMain");
  const tid = main?.tid; const pid = main?.pid;
  const agg = new Map();
  for (const e of events) {
    if (e.tid !== tid || e.pid !== pid || e.ph !== "X" || !e.dur) continue;
    agg.set(e.name, (agg.get(e.name) || 0) + e.dur);
  }
  console.log("== " + (q || "WebGL") + "\n" + [...agg].sort((a, b) => b[1] - a[1]).slice(0, 18).map(([k, v]) => `${Math.round(v / 1000)} ms ${k}`).join("\n"));
  await ctx.close();
}
await browser.close();
