// Merkt sich ohne Firebase, ob in diesem Browser jemand angemeldet ist. Die Landing lädt das SDK nur dann sofort;
// alle anderen bekommen es erst beim Klick auf Anmelden. Ein falscher Hinweis kostet nur einen Ladevorgang.

const KEY = "fuji-session";

export function hasSessionHint() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setSessionHint(signedIn: boolean) {
  try {
    if (signedIn) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    // ohne Speicher lädt die Landing Firebase eben erst beim Klick
  }
}
