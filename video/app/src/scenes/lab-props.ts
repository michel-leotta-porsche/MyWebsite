// Requisiten pro Regel, in der Bildmitte (Ursprung 960/600). Jede Funktion zeichnet ihren
// Zustand zur Zeit t; Zeitpunkte kommen aus dem Text (Script.at), nie als feste Zahlen.
import { F, font } from '../engine/type';
import {
  COL, OUT, type P, Script, blob, clamp, ease, ell, hash, lerp, pop, prog, rectPts, smoothstep, stroke, wobText,
} from './_lab';

export const CX = 960, CY = 600;

export interface PropCtx {
  c: CanvasRenderingContext2D;
  t: number;
  b: number;
  sc: Script;
  start: number;
  end: number;
}

function txt(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, col: string, fam = F.grotesk(700), align: CanvasTextAlign = 'center', ls = 0) {
  c.font = font(fam, size);
  c.textAlign = align;
  c.fillStyle = col;
  c.letterSpacing = `${ls}px`;
  c.fillText(s, x, y);
  c.letterSpacing = '0px';
  c.textAlign = 'left';
}

/** Skaliert um (x, y). */
function scaled(c: CanvasRenderingContext2D, x: number, y: number, k: number, rot = 0) {
  c.translate(x, y);
  c.rotate(rot);
  c.scale(k, k);
  c.translate(-x, -y);
}

/** Haken (✓) als Linie. */
function tick(c: CanvasRenderingContext2D, x: number, y: number, s: number, p: number, b: number, col = COL.amber, lw = 8) {
  if (p <= 0) return;
  const pts: P[] = [[x - s, y], [x - s * 0.3, y + s * 0.7], [x + s, y - s * 0.8]];
  // zeichnet sich in zwei Segmenten
  const a = clamp(p * 2), bb = clamp(p * 2 - 1);
  const p1: P = [lerp(pts[0]![0], pts[1]![0], a), lerp(pts[0]![1], pts[1]![1], a)];
  const seg: P[] = [pts[0]!, p1];
  if (bb > 0) seg.push([lerp(pts[1]![0], pts[2]![0], bb), lerp(pts[1]![1], pts[2]![1], bb)]);
  stroke(c, seg, 900 + x, b, lw, col, 0.8);
}

/** Rotes Kreuz (✗). */
function cross(c: CanvasRenderingContext2D, x: number, y: number, s: number, p: number, b: number, lw = 9) {
  if (p <= 0) return;
  const a = clamp(p * 2), bb = clamp(p * 2 - 1);
  stroke(c, [[x - s, y - s], [lerp(x - s, x + s, a), lerp(y - s, y + s, a)]], 910 + x, b, lw, COL.red, 0.8);
  if (bb > 0) stroke(c, [[x + s, y - s], [lerp(x + s, x - s, bb), lerp(y - s, y + s, bb)]], 911 + x, b, lw, COL.red, 0.8);
}

/** Terminal-Karte im Systemplan-Stil (Haarlinie oben, Mono-Text). */
function card(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, b: number, seed: number, fill = '#1C2330') {
  blob(c, rectPts(x, y, w, h, 80), fill, seed, b, 5);
  c.fillStyle = COL.amber;
  c.fillRect(x + 4, y + 4, w - 8, 3);
}

// ------------------------------------------------------------------ INTRO

