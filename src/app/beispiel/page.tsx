import type { Metadata } from "next";

import { SampleBook } from "@/components/sample-book";
import { shareMeta } from "@/lib/share-meta";

export const metadata: Metadata = {
  title: "Fuerteventura · ein Beispielbuch · Calima",
  description: "Ein Fotobuch zum Umblättern, von Michel Leotta. Zum Anschauen, ohne Konto.",
  ...shareMeta("Fuerteventura · ein Beispielbuch", "Ein Fotobuch zum Umblättern, von Michel Leotta. Zum Anschauen, ohne Konto."),
};

export default function Page() {
  return <SampleBook />;
}
