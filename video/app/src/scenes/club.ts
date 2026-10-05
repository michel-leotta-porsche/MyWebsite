// „Prompters Anonymous“: die Regie. Ein Modul für alle Abschnitte.
// Einstellungen (Weit, Nah, Flipchart, Rückblende) kommen aus dem Drehbuch (lines[].shots),
// Figuren schauen den Sprecher an, Münder folgen der Stimme in 12-fps-Schritten.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D, W, H } from '../engine/gl';
import { Lyrics, type Line, norm } from '../engine/lyrics';
import { F, font } from '../engine/type';
import { clamp, ease, hash, prog, smoothstep } from '../engine/util';
import { type P, cut, label, makeFelt, makeGrain, rect, setTexture, stepOf, texture } from './_paper';
import { CAST_EGG, DRAW, HEAD, POS, type Mood, type Pose, type Who, drawDoug, drawTodo } from './_cast';
import { EGG, FLIP, FlipChart, type FlipItem, drawCoffee, drawContactShadows, drawMarkerHand, drawRoom } from './_room';
import { GAGS, type GagCtx } from './club-gags';

type Speaker = Who | 'ALL';
type ClubLine = Line & { speaker: Speaker; rule: string | null; shots: { s: string; t: number }[] };

const CHORUS: Who[] = ['KEVIN', 'BARB', 'TYLER', 'PRIYA'];
const fold = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"');

/** Laune pro Zeile (gilt während der Zeile und kurz danach). */
const MOODS: [string, Partial<Record<Who | 'REST', Mood>>][] = [
  ['Welcome', { DOUG: 'happy' }],
  ['Ooh! Me!', { TODO: 'happy' }],
  ['Not now', { TODO: 'sad' }],
  ["Hi. I'm Kevin", { KEVIN: 'sad' }],
  ['Hi, Kevin', { REST: 'happy', KEVIN: 'sad' }],
  ['I let Claude', { KEVIN: 'sad' }],
  ['Rule one', { KEVIN: 'sad' }],
  ['Yo. Tyler', { TYLER: 'smug' }],
  ['Plan the big', { TYLER: 'sad' }],
  ["I'm Barb", { BARB: 'smug' }],
  ['Oh, Barb', { REST: 'sad', BARB: 'shock' }],
  ['Name the file', { BARB: 'sad' }],
  ['Priya. My session', { PRIYA: 'deadpan', KEVIN: 'shock' }],
  ['Also. I set effort', { TYLER: 'happy' }],
  ['Start at medium', { TYLER: 'shock', DOUG: 'smug' }],
  ['My CLAUDE.md', { BARB: 'sad' }],
  ['Keep it short', { BARB: 'shock' }],
  ['I let it grade', { PRIYA: 'deadpan' }],
  ['Did it pass', { KEVIN: 'shock' }],
  ['With honors', { PRIYA: 'smug', REST: 'shock' }],
  ['Can someone please', { TODO: 'sad' }],
  ['Fine. Bonus', { TODO: 'shock' }],
  ["I'm on the list", { TODO: 'happy', REST: 'happy' }],
  ['Hi, Todo', { REST: 'happy', TODO: 'happy' }],
];

const ITEMS: [string, string, string][] = [
  ['verify', '1. Give it a check', '#1f3d8a'],
  ['plan', '2. Plan big stuff only', '#c0392b'],
  ['specific', '3. Be specific', '#1e7a3c'],
  ['context', '4. Guard the context', '#1d1a1e'],
  ['effort', '5. Effort: start medium', '#1f3d8a'],
  ['memory', '6. Short CLAUDE.md, hooks', '#c0392b'],
  ['review', '7. Fresh-eyes review', '#1e7a3c'],
  ['outro', '+ Keep a checklist', '#c0392b'],
];

const RECAP = [
  'Give it a check it can run: tests, build, screenshot.',
  'Explore, plan, code. Skip the plan for one-sentence diffs.',
  'Be specific: the file, the edge case, the pattern to copy.',
  'Guard the context: /clear between tasks, subagents dig.',
  'Effort: start at medium. Turn the dial, not the caps lock.',
  'Short CLAUDE.md. Must-run rules become hooks.',
  'Fresh-eyes review by a subagent that only sees the diff.',
  'Bonus: long task? Keep a checklist the model updates.',
];

