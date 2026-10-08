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
};

export default config;
