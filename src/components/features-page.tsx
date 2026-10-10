"use client";

import Image from "next/image";
import Link from "next/link";

import { Aperture, ArrowRight, ChevronLeft, Film, Pipette, Smartphone } from "lucide-react";

import { display, displayHeading, EnterButton, narrow } from "@/components/landing";
import { LegalLinks } from "@/components/legal-links";
import { linkClass } from "@/components/ui-base";
import { buttonClass } from "@/components/ui/button";
import { FEATURE_GROUPS, shotOf, type Feature } from "@/lib/features";
import { useLang, useT } from "@/lib/i18n";
import { TESTFLIGHT_URL } from "@/lib/landing";
import { SAMPLE_PATH } from "@/lib/sample-book";

// Seite „Was Calima kann“ (#267): nach Absicht gruppiert, je Funktion ein Bildschirmfoto aus der App (je Sprache)
// und höchstens zwei Sätze. Am Ende: erst blättern, dann anmelden, wie auf der Landing.

const APP_ICONS: Record<string, typeof Aperture> = { look: Aperture, film: Film, white: Pipette };

/** Bildschirmfoto wie ein Abzug auf dem Tisch: heller Rand, leichter Schatten */
function Shot({ f }: { f: Feature }) {
  const t = useT();
  const lang = useLang();
  const src = shotOf(f, lang);
  if (!src) return null;
  return (
    <Image
      src={src}
      alt={t("Bildschirmfoto: {title}", { title: t(f.title) })}
      width={585}
      height={Math.round(585 / (f.ratio ?? 0.5))}
      // schon in der Größe gespeichert, in der es gebraucht wird: kein Bildserver
      unoptimized
      loading="lazy"
      className="bg-paper w-full rounded-[10px] border-[5px] border-paper shadow-[0_24px_40px_-18px_rgb(12_10_8/0.75),0_6px_12px_-6px_rgb(12_10_8/0.5)]"
    />
  );
}

function FeatureItem({ f }: { f: Feature }) {
  const t = useT();
  const Icon = APP_ICONS[f.id];
  return (
    // ab Tablet teilen sich die Funktionen einer Reihe die Zeilen (subgrid): Bilder stehen unten bündig, Titel auf einer Linie
    <li className="flex flex-col sm:row-span-4 sm:grid sm:grid-rows-subgrid">
      {f.app ? (
        Icon && <Icon aria-hidden className="text-on-table-2 size-6" strokeWidth={1.75} />
      ) : (
        <div className="mx-auto w-[78%] max-w-[300px] sm:mx-0 sm:w-full sm:self-end">
          <Shot f={f} />
        </div>
      )}
      <h3 className={`text-on-table text-2xl font-bold tracking-[-0.02em] ${f.app ? "mt-4" : "mt-7"}`} style={narrow}>
        {t(f.title)}
      </h3>
      {f.app && (
        <p className="text-on-table-2 mt-1 flex items-center gap-1.5 text-sm font-semibold">
          <Smartphone aria-hidden className="size-3.5" />
          {t("Nur in der iPhone-App")}
        </p>
      )}
      <p className="text-on-table-2 mt-2 max-w-[30rem] text-base leading-relaxed lg:text-lg">{t(f.text)}</p>
    </li>
  );
}

