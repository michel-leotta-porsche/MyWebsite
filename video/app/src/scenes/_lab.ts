// Gemeinsame Bausteine für alle Labor-Szenen: Cartoon-Linien mit „Boil“ (zittern mit 12 fps),
// die beiden Figuren, Sprechblasen mit Karaoke, Kopfzeile. Alles reine Funktionen der Zeit.
import { F, font } from '../engine/type';
import { Lyrics, type Line, type Word, norm } from '../engine/lyrics';
import type { AudioData } from '../engine/audio';
import { clamp, ease, frameIdx, hash, lerp, prog, smoothstep } from '../engine/util';

export const OUT = '#0B0D12'; // Kontur
export const COL = {
  paper: '#F3EFE4',
  paperDim: '#D9D3C4',
  amber: '#FFB224',
  amberInk: '#8A5300',
  green: '#8EF04A',
  greenDeep: '#2F8F3A',
  red: '#E2483D',
  wall: '#2A3644',
  mono: '#C9D1DD',
  ash: '#8C93A3',
  vexSkin: '#EAD3B9',
  vexCoat: '#EEEDE6',
  vexNeck: '#B23A7A',
  joSkin: '#F3CDA8',
  joHood: '#2FA59B',
  joHat: '#6B4BC4',
  mouth: '#3A0F14',
  tongue: '#E0707A',
};

/** Boil-Index: wechselt mit 12 fps und bleibt über die Belichtung eines 60-fps-Frames konstant. */
export const boilOf = (t: number) => Math.floor(frameIdx(t) / 5);

export type P = [number, number];

/** Punkte auf einer Ellipse. */
export function ell(cx: number, cy: number, rx: number, ry: number, n = 18, rot = 0): P[] {
  const out: P[] = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return out;
}

/** Glatter Pfad durch Punkte (Mittelpunkt-Quadratik), jeder Punkt zittert pro Boil-Schritt. */
export function wobPath(c: CanvasRenderingContext2D, pts: P[], closed: boolean, seed: number, b: number, amp = 1.6) {
  const q = pts.map(([x, y], i): P => [x + (hash(seed, i, b, 1) - 0.5) * 2 * amp, y + (hash(seed, i, b, 2) - 0.5) * 2 * amp]);
  c.beginPath();
  if (q.length < 2) return;
  if (!closed) {
    c.moveTo(q[0]![0], q[0]![1]);
    for (let i = 1; i < q.length - 1; i++) {
      const [x, y] = q[i]!, [nx, ny] = q[i + 1]!;
      c.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
    }
    c.lineTo(q[q.length - 1]![0], q[q.length - 1]![1]);
    return;
  }
  const n = q.length;
  const mid = (i: number): P => [(q[i % n]![0] + q[(i + 1) % n]![0]) / 2, (q[i % n]![1] + q[(i + 1) % n]![1]) / 2];
  const m0 = mid(n - 1);
  c.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) {
    const m = mid(i);
    c.quadraticCurveTo(q[i]![0], q[i]![1], m[0], m[1]);
  }
  c.closePath();
}

/** Gefüllte Form mit Cartoon-Kontur. */
export function blob(c: CanvasRenderingContext2D, pts: P[], fill: string | null, seed: number, b: number, lw = 5, amp = 1.6, stroke = OUT) {
  wobPath(c, pts, true, seed, b, amp);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (lw > 0) { c.lineWidth = lw; c.strokeStyle = stroke; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
}

/** Offene Linie mit Cartoon-Kontur. */
export function stroke(c: CanvasRenderingContext2D, pts: P[], seed: number, b: number, lw = 5, col = OUT, amp = 1.2) {
  wobPath(c, pts, false, seed, b, amp);
  c.lineWidth = lw; c.strokeStyle = col; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke();
}

/** Rechteck als Punktliste (für wackelige Kästen), mit Zwischenpunkten auf langen Kanten. */
export function rectPts(x: number, y: number, w: number, h: number, step = 90): P[] {
  const out: P[] = [];
  const edge = (x0: number, y0: number, x1: number, y1: number) => {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let i = 0; i < n; i++) out.push([lerp(x0, x1, i / n), lerp(y0, y1, i / n)]);
  };
  // Ecken doppelt, damit sie trotz Glättung eckig bleiben
  const k = 0.001;
  edge(x, y, x + w, y); out.push([x + w - k, y]);
  edge(x + w, y, x + w, y + h); out.push([x + w, y + h - k]);
  edge(x + w, y + h, x, y + h); out.push([x + k, y + h]);
  edge(x, y + h, x, y); out.push([x, y + k]);
  return out;
}

