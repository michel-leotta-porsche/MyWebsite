import type { Metadata } from "next";

import { GuestBook } from "@/components/guest-book";

export const metadata: Metadata = {
  title: "Ein Buch für dich · Fujiventura",
  description: "Jemand hat dir ein Fotobuch hingelegt.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <GuestBook />;
}
