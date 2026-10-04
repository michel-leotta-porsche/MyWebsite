import Link from "next/link"
import { ViewTransition } from "react"
import { HoverBar } from "@/components/system/card"
import { Arrow } from "@/components/system/text-link"
import { href, type Locale } from "@/i18n/config"
import { getDictionary } from "@/i18n/dictionaries"
import { formatDate, topics, type Article } from "@/content/wiki"

/**
 * Artikel-Index im Stil der Projekt-Zeilen: Datum · Titel und Lede · Format und Thema.
 * Hover: Bernstein-Balken links, Titel rückt 6px. Der Titel morpht beim Öffnen in die Überschrift.
 */
export function ArticleList({ articles, lang }: { articles: Article[]; lang: Locale }) {
  const t = getDictionary(lang)
  return (
    <ul className="border-t border-ink">
      {articles.map((a) => (
        <li key={a.slug}>
          <Link href={href(lang, "wiki", a.slug)} className="group/row relative grid-12 gap-y-3 border-b border-line py-7">
            <HoverBar />
            <span className="t-data col-span-full text-ink-3 md:col-span-2 md:pl-3.5 md:leading-8">
              {formatDate(a.meta.updated, lang)}
            </span>
            <div className="col-span-full md:col-span-7">
              <h3 className="t-h3 mb-2.5 transition-transform duration-500 ease-out-expo group-hover/row:translate-x-1.5">
                <ViewTransition name={`title-${a.slug}`} share="morph" default="none">
                  <span>{a.meta.title}</span>
                </ViewTransition>
                <Arrow className="ml-2" />
              </h3>
              <p className="t-small max-w-[56ch] text-ink-2">{a.meta.lede}</p>
            </div>
            <div className="t-data col-span-full flex flex-wrap gap-x-4 gap-y-1 text-ink-2 md:col-span-3 md:flex-col">
              <span>{t.formats[a.meta.format]}</span>
              <span>{topics[a.meta.topic][lang]}</span>
              <span>
                {a.meta.readingTime} {t.article.minutes}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
