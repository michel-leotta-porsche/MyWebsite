import { ButtonMarker, buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLink } from "./text-link"

export type FooterLabels = {
  question: string
  contact: string
  write: string
  privacy: string
  rss: string
  note: string
}

const defaultLabels: FooterLabels = {
  question: "Fehler gefunden, Frage oder ein Thema, das hier fehlt?",
  contact: "Kontakt",
  write: "E-Mail schreiben",
  privacy: "Datenschutz",
  rss: "RSS",
  note: "© 2026 Michel Leotta",
}

/**
 * Fuß: Rückfrage per E-Mail, Kontakt, Rechtliches. Abschluss mit der riesigen Wortmarke (nur hier).
 * Die Seite ist privat: kein Angebots-Ton, keine Buchung.
 */
export function SiteFooter({
  labels = defaultLabels,
  privacyHref = "/de/datenschutz",
  rssHref = "/de/rss.xml",
}: {
  labels?: FooterLabels
  privacyHref?: string
  rssHref?: string
}) {
  return (
    <footer className="mt-section border-t border-ink px-gutter" id="kontakt">
      <div className="grid-12 gap-y-6 py-7">
        <div className="col-span-full md:col-span-5">
          <p className="mb-4.5 max-w-[22ch] text-[clamp(1.4rem,2.4vw,2rem)] leading-[1.15] font-semibold tracking-[-0.03em]">
            {labels.question}
          </p>
          <a href="mailto:michel.leotta@hotmail.com" className={buttonVariants({ variant: "secondary" })}>
            <ButtonMarker />
            {labels.write}
          </a>
        </div>
        <div className="col-span-full flex flex-col gap-1.5 md:col-span-3 md:col-start-7">
          <span className="t-label text-ink-3">{labels.contact}</span>
          <span>michel.leotta@hotmail.com</span>
          <ArrowLink href="https://www.linkedin.com/in/michel-leotta-b9b00b106/" external className="self-start">
            LinkedIn
          </ArrowLink>
        </div>
        <div className="t-label col-span-full flex flex-col gap-1.5 text-ink-3 md:col-span-3 md:col-start-10 md:text-right">
          <span>{labels.note}</span>
          <Link href={privacyHref} className="inline-flex min-h-6 items-center hover:text-ink md:justify-end">
            {labels.privacy}
          </Link>
          <a href={rssHref} className="inline-flex min-h-6 items-center hover:text-ink md:justify-end">
            {labels.rss}
          </a>
        </div>
      </div>
      <span aria-hidden="true" className="t-wordmark -ml-[0.04em] block overflow-hidden pt-6 pb-[0.02em]">
        MICHEL LEOTTA
      </span>
    </footer>
  )
}
