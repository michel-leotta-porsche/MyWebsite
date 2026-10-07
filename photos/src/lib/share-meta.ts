import type { Metadata } from "next";

// Vorschau für geteilte Links (WhatsApp, Signal, Mail …). Seiten mit eigenem openGraph überschreiben das
// ganze Objekt (Next führt Metadaten nur flach zusammen), deshalb bauen sie es hiermit neu.
export const SITE_URL = "https://fujiventura.web.app";

// Ein Foto ohne Menschen, statisch auf 1200×630 zugeschnitten
const image = { url: "/og.jpg", width: 1200, height: 630, alt: "Mittagsblume auf Fuerteventura, Foto aus einem Fujiventura-Buch" };

export function shareMeta(title: string, description: string): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: { title, description, images: [image], locale: "de_DE", type: "website", siteName: "Fujiventura" },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
