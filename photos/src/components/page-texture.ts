"use client";

import { getImageProps, type StaticImageData } from "next/image";

import { countWord, plate, type Page } from "@/content/plates";

// Zeichnet eine Buchseite auf ein Canvas, als Textur für das umblätternde Blatt in WebGL.
// Satzspiegel wie in page-view.tsx (alle Maße in cqw = Seitenbreite / 100).

const C = {
  paper: "#f6f6f2",
  ink: "#1b1c1a",
  ink2: "#5a5c56",
  cloth: "#e8a72c",
  clothDeep: "#b97a12",
  clothInk: "#3a2706",
};

const images = new Map<string, Promise<HTMLImageElement>>();
function loadImage(url: string) {
  let p = images.get(url);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    images.set(url, p);
  }
  return p;
}

/** URL in passender Breite, über denselben Loader wie next/image */
function photoUrl(src: StaticImageData, width: number) {
  return getImageProps({ src, alt: "", width: Math.min(1800, Math.round(width)) }).props.src as string;
}

let paperTile: Promise<HTMLImageElement> | null = null;
let linenTiles: Promise<HTMLImageElement[]> | null = null;

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, posY = 0.5) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / s;
  const sh = h / s;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) * posY, sw, sh, x, y, w, h);
}

function setFont(ctx: CanvasRenderingContext2D, weight: number, px: number, family: string, condensed = false) {
  ctx.font = `${weight} ${px}px ${family}`;
  // Breitenachse wie im CSS (wdth 75–78), soweit der Browser sie im Canvas kennt
  if ("fontStretch" in ctx) (ctx as CanvasRenderingContext2D & { fontStretch: string }).fontStretch = condensed ? "condensed" : "normal";
}

