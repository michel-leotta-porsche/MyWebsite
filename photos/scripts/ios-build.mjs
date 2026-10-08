// Baut die App-Fassung (NEXT_PUBLIC_APP=1) als statischen Export, prüft sie wie den Web-Deploy
// (Impressum mit Anschrift, Pflichtseiten, keine fehlenden Dateien) und kopiert sie ins Xcode-Projekt.
// Danach in Xcode: ios/App/App.xcodeproj öffnen, Gerät wählen, Run. Siehe ios/README.md.
import { execSync } from "node:child_process";
import { readFile, rm, rename } from "node:fs/promises";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const run = (cmd, env = {}) => execSync(cmd, { cwd: root, stdio: "inherit", env: { ...process.env, ...env } });

// Testmodus darf nie in die App, auch nicht über .env.local
const envFile = await readFile(path.join(root, ".env.local"), "utf8").catch(() => "");
if (process.env.NEXT_PUBLIC_FUJI_MOCK === "1" || /^\s*NEXT_PUBLIC_FUJI_MOCK\s*=\s*"?1/m.test(envFile)) {
  console.error("NEXT_PUBLIC_FUJI_MOCK=1 ist gesetzt: die App würde ohne Firebase laufen. Abbruch.");
  process.exit(1);
}

run("npm run export", { NEXT_PUBLIC_APP: "1" });
run("node scripts/check-export.mjs");
// out/ gehört dem Web-Deploy; die App bekommt ihre eigene Kopie
await rm(path.join(root, "out-app"), { recursive: true, force: true });
await rename(path.join(root, "out"), path.join(root, "out-app"));
run("npx cap sync ios");
console.log("App-Fassung liegt in ios/App/App/public. Weiter in Xcode.");
