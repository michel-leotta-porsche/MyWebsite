"use client"

import { useRef, useState, type ReactNode } from "react"
import { AnimatePresence, motion, MotionConfig } from "motion/react"
import { Choice, FigFrame } from "./fig-frame"
import { useAutoplay } from "./use-autoplay"

type Item = { id: string; text: string; meta?: string }
type RearrangeState = { label: string; ids: string[]; mark?: string[]; note?: ReactNode }

type RearrangeProps = {
  /** Beschriftung „Nochmal abspielen“ */
  replay?: string
  title: string
  label: string
  items: Item[]
  states: RearrangeState[]
  /** Text für markierte Zeilen, damit die Markierung nicht nur über Farbe läuft */
  markLabel?: string
  initial?: number
}

const ROW = 40

/**
 * Liste, die sich neu ordnet, beim Sichtbarwerden von selbst, danach per Schalter: Zeilen rücken mit Motion `layout` an ihren Platz,
 * fehlende Zeilen blenden aus, neue ein. Taugt für Filter (git log --grep), Sortierung (rebase)
 * und Vorher/Nachher. Die Höhe bleibt fest, damit der Text darunter nicht springt.
 */
export function Rearrange({ title, label, items, states, markLabel, initial = 0, replay = "Nochmal abspielen" }: RearrangeProps) {
  const [i, setI] = useState(initial)
  const cur = states[i]
  const byId = new Map(items.map((it) => [it.id, it]))
  const rows = Math.max(...states.map((s) => s.ids.length))
  const fig = useRef<HTMLElement>(null)
  const { stop, replay: again, reduce: still } = useAutoplay(fig, states.length - 1, (k) => setI((initial + k) % states.length), 2600)

  return (
    <FigFrame ref={fig} replay={still ? undefined : { label: replay, onClick: again }} title={title} label={label}>
      <div className="grid gap-4 py-3.5">
        <Choice options={states.map((s) => s.label)} value={i} onChange={(k) => (stop(), setI(k))} ariaLabel={title} className="justify-self-start" />
        <MotionConfig reducedMotion="user" transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}>
          <ul
            aria-label={cur.label}
            className="relative overflow-x-auto bg-paper-2 py-1 font-mono text-[13px] sm:text-[14px]"
            style={{ minHeight: rows * ROW + 8 }}
            tabIndex={0}
          >
            <AnimatePresence initial={false} mode="popLayout">
              {cur.ids.map((id) => {
                const it = byId.get(id)
                if (!it) return null
                const marked = cur.mark?.includes(id)
                return (
                  <motion.li
                    key={id}
                    layout="position"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    data-mark={marked ? "" : undefined}
                    className="relative flex items-center gap-4 px-4 whitespace-nowrap before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:origin-top before:scale-y-0 before:bg-signal before:transition-transform before:duration-500 before:ease-out-expo data-mark:before:scale-y-100"
                    style={{ height: ROW }}
                  >
                    {it.meta && <span className="text-ink-3">{it.meta}</span>}
                    <span className="text-ink">{it.text}</span>
                    {marked && markLabel && <span className="t-label text-signal-ink">{markLabel}</span>}
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        </MotionConfig>
        {cur.note && (
          <p aria-live="polite" className="max-w-[68ch] text-[15.5px] text-ink-2">
            {cur.note}
          </p>
        )}
      </div>
    </FigFrame>
  )
}
