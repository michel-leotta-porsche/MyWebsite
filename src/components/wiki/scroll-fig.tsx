"use client"

import { useCallback, useRef, type ReactNode } from "react"
import { tw } from "./tw"
import { useScene } from "./use-scene"

type ScrollFigProps = {
  title: string
  label: string
  caption?: ReactNode
  scene: string
  labels?: Record<string, unknown>
  /** Fortschritt 0, wenn die Mitte der Grafik hier steht (Anteil der Fensterhöhe) */
  from?: number
  /** Fortschritt 1 bei diesem Anteil */
  to?: number
  /** Bühnenhöhe in px, schmal und breit */
  height?: [number, number]
  ariaLabel?: string
}

/** Kleine Scroll-Grafik im Textfluss: genau eine Verwandlung, während man vorbeiscrollt. */
export function ScrollFig({ title, label, caption, scene, labels = {}, from = 0.85, to = 0.35, height = [264, 216], ariaLabel }: ScrollFigProps) {
  const fig = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const progress = useCallback(() => {
    const el = fig.current
    if (!el) return 0
    const r = el.getBoundingClientRect()
    const c = r.top + r.height / 2
    return tw.clamp((innerHeight * from - c) / (innerHeight * (from - to)))
  }, [from, to])
  useScene(stage, scene, labels, progress)

  return (
    <figure ref={fig} className="my-[1.6em] border-t border-b border-t-ink border-b-line">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5 border-b border-line py-3">
        <h3 className="text-[1.05rem] font-semibold tracking-[-0.015em]">{title}</h3>
        <span className="t-label text-ink-3">{label}</span>
      </div>
      <div
        ref={stage}
        tabIndex={0}
        role="img"
        aria-label={ariaLabel ?? title}
        className="scene relative my-3.5 h-(--h-n) overflow-x-auto overflow-y-hidden sm:h-(--h-w)"
        style={{ ["--h-n" as string]: `${height[0]}px`, ["--h-w" as string]: `${height[1]}px` }}
      />
      {caption && <figcaption className="grid gap-1 pb-3.5 text-[15.5px] text-ink-2">{caption}</figcaption>}
    </figure>
  )
}
