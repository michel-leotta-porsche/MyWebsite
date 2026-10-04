import { getArticles } from "@/content/wiki"
import { hasLocale, href, locales, siteUrl } from "@/i18n/config"
import { getDictionary } from "@/i18n/dictionaries"

export const dynamic = "force-static"

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }))
}

const x = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string)

/** RSS-Feed je Sprache, beim Build erzeugt. */
export async function GET(_req: Request, { params }: RouteContext<"/[lang]/rss.xml">) {
  const { lang } = await params
  if (!hasLocale(lang)) return new Response("Not found", { status: 404 })
  const t = getDictionary(lang)
  const articles = await getArticles(lang)
  const items = articles
    .map((a) => {
      const url = `${siteUrl}${href(lang, "wiki", a.slug)}`
      return `<item><title>${x(a.meta.title)}</title><link>${url}</link><guid>${url}</guid><pubDate>${new Date(a.meta.date).toUTCString()}</pubDate><description>${x(a.meta.lede)}</description></item>`
    })
    .join("")
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Michel Leotta · ${x(t.siteTagline)}</title><link>${siteUrl}${href(lang)}</link><description>${x(t.description)}</description><language>${lang}</language>${items}</channel></rss>`
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } })
}
