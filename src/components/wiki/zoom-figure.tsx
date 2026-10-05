"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { animate, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"
import { FigFrame } from "./fig-frame"

type Level = { id: string; label: string; text: ReactNode }

type ZoomFigureProps = {
  title: string
  label: string
  levels: Level[]
  /**
   * Die Grafik. data-zoom="<id>" markiert, worauf die Kamera bei dieser Ebene fährt
   * (ohne Treffer: Gesamtbild). data-zoom-show="<id> <id>" blendet ein Element nur auf diesen Ebenen voll ein.
   */
  children: ReactNode
  initial?: string
  /** Bühnenhöhe in px, schmal und breit */
  height?: [number, number]
  ariaLabel?: string
}

/**
 * Kamera-Zoom per Klick: Die Grafik fährt mit einer Feder auf die gewählte Ebene, alles andere tritt zurück.
 * Beim Laden zeigt sie das Gesamtbild. Ohne Bewegung springt die Kamera.
 */
export function ZoomFigure({ title, label, levels, children, initial, height = [300, 380], ariaLabel }: ZoomFigureProps) {
  const [cur, setCur] = useState(initial ?? levels[levels.length - 1].id)
  const stage = useRef<HTMLDivElement>(null)
  const cam = useRef<HTMLDivElement>(null)
  const first = useRef(true)
  const reduce = useReducedMotion()

  const move = useCallback((id: string, instant: boolean) => {
    const st = stage.current
    const c = cam.current
    if (!st || !c) return
    const W = st.clientWidth
    const H = st.clientHeight
    const target = c.querySelector<HTMLElement>(`[data-zoom="${id}"]`)
    let s: number, x: number, y: number
    if (target) {
      // Lage des Ziels in der Kamera, ohne die aktuelle Transformation
      let ox = 0
      let oy = 0
      for (let n: HTMLElement | null = target; n && n !== c; n = n.offsetParent as HTMLElement | null) {
        ox += n.offsetLeft
        oy += n.offsetTop
      }
      s = Math.min((W * 0.86) / target.offsetWidth, (H * 0.8) / target.offsetHeight, 3)
      x = W / 2 - (ox + target.offsetWidth / 2) * s
      y = H / 2 - (oy + target.offsetHeight / 2) * s
    } else {
      s = Math.min(1, (H - 16) / c.offsetHeight)
      x = (W - c.offsetWidth * s) / 2
      y = Math.max(8, (H - c.offsetHeight * s) / 2)
    }
    c.querySelectorAll<HTMLElement>("[data-zoom-show]").forEach((el) => {
      el.toggleAttribute("data-zdim", !el.dataset.zoomShow!.split(" ").includes(id))
    })
    animate(c, { x, y, scale: s }, instant ? { duration: 0 } : { type: "spring", stiffness: 70, damping: 17, mass: 1.1 })
  }, [])

  useEffect(() => {
    move(cur, first.current || !!reduce)
    first.current = false
  }, [cur, move, reduce])

  useEffect(() => {
    const st = stage.current
    if (!st) return
    const ro = new ResizeObserver(() => move(cur, true))
    ro.observe(st)
    return () => ro.disconnect()
  }, [cur, move])

  return (
    <FigFrame title={title} label={label}>
      <div
        ref={stage}
        role="img"
        aria-label={ariaLabel ?? title}
        className="zoom-stage relative my-3.5 h-(--h-n) overflow-hidden bg-paper-2 sm:h-(--h-w)"
        style={{
          ["--h-n" as string]: `${height[0]}px`,
          ["--h-w" as string]: `${height[1]}px`,
        }}
      >
        <div ref={cam} className="absolute top-0 left-0 w-full origin-top-left p-4 will-change-transform">
          {children}
        </div>
      </div>
      <div
        role="group"
        aria-label={title}
        className="grid gap-px bg-line pb-px sm:grid-cols-(--cols)"
        style={{
          ["--cols" as string]: `repeat(${levels.length}, minmax(0, 1fr))`,
        }}
      >
        {levels.map((l) => (
          <button
            key={l.id}
            type="button"
            aria-pressed={cur === l.id}
            onClick={() => setCur(l.id)}
            className={cn(
              "relative grid content-start gap-1 bg-paper px-3 py-3 text-left text-[15px] text-ink-2 transition-colors duration-160 hover:text-ink",
              "aria-pressed:bg-paper-2 aria-pressed:text-ink",
              "before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:origin-left before:scale-x-0 before:bg-signal before:transition-transform before:duration-500 before:ease-out-expo aria-pressed:before:scale-x-100",
            )}
          >
            <b className="font-semibold text-ink">{l.label}</b>
            <span>{l.text}</span>
          </button>
        ))}
      </div>
    </FigFrame>
  )
}
