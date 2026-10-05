"use client"

import { useMemo, useRef, useState } from "react"
import { animate, useReducedMotion } from "motion/react"
import { Button } from "@/components/ui/button"
import { FigFrame } from "./fig-frame"
import { useAutoplay } from "./use-autoplay"

type SampleGridProps = {
  /** Beschriftung „Nochmal abspielen“ */
  replay?: string
  title: string
  label: string
  /** Anzahl Felder */
  total?: number
  /** Anteil, mit dem jedes Feld getroffen wird */
  rate?: number
  /** Beschriftung des Knopfs */
  action: string
  /** Satz unter dem Raster; {n} und {p} werden durch Anzahl und Prozent ersetzt */
  result: string
}

// Fester Startwert, damit Server und Browser dasselbe erste Raster zeigen
function seeded(total: number, rate: number) {
  let seed = 7
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  return Array.from({ length: total }, () => rnd() < rate)
}

/**
 * Raster vieler Felder, das per Knopf neu ausgelost wird. Jedes Feld wechselt mit eigener
 * Verzögerung (nur opacity, per CSS), die Zahl zählt mit Motion hoch oder runter.
 */
export function SampleGrid({ title, label, total = 200, rate = 0.2, action, result, replay = "Nochmal abspielen" }: SampleGridProps) {
  const [cells, setCells] = useState(() => seeded(total, rate))
  const count = useRef<HTMLSpanElement>(null)
  const reduce = useReducedMotion()
  const n = cells.filter(Boolean).length
  // Feste Verzögerung pro Feld, damit der Wechsel nicht zeilenweise läuft
  const delays = useMemo(() => Array.from({ length: total }, (_, i) => ((i * 7919) % 97) * 4), [total])

  function draw() {
    const next = cells.map(() => Math.random() < rate)
    const to = next.filter(Boolean).length
    setCells(next)
    if (count.current) {
      const el = count.current
      animate(n, to, { duration: reduce ? 0 : 0.6, ease: [0.19, 1, 0.22, 1], onUpdate: (v) => (el.textContent = String(Math.round(v))) })
    }
  }

  const fig = useRef<HTMLElement>(null)
  // Beim Sichtbarwerden dreimal von selbst auslosen
  const { stop, replay: again, reduce: still } = useAutoplay(fig, 3, (k) => k > 0 && draw(), 1800)

  const text = result.replace("{n}", String(n)).replace("{p}", String(Math.round((n / total) * 100)))

  return (
    <FigFrame ref={fig} replay={still ? undefined : { label: replay, onClick: again }} title={title} label={label}>
      <div className="grid gap-4 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              stop()
              draw()
            }}
          >
            {action}
          </Button>
          <span className="t-data text-ink" aria-hidden="true">
            <span ref={count}>{n}</span> / {total}
          </span>
        </div>
        <div aria-hidden="true" className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-[3px] sm:grid-cols-[repeat(40,minmax(0,1fr))]">
          {cells.map((on, i) => (
            <i
              key={i}
              data-on={on ? "" : undefined}
              className="aspect-square bg-ink opacity-15 transition-opacity duration-500 ease-out-expo data-on:opacity-100"
              style={{ transitionDelay: `${delays[i]}ms` }}
            />
          ))}
        </div>
        <p aria-live="polite" className="text-[15.5px] text-ink-2">
          {text}
        </p>
      </div>
    </FigFrame>
  )
}
