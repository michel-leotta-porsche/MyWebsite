import Link from "next/link"
import { NavLink } from "./text-link"
import { LangToggle, ThemeToggle } from "./toggles"

export type NavItem = { href: string; label: string; current?: boolean }

export const defaultNav: NavItem[] = [
  { href: "/de/wissen", label: "Wissen" },
  { href: "/de/ueber-mich", label: "Über mich" },
]

type HeaderLabels = { scheme: string; light: string; dark: string; lang: string }

/**
 * Kopf: Name klein links, Navigation, Sprach- und Farbschalter.
 * Darunter die Laufline: 1px in Linienfarbe, darauf eine Tinte-Linie, die mit --run (0–1) wächst.
 * Die Ablauf-Signatur (ProcessRun) oder eine Scroll-Geschichte setzt --run auf [data-runline]. Ohne sie steht die Linie voll.
 */
export function SiteHeader({
  nav = defaultNav,
  tagline = "Wissen",
  home = "/de",
  labels,
}: {
  nav?: NavItem[]
  tagline?: string
  home?: string
  labels?: HeaderLabels
}) {
  return (
    <header className="sticky top-0 z-20 bg-paper/88 backdrop-blur-sm [view-transition-name:site-header]">
      <div className="flex h-16 items-center gap-8 px-gutter">
        <Link href={home} className="text-[17px] font-semibold tracking-[-0.02em] whitespace-nowrap">
          Michel Leotta <span className="font-normal text-ink-3">· {tagline}</span>
        </Link>
        <nav aria-label="Hauptnavigation" className="ml-auto hidden gap-7 min-[641px]:flex">
          {nav.map((n) => (
            <NavLink key={n.href} href={n.href} aria-current={n.current ? "page" : undefined}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex gap-3 min-[641px]:ml-0">
          <LangToggle label={labels?.lang} />
          <ThemeToggle labels={labels} />
        </div>
      </div>
      <div aria-hidden="true" className="relative h-px bg-line">
        <i data-runline className="absolute inset-0 origin-left scale-x-(--run,1) bg-ink" />
      </div>
    </header>
  )
}
