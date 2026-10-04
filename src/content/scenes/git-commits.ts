import { el, esc, type Scene } from "@/components/wiki/tw"

/*
 * Szenen zum Artikel „Git-Commits“. Beide Sprachen nutzen dieselbe Szene,
 * Texte (Nachrichten, Beschriftungen) kommen als labels aus der MDX-Datei.
 */

// Dateien sind in beiden Sprachen gleich. t = Thema 0..3 (Marker chart-1..4)
const files = [
  { st: "M", f: "src/session/config.py", t: 3 },
  { st: "M", f: "styles/header.css", t: 2 },
  { st: "D", f: "pages/kontakt.html", t: 1 },
  { st: "M", f: "tests/test_session.py", t: 3 },
  { st: "M", f: "README.md", t: 0 },
  { st: "M", f: "templates/footer.html", t: 1 },
]
// Reihenfolge wie im Log: neuester Commit oben
const hashes = ["a71c0e4", "5b2d9f8", "c03e6a1", "91fd3b7"]

type SplitLabels = { box: string; boxNote: string; messages: string[] }

type SplitCtx = {
  stage: HTMLElement
  box: HTMLElement
  rail: HTMLElement
  dots: HTMLElement[]
  lines: HTMLElement[]
  chips: HTMLElement[]
  marks: HTMLElement[]
  K?: {
    k0: { x: number; y: number; r: number }[]
    k1: { x: number; y: number; r: number }[]
    k2: { x: number; y: number; r: number }[]
    bx: number
    by: number
  }
}

