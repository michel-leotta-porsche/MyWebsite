import type { Metadata } from "next";

// Vorschau für geteilte Links (WhatsApp, Signal, Mail …). Seiten mit eigenem openGraph überschreiben das
// ganze Objekt (Next führt Metadaten nur flach zusammen), deshalb bauen sie es hiermit neu.
export const SITE_URL = "https://fujiventura.web.app";

// Wortmarke und Buch im Ringelblumen-Leinen mit Foto im Fenster, 1200×630. Neuer Dateiname, damit Messenger die alte Vorschau nicht aus dem Cache holen
const image = { url: "/og-buch.jpg", width: 1200, height: 630, alt: "Fujiventura: Fotobuch im gelben Leineneinband mit einer Mittagsblume im Titelfenster" };

export function shareMeta(title: string, description: string): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: { title, description, images: [image], locale: "de_DE", type: "website", siteName: "Fujiventura" },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