export default class Club extends Scene {
  layer = new Layer2D();
  lines: ClubLine[] = [];
  shots: { s: string; t: number }[] = [];
  flip!: FlipChart;
  grain: CanvasPattern | null = null;
  tFirst = 0;
  tLast = 0;
  tTodoMove = 0;
  tFall = Infinity;
  tConfetti = Infinity;
  /** Punchlines: Wort → Zoom-Stoß (Kamera-Punch mit Wackeln). */
  punches: [number, number][] = [];

  override init() {
    this.lines = this.ctx.lyrics.lines as ClubLine[];
    this.shots = this.lines.flatMap((l) => l.shots).sort((a, b) => a.t - b.t);
    this.tFirst = this.lines[0]!.start;
    this.tLast = this.lines[this.lines.length - 1]!.end;
    // Flipchart: jede Regel wird in der ersten Flipchart-Einstellung ihres Abschnitts geschrieben
    const items: FlipItem[] = [];
    let rule = '';
    const done = new Set<string>();
    for (const l of this.lines) {
      if (l.rule) rule = l.rule;
      const f = l.shots.find((s) => s.s === 'flip');
      const it = ITEMS.find((x) => x[0] === rule);
      if (f && it && !done.has(rule)) {
        done.add(rule);
        items.push({ text: it[1], t0: f.t + 0.3, t1: f.t + 2.2, col: it[2] });
      }
    }
    const onList = this.line("I'm on the list");
    const bonus = items.find((i) => i.text.startsWith('+'));
    if (bonus) bonus.check = onList.start + 0.2;
    this.flip = new FlipChart(items);
    this.flip.init();
    this.tTodoMove = this.line('Fine. Bonus').end + 0.05;
    this.tFall = this.line('With honors').end + 0.2;
    this.tConfetti = this.lines[this.lines.length - 1]!.start - 0.05;
    const P: [string, string, number][] = [
      ['I let Claude', '“looks', 0.1], ["I'm Barb", 'Better!”', 0.13], ['Start at medium', 'caps', 0.08],
      ['Keep it short', 'Hooks.', 0.1], ["I'm on the list", 'list!', 0.06],
    ];
    for (const [q, w, k] of P) { try { this.punches.push([this.at(q, w), k]); } catch { /* Wort fehlt nach Textänderung: kein Punch */ } }
    this.punches.push([this.tFall + 0.42, 0.07], [this.tConfetti, 0.08]);
    // Easter Eggs: still, ohne Kommentar
    CAST_EGG.med = this.line('Start at medium').end + 0.5;
    CAST_EGG.lgtmq = this.line('Second opinion').end + 0.3;
    EGG.catFall = this.tFall + 0.45;
    EGG.esc = this.tConfetti - 0.1;
    EGG.donut1 = this.line('Plan the big').end;
    EGG.donut2 = this.line('My CLAUDE.md').start;
    const g = makeGrain();
    this.grain = this.layer.ctx.createPattern(g, 'repeat');
    setTexture(this.layer.ctx.createPattern(makeFelt(), 'repeat'));
  }

  line(q: string): ClubLine {
    const l = this.lines.find((x) => fold(x.text).includes(fold(q)));
    if (!l) throw new Error(`line not found: ${q}`);
    return l;
  }
  at(q: string, w?: string) {
    const l = this.line(q);
    if (!w) return l.start;
    const hit = l.words.find((x) => norm(x.w) === norm(w));
    if (!hit) throw new Error(`word not found: ${w} in ${l.text}`);
    return hit.start;
  }

  shotAt(t: number) {
    let cur = this.shots[0]!, idx = 0;
    this.shots.forEach((s, i) => { if (s.t <= t) { cur = s; idx = i; } });
    const next = this.shots[idx + 1];
    const prev = this.shots[idx - 1];
    return { ...cur, end: next ? next.t : this.ctx.audio.duration, prev: prev ? { ...prev, end: cur.t } : null };
  }

  todoAt(t: number): P {
    return t < this.tTodoMove ? [POS.TODO[0], POS.TODO[1]] : [FLIP.x + FLIP.w + 6, FLIP.y + 108 + 7 * 46 - 6];
  }

