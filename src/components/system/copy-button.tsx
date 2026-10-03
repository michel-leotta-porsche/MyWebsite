"use client"

import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useState } from "react"
import { cn } from "@/lib/utils"

/*
 * Kopier-Button. Muster nach Watermelon UI "copy-confirm" (Label-Wechsel),
 * angepasst an Systemplan: kein Radius, keine Feder, kein Grün. Bestätigung in Bernstein-Text.
 */
export function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const reduce = useReducedMotion()

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Zwischenablage nicht verfügbar (z. B. ohne HTTPS): still bleiben.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "t-label relative inline-flex h-8 min-w-[9ch] cursor-pointer items-center justify-end overflow-hidden text-ink-3 transition-colors duration-160 hover:text-ink",
        copied && "text-signal-ink hover:text-signal-ink",
        className
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={copied ? "done" : "idle"}
          initial={reduce ? false : { y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? undefined : { y: "-100%", opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
        >
          {copied ? "Kopiert" : "Kopieren"}
        </motion.span>
      </AnimatePresence>
      <span className="sr-only" aria-live="polite">
        {copied ? "In die Zwischenablage kopiert" : ""}
      </span>
    </button>
  )
}
