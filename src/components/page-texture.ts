"use client";

import { getImageProps, type StaticImageData } from "next/image";

import { plateOf, type BookData, type FontKey, type Page } from "@/content/books";
import { CAPTION, LEADING, layoutPage, stackFromBottom, type Layout } from "@/content/layout";
import { EDGE, FOLD_STOPS, FOLD_WIDTH, foldColor, PRINT } from "@/lib/book-look";

// Zeichnet eine Buchseite auf ein Canvas, als Textur für das umblätternde Blatt in WebGL.
// Dieselbe Elementliste wie page-view.tsx (layoutPage), alle Maße in cqw = Seitenbreite / 100.

const C = {
  paper: "#eee9df",
  ink: "#1b1c1a",
  ink2: "#5a5c56",
};

// Ein fertig entpacktes Bild: ImageBitmap, wo der Browser es kann, sonst das img-Element
type Pic = HTMLImageElement | ImageBitmap;
const widthOf = (p: Pic) => ("naturalWidth" in p ? p.naturalWidth : p.width);
const heightOf = (p: Pic) => ("naturalHeight" in p ? p.naturalHeight : p.height);

// Nur die zuletzt gezeichneten Fotos bleiben im Speicher. Ohne Grenze hielt jede besuchte Seite ihr
// entpacktes Foto fest (etwa 5 MB bei 960px), und WebKit beendete auf dem iPhone nach einigen Seiten den Tab.
const MAX_IMAGES = 8;
const images = new Map<string, Promise<Pic>>();

