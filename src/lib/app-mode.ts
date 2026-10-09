/**
 * Fassung für die iOS-App (npm run ios:build setzt NEXT_PUBLIC_APP=1). Beim Bauen fest eingesetzt:
 * Die App startet ohne Landing und spricht von Antippen und Wählen statt von Browser und Reinziehen.
 */
export const IS_APP = process.env.NEXT_PUBLIC_APP === "1";

/** Tastenkürzel nur im Browser: auf dem iPhone gibt es keine Tastatur, und VoiceOver liest sonst „Befehl Z“ vor */
export const keys = (k: string) => (IS_APP ? undefined : k);
/** Name mit Kürzel in Klammern, in der App ohne */
export const withKeys = (label: string, k: string) => (IS_APP ? label : `${label} (${k})`);
