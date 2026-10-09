import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Caveat, IBM_Plex_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { langScript } from "@/lib/lang";
import { shareMeta, SITE_URL } from "@/lib/share-meta";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["wdth", "opsz"],
});
// Schriften für Textrahmen im Editor: nicht vorgeladen, sie kommen erst, wenn ein Text sie nutzt
const serif = Newsreader({ variable: "--font-serif", subsets: ["latin"], style: ["normal", "italic"], preload: false });
const mono = IBM_Plex_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "700"], style: ["normal", "italic"], preload: false });
const hand = Caveat({ variable: "--font-hand", subsets: ["latin"], preload: false });

const title = "Calima · Fotobücher zum Blättern";
const description = "Deine Fotos als Buch zum Umblättern. Gestalten, Freunden hinlegen, Zettel zurückbekommen.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  ...shareMeta(title, description),
};

export const viewport: Viewport = {
  themeColor: "#1b1917",
  viewportFit: "cover",
};

// Läuft vor dem ersten Bild: ?ohne=schatten,struktur,biegung schaltet Teile ab, um Probleme auf einem Gerät einzugrenzen
const flagScript = `try{var h=document.documentElement,o=(new URLSearchParams(location.search).get("ohne")||"").split(",");if(o.indexOf("alles")>-1)o=["schatten","struktur","biegung"];o.forEach(function(x){if(x)h.classList.add("ohne-"+x)})}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: das Startskript setzt Klassen (ohne-…) und die Sprache vor React
    <html lang="de" className={`${bricolage.variable} ${serif.variable} ${mono.variable} ${hand.variable}`} suppressHydrationWarning>
      <body className="min-h-svh">
        <script dangerouslySetInnerHTML={{ __html: flagScript + langScript }} />
        {children}
      </body>
    </html>
  );
}
