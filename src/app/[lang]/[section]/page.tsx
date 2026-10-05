import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { AboutPage } from "@/components/pages/about"
import { PrivacyPage } from "@/components/pages/privacy"
import { SectionHead } from "@/components/system/section-head"
import { ArticleList } from "@/components/wiki/article-list"
import { getArticles, topics, type Topic } from "@/content/wiki"
import { hasLocale, href, locales, sectionFromSegment, sections, type Section } from "@/i18n/config"
import { getDictionary } from "@/i18n/dictionaries"

export const dynamicParams = false

export function generateStaticParams() {
  return locales.flatMap((lang) => (Object.keys(sections) as Section[]).map((s) => ({ lang, section: sections[s][lang] })))
}

async function resolve(params: PageProps<"/[lang]/[section]">["params"]) {
  const { lang, section } = await params
  if (!hasLocale(lang)) notFound()
  const key = sectionFromSegment(lang, section)
  if (!key) notFound()
  return { lang, key }
}

export async function generateMetadata({ params }: PageProps<"/[lang]/[section]">): Promise<Metadata> {
  const { lang, key } = await resolve(params)
  const t = getDictionary(lang)
  const title = key === "wiki" ? t.wiki.title : key === "about" ? t.nav.about : t.footer.privacy
  return {
    title,
    robots: key === "privacy" ? { index: false } : undefined,
    alternates: {
      canonical: href(lang, key),
      languages: { ...Object.fromEntries(locales.map((l) => [l, href(l, key)])), "x-default": href("de", key) },
    },
  }
}

export default async function SectionPage({ params }: PageProps<"/[lang]/[section]">) {
  const { lang, key } = await resolve(params)
  if (key === "about") return <AboutPage lang={lang} />
  if (key === "privacy") return <PrivacyPage lang={lang} />

  const t = getDictionary(lang)
  const articles = await getArticles(lang)
  return (
    <div className="px-gutter pt-[clamp(56px,9vw,120px)]">
      <h1 className="t-display max-w-[16ch]">{t.wiki.title}</h1>
      {(Object.keys(topics) as Topic[]).map((k) => {
        const list = articles.filter((a) => a.meta.topic === k)
        return (
          <section key={k} id={k} className="mt-section scroll-mt-24" aria-labelledby={`${k}-h`}>
            <SectionHead label={`${String(list.length).padStart(2, "0")} · ${t.wiki.label}`} title={topics[k][lang]} id={`${k}-h`} />
            {list.length ? <ArticleList articles={list} lang={lang} /> : <p className="border-t border-ink pt-4 text-ink-3">{t.home.empty}</p>}
          </section>
        )
      })}
    </div>
  )
}
