// Die Labor-Szene: ein Modul für alle Abschnitte (params.rule wählt die Requisite).
// Ebenen: Portal-Hintergrund (GLSL) → Figuren, Requisite, Sprechblase, Kopfzeile (Canvas2D).
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { FSPass, Layer2D } from '../engine/gl';
import { Script, boilOf, drawBubble, drawHeader, drawJo, drawVex, type Mood, clamp, ease, prog, smoothstep } from './_lab';
import { PROPS } from './lab-props';

/** Zeilen, bei denen Jo schwitzt (Dr. Vex wird persönlich). */
const INSULTS = ['fortune cookie', 'drool', 'Gross.', 'dimensions collapse', 'Unlike you', 'Almost competent', 'not a s'];

export default class Lab extends Scene {
  bg = new FSPass(/* glsl */ `
    uniform float t; uniform float portal; uniform float rad;
    void main() {
      vec2 p = FRAG_PX;
      float v = p.y / 1080.0;
      vec3 wall = mix(vec3(0.008, 0.011, 0.018), vec3(0.020, 0.032, 0.048), v);
      // Blaupausen-Raster: 1px-Haarlinien alle 60px
      vec2 g = abs(fract(p / 60.0) - 0.5) * 60.0;
      float gl = 1.0 - smoothstep(0.0, 1.1, min(g.x, g.y));
      wall += gl * 0.010;
      // Boden
      wall = mix(wall, vec3(0.006, 0.008, 0.012), smoothstep(190.0, 170.0, p.y));
      // Portal: Spirale aus Rauschen mit hellem Rand
      vec2 d = p - vec2(960.0, 480.0);
      float r = length(d) / max(rad, 1.0);
      float a = atan(d.y, d.x);
      float sw = a * 2.0 - log(max(r, 1e-3)) * 4.0 + t * 2.2;
      float n = fbm(vec2(cos(sw), sin(sw)) * 1.3 + vec2(r * 2.5, t * 0.3), 4);
      float rr = r + n * 0.07;
      float inside = 1.0 - smoothstep(0.95, 1.0, rr);
      float bands = 0.5 + 0.5 * sin(sw * 3.0 + n * 5.0);
      float rim = smoothstep(0.72, 0.97, rr) * inside;
      vec3 pc = mix(C_ACID * 0.10, C_ACID * 0.55, bands * (0.4 + 0.6 * rr));
      pc = mix(pc, vec3(0.75, 1.0, 0.55), rim * 0.85);
      vec3 col = mix(wall, pc, inside * portal) + rim * portal * C_ACID * 0.5;
      // Glimmen außerhalb
      col += C_ACID * 0.05 * portal * exp(-max(rr - 1.0, 0.0) * 6.0);
      fragColor = vec4(col, 1.0);
    }`, { t: { value: 0 }, portal: { value: 0 }, rad: { value: 360 } });
  layer = new Layer2D();
  sc!: Script;
  rule = 'open';

  override init() {
    this.sc = new Script(this.ctx.lyrics, this.ctx.audio);
    this.rule = this.ctx.params.rule ?? 'open';
  }

  /** Portal-Stärke und Radius je Abschnitt. */
  private portal(t: number): [number, number] {
    const { start, end } = this.ctx;
    const base = 0.3;
    const zap = Math.pow(0.5, Math.max(0, t - start) / 0.25);
    if (this.rule === 'open') {
      const o = ease.outBack(prog(t, 0.05, 0.9));
      return [lerp1(1, base, smoothstep(0.9, 2.2, t)), 380 * o];
    }
    if (this.rule === 'outro') {
      const tVex = this.sc.at('Almost competent'), tEnd = this.sc.at('Almost competent', 'itself.');
      const grow = ease.inOutCubic(prog(t, tVex, tVex + 1.2));
      const close = ease.inBack(prog(t, tEnd + 0.2, tEnd + 0.9));
      return [lerp1(base, 0.9, grow), lerp1(360, 620, grow) * (1 - close)];
    }
    void end;
    return [base + (1 - base) * zap * 0.8, 360 + zap * 60];
  }

  private moods(t: number): { jo: Mood; vex: Mood } {
    const who = this.sc.speaking(t);
    let sweat = 0;
    for (const q of INSULTS) {
      const l = this.sc.ly.find(q)[0];
      if (l) sweat = Math.max(sweat, smoothstep(l.start, l.start + 0.3, t) * (1 - smoothstep(l.end + 0.4, l.end + 0.9, t)));
    }
    const propLook = smoothstep(this.ctx.start, this.ctx.start + 0.3, t) * (1 - smoothstep(this.ctx.start + 1.2, this.ctx.start + 1.6, t));
    return {
      jo: { sweat, look: who === 'VEX' ? 0.8 : 0.5 - propLook * 0.2, brow: who === 'JO' ? 0.9 : 0.3 },
      vex: { look: who === 'JO' ? -0.9 : -0.5, brow: who === 'VEX' ? 0.25 : 0, smug: sweat },
    };
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t;
    const [pa, pr] = this.portal(t);
    this.bg.u.t!.value = t;
    this.bg.u.portal!.value = pa;
    this.bg.u.rad!.value = pr;
    this.bg.render(renderer, out);

    const b = boilOf(t);
    const L = this.layer;
    L.clear();
    const c = L.ctx;
    c.textBaseline = 'alphabetic';
    const m = this.moods(t);
    PROPS[this.rule]?.({ c, t, b, sc: this.sc, start: this.ctx.start, end: this.ctx.end });
    drawJo(c, t, b, this.sc.mouth(t, 'JO'), m.jo);
    drawVex(c, t, b, this.sc.mouth(t, 'VEX'), m.vex);
    drawBubble(c, t, b, this.sc);
    drawHeader(c, t, this.ctx.start, this.rule);
    comp.draw(renderer, L.upload(), out);

    const zap = this.rule === 'open' ? 0 : Math.pow(0.5, Math.max(0, t - this.ctx.start) / 0.08) * 0.12;
    const endFade = this.rule === 'outro' ? smoothstep(this.ctx.end - 0.5, this.ctx.end - 0.05, t) : 0;
    return { bloom: 0.4, bloomThreshold: 0.9, halation: 0.08, ca: 0.5, grain: 0.03, vignette: 0.28, hud: 0, flash: zap, fade: clamp(endFade) };
  }
}

const lerp1 = (a: number, b: number, k: number) => a + (b - a) * k;
