import type { Metadata } from "next";
import Link from "next/link";

import kritik from "@/content/kritik.json";

export const metadata: Metadata = {
  title: "UX-Kritik · Fujiventura",
  description: "Expertenbewertung von Fujiventura nach Gestaltungsprinzipien und UX-Forschung: Stärken, Probleme nach Schweregrad, Quick Wins, Testplan.",
};

// Die Kritik als Seite: Stärken zuerst, dann Probleme nach Schweregrad, jede Aussage mit Beleg und Quelle.

type Source = { key: string; citation: string; url?: string };
type Issue = {
  id: string;
  title: string;
  severity: number;
  area: string;
  observation: string;
  principle: string;
  source: string;
  impact: string;
  fix: string;
  effort: string;
  route?: string;
};

const SEVERITY = ["kein Problem", "kosmetisch", "gering", "schwer", "kritisch"];
const EFFORT: Record<string, string> = { S: "klein", M: "mittel", L: "groß" };

const STEPS = [
  { id: "staerken", n: "1", title: "Was trägt" },
  { id: "probleme", n: "2", title: "Probleme" },
  { id: "quickwins", n: "3", title: "Quick Wins" },
  { id: "editor", n: "4", title: "Für den Editor" },
  { id: "test", n: "5", title: "Testplan" },
  { id: "quellen", n: "6", title: "Quellen" },
];

function Section({ id, n, title, lede, children }: { id: string; n: string; title: string; lede?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-20 border-t border-on-table-2/30 pt-10 md:pt-14">
      <div className="grid gap-x-8 gap-y-4 md:grid-cols-[180px_minmax(0,1fr)]">
        <p className="text-on-table-2 text-sm tabular-nums">Teil {n}</p>
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

/** Schweregrad als Zahl, Wort und Balken; nie nur über die Füllung */
function Severity({ n }: { n: number }) {
  return (
    <span className="text-on-table inline-flex items-center gap-2 text-[13px] whitespace-nowrap">
      <span aria-hidden className="flex gap-0.5">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`h-2.5 w-2.5 border border-on-table ${i <= n ? "bg-on-table" : ""}`} />
        ))}
      </span>
      {n} · {SEVERITY[n]}
    </span>
  );
}

