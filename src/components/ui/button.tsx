import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/*
 * Systemplan-Button. Eckig, ohne Schatten.
 * primary: Tinte-Fläche, Bernstein-Quadrat als Marker (dreht sich beim Hover).
 * secondary: 1px-Rahmen in Tinte.
 * ghost: nur Text, Unterstrich wächst von links.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-3 font-medium whitespace-nowrap select-none outline-none transition-colors duration-160 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-ink text-paper hover:bg-ink/90",
        secondary: "border border-ink text-ink hover:bg-ink hover:text-paper",
        ghost:
          "relative px-0! text-ink after:absolute after:inset-x-0 after:bottom-2 after:h-px after:origin-right after:scale-x-0 after:bg-ink after:transition-transform after:duration-500 after:ease-out-expo hover:after:origin-left hover:after:scale-x-100",
      },
      size: {
        default: "h-[50px] px-6 text-base",
        sm: "h-10 px-4 text-[15px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

/** Bernstein-Quadrat für den Primär-Button. */
function ButtonMarker({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-2 bg-signal transition-transform duration-500 ease-out-expo group-hover/button:scale-120 group-hover/button:rotate-45",
        className
      )}
    />
  )
}

function Button({
  className,
  variant = "primary",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, ButtonMarker, buttonVariants }
