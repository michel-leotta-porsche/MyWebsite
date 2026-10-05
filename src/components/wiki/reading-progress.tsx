"use client"

import { useEffect } from "react"

/**
 * Treibt die Laufline unter dem Kopf mit dem Lesefortschritt des Artikels (--run 0–1).
 * Ohne Bewegung steht die Linie voll, wie ohne JavaScript.
 */
export function ReadingProgress({ target }: { target: string }) {
  useEffect(() => {
    const line = document.querySelector<HTMLElement>("[data-runline]")
    const el = document.getElementById(target)
    if (!line || !el || matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let frame = 0
    const update = () => {
      frame = 0
      const r = el.getBoundingClientRect()
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)))
      line.style.setProperty("--run", p.toFixed(4))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    addEventListener("scroll", onScroll, { passive: true })
    addEventListener("resize", onScroll)
    return () => {
      removeEventListener("scroll", onScroll)
      removeEventListener("resize", onScroll)
      cancelAnimationFrame(frame)
      line.style.removeProperty("--run")
    }
  }, [target])
  return null
}
