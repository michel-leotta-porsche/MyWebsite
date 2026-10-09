/**
 * Fassung für die iOS-App (npm run ios:build setzt NEXT_PUBLIC_APP=1). Beim Bauen fest eingesetzt:
 * Die App startet ohne Landing und spricht von Antippen und Wählen statt von Browser und Reinziehen.
 */
export const IS_APP = process.env.NEXT_PUBLIC_APP === "1";
