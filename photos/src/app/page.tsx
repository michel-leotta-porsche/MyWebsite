import { preload } from "react-dom";

import { Intro } from "@/components/intro";
import { Library } from "@/components/books";
import { books } from "@/content/books";

export default function Home() {
  // Gewebe von Tisch und Einbänden sind das größte sichtbare Element (LCP). Ohne Hinweis findet der
  // Browser sie erst im CSS und holt sie hinter den Abzügen des Einstiegs.
  preload("/textures/linen-weft.webp", { as: "image", fetchPriority: "high" });
  preload("/textures/linen-warp.webp", { as: "image", fetchPriority: "high" });
  preload("/textures/stone-grain.webp", { as: "image" });
  preload("/textures/stone-cloud.webp", { as: "image" });
  return (
    <main>
      <Intro />
      <Library
        books={books}
        footer={
          <footer className="linen table-surface relative hidden bg-table-deep px-4 py-10 text-sm text-on-table-2 md:block md:px-8">
            <p>
              <span className="font-semibold text-on-table">Fujiventura</span> · Fotografien von Michel Leotta,
              Fuerteventura und Japan
            </p>
          </footer>
        }
      />
    </main>
  );
}
