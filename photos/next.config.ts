import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Eigenes Projekt im Repo der Hauptseite: Wurzel festnageln, sonst greift Turbopack nach oben
  turbopack: { root: path.join(__dirname) },
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
