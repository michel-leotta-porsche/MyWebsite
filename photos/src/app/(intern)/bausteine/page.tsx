import type { Metadata } from "next";

import { Bausteine } from "./bausteine";

export const metadata: Metadata = {
  title: "Bausteine · Calima",
  description: "Die Werkzeug-Bausteine von Calima: Knöpfe, Blatt, Menü, Hinweis, Liste, Feld, Farbwahl.",
};

export default function Page() {
  return <Bausteine />;
}
