// Baut die App-Fassung (NEXT_PUBLIC_APP=1) als statischen Export, prüft sie wie den Web-Deploy
// (Impressum mit Anschrift, Pflichtseiten, keine fehlenden Dateien) und kopiert sie ins Xcode-Projekt.
// Danach in Xcode: ios/App/App.xcodeproj öffnen, Gerät wählen, Run. Siehe ios/README.md.
import { execSync } from "node:child_process";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const run = (cmd, env = {}) => execSync(cmd, { cwd: root, stdio: "inherit", env: { ...process.env, ...env } });

// Testmodus darf nie in die App, auch nicht über .env.local
const envFile = await readFile(path.join(root, ".env.local"), "utf8").catch(() => "");
if (process.env.NEXT_PUBLIC_FUJI_MOCK === "1" || /^\s*NEXT_PUBLIC_FUJI_MOCK\s*=\s*"?1/m.test(envFile)) {
  console.error("NEXT_PUBLIC_FUJI_MOCK=1 ist gesetzt: die App würde ohne Firebase laufen. Abbruch.");
  process.exit(1);
}

// Firebase-Konfiguration der iOS-App (Firebase-Konsole → Projekteinstellungen → iOS-App app.calima).
// Ohne sie stürzt die App beim Start ab; Google braucht zudem ihr REVERSED_CLIENT_ID als URL-Schema.
const appDir = path.join(root, "ios", "App", "App");
const serviceInfo = await readFile(path.join(appDir, "GoogleService-Info.plist"), "utf8").catch(() => null);
if (!serviceInfo) {
  console.error("ios/App/App/GoogleService-Info.plist fehlt. Siehe ios/README.md, Abschnitt Anmelden.");
  process.exit(1);
}
const reversed = serviceInfo.match(/<key>REVERSED_CLIENT_ID<\/key>\s*<string>([^<]+)<\/string>/)?.[1];
if (!reversed) {
  console.error("GoogleService-Info.plist ohne REVERSED_CLIENT_ID: in Firebase Google als Anbieter aktivieren und die Datei neu laden.");
  process.exit(1);
}
const infoPath = path.join(appDir, "Info.plist");
const info = await readFile(infoPath, "utf8");
if (!info.includes(reversed)) {
  const urlTypes = `\t<key>CFBundleURLTypes</key>\n\t<array>\n\t\t<dict>\n\t\t\t<key>CFBundleURLSchemes</key>\n\t\t\t<array>\n\t\t\t\t<string>${reversed}</string>\n\t\t\t</array>\n\t\t</dict>\n\t</array>\n`;
  if (info.includes("<key>CFBundleURLTypes</key>")) {
    console.error("Info.plist hat schon ein anderes URL-Schema: REVERSED_CLIENT_ID von Hand eintragen.");
    process.exit(1);
  }
  await writeFile(infoPath, info.replace("<key>CFBundleDevelopmentRegion</key>", `${urlTypes.trimStart()}\t<key>CFBundleDevelopmentRegion</key>`));
  console.log(`URL-Schema für Google eingetragen: ${reversed}`);
}

run("npm run export", { NEXT_PUBLIC_APP: "1" });
run("node scripts/check-export.mjs");
// out/ gehört dem Web-Deploy; die App bekommt ihre eigene Kopie
await rm(path.join(root, "out-app"), { recursive: true, force: true });
await rename(path.join(root, "out"), path.join(root, "out-app"));
run("npx cap sync ios");
console.log("App-Fassung liegt in ios/App/App/public. Weiter in Xcode.");
