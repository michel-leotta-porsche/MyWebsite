"use client"

import { motion, useReducedMotion } from "motion/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Node, type CheckState } from "./checklist"

export type ProcessStep = { label: string; detail?: string }

type ProcessRunProps = {
  title: string
  footer: string
  steps: ProcessStep[]
  /** Beim Mount einmal abspielen. Ohne JS oder mit reduzierter Bewegung steht der Endzustand. */
  autoplay?: boolean
  /** Fortschritt als --run auf [data-runline] schreiben, damit die Laufline im Kopf mitwächst. */
  driveRunline?: boolean
  className?: string
  /** Erlaubt einen externen Replay-Button: Zähler hochsetzen spielt erneut ab. */
  replayKey?: number
}

const STEP_MS = 820
const START_MS = 300
const SETTLE_MS = 560
const EXPO = [0.19, 1, 0.22, 1] as const

/**
 * Signatur "Ablauf": Knoten laufen einmal durch, die Linie links füllt sich,
 * synchron wächst die Laufline unter dem Kopf. Startet aus dem sichtbaren Endzustand.
 */
export function ProcessRun({
  title,
  footer,
  steps,
  autoplay = true,
  driveRunline = true,
  className,
  replayKey = 0,
}: ProcessRunProps) {
  const reduce = useReducedMotion()
  const [states, setStates] = useState<CheckState[]>(() => steps.map(() => "done"))
  const [fill, setFill] = useState(1)
  const [running, setRunning] = useState(false)
  const timers = useRef<number[]>([])
  const raf = useRef(0)
  // Fortschritt pro Frame direkt ins DOM, ohne React-Render und ohne Style-Neuberechnung der ganzen Seite.
  const pctRef = useRef<HTMLElement>(null)
  const setProgress = useCallback(
    (p: number | null) => {
      if (pctRef.current) pctRef.current.textContent = `${String(Math.round((p ?? 1) * 100)).padStart(3, "0")} %`
      if (!driveRunline) return
      document.querySelectorAll<HTMLElement>("[data-runline]").forEach((el) => {
        if (p === null) el.style.removeProperty("--run")
        else el.style.setProperty("--run", String(p))
      })
    },
    [driveRunline]
  )

  const stop = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    cancelAnimationFrame(raf.current)
  }, [])

  const play = useCallback(() => {
    if (reduce) return
    stop()
    const total = START_MS + STEP_MS * steps.length
    setStates(steps.map(() => "open"))
    setFill(0)
    setRunning(true)
    setProgress(0)

    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / total)
      setProgress(p)
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)

    steps.forEach((_, i) => {
      const at = START_MS + i * STEP_MS
      timers.current.push(
        window.setTimeout(() => setStates((s) => s.map((v, j) => (j === i ? "active" : v))), at),
        window.setTimeout(() => {
          setStates((s) => s.map((v, j) => (j === i ? "done" : v)))
          setFill(steps.length > 1 ? i / (steps.length - 1) : 1)
          if (i === steps.length - 1) {
            setRunning(false)
            setProgress(null)
          }
        }, at + SETTLE_MS)
      )
    })
  }, [reduce, stop, steps, setProgress])

  useEffect(() => {
    if (!autoplay && replayKey === 0) return
    const t = window.setTimeout(play, replayKey === 0 ? 350 : 0)
    return () => {
      clearTimeout(t)
      stop()
      setProgress(null)
    }
  }, [autoplay, replayKey, play, stop, setProgress])

  return (
    <div className={cn("border-t border-ink", className)} aria-label={title} role="group">
      <div className="t-label flex justify-between border-b border-line py-3">
        <span>{title}</span>
        <span className="text-ink-3" aria-live="polite">
          {running ? "läuft" : "fertig"}
        </span>
      </div>
      <ol className="relative">
        <span aria-hidden="true" className="absolute top-6 bottom-6 left-1.5 w-px bg-line" />
        <motion.span
          aria-hidden="true"
          className="absolute top-6 bottom-6 left-1.5 w-px origin-top bg-ink"
          initial={false}
          animate={{ scaleY: fill }}
          transition={{ duration: 0.7, ease: EXPO }}
        />
        {steps.map((s, i) => {
          const st = states[i]
          return (
            <li
              key={s.label}
              className="relative grid grid-cols-[13px_1fr_auto] items-center gap-4 border-b border-line py-3.5"
            >
              <Node state={st} />
              <span className="text-[15px] leading-[1.3] font-medium tracking-[-0.01em]">
                {s.label}
                {s.detail && <small className="t-data mt-0.5 block text-xs text-ink-3">{s.detail}</small>}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "t-data text-xs font-medium",
                  st === "done" ? "text-ink" : st === "active" ? "text-signal-ink" : "text-ink-3"
                )}
              >
                {st === "done" ? "OK" : st === "active" ? "…" : "—"}
              </span>
            </li>
          )
        })}
      </ol>
      <div className="t-label flex justify-between py-3 text-ink-3">
        <span>{footer}</span>
        <b ref={pctRef} className="font-medium text-ink tabular-nums">
          100 %
        </b>
      </div>
    </div>
  )
}