export function propOpen({ c, t, b, sc }: PropCtx) {
  const tCookie = sc.at('fortune cookie', 'fortune');
  const tSeven = sc.at('Seven rules', 'Seven.');
  // Planet, der gerade komplett refaktoriert wurde
  const kPlanet = pop(t, sc.at('Doc!') + 0.2, 0.6) * (1 - ease.inBack(prog(t, tCookie - 0.6, tCookie - 0.05)));
  if (kPlanet > 0.001) {
    c.save();
    scaled(c, CX, CY, kPlanet, (t - 1) * 0.25);
    blob(c, ell(CX, CY, 170, 170, 26), '#3E7CB1', 501, b, 6);
    blob(c, [[CX - 120, CY - 60], [CX - 40, CY - 110], [CX + 10, CY - 60], [CX - 30, CY + 10], [CX - 110, CY + 20]], '#7BC46A', 502, b, 5);
    blob(c, [[CX + 40, CY + 40], [CX + 120, CY + 20], [CX + 130, CY + 90], [CX + 60, CY + 120]], '#7BC46A', 503, b, 5);
    // Gitterlinien: der Planet ist jetzt „modular“
    for (let i = -2; i <= 2; i++) stroke(c, [[CX + i * 60, CY - 160 + Math.abs(i) * 18], [CX + i * 60, CY + 160 - Math.abs(i) * 18]], 504 + i, b, 3, 'rgba(11,13,18,0.5)');
    c.restore();
    const tStamp = sc.at('refactored the entire universe', 'refactored');
    const ks = pop(t, tStamp, 0.3) * (1 - ease.inBack(prog(t, tCookie - 0.6, tCookie - 0.05)));
    if (ks > 0) {
      c.save();
      scaled(c, CX + 60, CY + 30, ks * (1 + 0.6 * (1 - clamp((t - tStamp) / 0.15))), -0.18);
      blob(c, rectPts(CX - 150, CY - 10, 420, 82, 90), null, 505, b, 7, 1.6, COL.red);
      txt(c, 'REFACTORED', CX + 60, CY + 54, 54, COL.red, F.grotesk(800), 'center', 4);
      c.restore();
    }
  }
  // Glückskeks mit dem Prompt
  const kCookie = pop(t, tCookie, 0.5) * (1 - ease.inBack(prog(t, tSeven - 0.5, tSeven - 0.05)));
  if (kCookie > 0.001) {
    c.save();
    scaled(c, CX, CY, kCookie, Math.sin(t * 2) * 0.05);
    blob(c, [[CX - 190, CY + 40], [CX - 150, CY - 70], [CX - 40, CY - 120], [CX + 60, CY - 110], [CX + 170, CY - 40], [CX + 190, CY + 50], [CX + 80, CY + 20], [CX, CY + 70], [CX - 80, CY + 20]], '#E3A94B', 510, b, 6);
    stroke(c, [[CX - 80, CY + 20], [CX - 20, CY - 40], [CX + 20, CY - 50], [CX + 80, CY + 20]], 511, b, 4, '#9A6420');
    // Zettel
    const slide = ease.outCubic(prog(t, tCookie + 0.3, tCookie + 0.9));
    c.save();
    c.translate(CX + 70 + slide * 70, CY + 40 + slide * 70);
    c.rotate(0.12);
    blob(c, rectPts(-180, -32, 360, 64, 90), COL.paper, 512, b, 4);
    txt(c, 'fix login pls :)', 0, 10, 28, OUT, F.mono(500));
    c.restore();
    c.restore();
  }
  // Sieben Kästchen, eins nach dem anderen
  for (let i = 0; i < 7; i++) {
    const k = pop(t, tSeven + i * 0.09, 0.4);
    if (k <= 0) continue;
    const x = CX - 3 * 118 + i * 118, y = CY;
    c.save();
    scaled(c, x, y, k);
    blob(c, rectPts(x - 46, y - 46, 92, 92, 92), '#1C2330', 520 + i, b, 5, 1.4, COL.paper);
    txt(c, String(i + 1).padStart(2, '0'), x, y + 14, 38, COL.amber, F.mono(500));
    c.restore();
  }
}

// ------------------------------------------------------------------ REGEL 1: Prüfung

export function propVerify({ c, t, b, sc }: PropCtx) {
  const tLine = sc.at('Give it a check');
  const tT = sc.at('Give it a check', 'Tests.'), tB = sc.at('Give it a check', 'build.'), tS = sc.at('Give it a check', 'screenshot.');
  const tWhy = sc.at("Why can't it");
  const tW = sc.at('Without a check'), tYou = sc.at('Without a check', 'you'), tGross = sc.at('Without a check', 'Gross.');
  const k = pop(t, tLine - 0.2, 0.5);
  c.save();
  scaled(c, CX, CY + 60, k);
  // Maschine
  const mx = CX - 280, my = CY - 120, mw = 560, mh = 330;
  blob(c, rectPts(mx, my, mw, mh, 90), '#3B4656', 530, b, 6);
  txt(c, 'CHECK-O-MATIC 3000', CX, my + 46, 26, COL.paper, F.mono(600), 'center', 3);
  // Lampe
  const unplug = smoothstep(tW, tW + 0.4, t);
  const lampY = my - 70;
  const pass = t >= tS + 0.25 && t < tWhy - 0.1;
  const lampCol = unplug > 0.5 ? (t >= tGross ? COL.red : '#59606C') : pass ? COL.green : t >= tWhy ? COL.amber : '#59606C';
  blob(c, ell(CX, lampY, 110, 62, 18), lampCol, 531, b, 6);
  stroke(c, [[CX - 40, my], [CX - 40, lampY + 50]], 532, b, 6);
  stroke(c, [[CX + 40, my], [CX + 40, lampY + 50]], 533, b, 6);
  const lampTxt = unplug > 0.5 ? (t >= tGross ? 'EW.' : t >= tYou ? 'YOU?' : 'LOOKS DONE?') : pass ? 'PASS' : t >= tWhy ? '???' : '';
  if (lampTxt) txt(c, lampTxt, CX, lampY + 14, lampTxt.length > 6 ? 26 : 40, OUT, F.grotesk(800));
  // drei Schlitze
  const slots: [string, number][] = [['TESTS', tT], ['BUILD', tB], ['SCREENSHOT', tS]];
  slots.forEach(([lab, ts], i) => {
    const x = mx + 40 + i * 170, y = my + 90;
    const on = t >= ts && unplug < 0.5;
    blob(c, rectPts(x, y, 140, 110, 70), on ? COL.amber : '#252D39', 540 + i, b, 5);
    txt(c, lab, x + 70, y + 150, 19, COL.paper, F.mono(500), 'center', 2);
    if (on) tick(c, x + 70, y + 55, 28, prog(t, ts, ts + 0.3), b, OUT, 9);
  });
  // Stecker: fällt heraus, wenn es keinen Check gibt
  const plugX = mx + mw + 40, plugY = my + mh - 40 + unplug * 140;
  stroke(c, [[mx + mw, my + mh - 40], [plugX - 10, my + mh - 30 + unplug * 60], [plugX, plugY]], 550, b, 6);
  blob(c, rectPts(plugX - 22, plugY, 44, 40, 44), '#59606C', 551, b, 5);
  c.restore();
}

