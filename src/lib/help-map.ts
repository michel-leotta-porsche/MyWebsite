// Die Karte der Hilfe (#215) ohne Texte aus i18n: die Server-Seiten unter /hilfe/[slug] lesen nur das hier.
// Inhalte und Übersetzung stehen in lib/help.ts.

export const HELP_PATH = "/hilfe";

/** Der Weg Fotografieren → Abendstapel → Buch → Hinlegen → Lesen, daneben das Fotostudio */
export const MAP = ["kamera", "abendstapel", "erstes-buch", "hinlegen", "lesen"] as const;
export const ALSO = ["fotostudio"] as const;

export type Slug = (typeof MAP)[number] | (typeof ALSO)[number];

export const SLUGS: Slug[] = [...MAP, ...ALSO];

/** Die Fragen, wie in Welle 1; auch Seitentitel im Browser (deutsch wie die statische Seite) */
export const TITLES: Record<Slug, string> = {
  kamera: "Wie fotografiere ich mit Calima?",
  abendstapel: "Wie kommen die Fotos des Tages ins Buch?",
  "erstes-buch": "Wie mache ich mein erstes Buch?",
  hinlegen: "Wie lege ich ein Buch jemandem hin?",
  lesen: "Jemand hat mir ein Buch hingelegt. Wie lese ich es?",
  fotostudio: "Wie bearbeite ich Fotos im Fotostudio?",
};

/** Adresse einer Anleitung, mit step auf einen Schritt (1-basiert) */
export const guidePath = (slug: Slug, step?: number) => `${HELP_PATH}/${slug}${step ? `#schritt-${step}` : ""}`;
