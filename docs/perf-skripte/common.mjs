import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
const require = createRequire("/opt/node22/lib/node_modules/");
export const { chromium } = require("playwright");
export const instr = readFileSync(new URL("./instr.js", import.meta.url), "utf8");
export async function launch() {
  return chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--enable-precise-memory-info", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"] });
}
/** RSS aller Chromium-Prozesse (Renderer, GPU) in MB */
export function rss() {
  const out = execSync("ps -eo rss,args | grep -E 'chrom' | grep -v grep || true").toString();
  let r = 0, g = 0, b = 0;
  for (const l of out.trim().split("\n")) {
    const [kb, ...a] = l.trim().split(/\s+/); const s = a.join(" ");
    if (s.includes("--type=renderer")) r += +kb; else if (s.includes("--type=gpu-process")) g += +kb; else b += +kb;
  }
  return { rendererMB: Math.round(r / 1024), gpuMB: Math.round(g / 1024) };
}
export async function mobile(browser, { cpu = 4, w = 375, h = 812, dpr = 3 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: w < 800, hasTouch: w < 800 });
  await ctx.addInitScript(instr);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
  return { ctx, page, cdp };
}
