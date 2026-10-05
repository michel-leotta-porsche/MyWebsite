"use client"

import { useId, useRef, useState, type ReactNode } from "react"
import { flushSync } from "react-dom"
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"
import { FigFrame } from "./fig-frame"
import { useAutoplay } from "./use-autoplay"

type Slot = { id: string; label: string; text: ReactNode; note?: ReactNode }

type DragSnapProps = {
  /** Beschriftung „Nochmal abspielen“ */
  replay?: string
  title: string
  label: string
  /** Text auf dem Etikett, das gezogen wird */
  chip: string
  slots: Slot[]
  initial?: number
  /** Beschriftung der Knöpfe, z. B. „Hierhin“ */
  place: string
  /** Hinweis für Screenreader, wie das Etikett per Tastatur wandert */
  keysHint: string
}

const SPRING = { type: "spring" as const, stiffness: 420, damping: 22 }

/**
 * Etikett ziehen und einrasten lassen. Die Plätze sind gleich breit, deshalb steht das Etikett
 * schon im Server-HTML über dem richtigen Platz (per CSS-Variable). Beim Ziehen zählt nur der Versatz x;
 * nach dem Loslassen springt der Platz um und der Versatz federt auf 0. Knöpfe ersetzen das Ziehen für die Tastatur.
 */
export function DragSnap({ title, label, chip, slots, initial = 0, place, keysHint, replay = "Nochmal abspielen" }: DragSnapProps) {
  const [i, setI] = useState(initial)
  const iRef = useRef(initial)
  iRef.current = i
  const [near, setNear] = useState<number | null>(null)
  const track = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const reduce = useReducedMotion()
  const hint = useId()
  const n = slots.length
  const fig = useRef<HTMLElement>(null)
  // Läuft beim Sichtbarwerden einmal über alle Plätze zurück zum Start
  const { stop, replay: again, reduce: still } = useAutoplay(fig, n, (k) => {
    const next = (initial + k) % n
    if (next !== iRef.current) go(next, 0)
  })

  const slotW = () => (track.current?.clientWidth ?? 0) / n
  const nearest = (offset: number) => Math.max(0, Math.min(n - 1, Math.round(i + offset / slotW())))

  // Neuer Platz, das Etikett startet optisch dort, wo es gerade ist, und federt hinüber
  function go(next: number, from: number) {
    const shift = (iRef.current - next) * slotW() + from
    flushSync(() => setI(next))
    x.set(shift)
    if (reduce) x.set(0)
    else animate(x, 0, SPRING)
  }

  return (
    <FigFrame ref={fig} replay={still ? undefined : { label: replay, onClick: again }} title={title} label={label} caption={slots[i].note && <span aria-live="polite">{slots[i].note}</span>}>
      <div ref={track} className="relative mt-3.5 pt-14" style={{ ["--n" as string]: n, ["--i" as string]: i }}>
        <motion.button
          type="button"
          drag="x"
          dragMomentum={false}
          dragConstraints={track}
          dragElastic={0.08}
          style={{ x, left: "calc((var(--i) + 0.5) * 100% / var(--n))" }}
          onDragStart={stop}
          onDrag={(_, info) => setNear(nearest(info.offset.x))}
          onDragEnd={(_, info) => {
            setNear(null)
            go(nearest(info.offset.x), x.get())
          }}
          onKeyDown={(e) => {
            stop()
            if (e.key === "ArrowLeft" && i > 0) go(i - 1, 0)
            if (e.key === "ArrowRight" && i < n - 1) go(i + 1, 0)
          }}
          aria-label={`${chip}: ${slots[i].label}`}
          aria-describedby={hint}
          className="absolute top-2 flex -translate-x-1/2 min-h-9 cursor-grab touch-pan-y items-center gap-2 border border-ink bg-paper px-3 font-mono text-[13px] text-signal-ink active:cursor-grabbing"
          whileDrag={{ scale: 1.06 }}
        >
          <span aria-hidden="true" className="h-3 w-[3px] bg-signal" />
          {chip}
        </motion.button>
        <span id={hint} className="sr-only">
          {keysHint}
        </span>
        <ol className="grid gap-px bg-line pt-px" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {slots.map((s, k) => (
            <li
              key={s.id}
              data-on={k === i ? "" : undefined}
              data-near={k === near ? "" : undefined}
              className="grid content-start gap-1.5 bg-paper px-3 py-3 transition-colors duration-160 data-near:bg-paper-2 data-on:bg-paper-2"
            >
              <span className="t-data text-ink">{s.label}</span>
              <span className="text-[14.5px] text-ink-2">{s.text}</span>
              <button
                type="button"
                aria-pressed={k === i}
                onClick={() => {
                  stop()
                  if (k !== i) go(k, 0)
                }}
                className={cn("mt-1 min-h-6 justify-self-start font-mono text-[12px] text-ink-3 underline-offset-4 hover:text-ink hover:underline aria-pressed:text-signal-ink aria-pressed:no-underline")}
              >
                {k === i ? chip : place}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </FigFrame>
  )
}
