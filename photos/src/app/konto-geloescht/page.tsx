import type { Metadata } from "next";
import Link from "next/link";

import { Wordmark } from "@/components/ui-base";
import { linkClass } from "@/components/ui-classes";

export const metadata: Metadata = { title: "Konto gelöscht · Calima", robots: { index: false } };

/** Ziel nach „Konto löschen“: bestätigt, dass alles weg ist, und lässt einen Weg offen */
export default function Page() {
  return (
    <main className="linen table-surface relative flex min-h-svh flex-col bg-table">
      <header className="px-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-8 md:pt-6">
        <Wordmark />
      </header>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-24">
        <h1 className="text-on-table text-3xl font-bold tracking-[-0.03em]" style={{ fontVariationSettings: '"wdth" 80' }}>
          Dein Konto ist gelöscht.
        </h1>
        <p className="text-on-table-2 mt-3 text-base leading-relaxed">
          Deine Bücher, Fotos und geteilten Links sind weg. Danke, dass du Calima ausprobiert hast.
        </p>
        <p className="mt-8 text-base">
          <Link href="/" className={`${linkClass} underline`}>
            Zur Startseite
          </Link>
        </p>
      </div>
    </main>
  );
}
