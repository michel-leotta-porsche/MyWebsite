import type { Metadata } from "next";

import { FeaturesPage } from "@/components/features-page";
import { shareMeta } from "@/lib/share-meta";

const title = "Was Calima kann";
const description = "Bücher machen, Fotos bearbeiten, Fuji-Rezepte und Lightroom-Presets als Zettel, Bücher hinlegen: alle Funktionen mit Bildern aus der App.";

export const metadata: Metadata = {
  title: `${title} · Calima`,
  description,
  alternates: { languages: { en: "/features" } },
  ...shareMeta(title, description),
};

export default function Page() {
  return <FeaturesPage />;
}
