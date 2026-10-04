import type { MetadataRoute } from "next"
import { getArticles } from "@/content/wiki"
import { href, locales, siteUrl, type Section } from "@/i18n/config"

const alt = (fn: (l: (typeof locales)[number]) => string) => ({
  languages: Object.fromEntries(locales.map((l) => [l, `${siteUrl}${fn(l)}`])),
})

/** Sitemap mit hreflang-Alternativen. Datenschutz und Styleguide fehlen absichtlich. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: (Section | undefined)[] = [undefined, "wiki", "about"]
  const entries: MetadataRoute.Sitemap = locales.flatMap((lang) =>
    pages.map((s) => ({ url: `${siteUrl}${href(lang, s)}`, alternates: alt((l) => href(l, s)) }))
  )
  for (const lang of locales) {
    for (const a of await getArticles(lang)) {
      entries.push({
        url: `${siteUrl}${href(lang, "wiki", a.slug)}`,
        lastModified: a.meta.updated,
        alternates: alt((l) => href(l, "wiki", a.slug)),
      })
    }
  }
  return entries
}
