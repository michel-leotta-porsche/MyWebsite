// Die Selbsthilfegruppe: Doug (Leiter), Kevin, Barb, Tyler, Priya und Todo (der Klebezettel).
// Alle aus Papier ausgeschnitten, Weltkoordinaten der Kulisse (1920×1080, Weitwinkel).
import { type P, cut, label, nudge, oval, rect, rrect, strip } from './_paper';

export type Who = 'DOUG' | 'KEVIN' | 'BARB' | 'TYLER' | 'PRIYA' | 'TODO';
export type Mood = 'neutral' | 'sad' | 'smug' | 'shock' | 'happy' | 'deadpan';

export interface Pose {
  /** Mund 0..1 */
  open: number;
  /** Blick −1..1 (links/rechts), −1..1 (oben/unten) */
  look: number;
  lookY: number;
  mood: Mood;
  blink: boolean;
  /** Arme 0 = Ruhe, 1 = Geste; wave = Winken */
  armL: number;
  armR: number;
  wave: boolean;
  /** Hopser in px (nach oben positiv) */
  bounce: number;
  /** Stop-Motion-Schritt */
  s: number;
  /** Kopfneigung in rad (Wackeln beim Sprechen) */
  tilt: number;
}

export const SEAT_Y = 830;
export const POS: Record<Who, P> = {
  DOUG: [650, 900],
  KEVIN: [880, SEAT_Y],
  BARB: [1110, SEAT_Y],
  TYLER: [1340, SEAT_Y],
  PRIYA: [1570, SEAT_Y],
  TODO: [1806, 700],
};
/** Kopfmitte in Weltkoordinaten (Ziel für Nahaufnahmen und Blicke). */
export const HEAD: Record<Who, P> = {
  DOUG: [650, 496],
  KEVIN: [880, 640],
  BARB: [1110, 640],
  TYLER: [1340, 640],
  PRIYA: [1570, 640],
  TODO: [1806, 700],
};

const INK = '#1d1a1e';

/** Easter Eggs an den Figuren (Zeitpunkte gesetzt in club.ts). */
export const CAST_EGG = { med: Infinity, lgtmq: Infinity, t: 0 };

/** Weicher Schatten, den der große Kopf auf den Körper wirft. */
function chinShadow(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, 'rgba(20,15,10,0.32)');
  g.addColorStop(1, 'rgba(20,15,10,0)');
  c.save(); c.fillStyle = g; c.translate(x, y); c.scale(1, 0.32); c.translate(-x, -y);
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.restore();
}

/** Körper verkleinern (Drehpunkt an den Füßen, die bleiben am Boden). */
function bodyXf(c: CanvasRenderingContext2D, x: number, pivotY: number, k: number) {
  c.translate(x, pivotY); c.scale(k, k); c.translate(-x, -pivotY);
}
/** Kopf vergrößern und ohne Hals auf die Schultern setzen; beim Sprechen wackelt er. */
function headXf(c: CanvasRenderingContext2D, x: number, neckFrom: number, neckTo: number, k: number, p: Pose) {
  c.translate(x, neckTo - p.open * 5);
  c.rotate(p.tilt);
  c.scale(k, k);
  c.translate(-x, -neckFrom);
}
const WHITE = '#fbfaf5';

// ------------------------------------------------------------------ Gesicht

