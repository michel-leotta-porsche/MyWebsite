"use client"

import { useReducedMotion } from "motion/react"
import { useEffect, useRef, type RefObject } from "react"
import { scenes } from "@/content/scenes"
import { tw } from "./tw"

/**
 * Hängt eine Szene an eine Bühne. progress() liefert 0..1 aus der Scrollposition,
 * onProgress meldet den Wert z. B. für die Bildunterschriften.
 * Ohne Bewegung (prefers-reduced-motion) steht der Endzustand p = 1.
 */
export function useScene(
  stageRef: RefObject<HTMLElement | null>,
  name: string,
  labels: Record<string, unknown>,
  progress: () => number,
  onProgress?: (p: number) => void
) {
  const reduced = useReducedMotion()
  // Die neuesten Rückrufe ohne Neuaufbau der Szene
  const live = useRef({ progress, onProgress, labels })
  useEffect(() => {
    live.current = { progress, onProgress, labels }
  })

  useEffect(() => {
    const stage = stageRef.current
    const scene = scenes[name]
    if (!stage || !scene) return
    stage.replaceChildren()
    const ctx = scene.setup(stage, live.current.labels)
    const read = () => (reduced ? 1 : live.current.progress())
    const render = () => {
      const p = read()
      scene.render(ctx, p, tw)
      live.current.onProgress?.(p)
    }
    const relayout = () => {
      scene.layout(ctx, stage.clientWidth, stage.clientHeight)
      render()
    }
    let frame = 0
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(() => ((frame = 0), render()))
    }
    const ro = new ResizeObserver(relayout)
    ro.observe(stage)
    addEventListener("scroll", onScroll, { passive: true })
    relayout()
    document.fonts?.ready.then(relayout)
    return () => {
      ro.disconnect()
      removeEventListener("scroll", onScroll)
      cancelAnimationFrame(frame)
      stage.replaceChildren()
    }
  }, [stageRef, name, reduced])
}
