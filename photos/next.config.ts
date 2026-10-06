import path from "node:path";
import type { NextConfig } from "next";

// STATIC_EXPORT=1 baut eine statische Fassung nach out/ (zum Hosten ohne Server)
const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  // Eigenes Projekt im Repo der Hauptseite: Wurzel festnageln, sonst greift Turbopack nach oben
  turbopack: { root: path.join(__dirname) },
  outputFileTracingRoot: path.join(__dirname),
  ...(staticExport && { output: "export", images: { unoptimized: true } }),
};

export default nextConfig;
