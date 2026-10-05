/*
 * Sprachen und sprechende Pfade. Jeder Bereich hat pro Sprache ein eigenes Segment
 * (/de/wissen, /en/knowledge). Artikel-Slugs sind in beiden Sprachen gleich.
 */
export const locales = ["de", "en"] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = "de"

export const hasLocale = (value: string): value is Locale => (locales as readonly string[]).includes(value)

export const sections = {
  wiki: { de: "wissen", en: "knowledge" },
  about: { de: "ueber-mich", en: "about" },
  privacy: { de: "datenschutz", en: "privacy" },
} as const satisfies Record<string, Record<Locale, string>>

export type Section = keyof typeof sections

/** Segment in der URL → Bereich, z. B. ("en", "knowledge") → "wiki". */
export function sectionFromSegment(lang: Locale, segment: string): Section | undefined {
  return (Object.keys(sections) as Section[]).find((s) => sections[s][lang] === segment)
}

/** Pfad zu Start, Bereich oder Artikel. */
export function href(lang: Locale, section?: Section, slug?: string) {
  if (!section) return `/${lang}`
  return `/${lang}/${sections[section][lang]}${slug ? `/${slug}` : ""}`
}

/** Derselbe Inhalt in der anderen Sprache. Unbekannte Pfade (z. B. /styleguide) führen auf die Startseite. */
export function translatePath(pathname: string, to: Locale) {
  const [, lang, segment, ...rest] = pathname.split("/")
  if (!lang || !hasLocale(lang)) return href(to)
  if (!segment) return href(to)
  const section = sectionFromSegment(lang, segment)
  if (!section) return href(to)
  return href(to, section, rest.join("/") || undefined)
}

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://michelleotta.de"