/** Wie bisher: img-Element laden und vor der Rückgabe entpacken */
function viaElement(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    // Fotos aus Firebase Storage: mit CORS laden, sonst darf WebGL sie nicht als Textur nutzen
    if (/^https?:/.test(url)) img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => img.decode().then(
      () => resolve(img),
      () => resolve(img),
    );
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Lädt ein Bild und entpackt es außerhalb des Hauptthreads (createImageBitmap aus den Dateidaten).
 * Ein img-Element darf der Browser nach decode() wieder verwerfen, dann entpackt drawImage es mitten
 * im Blättern neu; eine ImageBitmap bleibt entpackt, bis sie geschlossen wird.
 */
async function decodeImage(url: string): Promise<Pic> {
  if (typeof createImageBitmap === "function") {
    try {
      const res = await fetch(url, { mode: "cors", credentials: "omit" });
      if (res.ok) return await createImageBitmap(await res.blob());
    } catch {
      // z. B. ohne CORS-Freigabe: unten über das img-Element
    }
  }
  return viaElement(url);
}

function loadImage(url: string) {
  let p = images.get(url);
  if (p) {
    // zuletzt benutzt: ans Ende der Reihenfolge
    images.delete(url);
    images.set(url, p);
  } else {
    p = decodeImage(url);
    images.set(url, p);
    while (images.size > MAX_IMAGES) {
      const [oldest, gone] = images.entries().next().value!;
      images.delete(oldest);
      // Speicher der Bitmap freigeben; mit Abstand, falls eine Seite gerade noch mit ihr zeichnet
      gone.then((b) => "close" in b && setTimeout(() => b.close(), 5000), () => {});
    }
  }
  return p;
}

/** URL in passender Breite, über denselben Loader wie next/image */
function photoUrl(src: StaticImageData, width: number) {
  return getImageProps({ src, alt: "", width: Math.min(1800, Math.round(width)) }).props.src as string;
}

// Kacheln bleiben als img-Element: wenige, kleine Dateien, die nie aus dem Speicher fallen
let paperTile: Promise<HTMLImageElement | null> | null = null;
let linenTiles: Promise<HTMLImageElement[]> | null = null;
const paper = () => (paperTile ??= viaElement("/textures/paper.webp").catch(() => null));
const linenPair = () =>
  (linenTiles ??= Promise.all([viaElement("/textures/linen-weft.webp"), viaElement("/textures/linen-warp.webp")]).catch(() => []));


function contain(ctx: CanvasRenderingContext2D, img: Pic, x: number, y: number, w: number, h: number) {
  const s = Math.min(w / widthOf(img), h / heightOf(img));
  const dw = widthOf(img) * s;
  const dh = heightOf(img) * s;
  // unten bündig wie object-bottom
  ctx.drawImage(img, x + (w - dw) / 2, y + h - dh, dw, dh);
}

/** Schriftname hinter der CSS-Variable einer Textrahmen-Schrift (Canvas kennt keine var()) */
function fontFamilyOf(font: FontKey) {
  const name = { grotesk: "--font-bricolage", serif: "--font-serif", mono: "--font-mono", hand: "--font-hand" }[font];
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "serif";
}

function setFont(ctx: CanvasRenderingContext2D, weight: number, px: number, family: string, condensed = false) {
  // Breitenachse wie im CSS (wdth 75–78): Safari kennt ctx.fontStretch nicht, versteht sie aber in der Kurzschreibweise;
  // ohne sie setzte Safari den Titel breit, und die Schrift sprang beim Umblättern
  ctx.font = `${weight} ${condensed ? "condensed " : ""}${px}px ${family}`;
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

/** Grundlinie einer Zeile, deren Zeilenkasten bei top beginnt (wie CSS line-height) */
const baseline = (top: number, px: number, lh: number) => top + (lh * px - px) / 2 + px * 0.8;

function caption(
  ctx: CanvasRenderingContext2D,
  book: BookData,
  no: number,
  x: number,
  top: number,
  align: "left" | "right",
  cq: number,
  family: string,
  stack = false,
  maxW = Infinity,
) {
  const p = plateOf(book, no);
  const px = Math.max(11, CAPTION * cq);
  const lh = px * LEADING;
  const y0 = baseline(top, px, LEADING);
  if (stack) {
    // Nummer, darunter Titel und Zusatz, umbrochen auf die Breite des Streifens
    setFont(ctx, 600, px, family);
    track(ctx, 0, px);
    ctx.fillStyle = C.ink;
    ctx.fillText(String(no), x, y0);
    setFont(ctx, 400, px, family);
    ctx.fillStyle = C.ink2;
    const rows = [...wrap(ctx, p.title, maxW), ...(p.note ? wrap(ctx, p.note, maxW) : [])];
    rows.forEach((r, i) => ctx.fillText(r, x, y0 + lh * (i + 1)));
    return;
  }
  setFont(ctx, 600, px, family);
  track(ctx, 0, px);
  const nw = ctx.measureText(String(no)).width;
  setFont(ctx, 400, px, family);
  const gap = 0.6 * px;
  const tw = ctx.measureText(p.title).width;
  const start = align === "left" ? x : x - (nw + gap + tw);
  setFont(ctx, 600, px, family);
  ctx.fillStyle = C.ink;
  ctx.fillText(String(no), start, y0);
  setFont(ctx, 400, px, family);
  ctx.fillStyle = C.ink2;
  ctx.fillText(p.title, start + nw + gap, y0);
  if (p.note) {
    const w = ctx.measureText(p.note).width;
    ctx.fillText(p.note, align === "left" ? x : x - w, y0 + lh);
  }
}

function gutter(ctx: CanvasRenderingContext2D, side: "left" | "right", W: number, H: number, cq: number) {
  const w = FOLD_WIDTH * cq;
  const x0 = side === "left" ? W : 0;
  const x1 = side === "left" ? W - w : w;
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  for (const [at, a] of FOLD_STOPS) g.addColorStop(at, foldColor(a));
  ctx.fillStyle = g;
  ctx.fillRect(Math.min(x0, x1), 0, w, H);
}

function paperBase(ctx: CanvasRenderingContext2D, W: number, H: number, scale: number, tile: HTMLImageElement | null) {
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);
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
  r.addColorStop(1, "rgb(196 160 92 / 0.03)");
  ctx.fillStyle = r;
  ctx.fillRect(-0.5, -0.5, 1, 1);
  ctx.restore();
}

function linen(ctx: CanvasRenderingContext2D, W: number, H: number, scale: number, tiles: HTMLImageElement[]) {
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

type Loaded = { imgs: (Pic | null)[]; tile: HTMLImageElement | null; linenTiles: HTMLImageElement[] };

/** Alles, was eine Seite braucht, laden und entpacken; das Zeichnen danach wartet auf nichts mehr */
async function loadLayout(book: BookData, layout: Layout, W: number, dpr: number): Promise<Loaded> {
  const cq = W / 100;
  const [imgs, tile, linenTiles] = await Promise.all([
    Promise.all(
      layout.els.map((el) => {
        if (el.t === "img") return loadImage(photoUrl(plateOf(book, el.no).src, el.w * cq * dpr)).catch(() => null);
        if (el.t === "thumb") return loadImage(photoUrl(plateOf(book, el.no).thumb, el.w * cq * dpr)).catch(() => null);
        return null;
      }),
    ),
    paper(),
    layout.linen ? linenPair() : Promise.resolve([]),
  ]);
  return { imgs, tile, linenTiles };
}

function drawLayout(
  ctx: CanvasRenderingContext2D,
  book: BookData,
  layout: Layout,
  side: "left" | "right",
  W: number,
  H: number,
  dpr: number,
  { imgs, tile, linenTiles }: Loaded,
) {
  const cq = W / 100;
  const family = getComputedStyle(document.body).fontFamily;
  if (layout.bg === "paper") paperBase(ctx, W, H, dpr, tile);
  else {
    ctx.fillStyle = layout.bg === "cloth" ? book.cloth.base : book.cloth.deep;
    ctx.fillRect(0, 0, W, H);
  }
  if (layout.linen) linen(ctx, W, H, dpr, linenTiles);

  layout.els.forEach((el, i) => {
    switch (el.t) {
      case "img": {
        const img = imgs[i];
        if (!img) return;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, W, H);
        ctx.clip();
        const [bx, by, bw, bh] = [el.x * cq, el.y * cq, el.w * cq, el.h * cq];
        if (el.fit === "contain") {
          const s = Math.min(bw / widthOf(img), bh / heightOf(img));
          const dw = widthOf(img) * s;
          const dh = heightOf(img) * s;
          ctx.drawImage(img, bx + (bw - dw) / 2, by + (bh - dh) / 2, dw, dh);
        } else {
          // wie im HTML: erst füllen (object-position = Fokus), dann um den Fokuspunkt des Kastens skalieren
          ctx.beginPath();
          ctx.rect(bx, by, bw, bh);
          ctx.clip();
          const s = Math.max(bw / widthOf(img), bh / heightOf(img));
          const dw = widthOf(img) * s;
          const dh = heightOf(img) * s;
          const dx = bx + (bw - dw) * el.focus[0];
          const dy = by + (bh - dh) * el.focus[1];
          const ox = bx + bw * el.focus[0];
          const oy = by + bh * el.focus[1];
          const z = el.zoom;
          ctx.drawImage(img, ox + (dx - ox) * z, oy + (dy - oy) * z, dw * z, dh * z);
        }
        // wie .print-edge: im Kasten geclippt, nur Kanten innerhalb der Seite (im Anschnitt liegt sie draußen)
        if (layout.bg === "paper" && el.fit !== "contain") {
          ctx.beginPath();
          ctx.rect(bx, by, bw, bh);
          ctx.clip();
          const pad = 8;
          const ex = el.x <= 0 ? bx - pad : bx;
          const ey = el.y <= 0 ? by - pad : by;
          const ex2 = el.x + el.w >= 100 ? bx + bw + pad : bx + bw;
          const ey2 = by + bh >= H ? by + bh + pad : by + bh;
          for (const [width, a] of [[2, EDGE.line], [6, EDGE.glow / 2]] as const) {
            ctx.strokeStyle = `rgb(238 233 223 / ${a})`;
            ctx.lineWidth = width;
            ctx.strokeRect(ex, ey, ex2 - ex, ey2 - ey);
          }
        }
        ctx.restore();
        return;
      }
      case "thumb": {
        const img = imgs[i];
        if (img) contain(ctx, img, el.x * cq, el.y * cq, el.w * cq, el.h * cq);
        return;
      }
      case "caption":
        caption(ctx, book, el.no, el.x * cq, el.y * cq, el.align, cq, family, el.stack, el.w * cq);
        return;
      case "rect":
        ctx.fillStyle = el.color;
        ctx.fillRect(el.x * cq, el.y * cq, Math.max(1, el.w * cq), el.h * cq);
        return;
      case "frame":
        ctx.strokeStyle = el.color;
        ctx.lineWidth = el.width * cq;
        ctx.strokeRect((el.x + el.width / 2) * cq, (el.y + el.width / 2) * cq, (el.w - el.width) * cq, (el.h - el.width) * cq);
        return;
      case "path": {
        // dieselben Pfade wie im SVG der Seite, in cqw
        ctx.save();
        ctx.scale(cq, cq);
        const path = new Path2D(el.d);
        if (el.opacity !== undefined) ctx.globalAlpha = el.opacity;
        if (el.fill) {
          ctx.fillStyle = el.fill;
          ctx.fill(path);
        }
        if (el.stroke && el.width) {
          ctx.strokeStyle = el.stroke;
          ctx.lineWidth = el.width;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          if (el.dash) ctx.setLineDash(el.dash);
          ctx.stroke(path);
        }
        ctx.restore();
        return;
      }
      case "colophon": {
        // wie im HTML: Höhen erst jetzt messen, dann von unten stapeln
        const px = Math.max(11, el.size * cq);
        const rows = el.lines.map((line, i) => {
          setFont(ctx, i === 0 ? 600 : 400, px, family);
          return wrap(ctx, line, el.w * cq);
        });
        const tops = stackFromBottom(rows.map((r) => r.length * el.lh * px), el.gap * cq, el.bottom * cq);
        rows.forEach((lines, i) => {
          setFont(ctx, i === 0 ? 600 : 400, px, family);
          track(ctx, 0, px);
          ctx.fillStyle = i === 0 ? C.ink : C.ink2;
          lines.forEach((r, n) => ctx.fillText(r, el.x * cq, baseline(tops[i] + n * el.lh * px, px, el.lh)));
        });
        return;
      }
      case "text": {
        const min = el.size < 2.4 ? 9 : 11;
        const px = el.size < 3.4 ? Math.max(min, el.size * cq) : el.size * cq;
        setFont(ctx, el.weight, px, el.font ? fontFamilyOf(el.font) : family, el.display);
        if (el.italic) ctx.font = `italic ${ctx.font}`;
        track(ctx, el.display ? -0.035 : 0, px);
        ctx.fillStyle = el.color ?? (el.tone === "ink" ? C.ink : el.tone === "ink2" ? C.ink2 : el.tone === "paper" ? C.paper : book.cloth.ink);
        const paras = el.lines ? el.text.split("\n") : [el.text];
        const rows = paras.flatMap((para) => (el.w ? (para ? wrap(ctx, para, el.w * cq) : [""]) : [para]));
        rows.forEach((r, n) => {
          // Ausrichtung im Rahmen wie im HTML
          const off = el.w && el.align && el.align !== "left" ? (el.w * cq - ctx.measureText(r).width) * (el.align === "center" ? 0.5 : 1) : 0;
          ctx.fillText(r, el.x * cq + off, baseline(el.y * cq + n * el.lh * px, px, el.lh));
        });
        return;
      }
    }
  });
  if (layout.bg === "paper") printed(ctx, W, H, dpr, tile);
  if (layout.gutter) gutter(ctx, side, W, H, cq);
}

/** Wie `.printed` im HTML: mattes Papier hebt das Schwarz, die Fasern liegen auch über den Fotos */
function printed(ctx: CanvasRenderingContext2D, W: number, H: number, scale: number, tile: HTMLImageElement | null) {
  ctx.save();
  ctx.globalAlpha = PRINT.wash;
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);
  const pat = tile && ctx.createPattern(tile, "repeat");
  if (pat) {
    pat.setTransform(new DOMMatrix().scale(1 / scale));
    ctx.globalAlpha = PRINT.grain;
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

/**
 * Bereitet eine Seite in Gerätepixeln vor. W, H: Seitengröße in CSS-Pixeln, dpr: Auflösung.
 * Lädt Bilder und Schrift (wartet, blockiert nicht) und gibt eine Funktion zurück, die die Seite
 * in einem Zug zeichnet. So entscheidet der Aufrufer, wann die Arbeit im Hauptthread anfällt.
 */
export async function preparePage(book: BookData, page: Page, side: "left" | "right", W: number, H: number, dpr: number) {
  const layout = layoutPage(book, page, side);
  // Schriften der Textrahmen werden erst bei Bedarf geladen; vor dem Zeichnen sicherstellen
  const [loaded] = await Promise.all([
    loadLayout(book, layout, W, dpr),
    ...layout.els.flatMap((e) =>
      e.t === "text" && e.font ? [document.fonts.load(`${e.italic ? "italic " : ""}${e.weight} 20px ${fontFamilyOf(e.font)}`).catch(() => [])] : [],
    ),
  ]);
  await document.fonts.ready;
  return () => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;
    ctx.scale(dpr, dpr);
    ctx.textBaseline = "alphabetic";
    drawLayout(ctx, book, layout, side, W, H, dpr, loaded);
    return canvas;
  };
}