export default function Page() {
  const sources = new Map((kritik.sources as Source[]).map((s) => [s.key, s]));
  const cite = (key: string) => {
    const s = sources.get(key);
    if (!s) return null;
    const i = (kritik.sources as Source[]).indexOf(s) + 1;
    return (
      <a href={`#q-${s.key}`} className="text-on-table-2 underline underline-offset-2" title={s.citation}>
        [{i}]
      </a>
    );
  };
  const issues = [...(kritik.issues as Issue[])].sort((a, b) => b.severity - a.severity || a.id.localeCompare(b.id, "de", { numeric: true }));
  const count = (n: number) => issues.filter((i) => i.severity === n).length;

  return (
    <main className="linen table-surface relative min-h-svh bg-table pb-24">
      <header className="sticky top-0 z-40 flex items-baseline justify-between gap-6 bg-table/95 px-4 py-4 md:px-8">
        <Link href="/" className="text-on-table text-lg font-bold tracking-[-0.02em]" style={{ fontVariationSettings: '"wdth" 80' }}>
          Fujiventura
        </Link>
        <nav aria-label="Teile" className="hidden gap-5 text-sm lg:flex">
          {STEPS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="text-on-table-2 hover:text-on-table decoration-mark decoration-2 underline-offset-4 hover:underline">
              {s.n} {s.title}
            </a>
          ))}
          <Link href="/qfd" className="text-on-table-2 hover:text-on-table decoration-mark decoration-2 underline-offset-4 hover:underline">
            QFD
          </Link>
        </nav>
      </header>

      <div className="mx-auto max-w-[1280px] px-4 md:px-8">
        <div className="grid gap-x-8 py-12 md:grid-cols-[180px_minmax(0,1fr)] md:py-20">
          <p className="text-on-table-2 text-sm">UX-Bewertung</p>
          <div>
            <h1 className="text-on-table text-5xl leading-[0.92] font-bold tracking-[-0.04em] md:text-7xl" style={{ fontVariationSettings: '"wdth" 75, "opsz" 96' }}>
              Was die Forschung zu Fujiventura sagt
            </h1>
            <p className="text-on-table-2 mt-6 max-w-[64ch] text-lg leading-relaxed">{kritik.summary}</p>
            <dl className="mt-10 grid grid-cols-2 gap-px bg-on-table-2/25 sm:grid-cols-4">
              {[4, 3, 2, 1].map((n) => (
                <div key={n} className="bg-table p-4">
                  <dt className="text-on-table-2 text-sm">{SEVERITY[n]}</dt>
                  <dd className="text-on-table mt-1 text-3xl font-bold tabular-nums">{count(n)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="space-y-16 md:space-y-24">
          <Section id="staerken" n="1" title="Was trägt" lede="Diese Entscheidungen sind durch Forschung gedeckt und sollten beim Umbau erhalten bleiben.">
            <ul className="grid gap-px bg-on-table-2/25 md:grid-cols-2">
              {kritik.strengths.map((s, i) => (
                <li key={i} className="bg-table p-5">
                  <p className="text-on-table text-lg font-semibold">{s.title}</p>
                  <p className="text-on-table-2 mt-2 text-sm leading-relaxed">{s.observation}</p>
                  <p className="text-on-table mt-3 text-[13px] leading-snug">
                    {s.principle} {cite(s.source)}
                  </p>
                </li>
              ))}
            </ul>
          </Section>

          <Section
            id="probleme"
            n="2"
            title="Probleme nach Schweregrad"
            lede="Schweregrad nach Nielsen: 0 kein Problem, 1 kosmetisch, 2 gering, 3 schwer, 4 kritisch. Jede Zeile nennt Beobachtung, Prinzip, Folge und einen Vorschlag."
          >
            <ol className="space-y-px bg-on-table-2/25">
              {issues.map((it) => (
                <li key={it.id} className="bg-table py-6 md:px-5">
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                    <span className="text-on-table-2 text-sm tabular-nums">{it.id}</span>
                    <h3 className="text-on-table min-w-0 flex-1 text-lg font-semibold">{it.title}</h3>
                    <Severity n={it.severity} />
                  </div>
                  <p className="text-on-table-2 mt-1 text-[13px]">
                    {it.area}
                    {it.route ? ` · ${it.route}` : ""} · Aufwand {EFFORT[it.effort] ?? it.effort}
                  </p>
                  <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm leading-relaxed md:grid-cols-2">
                    <div>
                      <dt className="text-on-table-2 text-[13px]">Beobachtung</dt>
                      <dd className="text-on-table">{it.observation}</dd>
                    </div>
                    <div>
                      <dt className="text-on-table-2 text-[13px]">Prinzip</dt>
                      <dd className="text-on-table">
                        {it.principle} {cite(it.source)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-on-table-2 text-[13px]">Folge</dt>
                      <dd className="text-on-table">{it.impact}</dd>
                    </div>
                    <div>
                      <dt className="text-on-table-2 text-[13px]">Vorschlag</dt>
                      <dd className="text-on-table">{it.fix}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="quickwins" n="3" title="Quick Wins" lede="Klein im Aufwand, spürbar in der Wirkung.">
            <ul className="text-on-table max-w-[68ch] space-y-3 text-base leading-relaxed">
              {kritik.quickWins.map((q, i) => (
                <li key={i} className="border-l-2 border-mark pl-4">
                  {q}
                </li>
              ))}
            </ul>
          </Section>

          <Section id="editor" n="4" title="Was das für den neuen Editor heißt">
            <ul className="text-on-table max-w-[68ch] list-disc space-y-3 pl-5 text-base leading-relaxed">
              {kritik.editorImplications.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </Section>

          <Section id="test" n="5" title="Mit Freunden prüfen" lede={kritik.method}>
            <ol className="text-on-table max-w-[68ch] list-decimal space-y-3 pl-5 text-base leading-relaxed">
              {kritik.testPlan.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ol>
            <p className="text-on-table-2 mt-8 max-w-[68ch] text-sm leading-relaxed">
              <span className="text-on-table font-semibold">Grenzen. </span>
              {kritik.limits}
            </p>
          </Section>

          <Section id="quellen" n="6" title="Quellen">
            <ol className="text-on-table-2 max-w-[80ch] space-y-2 text-sm leading-relaxed">
              {(kritik.sources as Source[]).map((s, i) => (
                <li key={s.key} id={`q-${s.key}`} className="scroll-mt-20 grid grid-cols-[2.5rem_minmax(0,1fr)]">
                  <span className="tabular-nums">[{i + 1}]</span>
                  <span className="break-words">
                    {s.citation}
                    {s.url && (
                      <>
                        {" "}
                        <a href={s.url} target="_blank" rel="noreferrer" className="text-on-table underline underline-offset-2">
                          Link
                        </a>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </Section>
        </div>
      </div>
    </main>
  );
}
