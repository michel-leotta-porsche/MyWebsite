import { ButtonMarker, buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLink } from "./text-link"

/** Fuß: Aufruf, Kontakt, Rechtliches. Abschluss mit der riesigen Wortmarke (nur hier). */
export function SiteFooter({ note = "© 2026 Michel Leotta" }: { note?: string }) {
  return (
    <footer className="mt-section border-t border-ink px-gutter" id="kontakt">
      <div className="grid-12 gap-y-6 py-7">
        <div className="col-span-full md:col-span-5">
          <p className="mb-4.5 max-w-[20ch] text-[clamp(1.4rem,2.4vw,2rem)] leading-[1.15] font-semibold tracking-[-0.03em]">
            Du hast ein KI-Vorhaben, das im Alltag funktionieren soll?
          </p>
          <Link href="mailto:michel.leotta@hotmail.com" className={buttonVariants()}>
            <ButtonMarker />
            Projekt besprechen
          </Link>
        </div>
        <div className="col-span-full flex flex-col gap-1.5 md:col-span-3 md:col-start-7">
          <span className="t-label text-ink-3">Kontakt</span>
          <span>michel.leotta@hotmail.com</span>
          <ArrowLink href="https://www.linkedin.com/in/michel-leotta-b9b00b106/" external className="self-start">
            LinkedIn
          </ArrowLink>
        </div>
        <div className="t-label col-span-full flex flex-col gap-1.5 text-ink-3 md:col-span-3 md:col-start-10 md:text-right">
          <span>{note}</span>
          <Link href="/impressum" prefetch={false} className="hover:text-ink">
            Impressum
          </Link>
        </div>
      </div>
      <span aria-hidden="true" className="t-wordmark -ml-[0.04em] block overflow-hidden pt-6 pb-[0.02em]">
        MICHEL LEOTTA
      </span>
    </footer>
  )
}