function track(ctx: CanvasRenderingContext2D, em: number, px: number) {
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${em * px}px`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > max && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Bildunterschrift wie <Caption>: Nummer halbfett in Tinte, Titel und Zusatz in grauer Tinte */
function caption(ctx: CanvasRenderingContext2D, no: number, x: number, bottom: number, cq: number, family: string) {
  const p = plate(no);
  const px = Math.max(11, 3.1 * cq);
  const lh = px * 1.375;
  const lines = p.note ? 2 : 1;
  const y0 = bottom - lh * lines + lh * 0.75;
  setFont(ctx, 600, px, family);
  track(ctx, 0, px);
  ctx.fillStyle = C.ink;
  ctx.fillText(String(no), x, y0);
  const nw = ctx.measureText(String(no)).width;
  setFont(ctx, 400, px, family);
  ctx.fillStyle = C.ink2;
  ctx.fillText(p.title, x + nw + 2.4 * cq, y0);
  // Zusatz eingerückt wie im HTML: 2.4cqw plus ein Zeichen
  if (p.note) ctx.fillText(p.note, x + 2.4 * cq + ctx.measureText("0").width, y0 + lh);
}

function gutter(ctx: CanvasRenderingContext2D, side: "left" | "right", W: number, H: number, cq: number) {
  const w = 14 * cq;
  const x0 = side === "left" ? W : 0;
  const x1 = side === "left" ? W - w : w;
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, "rgb(4 24 27 / 0.16)");
  g.addColorStop(0.3, "rgb(4 24 27 / 0.05)");
  g.addColorStop(1, "rgb(4 24 27 / 0)");
  ctx.fillStyle = g;
  ctx.fillRect(Math.min(x0, x1), 0, w, H);
}

async function paperBase(ctx: CanvasRenderingContext2D, W: number, H: number, scale: number) {
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);
  paperTile ??= loadImage("/textures/paper.png");
  const tile = await paperTile.catch(() => null);
  if (tile) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    const pat = ctx.createPattern(tile, "repeat");
    if (pat) {
      pat.setTransform(new DOMMatrix().scale(1 / scale));
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }
  // Vergilbung am Rand
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(1.2 * W, 1.05 * H);
  const r = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  r.addColorStop(0.72, "rgb(196 160 92 / 0)");
  r.addColorStop(1, "rgb(196 160 92 / 0.045)");
  ctx.fillStyle = r;
  ctx.fillRect(-0.5, -0.5, 1, 1);
  ctx.restore();
}

async function linen(ctx: CanvasRenderingContext2D, W: number, H: number, scale: number) {
  linenTiles ??= Promise.all([loadImage("/textures/linen-weft.png"), loadImage("/textures/linen-warp.png")]);
  const tiles = await linenTiles.catch(() => []);
  ctx.save();
  ctx.globalAlpha = 0.13;
  for (const t of tiles) {
    const pat = ctx.createPattern(t, "repeat");
    if (!pat) continue;
    pat.setTransform(new DOMMatrix().scale(1 / scale));
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

/**
 * Zeichnet eine Seite in Gerätepixeln. W, H: Seitengröße in CSS-Pixeln, dpr: Auflösung.
 * Gibt das Canvas zurück, sobald Bilder und Schrift geladen sind.
 */
export async function drawPage(page: Page, side: "left" | "right", W: number, H: number, dpr: number, compact: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.scale(dpr, dpr);
  const cq = W / 100;
  const family = getComputedStyle(document.body).fontFamily;
  await document.fonts.ready;
  ctx.textBaseline = "alphabetic";

  switch (page.kind) {
    case "cover": {
      ctx.fillStyle = C.cloth;
      ctx.fillRect(0, 0, W, H);
      await linen(ctx, W, H, dpr);
      ctx.fillStyle = "rgb(185 122 18 / 0.25)";
      ctx.fillRect(0, 0, 5 * cq, H);
      ctx.fillStyle = "rgb(185 122 18 / 0.6)";
      ctx.fillRect(5 * cq, 0, 1, H);
      // eingeklebtes Bild mit Papierrand und leichtem Schatten
      const x = 18 * cq;
      const y = 11 * cq;
      const w = 64 * cq;
      const h = w * 1.25;
      ctx.save();
      ctx.shadowColor = "rgb(58 39 6 / 0.35)";
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = C.paper;
      ctx.fillRect(x, y, w, h);
      ctx.restore();
      const img = await loadImage(photoUrl(plate(2).src, w * dpr)).catch(() => null);
      if (img) cover(ctx, img, x + 1.6 * cq, y + 1.6 * cq, w - 3.2 * cq, h - 3.2 * cq, 0.4);
      // Titel als flacher Druck
      const t = 15.5 * cq;
      const n = 4 * cq;
      const nameBase = H - 10 * cq - n * 0.25;
      const titleBase = nameBase - n * 1.1 - 3 * cq - t * 0.12;
      ctx.fillStyle = C.clothInk;
      setFont(ctx, 700, t, family, true);
      track(ctx, -0.035, t);
      ctx.fillText("Fujiventura", x, titleBase);
      setFont(ctx, 500, n, family);
      track(ctx, 0, n);
      ctx.fillText("Michel Leotta", x, nameBase);
      break;
    }
    case "endpaper":
      ctx.fillStyle = C.clothDeep;
      ctx.fillRect(0, 0, W, H);
      await linen(ctx, W, H, dpr);
      gutter(ctx, side, W, H, cq);
      break;
    case "verso":
      await paperBase(ctx, W, H, dpr);
      gutter(ctx, "left", W, H, cq);
      break;
    case "title": {
      await paperBase(ctx, W, H, dpr);
      const t = 19 * cq;
      ctx.fillStyle = C.ink;
      setFont(ctx, 700, t, family, true);
      track(ctx, -0.04, t);
      ctx.fillText("Fujiventura", 12 * cq, 40 * cq + t * 0.78);
      const s = 4.2 * cq;
      setFont(ctx, 400, s, family);
      track(ctx, 0, s);
      wrap(ctx, `${countWord} Fotografien von Fuerteventura`, 60 * cq).forEach((l, i) =>
        ctx.fillText(l, 12 * cq, 40 * cq + t * 0.86 + 5 * cq + s * (0.9 + i * 1.375)),
      );
      setFont(ctx, 400, 3.4 * cq, family);
      ctx.fillStyle = C.ink2;
      ctx.fillText("Michel Leotta", 12 * cq, H - 12 * cq - 3.4 * cq * 0.25);
      gutter(ctx, side, W, H, cq);
      break;
    }
    case "caption":
      await paperBase(ctx, W, H, dpr);
      caption(ctx, page.no, 12 * cq, H - 12 * cq, cq, family);
      gutter(ctx, side, W, H, cq);
      break;
    case "plate": {
      await paperBase(ctx, W, H, dpr);
      const p = plate(page.no);
      const landscape = p.src.width > p.src.height;
      let box: [number, number, number, number];
      if (compact && landscape) box = [0, H / 2 - 40 * cq, W, (W * 2) / 3];
      else if (page.withCaption) box = [0, 0, W, H - (compact ? 17 : 15) * cq];
      else box = [0, 0, W, H];
      const img = await loadImage(photoUrl(p.src, box[2] * dpr * (landscape ? 1.5 : 1))).catch(() => null);
      if (img) cover(ctx, img, ...box);
      if (page.withCaption) {
        if (compact && landscape) caption(ctx, page.no, 8 * cq, H / 2 + 30 * cq + Math.max(11, 3.1 * cq) * 1.4, cq, family);
        else caption(ctx, page.no, 8 * cq, H - 5 * cq, cq, family);
      }
      gutter(ctx, side, W, H, cq);
      break;
    }
    case "double": {
      await paperBase(ctx, W, H, dpr);
      const p = plate(page.no);
      const hb = H - 15 * cq;
      const img = await loadImage(photoUrl(p.src, 2 * W * dpr)).catch(() => null);
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, W, hb);
        ctx.clip();
        cover(ctx, img, page.half === "left" ? 0 : -W, 0, 2 * W, hb);
        ctx.restore();
      }
      if (page.half === "right") caption(ctx, page.no, 8 * cq, H - 5 * cq, cq, family);
      gutter(ctx, side, W, H, cq);
      break;
    }
    case "colophon": {
      await paperBase(ctx, W, H, dpr);
      const px = Math.max(11, 3.1 * cq);
      const lh = px * 1.375;
      const lines: [string, boolean][] = [
        ["Fujiventura", true],
        [`${countWord} Fotografien, aufgenommen auf Fuerteventura mit einer Fuji.`, false],
        ["Fotografie und Gestaltung: Michel Leotta", false],
        ["Gesetzt in Bricolage Grotesque.", false],
        ["© 2026 Michel Leotta", false],
      ];
      // von unten nach oben setzen, wie der Block im HTML unten bündig steht
      const blocks = lines.map(([text, strong]) => {
        setFont(ctx, strong ? 600 : 400, px, family);
        return { strong, rows: wrap(ctx, text, 66 * cq) };
      });
      const total = blocks.reduce((a, b) => a + b.rows.length * lh, 0) + (blocks.length - 1) * 2.4 * cq;
      let y = H - 12 * cq - total + lh * 0.75;
      for (const b of blocks) {
        setFont(ctx, b.strong ? 600 : 400, px, family);
        ctx.fillStyle = b.strong ? C.ink : C.ink2;
        for (const r of b.rows) {
          ctx.fillText(r, 12 * cq, y);
          y += lh;
        }
        y += 2.4 * cq;
      }
      gutter(ctx, side, W, H, cq);
      break;
    }
  }
  return canvas;
}