// ------------------------------------------------------------------ REGEL 2: Erkunden, planen, coden

export function propPlan({ c, t, b, sc }: PropCtx) {
  const tLine = sc.at('Explore, then plan');
  const tE = sc.at('Explore, then plan', 'Explore,'), tP = sc.at('Explore, then plan', 'plan,'), tC = sc.at('Explore, then plan', 'code.');
  const tTypo = sc.at('Even for a typo');
  const tNo = sc.at('If you can say the diff'), tSkip = sc.at('If you can say the diff', 'skip'), tSent = sc.at('If you can say the diff', 'sentence,');
  const nodes: [string, number, number][] = [['EXPLORE', CX - 320, tE], ['PLAN', CX, tP], ['CODE', CX + 320, tC]];
  const y = CY + 40;
  const k = pop(t, tLine - 0.2, 0.5);
  c.save();
  scaled(c, CX, y, k);
  // Strecke, zeichnet sich von links
  const run = ease.inOutCubic(prog(t, tE, tC + 0.3));
  c.fillStyle = 'rgba(243,239,228,0.25)';
  c.fillRect(CX - 320, y - 2, 640, 4);
  c.fillStyle = COL.amber;
  c.fillRect(CX - 320, y - 3, 640 * run, 6);
  nodes.forEach(([lab, x, ts], i) => {
    const on = t >= ts;
    const skipped = i === 1 && t >= tSkip;
    const kk = 1 + 0.25 * Math.max(0, 1 - (t - ts) / 0.25) * (on ? 1 : 0);
    c.save();
    scaled(c, x, y, kk);
    blob(c, ell(x, y, 54, 54, 16), skipped ? '#3B4656' : on ? COL.amber : '#1C2330', 560 + i, b, 6, 1.6, skipped ? '#59606C' : OUT);
    c.restore();
    txt(c, lab, x, y + 104, 26, skipped ? '#7D8594' : COL.paper, F.mono(600), 'center', 3);
    if (skipped) {
      c.fillStyle = COL.red;
      c.fillRect(x - 70, y + 94, 140 * ease.outCubic(prog(t, tSkip, tSkip + 0.3)), 5);
    }
  });
  // Läufer
  const rx = CX - 320 + 640 * run;
  if (t < tNo) blob(c, ell(rx, y - 90 + Math.abs(Math.sin(t * 9)) * -20, 16, 16, 10), COL.green, 570, b, 4);
  // Tippfehler-Zettel
  const kt = pop(t, tTypo, 0.35) * (1 - smoothstep(tSkip + 0.8, tSkip + 1.1, t));
  if (kt > 0) {
    c.save();
    scaled(c, CX, y - 190, kt, -0.06);
    blob(c, rectPts(CX - 150, y - 230, 300, 80, 80), '#FFE78A', 571, b, 4);
    txt(c, 'teh → the', CX, y - 178, 32, OUT, F.mono(500));
    c.restore();
  }
  // Sprung über PLAN: Bogen von EXPLORE zu CODE
  const arc = ease.outCubic(prog(t, tSkip, tSkip + 0.7));
  if (arc > 0) {
    const pts: P[] = [];
    const n = Math.max(2, Math.round(30 * arc));
    for (let i = 0; i <= n; i++) {
      const u = (i / 30);
      pts.push([CX - 320 + 640 * u, y - 70 - Math.sin(u * Math.PI) * 220]);
    }
    stroke(c, pts, 572, b, 7, COL.green, 1);
    if (arc >= 1) blob(c, [[CX + 300, y - 96], [CX + 330, y - 60], [CX + 286, y - 64]], COL.green, 573, b, 4);
  }
  if (t >= tSent) {
    c.globalAlpha = smoothstep(tSent, tSent + 0.3, t);
    txt(c, 'ONE-SENTENCE DIFF', CX, y - 310, 22, COL.green, F.mono(600), 'center', 4);
  }
  c.restore();
}

// ------------------------------------------------------------------ REGEL 3: Konkret sein

