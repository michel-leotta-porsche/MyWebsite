"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSyncExternalStore } from "react"
import { hasLocale, locales, translatePath, type Locale } from "@/i18n/config"
import { cn } from "@/lib/utils"

const toggleCls =
  "t-label inline-flex min-h-6 min-w-6 cursor-pointer items-center justify-center text-ink-3 transition-colors duration-160 hover:text-ink aria-pressed:text-ink aria-[current=true]:text-ink focus-visible:outline-offset-2"

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
export function ThemeToggle({
  className,
  labels = { scheme: "Farbschema", light: "Hell", dark: "Dunkel" },
}: {
  className?: string
  labels?: { scheme: string; light: string; dark: string }
}) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, serverTheme)

  function set(t: Theme) {
    document.documentElement.classList.toggle("dark", t === "dark")
    try {
      localStorage.setItem("theme", t)
    } catch {}
  }

  return (
    <span role="group" aria-label={labels.scheme} className={cn("flex gap-1", className)}>
      <button type="button" className={toggleCls} aria-pressed={theme === "light"} onClick={() => set("light")}>
        <span aria-hidden="true">○</span>
        <span className="sr-only">{labels.light}</span>
      </button>
      <button type="button" className={toggleCls} aria-pressed={theme === "dark"} onClick={() => set("dark")}>
        <span aria-hidden="true">●</span>
        <span className="sr-only">{labels.dark}</span>
      </button>
    </span>
  )
}

/**
 * DE/EN-Schalter: Links auf dieselbe Seite in der anderen Sprache (gleicher Slug).
 * Außerhalb der Sprachpfade (z. B. /styleguide) führen sie auf die Startseiten.
 */
export function LangToggle({ className, label = "Sprache" }: { className?: string; label?: string }) {
  const pathname = usePathname() ?? "/"
  const seg = pathname.split("/")[1] ?? ""
  const current: Locale | undefined = hasLocale(seg) ? seg : undefined

  return (
    <span role="group" aria-label={label} className={cn("flex gap-1", className)}>
      {locales.map((l) => (
        <Link
          key={l}
          href={translatePath(pathname, l)}
          hrefLang={l}
          lang={l}
          className={toggleCls}
          aria-current={current === l ? "true" : undefined}
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </span>
  )
}
