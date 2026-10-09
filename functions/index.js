// Cloud Functions für Calima. Bisher nur eine: Mail an Michel bei jeder neuen Meldung,
// damit die Zusage aus den Nutzungsbedingungen hält (Meldungen binnen 24 Stunden prüfen).
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/firestore";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";

initializeApp();

// Schlüssel von resend.com, einmalig gesetzt mit: firebase functions:secrets:set RESEND_API_KEY
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

// Muss die Adresse sein, mit der das Resend-Konto angelegt ist: ohne eigene Domain stellt Resend nur dorthin zu
const TO = "michel.julian.leotta@gmail.com";
const FROM = "Calima <onboarding@resend.dev>";

// Meldungen gehen auch ohne Konto ein; mehr Mails als das pro Stunde wären Missbrauch, der Rest steht im Profil
const MAX_PER_HOUR = 10;

const REASONS = {
  anstoessig: "Anstößiger Inhalt",
  gewalt: "Gewalt oder Gefahr",
  belaestigung: "Belästigung",
  rechte: "Fremde Rechte verletzt",
  anderes: "Anderes",
};

/** Zählt Mails je Stunde in meta/reportMail; false, wenn die Grenze erreicht ist */
async function withinLimit() {
  const ref = getFirestore().doc("meta/reportMail");
  const hour = Math.floor(Date.now() / 3_600_000);
  return getFirestore().runTransaction(async (t) => {
    const d = (await t.get(ref)).data();
    const count = d?.hour === hour ? d.count : 0;
    if (count >= MAX_PER_HOUR) return false;
    t.set(ref, { hour, count: count + 1, at: FieldValue.serverTimestamp() });
    return true;
  });
}

export const mailOnReport = onDocumentCreated({ document: "reports/{id}", secrets: [RESEND_API_KEY] }, async (event) => {
  const r = event.data?.data();
  if (!r) return;
  if (!(await withinLimit())) {
    logger.warn("Mail-Grenze erreicht, Meldung nur im Profil", { id: event.params.id });
    return;
  }
  const text = [
    `Neue Meldung zu „${r.title || "ohne Titel"}“ von ${r.fromName || "unbekannt"}.`,
    "",
    `Grund: ${REASONS[r.reason] ?? r.reason}`,
    r.text ? `Text: ${r.text}` : "Ohne Text.",
    r.reporter ? "Gemeldet mit Konto." : "Gemeldet ohne Konto.",
    "",
    "Prüfen und ggf. sperren: https://calima.web.app/profil (Abschnitt Meldungen).",
    "Zugesagt ist eine Prüfung binnen 24 Stunden.",
  ].join("\n");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY.value()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [TO], subject: `Calima: neue Meldung (${REASONS[r.reason] ?? r.reason})`, text }),
  });
  if (!res.ok) {
    // Fehler ins Log; die Meldung bleibt trotzdem im Profil sichtbar
    logger.error("Mail an Resend fehlgeschlagen", { status: res.status, body: await res.text() });
  }
});
