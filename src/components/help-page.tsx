"use client";

import Image from "next/image";
import Link from "next/link";

import { ArrowRight, ChevronLeft, ChevronRight, SlidersHorizontal, Smartphone } from "lucide-react";

import { LegalLinks } from "@/components/legal-links";
import { hitClass, linkClass } from "@/components/ui-classes";
import { IS_APP } from "@/lib/app-mode";
import { ALSO, MAP, guideOf, guidePath, HELP_PATH, shotOf, stepText, tipsFor, type Guide, type Slug } from "@/lib/help";
import { useLang, useT } from "@/lib/i18n";
import { TESTFLIGHT_URL } from "@/lib/landing";

// Hilfe als Landkarte (#215). /hilfe zeigt die Abläufe als Weg von Station zu Station, jede Station ist eine Anleitung
// unter /hilfe/<slug> mit nummerierten Schritten, Bildern aus der App und „Gut zu wissen“. Die Texte stehen in lib/help.ts.

const narrow = { fontVariationSettings: '"wdth" 80' };
const display = { fontVariationSettings: '"wdth" 78, "opsz" 72' };

function AppOnly() {
  const t = useT();
  return (
    <span className="text-on-table-2 inline-flex items-center gap-1 text-sm font-semibold">
      <Smartphone aria-hidden className="size-3.5" />
      {t("Nur in der iPhone-App")}
    </span>
  );
}

/** Eine Station auf dem Weg: Nummer, Frage, ein Satz, ganz als Link (Zeile wie in einer iOS-Liste, mit Chevron) */
function Station({ g, n, last }: { g: Guide; n?: number; last?: boolean }) {
  const t = useT();
  return (
    <li id={g.anchor} className="relative scroll-mt-6">
      {/* der Weg zwischen den Stationen */}
      {n !== undefined && !last && <span aria-hidden className="bg-on-table-2/30 absolute top-12 bottom-0 left-[1.1875rem] w-px" />}
      <Link href={guidePath(g.slug)} className="group flex min-h-11 items-start gap-4 rounded-xl py-3 pr-2 transition-colors duration-150 hover:bg-white/[0.04]">
        <span
          aria-hidden
          className={`grid size-10 shrink-0 place-items-center rounded-full text-base font-bold tabular-nums ${n !== undefined ? "bg-cloth text-cloth-ink" : "border-on-table-2/40 text-on-table-2 border"}`}
        >
          {n ?? <SlidersHorizontal className="size-4" />}
        </span>
        <span className="min-w-0 flex-1 pt-1.5">
          <span className="text-on-table-2 block text-sm font-semibold">{t(g.label)}</span>
          <span className="text-on-table mt-0.5 block text-lg leading-snug font-semibold tracking-[-0.01em]" style={narrow}>
            {t(g.title)}
          </span>
          <span className="text-on-table-2 mt-1 block text-base leading-relaxed">{t(g.lead)}</span>
          {g.appOnly && !IS_APP && (
            <span className="mt-1.5 block">
              <AppOnly />
            </span>
          )}
        </span>
        <ChevronRight aria-hidden className="text-on-table-2 mt-3 size-5 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" />
      </Link>
    </li>
  );
}

/** Inhaltsverzeichnis oben auf /hilfe: der Weg vom Foto bis zur Antwort, daneben das Fotostudio */
export function HelpMap() {
  const t = useT();
  return (
    <section aria-labelledby="weg-h" className="flex flex-col gap-3">
      <h2 id="weg-h" className="text-on-table-2 text-base leading-relaxed">
        {t("Vom Foto zum Buch und zurück: Jede Station ist eine kurze Anleitung mit Bildern.")}
      </h2>
      <ol className="flex flex-col">
        {MAP.map((s, i) => (
          <Station key={s} g={guideOf(s)!} n={i + 1} last={i === MAP.length - 1} />
        ))}
      </ol>
      <ul aria-label={t("Außerdem")} className="border-on-table-2/25 flex flex-col border-t pt-3">
        {ALSO.map((s) => (
          <Station key={s} g={guideOf(s)!} />
        ))}
      </ul>
    </section>
  );
}

function Shot({ slug, n, shot }: { slug: Slug; n: number; shot: string }) {
  const t = useT();
  const lang = useLang();
  const { src, width, height } = shotOf(shot, lang);
  return (
    <Image
      src={src}
      alt={t("Bildschirmfoto zu Schritt {n}: {title}", { n, title: t(guideOf(slug)!.steps[n - 1].title) })}
      width={width}
      height={height}
      // schon in der Größe gespeichert, in der es gebraucht wird: kein Bildserver
      unoptimized
      loading="lazy"
      className="bg-paper border-paper w-full rounded-[10px] border-[5px] shadow-[0_24px_40px_-18px_rgb(12_10_8/0.75),0_6px_12px_-6px_rgb(12_10_8/0.5)]"
    />
  );
}

