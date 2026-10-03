import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const styles = {
  note: { bar: "bg-ink", label: "Hinweis" },
  tip: { bar: "bg-line", label: "Tipp" },
  warning: { bar: "bg-signal", label: "Achtung" },
} as const

type CalloutProps = {
  variant?: keyof typeof styles
  title?: string
  children: ReactNode
  className?: string
}

/** Callout: 3px-Balken links, Label in Mono. Bernstein nur für "warning". Keine Flächenfarbe. */
export function Callout({ variant = "note", title, children, className }: CalloutProps) {
  const s = styles[variant]
  return (
    <aside className={cn("relative my-8 py-1 pl-6", className)}>
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-[3px]", s.bar)} />
      <p className={cn("t-label", variant === "warning" ? "text-signal-ink" : "text-ink-3")}>{title ?? s.label}</p>
      <div className="mt-2 max-w-[60ch] text-ink-2 [&>p+p]:mt-3">{children}</div>
    </aside>
  )
}
