/// <reference types="@capacitor-firebase/authentication" />

import type { CapacitorConfig } from "@capacitor/cli";

// iOS-App: dieselbe statische Fassung wie die Website, aber aus dem App-Bundle (out-app/), keine server.url
const config: CapacitorConfig = {
  appId: "app.calima",
  appName: "Calima",
  webDir: "out-app",
  // Tischfarbe hinter der Webansicht, damit beim Start und beim Überscrollen nichts weiß aufblitzt
  backgroundColor: "#1b1917",
  ios: {
    // Ränder regelt die Seite selbst über env(safe-area-inset-*)
    contentInset: "never",
  },
  plugins: {
    // Nur das native Fenster von Apple und Google; angemeldet wird im Web-SDK (src/lib/firebase.ts)
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ["apple.com", "google.com"],
    },
  },
  experimental: {
    ios: {
      spm: {
        swiftToolsVersion: "6.1",
        // Laut Plugin-Doku nötig gegen einen Namenskonflikt der Swift-Pakete; Facebook-SDK bleibt draußen
        packageOptions: { "@capacitor-firebase/authentication": { symlink: true } },
        packageTraits: { "@capacitor-firebase/authentication": ["Google"] },
      },
    },
  },
};

export default config;
