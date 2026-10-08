import type { Metadata } from "next";

import { Editor } from "@/components/editor";

export const metadata: Metadata = {
  title: "Werkbank · Calima",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <Editor />;
}
