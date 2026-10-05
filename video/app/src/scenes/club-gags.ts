// Die Rückblenden: kurze Gag-Szenen im Bildraum (1920×1080), jede mit eigenem Hintergrund.
// g.t0 = Schnitt in die Rückblende, g.at() liefert Wortzeiten aus dem Drehbuch.
import { drawStrokeText, strokeText, type StrokeText } from '../engine/stroke';
import { clamp, ease, hash, prog } from '../engine/util';
import { type P, cut, label, oval, rect, rrect, stepOf, stepT, strip } from './_paper';

const WHITE = '#fbfaf5';
const INK = '#1d1a1e';

export interface GagCtx {
  t: number;
  t0: number;
  t1: number;
  /** Startzeit eines Worts in der Zeile, die `q` enthält. */
  at: (q: string, w?: string) => number;
  end: (q: string) => number;
}

function tag(c: CanvasRenderingContext2D, s: string) {
  c.save();
  c.translate(70, 70); c.rotate(-0.02);
  c.font = '22px "Plex-600"';
  c.letterSpacing = '2px';
  const w = c.measureText(s).width + 44;
  c.letterSpacing = '0px';
  cut(c, rect(0, 0, w, 50, 901), '#ffe066');
  label(c, s, w / 2, 33, 22, INK, { mono: true, weight: 600, ls: 2 });
  c.restore();
}

function flame(c: CanvasRenderingContext2D, x: number, y: number, h: number, s: number, i: number) {
  const k = 0.8 + hash(s, i, 5) * 0.4;
  const hh = h * k, w = h * 0.42;
  const lean = (hash(s, i, 6) - 0.5) * w * 0.6;
  const f = (sc: number, col: string) => cut(c, [[x - w * sc, y], [x - w * 0.7 * sc, y - hh * 0.45 * sc], [x + lean * sc, y - hh * sc], [x + w * 0.7 * sc, y - hh * 0.5 * sc], [x + w * sc, y]], col, { shadow: false, edge: null });
  f(1, '#e2483d'); f(0.72, '#f28c28'); f(0.42, '#ffd23f');
}