export function propSpecific({ c, t, b, sc }: PropCtx) {
  const tLine = sc.at('Be specific');
  const tSpec = sc.at('Be specific', 'specific.');
  const tFile = sc.at('Be specific', 'file,'), tEdge = sc.at('Be specific', 'case,'), tCopy = sc.at('Be specific', 'copy.');
  const tJo = sc.at('So not just');
  const tDim = sc.at('dimensions collapse', 'dimensions');
  // Vage Karte oben
  const kv = pop(t, tLine - 0.2, 0.45);
  const fall = ease.inCubic(prog(t, tDim, tDim + 0.9));
  if (fall < 1) {
    const shake = t >= tJo && t < tJo + 1.4 ? Math.sin(t * 60) * 6 : 0;
    const vx = lerp(CX - 300 + shake, CX, fall), vy = lerp(CY - 150, CY + 20, fall);
    c.save();
    scaled(c, vx + 300, vy + 50, kv * (1 - fall), fall * 6);
    card(c, vx, vy, 600, 100, b, 580);
    txt(c, '> make it better', vx + 34, vy + 64, 34, COL.mono, F.mono(500), 'left');
    const xp = prog(t, tSpec, tSpec + 0.35);
    if (xp > 0) {
      c.fillStyle = COL.red;
      c.fillRect(vx + 24, vy + 52, 360 * ease.outCubic(xp), 6);
    }
    c.restore();
  }
  // Konkrete Karte unten: Zeilen tippen sich zu den Wörtern
  const kk = pop(t, tFile - 0.25, 0.45);
  if (kk > 0) {
    const x = CX - 360, y = CY + 0;
    c.save();
    scaled(c, CX, y + 120, kk);
    card(c, x, y, 720, 250, b, 581);
    const rows: [string, string, number][] = [
      ['file', 'src/auth/refresh.ts', tFile],
      ['case', 'expired refresh token', tEdge],
      ['copy', 'pattern from retry.ts', tCopy],
    ];
    rows.forEach(([k2, v, ts], i) => {
      const n = Math.floor(v.length * clamp((t - ts) / 0.45));
      if (t < ts) return;
      txt(c, k2.toUpperCase(), x + 34, y + 72 + i * 64, 18, COL.amber, F.mono(600), 'left', 3);
      txt(c, v.slice(0, n) + (n < v.length && Math.floor(t * 4) % 2 ? '▌' : ''), x + 150, y + 74 + i * 64, 32, COL.paper, F.mono(500), 'left');
    });
    c.restore();
  }
}

// ------------------------------------------------------------------ REGEL 4: Kontext

