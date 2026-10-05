"use client"

import { useLenis } from "lenis/react"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { hasLocale } from "@/i18n/config"
import { getDictionary } from "@/i18n/dictionaries"
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

// Nach so vielen vollständigen Durchläufen erscheint die Geschichte kompakt als Endbild.
// Michel (05.10.2026): „2–3 mal cool, dann stört sie eher.“
const FULL_RUNS = 2
const seenKey = (id: string) => `story-seen:${id}`

function readSeen(id: string) {
  try {
    return Number(localStorage.getItem(seenKey(id)) ?? 0) || 0
  } catch {
    return 0
  }
}

/**
 * Scroll-Geschichte (Version 4): Scrollen ist die Zeitachse. Die Bühne bleibt unter dem Kopf
 * stehen, während die Spur (340vh) durchläuft; darunter steht genau der Satz zur aktuellen Phase.
 * Kompakt (nach FULL_RUNS Durchläufen, oder ohne Bewegung): Endbild, alle Sätze untereinander,
 * Knopf zum erneuten Abspielen. Ohne Bewegung greift das per CSS, auch ohne JavaScript.
 */
export function ScrollStory({ id, label, title, intro, steps, scene, labels = {} }: ScrollStoryProps) {
  const { lang } = useParams<{ lang?: string }>()
  const t = getDictionary(lang && hasLocale(lang) ? lang : "de").story
  const track = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const counted = useRef(false)
  const [cap, setCap] = useState(0)
  const [still, setStill] = useState(false)
  const lenis = useLenis()

  // Gespeicherten Stand erst nach dem Hydrieren lesen: Server-HTML zeigt immer die volle Geschichte
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage gibt es erst im Browser
    if (readSeen(id) >= FULL_RUNS) setStill(true)
  }, [id])

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
      // Ein vollständiger Durchlauf zählt einmal pro Seitenaufruf
      if (p >= 0.98 && !counted.current && !still && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        counted.current = true
        try {
          localStorage.setItem(seenKey(id), String(readSeen(id) + 1))
        } catch {}
      }
    },
    [steps, id, still]
  )
  useScene(stage, scene, labels, progress, onProgress, still)

  // Sprung hinter die Geschichte. Als Knopf, weil die Anker-Logik von Lenis die lange Spur falsch misst.
  function skip() {
    const end = document.getElementById(`${id}-ende`)
    if (!end) return
    const y = end.getBoundingClientRect().top + scrollY - 88
    if (lenis) lenis.scrollTo(y)
    else scrollTo({ top: y })
  }

  function replay() {
    counted.current = true
    setStill(false)
    // Zum Anfang der Spur, damit die Geschichte von vorn läuft
    requestAnimationFrame(() => {
      const el = track.current
      if (!el) return
      if (lenis) lenis.scrollTo(el, { immediate: true })
      else el.scrollIntoView({ block: "start" })
    })
  }

  return (
    <section
      id={id}
      aria-labelledby={`${id}-h`}
      data-still={still ? "" : undefined}
      className="group/story wiki-bleed relative z-2 mt-section bg-paper"
    >
      <div className="grid-12 items-end gap-y-3 border-t border-ink pt-3">
        <div className="col-span-full flex items-baseline gap-4 md:col-span-3 md:flex-col md:gap-1.5">
          <span className="t-label text-ink-3">{still ? t.still : label}</span>
          {still ? (
            <button
              type="button"
              onClick={replay}
              className="group/arrow t-label inline-flex min-h-6 cursor-pointer items-center gap-2 text-ink motion-reduce:hidden"
            >
              {t.replay}
              <span aria-hidden="true" className="transition-transform duration-500 ease-out-expo group-hover/arrow:translate-x-1">
                ↻
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={skip}
              className="t-label inline-flex min-h-6 cursor-pointer items-center text-ink-3 transition-colors duration-160 hover:text-ink motion-reduce:hidden"
            >
              {t.skip} <span aria-hidden="true" className="ml-2">↓</span>
            </button>
          )}
        </div>
        <div className="col-span-full md:col-span-9">
          <h2 id={`${id}-h`} className="t-h2">
            {title}
          </h2>
          {intro && <p className="mt-2.5 max-w-[60ch] text-ink-2">{intro}</p>}
        </div>
      </div>
      <div ref={track} className="relative h-[340vh] group-data-still/story:h-auto motion-reduce:h-auto">
        <div
          className={cn(
            "sticky top-[72px] grid h-[calc(100svh-88px)] max-h-[820px] min-h-[460px] grid-rows-[minmax(0,1fr)_auto]",
            "group-data-still/story:static group-data-still/story:block group-data-still/story:h-auto group-data-still/story:max-h-none",
            "motion-reduce:static motion-reduce:block motion-reduce:h-auto motion-reduce:max-h-none"
          )}
        >
          <div
            ref={stage}
            aria-hidden="true"
            className="scene relative overflow-hidden border-b border-line group-data-still/story:h-[560px] motion-reduce:h-[560px]"
          />
          <ol className="relative min-h-[8.2em] group-data-still/story:min-h-0 md:min-h-[5.4em] motion-reduce:min-h-0">
            {steps.map((s, i) => (
              <li
                key={i}
                data-on={i === cap ? "" : undefined}
                className={cn(
                  "absolute inset-0 grid grid-cols-[3em_minmax(0,1fr)] gap-3 pt-3.5 text-[clamp(15.5px,1.4vw,17px)] leading-normal text-ink-2",
                  "translate-y-2 opacity-0 transition-[opacity,translate] duration-500 ease-out-expo data-on:translate-y-0 data-on:opacity-100",
                  "group-data-still/story:static group-data-still/story:translate-y-0 group-data-still/story:border-b group-data-still/story:border-line group-data-still/story:py-3 group-data-still/story:opacity-100",
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
      <span id={`${id}-ende`} aria-hidden="true" className="block scroll-mt-24" />
    </section>
  )
}
