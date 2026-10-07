import type { Metadata } from "next";

import { MyTable } from "@/components/my-table";

export const metadata: Metadata = {
  title: "Mein Tisch · Fujiventura",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <MyTable />;
}
