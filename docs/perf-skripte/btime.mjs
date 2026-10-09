import { launch } from "./common.mjs";
import { createRequire } from "node:module";
const require = createRequire("/opt/node22/lib/node_modules/");
const { chromium } = require("playwright");
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--proxy-server=" + process.env.HTTPS_PROXY, "--proxy-bypass-list=127.0.0.1"] });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 375, height: 812 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Network.enable");
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 2e5, uploadThroughput: 93750 });
const t = {}; let t0;
cdp.on("Network.requestWillBeSent", (e) => { t0 ??= e.timestamp; t[e.requestId] = { url: e.request.url, start: e.timestamp - t0 }; });
cdp.on("Network.loadingFinished", (e) => { if (t[e.requestId]) { t[e.requestId].end = e.timestamp - t0; t[e.requestId].kB = Math.round(e.encodedDataLength / 1024); } });
await page.goto(process.argv[2], { waitUntil: "load" });
await page.waitForTimeout(8000);
for (const r of Object.values(t).sort((a, b) => a.start - b.start)) {
  const u = new URL(r.url); const n = (u.host.includes("127.0.0.1") ? "" : u.host) + u.pathname.slice(-48);
  console.log(r.start.toFixed(2).padStart(6), (r.end ?? NaN).toFixed(2).padStart(6), String(r.kB ?? "").padStart(5), n);
}
await browser.close();
