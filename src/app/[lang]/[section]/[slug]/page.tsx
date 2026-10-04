import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ViewTransition } from "react"
import { ArrowLink } from "@/components/system/text-link"
import { ReadingProgress } from "@/components/wiki/reading-progress"
import { formatDate, getArticle, isSlug, slugs, topics } from "@/content/wiki"
import { hasLocale, href, locales, sectionFromSegment, sections, siteUrl } from "@/i18n/config"
import { getDictionary } from "@/i18n/dictionaries"

export const dynamicParams = false

export function generateStaticParams() {
  return locales.flatMap((lang) => slugs.map((slug) => ({ lang, section: sections.wiki[lang], slug })))
}

async function load(params: PageProps<"/[lang]/[section]/[slug]">["params"]) {
  const { lang, section, slug } = await params
  if (!hasLocale(lang) || sectionFromSegment(lang, section) !== "wiki" || !isSlug(slug)) notFound()
  return getArticle(slug, lang)
}

export async function generateMetadata({ params }: PageProps<"/[lang]/[section]/[slug]">): Promise<Metadata> {
  const a = await load(params)
  return {
    title: a.meta.title,
    description: a.meta.lede,
    keywords: a.meta.tags,
    alternates: {
      canonical: href(a.lang, "wiki", a.slug),
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, href(l, "wiki", a.slug)])),
        "x-default": href("de", "wiki", a.slug),
      },
    },
    openGraph: {
      type: "article",
      title: a.meta.title,
      description: a.meta.lede,
      publishedTime: a.meta.date,
      modifiedTime: a.meta.updated,
      authors: ["Michel Leotta"],
      tags: a.meta.tags,
    },
  }
}

/** Artikelseite: Kopf, Inhaltsverzeichnis links (ab 1024px), Text ab Spalte 4, Scroll-Geschichten über die volle Breite. */
export default async function ArticlePage({ params }: PageProps<"/[lang]/[section]/[slug]">) {
  const a = await load(params)
  const t = getDictionary(a.lang)
  const { meta, Body } = a
  const url = `${siteUrl}${href(a.lang, "wiki", a.slug)}`
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        headline: meta.title,
        description: meta.lede,
        inLanguage: a.lang,
        datePublished: meta.date,
        dateModified: meta.updated,
        keywords: meta.tags.join(", "),
        author: { "@type": "Person", name: "Michel Leotta", url: `${siteUrl}${href(a.lang, "about")}` },
        mainEntityOfPage: url,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: t.nav.wiki, item: `${siteUrl}${href(a.lang, "wiki")}` },
          { "@type": "ListItem", position: 2, name: meta.title, item: url },
        ],
      },
    ],
  }
  const facts: [string, string][] = [
    [t.article.checked, formatDate(meta.updated, a.lang)],
    [t.article.reading, `${meta.readingTime} ${t.article.minutes}`],
    [t.article.topic, topics[meta.topic][a.lang]],
    [meta.sources === "tested" ? t.article.tested : t.article.reading_only, meta.testedWith ?? "–"],
  ]

  return (
    <article id="artikel" className="px-gutter">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <ReadingProgress target="artikel" />
      <header className="grid-12 pt-[clamp(40px,7vw,96px)]">
        <nav aria-label="Breadcrumb" className="t-label col-span-full flex gap-2 text-ink-3">
          <Link href={href(a.lang, "wiki")} className="hover:text-ink">
            {t.nav.wiki}
          </Link>
          <span aria-hidden="true">/</span>
          <span>{t.formats[meta.format]}</span>
        </nav>
        <h1 className="t-display col-span-full mt-6 max-w-[20ch] lg:col-span-10">
          <ViewTransition name={`title-${a.slug}`} share="morph" default="none">
            <span>{meta.title}</span>
          </ViewTransition>
        </h1>
        <p className="t-lede col-span-full mt-6 max-w-[60ch] text-ink-2 lg:col-span-8 lg:col-start-4">{meta.lede}</p>
        <dl className="col-span-full mt-10 grid gap-px border-t border-ink bg-line sm:grid-cols-2 lg:col-span-9 lg:col-start-4 lg:grid-cols-4">
          {facts.map(([k, v]) => (
            <div key={k} className="bg-paper pt-3 pr-4 pb-4">
              <dt className="t-label text-ink-3">{k}</dt>
              <dd className="mt-1.5 text-[15px] font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="wiki-body mt-12 grid-12 [container-type:inline-size]">
        {a.toc.length > 0 && (
          <aside aria-label={t.article.toc} className="hidden lg:col-span-3 lg:block">
            <nav className="sticky top-24">
              <span className="t-label text-ink-3">{t.article.toc}</span>
              <ol className="mt-3 border-t border-line">
                {a.toc.map((item, i) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="group/row relative grid grid-cols-[2.2em_1fr] border-b border-line py-2 text-[14px] text-ink-2 transition-colors duration-160 hover:text-ink"
                    >
                      <span className="t-data text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                      <span className="transition-transform duration-500 ease-out-expo group-hover/row:translate-x-1.5">
                        {item.label}
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>
        )}
        <div className="wiki-prose col-span-full min-w-0 lg:col-span-9 lg:col-start-4">
          <Body />
          <aside className="mt-section border-t border-ink pt-4">
            <span className="t-label text-ink-3">Michel Leotta</span>
            <p className="mt-2 max-w-[60ch] text-ink-2">
              {t.article.feedback}{" "}
              <ArrowLink href={`mailto:michel.leotta@hotmail.com?subject=${encodeURIComponent(meta.title)}`}>
                {t.article.feedbackLink}
              </ArrowLink>
            </p>
            <p className="mt-6">
              <ArrowLink href={href(a.lang, "wiki")}>{t.article.back}</ArrowLink>
            </p>
          </aside>
        </div>
      </div>
    </article>
  )
}
