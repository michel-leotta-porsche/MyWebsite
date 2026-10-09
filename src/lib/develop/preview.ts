"use client";

// Vorschau beim Bearbeiten: WebGL2 wendet den LUT als 3D-Textur an (Hardware-Interpolation) und legt die
// Körnung mit demselben Hash wie beim Einrechnen darüber. Ohne WebGL2 rechnet die CPU dasselbe auf einem 2D-Canvas.

import { applyGrain, applyLut, GRAIN, type RecipeValues } from "@/lib/develop/model";

export type PreviewState = { lut: Uint8Array; n: number; rec: RecipeValues; /** 0..1: links davon Original; null = kein Vergleich */ split: number | null; original: boolean;
  /** Richtung der Trennlinie im Bild, wenn es gedreht oder gespiegelt gezeigt wird; ohne: links nach rechts */
  sdir?: [number, number];
  /** Vignette −1..1 und die Abbildung Bild → Ergebnis (outMap), damit sie am Rand des Zuschnitts sitzt */
  vignette?: number;
  vmap?: [number, number, number, number, number, number];
};

const VS = `#version 300 es
in vec2 p;
out vec2 uv;
void main() { uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }`;

const FS = `#version 300 es
precision highp float;
precision highp sampler3D;
in vec2 uv;
uniform sampler2D img;
uniform sampler3D lut;
uniform float n;
uniform float split;
uniform vec2 sdir;
uniform float vig;
uniform mat3 vmap;
uniform float amount;
uniform float cell;
uniform vec2 full;
out vec4 o;
float hash2(uint x, uint y) {
  uint v = x * 1973u + y * 9277u + 89173u;
  v = v * 747796405u + 2891336453u;
  uint w = ((v >> ((v >> 28u) + 4u)) ^ v) * 277803737u;
  return float((w >> 22u) ^ w) / 4294967295.0;
}
void main() {
  vec3 c = texture(img, uv).rgb;
  if (dot(uv - 0.5, sdir) + 0.5 < split) { o = vec4(c, 1.0); return; }
  c = texture(lut, c * ((n - 1.0) / n) + 0.5 / n).rgb;
  if (vig != 0.0) {
    vec2 q = (vmap * vec3(uv, 1.0)).xy;
    float t = clamp((length((q - 0.5) * 2.0) - 0.45) / 0.7, 0.0, 1.0);
    float f = t * t * (3.0 - 2.0 * t);
    c = vig < 0.0 ? c * (1.0 + vig * 0.7 * f) : c + (1.0 - c) * vig * 0.6 * f;
  }
  if (amount > 0.0) {
    vec2 px = floor(uv * full / cell);
    float h = hash2(uint(px.x), uint(px.y));
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c += (h - 0.5) * 2.0 * amount * 4.0 * l * (1.0 - l);
  }
  o = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

export interface Previewer {
  /** Bild setzen; full = Breite und Höhe des Bilds beim Einrechnen (für gleich große Körnung) */
  setImage(src: ImageBitmap | HTMLImageElement | HTMLCanvasElement, full: [number, number]): void;
  draw(s: PreviewState): void;
  dispose(): void;
  readonly gpu: boolean;
}

type Src = ImageBitmap | HTMLImageElement | HTMLCanvasElement;
const dims = (s: Src): [number, number] => ("naturalWidth" in s ? [s.naturalWidth, s.naturalHeight] : [s.width, s.height]);

export function createPreviewer(canvas: HTMLCanvasElement): Previewer {
  return glPreviewer(canvas) ?? cpuPreviewer(canvas);
}

function glPreviewer(canvas: HTMLCanvasElement): Previewer | null {
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (name: string) => gl.getUniformLocation(prog, name);
  const imgTex = gl.createTexture();
  const lutTex = gl.createTexture();
  gl.uniform1i(u("img"), 0);
  gl.uniform1i(u("lut"), 1);
  let full: [number, number] = [1, 1];
  let lastLut: Uint8Array | null = null;
  let lost = false;
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    lost = true;
  });

  return {
    gpu: true,
    setImage(src, f) {
      full = f;
      const [w, h] = dims(src);
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, imgTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      lastLut = null;
    },
    draw(s) {
      if (lost) return;
      if (s.lut !== lastLut) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_3D, lutTex);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, s.n, s.n, s.n, 0, gl.RGBA, gl.UNSIGNED_BYTE, s.lut);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        for (const w of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D, w, gl.CLAMP_TO_EDGE);
        lastLut = s.lut;
      }
      gl.uniform1f(u("n"), s.n);
      gl.uniform1f(u("split"), s.original ? 2 : (s.split ?? -1));
      gl.uniform2f(u("sdir"), ...(s.sdir ?? [1, 0]));
      gl.uniform1f(u("vig"), s.vignette ?? 0);
      const [a, b, c, d, e, f] = s.vmap ?? [1, 0, 0, 1, 0, 0];
      // spaltenweise: erste Spalte (a, b, 0), zweite (c, d, 0), dritte (e, f, 1)
      gl.uniformMatrix3fv(u("vmap"), false, [a, b, 0, c, d, 0, e, f, 1]);
      gl.uniform1f(u("amount"), GRAIN.amount[s.rec.grain]);
      gl.uniform1f(u("cell"), Math.max(1, full[0] * GRAIN.cell[s.rec.gsize]));
      gl.uniform2f(u("full"), full[0], full[1]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() {
      gl.deleteTexture(imgTex);
      gl.deleteTexture(lutTex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}

function cpuPreviewer(canvas: HTMLCanvasElement): Previewer {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  // Safari: kein WebGL2 und kein Speicher mehr für eine Zeichenfläche
  if (!ctx) throw new Error("Weder WebGL2 noch eine Zeichenfläche verfügbar");
  let src: ImageData | null = null;
  let out: ImageData | null = null;
  let full: [number, number] = [1, 1];
  return {
    gpu: false,
    setImage(img, f) {
      full = f;
      const [w, h] = dims(img);
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0);
      src = ctx.getImageData(0, 0, w, h);
      out = new ImageData(w, h);
    },
    draw(s) {
      if (!src || !out) return;
      if (s.original) return ctx.putImageData(src, 0, 0);
      applyLut(src.data, out.data, s.lut, s.n);
      // Körnung in Vorschaugröße, aber mit der Zellgröße des großen Bilds
      if (s.rec.grain) applyGrain(out.data, src.width, s.rec, 0, full[0] / src.width);
      ctx.putImageData(out, 0, 0);
      if (s.split != null && s.split > 0) ctx.putImageData(src, 0, 0, 0, 0, Math.round(src.width * s.split), src.height);
    },
    dispose() {},
  };
}
