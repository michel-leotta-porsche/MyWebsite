import type { Metadata } from "next";
import { preload } from "react-dom";

import { Landing } from "@/components/landing";

export const metadata: Metadata = {
  title: "Fujiventura · Fotobücher zum Blättern",
  description:
    "Deine Fotos als Buch zum Umblättern, mit dem Fuji-Rezept aus der Datei. Gestalten, Freunden hinlegen, Zettel zurückbekommen.",
};

export default function Home() {
  // Gewebe von Tisch und Einband liegen hinter allem. Ohne Hinweis findet der Browser sie erst im CSS.
  preload("/textures/linen-weft.webp", { as: "image", fetchPriority: "high" });
  preload("/textures/linen-warp.webp", { as: "image", fetchPriority: "high" });
  preload("/textures/stone-grain.webp", { as: "image" });
  preload("/textures/stone-cloud.webp", { as: "image" });
  return <Landing />;
}