function star(c: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, rot = 0, n = 5, inner = 0.45) {
  const pts: P[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * inner : r;
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  cut(c, pts, col);
}

function burst(c: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, txt: string, txtCol: string, rot: number, size = 30) {
  star(c, x, y, r, col, rot, 12, 0.72);
  label(c, txt, x, y + size * 0.35, size, txtCol, { weight: 800, rot: rot * 0.3 });
}

// ------------------------------------------------------------------ Kevin: „looks done“

export function gagFire(c: CanvasRenderingContext2D, g: GagCtx) {
  const s = stepOf(g.t);
  c.fillStyle = '#26303d'; c.fillRect(0, 0, 1920, 1080);
  c.fillStyle = '#1b222c'; c.fillRect(0, 860, 1920, 220);
  // Serverschrank
  cut(c, rect(1060, 260, 360, 620, 1), '#3b4350');
  for (let i = 0; i < 9; i++) {
    cut(c, rect(1080, 290 + i * 64, 320, 48, 10 + i), '#2a3038', { shadow: false });
    for (let k = 0; k < 4; k++) {
      c.fillStyle = hash(s, i, k) > 0.5 ? '#e2483d' : '#43c46b';
      c.beginPath(); c.arc(1110 + k * 22, 314 + i * 64, 6, 0, Math.PI * 2); c.fill();
    }
  }
  // Flammen wachsen, bei „done“ Stichflamme
  const tDone = g.at('I let Claude', 'done.”');
  const grow = 0.45 + 0.55 * ease.outCubic(prog(g.t, g.t0, tDone)) + 0.5 * Math.max(0, 1 - Math.abs(g.t - tDone - 0.25) * 3);
  for (let i = 0; i < 7; i++) flame(c, 1080 + i * 52, 270, 160 * grow, s, i);
  for (let i = 0; i < 3; i++) flame(c, 1050 + i * 170, 880, 120 * grow, s + 3, i + 10);
  // Rauch
  for (let i = 0; i < 6; i++) {
    const u = ((stepT(g.t) * 0.25 + i / 6) % 1);
    cut(c, oval(1180 + Math.sin(i * 2 + u * 3) * 120, 220 - u * 260, 60 + u * 60, 40 + u * 40, 20 + i), `rgba(140,140,150,${0.55 * (1 - u)})`, { shadow: false, edge: null });
  }
  // Fröhlicher Monitor davor
  cut(c, rect(330, 360, 560, 360, 2), '#1d1a1e');
  cut(c, rect(352, 382, 516, 316, 3), '#0f1a12', { shadow: false });
  cut(c, rect(580, 720, 60, 70, 4), '#3b4350');
  cut(c, rect(500, 784, 220, 20, 5), '#3b4350');
  label(c, '✓ Looks done!', 610, 520, 56, '#7ce04a', { mono: true, weight: 600 });
  label(c, 'tests run: 0', 610, 590, 26, '#7ce04a', { mono: true, weight: 500 });
  label(c, ':)', 610, 660, 40, '#7ce04a', { mono: true, weight: 600 });
  tag(c, 'FLASHBACK · KEVIN’S DEPLOY, LAST TUESDAY');
}

// ------------------------------------------------------------------ Tyler: 12-Seiten-Plan

const PHASES = [
  'Phase 1: Stakeholder alignment',
  'Phase 2: Risk matrix',
  'Phase 3: Form a spelling committee',
  'Phase 4: Migrate to a new dictionary',
  'Phase 5: Load testing',
  'Phase 6: Rollback strategy',
  'Phase 7: Second risk matrix',
  'Phase 8: Retro about the risk matrix',
  'Phase 12: change “teh” to “the”',
];

export function gagPlan(c: CanvasRenderingContext2D, g: GagCtx) {
  c.fillStyle = '#b98a5a'; c.fillRect(0, 0, 1920, 1080);
  // Stapel
  for (let i = 4; i >= 1; i--) cut(c, rect(560 + i * 14, 120 + i * 10, 800, 920, 30 + i), '#efece2');
  cut(c, rect(560, 120, 800, 920, 30), WHITE);
  label(c, 'PLAN v12', 620, 210, 64, INK, { align: 'left', weight: 800 });
  label(c, 'Goal: fix one typo in README.md', 622, 256, 26, '#6b6660', { align: 'left', weight: 500 });
  const tTypo = g.at('Yo. Tyler.', 'typo.');
  const n = Math.floor(clamp((stepT(g.t) - g.t0) / 0.22, 0, PHASES.length));
  for (let i = 0; i < n; i++) {
    const last = i === PHASES.length - 1;
    label(c, PHASES[i]!, 622, 330 + i * 72 + (last ? 20 : 0), 30, last ? '#c0392b' : INK, { align: 'left', weight: last ? 800 : 600 });
    if (i === PHASES.length - 2) label(c, '…', 640, 330 + (i + 0.6) * 72, 30, '#6b6660', { align: 'left' });
  }
  const page = 1 + Math.min(11, Math.floor(Math.max(0, g.t - g.t0) * 5));
  label(c, `page ${page} of 12`, 1330, 180, 24, '#6b6660', { align: 'right', mono: true, weight: 500 });
  if (g.t >= tTypo) {
    const p = clamp((g.t - tTypo) / 0.4);
    c.save(); c.strokeStyle = '#c0392b'; c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.ellipse(900, 330 + 8 * 72 + 8, 330, 52, -0.02, -Math.PI * 0.6, -Math.PI * 0.6 + Math.PI * 2.1 * p); c.stroke();
    c.restore();
  }
  tag(c, 'FLASHBACK · TYLER’S PLAN');
}

// ------------------------------------------------------------------ Barb: „make it better“

export function gagGaudy(c: CanvasRenderingContext2D, g: GagCtx) {
  const s = stepOf(g.t);
  const t1 = g.at("I'm Barb", 'better.”'), t2 = g.at("I'm Barb", 'Better!”');
  const lvl = g.t >= t2 ? 2 : g.t >= t1 ? 1 : 0;
  c.fillStyle = '#3d4654'; c.fillRect(0, 0, 1920, 1080);
  // Browserfenster
  cut(c, rect(240, 120, 1440, 860, 50), '#d9dde3');
  for (const [i, col] of [['0', '#e2483d'], ['1', '#f2b544'], ['2', '#43c46b']] as const) { c.fillStyle = col; c.beginPath(); c.arc(276 + +i * 30, 150, 9, 0, Math.PI * 2); c.fill(); }
  cut(c, rrect(400, 134, 600, 34, 14, 51), WHITE, { shadow: false });
  label(c, 'barbs-bakery.com', 420, 158, 18, '#6b6660', { align: 'left', mono: true, weight: 500 });
  const X = 256, Y = 180, Wd = 1408, Ht = 784;
  if (lvl === 0) { c.fillStyle = WHITE; c.fillRect(X, Y, Wd, Ht); }
  else if (lvl === 1) { c.fillStyle = '#ffd1e3'; c.fillRect(X, Y, Wd, Ht); }
  else {
    const cols = ['#e2483d', '#f28c28', '#ffd23f', '#43c46b', '#4f9bd9', '#8f5fd0'];
    for (let i = 0; i < 6; i++) { c.fillStyle = cols[(i + s) % 6]!; c.fillRect(X, Y + (i * Ht) / 6, Wd, Ht / 6 + 1); }
  }
  c.save();
  c.beginPath(); c.rect(X, Y, Wd, Ht); c.clip();
  // Torte
  const bounce = lvl === 2 ? Math.abs(Math.sin(s * 0.9)) * 40 : 0;
  const cx = 960, cy = 640 - bounce;
  cut(c, rect(cx - 170, cy - 40, 340, 140, 52), '#f7d9a8');
  cut(c, rect(cx - 120, cy - 150, 240, 110, 53), '#f4a6c0');
  cut(c, rect(cx - 6, cy - 210, 12, 60, 54), '#4f9bd9');
  flame(c, cx, cy - 210, 40, s, 1);
  label(c, lvl === 0 ? 'Barb’s Bakery' : lvl === 1 ? 'Barb’s BAKERY!' : 'BARB’S BAKERY!!!', 960, 320, lvl === 0 ? 70 : lvl === 1 ? 90 : 110, lvl === 0 ? INK : lvl === 1 ? '#c0392b' : WHITE, { weight: 800, rot: lvl === 2 ? Math.sin(s) * 0.05 : 0 });
  if (lvl === 0) {
    label(c, 'Fresh bread. Since 1987.', 960, 390, 30, '#6b6660', { weight: 500 });
  }
  if (lvl >= 1) {
    burst(c, 1390, 330, 110, '#ffe066', 'NEW!', '#c0392b', s * 0.1, 40);
    for (let i = 0; i < 5; i++) star(c, 380 + i * 60, 820 - (i % 2) * 40, 22, '#ffe066', s * 0.2 + i);
  }
  if (lvl === 2) {
    burst(c, 520, 520, 130, '#43c46b', '100% BETTER', WHITE, -s * 0.1, 28);
    burst(c, 1420, 760, 120, '#e2483d', 'SALE!!!', WHITE, s * 0.15, 40);
    for (let i = 0; i < 8; i++) flame(c, 300 + i * 190, 970, 120, s, i);
    const mx = 1700 - ((g.t - t2) * 900) % 2600;
    label(c, '★ BEST BAKERY IN THE MULTIVERSE ★ NOW WITH 40% MORE SPARKLE ★', mx, 250, 40, WHITE, { align: 'left', weight: 800 });
    c.save(); c.translate(1300, 520); c.rotate(0.12);
    cut(c, rect(-150, -45, 300, 90, 55), '#ffd23f');
    label(c, 'UNDER CONSTRUCTION', 0, 10, 28, INK, { weight: 800 });
    c.restore();
  }
  c.restore();
  // Fußzeile, winzig
  label(c, '© 1987 Barb’s Bakery · Powered by make it better™', 960, 958, 11, lvl === 0 ? '#9a948c' : WHITE, { mono: true, weight: 500 });
  tag(c, `FLASHBACK · BARB’S WEBSITE, ITERATION ${lvl === 0 ? 1 : lvl === 1 ? 2 : 14}`);
}

// ------------------------------------------------------------------ Priya: Sitzung seit März

const MONTHS = ['MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER'];

export function gagCobweb(c: CanvasRenderingContext2D, g: GagCtx) {
  const s = stepOf(g.t);
  c.fillStyle = '#20242c'; c.fillRect(0, 0, 1920, 1080);
  cut(c, rect(300, 170, 1000, 740, 60), '#11151b');
  cut(c, rect(300, 170, 1000, 44, 61), '#3b4350', { shadow: false });
  label(c, 'session — open since March 3', 330, 200, 20, '#c9d1dd', { align: 'left', mono: true, weight: 500 });
  const lines = ['> fix the button', '> no the OTHER button', '> undo that', '> why is the footer purple', '> fix the button again', '> what did we do in april', '> pretty please'];
  lines.forEach((l, i) => label(c, l, 340, 270 + i * 50, 26, `rgba(201,209,221,${0.25 + i * 0.1})`, { align: 'left', mono: true, weight: 500 }));
  // Spinnweben in den Ecken
  const web = (x: number, y: number, sx: number, sy: number) => {
    c.save(); c.strokeStyle = 'rgba(230,230,235,0.55)'; c.lineWidth = 1.6;
    for (let i = 0; i <= 5; i++) { const a = (i / 5) * Math.PI / 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + sx * Math.cos(a) * 170, y + sy * Math.sin(a) * 170); c.stroke(); }
    for (let r = 30; r <= 160; r += 32) { c.beginPath(); for (let i = 0; i <= 5; i++) { const a = (i / 5) * Math.PI / 2; const px = x + sx * Math.cos(a) * r, py = y + sy * Math.sin(a) * r; if (i) c.lineTo(px, py); else c.moveTo(px, py); } c.stroke(); }
    c.restore();
  };
  web(300, 214, 1, 1); web(1300, 214, -1, 1); web(300, 910, 1, -1);
  // Kontext-Balken
  const blink = s % 4 < 2;
  cut(c, rect(340, 820, 920, 46, 62), '#2a3038', { shadow: false });
  cut(c, rect(344, 824, 900, 38, 63), blink ? '#e2483d' : '#b8352a', { shadow: false, edge: null });
  label(c, 'CONTEXT 99%', 800, 852, 26, WHITE, { mono: true, weight: 600 });
  // Strichliste der Korrekturen
  const t0 = g.at('Priya. My session', 'corrected'), t1 = g.at('Priya. My session', 'times.');
  const k = Math.floor(clamp((g.t - t0) / Math.max(0.1, t1 - t0)) * 11);
  cut(c, rect(1380, 520, 400, 260, 64), WHITE);
  label(c, 'corrections', 1580, 570, 28, INK, { weight: 700 });
  c.save(); c.strokeStyle = '#c0392b'; c.lineWidth = 6; c.lineCap = 'round';
  for (let i = 0; i < k; i++) {
    const grp = Math.floor(i / 5), j = i % 5;
    const x = 1420 + grp * 110 + j * 18;
    if (j === 4) { c.beginPath(); c.moveTo(x - 80, 690); c.lineTo(x + 6, 630); c.stroke(); }
    else { c.beginPath(); c.moveTo(x, 610); c.lineTo(x + 2, 710); c.stroke(); }
  }
  c.restore();
  // Kalenderblätter fliegen
  const m = Math.min(MONTHS.length - 1, Math.floor(Math.max(0, g.t - g.t0) * 2.2));
  cut(c, rect(1460, 200, 240, 260, 65), WHITE);
  cut(c, rect(1460, 200, 240, 60, 66), '#c0392b', { shadow: false });
  label(c, MONTHS[m]!, 1580, 244, 30, WHITE, { weight: 800 });
  label(c, String(3 + m * 31 % 28), 1580, 400, 110, INK, { weight: 800 });
  if (m > 0) {
    const u = (Math.max(0, g.t - g.t0) * 2.2) % 1;
    c.save(); c.translate(1580 + u * 300, 330 - u * 200); c.rotate(u * 2);
    cut(c, rect(-120, -130, 240, 260, 67), WHITE, { alpha: 1 - u });
    c.restore();
  }
  tag(c, 'FLASHBACK · PRIYA’S SESSION, DAY 214');
}