export function propContext({ c, t, b, sc }: PropCtx) {
  const tLine = sc.at('scarcest resource');
  const tMulti = sc.at('scarcest resource', 'multiverse.');
  const tClear = sc.at('Clear it between'), tSub = sc.at('Clear it between', 'subagents'), tDig = sc.at('Clear it between', 'digging.');
  const tJo = sc.at('corrected it twice'), tTwice = sc.at('corrected it twice', 'twice?');
  const tFresh = sc.at('Start fresh'), tBetter = sc.at('Start fresh', 'Better');
  const jx = CX - 170, jy = CY - 230, jw = 340, jh = 470;
  const k = pop(t, tLine - 0.2, 0.5);
  // Füllstand
  let lvl = 0.06 + 0.86 * ease.inOutCubic(prog(t, tLine, tMulti + 0.6));
  lvl = lerp(lvl, 0.05, ease.inOutCubic(prog(t, tClear, tClear + 0.7)));
  lvl += 0.65 * ease.outCubic(prog(t, tJo, tTwice + 0.3));
  lvl = lerp(lvl, 0.05, ease.inOutCubic(prog(t, tFresh, tFresh + 0.6)));
  lvl = clamp(lvl, 0, 0.95);
  c.save();
  scaled(c, CX, CY, k);
  // Glas
  const gy = jy + jh - lvl * (jh - 30);
  c.save();
  c.beginPath(); c.rect(jx + 6, jy, jw - 12, jh - 6); c.clip();
  const wav: P[] = [];
  for (let i = 0; i <= 8; i++) wav.push([jx + (jw * i) / 8, gy + Math.sin(t * 4 + i) * 6]);
  wav.push([jx + jw, jy + jh + 10], [jx, jy + jh + 10]);
  blob(c, wav, COL.green, 590, b, 0);
  // Blasen
  for (let i = 0; i < 9; i++) {
    const bx = jx + 30 + hash(591, i) * (jw - 60);
    const by = jy + jh - ((t * 60 + hash(592, i) * 400) % 400);
    if (by > gy + 10) { c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(bx, by, 5 + hash(593, i) * 6, 0, Math.PI * 2); c.fill(); }
  }
  c.restore();
  blob(c, rectPts(jx, jy, jw, jh, 90), null, 594, b, 6, 1.4, COL.paper);
  blob(c, rectPts(jx - 20, jy - 30, jw + 40, 34, 90), '#59606C', 595, b, 5);
  txt(c, 'CONTEXT', CX, jy + jh + 50, 24, COL.paper, F.mono(600), 'center', 5);
  txt(c, `${Math.round(lvl * 100)}%`, jx + jw + 30, gy + 10, 30, COL.green, F.mono(600), 'left');
  // fallende Schnipsel
  const chips = ['error.log', 'diff', 'README', 'stack trace', 'tests', 'node_modules?!'];
  chips.forEach((s, i) => {
    const t0 = tLine + 0.2 + i * 0.45;
    const p = prog(t, t0, t0 + 0.9, ease.inQuad);
    if (p <= 0 || t > tClear + 0.2) return;
    const x = jx + 50 + hash(596, i) * (jw - 100), y = lerp(jy - 160, Math.min(gy - 20, jy + jh - 40) - (i % 3) * 30, p);
    c.save();
    c.translate(x, y); c.rotate((hash(597, i) - 0.5) * 0.6);
    blob(c, rectPts(-74, -20, 148, 40, 74), COL.paper, 598 + i, b, 4);
    txt(c, s, 0, 9, 20, OUT, F.mono(500));
    c.restore();
  });
  // /clear-Schild
  for (const tc of [tClear, tFresh]) {
    const kc = pop(t, tc, 0.35) * (1 - smoothstep(tc + 1.6, tc + 1.9, t));
    if (kc > 0) {
      c.save();
      scaled(c, CX, jy - 80, kc, -0.08);
      blob(c, rectPts(CX - 110, jy - 118, 220, 70, 80), COL.amber, 610, b, 5);
      txt(c, '/clear', CX, jy - 70, 40, OUT, F.mono(600));
      c.restore();
    }
  }
  // Subagenten-Drohnen: fliegen los, kommen mit Zusammenfassungen zurück
  for (let i = 0; i < 3; i++) {
    const t0 = tSub + i * 0.15;
    const out = ease.inOutCubic(prog(t, t0, t0 + 0.8)), back = ease.inOutCubic(prog(t, tDig + 0.2 + i * 0.1, tDig + 1.1 + i * 0.1));
    if (out <= 0 || back >= 1) continue;
    const away: P = [CX + 520 + i * 40, CY - 300 + i * 160];
    const home: P = [jx + jw + 60, jy + 120 + i * 80];
    const u = out - back;
    const x = lerp(home[0], away[0], u), y = lerp(home[1], away[1], u) + Math.sin(t * 8 + i) * 8;
    blob(c, ell(x, y, 30, 22, 12), '#9AA3B2', 620 + i, b, 4);
    stroke(c, [[x - 40, y - 26], [x + 40, y - 26]], 623 + i, b, 4);
    c.fillStyle = COL.green; c.beginPath(); c.arc(x, y, 7, 0, Math.PI * 2); c.fill();
    if (back > 0) {
      blob(c, rectPts(x - 60, y + 26, 120, 30, 60), COL.paper, 626 + i, b, 3);
      txt(c, 'summary', x, y + 48, 17, OUT, F.mono(500));
    }
  }
  // zweimal korrigiert: zwei rote Kreuze am Glas
  cross(c, jx + 90, jy + 120, 30, prog(t, tTwice - 0.5, tTwice - 0.2), b);
  cross(c, jx + jw - 90, jy + 180, 30, prog(t, tTwice, tTwice + 0.3), b);
  if (t >= tBetter) {
    // Funkeln am frischen Glas
    for (let i = 0; i < 5; i++) {
      const a = smoothstep(tBetter + i * 0.08, tBetter + i * 0.08 + 0.2, t) * (1 - smoothstep(tBetter + 1, tBetter + 1.4, t));
      const x = jx + 40 + hash(630, i) * (jw - 80), y = jy + 60 + hash(631, i) * (jh - 140);
      c.globalAlpha = a;
      stroke(c, [[x - 16, y], [x + 16, y]], 632 + i, b, 4, COL.paper, 0.5);
      stroke(c, [[x, y - 16], [x, y + 16]], 637 + i, b, 4, COL.paper, 0.5);
      c.globalAlpha = 1;
    }
  }
  c.restore();
}

// ------------------------------------------------------------------ REGEL 5: Effort

const LEVELS = ['low', 'medium', 'high', 'xhigh', 'max'];

