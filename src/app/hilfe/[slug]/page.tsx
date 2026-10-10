import type { Metadata } from "next";

import { GuidePage } from "@/components/help-page";
import { SLUGS, TITLES, type Slug } from "@/lib/help-map";

// Eine Seite je Anleitung (#215), beim Bauen fest erzeugt; andere Adressen unter /hilfe/ gibt es nicht
export const dynamicParams = false;

export function generateStaticParams() {
  return SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/hilfe/[slug]">): Promise<Metadata> {
  const slug = (await params).slug as Slug;
  return { title: `${TITLES[slug]} · Calima`, description: "Kurze Anleitung mit Bildern aus der Calima-Hilfe." };
}

export default async function Page({ params }: PageProps<"/hilfe/[slug]">) {
  return <GuidePage slug={(await params).slug as Slug} />;
}