// ------------------------------------------------------------------ Tyler: max für „hello“

export function gagMax(c: CanvasRenderingContext2D, g: GagCtx) {
  const s = stepOf(g.t);
  const tEnd = g.end('Also. I set effort');
  const dark = clamp((g.t - tEnd - 0.2) / 0.1);
  c.fillStyle = '#151a22'; c.fillRect(0, 0, 1920, 1080);
  // Skyline
  for (let i = 0; i < 12; i++) {
    const x = i * 170 - 40, h = 180 + hash(i, 3) * 260;
    cut(c, rect(x, 1080 - h, 150, h, 70 + i), '#232b38', { shadow: false });
    for (let r = 0; r < 6; r++) for (let k = 0; k < 3; k++) {
      const off = hash(i, r, k) < dark * 1.2;
      c.fillStyle = off ? '#2a3240' : '#ffd23f';
      c.fillRect(x + 22 + k * 40, 1080 - h + 30 + r * 40, 22, 22);
    }
  }
  // Terminal
  cut(c, rect(240, 160, 900, 520, 80), dark > 0.5 ? '#0b0e12' : '#11151b');
  const typed = 'HELLO'.slice(0, Math.floor(clamp((g.t - g.t0) / 0.6) * 5));
  label(c, `> ${typed}`, 290, 260, 48, '#c9d1dd', { align: 'left', mono: true, weight: 600 });
  if (g.t > g.t0 + 0.7) {
    const secs = Math.floor((g.t - g.t0 - 0.7) * 2600);
    const hh = Math.floor(secs / 3600), mm = Math.floor(secs / 60) % 60, ss = secs % 60;
    label(c, `Thinking… ${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, 290, 350, 44, '#ffb224', { align: 'left', mono: true, weight: 600 });
    label(c, 'effort: MAX', 290, 420, 30, '#e2483d', { align: 'left', mono: true, weight: 600 });
  }
  // Effort-Regler am Anschlag, zittert
  const gx = 1500, gy = 560, R = 230;
  cut(c, [...Array.from({ length: 25 }, (_, i): P => { const a = Math.PI + (i / 24) * Math.PI; return [gx + Math.cos(a) * R, gy + Math.sin(a) * R]; }), [gx + R, gy + 20], [gx - R, gy + 20]], '#2a3038');
  ['LOW', 'MED', 'HIGH', 'XHIGH', 'MAX'].forEach((l, i) => {
    const a = Math.PI + (i / 4) * Math.PI;
    label(c, l, gx + Math.cos(a) * (R - 60), gy + Math.sin(a) * (R - 60) + 8, 20, i === 4 ? '#e2483d' : '#9aa3b2', { mono: true, weight: 600 });
  });
  const a = Math.PI * 2 - 0.05 + (hash(s, 9) - 0.5) * 0.12;
  strip(c, [[gx, gy], [gx + Math.cos(a) * (R - 30), gy + Math.sin(a) * (R - 30)]], 10, '#e2483d');
  cut(c, oval(gx, gy, 22, 22, 81), '#59626c');
  if (dark > 0) { c.fillStyle = `rgba(0,0,0,${dark * 0.6})`; c.fillRect(0, 0, 1920, 1080); }
  tag(c, 'FLASHBACK · TYLER SAYS HELLO');
}

// ------------------------------------------------------------------ Barb: CLAUDE.md-Rolle

export function gagScroll(c: CanvasRenderingContext2D, g: GagCtx) {
  c.fillStyle = '#8a5a36'; c.fillRect(0, 0, 1920, 1080);
  c.fillStyle = '#74472a';
  for (let x = 0; x < 1920; x += 64) c.fillRect(x, 0, 4, 1080);
  const u = ease.outCubic(clamp((g.t - g.t0) / 2.2));
  const len = 260 + u * 2000;
  const y = 330;
  cut(c, rect(80, y, len, 420, 90), WHITE);
  label(c, 'CLAUDE.md', 120, y + 70, 44, INK, { align: 'left', mono: true, weight: 600 });
  c.fillStyle = 'rgba(60,60,70,0.4)';
  for (let col = 0; col * 260 < len - 60; col++) for (let r = 0; r < 7; r++) {
    const w = 120 + hash(col, r) * 110;
    c.fillRect(120 + col * 260, y + 120 + r * 40, w, 10);
  }
  // Rolle am Ende
  cut(c, oval(80 + len, y + 210, 40, 222, 91), '#e8e4d8');
  const pg = Math.min(412, 1 + Math.floor(u * 412));
  label(c, `page ${pg} of 412`, 1840, 260, 28, WHITE, { align: 'right', mono: true, weight: 600 });
  // Vergleich: drei Seiten Scheidungspapiere
  c.save(); c.translate(260, 900); c.rotate(-0.05);
  for (let i = 2; i >= 0; i--) cut(c, rect(-90 + i * 6, -60 + i * 5, 180, 120, 92 + i), WHITE);
  label(c, 'divorce papers', 0, -10, 22, INK, { weight: 700 });
  label(c, '3 pages', 0, 24, 20, '#6b6660', { mono: true, weight: 500 });
  c.restore();
  tag(c, 'FLASHBACK · BARB’S CLAUDE.md');
}

// ------------------------------------------------------------------ Priya: Selbstbewertung

let aplus: StrokeText | null = null;

export function gagHomework(c: CanvasRenderingContext2D, g: GagCtx) {
  aplus ??= strokeText('A+', 'readable', 260);
  c.fillStyle = '#2f5a45'; c.fillRect(0, 0, 1920, 1080);
  c.save(); c.translate(960, 560); c.rotate(-0.03);
  cut(c, rect(-420, -440, 840, 900, 100), WHITE);
  label(c, 'HOMEWORK', -360, -360, 46, INK, { align: 'left', weight: 800 });
  label(c, 'by: Claude', -360, -316, 26, '#6b6660', { align: 'left', mono: true, weight: 500 });
  const qa = ['1. Did the tests pass?   “probably”', '2. Edge cases?   “vibes”', '3. Show your work.   “trust me”'];
  qa.forEach((q, i) => label(c, q, -360, -220 + i * 70, 28, '#1f3d8a', { align: 'left', weight: 600 }));
  // A+ schreibt sich
  const p = clamp((g.t - g.t0 - 0.2) / 0.9);
  c.save();
  c.translate(60, 300);
  c.strokeStyle = '#c0392b'; c.lineWidth = 14; c.lineCap = 'round'; c.lineJoin = 'round';
  const head = drawStrokeText(c, aplus, aplus.total * p);
  c.restore();
  const tEnd = g.end('I let it grade');
  if (g.t > tEnd - 0.2) for (let i = 0; i < 4; i++) star(c, -300 + i * 90, 380, 36, '#f2b544', 0.2 * i);
  c.restore();
  // Roboterhand mit Rotstift an der Stiftspitze
  if (head && p < 1) {
    const hx = 960 + 60 + head.x, hy = 560 + 300 + head.y;
    c.save(); c.translate(hx, hy); c.rotate(-0.6);
    cut(c, rect(-4, -6, 90, 14, 101), '#c0392b');
    cut(c, rect(60, -26, 70, 52, 102), '#9aa3b2');
    strip(c, [[120, 0], [320, 80]], 40, '#7c8590');
    c.restore();
  }
  // Roboterkopf, sehr zufrieden
  c.save(); c.translate(1640, 260);
  cut(c, rect(-110, -90, 220, 180, 103), '#9aa3b2');
  strip(c, [[0, -90], [0, -140]], 6, '#59626c');
  cut(c, oval(0, -146, 14, 14, 104), '#e2483d');
  label(c, '^  ^', 0, -4, 50, INK, { mono: true, weight: 600 });
  strip(c, [[-40, 40], [0, 56], [40, 40]], 6, INK, false);
  c.restore();
  tag(c, 'FLASHBACK · SELF-REVIEW');
}

export const GAGS: Record<string, (c: CanvasRenderingContext2D, g: GagCtx) => void> = {
  fire: gagFire,
  plan: gagPlan,
  gaudy: gagGaudy,
  cobweb: gagCobweb,
  max: gagMax,
  scroll: gagScroll,
  homework: gagHomework,
};
