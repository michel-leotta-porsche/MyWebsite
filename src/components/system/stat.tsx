import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Raster für Statistik-Kacheln: 1px-Fugen in Linienfarbe statt Rahmen. */
export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-1 gap-px border-y border-line bg-line sm:grid-cols-2 lg:grid-cols-4", className)}>
      {children}
    </dl>
  )
}

/** Statistik-Kachel: Zahl groß, Label in Mono, optionale Notiz. */
export function Stat({ value, label, note }: { value: string; label: string; note?: string }) {
  return (
    <div className="flex flex-col bg-paper py-6 sm:px-6 sm:first:pl-0">
      <dt className="t-label order-2 mt-3 text-ink-3">{label}</dt>
      <dd className="order-1 text-[44px] leading-none font-semibold tracking-[-0.045em] tabular-nums">{value}</dd>
      {note && <dd className="t-data order-3 mt-1.5 text-ink-2">{note}</dd>}
    </div>
  )
}