/** Aus einem Commit werden vier: verstreut, Sammel-Commit, sortiert, Log. */
export const commitSplit: Scene<SplitLabels, SplitCtx> = {
  setup(stage, labels) {
    const box = el(stage, "s-box", `<b>3f9a2c1 ${esc(labels.box)}</b><span>${esc(labels.boxNote)}</span>`)
    const rail = el(stage, "s-rail")
    const dots = hashes.map(() => el(stage, "s-dot"))
    const lines = hashes.map((h, i) => el(stage, "s-msg", `<i>${h}</i>${esc(labels.messages[i] ?? "")}`))
    const chips = files.map((c) => el(stage, "s-chip", `<u class="k${c.t}"></u><i>${c.st}</i>${esc(c.f)}`))
    const marks = chips.map((c) => c.querySelector("u") as HTMLElement)
    return { stage, box, rail, dots, lines, chips, marks }
  },

  layout(ctx, W, H) {
    const { chips, box, rail, dots, lines } = ctx
    const cw = chips.map((c) => c.offsetWidth)
    const ch = chips[0].offsetHeight
    const narrow = W < 640
    // K0: verstreut wie auf einem Schreibtisch
    const cols = narrow ? 2 : 3
    const rows = Math.ceil(files.length / cols)
    const jit = [
      [-0.18, 0.1, -5],
      [0.15, -0.12, 4],
      [-0.05, 0.2, -3],
      [0.2, 0.05, 6],
      [-0.15, -0.15, 3],
      [0.1, 0.18, -6],
    ]
    const k0 = files.map((_, i) => {
      const cx = (((i % cols) + 0.5) / cols) * W
      const cy = ((Math.floor(i / cols) + 0.5) / rows) * H * 0.9 + H * 0.05
      const x = cx - cw[i] / 2 + ((jit[i][0] * W) / cols) * 0.6
      const y = cy - ch / 2 + ((jit[i][1] * H) / rows) * 0.6
      return { x: Math.max(0, Math.min(W - cw[i], x)), y, r: narrow ? jit[i][2] * 0.6 : jit[i][2] }
    })
    // K1: ein Kasten, alle Dateien darin
    const title = box.querySelector("b") as HTMLElement
    const bw = Math.min(W, Math.max(Math.max(...cw) + 32, title.scrollWidth + 64))
    const bh = 46 + files.length * (ch + 6) + 8
    const bx = (W - bw) / 2
    const by = Math.max(0, (H - bh - 28) / 2)
    const k1 = files.map((_, i) => ({ x: bx + 14, y: by + 46 + i * (ch + 6), r: 0 }))
    // K2: vier Zeilen wie im Log, Dateien unter ihrer Nachricht; breit mittig
    const rowH = Math.min(H / 4, narrow ? 999 : 132)
    const msgH = lines[0].offsetHeight
    const oy = (H - rowH * 4) / 2
    const ox = narrow ? 0 : Math.max(0, (W - 820) / 2)
    const count = [0, 0, 0, 0]
    const k2 = files.map((c, i) => {
      const n = count[c.t]++
      const top = oy + c.t * rowH + 10 + msgH + 6
      if (narrow) return { x: 32, y: top + n * (ch + 4), r: 0 }
      let x = ox + 32
      for (let j = 0; j < i; j++) if (files[j].t === c.t) x += cw[j] + 10
      return { x, y: top, r: 0 }
    })
    ctx.K = { k0, k1, k2, bx, by }
    box.style.width = `${bw}px`
    box.style.height = `${bh}px`
    const dy = Math.round((msgH - 14) / 2)
    rail.style.left = `${ox + 7}px`
    rail.style.top = `${oy + 7 + dy + 7}px`
    rail.style.height = `${rowH * 3}px`
    dots.forEach((d, i) => {
      d.style.left = `${ox + 1}px`
      d.style.top = `${oy + i * rowH + 7 + dy}px`
    })
    lines.forEach((l, i) => {
      l.style.left = `${ox + 32}px`
      l.style.top = `${oy + i * rowH + 7}px`
    })
  },

  render(ctx, p, { clamp, ease, seg, lerp }) {
    const K = ctx.K
    if (!K) return
    // Phasen: verstreut, sammeln, halten, verteilen, Linie, Nachrichten
    const a = seg(p, 0.1, 0.3)
    const b = seg(p, 0.4, 0.62)
    const c = seg(p, 0.62, 0.76)
    const d = seg(p, 0.74, 0.9)
    ctx.chips.forEach((chip, i) => {
      const off = i * 0.06
      const ta = ease(clamp((a - off) / 0.7))
      const tb = ease(clamp((b - off) / 0.7))
      const p0 = K.k0[i]
      const p1 = K.k1[i]
      const p2 = K.k2[i]
      const x = lerp(lerp(p0.x, p1.x, ta), p2.x, tb)
      const y = lerp(lerp(p0.y, p1.y, ta), p2.y, tb)
      const r = lerp(p0.r, 0, ta)
      chip.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${r.toFixed(2)}deg)`
    })
    const mk = ease(seg(p, 0.3, 0.4)).toFixed(3)
    ctx.marks.forEach((m) => (m.style.opacity = mk))
    const boxIn = ease(seg(p, 0.14, 0.3))
    const boxOut = ease(seg(p, 0.4, 0.5))
    ctx.box.style.opacity = (boxIn * (1 - boxOut)).toFixed(3)
    ctx.box.style.transform = `translate(${K.bx}px,${K.by}px) scale(${(0.94 + 0.06 * boxIn + 0.04 * boxOut).toFixed(3)})`
    ctx.rail.style.transform = `scaleY(${ease(c).toFixed(3)})`
    ctx.dots.forEach((dot, i) => (dot.style.transform = `scale(${ease(clamp((c - i * 0.15) / 0.55)).toFixed(3)})`))
    ctx.lines.forEach((line, i) => {
      const t = ease(clamp((d - i * 0.12) / 0.64))
      line.style.clipPath = `inset(0 ${((1 - t) * 100).toFixed(1)}% 0 0)`
    })
  },
}

type FixupLabels = { fixup: string; docs: string; header: string; target: [string, string] }

type FixupCtx = { rows: Record<"fix" | "a" | "b" | "t", HTMLElement>; swaps: HTMLElement[]; RH: number }

/** Der Nachtrag rutscht hinter seinen Ziel-Commit und geht darin auf. */
export const fixupFold: Scene<FixupLabels, FixupCtx> = {
  setup(stage, labels) {
    const row = (cls: string, hash: string, msg: string) =>
      el(stage, `s-row ${cls}`, `<span class="h">${hash}</span><span class="m">${msg}</span>`)
    const swap = (a: string, b: string) => `<span class="swap"><span class="a">${a}</span><span class="b">${b}</span></span>`
    const [before, after] = labels.target
    const rows = {
      fix: row("fix", "4e2b1d9", esc(labels.fixup)),
      a: row("", "a71c0e4", esc(labels.docs)),
      b: row("", "c03e6a1", esc(labels.header)),
      t: row("", swap("91fd3b7", "e58a0c2"), swap(esc(before), esc(after))),
    }
    const swaps = Array.from(stage.querySelectorAll<HTMLElement>(".swap"))
    return { rows, swaps, RH: 52 }
  },
  layout(ctx) {
    ctx.RH = ctx.rows.a.offsetHeight + 8
  },
  render({ rows, swaps, RH }, p, { ease, seg, lerp }) {
    // Start: Nachtrag oben, dann a, b, t. Ende: a, b, t (Nachtrag in t aufgegangen)
    const m = ease(seg(p, 0, 0.6))
    const f = ease(seg(p, 0.55, 0.9))
    rows.a.style.transform = `translateY(${lerp(RH, 0, m)}px)`
    rows.b.style.transform = `translateY(${lerp(RH * 2, RH, m)}px)`
    rows.t.style.transform = `translateY(${lerp(RH * 3, RH * 2, m)}px)`
    rows.fix.style.transform = `translateY(${lerp(0, RH * 3 - 6, m)}px) scale(${(1 - 0.04 * f).toFixed(3)})`
    rows.fix.style.opacity = (1 - f).toFixed(3)
    swaps.forEach((s) => {
      const a = s.querySelector<HTMLElement>(".a")!
      const b = s.querySelector<HTMLElement>(".b")!
      a.style.opacity = (1 - f).toFixed(3)
      b.style.opacity = f.toFixed(3)
      b.style.transform = `translateY(${((1 - f) * 6).toFixed(1)}px)`
    })
  },
}
