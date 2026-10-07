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
    "Sechsundzwanzig Fotografien von Fuerteventura, gebunden als Buch zum Durchblättern.",
};

export const viewport: Viewport = {
  themeColor: "#1b1917",
  viewportFit: "cover",
};

// Läuft vor dem ersten Bild: Einstieg nur einmal pro Sitzung und nie bei reduzierter Bewegung
// ?ohne=intro,schatten,struktur,biegung schaltet Teile ab, um Probleme auf einem Gerät einzugrenzen
const introScript = `try{var h=document.documentElement,o=(new URLSearchParams(location.search).get("ohne")||"").split(",");if(o.indexOf("alles")>-1)o=["intro","schatten","struktur","biegung"];o.forEach(function(x){if(x)h.classList.add("ohne-"+x)});if(o.indexOf("intro")<0&&!matchMedia("(prefers-reduced-motion: reduce)").matches&&!sessionStorage.getItem("intro"))h.classList.add("intro")}catch(e){}`;

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