  /** Mundöffnung eines Sprechers, gestuft auf 12 fps. */
  mouth(t: number, who: Who) {
    const l = this.ctx.lyrics.lineAt(t) as ClubLine | null;
    if (!l) return 0;
    const speaks = l.speaker === who || (l.speaker === 'ALL' && CHORUS.includes(who) && !l.text.includes(who[0] + who.slice(1).toLowerCase()));
    if (!speaks) return 0;
    const tb = stepOf(t) / 12;
    if (!this.ctx.lyrics.wordAt(tb)) return 0;
    return clamp((this.ctx.audio.env('vocal', tb) - 0.06) * 1.7);
  }

  pose(t: number, who: Who): Pose {
    const s = stepOf(t);
    const l = (this.ctx.lyrics.lineAt(t) ?? this.ctx.lyrics.lastLine(t)) as ClubLine | null;
    const sp = l?.speaker ?? 'DOUG';
    // Blick zum Sprecher (bei „ALL“ zum Gegenüber der Zeile)
    let target: P = sp === 'ALL' ? (l!.text.includes('Todo') ? this.todoAt(t) : l!.text.includes('Barb') ? HEAD.BARB : HEAD.KEVIN) : sp === 'TODO' ? this.todoAt(t) : HEAD[sp];
    if (sp === who) target = [HEAD[who][0] + (who === 'DOUG' ? 300 : -200), HEAD[who][1]];
    const me = who === 'TODO' ? this.todoAt(t) : HEAD[who];
    const dx = target[0] - me[0];
    const look = clamp(dx / 260, -1, 1);
    let mood: Mood = who === 'PRIYA' ? 'deadpan' : 'neutral';
    // Laune der aktuellen oder gerade beendeten Zeile
    const recent = this.lines.filter((x) => x.start <= t && t < x.end + 0.8).pop();
    if (recent) {
      const m = MOODS.find(([q]) => fold(recent.text).startsWith(fold(q)));
      const v = m?.[1][who] ?? (who !== recent.speaker ? m?.[1].REST : undefined);
      if (v) mood = v;
    }
    const open = this.mouth(t, who);
    const talking = open > 0 || (l?.speaker === who && t < (l?.end ?? 0));
    const chorus = l?.speaker === 'ALL' && t >= l.start - 0.1 && t < l.end + 0.3 && CHORUS.includes(who) && !l.text.includes(who[0] + who.slice(1).toLowerCase());
    const slot = Math.floor(s / 5);
    const gest = talking ? (hash(slot, who.length, 3) > 0.45 ? 0.55 + hash(slot, 4) * 0.45 : 0.15) : 0;
    const blinkSlot = Math.floor(t / 2.9);
    const blinkAt = blinkSlot * 2.9 + hash(blinkSlot, who.length, 8) * 2.4;
    const blink = t >= blinkAt && t < blinkAt + 0.1 && mood !== 'happy';
    let bounce = 0, armL = 0, armR = gest, wave = false;
    if (chorus) { armR = 1; wave = true; }
    if (who === 'TODO') {
      const excited = (l?.speaker === 'TODO' && mood === 'happy') || (recent && fold(recent.text).startsWith('hi, todo'));
      if (excited) { bounce = Math.abs(Math.sin(s * 1.1)) * 26; armL = 1; wave = true; }
    }
    if (who === 'TYLER' && !talking && !chorus) armR = 0.35; // Dose halb oben
    // Kopfwackeln beim Sprechen (South-Park-typisch), gestuft
    const tilt = talking ? (hash(Math.floor(s / 3), who.length, 5) - 0.5) * 0.16 : chorus ? Math.sin(s * 0.9) * 0.05 : 0;
    return { open, look, lookY: 0, mood, blink, armL, armR, wave, bounce, s, tilt };
  }

