import { cn } from "@/lib/utils"

/** Sektionskopf: Label links (3 Spalten), Headline rechts (9 Spalten). Auf Mobil gestapelt. */
export function SectionHead({
  label,
  title,
  id,
  className,
}: {
  label: string
  title: string
  id?: string
  className?: string
}) {
  return (
    <div className={cn("grid-12 mb-9 items-end", className)}>
      <span className="t-label col-span-full pb-2.5 text-ink-3 md:col-span-3">{label}</span>
      <h2 id={id} className="t-h2 col-span-full mt-2.5 md:col-span-9 md:mt-0">
        {title}
      </h2>
    </div>
  )
}
