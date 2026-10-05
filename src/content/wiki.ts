import type { ComponentType } from "react"
import type { Locale } from "@/i18n/config"

/*
 * Wiki-Register. Jeder Artikel liegt als content/wiki/<slug>/de.mdx und en.mdx im Repo
 * und exportiert `meta` (Felder siehe ArticleMeta) und `toc`.
 * Neuer Artikel: Ordner anlegen und den Slug hier eintragen.
 */
export const slugs = ["git-commits"] as const
export type Slug = (typeof slugs)[number]

export const topics = {
  claude: { de: "Arbeiten mit Claude", en: "Working with Claude" },
  ki: { de: "KI-Systeme", en: "AI systems" },
  praxis: { de: "Entwicklungspraxis", en: "Engineering practice" },
} as const satisfies Record<string, Record<Locale, string>>
export type Topic = keyof typeof topics

export type ArticleMeta = {
  title: string
  lede: string
  format: "leitfaden" | "notiz"
  topic: Topic
  tags: string[]
  /** ISO-Datum der Veröffentlichung */
  date: string
  /** ISO-Datum, an dem Code und Quellen zuletzt geprüft wurden */
  updated: string
  readingTime: number
  sources: "tested" | "reading"
  /** Womit getestet, z. B. "git 2.43, POSIX-sh" */
  testedWith?: string
  /** Für wen der Artikel ist */
  audience?: string
}

export type TocItem = { id: string; label: string }

type ArticleModule = { default: ComponentType; meta: ArticleMeta; toc?: TocItem[] }

export type Article = { slug: Slug; lang: Locale; meta: ArticleMeta; toc: TocItem[]; Body: ComponentType }

export const isSlug = (value: string): value is Slug => (slugs as readonly string[]).includes(value)

export async function getArticle(slug: Slug, lang: Locale): Promise<Article> {
  const mod = (await import(`../../content/wiki/${slug}/${lang}.mdx`)) as unknown as ArticleModule
  return { slug, lang, meta: mod.meta, toc: mod.toc ?? [], Body: mod.default }
}

/** Alle Artikel einer Sprache, neueste zuerst. */
export async function getArticles(lang: Locale) {
  const all = await Promise.all(slugs.map((s) => getArticle(s, lang)))
  return all.sort((a, b) => b.meta.date.localeCompare(a.meta.date))
}

export function formatDate(iso: string, lang: Locale) {
  return new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(iso)
  )
}
