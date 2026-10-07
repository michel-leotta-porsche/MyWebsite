import type { Metadata } from "next";
import { preload } from "react-dom";

import { Landing } from "@/components/landing";

export const metadata: Metadata = {
  title: "Fujiventura · Fotobücher zum Blättern",
  description:
    "Deine Fotos als Buch zum Umblättern, mit dem Fuji-Rezept aus der Datei. Gestalten, Freunden hinlegen, Zettel zurückbekommen.",
};

export default function Home() {
  // Leinen des Einbands: ohne Hinweis findet der Browser es erst im CSS. Das Korn des Tischs ist nur ein Hauch und darf warten.
  preload("/textures/linen-weft.webp", { as: "image", fetchPriority: "high" });
  preload("/textures/linen-warp.webp", { as: "image", fetchPriority: "high" });
  return <Landing />;
}
