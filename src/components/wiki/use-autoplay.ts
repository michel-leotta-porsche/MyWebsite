"use client"

import { useCallback, useEffect, useRef, type RefObject } from "react"
import { useReducedMotion } from "motion/react"

/**
 * Lässt eine Grafik selbst durchlaufen: Sobald sie zu 40 Prozent im Fenster steht,
 * ruft der Hook step(1) … step(steps) im Takt auf, bei jedem neuen Sichtbarwerden von vorn
 * (step(0) setzt zurück). Greift der Leser selbst ein, endet der Durchlauf (stop).
 * Bei reduzierter Bewegung läuft nichts von selbst.
 */
export function useAutoplay(ref: RefObject<HTMLElement | null>, steps: number, step: (k: number) => void, every = 2200) {
  const reduce = useReducedMotion()
  const timers = useRef<number[]>([])
  const stopped = useRef(false)
  const stepRef = useRef(step)
  useEffect(() => {
    stepRef.current = step
  })

  const clear = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }
  const stop = useCallback(() => {
    stopped.current = true
    clear()
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el || reduce) return
    let played = false
    const io = new IntersectionObserver(
      ([e]) => {
        if (stopped.current) return
        if (e.isIntersecting) {
          if (played) stepRef.current(0)
          played = true
          clear()
          for (let k = 1; k <= steps; k++) timers.current.push(window.setTimeout(() => stepRef.current(k), 600 + (k - 1) * every))
        } else clear()
      },
      { threshold: 0.4 }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      clear()
    }
  }, [ref, steps, every, reduce])

  return stop
}