/** Eine Anleitung: Frage, ein Satz, Schritte mit Bildern, Gut zu wissen, Weiter */
export function GuidePage({ slug }: { slug: Slug }) {
  const t = useT();
  const g = guideOf(slug)!;
  const next = g.next && guideOf(g.next);
  const tips = tipsFor(g, IS_APP);
  return (
    <main className="linen table-surface bg-table relative flex min-h-svh flex-col">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-8 md:pt-6">
        {/* Zurück wie in iOS: Chevron und der Name der Seite davor */}
        <Link href={HELP_PATH} className={`${hitClass} text-on-table -ml-1 inline-flex min-h-11 items-center gap-0.5 text-lg font-bold tracking-[-0.02em]`} style={narrow}>
          <ChevronLeft aria-hidden className="text-on-table-2 size-5" />
          {t("Hilfe")}
        </Link>
        <LegalLinks />
      </header>

      <article className="mx-auto w-full max-w-3xl flex-1 px-4 pt-10 pb-20 md:px-8 md:pt-16">
        <p className="text-on-table-2 text-sm font-semibold">{t(g.label)}</p>
        <h1 className="text-on-table mt-2 text-4xl leading-[0.95] font-bold tracking-[-0.03em] md:text-6xl" style={display}>
          {t(g.title)}
        </h1>
        <p className="text-on-table mt-5 max-w-[40rem] text-lg leading-relaxed opacity-85">{t(g.lead)}</p>

        {g.appOnly && !IS_APP && (
          <p className="border-cloth/60 text-on-table mt-6 flex max-w-[40rem] gap-3 rounded-xl border px-4 py-3 text-base leading-relaxed">
            <Smartphone aria-hidden className="text-cloth mt-1 size-4 shrink-0" />
            <span>
              {t("Das geht nur in der iPhone-App. Im Browser kannst du Bücher machen, Fotos bearbeiten und hinlegen.")}{" "}
              {TESTFLIGHT_URL ? (
                <a href={TESTFLIGHT_URL} className={`${linkClass} font-semibold`}>
                  {t("Vorab testen mit TestFlight")}
                </a>
              ) : (
                t("Sie kommt bald in den App Store.")
              )}
            </span>
          </p>
        )}

        {g.intro && <p className="text-on-table-2 mt-6 max-w-[40rem] text-base leading-relaxed">{t(g.intro)}</p>}

        <ol className="mt-12 flex flex-col gap-12">
          {g.steps.map((s, i) => (
            <li
              key={s.title}
              id={`schritt-${i + 1}`}
              className={`border-on-table-2/25 grid scroll-mt-6 gap-6 border-t pt-5 ${s.shot ? "md:grid-cols-[1fr_15rem] md:gap-10" : ""}`}
            >
              <div className="flex gap-4">
                <span aria-hidden className="text-on-table-2 w-5 shrink-0 pt-0.5 text-base font-semibold tabular-nums">
                  {i + 1}
                </span>
                <div className="max-w-[36rem]">
                  <h2 className="text-on-table text-xl font-semibold tracking-[-0.01em]">{t(s.title)}</h2>
                  <p className="text-on-table-2 mt-2 text-base leading-relaxed">
                    {stepText(s, IS_APP)
                      .map((part) => t(part))
                      .join(" ")}
                  </p>
                </div>
              </div>
              {s.shot && (
                <div className="ml-9 w-[70%] max-w-[15rem] md:ml-0 md:w-full">
                  <Shot slug={slug} n={i + 1} shot={s.shot} />
                </div>
              )}
            </li>
          ))}
        </ol>

        {tips.length > 0 && (
          <section aria-labelledby="gut-h" className="border-on-table-2/25 mt-14 border-t pt-5">
            <h2 id="gut-h" className="text-on-table text-xl font-semibold tracking-[-0.01em]">
              {t("Gut zu wissen")}
            </h2>
            <ul className="text-on-table-2 mt-3 flex max-w-[40rem] list-disc flex-col gap-2 pl-5 text-base leading-relaxed">
              {tips.map((tip) => (
                <li key={tip.text}>
                  {t(tip.text)}
                  {tip.link && (
                    <>
                      {" "}
                      <Link href={tip.link.href} className={`${linkClass} underline`}>
                        {t(tip.link.label)}
                      </Link>
                      .
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <nav aria-label={t("Weiter|Hilfe")} className="border-on-table-2/25 mt-14 flex flex-wrap items-baseline justify-between gap-4 border-t pt-5">
          <Link href={HELP_PATH} className={`${linkClass} text-on-table-2 inline-flex items-center gap-1 text-sm`}>
            <ChevronLeft aria-hidden className="size-3.5" />
            {t("Alle Anleitungen")}
          </Link>
          {next && (
            <Link href={guidePath(next.slug)} className={`${linkClass} inline-flex items-center gap-1 text-base font-semibold`}>
              {t("Weiter: {title}", { title: t(next.title) })}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          )}
        </nav>
      </article>
    </main>
  );
}
