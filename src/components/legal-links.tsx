"use client";

import Link from "next/link";

import { hitClass } from "@/components/ui-classes";
import { setLang, useLang, useT, type Lang } from "@/lib/i18n";

const small = `${hitClass} text-on-table-2 decoration-mark decoration-2 underline-offset-4 transition-colors duration-150 hover:text-on-table hover:underline`;

const NAMES: Record<Lang, string> = { de: "Deutsch", en: "English" };

/** Sprachwahl: die andere Sprache als Link, in ihrer eigenen Schreibweise */
export function LangSwitch({ className = "" }: { className?: string }) {
  const lang = useLang();
  const other: Lang = lang === "de" ? "en" : "de";
  return (
    <button type="button" lang={other} onClick={() => setLang(other)} className={`${small} ${className}`}>
      {NAMES[other]}
    </button>
  );
}

/** Die Pflichtlinks, die Hilfe und die Sprachwahl, für Fußzeilen und neben der Anmeldung */
export function LegalLinks({ className = "" }: { className?: string }) {
  const t = useT();
  return (
    <nav aria-label={t("Rechtliches")} className={`flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm ${className}`}>
      <Link href="/impressum" className={small}>
        {t("Impressum")}
      </Link>
      <Link href="/datenschutz" className={small}>
        {t("Datenschutz")}
      </Link>
      <Link href="/hilfe" className={small}>
        {t("Hilfe")}
      </Link>
      <LangSwitch />
    </nav>
  );
}
