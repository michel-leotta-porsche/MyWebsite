import type { Metadata } from "next";
import Link from "next/link";

import { featureScore, KANO, qfd, techImportance, weights, type Kano } from "@/content/qfd";
import { HouseOfQuality } from "@/components/qfd/house-of-quality";
import { SurveyResults } from "@/components/qfd/survey-results";
import { VoiceOfCustomer } from "@/components/qfd/voice";

export const metadata: Metadata = {
  title: "QFD-Workshop · Fujiventura",
  description: "Vom Kundenwunsch zur Funktion: Marktanalyse, Stimme der Kunden, Kano, House of Quality und Funktionen für den Fotobuch-Editor.",
};

// Die Dokumentation des Workshops: liest sich von oben nach unten wie das Vorgehen selbst.

const STEPS = [
  { id: "markt", n: "0", title: "Marktanalyse" },
  { id: "stimme", n: "1", title: "Stimme der Kunden" },
  { id: "anforderungen", n: "2", title: "Kundenanforderungen" },
  { id: "hoq", n: "3", title: "House of Quality" },
  { id: "funktionen", n: "4", title: "Funktionen" },
  { id: "kano", n: "5", title: "Kano-Fragebogen" },
];

function Section({ id, n, title, lede, children }: { id: string; n: string; title: string; lede?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-20 border-t border-on-table-2/30 pt-10 md:pt-14">
      <div className="grid gap-x-8 gap-y-4 md:grid-cols-[180px_minmax(0,1fr)]">
        <p className="text-on-table-2 text-sm tabular-nums">Schritt {n}</p>
        <div className="min-w-0">
          <h2 id={`${id}-h`} className="text-on-table text-3xl leading-tight font-bold tracking-[-0.03em] md:text-4xl" style={{ fontVariationSettings: '"wdth" 80' }}>
            {title}
          </h2>
          {lede && <p className="text-on-table-2 mt-3 max-w-[64ch] text-base leading-relaxed">{lede}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </section>
  );
}

function KanoBadge({ kano }: { kano: Kano }) {
  return (
    <span className="border-on-table-2/60 text-on-table inline-block shrink-0 border px-1.5 py-0.5 text-[11px] leading-none whitespace-nowrap" title={KANO[kano].hint}>
      {KANO[kano].short}
    </span>
  );
}

export default function Page() {
  const { market, voc, reqs, hoq, features } = qfd;
  const w = weights(reqs.requirements);
  const tech = techImportance(reqs.requirements, hoq.characteristics, hoq.relations);
  const ranked = [...features.features].sort((a, b) => a.phase - b.phase || featureScore(b, tech) - featureScore(a, tech));
  const reqById = new Map(reqs.requirements.map((r) => [r.id, r]));

  return (
    <main className="linen table-surface relative min-h-svh bg-table pb-24">
      <header className="sticky top-0 z-40 flex items-baseline justify-between gap-6 bg-table/95 px-4 py-4 md:px-8">
        <Link href="/" className="text-on-table text-lg font-bold tracking-[-0.02em]" style={{ fontVariationSettings: '"wdth" 80' }}>
          Fujiventura
        </Link>
        <nav aria-label="Schritte" className="hidden gap-5 text-sm lg:flex">
          {STEPS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="text-on-table-2 hover:text-on-table decoration-mark decoration-2 underline-offset-4 hover:underline">
              {s.n} {s.title}
            </a>
          ))}
        </nav>
      </header>

      <div className="mx-auto max-w-[1280px] px-4 md:px-8">
        {/* Einstieg */}
        <div className="grid gap-x-8 py-12 md:grid-cols-[180px_minmax(0,1fr)] md:py-20">
          <p className="text-on-table-2 text-sm">QFD-Workshop · {qfd.date}</p>
          <div>
            <h1 className="text-on-table text-5xl leading-[0.92] font-bold tracking-[-0.04em] md:text-7xl" style={{ fontVariationSettings: '"wdth" 75, "opsz" 96' }}>
              Vom Kundenwunsch zur Funktion
            </h1>
            <p className="text-on-table-2 mt-6 max-w-[64ch] text-lg leading-relaxed">
              Bevor der Fotobuch-Editor ausgebaut wird, steht die Frage, was Menschen an Fotobüchern wirklich brauchen. Quality Function Deployment
              übersetzt das in messbare Merkmale und eine geordnete Liste von Funktionen. Die Marktanalyse beruht auf Recherche mit Quellen, die
              Interviews sind simuliert und werden mit einem echten Kano-Fragebogen geprüft.
            </p>
            <ol className="mt-10 grid gap-px bg-on-table-2/25 sm:grid-cols-3 lg:grid-cols-6">
              {STEPS.map((s) => (
                <li key={s.id} className="bg-table">
                  <a href={`#${s.id}`} className="group block p-4">
                    <span className="text-on-table-2 text-sm tabular-nums">{s.n}</span>
                    <span className="text-on-table mt-1 block font-semibold break-words hyphens-auto decoration-mark decoration-2 underline-offset-4 group-hover:underline">{s.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="space-y-16 md:space-y-24">
          <Section id="markt" n="0" title="Was an Fotobuch-Editoren stört" lede={market.summary}>
            <h3 className="text-on-table text-lg font-semibold">Schmerzpunkte</h3>
            <ul className="mt-4 grid gap-px bg-on-table-2/25 md:grid-cols-2">
              {market.painThemes.map((p) => (
                <li key={p.id} className="bg-table p-5">
                  <p className="text-on-table-2 text-sm tabular-nums">{p.id}</p>
                  <p className="text-on-table mt-1 text-lg font-semibold">{p.theme}</p>
                  <p className="text-on-table-2 mt-2 text-sm leading-relaxed">{p.description}</p>
                  <p className="text-on-table-2 mt-3 text-[13px]">{p.competitors.join(" · ")}</p>
                  <ul className="mt-3 space-y-2">
                    {p.evidence.map((e, i) => (
                      <li key={i} className="text-on-table text-[13px] leading-snug">
                        {e.text}{" "}
                        <a href={e.source} target="_blank" rel="noreferrer" className="text-on-table-2 underline underline-offset-2">
                          Quelle
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>

            <h3 className="text-on-table mt-12 text-lg font-semibold">Was ein Editor auf jeden Fall braucht</h3>
            <div tabIndex={0} className="mt-4 overflow-x-auto" aria-label="Tabelle Must-haves">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="text-on-table-2 border-b border-on-table">
                    <th className="py-2 pr-4 font-normal">Must-have</th>
                    <th className="py-2 pr-4 font-normal">Warum</th>
                    <th className="py-2 font-normal">Fujiventura heute</th>
                  </tr>
                </thead>
                <tbody>
                  {market.mustHaves.map((m, i) => (
                    <tr key={i} className="border-b border-on-table-2/25 align-top">
                      <td className="text-on-table py-3 pr-4 font-semibold">{m.need}</td>
                      <td className="text-on-table-2 py-3 pr-4">{m.why}</td>
                      <td className="text-on-table py-3">{m.fujiventuraToday}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="text-on-table mt-12 text-lg font-semibold">Lücken im Markt</h3>
            <ul className="text-on-table mt-4 max-w-[70ch] list-disc space-y-2 pl-5 text-base leading-relaxed marker:text-mark">
              {market.gaps.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </Section>

          <Section
            id="stimme"
            n="1"
            title="Stimme der Kunden"
            lede={`${voc.personas.length} simulierte Interviews mit ${voc.statements.length} Aussagen in Kundensprache. Sie sind Hypothesen, keine Messung: Der Kano-Fragebogen in Schritt 5 prüft sie an echten Menschen.`}
          >
            <VoiceOfCustomer personas={voc.personas} statements={voc.statements} />
          </Section>

          <Section id="anforderungen" n="2" title="Kundenanforderungen" lede={reqs.method}>
            <div className="grid gap-px bg-on-table-2/25 lg:grid-cols-4">
              {(["M", "O", "A", "I"] as Kano[]).map((k) => {
                const list = reqs.requirements.filter((r) => r.kano === k);
                return (
                  <div key={k} className="bg-table p-5">
                    <p className="text-on-table font-semibold">{KANO[k].label}</p>
                    <p className="text-on-table-2 text-[13px]">{KANO[k].hint}</p>
                    <ul className="mt-4 space-y-3">
                      {list.map((r) => (
                        <li key={r.id} className="text-on-table text-sm leading-snug">
                          <span className="text-on-table-2 mr-2 tabular-nums">{r.id}</span>
                          {r.text}
                        </li>
                      ))}
                      {!list.length && <li className="text-on-table-2 text-sm">keine</li>}
                    </ul>
                  </div>
                );
              })}
            </div>

            <h3 className="text-on-table mt-12 text-lg font-semibold">Gewichtung und Wettbewerb aus Kundensicht</h3>
            <p className="text-on-table-2 mt-2 max-w-[64ch] text-sm leading-relaxed">
              Gewicht = Bedeutung × Verbesserungsquote (Planwert ÷ Fujiventura heute) × Verkaufsschwerpunkt. Die Punkte zeigen, wie Kunden die
              Anbieter je Anforderung sehen (1 bis 5).
            </p>
            <div tabIndex={0} className="mt-4 overflow-x-auto" aria-label="Tabelle Gewichtung und Wettbewerb">
              <table className="w-full min-w-[860px] text-left text-sm tabular-nums">
                <thead>
                  <tr className="text-on-table-2 border-b border-on-table">
                    <th className="py-2 pr-3 font-normal">Anforderung</th>
                    <th className="py-2 pr-3 font-normal">Kano</th>
                    <th className="py-2 pr-3 text-right font-normal">Bedeutung</th>
                    <th className="py-2 pr-3 text-right font-normal">Planwert</th>
                    <th className="py-2 pr-3 text-right font-normal">Gewicht</th>
                    <th className="py-2 font-normal">Wettbewerb 1 – 5</th>
                  </tr>
                </thead>
                <tbody>
                  {reqs.requirements.map((r) => {
                    const ww = w.get(r.id)!;
                    return (
                      <tr key={r.id} className="border-b border-on-table-2/25 align-middle">
                        <td className="text-on-table py-2.5 pr-3">
                          <span className="text-on-table-2 mr-2">{r.id}</span>
                          {r.text}
                        </td>
                        <td className="py-2.5 pr-3">
                          <KanoBadge kano={r.kano} />
                        </td>
                        <td className="text-on-table py-2.5 pr-3 text-right">{r.importance}</td>
                        <td className="text-on-table py-2.5 pr-3 text-right">{r.goal}</td>
                        <td className="text-on-table py-2.5 pr-3 text-right font-semibold">{ww.rel.toFixed(1)} %</td>
                        <td className="py-2.5">
                          <CompetitorDots perception={r.perception} goal={r.goal} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <CompetitorLegend />
          </Section>

          <Section
            id="hoq"
            n="3"
            title="House of Quality"
            lede="Zeilen sind Kundenanforderungen, Spalten messbare technische Merkmale. ● stark (9), ○ mittel (3), △ schwach (1). Das Dach zeigt, wo Merkmale sich gegenseitig helfen oder im Weg stehen. Zeig auf eine Zeile oder Spalte."
          >
            <HouseOfQuality requirements={reqs.requirements} characteristics={hoq.characteristics} relations={hoq.relations} roof={hoq.roof} />
            <p className="text-on-table-2 mt-6 max-w-[70ch] text-sm leading-relaxed">{hoq.notes}</p>

            <h3 className="text-on-table mt-12 text-lg font-semibold">Technische Merkmale und Zielwerte</h3>
            <div tabIndex={0} className="mt-4 overflow-x-auto" aria-label="Tabelle technische Merkmale">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead>
                  <tr className="text-on-table-2 border-b border-on-table">
                    <th className="py-2 pr-3 font-normal">Merkmal</th>
                    <th className="py-2 pr-3 font-normal">Richtung</th>
                    <th className="py-2 pr-3 font-normal">Heute</th>
                    <th className="py-2 pr-3 font-normal">Ziel</th>
                    <th className="py-2 pr-3 font-normal">Bedeutung</th>
                    <th className="py-2 font-normal">Messung</th>
                  </tr>
                </thead>
                <tbody>
                  {[...hoq.characteristics]
                    .sort((a, b) => (tech.get(b.id)?.rel ?? 0) - (tech.get(a.id)?.rel ?? 0))
                    .map((c) => (
                      <tr key={c.id} className="border-b border-on-table-2/25 align-top">
                        <td className="text-on-table py-2.5 pr-3">
                          <span className="text-on-table-2 mr-2 tabular-nums">{c.id}</span>
                          {c.name} <span className="text-on-table-2">({c.unit})</span>
                        </td>
                        <td className="text-on-table py-2.5 pr-3">{c.direction === "up" ? "↑ mehr" : c.direction === "down" ? "↓ weniger" : "◎ Zielwert"}</td>
                        <td className="text-on-table-2 py-2.5 pr-3">{c.current}</td>
                        <td className="text-on-table py-2.5 pr-3 font-semibold">{c.target}</td>
                        <td className="py-2.5 pr-3">
                          <Bar value={tech.get(c.id)?.rel ?? 0} max={Math.max(...[...tech.values()].map((t) => t.rel))} />
                        </td>
                        <td className="text-on-table-2 py-2.5">{c.measure}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="funktionen" n="4" title="Was wir bauen" lede={features.next}>
            <div className="grid gap-px bg-on-table-2/25 lg:grid-cols-3">
              {[1, 2, 3].map((ph) => (
                <div key={ph} className="bg-table p-5">
                  <p className="text-on-table font-semibold">Phase {ph}</p>
                  <p className="text-on-table-2 text-[13px]">{ph === 1 ? "als Nächstes" : ph === 2 ? "danach" : "später"}</p>
                  <ol className="mt-4 space-y-5">
                    {ranked
                      .filter((f) => f.phase === ph)
                      .map((f) => (
                        <li key={f.id} className="border-t border-on-table-2/25 pt-3">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="text-on-table font-semibold">
                              <span className="text-on-table-2 mr-2 text-sm font-normal tabular-nums">{f.id}</span>
                              {f.name}
                            </p>
                            <span className="text-on-table-2 shrink-0 text-[12px]" title="Aufwand">
                              {f.effort === "S" ? "klein" : f.effort === "M" ? "mittel" : "groß"}
                            </span>
                          </div>
                          <p className="text-on-table-2 mt-1 text-sm leading-relaxed">{f.description}</p>
                          <p className="text-on-table-2 mt-2 text-[12px]">
                            {KANO[f.kano].short} · Bedeutung {featureScore(f, tech).toFixed(0)} · {f.reqs.map((id) => reqById.get(id)?.id ?? id).join(", ")}
                          </p>
                        </li>
                      ))}
                  </ol>
                </div>
              ))}
            </div>
            <p className="text-on-table-2 mt-6 max-w-[70ch] text-sm leading-relaxed">
              <span className="text-on-table font-semibold">Grenzen der Simulation: </span>
              {features.caveats}
            </p>
          </Section>

          <Section
            id="kano"
            n="5"
            title="Kano-Fragebogen"
            lede={`${features.survey.length} Anforderungen, je eine Frage mit und ohne die Eigenschaft. Aus den Antwortpaaren ergibt sich nach der Kano-Tabelle, ob etwas vorausgesetzt wird, mehr zufrieden macht oder begeistert. Die Ergebnisse unten ersetzen nach und nach die Annahmen aus der Simulation.`}
          >
            <Link
              href="/umfrage"
              className="border-on-table text-on-table hover:bg-on-table hover:text-table inline-block border px-5 py-3 font-semibold transition-colors duration-150"
            >
              Zum Fragebogen
            </Link>
            <SurveyResults />
          </Section>
        </div>
      </div>
    </main>
  );
}

const MARKS: Record<string, string> = { CEWE: "C", Popsa: "P", "Google Fotos": "G", Blurb: "B", "Fujiventura heute": "F" };

function CompetitorDots({ perception, goal }: { perception: Record<string, number>; goal: number }) {
  // Skala 1–5 als Linie; Buchstaben stehen für Anbieter, das Dreieck für den Planwert
  return (
    <div className="relative h-6 w-[240px]" aria-label={Object.entries(perception).map(([k, v]) => `${k} ${v}`).join(", ") + `, Plan ${goal}`}>
      <span aria-hidden className="absolute top-1/2 right-2 left-2 h-px bg-on-table-2/40" />
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} aria-hidden className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-on-table-2/40" style={{ left: `calc(8px + ${(s - 1) / 4} * (100% - 16px))` }} />
      ))}
      {Object.entries(perception).map(([k, v], i) => (
        <span
          key={k}
          aria-hidden
          className={`absolute -translate-x-1/2 text-[11px] leading-none font-semibold ${k === "Fujiventura heute" ? "text-mark" : "text-on-table"}`}
          style={{ left: `calc(8px + ${(v - 1) / 4} * (100% - 16px))`, top: i % 2 ? 14 : 0 }}
        >
          {MARKS[k] ?? k[0]}
        </span>
      ))}
      <span aria-hidden className="text-mark absolute top-[7px] -translate-x-1/2 text-[10px] leading-none" style={{ left: `calc(8px + ${(goal - 1) / 4} * (100% - 16px))` }}>
        ▲
      </span>
    </div>
  );
}

function CompetitorLegend() {
  return (
    <p className="text-on-table-2 mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
      {Object.entries(MARKS).map(([k, v]) => (
        <span key={k} className="whitespace-nowrap">
          <span className={k === "Fujiventura heute" ? "text-mark font-semibold" : "text-on-table font-semibold"}>{v}</span> {k}
        </span>
      ))}
      <span className="whitespace-nowrap">
        <span className="text-mark">▲</span> Planwert Fujiventura
      </span>
    </p>
  );
}

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <span className="flex items-center gap-2 tabular-nums">
      <span aria-hidden className="block h-1.5 w-24 bg-on-table-2/20">
        <span className="block h-full bg-mark" style={{ width: `${(100 * value) / (max || 1)}%` }} />
      </span>
      <span className="text-on-table text-[13px]">{value.toFixed(1)} %</span>
    </span>
  );
}
