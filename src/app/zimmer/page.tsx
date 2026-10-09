import type { Metadata } from "next";

import { BookRoom } from "@/components/book-room";

export const metadata: Metadata = {
  title: "Bücherzimmer · Calima",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <BookRoom />;
}
