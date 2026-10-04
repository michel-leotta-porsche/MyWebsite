"use client"

import { ReactLenis } from "lenis/react"
import "lenis/dist/lenis.css"

/**
 * Weiches Scrollen mit Lenis auf dem ganzen Dokument.
 * Lenis schaltet sich bei prefers-reduced-motion selbst ab (respectReducedMotion ist Standard).
 * Anker springen unter den fixierten Kopf (64px + Luft).
 */
export function SmoothScroll() {
  return <ReactLenis root options={{ lerp: 0.12, anchors: { offset: -88 } }} />
}