  /** Kamera für eine Einstellung: Mittelpunkt und Zoom in Weltkoordinaten. */
  camera(shot: { s: string; t: number; end: number }, t: number): { cx: number; cy: number; z: number } {
    const lt = t - shot.t;
    const punch = 1 + 0.035 * Math.exp(-lt * 9);
    let cx = 960, cy = 540, z = 1;
    if (shot.s === 'wide') { z = 1.0 + 0.012 * lt; }
    else if (shot.s === 'flip') { cx = FLIP.x + FLIP.w / 2 + 70; cy = FLIP.y + FLIP.h / 2 + 45; z = 1.95 + 0.01 * lt; }
    else if (shot.s.startsWith('cu:')) {
      const who = shot.s.slice(3) as Who;
      const [hx, hy] = who === 'TODO' ? this.todoAt(t) : HEAD[who];
      z = who === 'TODO' ? 3.9 : 1.9;
      cx = hx; cy = hy + (who === 'TODO' ? 10 : who === 'DOUG' ? 80 : 50);
      z *= 1 + 0.012 * lt;
    }
    z *= punch;
    const hw = W / 2 / z, hh = H / 2 / z;
    // rechts darf die Kamera über den Kaffeetisch hinaus (Wand und Boden laufen weiter), sonst sitzt Todo am Rand
    cx = clamp(cx, hw, 2200 - hw);
    cy = clamp(cy, hh, 1080 - hh);
    return { cx, cy, z };
  }

  drawWorld(c: CanvasRenderingContext2D, t: number, shot: { s: string }) {
    const s = stepOf(t);
    drawRoom(c, t, s);
    drawContactShadows(c, (['KEVIN', 'BARB', 'TYLER', 'PRIYA'] as const).map((w) => POS[w]), POS.DOUG);
    const pen = this.flip.draw(c, t);
    drawCoffee(c, t);
    CAST_EGG.t = t;
    texture(true);
    for (const who of ['KEVIN', 'BARB', 'TYLER', 'PRIYA'] as const) {
      if (who === 'KEVIN' && t > this.tFall) {
        // Kevin kippt mit dem Stuhl nach links um (Drehpunkt: linkes Stuhlbein)
        const k = ease.inQuad(clamp((t - this.tFall) / 0.42));
        const wob = t > this.tFall + 0.42 ? Math.sin((t - this.tFall - 0.42) * 30) * 0.06 * Math.exp(-(t - this.tFall - 0.42) * 6) : 0;
        const [px, py] = [POS.KEVIN[0] - 67, POS.KEVIN[1] + 90];
        c.save();
        c.translate(px, py); c.rotate(-1.42 * k + wob); c.translate(-px, -py);
        DRAW.KEVIN(c, { ...this.pose(t, who), mood: 'shock', armL: 1, armR: 1, wave: false });
        c.restore();
        continue;
      }
      DRAW[who](c, this.pose(t, who));
    }
    const dp = this.pose(t, 'DOUG');
    drawDoug(c, dp, shot.s === 'flip' ? 1 : 0);
    const tp = this.pose(t, 'TODO');
    drawTodo(c, tp, this.todoAt(t), t < this.tTodoMove ? 1 : 0.8);
    texture(false);
    if (pen && shot.s === 'flip') drawMarkerHand(c, pen);
    this.confetti(c, t);
  }

  /** Konfetti zum Finale: deterministisch aus Zufallswerten pro Schnipsel. */
  confetti(c: CanvasRenderingContext2D, t: number) {
    const lt = t - this.tConfetti;
    if (lt < 0) return;
    const cols = ['#e05a47', '#f2b544', '#4f9bd9', '#6fbf73', '#b07cc6', '#ffe066'];
    const ts = stepOf(t) / 12;
    for (let i = 0; i < 160; i++) {
      const x0 = hash(i, 1) * 2000 - 40, y0 = -40 - hash(i, 2) * 700;
      const v = 260 + hash(i, 3) * 260;
      const y = y0 + v * (ts - this.tConfetti);
      if (y > 1120 || y < -60) continue;
      const x = x0 + Math.sin(ts * (2 + hash(i, 4) * 3) + i) * 40;
      c.save();
      c.translate(x, y);
      c.rotate(ts * (3 + hash(i, 5) * 4) + i);
      c.scale(1, Math.cos(ts * 7 + i));
      c.fillStyle = cols[i % cols.length]!;
      c.fillRect(-8, -5, 16, 10);
      c.restore();
    }
  }

