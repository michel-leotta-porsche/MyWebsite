"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { cn } from "@/lib/utils"

const toggleCls =
  "t-label cursor-pointer text-ink-3 transition-colors duration-160 hover:text-ink aria-pressed:text-ink focus-visible:outline-offset-2"

type Theme = "light" | "dark"

// Das Farbschema steht als Klasse auf <html> (gesetzt vor dem ersten Paint, siehe layout.tsx).
function subscribeTheme(cb: () => void) {
  const mo = new MutationObserver(cb)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
  return () => mo.disconnect()
}
const readTheme = (): Theme => (document.documentElement.classList.contains("dark") ? "dark" : "light")
const serverTheme = (): Theme => "light"

/** Hell/Dunkel. Hell ist Standard; die Wahl liegt in localStorage("theme"). */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, serverTheme)

  function set(t: Theme) {
    document.documentElement.classList.toggle("dark", t === "dark")
    try {
      localStorage.setItem("theme", t)
    } catch {}
  }

  return (
    <span role="group" aria-label="Farbschema" className={cn("flex gap-2.5", className)}>
      <button type="button" className={toggleCls} aria-pressed={theme === "light"} onClick={() => set("light")}>
        <span aria-hidden="true">○</span>
        <span className="sr-only">Hell</span>
      </button>
      <button type="button" className={toggleCls} aria-pressed={theme === "dark"} onClick={() => set("dark")}>
        <span aria-hidden="true">●</span>
        <span className="sr-only">Dunkel</span>
      </button>
    </span>
  )
}

/**
 * DE/EN-Schalter. Phase 2: nur die Oberfläche (setzt <html lang>).
 * Die echte Übersetzung kommt mit den Seiten in Phase 3.
 */
export function LangToggle({ className }: { className?: string }) {
  const [lang, setLang] = useState<"de" | "en">("de")

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang)
  }, [lang])

  return (
    <span role="group" aria-label="Sprache" className={cn("flex gap-2.5", className)}>
      {(["de", "en"] as const).map((l) => (
        <button key={l} type="button" className={toggleCls} aria-pressed={lang === l} onClick={() => setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </span>
  )
}