function eyes(c: CanvasRenderingContext2D, x: number, y: number, p: Pose, skin: string, o: { w?: number; h?: number; lash?: boolean; seed?: number } = {}) {
  const shock = p.mood === 'shock';
  const w = (o.w ?? 22) * (shock ? 1.15 : 1), h = (o.h ?? 28) * (shock ? 1.2 : 1);
  for (const s of [-1, 1]) {
    const ex = x + s * w * 0.92, ey = y;
    cut(c, oval(ex, ey, w, h, (o.seed ?? 0) + s, 28), WHITE, { shadow: false, edge: null });
    if (p.blink || p.mood === 'happy') {
      // geschlossen: Lid über das ganze Auge, bei „happy“ ein Bogen nach oben
      cut(c, oval(ex, ey, w + 1, h + 1, 5, 20, 0), skin, { shadow: false, edge: null });
      c.save();
      c.strokeStyle = INK; c.lineWidth = 3.2; c.lineCap = 'round';
      c.beginPath();
      if (p.mood === 'happy') c.arc(ex, ey + 6, w * 0.6, Math.PI * 1.15, Math.PI * 1.85);
      else { c.moveTo(ex - w * 0.7, ey + 2); c.lineTo(ex + w * 0.7, ey + 2); }
      c.stroke();
      c.restore();
      continue;
    }
    const pr = shock ? 3.6 : 4.8;
    const px = ex + p.look * w * 0.42 - s * (shock ? 0 : 1.5), py = ey + p.lookY * h * 0.3 + (p.mood === 'sad' ? 6 : 2);
    c.fillStyle = INK;
    c.beginPath(); c.arc(px, py, pr, 0, Math.PI * 2); c.fill();
    // Lider
    c.save();
    c.beginPath(); c.ellipse(ex, ey, w, h, 0, 0, Math.PI * 2); c.clip();
    c.fillStyle = skin;
    if (p.mood === 'sad') {
      c.beginPath(); c.moveTo(ex - s * w * 1.1, ey - h * 1.1); c.lineTo(ex + s * w * 1.1, ey - h * 1.1); c.lineTo(ex + s * w * 1.1, ey - h * 0.05); c.closePath(); c.fill();
    } else if (p.mood === 'smug' || p.mood === 'deadpan') {
      c.fillRect(ex - w - 2, ey - h - 2, w * 2 + 4, h * (p.mood === 'smug' ? 1.0 : 0.9));
    }
    c.restore();
    if (p.mood === 'smug' || p.mood === 'deadpan' || p.mood === 'sad') {
      c.save();
      c.strokeStyle = INK; c.lineWidth = 2.6;
      c.beginPath();
      if (p.mood === 'sad') { c.moveTo(ex - s * w * 0.9, ey - h * 0.95); c.lineTo(ex + s * w * 0.95, ey - h * 0.1); }
      else { const ly = ey - h + h * (p.mood === 'smug' ? 1.0 : 0.9); c.moveTo(ex - w * 0.95, ly); c.lineTo(ex + w * 0.95, ly); }
      c.stroke();
      c.restore();
    }
    if (o.lash) {
      c.save(); c.strokeStyle = INK; c.lineWidth = 2.4; c.lineCap = 'round';
      for (const k of [-0.6, 0, 0.6]) { c.beginPath(); c.moveTo(ex + k * w * 0.8, ey - h * 0.95); c.lineTo(ex + k * w * 1.15 + s * 3, ey - h * 1.35); c.stroke(); }
      c.restore();
    }
  }
}

function mouth(c: CanvasRenderingContext2D, x: number, y: number, p: Pose, o: { w?: number; lip?: string } = {}) {
  const w = o.w ?? 15;
  c.save();
  c.lineCap = 'round';
  if (p.open > 0.08) {
    const h = 4 + p.open * 20;
    cut(c, oval(x, y + h * 0.35, w + p.open * 4, h, 77, 18, 0.03), '#5b1d22', { shadow: false, edge: o.lip ?? INK, edgeW: o.lip ? 3.2 : 1.8 });
    c.fillStyle = '#e07583';
    c.beginPath(); c.ellipse(x + 2, y + h * 0.35 + h * 0.55, w * 0.55, h * 0.35, 0, 0, Math.PI * 2); c.fill();
  } else if (p.mood === 'shock') {
    cut(c, oval(x, y + 4, 7, 9, 78, 14), '#5b1d22', { shadow: false, edge: INK });
  } else {
    c.strokeStyle = o.lip ?? INK;
    c.lineWidth = o.lip ? 4 : 3;
    c.beginPath();
    if (p.mood === 'happy') c.arc(x, y - 8, w * 1.1, Math.PI * 0.2, Math.PI * 0.8);
    else if (p.mood === 'sad') c.arc(x, y + 12, w, Math.PI * 1.2, Math.PI * 1.8);
    else if (p.mood === 'smug') { c.moveTo(x - w, y + 2); c.quadraticCurveTo(x + 2, y + 5, x + w * 1.1, y - 6); }
    else { c.moveTo(x - w * 0.8, y + 1); c.lineTo(x + w * 0.8, y + 1); }
    c.stroke();
  }
  c.restore();
}

