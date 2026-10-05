import type { Metadata } from "next"
import Link from "next/link"
import type { ReactNode } from "react"
import { Button, ButtonMarker, buttonVariants } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge, StatusDot } from "@/components/system/badge"
import { Callout } from "@/components/system/callout"
import { Card, IndexList, IndexRow } from "@/components/system/card"
import { Checklist } from "@/components/system/checklist"
import { CodeBlock } from "@/components/system/code-block"
import { Quote } from "@/components/system/quote"
import { SectionHead } from "@/components/system/section-head"
import { SiteFooter } from "@/components/system/site-footer"
import { SiteHeader } from "@/components/system/site-header"
import { Stat, StatGrid } from "@/components/system/stat"
import { Table, TBody, TD, TH, THead, TR } from "@/components/system/table"
import { ArrowLink, NavLink, TextLink } from "@/components/system/text-link"
import { chartTokens, colorTokens, motionTokens, spaceTokens, typeScale } from "@/design/tokens"
import { cn } from "@/lib/utils"
import { Pitfalls, Takeaways } from "@/components/wiki/parts"
import { Quiz } from "@/components/wiki/quiz"
import { ScrollFig } from "@/components/wiki/scroll-fig"
import { StepFigure } from "@/components/wiki/step-figure"
import { TaskChecklist } from "@/components/wiki/task-checklist"
import { DragSnap } from "@/components/wiki/drag-snap"
import { Rearrange } from "@/components/wiki/rearrange"
import { SampleGrid } from "@/components/wiki/sample-grid"
import { ScrambleSwap } from "@/components/wiki/scramble"
import { ZoomFigure } from "@/components/wiki/zoom-figure"
import Beispiel from "./beispiel.mdx"
import { MotionDemo, ProcessRunDemo } from "./demos"

export const metadata: Metadata = {
  title: "Styleguide",
  description: "Tokens und Bausteine des Design-Systems Systemplan.",
  robots: { index: false },
}

const toc = [
  ["farben", "Farben"],
  ["typografie", "Typografie"],
  ["raster", "Raster & Abstände"],
  ["linien", "Linien, Radien, Schatten"],
  ["bewegung", "Bewegung"],
  ["buttons", "Buttons & Links"],
  ["badges", "Badges"],
  ["karten", "Karten & Index"],
  ["code", "Code-Block"],
  ["callout", "Callout"],
  ["tabs", "Tabs"],
  ["tabelle", "Tabelle"],
  ["zitat", "Zitat"],
  ["statistik", "Statistik"],
  ["checkliste", "Checkliste & Ablauf"],
  ["navigation", "Navigation & Footer"],
  ["mdx", "MDX"],
  ["wiki", "Wiki-Bausteine"],
] as const

function Section({ id, label, title, children }: { id: string; label: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-section scroll-mt-24 first:mt-0">
      <SectionHead label={label} title={title} id={`${id}-h`} />
      {children}
    </section>
  )
}

/** Kleines Beschriftungsfeld unter einem Beispiel. */
function Spec({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("t-data mt-3 text-ink-3", className)}>{children}</p>
}

