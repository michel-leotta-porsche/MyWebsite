import Link from "next/link"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

type LinkProps = ComponentProps<typeof Link>

/** Fließtext-Link: Haarlinie darunter, wird beim Hover zu Tinte. */
export function TextLink({ className, ...props }: LinkProps) {
  return (
    <Link
      className={cn(
        "border-b border-line pb-0.5 font-medium transition-colors duration-160 hover:border-ink",
        className
      )}
      {...props}
    />
  )
}

/** Navigations-Link: Unterstrich wächst von links, verschwindet nach rechts. */
export function NavLink({ className, ...props }: LinkProps) {
  return (
    <Link
      className={cn(
        "relative py-1 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-right after:scale-x-0 after:bg-ink after:transition-transform after:duration-500 after:ease-out-expo hover:after:origin-left hover:after:scale-x-100 aria-[current=page]:after:scale-x-100",
        className
      )}
      {...props}
    />
  )
}

/** Pfeil-Link: Pfeil rückt beim Hover 4px und wird Bernstein. */
export function ArrowLink({
  className,
  children,
  external,
  ...props
}: LinkProps & { external?: boolean }) {
  return (
    <Link
      className={cn("group/arrow inline-flex items-baseline gap-2 font-medium", className)}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      {...props}
    >
      <span>{children}</span>
      <Arrow external={external} />
    </Link>
  )
}

/** Pfeil für Links und Index-Zeilen. Reagiert auf group/arrow oder group/row. */
export function Arrow({ external, className }: { external?: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block text-ink-3 transition-[translate,color] duration-500 ease-out-expo group-hover/arrow:translate-x-1 group-hover/arrow:text-signal-ink group-hover/row:translate-x-1.5 group-hover/row:text-signal-ink",
        className
      )}
    >
      {external ? "↗" : "→"}
    </span>
  )
}
