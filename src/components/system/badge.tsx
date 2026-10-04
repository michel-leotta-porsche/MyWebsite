import type { ComponentProps } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva("t-label inline-flex items-center gap-2 whitespace-nowrap", {
  variants: {
    variant: {
      /** Haarlinien-Rahmen, für Tags und Kategorien */
      outline: "h-7 border border-line px-2.5 text-ink-2",
      /** Tinte-Fläche, für einen hervorgehobenen Zustand */
      solid: "h-7 bg-ink px-2.5 text-paper",
      /** Nur Text mit Status-Punkt, z. B. "Verfügbar" */
      status: "text-ink-2",
    },
  },
  defaultVariants: { variant: "outline" },
})

export function Badge({
  className,
  variant,
  children,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {variant === "status" && <StatusDot />}
      {children}
    </span>
  )
}

/** Runder Bernstein-Punkt. Die einzige runde Form im System. */
export function StatusDot({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("size-2 flex-none rounded-full bg-signal", className)} />
}