/** Arm als Papierstreifen mit Fäustling. */
function arm(c: CanvasRenderingContext2D, sx: number, sy: number, hx: number, hy: number, sleeve: string, skin: string, w = 24, elbow?: P) {
  const mid: P = elbow ?? [(sx + hx) / 2 + (hx > sx ? 6 : -6), (sy + hy) / 2 + 10];
  strip(c, [[sx, sy], mid, [hx, hy]], w, sleeve);
  cut(c, oval(hx, hy, 13, 12, 31, 14, 0.05), skin);
}

/** Armposition: Ruhe auf dem Schoß ↔ Geste/Winken. */
function hand(side: -1 | 1, k: number, p: Pose, x: number, y: number, rest: P, up: P): P {
  const wv = p.wave ? Math.sin(p.s * 1.9 + side) * 16 : 0;
  return [x + side * (rest[0] + (up[0] - rest[0]) * k) + (k > 0.5 ? wv : 0), y + rest[1] + (up[1] - rest[1]) * k];
}

function nameTag(c: CanvasRenderingContext2D, x: number, y: number, name: string, rot = -0.06) {
  c.save();
  c.translate(x, y); c.rotate(rot);
  cut(c, rect(-30, -19, 60, 38, 91, 0.6), WHITE, { edge: 'rgba(40,25,15,0.3)' });
  c.fillStyle = '#d6453b';
  c.fillRect(-29, -18, 58, 11);
  label(c, 'HELLO', 0, -9.5, 7.5, WHITE, { weight: 800, ls: 0.5 });
  label(c, name, 0, 13, 13, '#1f3d8a', { weight: 700 });
  c.restore();
}

function chair(c: CanvasRenderingContext2D, x: number, y: number) {
  const g = '#7c8590', g2 = '#646c76';
  strip(c, [[x - 62, y - 150], [x - 66, y + 85]], 9, g2);
  strip(c, [[x + 62, y - 150], [x + 66, y + 85]], 9, g2);
  cut(c, rrect(x - 68, y - 175, 136, 70, 10, 5), g);
  cut(c, rect(x - 84, y - 6, 168, 20, 6), g2);
  strip(c, [[x - 70, y + 14], [x - 82, y + 92]], 8, g2);
  strip(c, [[x + 70, y + 14], [x + 82, y + 92]], 8, g2);
}

function legs(c: CanvasRenderingContext2D, x: number, y: number, pants: string, shoe: string, s: number, shin?: string) {
  for (const k of [-1, 1]) {
    const [nx, ny] = nudge(k + 40, s, 0.5);
    cut(c, rect(x + k * 30 - 16 + nx, y + 2 + ny, 32, 64, 41 + k), shin ?? pants);
    cut(c, oval(x + k * 34 + nx, y + 72 + ny, 26, 12, 43 + k, 18), shoe);
  }
}

// ------------------------------------------------------------------ Figuren

export function drawKevin(c: CanvasRenderingContext2D, p: Pose) {
  const [x0, y0] = POS.KEVIN;
  const [nx, ny] = nudge(100, p.s, 0.6);
  const x = x0 + nx, y = y0 + ny - p.bounce;
  const skin = '#f2c9a0', hood = '#7fa3c8', hood2 = '#6b8db0';
  c.save(); bodyXf(c, x, y + 80, 0.82);
  chair(c, x0, y0);
  legs(c, x, y, '#3d5a80', '#f2f2ee', p.s);
  cut(c, oval(x, y - 150, 92, 42, 101), hood2);
  cut(c, [[x - 70, y - 128], [x + 70, y - 128], [x + 80, y + 8], [x - 80, y + 8]], hood);
  cut(c, rect(x - 36, y - 60, 72, 34, 102), hood2, { shadow: false });
  strip(c, [[x - 14, y - 125], [x - 16, y - 82]], 3, WHITE, false);
  strip(c, [[x + 14, y - 125], [x + 16, y - 82]], 3, WHITE, false);
  const hl = hand(-1, p.armL, p, x, y, [44, -36], [104, -168]);
  const hr = hand(1, p.armR, p, x, y, [44, -36], [104, -168]);
  arm(c, x - 66, y - 112, hl[0], hl[1], hood, skin);
  arm(c, x + 66, y - 112, hr[0], hr[1], hood, skin);
  nameTag(c, x + 42, y - 92, 'KEVIN', 0.05);
  c.restore(); chinShadow(c, x, y - 98, 72); c.save(); headXf(c, x, y - 135, y - 100, 1.4, p);
  // Kopf
  cut(c, oval(x, y - 200, 78, 70, 103), skin);
  cut(c, [[x - 80, y - 214], [x - 70, y - 262], [x - 40, y - 282], [x - 22, y - 270], [x - 4, y - 290], [x + 18, y - 272], [x + 44, y - 286], [x + 66, y - 258], [x + 82, y - 222], [x + 52, y - 240], [x + 20, y - 236], [x - 18, y - 244], [x - 50, y - 236]], '#5b3a29');
  eyes(c, x, y - 206, p, skin, { w: 21, h: 26, seed: 104 });
  // Brille
  c.save(); c.strokeStyle = INK; c.lineWidth = 3.2;
  c.strokeRect(x - 45, y - 230, 41, 46); c.strokeRect(x + 4, y - 230, 41, 46);
  c.beginPath(); c.moveTo(x - 4, y - 212); c.lineTo(x + 4, y - 212); c.stroke();
  c.restore();
  mouth(c, x, y - 160, p, { w: 14 });
  c.restore();
}

