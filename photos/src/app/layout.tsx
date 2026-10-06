import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["wdth", "opsz"],
});

export const metadata: Metadata = {
  title: "Fujiventura · Fotografien von Michel Leotta",
  description:
    "Fünfzehn Fotografien von Fuerteventura, gebunden als Buch zum Durchblättern.",
};

export const viewport: Viewport = {
  themeColor: "#1d4f55",
  viewportFit: "cover",
};

// Läuft vor dem ersten Bild: Einstieg nur einmal pro Sitzung und nie bei reduzierter Bewegung
const introScript = `try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches&&!sessionStorage.getItem("intro"))document.documentElement.classList.add("intro")}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: das Startskript setzt die Klasse "intro" vor React
    <html lang="de" className={bricolage.variable} suppressHydrationWarning>
      <body className="min-h-svh">
        <script dangerouslySetInnerHTML={{ __html: introScript }} />
        {children}
      </body>
    </html>
  );
}
