"use client";

import type { MotionValue } from "motion/react";
import { useEffect, useRef, useState } from "react";

import type { Page } from "@/content/plates";
import { drawPage } from "@/components/page-texture";

// Das umblätternde Blatt als ein Gitternetz in WebGL: biegt sich als glatte Kurve,
// Licht aus der Flächennormale, Schatten auf der Seite darunter. Ruhende Seiten bleiben HTML.

type Leaf = { front: Page; back: Page };

/** Welche Blätter WebGL gerade zeichnen kann; das HTML-Blatt blendet sich dann beim Umblättern aus */
export function createCurlStore() {
  const ready = new Set<number>();
  const subs = new Set<() => void>();
  const emit = () => subs.forEach((f) => f());
  return {
    has: (i: number) => ready.has(i),
    add: (i: number) => {
      ready.add(i);
      emit();
    },
    clear: () => {
      ready.clear();
      emit();
    },
    remove: (i: number) => {
      if (ready.delete(i)) emit();
    },
    subscribe: (f: () => void) => {
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
  };
}
export type CurlStore = ReturnType<typeof createCurlStore>;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const turnEase = (s: number) => (s < 0.5 ? 4 * s * s * s : 1 - Math.pow(-2 * s + 2, 3) / 2);
const SEGMENTS = 64;
// Wölbung mitten im Umblättern: die freie Kante eilt bis zu so viel Grad voraus
const BEND = 70;
// gleiche Perspektive wie das HTML-Blatt (perspective(2600px))
const DEPTH = 2600;
// Platz über und unter dem Buch, weil ein aufgerichtetes Blatt in der Perspektive größer wirkt
const EXTRA = 0.35;

const VERT = `
attribute vec3 aPos;
attribute vec2 aUV;
attribute vec2 aN;
uniform vec2 uSize;
uniform float uH;
uniform float uE;
varying vec2 vUV;
varying vec3 vN;
void main() {
  float k = ${DEPTH.toFixed(1)} / (${DEPTH.toFixed(1)} - aPos.z);
  vec2 s = aPos.xy * k;
  float sx = uSize.x * 0.5 + s.x;
  float sy = uE + uH * 0.5 - s.y;
  gl_Position = vec4(sx / uSize.x * 2.0 - 1.0, 1.0 - sy / uSize.y * 2.0, -aPos.z / ${DEPTH.toFixed(1)}, 1.0);
  vUV = aUV;
  vN = vec3(aN.x, 0.0, aN.y);
}`;

const FRAG = `
precision mediump float;
uniform sampler2D uFront;
uniform sampler2D uBack;
uniform float uAlpha;
uniform float uShadow;
varying vec2 vUV;
varying vec3 vN;
void main() {
  if (uShadow > 0.0) {
    // Schatten auf der Seite darunter: am stärksten am Bund, läuft zur Kante aus
    float a = uShadow * pow(1.0 - vUV.x, 1.4);
    gl_FragColor = vec4(0.047 * a, 0.039 * a, 0.031 * a, a);
    return;
  }
  vec3 N = normalize(gl_FrontFacing ? vN : -vN);
  vec4 c = gl_FrontFacing ? texture2D(uFront, vUV) : texture2D(uBack, vec2(1.0 - vUV.x, vUV.y));
  vec3 L = normalize(vec3(-0.35, 0.45, 0.82));
  float d = max(dot(N, L), 0.0);
  // flach liegend genau 1.0, damit der Wechsel vom HTML-Blatt nicht springt
  float lit = (0.58 + 0.42 * d) / (0.58 + 0.42 * 0.82);
  vec3 R = reflect(-L, N);
  float sheen = pow(max(R.z, 0.0), 28.0) * 0.07;
  vec3 col = c.rgb * lit + sheen;
  gl_FragColor = vec4(col * uAlpha, uAlpha);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? "shader");
  return sh;
}

type GLState = {
  gl: WebGLRenderingContext;
  prog: WebGLProgram;
  buf: WebGLBuffer;
  shadowBuf: WebGLBuffer;
  loc: {
    aPos: number;
    aUV: number;
    aN: number;
    uSize: WebGLUniformLocation;
    uH: WebGLUniformLocation;
    uE: WebGLUniformLocation;
    uFront: WebGLUniformLocation;
    uBack: WebGLUniformLocation;
    uAlpha: WebGLUniformLocation;
    uShadow: WebGLUniformLocation;
  };
};

function init(canvas: HTMLCanvasElement): GLState | null {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: true, alpha: true });
  if (!gl) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  const u = (n: string) => gl.getUniformLocation(prog, n)!;
  return {
    gl,
    prog,
    buf: gl.createBuffer()!,
    shadowBuf: gl.createBuffer()!,
    loc: {
      aPos: gl.getAttribLocation(prog, "aPos"),
      aUV: gl.getAttribLocation(prog, "aUV"),
      aN: gl.getAttribLocation(prog, "aN"),
      uSize: u("uSize"),
      uH: u("uH"),
      uE: u("uE"),
      uFront: u("uFront"),
      uBack: u("uBack"),
      uAlpha: u("uAlpha"),
      uShadow: u("uShadow"),
    },
  };
}

function texture(gl: WebGLRenderingContext, source: HTMLCanvasElement) {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

/** Kurve des Blatts: Winkel entlang der Seite, die freie Kante eilt voraus und setzt zuerst auf */
function geometry(s: number, W: number, H: number, out: Float32Array) {
  const theta = 180 * turnEase(s);
  const b = BEND * Math.sin(Math.PI * s);
  let x = 0;
  let z = 0;
  const du = 1 / SEGMENTS;
  for (let j = 0; j <= SEGMENTS; j++) {
    const u = j * du;
    const phi = (Math.min(180, Math.max(0, theta + b * (2 * u - 1))) * Math.PI) / 180;
    const nx = -Math.sin(phi);
    const nz = Math.cos(phi);
    const o = j * 14;
    // oben und unten je ein Punkt: x, y, z, u, v, nx, nz
    out.set([x, H / 2, z, u, 0, nx, nz, x, -H / 2, z, u, 1, nx, nz], o);
    x += Math.cos(phi) * W * du;
    z += Math.sin(phi) * W * du;
  }
  return theta;
}

export function PageCurl({
  leaves,
  t,
  k,
  mode,
  store,
  bookRef,
}: {
  leaves: Leaf[];
  t: MotionValue<number>;
  k: number;
  mode: "spread" | "single";
  store: CurlStore;
  bookRef: React.RefObject<HTMLDivElement | null>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef<GLState | null>(null);
  const textures = useRef(new Map<number, { front: WebGLTexture; back: WebGLTexture }>());
  const size = useRef({ W: 0, H: 0, dpr: 1 });
  const frame = useRef(0);
  const render = useRef<() => void>(() => {});
  const pending = useRef(new Set<number>());
  const generation = useRef(0);
  // neue Größe: Texturen neu erzeugen
  const [sizeKey, setSizeKey] = useState(0);

  // WebGL einrichten und bei Größenänderung neu vermessen
  useEffect(() => {
    const c = canvas.current;
    const book = bookRef.current;
    if (!c || !book) return;
    let st: GLState | null = null;
    try {
      st = init(c);
    } catch {
      st = null;
    }
    if (!st) return;
    state.current = st;
    const verts = new Float32Array((SEGMENTS + 1) * 14);

    render.current = () => {
      frame.current = 0;
      const s = state.current;
      if (!s) return;
      const { gl, loc } = s;
      const { W, H } = size.current;
      gl.viewport(0, 0, c.width, c.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (!W) return;
      gl.uniform2f(loc.uSize, 2 * W, H * (1 + 2 * EXTRA));
      gl.uniform1f(loc.uH, H);
      gl.uniform1f(loc.uE, H * EXTRA);
      gl.uniform1i(loc.uFront, 0);
      gl.uniform1i(loc.uBack, 1);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      const tv = t.get();
      const stride = 7 * 4;
      const bind = (buf: WebGLBuffer) => {
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.enableVertexAttribArray(loc.aPos);
        gl.vertexAttribPointer(loc.aPos, 3, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(loc.aUV);
        gl.vertexAttribPointer(loc.aUV, 2, gl.FLOAT, false, stride, 12);
        gl.enableVertexAttribArray(loc.aN);
        gl.vertexAttribPointer(loc.aN, 2, gl.FLOAT, false, stride, 20);
      };
      textures.current.forEach((tex, i) => {
        const p = clamp01(tv - i);
        if (p <= 0.004 || p >= 0.996) return;
        const theta = geometry(p, W, H, verts);
        // Schatten auf die Seite, über der das Blatt gerade schwebt
        const lift = Math.sin((theta * Math.PI) / 180);
        const right = theta < 90;
        if (mode === "spread" || right) {
          const x1 = right ? W : -W;
          const quad = new Float32Array([
            0, H / 2, -1, 0, 0, 0, 1, 0, -H / 2, -1, 0, 1, 0, 1,
            x1, H / 2, -1, 1, 0, 0, 1, x1, -H / 2, -1, 1, 1, 0, 1,
          ]);
          gl.disable(gl.DEPTH_TEST);
          bind(s.shadowBuf);
          gl.bufferData(gl.ARRAY_BUFFER, quad, gl.DYNAMIC_DRAW);
          gl.uniform1f(loc.uShadow, 0.22 * lift);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        bind(s.buf);
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
        gl.uniform1f(loc.uShadow, 0);
        // auf dem Telefon verschwindet das Blatt ganz am Ende nach links
        gl.uniform1f(loc.uAlpha, mode === "single" && theta > 172 ? Math.max(0, 1 - (theta - 172) / 8) : 1);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex.front);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, tex.back);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, (SEGMENTS + 1) * 2);
      });
    };

    const measure = () => {
      const W = book.offsetWidth / (mode === "spread" ? 2 : 1);
      const H = book.offsetHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const changed = Math.abs(W - size.current.W) > 0.5 || Math.abs(H - size.current.H) > 0.5 || dpr !== size.current.dpr;
      size.current = { W, H, dpr };
      c.style.width = `${2 * W}px`;
      c.style.height = `${H * (1 + 2 * EXTRA)}px`;
      c.style.top = `${-H * EXTRA}px`;
      c.style.left = mode === "spread" ? "0px" : `${-W}px`;
      c.width = Math.round(2 * W * dpr);
      c.height = Math.round(H * (1 + 2 * EXTRA) * dpr);
      if (changed) {
        // neue Größe: Texturen passen nicht mehr
        textures.current.forEach((tx) => {
          st!.gl.deleteTexture(tx.front);
          st!.gl.deleteTexture(tx.back);
        });
        textures.current.clear();
        generation.current++;
        store.clear();
        setSizeKey(generation.current);
      }
      render.current();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(book);
    const lost = (e: Event) => {
      e.preventDefault();
      state.current = null;
      textures.current.clear();
      store.clear();
    };
    c.addEventListener("webglcontextlost", lost);
    const unsub = t.on("change", () => {
      if (!frame.current) frame.current = requestAnimationFrame(() => render.current());
    });
    return () => {
      ro.disconnect();
      unsub();
      c.removeEventListener("webglcontextlost", lost);
      cancelAnimationFrame(frame.current);
      store.clear();
      state.current = null;
    };
  }, [bookRef, mode, store, t]);

  // Texturen für die Blätter rund um die aufgeschlagene Seite vorbereiten, eins nach dem anderen
  useEffect(() => {
    const st = state.current;
    if (!st) return;
    const want = [k, k - 1, k + 1, k + 2, k - 2].filter((i) => i >= 0 && i < leaves.length);
    // ferne Blätter freigeben
    textures.current.forEach((tx, i) => {
      if (want.includes(i)) return;
      st.gl.deleteTexture(tx.front);
      st.gl.deleteTexture(tx.back);
      textures.current.delete(i);
      store.remove(i);
    });
    let cancelled = false;
    const gen = generation.current;
    (async () => {
      for (const i of want) {
        if (cancelled) return;
        if (textures.current.has(i) || pending.current.has(i)) continue;
        const { W, H, dpr } = size.current;
        if (!W) return;
        pending.current.add(i);
        try {
          const compact = mode === "single";
          const [front, back] = await Promise.all([
            drawPage(leaves[i].front, "right", W, H, dpr, compact),
            drawPage(leaves[i].back, "left", W, H, dpr, compact),
          ]);
          const s = state.current;
          if (!s || gen !== generation.current) continue;
          textures.current.set(i, { front: texture(s.gl, front), back: texture(s.gl, back) });
          store.add(i);
          render.current();
        } catch {
          // ohne Textur blättert das HTML-Blatt flach weiter
        } finally {
          pending.current.delete(i);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [k, leaves, mode, store, sizeKey]);

  return (
    <canvas ref={canvas} aria-hidden className="pointer-events-none absolute z-[140]" style={{ left: 0, top: 0 }} />
  );
}