export function propEffort({ c, t, b, sc }: PropCtx) {
  const tLine = sc.at('Effort is the dial');
  const tDial = sc.at('Effort is the dial', 'dial.');
  const tMed = sc.at('Start at medium', 'medium.');
  const tHigh = sc.at('Start at medium', 'high.');
  const tJo = sc.at('think really');
  const tDel = sc.at("It's a model", 'Delete');
  const gx = CX, gy = CY + 170, R = 300;
  const k = pop(t, tLine - 0.2, 0.5);
  c.save();
  scaled(c, gx, gy - 100, k);
  // Skala
  const ang = (i: number) => Math.PI + (i / (LEVELS.length - 1)) * Math.PI;
  const arc: P[] = [];
  for (let i = 0; i <= 24; i++) { const a = Math.PI + (i / 24) * Math.PI; arc.push([gx + Math.cos(a) * R, gy + Math.sin(a) * R]); }
  arc.push([gx + R, gy + 30], [gx - R, gy + 30]);
  blob(c, arc, '#1C2330', 640, b, 6, 1.4, COL.paper);
  LEVELS.forEach((lab, i) => {
    const a = ang(i);
    stroke(c, [[gx + Math.cos(a) * (R - 10), gy + Math.sin(a) * (R - 10)], [gx + Math.cos(a) * (R - 46), gy + Math.sin(a) * (R - 46)]], 641 + i, b, 5, COL.paper);
    const active = i === 1 && t >= tMed;
    txt(c, lab.toUpperCase(), gx + Math.cos(a) * (R - 92), gy + Math.sin(a) * (R - 92) + 8, 21, active ? COL.amber : '#9AA3B2', F.mono(600), 'center', 2);
  });
  // Zeiger: zappelt erst ziellos, rastet bei „medium“ ein
  const wild = Math.PI * 1.5 + Math.sin(t * 5.3) * 1.1 + Math.sin(t * 2.1) * 0.4;
  const settle = ease.outBack(prog(t, tMed - 0.1, tMed + 0.5));
  const calm = smoothstep(tDial - 0.2, tDial + 0.4, t);
  const a0 = lerp(wild, Math.PI * 1.5, calm * (1 - settle) * 0.6);
  const a = lerp(a0, ang(1), settle);
  // Geisterzeiger: Opus 5 auf high
  const gk = smoothstep(tHigh - 0.1, tHigh + 0.3, t);
  if (gk > 0) {
    c.globalAlpha = gk * 0.6;
    stroke(c, [[gx, gy], [gx + Math.cos(ang(2)) * (R - 60), gy + Math.sin(ang(2)) * (R - 60)]], 650, b, 8, '#9AA3B2');
    c.globalAlpha = 1;
  }
  stroke(c, [[gx, gy], [gx + Math.cos(a) * (R - 40), gy + Math.sin(a) * (R - 40)]], 651, b, 10, COL.amber);
  blob(c, ell(gx, gy, 26, 26, 12), '#59606C', 652, b, 5);
  if (gk > 0) {
    c.globalAlpha = gk;
    txt(c, 'OPUS 5.5 · MEDIUM  ≈  OPUS 5 · HIGH', gx, gy + 90, 26, COL.paper, F.mono(600), 'center', 2);
    c.globalAlpha = 1;
  }
  c.restore();
  // Klebezettel „think really, really hard“, wird gelöscht
  const kn = pop(t, tJo, 0.35);
  if (kn > 0) {
    const fall = ease.inCubic(prog(t, tDel + 0.35, tDel + 1.1));
    c.save();
    const nx = CX + 380, ny = CY - 230 + fall * 700;
    scaled(c, nx, ny, kn, 0.1 + fall * 1.5);
    blob(c, rectPts(nx - 150, ny - 80, 300, 160, 75), '#FFE78A', 660, b, 4);
    txt(c, 'think really,', nx, ny - 12, 30, OUT, F.grotesk(700));
    txt(c, 'really hard!!', nx, ny + 30, 30, OUT, F.grotesk(700));
    cross(c, nx, ny, 70, prog(t, tDel, tDel + 0.3), b, 10);
    c.restore();
  }
}

// ------------------------------------------------------------------ REGEL 6: CLAUDE.md und Hooks

