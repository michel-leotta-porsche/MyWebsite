import Link from "next/link"
import { NavLink } from "./text-link"
import { LangToggle, ThemeToggle } from "./toggles"

export type NavItem = { href: string; label: string }

export const defaultNav: NavItem[] = [
  { href: "/#leistungen", label: "Leistungen" },
  { href: "/#projekte", label: "Projekte" },
  { href: "/#ueber-mich", label: "Über mich" },
  { href: "/blog", label: "Blog" },
  { href: "/#kontakt", label: "Kontakt" },
]

/**
 * Kopf: Name klein links, Navigation, Sprach- und Farbschalter.
 * Darunter die Laufline: 1px in Linienfarbe, darauf eine Tinte-Linie, die mit --run (0–1) wächst.
 * Die Ablauf-Signatur (ProcessRun) setzt --run auf <html>. Ohne sie steht die Linie voll.
 */
export function SiteHeader({ nav = defaultNav, tagline = "KI-Produkte" }: { nav?: NavItem[]; tagline?: string }) {
  return (
    <header className="sticky top-0 z-10 bg-paper/88 backdrop-blur-sm">
      <div className="flex h-16 items-center gap-8 px-gutter">
        <Link href="/" className="text-[17px] font-semibold tracking-[-0.02em] whitespace-nowrap">
          Michel Leotta <span className="font-normal text-ink-3">· {tagline}</span>
        </Link>
        <nav aria-label="Hauptnavigation" className="ml-auto hidden gap-7 min-[901px]:flex">
          {nav.map((n) => (
            <NavLink key={n.href} href={n.href}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex gap-3.5 min-[901px]:ml-0">
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>
      <div aria-hidden="true" className="relative h-px bg-line">
        <i className="absolute inset-0 origin-left scale-x-(--run,1) bg-ink" />
      </div>
    </header>
  )
}
