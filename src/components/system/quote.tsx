import { cn } from "@/lib/utils"

type QuoteProps = {
  children: React.ReactNode
  author?: string
  role?: string
  className?: string
}

/** Zitat: groß gesetzt, Linie oben in Tinte, Quelle in Mono. */
export function Quote({ children, author, role, className }: QuoteProps) {
  return (
    <figure className={cn("my-10 border-t border-ink pt-6", className)}>
      <blockquote className="t-h3 max-w-[30ch] font-medium">
        <span aria-hidden="true" className="text-ink-3">
          „
        </span>
        {children}
        <span aria-hidden="true" className="text-ink-3">
          “
        </span>
      </blockquote>
      {author && (
        <figcaption className="t-label mt-6 flex flex-wrap gap-x-4 gap-y-1">
          <span>{author}</span>
          {role && <span className="text-ink-3">{role}</span>}
        </figcaption>
      )}
    </figure>
  )
}