export function propMemory({ c, t, b, sc }: PropCtx) {
  const tLine = sc.at('Keep CLAUDE.md short');
  const tShort = sc.at('Keep CLAUDE.md short', 'short.');
  const tAsk = sc.at('For every line');
  const tAskEnd = sc.line('For every line').end;
  const tJo = sc.at('every single time');
  const tHook = sc.at("Hooks don't forget");
  const k = pop(t, tLine - 0.2, 0.5);
  const shift = ease.inOutCubic(prog(t, tJo, tJo + 0.8)) * -220;
  const N = 14;
  // Zeilen, die beim Fragen gestrichen werden (deterministisch)
  const keep = (i: number) => [0, 3, 6, 9, 12].includes(i);
  const shrink = ease.inOutCubic(prog(t, tAskEnd - 0.2, tAskEnd + 0.6));
  const longH = 40 + N * 34, shortH = 40 + 5 * 34;
  const h = lerp(longH, shortH, shrink) * lerp(1, 0.95, ease.outBack(prog(t, tShort, tShort + 0.3)) * 0.0);
  const x = CX - 220 + shift, y = CY - 250;
  c.save();
  scaled(c, CX + shift, CY, k);
  blob(c, rectPts(x, y, 440, h + 30, 90), COL.paper, 670, b, 5);
  c.fillStyle = OUT;
  c.font = font(F.mono(600), 22);
  c.fillText('CLAUDE.md', x + 26, y + 40);
  let row = 0;
  for (let i = 0; i < N; i++) {
    const kept = keep(i);
    const tCheck = lerp(tAsk, tAskEnd - 0.2, i / (N - 1));
    const gone = !kept && shrink > 0.5;
    if (gone) continue;
    const ry = y + 76 + (shrink > 0.5 ? row : i) * 34;
    row++;
    const w = 180 + hash(671, i) * 180;
    c.fillStyle = kept && t >= tCheck ? '#2A3644' : 'rgba(42,54,68,0.45)';
    c.fillRect(x + 26, ry, w, 10);
    if (!kept && t >= tCheck) {
      c.fillStyle = COL.red;
      c.fillRect(x + 20, ry + 3, (w + 12) * ease.outCubic(prog(t, tCheck, tCheck + 0.2)), 4);
    }
    if (kept && t >= tCheck) tick(c, x + w + 60, ry + 4, 12, prog(t, tCheck, tCheck + 0.25), b, COL.greenDeep, 5);
  }
  c.restore();
  // Haken mit Kette: kommt von oben
  const kh = ease.outBack(prog(t, tHook - 0.1, tHook + 0.6));
  if (kh > 0) {
    const hx = CX + 230, hy = lerp(-200, CY + 40, kh) + Math.sin(t * 3) * 6;
    for (let i = 0; i < 12; i++) {
      const cy2 = hy - 140 - i * 46;
      if (cy2 < -60) break;
      blob(c, ell(hx, cy2, 14, 24, 10), null, 680 + i, b, 6, 1, '#9AA3B2');
    }
    stroke(c, [[hx, hy - 120], [hx, hy - 20], [hx - 6, hy + 50], [hx - 60, hy + 70], [hx - 96, hy + 30], [hx - 90, hy]], 695, b, 16, '#9AA3B2', 1.2);
    blob(c, [[hx - 104, hy + 6], [hx - 82, hy - 22], [hx - 78, hy + 10]], '#9AA3B2', 696, b, 0);
    const tags = ['lint', 'test', 'format'];
    tags.forEach((s, i) => {
      const ki = pop(t, tHook + 0.4 + i * 0.15, 0.35);
      if (ki <= 0) return;
      const tx = hx + 70 + i * 6, ty = hy - 100 + i * 64;
      c.save();
      scaled(c, tx, ty, ki, 0.05 * (i - 1));
      blob(c, rectPts(tx, ty - 24, 140, 46, 70), COL.amber, 697 + i, b, 4);
      txt(c, s, tx + 70, ty + 9, 24, OUT, F.mono(600));
      c.restore();
    });
    txt(c, 'ALWAYS RUNS', hx - 40, hy + 140, 22, COL.amber, F.mono(600), 'center', 4);
  }
}

// ------------------------------------------------------------------ REGEL 7: Frischer Blick