/** Text mit leichtem Boil-Versatz. */
export function wobText(c: CanvasRenderingContext2D, s: string, x: number, y: number, seed: number, b: number, amp = 0.8) {
  c.fillText(s, x + (hash(seed, b, 3) - 0.5) * 2 * amp, y + (hash(seed, b, 4) - 0.5) * 2 * amp);
}

/** Feder-Einblendung 0 → 1 mit Überschwinger, ab t0. */
export function pop(t: number, t0: number, dur = 0.45) {
  if (t <= t0) return 0;
  const x = (t - t0) / dur;
  if (x >= 1) return 1;
  return 1 + Math.sin(x * Math.PI * 1.15) * 0.18 * (1 - x) - Math.pow(1 - x, 3);
}

// ------------------------------------------------------------------ Zeitabfragen über den Text

export type Speaker = 'VEX' | 'JO';
export type LabLine = Line & { speaker: Speaker; rule: string | null };

export class Script {
  constructor(public ly: Lyrics, public au: AudioData) {}
  get lines() { return this.ly.lines as LabLine[]; }
  line(q: string, nth = 0) { return this.ly.get(q, nth) as LabLine; }
  /** Startzeit eines Worts innerhalb der Zeile, die `q` enthält. */
  word(q: string, w: string, nth = 0): Word {
    const l = this.line(q);
    const hits = l.words.filter((x) => norm(x.w) === norm(w));
    const hit = hits[nth];
    if (!hit) throw new Error(`word not found: ${w} in "${l.text}"`);
    return hit;
  }
  at(q: string, w?: string, nth = 0) { return w ? this.word(q, w, nth).start : this.line(q).start; }
  /** Zeile, deren Sprechblase gerade steht: von kurz vor dem Start bis zur nächsten Zeile (max. 0,9 s Nachlauf). */
  bubbleLine(t: number): { l: LabLine; t0: number; t1: number } | null {
    const ls = this.lines;
    for (let i = ls.length - 1; i >= 0; i--) {
      const l = ls[i]!;
      const t0 = l.start - 0.12;
      if (t < t0) continue;
      const next = ls[i + 1];
      const t1 = Math.min(l.end + 0.9, next ? next.start - 0.12 : l.end + 1.4);
      return t < t1 ? { l, t0, t1 } : null;
    }
    return null;
  }
  /** Mundöffnung 0..1 des Sprechers, in 12-fps-Schritten (Cartoon-Lippensynchron). */
  mouth(t: number, who: Speaker) {
    const l = this.ly.lineAt(t) as LabLine | null;
    if (!l || l.speaker !== who) return 0;
    const tb = boilOf(t) / 12;
    const w = this.ly.wordAt(tb);
    if (!w) return 0;
    const e = this.au.env('vocal', tb);
    return clamp((e - 0.08) * 1.6);
  }
  speaking(t: number) {
    const l = this.ly.lineAt(t) as LabLine | null;
    return l?.speaker ?? null;
  }
}

// ------------------------------------------------------------------ Figuren

export const CAST = {
  JO: { x: 300, y: 1080, s: 0.92 },
  VEX: { x: 1630, y: 1080, s: 1 },
} as const;

/** Oberkante des Kopfes (für den Sprechblasen-Schwanz). */
export function headOf(who: Speaker): P {
  const k = CAST[who];
  return who === 'VEX' ? [k.x - 20, k.y - (1080 - 420) * k.s] : [k.x + 10, k.y - (1080 - 490) * k.s];
}

export interface Mood {
  /** 0..1 Schweißtropfen / Angst. */
  sweat?: number;
  /** -1..1 Blickrichtung horizontal. */
  look?: number;
  /** 0..1 Augenbrauen hoch (Erstaunen). */
  brow?: number;
  /** 0..1 Grinsen. */
  smug?: number;
}

