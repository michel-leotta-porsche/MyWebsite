import { getStroke } from "perfect-freehand";

import type { Box, Corner, InkStroke, ShapeKind, ShapeLook } from "@/content/books";
import { de } from "@/lib/i18n";

// Formen und Handschrift als Pfade in cqw (Seitenbreite = 100, y in cqw).
// HTML (SVG in page-view.tsx) und Textur (Path2D in page-texture.ts) zeichnen dieselben Pfade, damit nichts springt.

/** Ein gezeichneter Pfad: Fläche und/oder Kontur, Maße in cqw */
export type PathEl = {
  t: "path";
  d: string;
  fill?: string;
  stroke?: string;
  /** Strichstärke in cqw */
  width?: number;
  opacity?: number;
  dash?: number[];
};

/** Strichstärken der drei Stufen in cqw (bei 15 cm Seitenbreite etwa 0,5 / 1 / 1,8 mm) */
export const WEIGHT: Record<ShapeLook["weight"], number> = { 1: 0.35, 2: 0.7, 3: 1.2 };
/** Breiten des Stifts in cqw */
export const PEN_SIZES = [{ label: de("fein"), s: 0.45 }, { label: de("mittel"), s: 0.8 }, { label: de("kräftig"), s: 1.4 }] as const;

export const SHAPES: Record<ShapeKind, { label: string; key: string }> = {
  line: { label: de("Linie"), key: "L" },
  arrow: { label: de("Pfeil"), key: "A" },
  rect: { label: de("Rechteck"), key: "R" },
  ellipse: { label: de("Kreis"), key: "O" },
  tape: { label: de("Klebestreifen"), key: "K" },
};
/** Formen mit zwei Endpunkten statt Rahmen */
export const isLinear = (k: ShapeKind) => k === "line" || k === "arrow" || k === "tape";

const n = (v: number) => Math.round(v * 100) / 100;

/** Endpunkte einer Linie: Anfang an der Ecke from, Ende an der Gegenecke */
export const endpoints = (b: Box, from: Corner = "tl") => {
  const r = from[1] === "r";
  const bt = from[0] === "b";
  return [
    { x: r ? b.x + b.w : b.x, y: bt ? b.y + b.h : b.y },
    { x: r ? b.x : b.x + b.w, y: bt ? b.y : b.y + b.h },
  ] as const;
};
/** Box und Anfangsecke aus zwei Endpunkten */
export const lineBox = (a: { x: number; y: number }, b: { x: number; y: number }): { box: Box; from: Corner } => ({
  box: { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) },
  from: `${a.y > b.y ? "b" : "t"}${a.x > b.x ? "r" : "l"}` as Corner,
});

/** Pfade einer Form; H = Seitenhöhe in cqw */
export function shapePaths(kind: ShapeKind, box: Box, look: ShapeLook, from: Corner | undefined, H: number): PathEl[] {
  const x = box.x;
  const y = (box.y / 100) * H;
  const w = box.w;
  const h = (box.h / 100) * H;
  const sw = WEIGHT[look.weight];
  const dash = look.dashed ? [sw * 3, sw * 2.2] : undefined;
  const [a0, b0] = endpoints({ x, y, w, h }, from);
  switch (kind) {
    case "rect":
      return [{ t: "path", d: `M${n(x)} ${n(y)}h${n(w)}v${n(h)}h${n(-w)}Z`, fill: look.fill, stroke: look.color, width: sw, dash }];
    case "ellipse": {
      const rx = w / 2;
      const ry = h / 2;
      const cx = x + rx;
      return [
        {
          t: "path",
          d: `M${n(cx - rx)} ${n(y + ry)}a${n(rx)} ${n(ry)} 0 1 0 ${n(w)} 0a${n(rx)} ${n(ry)} 0 1 0 ${n(-w)} 0Z`,
          fill: look.fill,
          stroke: look.color,
          width: sw,
          dash,
        },
      ];
    }
    case "line":
      return [{ t: "path", d: `M${n(a0.x)} ${n(a0.y)}L${n(b0.x)} ${n(b0.y)}`, stroke: look.color, width: sw, dash }];
    case "arrow": {
      // Spitze als gefülltes Dreieck, die Linie endet in ihrer Mitte, damit die Spitze scharf bleibt
      const len = Math.hypot(b0.x - a0.x, b0.y - a0.y) || 1;
      const ux = (b0.x - a0.x) / len;
      const uy = (b0.y - a0.y) / len;
      const head = Math.min(len * 0.45, 2.2 + sw * 2.4);
      const half = head * 0.42;
      const bx = b0.x - ux * head;
      const by = b0.y - uy * head;
      return [
        { t: "path", d: `M${n(a0.x)} ${n(a0.y)}L${n(bx + ux * head * 0.3)} ${n(by + uy * head * 0.3)}`, stroke: look.color, width: sw, dash },
        {
          t: "path",
          d: `M${n(b0.x)} ${n(b0.y)}L${n(bx - uy * half)} ${n(by + ux * half)}L${n(bx + uy * half)} ${n(by - ux * half)}Z`,
          fill: look.color,
        },
      ];
    }
    case "tape": {
      // Streifen entlang der Linie, Enden gerissen (Zickzack), halb durchsichtig wie Washi-Tape
      const len = Math.hypot(b0.x - a0.x, b0.y - a0.y) || 1;
      const ux = (b0.x - a0.x) / len;
      const uy = (b0.y - a0.y) / len;
      const half = 1.6 + look.weight * 0.9;
      const px = -uy * half;
      const py = ux * half;
      const teeth = 5;
      const tooth = 0.5;
      const end = (cx: number, cy: number, dir: 1 | -1) => {
        const pts: string[] = [];
        for (let i = 0; i <= teeth; i++) {
          const f = dir === 1 ? i / teeth : 1 - i / teeth;
          const k = (i % 2 ? tooth : 0) * dir;
          pts.push(`${n(cx + px * (2 * f - 1) + ux * k)} ${n(cy + py * (2 * f - 1) + uy * k)}`);
        }
        return pts;
      };
      // Anfang: von -p nach +p, Ende: von +p nach -p; Zähne zeigen nach innen
      const start = end(a0.x, a0.y, 1);
      const stop = end(b0.x, b0.y, -1);
      return [{ t: "path", d: `M${[...start, ...stop].join("L")}Z`, fill: look.fill ?? look.color, opacity: 0.72 }];
    }
  }
}

