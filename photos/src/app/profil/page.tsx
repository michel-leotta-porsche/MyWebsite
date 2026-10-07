import type { Metadata } from "next";

import { Profile } from "@/components/profile";

export const metadata: Metadata = {
  title: "Profil · Fujiventura",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <Profile />;
}
