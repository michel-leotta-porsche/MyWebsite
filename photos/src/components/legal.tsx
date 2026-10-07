import Link from "next/link";
import type { ReactNode } from "react";

import { Wordmark } from "@/components/app-ui";

// Impressum und Datenschutz: ein ruhiger Tisch mit einer Textspalte, gleicher Kopf wie die Räume.

/** Wer die Seite betreibt. Steht an einer Stelle, Impressum und Datenschutz lesen von hier */
export const OPERATOR = {
  name: "Michel Leotta",
  // Ladungsfähige Anschrift (§ 5 DDG, § 18 MStV). Steht nicht im öffentlichen Repo, sondern beim Build in
  // FUJI_IMPRESSUM_ADRESSE (z. B. photos/.env.local), Zeilen mit „|“ getrennt. Ohne sie bricht check-export den Deploy ab.
  address: (process.env.FUJI_IMPRESSUM_ADRESSE ?? "ANSCHRIFT FEHLT")
    .split("|")
    .map((l) => l.trim())
    .filter(Boolean),
  email: "michel.leotta@hotmail.com",
};

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="linen table-surface relative flex min-h-svh flex-col bg-table">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-4 pt-4 md:px-8 md:pt-6">
        <Wordmark />
        <LegalLinks />
      </header>
      <article className="mx-auto w-full max-w-2xl flex-1 px-4 pt-14 pb-20 md:px-8 md:pt-20">
        <h1 className="text-on-table text-4xl leading-[0.95] font-bold tracking-[-0.03em] md:text-6xl" style={{ fontVariationSettings: '"wdth" 78, "opsz" 72' }}>
          {title}
        </h1>
        <div className="mt-10 flex flex-col gap-10">{children}</div>
      </article>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-on-table-2/25 border-t pt-5">
      <h2 className="text-on-table text-xl font-semibold tracking-[-0.01em]">{title}</h2>
      <div className="text-on-table-2 mt-3 flex max-w-[64ch] flex-col gap-3 text-base leading-relaxed">{children}</div>
    </section>
  );
}

export function Mail() {
  return (
    <a href={`mailto:${OPERATOR.email}`} className="text-on-table decoration-mark decoration-2 underline-offset-4 hover:underline focus-visible:underline">
      {OPERATOR.email}
    </a>
  );
}

const small = "text-on-table-2 decoration-mark decoration-2 underline-offset-4 transition-colors duration-150 hover:text-on-table hover:underline";

/** Die beiden Pflichtlinks, für Fußzeilen und neben der Anmeldung */
export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Rechtliches" className={`flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm ${className}`}>
      <Link href="/impressum" className={small}>
        Impressum
      </Link>
      <Link href="/datenschutz" className={small}>
        Datenschutz
      </Link>
    </nav>
  );
}
