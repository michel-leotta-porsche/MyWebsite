import type { Metadata } from "next";
import { preload } from "react-dom";

import { Intro } from "@/components/intro";
import { Library } from "@/components/books";
import { LandingHero, LandingRooms } from "@/components/landing";
import { books } from "@/content/books";

export const metadata: Metadata = {
  title: "Fujiventura · Fotobücher zum Blättern",
  description:
    "Deine Fotos als Buch zum Umblättern, mit dem Fuji-Rezept aus der Datei. Gestalten, Freunden hinlegen, Zettel zurückbekommen. Mit Leseprobe aus Fuerteventura und Japan.",
};

export default function Home() {
  // Gewebe von Tisch und Einbänden liegen hinter allem. Ohne Hinweis findet der Browser sie erst im CSS.
  preload("/textures/linen-weft.webp", { as: "image", fetchPriority: "high" });
  preload("/textures/linen-warp.webp", { as: "image", fetchPriority: "high" });
  preload("/textures/stone-grain.webp", { as: "image" });
  preload("/textures/stone-cloud.webp", { as: "image" });
  return (
    <main>
      <Intro />
      <Library
        books={books}
        before={<LandingHero />}
        table={{
          label: "Leseprobe: zwei Bücher von Michel Leotta",
          title: (
            <h2 id="leseprobe" className="text-on-table scroll-mt-4 text-lg font-bold tracking-[-0.02em]" style={{ fontVariationSettings: '"wdth" 80' }}>
              Leseprobe
            </h2>
          ),
        }}
        footer={<LandingRooms />}
      />
    </main>
  );
}