  subtitles(c: CanvasRenderingContext2D, t: number) {
    const l = this.lines.find((x) => t >= x.start - 0.1 && t < x.end + 0.35);
    if (!l) return;
    const size = 38, maxW = 1240;
    c.save();
    c.font = font(F.grotesk(700), size);
    // Zeilenumbruch
    const rows: { w: (typeof l.words)[number][]; x: number[]; width: number }[] = [];
    let cur: typeof rows[number] = { w: [], x: [], width: 0 };
    const sp = c.measureText(' ').width;
    for (const w of l.words) {
      const ww = c.measureText(w.w).width;
      if (cur.w.length && cur.width + sp + ww > maxW) { rows.push(cur); cur = { w: [], x: [], width: 0 }; }
      cur.x.push(cur.w.length ? cur.width + sp : 0);
      cur.width = (cur.w.length ? cur.width + sp : 0) + ww;
      cur.w.push(w);
    }
    rows.push(cur);
    const bw = Math.max(...rows.map((r) => r.width)) + 70, bh = rows.length * 50 + 34;
    const bx = (W - bw) / 2, by = H - 60 - bh;
    cut(c, rect(bx, by, bw, bh, 700 + l.start), 'rgba(251,250,245,0.94)');
    const name = l.speaker === 'ALL' ? 'EVERYONE' : l.speaker;
    c.font = font(F.mono(600), 15);
    const nw = c.measureText(name).width + 24;
    cut(c, rect(bx + 18, by - 16, nw, 28, 701 + l.start), '#1d1a1e', { shadow: false });
    label(c, name, bx + 18 + nw / 2, by + 3, 15, '#ffe066', { mono: true, weight: 600, ls: 1 });
    c.font = font(F.grotesk(700), size);
    c.textAlign = 'left';
    rows.forEach((r, ri) => r.w.forEach((w, wi) => {
      const p = Lyrics.wordProgress(w, t);
      c.fillStyle = p > 0 ? '#1d1a1e' : 'rgba(29,26,30,0.32)';
      c.fillText(w.w, bx + 35 + r.x[wi]!, by + 56 + ri * 50);
    }));
    c.restore();
  }

  titleCard(c: CanvasRenderingContext2D, t: number) {
    const s = stepOf(t);
    c.fillStyle = '#2c4f7c'; c.fillRect(0, 0, W, H);
    const words = ['PROMPTERS', 'ANONYMOUS'];
    const cols = ['#e05a47', '#f2b544', '#4f9bd9', '#6fbf73', '#b07cc6', '#fbfaf5'];
    let k = 0;
    words.forEach((wd, wi) => {
      const total = wd.length * 96;
      for (let i = 0; i < wd.length; i++, k++) {
        const appear = 0.12 + k * 0.07;
        if (t < appear) continue;
        const drop = 1 - ease.outBack(clamp((t - appear) / 0.22));
        const x = W / 2 - total / 2 + i * 96 + 48, y = 400 + wi * 150 - drop * 260;
        const rot = (hash(k, 2) - 0.5) * 0.25 + (hash(k, s % 3) - 0.5) * 0.03;
        c.save(); c.translate(x, y); c.rotate(rot);
        cut(c, rect(-44, -60, 88, 120, 800 + k), cols[k % 5]!);
        label(c, wd[i]!, 0, 30, 84, '#fbfaf5', { weight: 800 });
        c.restore();
      }
    });
    if (t > 1.5) {
      label(c, 'a support group for people who prompt Opus 5.5 wrong', W / 2, 790, 34, '#fbfaf5', { weight: 600 });
      label(c, 'EPISODE 1 · THE SEVEN STEPS', W / 2, 850, 20, '#ffe066', { mono: true, weight: 600, ls: 4 });
    }
  }

