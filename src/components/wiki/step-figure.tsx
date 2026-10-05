"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export type FigureStep = { say: ReactNode; state: string }

type StepFigureProps = {
  title: string
  label: string
  steps: FigureStep[]
  /** Die Grafik. Elemente mit data-p="<state>" werden im passenden Schritt hervorgehoben. */
  children: ReactNode
  /** Scrollytelling: Grafik bleibt stehen, die Schritte laufen daneben vorbei. */
  scroll?: boolean
  ariaLabel?: string
}

/**
 * Statische Grafik mit Schrittliste. Klick, Pfeiltaste oder (mit scroll) die Scrollposition
 * wählt einen Schritt; dessen Teil in der Grafik bekommt die Bernstein-Linie, der Rest tritt zurück.
 * Beim Laden ist kein Schritt gewählt: Die Grafik zeigt alles.
 */
export function StepFigure({ title, label, steps, children, scroll, ariaLabel }: StepFigureProps) {
  const [active, setActive] = useState(-1)
  const fig = useRef<HTMLDivElement>(null)
  const stepRefs = useRef<(HTMLLIElement | null)[]>([])

  // Hervorhebung direkt am DOM: Teile der Grafik sind beliebiges Markup aus MDX
  useEffect(() => {
    const state = steps[active]?.state
    fig.current?.querySelectorAll<HTMLElement>("[data-p]").forEach((el) => {
      const on = state !== undefined && el.dataset.p === state
      el.toggleAttribute("data-focus", on)
      el.toggleAttribute("data-dim", state !== undefined && !on)
    })
  }, [active, steps])

  // Scrollytelling: der Schritt in der Mitte des Fensters ist aktiv
  useEffect(() => {
    if (!scroll) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i))
      },
      { rootMargin: "-45% 0px -45% 0px" }
    )
    stepRefs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [scroll])

  function onKey(e: React.KeyboardEvent, i: number) {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault()
      stepRefs.current[Math.min(steps.length - 1, i + 1)]?.querySelector("button")?.focus()
    }
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault()
      stepRefs.current[Math.max(0, i - 1)]?.querySelector("button")?.focus()
    }
  }

  return (
    <section
      aria-label={title}
      className={cn("my-10", scroll && "lg:wiki-bleed lg:grid-12 lg:items-start lg:bg-paper")}
    >
      <figure className={cn("min-w-0 border-t border-ink", scroll && "lg:sticky lg:top-24 lg:col-span-6")}>
        <div className="flex items-baseline justify-between gap-4 border-b border-line py-3">
          <h3 className="text-[1.05rem] font-semibold tracking-[-0.015em]">{title}</h3>
          <span className="t-label text-ink-3">{label}</span>
        </div>
        <div ref={fig} tabIndex={0} aria-label={ariaLabel ?? title} className="step-fig overflow-x-auto py-4">
          {children}
        </div>
      </figure>
      <ol className={cn("mt-4 grid", scroll && "lg:col-span-5 lg:col-start-8 lg:mt-0 lg:pb-[20vh]")}>
        {steps.map((s, i) => (
          <li
            key={i}
            ref={(el) => {
              stepRefs.current[i] = el
            }}
            data-i={i}
            className={cn("border-t border-line", scroll && "lg:flex lg:min-h-[38vh] lg:flex-col lg:justify-center lg:border-0")}
          >
            <button
              type="button"
              aria-pressed={active === i}
              onClick={() => setActive(active === i ? -1 : i)}
              onKeyDown={(e) => onKey(e, i)}
              className={cn(
                "group relative grid w-full cursor-pointer grid-cols-[2.5em_minmax(0,1fr)] gap-2 py-3 pl-[18px] text-left text-ink-2 transition-opacity duration-500 ease-out-expo",
                scroll && "lg:opacity-60 lg:aria-pressed:opacity-100"
              )}
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-2 left-0 w-[3px] bg-line transition-colors duration-160 group-aria-pressed:bg-signal"
              />
              <span className="t-data pt-[3px] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
              <span className="[&_strong]:font-semibold [&_strong]:text-ink">{s.say}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
