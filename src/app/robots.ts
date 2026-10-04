import type { MetadataRoute } from "next"
import { siteUrl } from "@/i18n/config"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/styleguide" },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
