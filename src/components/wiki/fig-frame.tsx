import type { ReactNode, Ref } from "react"
import { cn } from "@/lib/utils"

type FigFrameProps = {
  title: string
  label: string
  children: ReactNode
  caption?: ReactNode
  className?: string
  ref?: Ref<HTMLElement>
  /** Knopf „Nochmal abspielen“ unter der Grafik */
  replay?: { label: string; onClick: () => void }
}

/** Rahmen für Grafiken im Textfluss: Haarlinie oben in Tinte, Kopf mit Titel und Label, Linie unten. */
export function FigFrame({ title, label, children, caption, className, ref, replay }: FigFrameProps) {
  return (
    <figure ref={ref} className={cn("my-[1.6em] border-t border-b border-t-ink border-b-line", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5 border-b border-line py-3">
        <h3 className="text-[1.05rem] font-semibold tracking-[-0.015em]">{title}</h3>
        <span className="t-label text-ink-3">{label}</span>
      </div>
      {children}
      {caption && <figcaption className="grid gap-1 pb-3.5 text-[15.5px] text-ink-2">{caption}</figcaption>}
      {replay && (
        <button
          type="button"
          onClick={replay.onClick}
          className="mb-3 min-h-6 font-mono text-[12px] text-ink-3 underline-offset-4 transition-colors duration-160 hover:text-ink hover:underline"
        >
          <span aria-hidden="true">↻</span> {replay.label}
        </button>
      )}
    </figure>
  )
}

type ChoiceProps = {
  options: string[]
  value: number
  onChange: (i: number) => void
  ariaLabel: string
  className?: string
}

/** Schalter mit mehreren Stellungen. Die aktive Stellung trägt den Bernstein-Balken unten. */
export function Choice({ options, value, onChange, ariaLabel, className }: ChoiceProps) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn("flex flex-wrap gap-px bg-line p-px", className)}>
      {options.map((o, i) => (
        <button
          key={o}
          type="button"
          aria-pressed={i === value}
          onClick={() => onChange(i)}
          className={cn(
            "relative min-h-9 bg-paper px-3 font-mono text-[13px] text-ink-2 transition-colors duration-160",
            "hover:text-ink aria-pressed:bg-paper-2 aria-pressed:text-ink",
            "after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:origin-left after:scale-x-0 after:bg-signal after:transition-transform after:duration-500 after:ease-out-expo aria-pressed:after:scale-x-100"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  )
}
