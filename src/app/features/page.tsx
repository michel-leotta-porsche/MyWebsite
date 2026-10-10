import type { Metadata } from "next";

import { FeaturesPage } from "@/components/features-page";
import { shareMeta } from "@/lib/share-meta";

// Englische Adresse derselben Seite; die Sprache kommt wie überall vom Gerät
const title = "What Calima does";
const description = "Make books, edit photos, Fuji recipes and Lightroom presets as notes, hand books over: every feature with pictures from the app.";

export const metadata: Metadata = {
  title: `${title} · Calima`,
  description,
  alternates: { languages: { de: "/funktionen" } },
  ...shareMeta(title, description),
};

export default function Page() {
  return <FeaturesPage />;
}
