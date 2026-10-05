import { notFound } from "next/navigation"
import { SectionHead } from "@/components/system/section-head"
import { ArrowLink } from "@/components/system/text-link"
import { ArticleList } from "@/components/wiki/article-list"
import { getArticles, topics, type Topic } from "@/content/wiki"
import { hasLocale, href, locales } from "@/i18n/config"
import { getDictionary } from "@/i18n/dictionaries"

export async function generateMetadata({ params }: PageProps<"/[lang]">) {
  const { lang } = await params
  if (!hasLocale(lang)) return {}
  return {
    alternates: {
      canonical: href(lang),
      languages: { ...Object.fromEntries(locales.map((l) => [l, href(l)])), "x-default": href("de") },
    },
  }
}

/** Start = das Wiki: ein Satz, wer hier schreibt, dann neueste Artikel und Themen. */
export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()
  const t = getDictionary(lang)
  const articles = await getArticles(lang)
  const used = (Object.keys(topics) as Topic[]).map((k) => ({ k, n: articles.filter((a) => a.meta.topic === k).length }))

  return (
    <div className="px-gutter">
      <section className="grid-12 pt-[clamp(56px,9vw,120px)]">
        <span className="t-label col-span-full text-ink-3 md:col-span-3 md:pt-4">{t.home.label}</span>
        <div className="col-span-full md:col-span-9">
          <h1 className="t-display max-w-[18ch]">{t.home.title}</h1>
          <p className="t-lede mt-7 max-w-[56ch] text-ink-2">{t.home.lede}</p>
        </div>
      </section>

      <section className="mt-section" aria-labelledby="neu-h">
        <SectionHead label={t.home.latest} title={t.home.latestTitle} id="neu-h" />
        {articles.length ? <ArticleList articles={articles.slice(0, 6)} lang={lang} /> : <p>{t.home.empty}</p>}
        <p className="mt-6">
          <ArrowLink href={href(lang, "wiki")}>{t.home.all}</ArrowLink>
        </p>
      </section>

      <section className="mt-section" aria-labelledby="themen-h">
        <SectionHead label={t.home.topics} title={t.wiki.title} id="themen-h" />
        <ul className="grid gap-px border-t border-ink bg-line sm:grid-cols-3">
          {used.map(({ k, n }) => (
            <li key={k} className="bg-paper">
              <a href={`${href(lang, "wiki")}#${k}`} className="group/card block pt-4 pr-5 pb-6">
                <span className="t-data text-ink-3">{String(n).padStart(2, "0")}</span>
                <span className="t-h4 mt-3 block decoration-1 underline-offset-[5px] group-hover/card:underline">
                  {topics[k][lang]}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
