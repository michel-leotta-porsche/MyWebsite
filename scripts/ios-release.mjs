// Ein Befehl für TestFlight: neuesten Hauptstand holen, App-Fassung bauen, archivieren und zu Apple hochladen.
// Läuft auf dem Mac (`npm run ios:release`); signiert und lädt mit dem Apple-Konto, das in Xcode angemeldet ist.
// Die Build-Nummer ist Datum und Uhrzeit, damit sie immer höher ist als die letzte.
import { execSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const out = path.join(root, "ios", "App", "build");
const run = (cmd) => execSync(cmd, { cwd: root, stdio: "inherit" });
const read = (cmd) => execSync(cmd, { cwd: root, encoding: "utf8" }).trim();

if (process.platform !== "darwin") {
  console.error("Nur auf dem Mac: Archivieren und Hochladen brauchen Xcode.");
  process.exit(1);
}

// Hochgeladen wird immer der Hauptstand, nie ein halbfertiger Zweig
if (read("git rev-parse --abbrev-ref HEAD") !== "main") {
  console.error("Bitte zuerst `git checkout main`, hochgeladen wird nur der Hauptstand.");
  process.exit(1);
}
run("git pull --ff-only");
run("npm ci");
run("npm run ios:build");

const d = new Date();
const two = (n) => String(n).padStart(2, "0");
const build = `${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}${two(d.getHours())}${two(d.getMinutes())}`;
const commit = read("git log -1 --format=%h·%s");

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
const archive = path.join(out, "Calima.xcarchive");
run(
  `xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -destination generic/platform=iOS ` +
    `-archivePath "${archive}" -allowProvisioningUpdates CURRENT_PROJECT_VERSION=${build} archive`,
);

// destination upload: xcodebuild lädt direkt zu App Store Connect, wie „Distribute App → App Store Connect → Upload“
const options = path.join(out, "ExportOptions.plist");
await writeFile(
  options,
  `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>method</key><string>app-store-connect</string>
	<key>destination</key><string>upload</string>
	<key>signingStyle</key><string>automatic</string>
	<key>teamID</key><string>F8NKDCY59H</string>
	<key>manageAppVersionAndBuildNumber</key><false/>
</dict>
</plist>
`,
);
run(`xcodebuild -exportArchive -archivePath "${archive}" -exportOptionsPlist "${options}" -exportPath "${path.join(out, "export")}" -allowProvisioningUpdates`);

console.log(`\nBuild ${build} ist bei Apple (Stand ${commit}).`);
console.log("Nach der Verarbeitung (meist 5–30 Minuten) erscheint er in TestFlight; die Mail von Apple sagt Bescheid.");