export function propReview({ c, t, b, sc }: PropCtx) {
  const tLine = sc.at('second opinion');
  const tOp = sc.at('second opinion', 'opinion.');
  const tFresh = sc.at('fresh subagent', 'fresh');
  const tExc = sc.at('fresh subagent', 'excuses.');
  const tNot = sc.at('fresh subagent', 'Not');
  const k = pop(t, tLine - 0.2, 0.5);
  const x = CX - 330, y = CY - 200, w = 560, h = 380;
  const diff: [string, string][] = [
    [' ', 'export function refresh(token) {'],
    ['-', '  if (!token) return'],
    ['+', '  if (!token) throw new AuthError()'],
    [' ', '  const res = await api.post(...)'],
    ['+', '  if (res.status === 401) retry()'],
    ['-', '  // TODO: handle expiry'],
    [' ', '}'],
  ];
  c.save();
  scaled(c, CX, CY, k);
  card(c, x, y, w, h, b, 700);
  txt(c, 'DIFF', x + 30, y + 46, 20, COL.amber, F.mono(600), 'left', 4);
  diff.forEach(([s, line], i) => {
    const ry = y + 92 + i * 40;
    if (s !== ' ') { c.fillStyle = s === '+' ? 'rgba(142,240,74,0.16)' : 'rgba(226,72,61,0.18)'; c.fillRect(x + 10, ry - 26, w - 20, 36); }
    txt(c, `${s} ${line}`, x + 24, ry, 21, s === '+' ? COL.green : s === '-' ? '#FF8A80' : COL.mono, F.mono(500), 'left');
  });
  c.restore();
  // Auge des Subagenten
  const ke = pop(t, tOp - 0.2, 0.45);
  if (ke > 0) {
    const ex = CX + 330, ey = CY - 80;
    c.save();
    scaled(c, ex, ey, ke);
    blob(c, ell(ex, ey, 110, 70, 18), COL.paper, 710, b, 6);
    const scan = Math.sin(t * 2.4);
    const px = ex - 30 + scan * 24, py = ey + 6;
    blob(c, ell(px, py, 34, 34, 14), COL.green, 711, b, 4);
    c.fillStyle = OUT; c.beginPath(); c.arc(px, py, 14, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(px - 8, py - 10, 6, 0, Math.PI * 2); c.fill();
    txt(c, 'SUBAGENT', ex, ey + 112, 22, COL.paper, F.mono(600), 'center', 4);
    txt(c, t >= tFresh ? 'CONTEXT: 0 TOKENS' : '', ex, ey + 144, 18, COL.green, F.mono(500), 'center', 2);
    c.restore();
    // Lupenstrahl auf den Diff
    if (t >= tFresh) {
      const ly2 = y + 92 + ((Math.floor((t - tFresh) * 2.5) % diff.length)) * 40 - 8;
      c.fillStyle = 'rgba(142,240,74,0.22)';
      c.beginPath(); c.moveTo(ex - 80, ey); c.lineTo(x + w, ly2 - 22); c.lineTo(x + w, ly2 + 16); c.closePath(); c.fill();
      c.strokeStyle = COL.green; c.lineWidth = 3;
      c.strokeRect(x + 10, ly2 - 26, w - 20, 40);
    }
  }
  // Ausreden prallen ab
  const excuses = ['works on my machine', 'it was like that', 'just a warning'];
  excuses.forEach((s, i) => {
    const t0 = tNot - 0.3 + i * 0.25;
    const kx = pop(t, t0, 0.3);
    if (kx <= 0) return;
    const fly = ease.inCubic(prog(t, tExc + 0.3 + i * 0.12, tExc + 1.0 + i * 0.12));
    const x0 = CX - 40 + (i - 1) * 60, y0 = CY + 240 + i * 0;
    const xx = x0 + (i - 1) * 320 + fly * (i - 1) * 600, yy = y0 - i * 10 + fly * 500;
    c.save();
    scaled(c, xx, yy, kx, (i - 1) * 0.12 + fly * 2);
    blob(c, rectPts(xx - 150, yy - 28, 300, 56, 75), '#59606C', 720 + i, b, 4);
    txt(c, s, xx, yy + 9, 22, COL.paper, F.mono(500));
    cross(c, xx + 140, yy - 30, 18, prog(t, tExc, tExc + 0.25), b, 7);
    c.restore();
  });
}

// ------------------------------------------------------------------ RECAP

export const RECAP: [string, string][] = [
  ['Check.', 'Give it a check'],
  ['Plan.', 'Explore, plan, code'],
  ['Specific.', 'Be specific'],
  ['context.', 'Clean context'],
  ['Effort.', 'Effort dial, start at medium'],
  ['memory.', 'Short CLAUDE.md + hooks'],
  ['eyes.', 'Fresh-eyes review'],
];

export function propOutro({ c, t, b, sc, end }: PropCtx) {
  const tLine = sc.at('Clean context');
  const tVex = sc.at('Almost competent'), tItself = sc.at('Almost competent', 'itself.');
  const out = ease.inOutCubic(prog(t, tVex + 0.2, tVex + 1));
  const x = CX - 330 - out * 1400, y = CY - 290;
  // Systemplan-Checkliste: Gruppe beginnt mit Linie, Einträge durch Haarlinien getrennt
  if (out < 1) {
    c.save();
    c.fillStyle = COL.paper; c.fillRect(x, y, 660 * ease.outExpo(prog(t, tLine - 0.4, tLine + 0.2)), 2);
    RECAP.forEach(([word, label], i) => {
      const tw = sc.at('Clean context', word);
      const ry = y + 20 + i * 76;
      const kr = smoothstep(tLine - 0.3 + i * 0.05, tLine + i * 0.05, t);
      c.globalAlpha = kr;
      c.fillStyle = 'rgba(243,239,228,0.18)'; c.fillRect(x, ry + 74, 660, 1);
      txt(c, String(i + 1).padStart(2, '0'), x + 6, ry + 48, 20, COL.ash, F.mono(500), 'left', 2);
      const done = t >= tw;
      // Knoten: offen → aktiv → erledigt
      blob(c, rectPts(x + 66, ry + 18, 40, 40, 40), done ? COL.amber : '#1C2330', 740 + i, b, 4, 1, done ? OUT : COL.paper);
      if (done) tick(c, x + 86, ry + 38, 12, prog(t, tw, tw + 0.25), b, OUT, 5);
      txt(c, label, x + 132 + (done ? 6 * ease.outExpo(prog(t, tw, tw + 0.5)) : 0), ry + 50, 34, done ? COL.paper : '#7D8594', F.grotesk(done ? 700 : 500), 'left');
    });
    c.restore();
  }
  // Abspann
  const ke = smoothstep(tItself + 0.6, tItself + 1.1, t);
  if (ke > 0) {
    c.save();
    c.globalAlpha = ke;
    txt(c, 'OPUS 5.5', CX, CY - 40, 120, COL.paper, F.grotesk(800));
    txt(c, 'FIELD GUIDE', CX, CY + 20, 26, COL.amber, F.mono(600), 'center', 8);
    txt(c, 'Sources: code.claude.com/docs/en/best-practices · platform.claude.com/docs (Prompting Claude Opus 5.5)', CX, CY + 300, 18, COL.ash, F.mono(400));
    txt(c, 'Dr. Vex and Jo are original characters. No multiverses were refactored in the making of this video.', CX, CY + 332, 18, COL.ash, F.mono(400));
    c.restore();
  }
  void end; void wobText;
}

export const PROPS: Record<string, (p: PropCtx) => void> = {
  open: propOpen,
  verify: propVerify,
  plan: propPlan,
  specific: propSpecific,
  context: propContext,
  effort: propEffort,
  memory: propMemory,
  review: propReview,
  outro: propOutro,
};
