// Fehler aus Firebase in Alltagssprache (UX-Kritik K21): niemand soll „Missing or insufficient permissions.“ lesen
import { de, t } from "@/lib/i18n";

const MESSAGES: Record<string, string> = {
  "permission-denied": de("Dafür fehlen gerade die Rechte. Melde dich bitte neu an und versuch es nochmal."),
  unauthenticated: de("Du bist nicht mehr angemeldet. Melde dich bitte neu an."),
  unavailable: de("Keine Verbindung. Versuch es gleich nochmal."),
  "deadline-exceeded": de("Das hat zu lange gedauert. Versuch es gleich nochmal."),
  "not-found": de("Das gibt es nicht mehr."),
  "resource-exhausted": de("Gerade ist zu viel los. Versuch es später nochmal."),
  "storage/unauthorized": de("Dafür fehlen gerade die Rechte. Melde dich bitte neu an und versuch es nochmal."),
  "storage/quota-exceeded": de("Der Speicherplatz ist voll."),
  "storage/retry-limit-exceeded": de("Keine Verbindung. Versuch es gleich nochmal."),
};

/** Was sich über den Fehler in Alltagssprache sagen lässt; null, wenn nichts Genaueres bekannt ist */
export function errorDetail(e: unknown): string | null {
  const code = typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code).replace(/^firestore\//, "") : "";
  if (MESSAGES[code]) return t(MESSAGES[code]);
  if (/insufficient permissions/i.test(String((e as Error)?.message ?? e))) return t(MESSAGES["permission-denied"]);
  // eigene Meldungen ohne Code (z. B. aus dem Import) sind schon deutsch und bleiben
  if (e instanceof Error && !code && e.message) return t(e.message);
  return null;
}

export function friendlyError(e: unknown): string {
  return errorDetail(e) ?? t("Das hat nicht geklappt. Versuch es bitte nochmal.");
}

// Abgebrochen hat die Person selbst: kein Fehler, nichts anzeigen
const SIGN_IN_CANCELLED = ["auth/popup-closed-by-user", "auth/cancelled-popup-request", "auth/user-cancelled"];
const SIGN_IN_MESSAGES: Record<string, string> = {
  "auth/popup-blocked": de("Das Anmeldefenster wurde blockiert. Erlaube Fenster für Calima und versuch es nochmal."),
  "auth/network-request-failed": de("Keine Verbindung. Versuch es gleich nochmal."),
  "auth/too-many-requests": de("Zu viele Versuche. Warte bitte einen Moment."),
  "auth/user-mismatch": de("Das war ein anderes Konto. Wähle bitte das, mit dem du hier angemeldet bist."),
  "auth/user-disabled": de("Dieses Konto ist gesperrt. Schreib mir, wenn das ein Irrtum ist."),
  "auth/account-exists-with-different-credential":
    de("Mit dieser E-Mail-Adresse gibt es schon ein Konto über den anderen Anbieter. Melde dich bitte damit an."),
};

/** Fehler beim Anmelden in Alltagssprache; null, wenn die Person selbst abgebrochen hat */
export function signInError(e: unknown): string | null {
  const code = typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : "";
  if (SIGN_IN_CANCELLED.includes(code)) return null;
  // Abbruch in der App: das native Fenster meldet sich ohne auth/-Code (Apple: Fehler 1001, Google: „canceled“)
  if (!code.startsWith("auth/") && /cancel|1001/i.test(String((e as Error)?.message ?? e))) return null;
  return t(SIGN_IN_MESSAGES[code] ?? de("Die Anmeldung hat nicht geklappt. Versuch es bitte nochmal."));
}
