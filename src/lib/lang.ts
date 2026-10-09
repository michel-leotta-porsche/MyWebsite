// Sprache ohne React: Typ, Schlüssel im Speicher und das Startskript für layout.tsx (Server-Komponente).
// Die Übersetzung selbst steht in i18n.ts.

export type Lang = "de" | "en";

export const LANG_KEY = "calima-sprache";

/** Läuft vor dem ersten Bild: setzt <html lang> nach Wahl oder Gerät, damit Screenreader gleich die richtige Stimme nehmen */
export const langScript = `try{var l=localStorage.getItem("${LANG_KEY}");if(l!=="de"&&l!=="en"){var p=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language];l=p.some(function(x){return x&&x.toLowerCase().indexOf("de")===0})?"de":"en"}document.documentElement.lang=l}catch(e){}`;
