"use client"

import { useCallback, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { tw } from "./tw"
import { useScene } from "./use-scene"

export type StoryStep = { lead: ReactNode; text: ReactNode; at: number }

type ScrollStoryProps = {
  id: string
  label: string
  title: string
  intro?: ReactNode
  steps: StoryStep[]
  /** Name der Szene in content/scenes */
  scene: string
  labels?: Record<string, unknown>
}

/**
 * Scroll-Geschichte (Version 4): Scrollen ist die Zeitachse. Die Bühne bleibt unter dem Kopf
 * stehen, während die Spur (340vh) durchläuft; darunter steht genau der Satz zur aktuellen Phase.
 * Ohne Bewegung: Endzustand, alle Sätze untereinander (per CSS, auch ohne JavaScript).
 */
export function ScrollStory({ id, label, title, intro, steps, scene, labels = {} }: ScrollStoryProps) {
  const track = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const [cap, setCap] = useState(0)

  const progress = useCallback(() => {
    const el = track.current
    if (!el) return 0
    const r = el.getBoundingClientRect()
    return tw.clamp(-r.top / (r.height - innerHeight * 0.9))
  }, [])
  const onProgress = useCallback(
    (p: number) => {
      let next = 0
      steps.forEach((s, i) => p >= s.at && (next = i))
      setCap(next)
    },
    [steps]
  )
  useScene(stage, scene, labels, progress, onProgress)

  return (
    <section id={id} aria-labelledby={`${id}-h`} className="wiki-bleed relative z-2 mt-section bg-paper">
      <div className="grid-12 items-end gap-y-3 border-t border-ink pt-3">
        <span className="t-label col-span-full text-ink-3 md:col-span-3">{label}</span>
        <div className="col-span-full md:col-span-9">
          <h2 id={`${id}-h`} className="t-h2">
            {title}
          </h2>
          {intro && <p className="mt-2.5 max-w-[60ch] text-ink-2">{intro}</p>}
        </div>
      </div>
      <div ref={track} className="relative h-[340vh] motion-reduce:h-auto">
        <div className="sticky top-[72px] grid h-[calc(100svh-88px)] max-h-[820px] min-h-[460px] grid-rows-[minmax(0,1fr)_auto] motion-reduce:static motion-reduce:block motion-reduce:h-auto motion-reduce:max-h-none">
          <div ref={stage} aria-hidden="true" className="scene relative overflow-hidden border-b border-line motion-reduce:h-[560px]" />
          <ol className="relative min-h-[8.2em] md:min-h-[5.4em] motion-reduce:min-h-0">
            {steps.map((s, i) => (
              <li
                key={i}
                data-on={i === cap ? "" : undefined}
                className={cn(
                  "absolute inset-0 grid grid-cols-[3em_minmax(0,1fr)] gap-3 pt-3.5 text-[clamp(15.5px,1.4vw,17px)] leading-normal text-ink-2",
                  "translate-y-2 opacity-0 transition-[opacity,translate] duration-500 ease-out-expo data-on:translate-y-0 data-on:opacity-100",
                  "motion-reduce:static motion-reduce:translate-y-0 motion-reduce:border-b motion-reduce:border-line motion-reduce:py-3 motion-reduce:opacity-100"
                )}
              >
                <span className="t-data pt-[3px] text-signal-ink">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <b className="font-semibold text-ink">{s.lead}</b> {s.text}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
