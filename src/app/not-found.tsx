import type { Metadata } from "next";
import Link from "next/link";

import { Wordmark } from "@/components/ui-base";
import { buttonClass } from "@/components/ui/button-class";
import { T } from "@/lib/i18n";

export const metadata: Metadata = { title: "Nicht gefunden · Calima" };

/** Eigene 404 statt der englischen von Next: mit Weg zurück, denn in der App fehlt die Zurück-Taste des Browsers */
export default function NotFound() {
  return (
    <main className="linen table-surface relative flex min-h-svh flex-col bg-table">
      <header className="px-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-8 md:pt-6">
        <Wordmark />
      </header>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-24">
        <h1 className="text-on-table text-3xl font-bold tracking-[-0.03em]" style={{ fontVariationSettings: '"wdth" 80' }}>
          <T>Diese Seite gibt es nicht.</T>
        </h1>
        <p className="text-on-table-2 mt-3 text-base leading-relaxed">
          <T>Vielleicht ist der Link alt oder unvollständig.</T>
        </p>
        <p className="mt-8 flex flex-wrap gap-2">
          <Link href="/zimmer" className={buttonClass("cloth")}>
            <T>Zum Bücherzimmer</T>
          </Link>
          <Link href="/" className={buttonClass("quiet")}>
            <T>Zur Startseite</T>
          </Link>
        </p>
      </div>
    </main>
  );
}