export function FeaturesPage() {
  const t = useT();
  return (
    <main className="linen table-surface bg-table min-h-svh">
      <header className="px-page flex items-baseline justify-between gap-6 pt-[max(1rem,env(safe-area-inset-top))] md:pt-6 xl:pt-8">
        <Link href="/" className="text-on-table -ml-1 inline-flex min-h-11 items-center gap-0.5 text-lg font-bold tracking-[-0.02em] md:text-xl" style={narrow}>
          <ChevronLeft aria-hidden className="text-on-table-2 size-5" />
          Calima
        </Link>
        <Link href="/zimmer" className={`${linkClass} text-on-table-2 text-sm`}>
          {t("Bücherzimmer")}
        </Link>
      </header>

      <div className="px-page pt-12 pb-10 md:pt-20">
        <h1 className="text-on-table leading-[0.86] font-bold tracking-[-0.04em]" style={{ ...display, fontSize: "clamp(52px, 7.4vw, 112px)" }}>
          {t("Was Calima kann")}
        </h1>
        <p className="text-on-table mt-6 max-w-[34rem] text-lg leading-relaxed opacity-80 lg:text-xl">
          {t("Bücher machen, Fotos bearbeiten, Rezepte mitnehmen, Bücher hinlegen. Die Bilder sind aus der App, so wie sie heute aussieht.")}
        </p>
        <nav aria-label={t("Auf dieser Seite")} className="mt-8 flex flex-wrap gap-2">
          {FEATURE_GROUPS.map((g) => (
            <a key={g.id} href={`#${g.id}`} className={buttonClass("quiet", "sm")}>
              {t(g.title)}
            </a>
          ))}
        </nav>
      </div>

      {FEATURE_GROUPS.map((g, i) => (
        <section
          key={g.id}
          id={g.id}
          aria-labelledby={`${g.id}-h`}
          className={`px-page linen table-surface scroll-mt-4 py-20 md:py-28 ${i % 2 ? "bg-table" : "bg-table-deep"}`}
        >
          <div className="grid gap-6 md:grid-cols-12 md:gap-8">
            <h2 id={`${g.id}-h`} className={`${displayHeading} md:col-span-6`} style={display}>
              {t(g.title)}
            </h2>
            <div className="md:col-span-5 md:col-start-8 md:self-end">
              <p className="text-on-table text-lg leading-relaxed opacity-80 lg:text-xl">
                {g.id === "kamera" && TESTFLIGHT_URL ? t("Fotografieren wie mit der Fuji, und die Bilder landen gleich im Buch.") : t(g.lead)}{" "}
                {g.id === "kamera" && TESTFLIGHT_URL && (
                  <a href={TESTFLIGHT_URL} className={`${linkClass} font-semibold`}>
                    {t("Vorab testen mit TestFlight")}
                  </a>
                )}
              </p>
              <Link href={g.help} className={`${linkClass} text-on-table mt-4 inline-flex items-center gap-1 text-sm font-semibold`}>
                {t("So geht’s")}
                <ArrowRight aria-hidden className="size-3.5" />
              </Link>
            </div>
          </div>
          <ul
            className={`mt-14 grid gap-y-14 sm:gap-x-8 sm:gap-y-0 md:mt-16 ${
              g.features.length === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : g.features.length === 3 ? "md:grid-cols-3" : "sm:grid-cols-2 lg:max-w-[52rem]"
            }`}
          >
            {g.features.map((f) => (
              <FeatureItem key={f.id} f={f} />
            ))}
          </ul>
        </section>
      ))}

      <section aria-labelledby="ende-h" className="px-page linen table-surface bg-table-deep py-24 md:py-32">
        <h2 id="ende-h" className="text-on-table leading-[0.86] font-bold tracking-[-0.04em]" style={{ ...display, fontSize: "clamp(56px, 9vw, 144px)" }}>
          {t("Blätter mal.")}
        </h2>
        <p className="text-on-table mt-6 max-w-[34rem] text-lg leading-relaxed opacity-80 lg:text-xl">
          {t("Sieh dir an, wie es sich anfühlt: Michels Fuerteventura zum Umblättern, ohne Konto.")}
        </p>
        <Link href={SAMPLE_PATH} className={`${buttonClass("cloth", "md", "px-7")} mt-8`}>
          {t("Beispielbuch aufschlagen")}
          <ArrowRight aria-hidden />
        </Link>
        <h3 className="text-on-table mt-16 text-2xl font-bold tracking-[-0.02em] md:mt-20" style={narrow}>
          {t("Dann mach dein eigenes.")}
        </h3>
        <div className="mt-6">
          <EnterButton />
        </div>
      </section>

      <footer className="px-page text-on-table-2 bg-table-deep linen table-surface pb-10 text-sm">
        <div className="border-on-table-2/25 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t pt-6">
          <p>
            <span className="text-on-table font-semibold">Calima</span> · {t("Beispielfotos von Michel Leotta")}
          </p>
          <LegalLinks />
        </div>
      </footer>
    </main>
  );
}
