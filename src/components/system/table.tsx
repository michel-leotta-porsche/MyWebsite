import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

/** Tabelle: Haarlinien, Kopf in Mono-Labels, Zahlen tabellarisch. Scrollt auf schmalen Screens. */
export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="my-8 overflow-x-auto" tabIndex={0} role="region" aria-label={props["aria-label"] ?? "Tabelle"}>
      <table className={cn("w-full border-collapse border-t border-ink text-left t-small", className)} {...props} />
    </div>
  )
}
export function THead(props: ComponentProps<"thead">) {
  return <thead {...props} />
}
export function TBody(props: ComponentProps<"tbody">) {
  return <tbody {...props} />
}
export function TR({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn("border-b border-line", className)} {...props} />
}
export function TH({ className, ...props }: ComponentProps<"th">) {
  return <th className={cn("t-label py-3 pr-6 align-bottom last:pr-0 font-medium text-ink-3", className)} {...props} />
}
export function TD({ className, numeric, ...props }: ComponentProps<"td"> & { numeric?: boolean }) {
  return (
    <td
      className={cn("py-3 pr-6 align-top last:pr-0", numeric && "t-data text-right text-[15px]", className)}
      {...props}
    />
  )
}
