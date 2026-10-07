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
