import { SiteFooter } from "@/components/system/site-footer"
import { SiteHeader } from "@/components/system/site-header"
import { ArrowLink } from "@/components/system/text-link"

// Platzhalter bis Phase 3. Die Startseite wird aus den Bausteinen in /styleguide gebaut.
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="px-gutter pt-[clamp(56px,9vw,120px)]">
        <h1 className="t-display max-w-[16ch]">Hier entsteht die Website von Michel Leotta.</h1>
        <p className="mt-8">
          <ArrowLink href="/styleguide">Zum Styleguide</ArrowLink>
        </p>
      </main>
      <SiteFooter />
    </>
  )
}