export function drawBarb(c: CanvasRenderingContext2D, p: Pose) {
  const [x0, y0] = POS.BARB;
  const [nx, ny] = nudge(200, p.s, 0.6);
  const x = x0 + nx, y = y0 + ny - p.bounce;
  const skin = '#f7d5bc', top = '#e58a75';
  c.save(); bodyXf(c, x, y + 80, 0.82);
  chair(c, x0, y0);
  legs(c, x, y, '#3b3b4f', '#c0392b', p.s);
  // Haarhelm hinter dem Kopf
  c.restore(); chinShadow(c, x, y - 98, 72); c.save(); headXf(c, x, y - 135, y - 100, 1.4, p);
  cut(c, oval(x, y - 214, 106, 100, 201), '#ebc86a');
  c.restore(); c.save(); bodyXf(c, x, y + 80, 0.82);
  cut(c, [[x - 72, y - 126], [x + 72, y - 126], [x + 82, y + 8], [x - 82, y + 8]], top);
  cut(c, [[x - 26, y - 126], [x + 26, y - 126], [x, y - 80]], WHITE, { shadow: false });
  for (let i = 0; i < 4; i++) { c.fillStyle = '#f6e7b0'; c.beginPath(); c.arc(x - 5, y - 70 + i * 22, 4, 0, Math.PI * 2); c.fill(); }
  const hl = hand(-1, p.armL, p, x, y, [44, -36], [108, -172]);
  const hr = hand(1, p.armR, p, x, y, [44, -36], [108, -172]);
  arm(c, x - 66, y - 112, hl[0], hl[1], top, skin);
  arm(c, x + 66, y - 112, hr[0], hr[1], top, skin);
  nameTag(c, x - 44, y - 90, 'BARB', -0.08);
  // Perlen
  for (let i = 0; i < 11; i++) {
    const a = Math.PI * (0.18 + 0.64 * (i / 10));
    c.fillStyle = WHITE; c.beginPath(); c.arc(x + Math.cos(a) * 46, y - 140 + Math.sin(a) * 26, 5, 0, Math.PI * 2); c.fill();
  }
  c.restore(); chinShadow(c, x, y - 98, 72); c.save(); headXf(c, x, y - 135, y - 100, 1.4, p);
  cut(c, oval(x, y - 198, 76, 68, 202), skin);
  // Pony
  cut(c, [[x - 92, y - 220], [x - 70, y - 278], [x - 20, y - 300], [x + 40, y - 296], [x + 84, y - 262], [x + 94, y - 218], [x + 60, y - 248], [x + 10, y - 256], [x - 40, y - 248]], '#ebc86a');
  // Ohrringe, Lidschatten
  c.fillStyle = '#d4a017';
  c.beginPath(); c.arc(x - 78, y - 182, 8, 0, Math.PI * 2); c.arc(x + 78, y - 182, 8, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(80,140,220,0.55)';
  c.beginPath(); c.ellipse(x - 21, y - 232, 22, 9, 0, 0, Math.PI * 2); c.ellipse(x + 21, y - 232, 22, 9, 0, 0, Math.PI * 2); c.fill();
  eyes(c, x, y - 204, p, skin, { w: 20, h: 25, lash: true, seed: 203 });
  mouth(c, x, y - 160, p, { w: 14, lip: '#c0392b' });
  c.restore();
}

export function drawTyler(c: CanvasRenderingContext2D, p: Pose) {
  const [x0, y0] = POS.TYLER;
  const [nx, ny] = nudge(300, p.s, 0.6);
  const x = x0 + nx, y = y0 + ny - p.bounce;
  const skin = '#e5ae84';
  c.save(); bodyXf(c, x, y + 80, 0.82);
  chair(c, x0, y0);
  legs(c, x, y, '#8c7b5a', '#7ce04a', p.s, skin);
  cut(c, rect(x - 50, y - 6, 100, 30, 301), '#8c7b5a');
  cut(c, [[x - 62, y - 128], [x + 62, y - 128], [x + 74, y + 8], [x - 74, y + 8]], '#f2f2ee');
  cut(c, [[x - 70, y - 132], [x - 48, y - 132], [x - 52, y - 92]], skin, { shadow: false });
  cut(c, [[x + 70, y - 132], [x + 48, y - 132], [x + 52, y - 92]], skin, { shadow: false });
  c.save(); c.strokeStyle = '#d4a017'; c.lineWidth = 4; c.beginPath(); c.arc(x, y - 138, 38, Math.PI * 0.2, Math.PI * 0.8); c.stroke(); c.restore();
  const hl = hand(-1, p.armL, p, x, y, [46, -40], [104, -176]);
  const hr = hand(1, p.armR, p, x, y, [46, -40], [104, -176]);
  arm(c, x - 64, y - 116, hl[0], hl[1], skin, skin, 22);
  arm(c, x + 64, y - 116, hr[0], hr[1], skin, skin, 22);
  nameTag(c, x + 30, y - 72, 'TYLER', 0.07);
  // Dose in der rechten Hand
  c.save();
  c.translate(hr[0] + 4, hr[1] - 28);
  cut(c, rect(-15, -26, 30, 52, 302), '#43c46b');
  cut(c, rect(-15, -30, 30, 7, 303), '#c9d1d6', { shadow: false });
  label(c, CAST_EGG.t < CAST_EGG.med ? 'MAX' : 'MED', 0, 6, 11, '#0f3d1e', { weight: 800, rot: -Math.PI / 2 });
  c.restore();
  c.restore(); chinShadow(c, x, y - 98, 72); c.save(); headXf(c, x, y - 135, y - 100, 1.4, p);
  cut(c, oval(x, y - 200, 78, 70, 304), skin);
  // Kappe verkehrt herum: Kuppel plus Schirm nach hinten oben
  cut(c, [[x + 30, y - 262], [x + 96, y - 300], [x + 112, y - 284], [x + 60, y - 248]], '#b8352a');
  cut(c, oval(x, y - 236, 80, 52, 305, 26, 0.01, Math.PI, Math.PI * 2), '#d9483b');
  cut(c, rect(x - 80, y - 240, 160, 12, 306), '#b8352a', { shadow: false });
  // Sonnenbrille auf der Kappe
  cut(c, rrect(x - 50, y - 270, 42, 20, 8, 307), '#1d1a1e', { shadow: false });
  cut(c, rrect(x + 8, y - 270, 42, 20, 8, 308), '#1d1a1e', { shadow: false });
  eyes(c, x, y - 200, p, skin, { w: 20, h: 25, seed: 309 });
  mouth(c, x, y - 158, p, { w: 16 });
  c.restore();
}

export function drawPriya(c: CanvasRenderingContext2D, p: Pose) {
  const [x0, y0] = POS.PRIYA;
  const [nx, ny] = nudge(400, p.s, 0.6);
  const x = x0 + nx, y = y0 + ny - p.bounce;
  const skin = '#b98262', top = '#2e2b3a';
  c.save(); bodyXf(c, x, y + 80, 0.82);
  chair(c, x0, y0);
  legs(c, x, y, '#1f1d24', '#5a4636', p.s);
  c.restore(); chinShadow(c, x, y - 98, 72); c.save(); headXf(c, x, y - 135, y - 100, 1.4, p);
  cut(c, rrect(x - 98, y - 285, 196, 128, 46, 405), '#1d1a1e');
  c.restore(); c.save(); bodyXf(c, x, y + 80, 0.82);
  cut(c, [[x - 68, y - 128], [x + 68, y - 128], [x + 78, y + 8], [x - 78, y + 8]], top);
  cut(c, rrect(x - 40, y - 146, 80, 30, 12, 401), '#3b3748');
  const hl = hand(-1, p.armL, p, x, y, [40, -40], [100, -170]);
  const hr = hand(1, p.armR, p, x, y, [40, -40], [100, -170]);
  arm(c, x - 64, y - 112, hl[0], hl[1], top, skin);
  arm(c, x + 64, y - 112, hr[0], hr[1], top, skin);
  nameTag(c, x - 38, y - 88, 'PRIYA', -0.04);
  // Tasse
  c.save();
  c.translate(hr[0] - 6, hr[1] - 26);
  cut(c, rect(-20, -24, 40, 46, 402), WHITE);
  label(c, CAST_EGG.t < CAST_EGG.lgtmq ? 'LGTM' : 'LGTM?', 0, 4, CAST_EGG.t < CAST_EGG.lgtmq ? 10 : 8.5, '#1d1a1e', { mono: true, weight: 600 });
  c.restore();
  c.restore(); chinShadow(c, x, y - 98, 72); c.save(); headXf(c, x, y - 135, y - 100, 1.4, p);
  cut(c, oval(x, y - 200, 76, 70, 403), skin);
  cut(c, [[x - 94, y - 218], [x - 82, y - 270], [x - 30, y - 296], [x + 30, y - 296], [x + 82, y - 270], [x + 94, y - 218], [x + 70, y - 238], [x - 70, y - 238]], '#1d1a1e');
  c.fillStyle = '#c9d1d6';
  c.beginPath(); c.arc(x - 76, y - 178, 5, 0, Math.PI * 2); c.arc(x + 76, y - 178, 5, 0, Math.PI * 2); c.fill();
  eyes(c, x, y - 200, p, skin, { w: 20, h: 25, seed: 404 });
  mouth(c, x, y - 158, p, { w: 13 });
  c.restore();
}

export function drawDoug(c: CanvasRenderingContext2D, p: Pose, point = 0) {
  const [x0, y0] = POS.DOUG;
  const [nx, ny] = nudge(500, p.s, 0.6);
  const x = x0 + nx, y = y0 + ny - p.bounce;
  const skin = '#f1c6a3';
  c.save(); bodyXf(c, x, y, 0.85);
  // Beine
  for (const k of [-1, 1]) {
    cut(c, rect(x + k * 30 - 20, y - 150, 40, 140, 501 + k), '#c8b48a');
    cut(c, oval(x + k * 36, y - 4, 30, 13, 503 + k), '#5a3b26');
  }
  cut(c, [[x - 78, y - 360], [x + 78, y - 360], [x + 86, y - 140], [x - 86, y - 140]], '#cfe0ee');
  cut(c, [[x - 70, y - 352], [x - 18, y - 352], [x, y - 300], [x + 18, y - 352], [x + 70, y - 352], [x + 80, y - 150], [x - 80, y - 150]], '#8c6e9e');
  // Rautenmuster
  c.save();
  c.fillStyle = 'rgba(255,255,255,0.18)';
  for (let r = 0; r < 4; r++) for (let k = -1; k <= 1; k++) {
    const cx = x + k * 42 + (r % 2) * 21, cy = y - 290 + r * 38;
    c.beginPath(); c.moveTo(cx, cy - 16); c.lineTo(cx + 12, cy); c.lineTo(cx, cy + 16); c.lineTo(cx - 12, cy); c.closePath(); c.fill();
  }
  c.restore();
  // linke Hand (Bild links) zeigt aufs Flipchart; rechte hält das Klemmbrett
  const reach = Math.max(point, p.armL);
  const hl: P = [x - 60 - reach * 92, y - 260 - reach * 50 + Math.sin(p.s * 1.3) * 4 * reach];
  arm(c, x - 76, y - 330, hl[0], hl[1], '#cfe0ee', skin, 26);
  if (point > 0.5) {
    // Zeigefinger
    strip(c, [[hl[0] - 6, hl[1] - 4], [hl[0] - 26, hl[1] - 14]], 9, skin);
  }
  const hr: P = [x + 54 - p.armR * 20, y - 236 - p.armR * 40];
  arm(c, x + 76, y - 330, hr[0], hr[1], '#cfe0ee', skin, 26);
  nameTag(c, x - 34, y - 296, 'DOUG', -0.05);
  c.save();
  c.translate(hr[0] - 10, hr[1] - 40); c.rotate(-0.12);
  cut(c, rect(-40, -55, 80, 110, 505), '#a47148');
  cut(c, rect(-32, -42, 64, 90, 506), WHITE, { shadow: false });
  cut(c, rect(-14, -60, 28, 14, 507), '#9aa3ad', { shadow: false });
  c.strokeStyle = 'rgba(30,60,140,0.6)'; c.lineWidth = 2;
  for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-24, -26 + i * 15); c.lineTo(18 - (i % 2) * 14, -26 + i * 15); c.stroke(); }
  c.restore();
  c.restore(); chinShadow(c, x, y - 310, 80); c.save(); headXf(c, x, y - 360, y - 312, 1.35, p);
  // Kopf: Glatze mit grauen Seitenhaaren und Schnurrbart
  cut(c, oval(x - 76, y - 446, 22, 30, 508), '#9a8f86');
  cut(c, oval(x + 76, y - 446, 22, 30, 509), '#9a8f86');
  cut(c, oval(x, y - 430, 82, 76, 510), skin);
  c.fillStyle = 'rgba(255,255,255,0.4)';
  c.beginPath(); c.ellipse(x - 26, y - 482, 18, 9, -0.4, 0, Math.PI * 2); c.fill();
  c.save(); c.strokeStyle = '#7a6f66'; c.lineWidth = 7; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - 44, y - 470); c.lineTo(x - 10, y - 464); c.moveTo(x + 10, y - 464); c.lineTo(x + 44, y - 470); c.stroke();
  c.restore();
  eyes(c, x, y - 436, p, skin, { w: 20, h: 24, seed: 511 });
  mouth(c, x, y - 384, p, { w: 16 });
  cut(c, [[x - 46, y - 404], [x - 20, y - 412], [x, y - 404], [x + 20, y - 412], [x + 46, y - 404], [x + 36, y - 390], [x, y - 398], [x - 36, y - 390]], '#6b4a33');
  c.restore();
}

