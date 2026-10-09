import type { Metadata } from "next";
import type { ReactNode } from "react";

// Arbeitsstände (UX-Kritik, QFD-Workshop, Fragebogen): nur für die Entwicklung.
// Im statischen Export entfernt scripts/shrink-export.mjs sie, live gibt es sie nicht.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
