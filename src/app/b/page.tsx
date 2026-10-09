import type { Metadata } from "next";

import { GuestBook } from "@/components/guest-book";
import { shareMeta } from "@/lib/share-meta";

export const metadata: Metadata = {
  title: "Ein Buch für dich · Calima",
  description: "Jemand hat dir ein Fotobuch hingelegt.",
  // die Seite ist statisch und kennt das Buch nicht: die Vorschau sagt nur, dass etwas wartet
  ...shareMeta("Ein Buch für dich", "Jemand hat dir ein Fotobuch hingelegt. Zum Blättern, ohne Konto."),
  robots: { index: false, follow: false },
};

export default function Page() {
  return <GuestBook />;
}
