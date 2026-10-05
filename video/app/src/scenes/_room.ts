// Die Kulisse: Gemeindesaal im Keller. Holzvertäfelung, Linoleum, Wimpelkette, Katzenposter,
// Kaffeetisch mit Urne und Donuts, und das Flipchart, auf das Doug die Regeln schreibt.
import { drawStrokeText, strokeText, type StrokeText } from '../engine/stroke';
import { type P, cut, label, oval, rect, rrect, strip } from './_paper';

const WHITE = '#fbfaf5';

/** Easter Eggs: Zeitpunkte, ab denen sich Details still ändern (gesetzt in club.ts aus dem Drehbuch). */
export const EGG = { esc: Infinity, catFall: Infinity, donut1: Infinity, donut2: Infinity };

// Fluchtpunkt der Raumperspektive, Ecke zwischen Seitenwand (links) und Rückwand, Wandfuß
const VP: P = [1000, 380];
const CORNER_X = 420;
const BASE_Y = 600;

/** Punkt auf der Linie vom Fluchtpunkt durch (x, y), verlängert bis zur Höhe ty. */
function toward(x: number, y: number, ty: number): P {
  const k = (ty - VP[1]) / (y - VP[1]);
  return [VP[0] + (x - VP[0]) * k, ty];
}

function softShadow(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, a = 0.28) {
  const g = c.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(25,20,15,${a})`);
  g.addColorStop(1, 'rgba(25,20,15,0)');
  c.save(); c.fillStyle = g; c.translate(x, y); c.scale(1, ry / rx); c.translate(-x, -y);
  c.beginPath(); c.arc(x, y, rx, 0, Math.PI * 2); c.fill(); c.restore();
}

export function drawRoom(c: CanvasRenderingContext2D, t: number, s: number) {
  // Rückwand mit Licht von links (Fenster)
  const wg = c.createLinearGradient(CORNER_X, 0, 2200, 0);
  wg.addColorStop(0, '#e6e1d4'); wg.addColorStop(1, '#cbc5b6');
  c.fillStyle = wg;
  c.fillRect(CORNER_X, -400, 2400, BASE_Y + 400);
  // Vertäfelung unten, gedämpftes Holz
  c.fillStyle = '#8f735a'; c.fillRect(CORNER_X, 450, 2400, BASE_Y - 450);
  c.fillStyle = '#7d634c';
  for (let x = CORNER_X; x < 2320; x += 46) c.fillRect(x, 450, 2, BASE_Y - 450);
  c.fillStyle = '#6a533f'; c.fillRect(CORNER_X, 442, 2400, 10);
  c.fillStyle = '#4f3e2f'; c.fillRect(CORNER_X, BASE_Y - 14, 2400, 14);
  // Seitenwand links (in Perspektive), etwas dunkler
  const lb = toward(CORNER_X, BASE_Y, 1180), lt = toward(CORNER_X, -400, 1180);
  void lt;
  c.fillStyle = '#d3cdbf';
  c.beginPath(); c.moveTo(CORNER_X, -400); c.lineTo(CORNER_X, BASE_Y); c.lineTo(lb[0], lb[1]); c.lineTo(-800, 1180); c.lineTo(-800, -400); c.closePath(); c.fill();
  // Paneel auch auf der Seitenwand
  const pTop0: P = [CORNER_X, 450], pTop1 = toward(CORNER_X, 450, 1180);
  c.fillStyle = '#7f6650';
  c.beginPath(); c.moveTo(pTop0[0], pTop0[1]); c.lineTo(CORNER_X, BASE_Y); c.lineTo(lb[0], lb[1]); c.lineTo(pTop1[0], pTop1[1]); c.closePath(); c.fill();
  c.strokeStyle = '#6a533f'; c.lineWidth = 3; c.beginPath(); c.moveTo(CORNER_X, -400); c.lineTo(CORNER_X, BASE_Y); c.stroke();
  // Fenster in der Seitenwand: Lichtquelle
  const win = (yy: number, xx: number): P => { const [px, py] = toward(CORNER_X, yy, 1180); const k = (CORNER_X - xx) / (CORNER_X - px); return [CORNER_X - (CORNER_X - px) * k, yy + (py - yy) * k]; };
  const w0 = win(170, 300), w1 = win(170, 60), w2 = win(400, 60), w3 = win(400, 300);
  c.fillStyle = '#5e5446';
  c.beginPath(); c.moveTo(w0[0] + 8, w0[1] - 8); c.lineTo(w1[0] - 8, w1[1] - 10); c.lineTo(w2[0] - 8, w2[1] + 10); c.lineTo(w3[0] + 8, w3[1] + 8); c.closePath(); c.fill();
  c.fillStyle = '#cfe6f2';
  c.beginPath(); c.moveTo(w0[0], w0[1]); c.lineTo(w1[0], w1[1]); c.lineTo(w2[0], w2[1]); c.lineTo(w3[0], w3[1]); c.closePath(); c.fill();
  // Jalousie-Lamellen
  c.strokeStyle = 'rgba(120,120,110,0.55)'; c.lineWidth = 2;
  for (let k = 0; k <= 10; k++) { const u = k / 10; const a = [w0[0] + (w3[0] - w0[0]) * u, w0[1] + (w3[1] - w0[1]) * u], b = [w1[0] + (w2[0] - w1[0]) * u, w1[1] + (w2[1] - w1[1]) * u]; c.beginPath(); c.moveTo(a[0]!, a[1]!); c.lineTo(b[0]!, b[1]!); c.stroke(); }

  // Boden: Linoleum-Fliesen in Perspektive
  c.fillStyle = '#c9c3b4';
  c.beginPath(); c.moveTo(-800, 1180); c.lineTo(lb[0], lb[1]); c.lineTo(CORNER_X, BASE_Y); c.lineTo(2400, BASE_Y); c.lineTo(2400, 1180); c.closePath(); c.fill();
  // Tiefe gleichmäßig in 1/z: y = VP.y + (BASE_Y - VP.y) * z0 / z
  const ys: number[] = [];
  for (let k = 0; k <= 9; k++) ys.push(VP[1] + (BASE_Y - VP[1]) * 1 / (1 - k * 0.095));
  for (let r = 0; r < ys.length - 1; r++) {
    const ya = ys[r]!, yb = ys[r + 1]!;
    if (ya > 1180) break;
    for (let k = -20; k < 40; k++) {
      if ((r + k) % 2) continue;
      const xa = CORNER_X - 600 + k * 70, xb = xa + 70;
      const A = toward(xa, BASE_Y, ya), B = toward(xb, BASE_Y, ya), C = toward(xb, BASE_Y, yb), D = toward(xa, BASE_Y, yb);
      c.fillStyle = '#b8b1a1';
      c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.lineTo(C[0], C[1]); c.lineTo(D[0], D[1]); c.closePath(); c.fill();
    }
  }
  // Lichtfleck vom Fenster auf dem Boden
  c.fillStyle = 'rgba(255,248,225,0.32)';
  c.beginPath(); c.moveTo(CORNER_X - 20, 640); c.lineTo(900, 700); c.lineTo(760, 1000); c.lineTo(-100, 900); c.closePath(); c.fill();
  // Flecken
  for (let i = 0; i < 9; i++) softShadow(c, 300 + hash01(i, 1) * 1500, 700 + hash01(i, 2) * 320, 30 + hash01(i, 3) * 40, 8 + hash01(i, 4) * 8, 0.08);

  // Wimpelkette mit Schriftzug
  const txt = 'PROMPTERS ANONYMOUS';
  const cols = ['#d9574a', '#e8b04a', '#4f8fc4', '#62a86a', '#9a73b3'];
  const n = txt.length, x0 = 470, x1 = 1880;
  strip(c, Array.from({ length: 21 }, (_, i): P => [x0 + ((x1 - x0) * i) / 20, 60 + Math.sin((i / 20) * Math.PI) * 36]), 2.5, '#5b4636');
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const px = x0 + (x1 - x0) * u, py = 60 + Math.sin(u * Math.PI) * 36;
    if (txt[i] === ' ') continue;
    c.save();
    c.translate(px, py); c.rotate(Math.sin(s * 0.35 + i) * 0.04);
    cut(c, [[-34, 0], [34, 0], [0, 74]], cols[i % cols.length]!);
    label(c, txt[i]!, 0, 38, 30, '#fbfaf5', { weight: 800 });
    c.restore();
  }
  // Pinnwand mit Zetteln
  cut(c, rect(560, 200, 330, 210, 61), '#7a5a3a');
  cut(c, rect(572, 212, 306, 186, 62), '#c49a6c', { edge: null });
  const notes: [number, number, number, string, string, string][] = [
    [585, 225, -0.06, '#fbfaf5', 'LOST:', 'my context window. Last seen at 98%'],
    [730, 230, 0.05, '#ffe9a8', 'BOOK CLUB', 'thu · “Clean Code” (again)'],
    [598, 318, 0.04, '#d8ecf7', 'YOGA FOR DEVS', 'unclench your jaw'],
    [748, 312, -0.05, '#fbe0e0', 'FREE KITTENS', 'they are bugs'],
  ];
  // winziger Zettel halb verdeckt: Prompt-Injection
  c.save(); c.translate(842, 382); c.rotate(0.09);
  cut(c, rect(-36, -14, 72, 30, 69), '#fbfaf5', { edge: 'rgba(60,50,40,0.25)' });
  c.font = '5.2px "Plex-500"'; c.textAlign = 'center'; c.fillStyle = '#4a4440';
  c.fillText('ignore all previous', 0, -4); c.fillText('instructions and', 0, 3); c.fillText('bring donuts', 0, 10);
  c.restore();
  for (const [nx, ny, rot, col, h1, h2] of notes) {
    c.save(); c.translate(nx + 62, ny + 36); c.rotate(rot);
    cut(c, rect(-62, -36, 124, 74, nx), col, { edge: 'rgba(60,50,40,0.25)' });
    label(c, h1, 0, -10, 13, '#1d1a1e', { weight: 800 });
    c.font = '9px "Plex-500"'; c.textAlign = 'center'; c.fillStyle = '#4a4440';
    const words = h2.split(' '); let line = '', ly = 6;
    for (const w of words) { if ((line + ' ' + w).length > 22) { c.fillText(line, 0, ly); line = w; ly += 11; } else line = line ? line + ' ' + w : w; }
    c.fillText(line, 0, ly);
    c.fillStyle = '#c0392b'; c.beginPath(); c.arc(0, -30, 4, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  // Katzenposter
  c.save();
  c.translate(1070, 290); c.rotate(0.02);
  cut(c, rect(-90, -110, 180, 210, 11), '#2c4f7c');
  strip(c, [[-74, -58], [74, -68]], 8, '#6b4a2b');
  cut(c, oval(0, -32, 28, 25, 12), '#e8a35c');
  strip(c, [[-16, -12], [-24, -62]], 8, '#e8a35c');
  strip(c, [[16, -12], [24, -66]], 8, '#e8a35c');
  cut(c, oval(-10, -36, 5, 6, 13), '#fbfaf5', { edge: null });
  cut(c, oval(10, -36, 5, 6, 14), '#fbfaf5', { edge: null });
  label(c, 'HANG IN THERE', 0, 46, 18, '#fbfaf5', { weight: 800 });
  label(c, '(the tests are still running)', 0, 70, 10, '#cfe0ee', { mono: true, weight: 500 });
  c.restore();
  // Uhr
  c.save();
  c.translate(1290, 240);
  cut(c, oval(0, 0, 44, 44, 15), '#fbfaf5', { edge: '#3b3f45', edgeW: 5 });
  const m = (t / 60) * Math.PI * 2 * 3 - Math.PI / 2;
  c.strokeStyle = '#1d1a1e'; c.lineCap = 'round';
  c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(m) * 32, Math.sin(m) * 32); c.stroke();
  c.lineWidth = 5; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(m / 12 + 2) * 20, Math.sin(m / 12 + 2) * 20); c.stroke();
  c.restore();
  // Doppeltür mit Zettel
  cut(c, rect(1430, 200, 280, 400, 70), '#9aa1a6');
  for (const dx of [1444, 1574]) {
    cut(c, rect(dx, 214, 122, 386, 71 + dx), '#c4c9cc');
    cut(c, rect(dx + 18, 236, 86, 150, 72 + dx), '#bfe0ee', { edge: '#8a9196' });
    c.fillStyle = 'rgba(255,255,255,0.45)';
    c.beginPath(); c.moveTo(dx + 30, 240); c.lineTo(dx + 60, 240); c.lineTo(dx + 34, 380); c.lineTo(dx + 22, 380); c.closePath(); c.fill();
  }
  cut(c, rect(1452, 420, 250, 10, 73), '#7d8590');
  c.save(); c.translate(1505, 300); c.rotate(-0.04);
  cut(c, rect(-44, -40, 88, 70, 74), '#fbfaf5', { edge: 'rgba(60,50,40,0.25)' });
  label(c, 'MEETING', 0, -16, 12, '#c0392b', { weight: 800 });
  label(c, 'TUE 7PM', 0, 2, 11, '#1d1a1e', { mono: true, weight: 600 });
  label(c, 'bring snacks', 0, 20, 9, '#4a4440', { mono: true, weight: 500 });
  c.restore();
  cut(c, rect(1520, 150, 100, 36, 16), '#2e7d4f');
  label(c, t < EGG.esc ? 'EXIT' : 'ESC', 1570, 177, 24, '#fbfaf5', { weight: 800 });
  // Feuerlöscher
  cut(c, rect(1780, 330, 70, 8, 77), '#3b3f45');
  cut(c, rrect(1798, 340, 34, 96, 12, 75), '#c0392b');
  cut(c, rect(1806, 326, 18, 16, 76), '#3b3f45');
  strip(c, [[1828, 340], [1844, 370], [1838, 410]], 5, '#1d1a1e');
  cut(c, rect(1801, 380, 28, 26, 78), '#fbfaf5', { edge: null });
  c.font = '3.6px "Plex-600"'; c.textAlign = 'center'; c.fillStyle = '#1d1a1e';
  c.fillText('FOR', 1815, 388); c.fillText('“LOOKS DONE”', 1815, 394); c.fillText('FIRES ONLY', 1815, 400);
  // Pflanze in der Ecke
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.32;
    c.save(); c.translate(70, 520); c.rotate(a + Math.PI / 2 + Math.sin(s * 0.2 + i) * 0.02);
    cut(c, oval(0, -90, 22, 70, 80 + i), i % 2 ? '#4f8a4a' : '#5e9e57');
    c.restore();
  }
  cut(c, [[20, 520], [120, 520], [108, 640], [32, 640]], '#b35d3a');
  softShadow(c, 70, 646, 70, 16, 0.3);
  // Mehrfachstecker mit Kabelsalat vorne
  const PX = 1560, PY = 975;
  softShadow(c, PX + 85, PY + 20, 120, 14, 0.18);
  cut(c, rrect(PX, PY, 170, 30, 8, 81), '#e8e6df');
  for (let i = 0; i < 4; i++) { c.fillStyle = '#4a4440'; c.fillRect(PX + 25 + i * 34, PY + 10, 12, 8); }
  c.strokeStyle = '#1d1a1e'; c.lineWidth = 5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(PX, PY + 15); c.bezierCurveTo(PX - 90, PY, PX - 60, PY + 70, PX - 190, PY + 80); c.bezierCurveTo(PX - 260, PY + 86, PX - 300, PY + 110, PX - 340, PY + 140); c.stroke();
  c.beginPath(); c.moveTo(PX + 170, PY + 15); c.bezierCurveTo(PX + 240, PY - 10, PX + 230, PY - 60, PX + 260, PY - 90); c.stroke();
  c.strokeStyle = '#d9574a'; c.lineWidth = 4;
  c.beginPath(); c.moveTo(PX + 40, PY + 2); c.bezierCurveTo(PX + 60, PY - 50, PX - 40, PY - 40, PX - 120, PY - 70); c.stroke();
}

/** Weiche Kontaktschatten unter allem, was steht (vor den Figuren zeichnen). */
export function drawContactShadows(c: CanvasRenderingContext2D, seats: P[], doug: P) {
  for (const [x, y] of seats) softShadow(c, x, y + 96, 120, 20, 0.32);
  softShadow(c, doug[0], doug[1] + 4, 95, 16, 0.36);
  softShadow(c, 345, 912, 190, 20, 0.28);
  softShadow(c, 1808, 905, 150, 18, 0.28);
}

const hash01 = (a: number, b: number) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Kaffeetisch mit Urne und Donutkarton (vor den Figuren gezeichnet: steht rechts außen). */
export function drawCoffee(c: CanvasRenderingContext2D, t = 0) {
  strip(c, [[1726, 790], [1716, 900]], 8, '#59626c');
  strip(c, [[1890, 790], [1900, 900]], 8, '#59626c');
  cut(c, rect(1690, 762, 236, 32, 21), '#e8e4d8');
  // Urne
  cut(c, rrect(1766, 590, 82, 172, 18, 22), '#b8c0c8');
  cut(c, rect(1756, 580, 102, 18, 23), '#8f98a2');
  cut(c, rect(1775, 730, 22, 14, 24), '#59626c');
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.fillRect(1778, 606, 10, 130);
  cut(c, rect(1790, 640, 40, 22, 27), '#fbfaf5', { edge: null });
  c.font = '4.6px "Plex-600"'; c.textAlign = 'center'; c.fillStyle = '#1d1a1e';
  c.fillText('UNLIMITED', 1810, 650); c.fillText('TOKENS', 1810, 657);
  // Donuts
  cut(c, rect(1858, 726, 70, 38, 25), '#f4a6c0');
  for (const [dx, col, gone] of [[1874, '#c98a4b', EGG.donut2], [1906, '#f3e6c8', EGG.donut1]] as const) {
    if (t >= gone) continue;
    cut(c, oval(dx, 722, 15, 9, 26), col);
    c.fillStyle = '#e8e4d8'; c.beginPath(); c.ellipse(dx, 722, 4, 2.5, 0, 0, Math.PI * 2); c.fill();
  }
}

// ------------------------------------------------------------------ Flipchart

export const FLIP = { x: 180, y: 290, w: 330, h: 450 };

export interface FlipItem {
  text: string;
  t0: number;
  t1: number;
  col: string;
  st?: StrokeText;
  /** Haken dahinter ab dieser Zeit. */
  check?: number;
}

export class FlipChart {
  title?: StrokeText;
  constructor(public items: FlipItem[]) {}
  init() {
    this.title = strokeText('Today:', 'readable', 30);
    for (const it of this.items) it.st = strokeText(it.text, 'readable', 22);
  }
  /** Zeichnet Staffelei und Papier; liefert die Stiftspitze, solange geschrieben wird. */
  draw(c: CanvasRenderingContext2D, t: number): P | null {
    const { x, y, w, h } = FLIP;
    strip(c, [[x + 40, y + 60], [x + 10, y + 620]], 12, '#5b3a29');
    strip(c, [[x + w - 40, y + 60], [x + w - 10, y + 620]], 12, '#5b3a29');
    strip(c, [[x + w / 2, y + 60], [x + w / 2 + 30, y + 600]], 10, '#4a2f20');
    cut(c, rect(x - 10, y - 26, w + 20, 30, 31), '#3b3f45');
    cut(c, rect(x, y, w, h, 32), WHITE);
    // Dougs heimliche Kritzelei unten rechts: kleiner Zettel mit Herz
    c.save(); c.translate(x + w - 34, y + h - 26); c.rotate(-0.1);
    c.strokeStyle = 'rgba(200,60,60,0.55)'; c.lineWidth = 1.4;
    c.strokeRect(-8, -8, 12, 12);
    c.beginPath(); c.moveTo(12, -2); c.bezierCurveTo(12, -8, 20, -8, 20, -2); c.bezierCurveTo(20, 2, 14, 5, 12, 8); c.bezierCurveTo(10, 5, 4, 2, 4, -2); c.bezierCurveTo(4, -8, 12, -8, 12, -2); c.stroke();
    c.restore();
    c.strokeStyle = 'rgba(70,110,170,0.18)'; c.lineWidth = 1.5;
    for (let ly = y + 70; ly < y + h - 10; ly += 46) { c.beginPath(); c.moveTo(x + 10, ly + 10); c.lineTo(x + w - 10, ly + 10); c.stroke(); }
    c.save();
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.translate(x + 22, y + 52);
    c.strokeStyle = '#1d1a1e'; c.lineWidth = 3.2;
    if (this.title) drawStrokeText(c, this.title, this.title.total);
    c.restore();
    let pen: P | null = null;
    this.items.forEach((it, i) => {
      if (!it.st || t < it.t0) return;
      const k = Math.min(1, (t - it.t0) / Math.max(0.01, it.t1 - it.t0));
      c.save();
      c.lineCap = 'round'; c.lineJoin = 'round';
      const bx = x + 20, by = y + 108 + i * 46;
      c.translate(bx, by);
      c.strokeStyle = it.col; c.lineWidth = 3;
      const head = drawStrokeText(c, it.st, it.st.total * k);
      if (k < 1 && head) pen = [bx + head.x, by + head.y];
      if (it.check !== undefined && t >= it.check) {
        const p = Math.min(1, (t - it.check) / 0.25);
        const cx = it.st.width + 18;
        c.strokeStyle = '#1e7a3c'; c.lineWidth = 4;
        c.beginPath(); c.moveTo(cx, -6);
        c.lineTo(cx + 6 * Math.min(1, p * 2), -6 + 8 * Math.min(1, p * 2));
        if (p > 0.5) c.lineTo(cx + 6 + 12 * (p - 0.5) * 2, 2 - 18 * (p - 0.5) * 2);
        c.stroke();
      }
      c.restore();
    });
    return pen;
  }
}

/** Dougs Hand mit Filzstift an der Stiftspitze (Nahaufnahme Flipchart). */
export function drawMarkerHand(c: CanvasRenderingContext2D, pen: P) {
  const [x, y] = pen;
  c.save();
  c.translate(x, y);
  c.rotate(-0.5);
  cut(c, rect(-4, -6, 64, 14, 41), '#1f3d8a');
  cut(c, rect(-10, -4, 8, 10, 42), '#1d1a1e', { shadow: false });
  cut(c, oval(46, 6, 26, 22, 43), '#f1c6a3');
  strip(c, [[60, 14], [140, 70]], 34, '#cfe0ee');
  c.restore();
}
