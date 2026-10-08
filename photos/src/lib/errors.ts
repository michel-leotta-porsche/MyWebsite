// Fehler aus Firebase in Alltagssprache (UX-Kritik K21): niemand soll „Missing or insufficient permissions.“ lesen
const MESSAGES: Record<string, string> = {
  "permission-denied": "Dafür fehlen gerade die Rechte. Melde dich bitte neu an und versuch es nochmal.",
  unauthenticated: "Du bist nicht mehr angemeldet. Melde dich bitte neu an.",
  unavailable: "Keine Verbindung. Versuch es gleich nochmal.",
  "deadline-exceeded": "Das hat zu lange gedauert. Versuch es gleich nochmal.",
  "not-found": "Das gibt es nicht mehr.",
  "resource-exhausted": "Gerade ist zu viel los. Versuch es später nochmal.",
  "storage/unauthorized": "Dafür fehlen gerade die Rechte. Melde dich bitte neu an und versuch es nochmal.",
  "storage/quota-exceeded": "Der Speicherplatz ist voll.",
  "storage/retry-limit-exceeded": "Keine Verbindung. Versuch es gleich nochmal.",
};

export function friendlyError(e: unknown): string {
  const code = typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code).replace(/^firestore\//, "") : "";
  if (MESSAGES[code]) return MESSAGES[code];
  if (/insufficient permissions/i.test(String((e as Error)?.message ?? e))) return MESSAGES["permission-denied"];
  // eigene Meldungen ohne Code (z. B. aus dem Import) sind schon deutsch und bleiben
  if (e instanceof Error && !code && e.message) return e.message;
  return "Das hat nicht geklappt. Versuch es bitte nochmal.";
}

// Abgebrochen hat die Person selbst: kein Fehler, nichts anzeigen
const SIGN_IN_CANCELLED = ["auth/popup-closed-by-user", "auth/cancelled-popup-request", "auth/user-cancelled"];
const SIGN_IN_MESSAGES: Record<string, string> = {
  "auth/popup-blocked": "Das Anmeldefenster wurde blockiert. Erlaube Fenster für Calima und versuch es nochmal.",
  "auth/network-request-failed": "Keine Verbindung. Versuch es gleich nochmal.",
  "auth/too-many-requests": "Zu viele Versuche. Warte bitte einen Moment.",
  "auth/user-mismatch": "Das war ein anderes Konto. Wähle bitte das, mit dem du hier angemeldet bist.",
  "auth/user-disabled": "Dieses Konto ist gesperrt. Schreib mir, wenn das ein Irrtum ist.",
};

/** Fehler beim Anmelden in Alltagssprache; null, wenn die Person selbst abgebrochen hat */
export function signInError(e: unknown): string | null {
  const code = typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : "";
  if (SIGN_IN_CANCELLED.includes(code)) return null;
  return SIGN_IN_MESSAGES[code] ?? "Die Anmeldung hat nicht geklappt. Versuch es bitte nochmal.";
}