/** Augenblinzeln: deterministisch, etwa alle 3–4 s für 0,12 s. */
function blink(t: number, seed: number) {
  const slot = Math.floor(t / 3.3);
  const at = slot * 3.3 + 0.4 + hash(seed, slot) * 2.2;
  return t >= at && t < at + 0.12 ? 1 : 0;
}

export function drawVex(c: CanvasRenderingContext2D, t: number, b: number, open: number, mood: Mood = {}) {
  const k = CAST.VEX;
  c.save();
  const bob = Math.sin(t * 1.7) * 3 + open * 6;
  c.translate(k.x, k.y + bob);
  c.scale(k.s, k.s);
  c.translate(0, -1080);
  // Mantel
  blob(c, [[-250, 1100], [-225, 930], [-150, 868], [-60, 850], [60, 850], [150, 868], [225, 930], [250, 1100]], COL.vexCoat, 11, b);
  stroke(c, [[-60, 852], [-20, 960], [-35, 1090]], 12, b, 4);
  stroke(c, [[60, 852], [20, 960], [35, 1090]], 13, b, 4);
  // Kugelschreiber in der Brusttasche
  blob(c, rectPts(-170, 940, 70, 60, 70), COL.vexCoat, 14, b, 4);
  blob(c, rectPts(-150, 905, 10, 45, 50), COL.amber, 15, b, 3);
  // Rollkragen
  blob(c, [[-58, 860], [-52, 770], [52, 770], [58, 860]], COL.vexNeck, 16, b);
  stroke(c, [[-55, 800], [55, 800]], 17, b, 3);
  stroke(c, [[-56, 830], [56, 830]], 18, b, 3);
  // Kopf: hohes Ei mit Kinn
  const look = mood.look ?? -0.6;
  blob(c, [[0, 470], [80, 488], [122, 560], [128, 650], [110, 730], [70, 790], [0, 806], [-70, 790], [-110, 730], [-128, 650], [-122, 560], [-80, 488]], COL.vexSkin, 21, b);
  // Ohren
  blob(c, ell(-130, 650, 18, 30, 10), COL.vexSkin, 22, b, 4);
  blob(c, ell(130, 650, 18, 30, 10), COL.vexSkin, 23, b, 4);
  // drei einsame Haare
  stroke(c, [[-14, 474], [-24, 440], [-10, 420]], 24, b, 3);
  stroke(c, [[4, 471], [8, 432], [24, 418]], 25, b, 3);
  stroke(c, [[18, 476], [36, 452], [30, 436]], 26, b, 3);
  // Schutzbrille auf der Stirn
  stroke(c, [[-124, 548], [-80, 532], [80, 532], [124, 548]], 27, b, 12, OUT);
  for (const [i, x] of [[0, -50], [1, 50]] as const) {
    blob(c, ell(x, 540, 40, 36, 14), '#5C6470', 28 + i, b, 5);
    blob(c, ell(x, 540, 28, 25, 12), COL.amber, 30 + i, b, 3);
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.beginPath(); c.ellipse(x - 9, 532, 7, 5, -0.5, 0, Math.PI * 2); c.fill();
  }
  // Augen, halb geschlossen (gelangweilt-genial)
  const bl = blink(t, 3);
  const brow = mood.brow ?? 0;
  for (const s of [-1, 1]) {
    const ex = s * 48, ey = 630;
    blob(c, ell(ex, ey, 27, 19, 12), '#FFFFFF', 40 + s, b, 4);
    if (!bl) {
      c.fillStyle = OUT;
      c.beginPath(); c.arc(ex + look * 10, ey + 3, 6, 0, Math.PI * 2); c.fill();
    }
    // Lid: oben Haut, je nach Laune tiefer
    const lid = bl ? 1 : lerp(0.55, 0.15, brow);
    c.save();
    c.beginPath(); c.ellipse(ex, ey, 28, 20, 0, 0, Math.PI * 2); c.clip();
    c.fillStyle = COL.vexSkin;
    c.fillRect(ex - 30, ey - 22, 60, 44 * lid);
    c.restore();
    stroke(c, [[ex - 27, ey - 20 + 40 * lid * 0.95], [ex + 27, ey - 20 + 40 * lid * 0.95]], 44 + s, b, 4);
    // Augenbraue: grimmiges V, hebt sich bei Erstaunen
    const by = 596 - brow * 22;
    stroke(c, [[s * 84, by - 10 + brow * 6], [s * 50, by - 2], [s * 18, by + 10 - brow * 14]], 46 + s, b, 11);
  }
  // Nase: lang mit Haken
  stroke(c, [[2, 640], [18, 700], [2, 712]], 50, b, 5);
  // Mund
  const smug = mood.smug ?? 0;
  if (open > 0.05) {
    const h = 10 + open * 38;
    blob(c, ell(0, 752, 40 + open * 6, h / 2, 14), COL.mouth, 51, b, 5);
    c.save();
    c.beginPath(); c.ellipse(0, 752, 40 + open * 6, h / 2, 0, 0, Math.PI * 2); c.clip();
    c.fillStyle = COL.tongue;
    c.beginPath(); c.ellipse(4, 752 + h / 2, 24, 12, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  } else {
    stroke(c, [[-38, 752 + smug * 2], [-10, 756 - smug * 4], [20, 752 - smug * 8], [40, 744 - smug * 12]], 52, b, 5);
  }
  // Bartstoppeln
  c.fillStyle = 'rgba(11,13,18,0.35)';
  for (let i = 0; i < 26; i++) {
    const a = hash(60, i), r = hash(61, i);
    c.fillRect(-70 + a * 140, 770 + r * 26 - Math.abs(a - 0.5) * 30, 2.2, 2.2);
  }
  c.restore();
}

export function drawJo(c: CanvasRenderingContext2D, t: number, b: number, open: number, mood: Mood = {}) {
  const k = CAST.JO;
  c.save();
  const jitter = (mood.sweat ?? 0) > 0.3 ? (hash(b, 9) - 0.5) * 4 : 0;
  const bob = Math.sin(t * 2.3 + 1) * 3 + open * 6;
  c.translate(k.x + jitter, k.y + bob);
  c.scale(k.s, k.s);
  c.translate(0, -1080);
  // Hoodie
  blob(c, [[-240, 1100], [-215, 950], [-140, 885], [140, 885], [215, 950], [240, 1100]], COL.joHood, 101, b);
  stroke(c, [[-40, 900], [-46, 990]], 102, b, 4);
  stroke(c, [[40, 900], [46, 990]], 103, b, 4);
  blob(c, ell(-46, 996, 7, 7, 8), COL.paper, 104, b, 3);
  blob(c, ell(46, 996, 7, 7, 8), COL.paper, 105, b, 3);
  // Hals
  blob(c, [[-40, 900], [-36, 820], [36, 820], [40, 900]], COL.joSkin, 106, b);
  // Kopf: rund
  blob(c, ell(0, 690, 122, 128, 20), COL.joSkin, 107, b);
  // Mütze
  blob(c, [[-128, 650], [-118, 580], [-80, 530], [0, 508], [80, 530], [118, 580], [128, 650], [0, 640]], COL.joHat, 108, b);
  blob(c, [[-134, 662], [-130, 618], [0, 606], [130, 618], [134, 662], [0, 676]], '#5638A6', 109, b, 5);
  blob(c, ell(0, 500, 22, 20, 10), '#8F73E0', 110, b, 4);
  // Augen: groß, kleine Pupillen (ängstlich)
  const look = mood.look ?? 0.6;
  const bl = blink(t, 11);
  for (const s of [-1, 1]) {
    const ex = s * 44, ey = 712;
    blob(c, ell(ex, ey, 31, 33, 14), '#FFFFFF', 120 + s, b, 4);
    if (bl) {
      c.fillStyle = COL.joSkin;
      c.beginPath(); c.ellipse(ex, ey, 31, 33, 0, 0, Math.PI * 2); c.fill();
      stroke(c, [[ex - 28, ey], [ex + 28, ey]], 122 + s, b, 4);
    } else {
      const pj = (hash(b, s, 7) - 0.5) * 2;
      c.fillStyle = OUT;
      c.beginPath(); c.arc(ex + look * 12 + pj, ey + 4, 6, 0, Math.PI * 2); c.fill();
    }
    // besorgte Brauen
    const br = (mood.brow ?? 0.4) * 14;
    stroke(c, [[s * 72, 662 - br * 0.3], [s * 20, 654 - br]], 124 + s, b, 6);
  }
  // Sommersprossen
  c.fillStyle = '#C98A63';
  for (let i = 0; i < 10; i++) {
    const s = i < 5 ? -1 : 1;
    c.beginPath(); c.arc(s * (70 + hash(130, i) * 26), 760 + hash(131, i) * 20, 3, 0, Math.PI * 2); c.fill();
  }
  // Nase: kleiner Knubbel
  stroke(c, [[-6, 744], [6, 752], [-4, 758]], 132, b, 4);
  // Mund: Wellenlinie oder offen
  if (open > 0.05) {
    const h = 12 + open * 32;
    blob(c, ell(0, 790, 30 + open * 4, h / 2, 12), COL.mouth, 133, b, 5);
    c.save();
    c.beginPath(); c.ellipse(0, 790, 30, h / 2, 0, 0, Math.PI * 2); c.clip();
    c.fillStyle = '#FFFFFF';
    c.fillRect(-30, 790 - h / 2, 60, 8);
    c.restore();
  } else {
    stroke(c, [[-30, 792], [-15, 786], [0, 792], [15, 786], [30, 792]], 134, b, 5);
  }
  // Schweißtropfen
  const sw = mood.sweat ?? 0;
  if (sw > 0.02) {
    c.save();
    c.globalAlpha = clamp(sw * 2);
    const y = 610 + (t * 60) % 40 * sw;
    blob(c, [[132, y - 24], [146, y], [140, y + 12], [124, y + 12], [118, y]], '#9FD8FF', 140, b, 4);
    c.restore();
  }
  c.restore();
}

// ------------------------------------------------------------------ Sprechblase mit Karaoke

/** Zeilenumbruch nach Wörtern. */
function wrap(c: CanvasRenderingContext2D, words: Word[], maxW: number) {
  const rows: { words: Word[]; x: number[] }[] = [];
  let cur: Word[] = [], xs: number[] = [], x = 0;
  const sp = c.measureText(' ').width;
  for (const w of words) {
    const ww = c.measureText(w.w).width;
    if (cur.length && x + ww > maxW) { rows.push({ words: cur, x: xs }); cur = []; xs = []; x = 0; }
    cur.push(w); xs.push(x); x += ww + sp;
  }
  if (cur.length) rows.push({ words: cur, x: xs });
  return rows;
}

export function drawBubble(c: CanvasRenderingContext2D, t: number, b: number, sc: Script) {
  const cur = sc.bubbleLine(t);
  if (!cur) return;
  const { l, t0, t1 } = cur;
  const who = l.speaker;
  const fs = 42, lh = 54, pad = 34, maxW = 760;
  c.save();
  c.font = font(F.grotesk(700), fs);
  const rows = wrap(c, l.words, maxW);
  const sp = c.measureText(' ').width;
  const textW = Math.max(...rows.map((r) => r.x[r.x.length - 1]! + c.measureText(r.words[r.words.length - 1]!.w).width));
  const bw = textW + pad * 2, bh = rows.length * lh + pad * 2 - 10;
  const head = headOf(who);
  const bx = who === 'JO' ? 90 : 1830 - bw;
  const by = 150;
  // Ein- und Ausblenden: Pop um den Schwanz-Ansatz
  const k = pop(t, t0, 0.32) * (1 - ease.inCubic(prog(t, t1 - 0.14, t1)));
  if (k <= 0.001) { c.restore(); return; }
  const ax = who === 'JO' ? bx + 120 : bx + bw - 120, ay = by + bh;
  c.translate(ax, ay);
  c.scale(k, k);
  c.translate(-ax, -ay);
  // Schwanz zum Kopf
  const tipX = lerp(ax, head[0], 0.6), tipY = Math.max(ay + 50, head[1] - 20);
  const tail: P[] = [[ax - 40, ay - 6], [tipX, tipY], [ax + 40, ay - 6]];
  // Blase
  const pts = rectPts(bx, by, bw, bh, 70);
  wobPath(c, pts, true, 300, b, 1.8);
  c.fillStyle = COL.paper; c.fill();
  wobPath(c, tail, false, 301, b, 1.2);
  c.lineTo(tail[0]![0], tail[0]![1]);
  c.fill();
  wobPath(c, pts, true, 300, b, 1.8);
  c.lineWidth = 5; c.strokeStyle = OUT; c.lineJoin = 'round'; c.stroke();
  // Schwanz-Kontur ohne die Kante zur Blase
  stroke(c, [[ax - 40, ay + 1], [tipX, tipY]], 302, b, 5);
  stroke(c, [[tipX, tipY], [ax + 40, ay + 1]], 303, b, 5);
  c.fillStyle = COL.paper;
  c.fillRect(ax - 37, ay - 6, 74, 9);
  // Sprechername
  c.font = font(F.mono(600), 18);
  c.letterSpacing = '3px';
  c.fillStyle = who === 'VEX' ? COL.amberInk : '#1E6E67';
  c.fillText(who === 'VEX' ? 'DR. VEX' : 'JO', bx + pad, by + 28);
  c.letterSpacing = '0px';
  // Wörter: gesprochen = Tinte, kommend = blass, aktuelles Wort mit Bernstein-Unterstrich
  c.font = font(F.grotesk(700), fs);
  c.textBaseline = 'alphabetic';
  rows.forEach((r, ri) => {
    r.words.forEach((w, wi) => {
      const x = bx + pad + r.x[wi]!, y = by + pad + 28 + ri * lh + 10;
      const p = Lyrics.wordProgress(w, t);
      c.fillStyle = p > 0 ? OUT : 'rgba(11,13,18,0.28)';
      c.fillText(w.w, x, y);
      if (p > 0 && t < w.end + 0.15) {
        const ww = c.measureText(w.w).width;
        c.fillStyle = COL.amber;
        c.fillRect(x, y + 8, ww * ease.outCubic(clamp(p * 1.4)), 6);
      }
    });
  });
  void sp;
  c.restore();
}

// ------------------------------------------------------------------ Kopfzeile (Systemplan)

export const RULES: Record<string, { n: string; title: string }> = {
  open: { n: 'INTRO', title: 'A field guide to Opus 5.5' },
  verify: { n: 'RULE 01 / 07', title: 'Give it a check.' },
  plan: { n: 'RULE 02 / 07', title: 'Explore. Plan. Code.' },
  specific: { n: 'RULE 03 / 07', title: 'Be specific.' },
  context: { n: 'RULE 04 / 07', title: 'Guard the context.' },
  effort: { n: 'RULE 05 / 07', title: 'Turn the effort dial.' },
  memory: { n: 'RULE 06 / 07', title: 'Short CLAUDE.md. Hooks.' },
  review: { n: 'RULE 07 / 07', title: 'Fresh eyes review.' },
  outro: { n: 'RECAP', title: 'Seven rules.' },
};

export function drawHeader(c: CanvasRenderingContext2D, t: number, start: number, rule: string) {
  const r = RULES[rule];
  if (!r) return;
  const a = smoothstep(start + 0.05, start + 0.4, t);
  const slide = (1 - ease.outExpo(prog(t, start + 0.05, start + 0.9))) * -30;
  c.save();
  c.globalAlpha = a;
  c.translate(slide, 0);
  c.font = font(F.mono(500), 18);
  c.letterSpacing = '4px';
  c.fillStyle = COL.amber;
  c.fillText(r.n, 64, 64);
  c.letterSpacing = '0px';
  c.font = font(F.grotesk(700), 34);
  c.fillStyle = COL.paper;
  c.fillText(r.title, 64, 108);
  // Haarlinie, wächst von links (500 ms)
  const lw = 520 * ease.outExpo(prog(t, start + 0.1, start + 0.6));
  c.fillStyle = 'rgba(243,239,228,0.35)';
  c.fillRect(64, 124, lw, 1);
  c.restore();
}

export { clamp, ease, hash, lerp, prog, smoothstep };
