"use client"

import { useEffect, useRef, useState } from "react"
import { useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"
import { Choice, FigFrame } from "./fig-frame"
import { useAutoplay } from "./use-autoplay"

const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789():_-"

/**
 * Verwürfeln ohne GSAP: Jedes Zeichen hat eine eigene Schwelle. Davor zeigt es den alten Text,
 * kurz davor Zufallszeichen, danach den neuen Text. Läuft per requestAnimationFrame und
 * schreibt direkt ins DOM, nicht über React-State.
 */
function scramble(el: HTMLElement, from: string, to: string, ms: number) {
  const len = Math.max(from.length, to.length)
  const gate = Array.from({ length: len }, (_, i) => 0.25 + (i / Math.max(1, len)) * 0.45 + Math.random() * 0.3)
  const start = performance.now()
  let raf = 0
  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / ms)
    let out = ""
    for (let i = 0; i < len; i++) {
      const target = to[i] ?? ""
      if (t >= gate[i]) out += target
      else if (t >= gate[i] - 0.3) out += target === " " ? " " : CHARS[(Math.random() * CHARS.length) | 0]
      else out += from[i] ?? ""
    }
    el.textContent = out
    if (t < 1) raf = requestAnimationFrame(frame)
    else el.textContent = to
  }
  raf = requestAnimationFrame(frame)
  return () => cancelAnimationFrame(raf)
}

type ScrambleProps = { text: string; ms?: number; className?: string }

/** Text, der sich bei jeder Änderung Zeichen für Zeichen in den neuen Text verwandelt. */
export function Scramble({ text, ms = 600, className }: ScrambleProps) {
  const el = useRef<HTMLSpanElement>(null)
  const prev = useRef(text)
  const reduce = useReducedMotion()

  useEffect(() => {
    const from = prev.current
    prev.current = text
    if (!el.current || from === text) return
    if (reduce) {
      el.current.textContent = text
      return
    }
    return scramble(el.current, from, text, ms)
  }, [text, ms, reduce])

  // Sichtbar läuft das Verwürfeln, Screenreader lesen nur den fertigen Text
  return (
    <span className={className}>
      <span ref={el} aria-hidden="true">
        {text}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  )
}

type ScrambleSwapState = { label: string; lines: string[]; note?: string }

type ScrambleSwapProps = {
  /** Beschriftung „Nochmal abspielen“ */
  replay?: string
  title: string
  label: string
  states: ScrambleSwapState[]
  /** Spalte vor jeder Zeile, z. B. Hashes im Log */
  gutter?: string[]
  initial?: number
}

/** Zeilen, die sich verwürfeln, z. B. ein Log vorher und nachher. Läuft beim Sichtbarwerden selbst, der Schalter übernimmt. */
export function ScrambleSwap({ title, label, states, gutter, initial = 0, replay = "Nochmal abspielen" }: ScrambleSwapProps) {
  const [i, setI] = useState(initial)
  const rows = Math.max(...states.map((s) => s.lines.length))
  const cur = states[i]
  const fig = useRef<HTMLElement>(null)
  const { stop, replay: again, reduce: still } = useAutoplay(fig, states.length - 1, (k) => setI((initial + k) % states.length), 2600)

  return (
    <FigFrame ref={fig} replay={still ? undefined : { label: replay, onClick: again }} title={title} label={label}>
      <div className="grid gap-4 py-3.5">
        <Choice options={states.map((s) => s.label)} value={i} onChange={(k) => (stop(), setI(k))} ariaLabel={title} className="justify-self-start" />
        <ol className="relative overflow-x-auto bg-paper-2 py-2 font-mono text-[13px] leading-[1.9] sm:text-[14px]" tabIndex={0} aria-label={cur.label}>
          {Array.from({ length: rows }, (_, r) => (
            <li
              key={r}
              data-empty={cur.lines[r] ? undefined : ""}
              className="flex gap-4 px-4 whitespace-pre transition-opacity duration-500 ease-out-expo data-empty:opacity-0"
            >
              {gutter && (
                <span aria-hidden="true" className="text-ink-3">
                  {gutter[r] ?? ""}
                </span>
              )}
              <Scramble text={cur.lines[r] ?? ""} className={cn("text-ink")} />
            </li>
          ))}
        </ol>
        {cur.note && (
          <p aria-live="polite" className="text-[15.5px] text-ink-2">
            {cur.note}
          </p>
        )}
      </div>
    </FigFrame>
  )
}
