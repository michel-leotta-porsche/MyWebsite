import { NextResponse, type NextRequest } from "next/server"
import { defaultLocale, hasLocale, type Locale } from "@/i18n/config"

/** Bevorzugte Sprache aus Accept-Language: Englisch nur, wenn es vor Deutsch steht. */
function preferredLocale(header: string | null): Locale {
  if (!header) return defaultLocale
  const langs = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=")
      return { lang: tag.slice(0, 2).toLowerCase(), q: q ? Number(q) : 1 }
    })
    .sort((a, b) => b.q - a.q)
  const hit = langs.find((l) => hasLocale(l.lang))
  return hit && hasLocale(hit.lang) ? hit.lang : defaultLocale
}

/** Pfade ohne Sprache (/, /wissen/…) bekommen die bevorzugte Sprache vorangestellt. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const first = pathname.split("/")[1] ?? ""
  if (hasLocale(first)) return
  const url = request.nextUrl.clone()
  url.pathname = `/${preferredLocale(request.headers.get("accept-language"))}${pathname === "/" ? "" : pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  // Nicht für interne Pfade, Dateien mit Endung, den Styleguide und SEO-Dateien
  matcher: ["/((?!_next|styleguide|sitemap.xml|robots.txt|.*\\..*).*)"],
}
