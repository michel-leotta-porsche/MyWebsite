import type { Metadata } from "next";

import { KanoSurvey } from "@/components/qfd/kano-survey";

export const metadata: Metadata = {
  title: "Fragebogen · Fujiventura",
  description: "Zwei Minuten: Was ist dir bei Fotobüchern wichtig?",
};

export default function Page() {
  return <KanoSurvey />;
}
