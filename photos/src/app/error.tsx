"use client"; // Fehlergrenzen sind Client-Komponenten

import Link from "next/link";
import { useEffect } from "react";

import { Wordmark } from "@/components/ui-base";
import { buttonClass } from "@/components/ui/button-class";

/** Eigene Fehlerseite statt der englischen von Next: in der App gibt es keine Zurück-Taste des Browsers */
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main lang="de" className="linen table-surface relative flex min-h-svh flex-col bg-table">
      <header className="px-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-8 md:pt-6">
        <Wordmark />
      </header>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-24">
        <h1 className="text-on-table text-3xl font-bold tracking-[-0.03em]" style={{ fontVariationSettings: '"wdth" 80' }}>
          Da ist etwas schiefgegangen.
        </h1>
        <p className="text-on-table-2 mt-3 text-base leading-relaxed">Lade die Seite neu oder geh zurück ins Bücherzimmer.</p>
        <p className="mt-8 flex flex-wrap gap-2">
          <button type="button" onClick={() => retry()} className={buttonClass("cloth")}>
            Noch einmal versuchen
          </button>
          <Link href="/zimmer" className={buttonClass("quiet")}>
            Zum Bücherzimmer
          </Link>
        </p>
      </div>
    </main>
  );
}