/** Todo: Klebezettel mit Gefühlen. `at` = Position (Urne oder Flipchart). */
export function drawTodo(c: CanvasRenderingContext2D, p: Pose, at: P, scale = 1) {
  const [nx, ny] = nudge(600, p.s, 0.8);
  const x = at[0] + nx, y = at[1] + ny - p.bounce;
  c.save();
  c.translate(x, y); c.scale(scale, scale);
  const k = 34;
  // Ärmchen und Beinchen
  const up = p.armL > 0.5 || p.wave;
  const wv = p.wave ? Math.sin(p.s * 2.1) * 8 : 0;
  strip(c, [[-k, 4], [-k - 18, up ? -22 + wv : 18]], 3.5, INK);
  strip(c, [[k, 4], [k + 18, up ? -22 - wv : 18]], 3.5, INK);
  strip(c, [[-12, k], [-14, k + 18], [-22, k + 20]], 3.5, INK);
  strip(c, [[12, k], [14, k + 18], [22, k + 20]], 3.5, INK);
  cut(c, [[-k, -k], [k, -k], [k, k - 14], [k - 14, k], [-k, k]], '#ffe066');
  cut(c, [[k, k - 14], [k - 14, k - 14], [k - 14, k]], '#e8c94a', { shadow: false });
  c.fillStyle = 'rgba(255,255,255,0.3)';
  c.fillRect(-k, -k, 2 * k, 8);
  const tiny: Pose = { ...p };
  eyes(c, 0, -6, tiny, '#ffe066', { w: 10, h: 13, seed: 601 });
  mouth(c, 0, 16, tiny, { w: 7 });
  c.restore();
}

export const DRAW: Record<Exclude<Who, 'TODO' | 'DOUG'>, (c: CanvasRenderingContext2D, p: Pose) => void> = {
  KEVIN: drawKevin,
  BARB: drawBarb,
  TYLER: drawTyler,
  PRIYA: drawPriya,
};
