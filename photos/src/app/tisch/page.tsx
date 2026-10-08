import type { Metadata } from "next";

import { Moved } from "./moved";

// Die Werkbank als eigener Raum ist im Bücherzimmer aufgegangen; alte Lesezeichen führen dorthin
export const metadata: Metadata = {
  title: "Bücherzimmer · Calima",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <Moved />;
}
