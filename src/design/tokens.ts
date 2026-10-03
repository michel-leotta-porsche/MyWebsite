/*
 * Dokumentation der Tokens für /styleguide. Quelle der Wahrheit ist src/app/globals.css.
 * Wer dort einen Wert ändert, ändert ihn hier mit.
 */
export const colorTokens = [
  { token: "paper", name: "Papier", use: "Hintergrund", light: "#EFEEEA", dark: "#131311" },
  { token: "paper-2", name: "Papier 2", use: "Code, Flächen", light: "#E6E5E0", dark: "#1B1B18" },
  { token: "ink", name: "Tinte", use: "Text, Linie oben", light: "#1A1A18", dark: "#ECEBE6" },
  { token: "ink-2", name: "Text 2", use: "Fließtext sekundär", light: "#4B4A46", dark: "#BDBCB6" },
  { token: "ink-3", name: "Text 3", use: "Labels, Metadaten", light: "#63625D", dark: "#8F8E88" },
  { token: "line", name: "Linie", use: "Trenner, Fugen", light: "#D2D0C9", dark: "#2E2D29" },
  { token: "signal", name: "Signal", use: "Marker, Balken, Punkt", light: "#FFB224", dark: "#FFB224" },
  { token: "signal-ink", name: "Signal-Text", use: "Text, Fokus", light: "#8A5300", dark: "#FFB224" },
] as const

export const typeScale = [
  { cls: "t-display", spec: "600 · clamp(40–83px) / 1 · −0.045em", sample: "KI-Produkte im Alltag" },
  { cls: "t-h2", spec: "600 · clamp(32–58px) / 1 · −0.04em", sample: "Gebaut, betrieben, genutzt." },
  { cls: "t-h3", spec: "600 · clamp(22–32px) / 1.12 · −0.03em", sample: "Testspezifikationen aus Anforderungen" },
  { cls: "t-h4", spec: "500 · 19px / 1.25 · −0.02em", sample: "GraphRAG mit Neo4j" },
  { cls: "t-lede", spec: "400 · clamp(17–20px) / 1.6", sample: "Einleitungen und Teaser stehen eine Stufe über dem Fließtext." },
  { cls: "t-body", spec: "400 · 17px / 1.6", sample: "Fließtext ist normal gesetzt, nie in Versalien." },
  { cls: "t-small", spec: "400 · 15px / 1.5", sample: "Beschreibungen in Listen und Karten." },
  { cls: "t-label", spec: "Mono 500 · 12px · Versalien · 0.12em", sample: "Projekte · 2025" },
  { cls: "t-data", spec: "Mono 400 · 13px / 1.5 · tabellarisch", sample: "Python · React · AWS · 12 Testfälle" },
] as const

export const motionTokens = [
  { token: "--dur-1", value: "160ms", use: "Farbe, Linienfarbe" },
  { token: "--dur-2", value: "500ms", use: "Balken, Pfeile, Unterstriche" },
  { token: "--dur-3", value: "900ms", use: "Große Wege, Ablauf" },
  { token: "--ease-out-expo", value: "cubic-bezier(.19, 1, .22, 1)", use: "Standard für alles, was ankommt" },
  { token: "--ease-in-out-cubic", value: "cubic-bezier(.645, .045, .355, 1)", use: "Hin und zurück" },
] as const

export const spaceTokens = [
  { token: "--gutter", value: "clamp(16px, 4.4vw, 64px)", util: "px-gutter" },
  { token: "--col-gap", value: "20px", util: "gap-x-col" },
  { token: "--section-gap", value: "clamp(88px, 11vw, 160px)", util: "mt-section" },
] as const
