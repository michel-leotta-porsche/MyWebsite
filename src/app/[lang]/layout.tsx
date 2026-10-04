import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ViewTransition } from "react"
import { SiteFooter } from "@/components/system/site-footer"
import { SiteHeader } from "@/components/system/site-header"
import { SmoothScroll } from "@/components/system/smooth-scroll"
import { hasLocale, href, locales, siteUrl } from "@/i18n/config"
import { getDictionary } from "@/i18n/dictionaries"
import { mono, sans, themeScript } from "@/lib/fonts"
import "../globals.css"

export const dynamicParams = false

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }))
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params
  if (!hasLocale(lang)) return {}
  const t = getDictionary(lang)
  return {
    metadataBase: new URL(siteUrl),
    title: { default: `Michel Leotta · ${t.siteTagline}`, template: "%s · Michel Leotta" },
    description: t.description,
    authors: [{ name: "Michel Leotta" }],
    openGraph: { siteName: "Michel Leotta", locale: lang === "de" ? "de_DE" : "en_GB", type: "website" },
    alternates: {
      types: { "application/rss+xml": [{ url: `/${lang}/rss.xml`, title: `Michel Leotta · ${t.siteTagline}` }] },
    },
  }
}

/** Root-Layout pro Sprache: <html lang>, Kopf, Fuß, weiches Scrollen, Seitenwechsel als View Transition. */
export default async function LangLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()
  const t = getDictionary(lang)

  return (
    <html lang={lang} className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <a
          href="#inhalt"
          className="t-label sr-only z-30 bg-paper px-3 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {t.skip}
        </a>
        <SmoothScroll />
        <SiteHeader
          home={href(lang)}
          tagline={t.siteTagline}
          labels={{ ...t.toggles }}
          nav={[
            { href: href(lang, "wiki"), label: t.nav.wiki },
            { href: href(lang, "about"), label: t.nav.about },
          ]}
        />
        <ViewTransition>
          <main id="inhalt">{children}</main>
        </ViewTransition>
        <SiteFooter labels={t.footer} privacyHref={href(lang, "privacy")} rssHref={`/${lang}/rss.xml`} />
      </body>
    </html>
  )
}
