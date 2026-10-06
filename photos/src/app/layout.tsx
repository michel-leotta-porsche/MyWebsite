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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={bricolage.variable}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
