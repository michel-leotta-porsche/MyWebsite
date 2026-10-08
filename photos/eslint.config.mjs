import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    // App-Fassung und ihre Kopie im Xcode-Projekt (npm run ios:build)
    "out-app/**",
    "ios/**",
    "build/**",
    "next-env.d.ts",
    // Skills und Werkzeuge, kein eigener Code:
    ".claude/**",
    ".impeccable/**",
  ]),
]);

export default eslintConfig;
