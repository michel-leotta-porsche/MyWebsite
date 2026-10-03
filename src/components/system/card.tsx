import Link from "next/link"
import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Arrow } from "./text-link"

/*
 * Karten im Systemplan sind keine Kästen: Inhalt zwischen Haarlinien.
 * Hover-Muster: Bernstein-Balken 3px links, Titel rückt 6px, Pfeil rückt mit.
 */

/** Rahmen-Liste für IndexRow: Linie oben in Tinte. */
export function IndexList({ className, ...props }: ComponentProps<"ul">) {
  return <ul className={cn("border-t border-ink", className)} {...props} />
}

type IndexRowProps = {
  href: string
  year: string
  title: string
  description: string
  meta: string[]
  client?: string
}

/** Projekt-Zeile im Index: Jahr · Titel+Ergebnis · Rolle/Stack · Kunde. */
export function IndexRow({ href, year, title, description, meta, client }: IndexRowProps) {
  return (
    <li>
      <Link href={href} className="group/row relative grid-12 gap-y-3.5 border-b border-line py-7">
        <HoverBar />
        <span className="t-data col-span-full text-ink-3 md:col-span-1 md:pl-3.5 md:leading-8">{year}</span>
        <div className="col-span-full md:col-span-7">
          <h3 className="t-h3 mb-2.5 transition-transform duration-500 ease-out-expo group-hover/row:translate-x-1.5">
            {title}
            <Arrow className="ml-2" />
          </h3>
          <p className="t-small max-w-[56ch] text-ink-2">{description}</p>
        </div>
        <div className="t-data col-span-8 flex flex-col gap-1 text-ink-2 md:col-span-3">
          {meta.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
        {client && (
          <span className="col-span-4 self-end text-right font-semibold tracking-[-0.01em] md:col-span-1 md:self-start">
            {client}
          </span>
        )}
      </Link>
    </li>
  )
}

/** Bernstein-Balken links, wächst beim Hover von unten. */
export function HoverBar({ group = "row" }: { group?: "row" | "card" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute top-0 -bottom-px left-0 w-[3px] origin-bottom scale-y-0 bg-signal transition-transform duration-500 ease-out-expo",
        group === "row" ? "group-hover/row:scale-y-100" : "group-hover/card:scale-y-100"
      )}
    />
  )
}

type CardProps = {
  href?: string
  label?: string
  title: string
  children?: ReactNode
  footer?: ReactNode
  className?: string
}

/** Karte: Linie oben in Tinte, Label, Titel, Text, Fuß in Mono. Als Link mit Hover-Muster. */
export function Card({ href, label, title, children, footer, className }: CardProps) {
  const body = (
    <>
      {href && <HoverBar group="card" />}
      {label && <span className="t-label text-ink-3">{label}</span>}
      <h3
        className={cn(
          "t-h4 mt-4 transition-transform duration-500 ease-out-expo",
          href && "group-hover/card:translate-x-1.5"
        )}
      >
        {title}
        {href && <Arrow className="ml-2 group-hover/card:translate-x-1 group-hover/card:text-signal-ink" />}
      </h3>
      {children && <div className="t-small mt-2.5 text-ink-2">{children}</div>}
      {footer && <div className="t-label mt-5 flex gap-5 text-ink-3">{footer}</div>}
    </>
  )
  const cls = cn("group/card relative block border-t border-ink pt-4 pb-6", href && "pl-4", className)
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}