function Swatches({ scheme }: { scheme: "light" | "dark" }) {
  return (
    <div className={cn(scheme === "dark" && "dark", "bg-paper p-4 text-ink sm:p-6")}>
      <p className="t-label mb-4 text-ink-3">{scheme === "light" ? "Hell · Standard" : "Dunkel · Variante"}</p>
      <ul className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
        {colorTokens.map((c) => (
          <li key={c.token} className="bg-paper">
            <span
              aria-hidden="true"
              className="block h-14 border-b border-line"
              style={{ background: `var(--${c.token})` }}
            />
            <span className="t-data block px-2.5 pt-2 pb-2.5 text-xs text-ink-3">
              <b className="block font-medium text-ink">{c.name}</b>
              {scheme === "light" ? c.light : c.dark}
              <span className="block">{c.token}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ChartSwatches({ scheme }: { scheme: "light" | "dark" }) {
  const bars = [
    { label: "Vektorsuche", value: 71, token: "chart-2" },
    { label: "GraphRAG", value: 86, token: "chart-3" },
    { label: "Hybrid", value: 89, token: "chart-1" },
  ]
  return (
    <div className={cn(scheme === "dark" && "dark", "bg-paper p-4 text-ink sm:p-6")}>
      <p className="t-label mb-4 text-ink-3">{scheme === "light" ? "Hell" : "Dunkel"}</p>
      <ul className="grid grid-cols-4 gap-px border border-line bg-line">
        {chartTokens.map((c) => (
          <li key={c.token} className="bg-paper">
            <span aria-hidden="true" className="block h-10" style={{ background: `var(--${c.token})` }} />
            <span className="t-data block px-2 pt-1.5 pb-2 text-[11px] text-ink-3">
              <b className="block font-medium text-ink">{c.token}</b>
              {scheme === "light" ? c.light : c.dark}
            </span>
          </li>
        ))}
      </ul>
      <ul className="mt-6 flex flex-col gap-3" aria-label="Beispielwerte Trefferquote">
        {bars.map((b) => (
          <li key={b.label} className="grid grid-cols-[11ch_1fr_4ch] items-center gap-3">
            <span className="t-small text-ink-2">{b.label}</span>
            <span className="h-3 border border-chart-4">
              <span className="block h-full" style={{ width: `${b.value}%`, background: `var(--${b.token})` }} />
            </span>
            <span className="t-data text-right">{b.value} %</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function StyleguidePage() {
  return (
    <>
      <SiteHeader tagline="Styleguide" />
      <main className="px-gutter">
        <div className="grid-12 pt-[clamp(56px,9vw,120px)]">
          <div className="col-span-full lg:col-span-8">
            <Badge variant="status">Design-System · Phase 2</Badge>
            <h1 className="t-display mt-7 mb-7">Systemplan</h1>
            <p className="t-lede max-w-[46ch] text-ink-2">
              Monochrom, Bernstein nur als Signal. Struktur über Haarlinien, keine Radien, keine Schatten. Alles auf
              dieser Seite ist live aus den Bausteinen in <code className="font-mono text-[0.9em]">src/components</code>{" "}
              gebaut.
            </p>
          </div>
        </div>

        <div className="grid-12 mt-[clamp(72px,9vw,120px)] items-start">
          <nav aria-label="Inhalt" className="col-span-3 hidden lg:sticky lg:top-24 lg:block">
            <p className="t-label mb-3 text-ink-3">Inhalt</p>
            <ol className="border-t border-ink">
              {toc.map(([id, label], i) => (
                <li key={id} className="border-b border-line">
                  <Link
                    href={`#${id}`}
                    className="group/row flex gap-3 py-1.5 text-[15px] text-ink-2 transition-colors hover:text-ink"
                  >
                    <span className="t-data w-6 text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                    {label}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>

          <div className="col-span-full min-w-0 lg:col-span-9">
            {/* ---------- Tokens ---------- */}
            <Section id="farben" label="01 · Farben" title="Papier, Tinte, ein Signal.">
              <p className="mb-8 max-w-[60ch] text-ink-2">
                Bernstein markiert nur Aktives: Hover-Balken, Status-Punkt, aktiver Knoten, Fokus. Nie als Fläche. Für
                Text auf hellem Grund gilt <b className="font-semibold text-ink">signal-ink</b>, weil Bernstein dort
                zu wenig Kontrast hat.
              </p>
              <div className="grid gap-px border border-line bg-line md:grid-cols-2">
                <Swatches scheme="light" />
                <Swatches scheme="dark" />
              </div>
              <Spec>Utilities: bg-paper · text-ink-2 · border-line · bg-signal · text-signal-ink</Spec>

              <h3 className="t-h4 mt-16 mb-3">Zweitpalette für Grafiken</h3>
              <p className="mb-8 max-w-[60ch] text-ink-2">
                Kombination Nr. 288 aus Sanzo Wadas <i>A Dictionary of Color Combinations</i>: Yellow Orange, Sepia,
                Taupe Brown, Black. Nur für Diagramme und Illustrationen, nie für Oberfläche oder Text. Auf Dunkel sind
                Sepia und Taupe Brown im gleichen Farbton aufgehellt, Black wird zu Tinte.
              </p>
              <div className="grid gap-px border border-line bg-line md:grid-cols-2">
                <ChartSwatches scheme="light" />
                <ChartSwatches scheme="dark" />
              </div>
              <Spec>
                Utilities: bg-chart-1 bis bg-chart-4 · Werte immer direkt beschriften · Yellow Orange auf Papier nur mit
                Kontur (Kontrast 1.8:1)
              </Spec>
            </Section>

            <Section id="typografie" label="02 · Typografie" title="Schibsted Grotesk und IBM Plex Mono.">
              <ul className="border-t border-ink">
                {typeScale.map((t) => (
                  <li key={t.cls} className="grid gap-x-5 gap-y-2 border-b border-line py-6 md:grid-cols-[18ch_1fr]">
                    <div className="t-data text-ink-3">
                      <b className="block font-medium text-ink">{t.cls}</b>
                      {t.spec}
                    </div>
                    <p className={cn(t.cls, "min-w-0 break-words")}>{t.sample}</p>
                  </li>
                ))}
              </ul>
              <Callout title="Regel">
                Mono-Versalien nur für Labels bis drei Wörter. Sätze stehen immer in normaler Schreibung.
              </Callout>
            </Section>

            <Section id="raster" label="03 · Raster" title="Zwölf Spalten, ein Gutter.">
              <div aria-hidden="true" className="grid-12 h-24">
                {Array.from({ length: 12 }, (_, i) => (
                  <span key={i} className="t-data flex items-end border-x border-line bg-paper-2 p-1 text-[11px] text-ink-3">
                    {i + 1}
                  </span>
                ))}
              </div>
              <Table aria-label="Abstands-Tokens">
                <THead>
                  <TR>
                    <TH>Token</TH>
                    <TH>Wert</TH>
                    <TH>Utility</TH>
                  </TR>
                </THead>
                <TBody>
                  {spaceTokens.map((s) => (
                    <TR key={s.token}>
                      <TD className="t-data">{s.token}</TD>
                      <TD className="t-data">{s.value}</TD>
                      <TD className="t-data">{s.util}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              <Spec>Raster-Utility: grid-12. Breakpoints: Tailwind-Standard (sm 640, md 768, lg 1024), Navigation ab 901px.</Spec>
            </Section>

            <Section id="linien" label="04 · Linien" title="Haarlinien statt Kästen.">
              <div className="grid gap-8 md:grid-cols-3">
                <div>
                  <div className="h-16 border-t border-ink" />
                  <Spec>Linie oben in Tinte: Beginn einer Gruppe (Liste, Karte, Tabelle)</Spec>
                </div>
                <div>
                  <div className="h-16 border-t border-line" />
                  <Spec>Trenner in Linienfarbe: zwischen Einträgen</Spec>
                </div>
                <div>
                  <div className="relative h-16 pl-5">
                    <span className="absolute inset-y-0 left-0 w-[3px] bg-signal" />
                  </div>
                  <Spec>3px-Balken in Bernstein: Hover und Warnung</Spec>
                </div>
              </div>
              <Spec className="mt-8">
                Radien: 0. Schatten: keine. rounded-* und shadow-* sind im Theme entfernt. Einzige runde Form: der
                Status-Punkt (rounded-full).
              </Spec>
            </Section>

            <Section id="bewegung" label="05 · Bewegung" title="Schnell ankommen, ruhig stehen.">
              <div className="grid gap-10 md:grid-cols-2">
                <MotionDemo />
                <ul className="border-t border-ink">
                  {motionTokens.map((m) => (
                    <li key={m.token} className="border-b border-line py-3">
                      <span className="t-data block text-ink">{m.token}</span>
                      <span className="t-data block text-ink-3">
                        {m.value} · {m.use}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <Callout title="Regel">
                Nur opacity, transform und clip-path animieren. Mit prefers-reduced-motion ist alles aus. Keine Animation
                versteckt Inhalt beim Laden: der Endzustand ist der Ausgangszustand.
              </Callout>
            </Section>

            {/* ---------- Bausteine ---------- */}
            <Section id="buttons" label="06 · Buttons" title="Ein Primär-Button pro Ansicht.">
              <div className="flex flex-wrap items-center gap-7">
                <Button>
                  <ButtonMarker />
                  Projekt besprechen
                </Button>
                <Button variant="secondary">Lebenslauf</Button>
                <Button variant="ghost">Mehr erfahren</Button>
                <Button size="sm">
                  <ButtonMarker />
                  Klein
                </Button>
                <Button disabled>Deaktiviert</Button>
              </div>
              <Spec>Button · variant primary | secondary | ghost · size default | sm · ButtonMarker nur bei primary</Spec>

              <div className="mt-12 flex flex-wrap items-baseline gap-x-10 gap-y-5">
                <TextLink href="#buttons">Text-Link</TextLink>
                <NavLink href="#buttons">Navigations-Link</NavLink>
                <ArrowLink href="#karten">Pfeil-Link</ArrowLink>
                <ArrowLink href="https://www.linkedin.com/in/michel-leotta-b9b00b106/" external>
                  Extern
                </ArrowLink>
                <Link href="#buttons" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                  Link als Button
                </Link>
              </div>
              <Spec>TextLink · NavLink · ArrowLink (external) · buttonVariants() für Links im Button-Look</Spec>
            </Section>

            <Section id="badges" label="07 · Badges" title="Kurze Zustände.">
              <div className="flex flex-wrap items-center gap-4">
                <Badge>LangGraph</Badge>
                <Badge>Neo4j</Badge>
                <Badge variant="solid">Neu</Badge>
                <Badge variant="status">Offen für Projekte</Badge>
                <span className="inline-flex items-center gap-2.5 text-ink-2">
                  <StatusDot /> Nur der Punkt
                </span>
              </div>
              <Spec>Badge · variant outline | solid | status · StatusDot</Spec>
            </Section>

            <Section id="karten" label="08 · Karten" title="Inhalt zwischen Linien.">
              <IndexList>
                <IndexRow
                  href="#karten"
                  year="2025"
                  title="KI-Tool, das aus Anforderungen Testspezifikationen ableitet"
                  description="Produktiv im Einsatz in Engineering und Testing. Als Tech Lead von der Architektur bis zur Infrastruktur gebaut."
                  meta={["Tech Lead · Full Stack", "Python · React · AWS"]}
                  client="Porsche"
                />
                <IndexRow
                  href="#karten"
                  year="2024"
                  title="Cloud-Migration von Jira und Confluence"
                  description="Migrationsstrategie, Requirements Engineering und ein eigenes Teilprojekt."
                  meta={["Koordination", "Jira · Power BI"]}
                  client="TRUMPF"
                />
              </IndexList>
              <Spec>IndexList + IndexRow · Hover: Bernstein-Balken, Titel rückt 6px, Pfeil rückt</Spec>

              <div className="mt-12 grid gap-x-5 gap-y-10 md:grid-cols-3">
                <Card href="#karten" label="Notiz" title="Schluss mit der Blackbox: LLM-Apps tracen" footer={<><span>Observability</span><span>15 Min.</span></>}>
                  Wie Langfuse jeden Schritt eines Agenten sichtbar macht.
                </Card>
                <Card href="#karten" label="Notiz" title="GraphRAG mit Neo4j" footer={<span>In Arbeit</span>}>
                  Wann ein Wissensgraph besser ist als Vektorsuche.
                </Card>
                <Card label="Leistung" title="Architektur für KI-Anwendungen">
                  Ohne Link: keine Hover-Bewegung, nur Struktur.
                </Card>
              </div>
              <Spec>Card · href optional · label · footer</Spec>
            </Section>

            <Section id="code" label="09 · Code" title="Code mit Kopier-Button.">
              <CodeBlock
                title="globals.css"
                language="css"
                code={`@theme inline {\n  --color-paper: var(--paper);\n  --color-signal: var(--signal);\n  --radius-*: initial;\n}`}
              />
              <Spec>CodeBlock · code · title | language · scrollt horizontal, per Tastatur fokussierbar</Spec>
            </Section>

            <Section id="callout" label="10 · Callout" title="Hinweise ohne Farbflächen.">
              <Callout>Hinweis mit Tinte-Balken. Für Kontext, der den Lesefluss kurz unterbricht.</Callout>
              <Callout variant="tip">Tipp mit Linien-Balken. Für optionale Abkürzungen.</Callout>
              <Callout variant="warning" title="Achtung">
                Warnung mit Bernstein-Balken. Für Dinge, die schiefgehen, wenn man sie überliest.
              </Callout>
              <Spec>Callout · variant note | tip | warning · title optional</Spec>
            </Section>

            <Section id="tabs" label="11 · Tabs" title="Varianten nebeneinander.">
              <Tabs defaultValue="npm">
                <TabsList aria-label="Paketmanager">
                  <TabsTrigger value="npm">npm</TabsTrigger>
                  <TabsTrigger value="pnpm">pnpm</TabsTrigger>
                  <TabsTrigger value="bun">bun</TabsTrigger>
                </TabsList>
                <TabsContent value="npm">
                  <CodeBlock className="my-0" language="bash" code="npx shadcn@latest add @watermelon/copy-confirm" />
                </TabsContent>
                <TabsContent value="pnpm">
                  <CodeBlock className="my-0" language="bash" code="pnpm dlx shadcn@latest add @watermelon/copy-confirm" />
                </TabsContent>
                <TabsContent value="bun">
                  <CodeBlock className="my-0" language="bash" code="bunx shadcn@latest add @watermelon/copy-confirm" />
                </TabsContent>
              </Tabs>
              <Spec>shadcn Tabs (Base UI) im Systemplan-Stil · Pfeiltasten wechseln den Tab</Spec>
            </Section>

            <Section id="tabelle" label="12 · Tabelle" title="Zahlen in Mono, rechtsbündig.">
              <Table aria-label="Vergleich von Retrieval-Ansätzen">
                <THead>
                  <TR>
                    <TH>Ansatz</TH>
                    <TH>Stärke</TH>
                    <TH className="text-right">Treffer</TH>
                    <TH className="text-right">Latenz</TH>
                  </TR>
                </THead>
                <TBody>
                  <TR>
                    <TD className="font-medium">Vektorsuche</TD>
                    <TD className="text-ink-2">Ähnliche Texte</TD>
                    <TD numeric>71 %</TD>
                    <TD numeric>120 ms</TD>
                  </TR>
                  <TR>
                    <TD className="font-medium">GraphRAG</TD>
                    <TD className="text-ink-2">Beziehungen über Dokumente</TD>
                    <TD numeric>86 %</TD>
                    <TD numeric>340 ms</TD>
                  </TR>
                  <TR>
                    <TD className="font-medium">Hybrid</TD>
                    <TD className="text-ink-2">Beides</TD>
                    <TD numeric>89 %</TD>
                    <TD numeric>410 ms</TD>
                  </TR>
                </TBody>
              </Table>
              <Spec>Table · THead · TBody · TR · TH · TD numeric · Beispielwerte</Spec>
            </Section>

            <Section id="zitat" label="13 · Zitat" title="Eine Stimme, groß gesetzt.">
              <Quote author="Name Nachname" role="Rolle · Firma">
                Das Tool läuft seit einem Jahr produktiv, und niemand im Team will zurück.
              </Quote>
              <Spec>Quote · author · role · Beispieltext</Spec>
            </Section>

            <Section id="statistik" label="14 · Statistik" title="Zahlen mit Herkunft.">
              <StatGrid>
                <Stat value="12" label="Testfälle" note="pro Anforderung" />
                <Stat value="5" label="Schritte" note="bis zur Freigabe" />
                <Stat value="−60 %" label="Aufwand" note="Beispielwert" />
                <Stat value="2026" label="Seit" note="CloudPioneers" />
              </StatGrid>
              <Spec>StatGrid + Stat · value · label · note · Platzhalterzahlen</Spec>
            </Section>

            <Section id="checkliste" label="15 · Checkliste" title="Knoten zeigen den Stand.">
              <div className="grid gap-12 md:grid-cols-2">
                <div>
                  <Checklist
                    items={[
                      { label: "Tokens definiert", detail: "globals.css", state: "done" },
                      { label: "Bausteine gebaut", detail: "src/components", state: "done" },
                      { label: "Seiten bauen", detail: "Phase 3", state: "active" },
                      { label: "Texte neu schreiben", state: "open" },
                    ]}
                  />
                  <Spec>Checklist · state done | active | open</Spec>
                </div>
                <div>
                  <ProcessRunDemo />
                  <Spec>Signatur ProcessRun · treibt die Laufline unter dem Kopf</Spec>
                </div>
              </div>
            </Section>

            <Section id="navigation" label="16 · Navigation" title="Kopf und Fuß dieser Seite.">
              <p className="max-w-[60ch] text-ink-2">
                Der Kopf oben ist <b className="font-semibold text-ink">SiteHeader</b>: Name klein, Navigation ab 901px,
                Sprache und Farbschema, darunter die Laufline. Der Fuß unten ist{" "}
                <b className="font-semibold text-ink">SiteFooter</b> mit der Wortmarke, die nur dort riesig steht.
              </p>
              <Spec>DE/EN schaltet in Phase 2 nur das lang-Attribut. Übersetzungen kommen mit den Seiten.</Spec>
            </Section>

            <Section id="mdx" label="17 · MDX" title="Blogposts aus denselben Bausteinen.">
              <div className="border-t border-ink pt-2">
                <Beispiel />
              </div>
              <Spec>src/mdx-components.tsx ordnet Markdown-Elementen die Bausteine zu.</Spec>
            </Section>

            <Section id="wiki" label="18 · Wiki" title="Bausteine für Artikel im Wiki.">
              <p className="max-w-[60ch] text-ink-2">
                Spezifikation: blog-system/KOMPONENTEN.md. Die Scroll-Geschichte über die volle Breite (ScrollStory) zeigt der
                Artikel <TextLink href="/de/wissen/git-commits">Git-Commits</TextLink>; Szenen liegen in src/content/scenes.
              </p>
              <p className="max-w-[60ch] text-ink-2">
                Animationen, die der Leser selbst auslöst: Klick, Schalter oder Ziehen. Jeder Artikel nutzt höchstens eine
                Scroll-Geschichte, dazu passende Bausteine von hier. Beim Laden zeigen alle ihren Ausgangszustand vollständig.
              </p>
              <ZoomFigure
                title="ZoomFigure: Kamera fährt die Ebenen ab"
                label="Läuft selbst"
                ariaLabel="Repository mit Branch, Commit und Nachricht"
                levels={[
                  { id: "msg", label: "Nachricht", text: "Die erste Zeile eines Commits." },
                  { id: "commit", label: "Commit", text: "Hash, Autor, Nachricht, Änderungen." },
                  { id: "branch", label: "Branch", text: "Eine Folge von Commits." },
                  { id: "repo", label: "Repository", text: "Alle Branches zusammen." },
                ]}
              >
                <div className="grid gap-3 border-t border-ink pt-2">
                  <span className="t-label text-signal-ink">Repository</span>
                  <div className="grid gap-px bg-line sm:grid-cols-[1fr_1.6fr]">
                    <div data-zoom-show="repo" className="bg-paper p-3 font-mono text-[13px] text-ink-2">main · 214 Commits</div>
                    <div data-zoom="branch" className="grid gap-2 bg-paper p-3">
                      <span className="font-mono text-[13px] text-ink-2">feature/timeout</span>
                      <div data-zoom-show="repo branch" className="font-mono text-[13px] text-ink-3">e3b6a58 docs(readme): Tippfehler korrigieren</div>
                      <div data-zoom="commit" className="grid gap-1 border-t border-line pt-2 font-mono text-[13px]">
                        <span data-zoom-show="repo branch commit" className="text-ink-3">91fd3b7 · Michel · 04.10.</span>
                        <span data-zoom="msg" className="justify-self-start text-ink">fix(session): Timeout auf 60 Sekunden erhöhen</span>
                        <span data-zoom-show="repo branch commit" className="text-ink-3">1 Datei, +1 −1</span>
                      </div>
                    </div>
                  </div>
                </div>
              </ZoomFigure>
              <ScrambleSwap
                title="ScrambleSwap: Text verwürfelt sich"
                label="Läuft selbst"
                states={[
                  { label: "vorher", lines: ["Update", "Fixes"], note: "Zeichen für Zeichen, ohne GSAP." },
                  { label: "nachher", lines: ["fix(session): Timeout erhöhen", "docs(readme): Tippfehler korrigieren"] },
                ]}
              />
              <Rearrange
                title="Rearrange: Liste ordnet sich neu"
                label="Läuft selbst"
                markLabel="markiert"
                items={[
                  { id: "a", meta: "a1", text: "feat: Eins" },
                  { id: "b", meta: "b2", text: "fix: Zwei" },
                  { id: "c", meta: "c3", text: "docs: Drei" },
                ]}
                states={[
                  { label: "alle", ids: ["a", "b", "c"] },
                  { label: "umgekehrt", ids: ["c", "b", "a"] },
                  { label: "gefiltert", ids: ["b"], mark: ["b"], note: "Motion layout, feste Höhe." },
                ]}
              />
              <DragSnap
                title="DragSnap: Etikett ziehen und einrasten"
                label="Läuft selbst"
                chip="production"
                place="Hierhin"
                keysHint="Mit den Pfeiltasten links und rechts verschieben."
                initial={1}
                slots={[
                  { id: "v1", label: "v1", text: "Erste Fassung.", note: "production zeigt auf v1." },
                  { id: "v2", label: "v2", text: "Mit Beispielen.", note: "production zeigt auf v2." },
                  { id: "v3", label: "v3", text: "Kürzer.", note: "production zeigt auf v3." },
                ]}
              />
              <SampleGrid title="SampleGrid: Raster neu auslosen" label="Läuft selbst" action="Neu auslosen" result="{n} von 200 Feldern getroffen ({p} %)." />
              <Takeaways label="Takeaways" items={["Ein ganzer Satz pro Kachel.", "Genau drei Kacheln.", "Zitierbar ohne Kontext."]} />
              <ScrollFig
                title="ScrollFig: eine Verwandlung beim Vorbeiscrollen"
                label="Beim Scrollen"
                scene="git-commits/fixup"
                labels={{
                  fixup: "amend! fix(session): Timeout auf 60 Sekunden erhöhen",
                  docs: "docs(readme): Tippfehler korrigieren",
                  header: "feat(header): Hintergrund aufhellen",
                  target: ["fix(session): Timeout auf 60 Sekunden erhöhen", "fix(session): Timeout auf 90 Sekunden erhöhen"],
                }}
              />
              <StepFigure
                title="StepFigure: Grafik mit Schritten"
                label="Läuft selbst"
                steps={[
                  { state: "a", say: <><strong>Erster Teil.</strong> Klick hebt ihn hervor.</> },
                  { state: "b", say: <><strong>Zweiter Teil.</strong> Der Rest tritt zurück.</> },
                ]}
              >
                <div className="commit-msg">
                  <div><i>1</i><span><span data-p="a">feat(wiki):</span> <span data-p="b">Bausteine zeigen</span></span></div>
                </div>
              </StepFigure>
              <Pitfalls items={[{ title: "Fallstrick", text: "Ursache und Lösung in einem Absatz." }]} />
              <Quiz questions={[{ q: "Was zeigt eine Scroll-Geschichte?", options: ["Eine Verwandlung", "Ein Video"], ok: 0, why: "Scrollen ist die Zeitachse, nichts läuft von selbst." }]} />
              <TaskChecklist id="styleguide" items={[{ title: "Abhaken.", text: "Der Stand bleibt im Browser." }, { title: "Zurücksetzen.", text: "Mit dem Knopf darunter." }]} />
            </Section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
