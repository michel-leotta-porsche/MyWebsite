// Ladeleistung je Route, mobil gedrosselt: 375px, DPR 3, CPU 4x, 150 ms / 1,6 Mbit/s
import { createRequire } from "node:module";
const require = createRequire("/opt/node22/lib/node_modules/");
const { chromium } = require("playwright");

const base = process.argv[2];
const routes = process.argv.slice(3);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--enable-precise-memory-info", ...(process.env.HTTPS_PROXY ? ["--proxy-server=" + process.env.HTTPS_PROXY, "--proxy-bypass-list=127.0.0.1;localhost"] : [])] });

async function measure(route, { warm = false, introSeen = false } = {}) {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true,
    viewport: { width: 375, height: 812 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  const reqs = new Map();
  cdp.on("Network.responseReceived", (e) => reqs.set(e.requestId, { url: e.response.url, status: e.response.status, type: e.type, t0: e.timestamp }));
  cdp.on("Network.loadingFinished", (e) => { const r = reqs.get(e.requestId); if (r) { r.bytes = e.encodedDataLength; r.t1 = e.timestamp; } });
  if (process.env.SHARE) await page.addInitScript((j) => { try { sessionStorage.setItem("fuji:mock-shares", "[" + j + "]"); } catch {} }, (await import("node:fs")).readFileSync(process.env.SHARE, "utf8"));
  await page.addInitScript((introSeen) => {
    if (introSeen) try { sessionStorage.setItem("intro", "1"); } catch {}
    window.__lcp = []; window.__cls = 0; window.__long = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lcp.push({ t: e.startTime, el: e.element ? (e.element.tagName + "." + (e.element.className?.baseVal ?? e.element.className ?? "").toString().slice(0, 60) + " " + (e.url || "").split("/").pop() + " " + (e.element.textContent || "").slice(0, 30)) : "?", size: e.size }))).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push([e.startTime, e.duration]))).observe({ type: "longtask", buffered: true });
  }, introSeen);
  if (warm) { await page.goto(base + route, { waitUntil: "load", timeout: 120000 }); await page.waitForTimeout(3000); reqs.clear(); }
  const t = Date.now();
  await page.goto(base + route, { waitUntil: "load", timeout: 120000 });
  const loadMs = Date.now() - t;
  await page.waitForTimeout(6000);
  // eine Eingabe beendet die LCP-Messung, wie im Feld
  const r = await page.evaluate(() => {
    const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0;
    const tbt = window.__long.filter(([s]) => s >= fcp).reduce((a, [, d]) => a + Math.max(0, d - 50), 0);
    const lcp = window.__lcp.at(-1);
    return { fcp, lcp: lcp?.t, lcpEl: lcp?.el, cls: window.__cls, tbt, longMax: Math.max(0, ...window.__long.map((l) => l[1])), mem: performance.memory?.usedJSHeapSize };
  });
  const list = [...reqs.values()];
  const sum = (f) => Math.round(list.filter(f).reduce((a, x) => a + (x.bytes || 0), 0) / 1024);
  const bad = list.filter((x) => x.status >= 400).map((x) => x.status + " " + x.url.split("/").pop());
  const imgs = list.filter((x) => x.type === "Image");
  console.log(JSON.stringify({ route, warm, introSeen, loadMs, ...r, kB: sum(() => true), jsKB: sum((x) => x.type === "Script"), imgKB: sum((x) => x.type === "Image"), fontKB: sum((x) => x.type === "Font"), nImg: imgs.length, imgW: Object.entries(imgs.reduce((a, x) => { const m = x.url.match(/\.(w\d+)\.jpg/); const k = m ? m[1] : x.url.includes("firebasestorage") ? "storage" : x.url.split(".").pop().slice(0, 4); a[k] = (a[k] || 0) + 1; return a; }, {})), errors: bad.slice(0, 5), nErr: bad.length, third: [...new Set(list.map((x) => new URL(x.url).host))] }));
  await ctx.close();
}
for (const route of routes) {
  await measure(route);
  await measure(route, { introSeen: true });
}
await browser.close();
