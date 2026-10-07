import type { Metadata } from "next";

import { Editor } from "@/components/editor";

export const metadata: Metadata = {
  title: "Buch gestalten · Fujiventura",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <Editor />;
}
