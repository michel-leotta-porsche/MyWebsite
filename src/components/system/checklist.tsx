import { cn } from "@/lib/utils"

export type CheckState = "done" | "active" | "open"

export type CheckItem = { label: string; detail?: string; state: CheckState }

const stateText: Record<CheckState, string> = { done: "OK", active: "…", open: "—" }
const stateLabel: Record<CheckState, string> = { done: "erledigt", active: "in Arbeit", open: "offen" }

/** Knoten wie in der Ablauf-Signatur: Quadrat, gefüllt = erledigt, Bernstein = aktiv. */
export function Node({ state }: { state: CheckState }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative z-1 size-[13px] border border-ink bg-paper transition-colors duration-500 ease-out-expo",
        state === "done" && "bg-ink",
        state === "active" && "border-signal bg-signal"
      )}
    />
  )
}

/** Checkliste mit Knoten und Status rechts. Status ist für Screenreader ausgeschrieben. */
export function Checklist({ items, className }: { items: CheckItem[]; className?: string }) {
  return (
    <ul className={cn("border-t border-ink", className)}>
      {items.map((it) => (
        <li key={it.label} className="grid grid-cols-[13px_1fr_auto] items-center gap-4 border-b border-line py-3.5">
          <Node state={it.state} />
          <span className="text-[15px] leading-[1.3] font-medium tracking-[-0.01em]">
            {it.label}
            {it.detail && <small className="t-data mt-0.5 block text-xs text-ink-3">{it.detail}</small>}
          </span>
          <span
            className={cn(
              "t-data text-xs font-medium",
              it.state === "done" ? "text-ink" : it.state === "active" ? "text-signal-ink" : "text-ink-3"
            )}
          >
            <span aria-hidden="true">{stateText[it.state]}</span>
            <span className="sr-only">{stateLabel[it.state]}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
