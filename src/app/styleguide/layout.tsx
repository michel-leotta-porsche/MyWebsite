import type { Metadata } from "next"
import { mono, sans, themeScript } from "@/lib/fonts"
import "../globals.css"

export const metadata: Metadata = {
  title: { default: "Styleguide", template: "%s · Michel Leotta" },
}

/* Eigenes Root-Layout: Der Styleguide liegt außerhalb der Sprachpfade und bleibt Deutsch. */
export default function StyleguideLayout({ children }: LayoutProps<"/styleguide">) {
  return (
    <html lang="de" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  )
}
