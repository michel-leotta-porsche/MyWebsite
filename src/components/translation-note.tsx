"use client";

import { useLang } from "@/lib/i18n";

/** Nur auf Englisch: Rechtstexte sind übersetzt, verbindlich bleibt die deutsche Fassung. Steht bewusst nicht im Wörterbuch */
export function TranslationNote() {
  const lang = useLang();
  if (lang !== "en") return null;
  return <p className="text-on-table-2 mt-6 max-w-[64ch] text-sm leading-relaxed">This is a translation for convenience. The German version is legally binding.</p>;
}
