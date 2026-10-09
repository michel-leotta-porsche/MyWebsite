import type { Metadata } from "next";
import { preload } from "react-dom";

import { AppStart } from "@/components/app-start";
import { Landing } from "@/components/landing";
import { IS_APP } from "@/lib/app-mode";

export const metadata: Metadata = {
  title: "Calima · Fotobücher zum Blättern",
  description:
    "Deine Fotos als Buch zum Umblättern, mit dem Fuji-Rezept aus der Datei. Gestalten, Freunden hinlegen, Zettel zurückbekommen.",
};

export default function Home() {
  // Die App startet ohne Landing: kurz anmelden, dann gleich ins Bücherzimmer
  if (IS_APP) return <AppStart />;
  // Leinen des Einbands: ohne Hinweis findet der Browser es erst im CSS. Das Korn des Tischs ist nur ein Hauch und darf warten.
  preload("/textures/linen-weft.webp", { as: "image", fetchPriority: "high" });
  preload("/textures/linen-warp.webp", { as: "image", fetchPriority: "high" });
  return <Landing />;
}