/** Strich in absoluten cqw: Punkte [x, y, Druck 0..1] */
export type AbsStroke = { c: string; s: number; pen?: true; pts: [number, number, number][] };

/** Striche einer Zeichnung in cqw; H = Seitenhöhe in cqw */
export function strokesToAbs(strokes: InkStroke[], box: Box, H: number): AbsStroke[] {
  const x = box.x;
  const y = (box.y / 100) * H;
  const w = box.w;
  const h = (box.h / 100) * H;
  return strokes.map((s) => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i + 2 < s.p.length; i += 3) pts.push([x + (s.p[i] / 1000) * w, y + (s.p[i + 1] / 1000) * h, s.p[i + 2] / 100]);
    return { c: s.c, s: s.s, pen: s.pen, pts };
  });
}

/** Striche in cqw → Box (mit Rand für die Strichbreite) und Punkte in 0..1000 der Box; flach gespeichert, Firestore mag keine Arrays in Arrays */
export function absToStrokes(abs: AbsStroke[], H: number): { box: Box; strokes: InkStroke[] } {
  let l = Infinity;
  let t = Infinity;
  let r = -Infinity;
  let b = -Infinity;
  for (const s of abs)
    for (const [x, y] of s.pts) {
      l = Math.min(l, x - s.s);
      r = Math.max(r, x + s.s);
      t = Math.min(t, y - s.s);
      b = Math.max(b, y + s.s);
    }
  const w = Math.max(0.5, r - l);
  const h = Math.max(0.5, b - t);
  return {
    box: { x: l, y: (t / H) * 100, w, h: (h / H) * 100 },
    strokes: abs.map((s) => ({
      c: s.c,
      s: s.s,
      ...(s.pen ? { pen: true as const } : {}),
      p: s.pts.flatMap(([x, y, pr]) => [Math.round(((x - l) / w) * 1000), Math.round(((y - t) / h) * 1000), Math.round(pr * 100)]),
    })),
  };
}

/** Umriss eines Strichs in cqw als Pfad (perfect-freehand liefert ein Polygon, das gefüllt wird) */
export function strokePath(s: AbsStroke): PathEl {
  const outline = getStroke(s.pts, {
    size: s.s * 2,
    thinning: s.pen ? 0.6 : 0.5,
    smoothing: 0.5,
    streamline: s.pen ? 0.35 : 0.55,
    simulatePressure: !s.pen,
    last: true,
  });
  return { t: "path", d: outlineToPath(outline), fill: s.c };
}

/** Pfade einer Zeichnung */
export const inkPaths = (strokes: InkStroke[], box: Box, H: number): PathEl[] => strokesToAbs(strokes, box, H).map(strokePath);

/** Abstand eines Punkts zum Strich in cqw (für den Radierer) */
export function distToStroke(s: AbsStroke, x: number, y: number) {
  let best = Infinity;
  for (let i = 0; i < s.pts.length; i++) {
    const [ax, ay] = s.pts[i];
    const [bx, by] = s.pts[Math.min(i + 1, s.pts.length - 1)];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const k = len2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2)) : 0;
    best = Math.min(best, Math.hypot(x - (ax + k * dx), y - (ay + k * dy)));
  }
  return best;
}

function outlineToPath(pts: number[][]) {
  if (pts.length < 3) return "";
  // weiche Kontur: quadratische Kurven durch die Mittelpunkte
  let d = `M${n(pts[0][0])} ${n(pts[0][1])}Q`;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    d += `${n(x0)} ${n(y0)} ${n((x0 + x1) / 2)} ${n((y0 + y1) / 2)} `;
  }
  return d.trimEnd() + "Z";
}

/** Punkte vereinfachen (Ramer-Douglas-Peucker), damit eine Seite nicht an die Grenze von Firestore stößt */
export function simplify(pts: [number, number, number][], tolerance: number): [number, number, number][] {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    let worst = -1;
    let dist = 0;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len;
      // Druck zählt mit: ein Wechsel der Strichbreite bleibt erhalten
      const dp = Math.abs(pts[i][2] - (pts[a][2] + pts[b][2]) / 2) * 0.5;
      if (d + dp > dist) {
        dist = d + dp;
        worst = i;
      }
    }
    if (worst >= 0 && dist > tolerance) {
      keep[worst] = 1;
      stack.push([a, worst], [worst, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}
