/*
 * Hilfen für Scroll-Szenen (wie Blog.tw in blog-system/blog.js).
 * Fortschritt p läuft von 0 bis 1 und kommt nur aus der Scrollposition.
 */
const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
// ease-in-out-cubic, dieselbe Kurve wie --ease-in-out-cubic
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** Objekt i von n startet versetzt innerhalb der Phase a..b */
const at = (p: number, i: number, n: number, a: number, b: number) => {
  const t = seg(p, a, b)
  const off = n > 1 ? (i / (n - 1)) * 0.4 : 0
  return ease(clamp((t - off) / 0.6))
}

export const tw = { clamp, ease, seg, lerp, at }
export type Tw = typeof tw

/**
 * Eine Szene baut ihre Akteure in setup (aus Daten und Texten der MDX-Datei),
 * berechnet Keyframes in layout aus der Bühnengröße und setzt in render den Zustand bei p.
 * Bewegt werden nur transform, opacity und clip-path.
 */
export type Scene<Labels = Record<string, unknown>, Ctx = unknown> = {
  setup: (stage: HTMLElement, labels: Labels) => Ctx
  layout: (ctx: Ctx, W: number, H: number) => void
  render: (ctx: Ctx, p: number, t: Tw) => void
}

/** Kleines Hilfsmittel zum Bauen von Akteuren. */
export function el(parent: HTMLElement, cls: string, html?: string) {
  const d = document.createElement("div")
  d.className = cls
  if (html !== undefined) d.innerHTML = html
  parent.appendChild(d)
  return d
}

/** Text sicher als HTML einsetzen (Labels kommen aus MDX). */
export const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string)
