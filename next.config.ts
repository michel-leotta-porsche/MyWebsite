import path from "node:path";
import type { NextConfig } from "next";

// STATIC_EXPORT=1 baut eine statische Fassung nach out/ (zum Hosten ohne Server)
const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  // Eigenes Projekt im Repo der Hauptseite: Wurzel festnageln, sonst greift Turbopack nach oben
  turbopack: { root: path.join(__dirname) },
  outputFileTracingRoot: path.join(__dirname),
  // Entwicklung: Bilder aus Firebase Storage über den Bildserver erlauben
  images: { remotePatterns: [{ protocol: "https", hostname: "firebasestorage.googleapis.com" }] },
  ...(staticExport && {
    output: "export",
    // feste Breiten statt Bildserver, siehe src/image-loader.ts
    images: { loader: "custom", loaderFile: "./src/image-loader.ts" },
  }),
};

export default nextConfig;