  endCard(c: CanvasRenderingContext2D, t: number, t0: number) {
    c.fillStyle = '#2c4f7c'; c.fillRect(0, 0, W, H);
    label(c, 'THE SEVEN STEPS (+1)', 160, 150, 56, '#fbfaf5', { align: 'left', weight: 800 });
    label(c, 'for working with Claude Opus 5.5', 160, 196, 26, '#cfe0ee', { align: 'left', weight: 500 });
    RECAP.forEach((r, i) => {
      const a = smoothstep(t0 + 0.1 + i * 0.12, t0 + 0.3 + i * 0.12, t);
      if (a <= 0) return;
      c.save(); c.globalAlpha = a;
      cut(c, rect(160, 250 + i * 76, 44, 44, 900 + i), i === 7 ? '#ffe066' : '#fbfaf5');
      c.strokeStyle = '#1e7a3c'; c.lineWidth = 6; c.lineCap = 'round';
      c.beginPath(); c.moveTo(170, 274 + i * 76); c.lineTo(180, 284 + i * 76); c.lineTo(196, 262 + i * 76); c.stroke();
      label(c, r, 232, 284 + i * 76, 30, '#fbfaf5', { align: 'left', weight: i === 7 ? 800 : 600 });
      c.restore();
    });
    label(c, 'Sources: code.claude.com/docs/en/best-practices · platform.claude.com/docs (Prompting Claude Opus 5.5)', 160, 960, 18, '#cfe0ee', { align: 'left', mono: true, weight: 500 });
    label(c, 'All characters are original. Any resemblance to your last sprint is purely coincidental.', 160, 992, 18, '#cfe0ee', { align: 'left', mono: true, weight: 500 });
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t;
    const L = this.layer;
    L.clear('#1d1a1e');
    const c = L.ctx;
    c.textBaseline = 'alphabetic';
    const tEnd = this.tLast + 0.6;
    if (t < this.tFirst - 0.12) this.titleCard(c, t);
    else if (t >= tEnd) this.endCard(c, t, tEnd);
    else {
      const shot = this.shotAt(t);
      if (shot.s.startsWith('cut:')) {
        const gag = GAGS[shot.s.slice(4)];
        const g: GagCtx = { t, t0: shot.t, t1: shot.end, at: (q, w) => this.at(q, w), end: (q) => this.line(q).end };
        const lt = t - shot.t, IRIS = 0.34;
        if (lt < IRIS && shot.prev && !shot.prev.s.startsWith('cut:')) {
          // Iris: Kreis wächst aus dem Kopf des Sprechers, dahinter die Rückblende
          const cam = this.camera(shot.prev, t);
          const who = (shot.prev.s.startsWith('cu:') ? shot.prev.s.slice(3) : 'DOUG') as Who;
          const [hx, hy] = HEAD[who];
          const sx = W / 2 + (hx - cam.cx) * cam.z, sy = H / 2 + (hy - cam.cy) * cam.z;
          c.save(); c.translate(W / 2, H / 2); c.scale(cam.z, cam.z); c.translate(-cam.cx, -cam.cy);
          this.drawWorld(c, t, shot.prev);
          c.restore();
          const r = 2300 * ease.inCubic(lt / IRIS) + 10;
          c.save();
          c.beginPath(); c.arc(sx, sy, r, 0, Math.PI * 2); c.clip();
          gag?.(c, g);
          c.restore();
          c.save(); c.strokeStyle = '#141218'; c.lineWidth = 14;
          c.beginPath(); c.arc(sx, sy, r, 0, Math.PI * 2); c.stroke(); c.restore();
        } else gag?.(c, g);
      } else {
        const cam = this.camera(shot, t);
        c.save();
        c.translate(W / 2, H / 2);
        c.scale(cam.z, cam.z);
        c.translate(-cam.cx, -cam.cy);
        this.drawWorld(c, t, shot);
        c.restore();
      }
      this.subtitles(c, t);
    }
    // Papierkorn über allem
    if (this.grain) {
      c.save();
      c.globalCompositeOperation = 'soft-light';
      c.globalAlpha = 0.12;
      c.fillStyle = this.grain;
      c.fillRect(0, 0, W, H);
      c.restore();
    }
    comp.draw(renderer, L.upload(), out);
    const fadeOut = smoothstep(this.ctx.audio.duration - 0.6, this.ctx.audio.duration - 0.05, t);
    let zoom = 1, sh = 0;
    for (const [tp, k] of this.punches) {
      if (t < tp || t > tp + 0.8) continue;
      const e = Math.exp(-(t - tp) * 7);
      zoom += k * e;
      sh = Math.max(sh, Math.exp(-(t - tp) * 11) * k * 90);
    }
    // Titel: jeder Buchstabe landet mit einem kleinen Rumms
    if (t < this.tFirst) for (let k = 0; k < 18; k++) {
      const land = 0.12 + k * 0.07 + 0.2;
      if (t >= land && t < land + 0.3) sh = Math.max(sh, Math.exp(-(t - land) * 18) * 5);
    }
    const s = stepOf(t);
    const shake: [number, number] = [(hash(s, 1) - 0.5) * 2 * sh, (hash(s, 2) - 0.5) * 2 * sh];
    return { bloom: 0, halation: 0, ca: 0, grain: 0.012, vignette: 0.28, hud: 0, fade: clamp(fadeOut), zoom, shake };
  }
}

export { ease, prog };
