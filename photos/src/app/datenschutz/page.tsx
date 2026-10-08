import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, LegalSection, Mail, OPERATOR } from "@/components/legal";

export const metadata: Metadata = {
  title: "Datenschutz · Calima",
  description: "Welche Daten Calima verarbeitet, wo deine Fotos liegen und wie du sie löschst.",
};

const inline = "text-on-table decoration-mark decoration-2 underline-offset-4 hover:underline focus-visible:underline";

export default function Page() {
  return (
    <LegalPage title="Datenschutz">
      <LegalSection title="Kurz gesagt">
        <p>
          Deine Fotos liegen bei Google Firebase und sind nur für dich und für die Menschen sichtbar, denen du einen Link gibst. Ortsdaten entferne
          ich vor dem Hochladen. Es gibt kein Tracking, keine Werbung und keine Cookies zu Analysezwecken. Löschen kannst du jederzeit selbst.
        </p>
      </LegalSection>

      <LegalSection title="Verantwortlich">
        <p>
          {OPERATOR.name}, Anschrift im <Link href="/impressum" className={inline}>Impressum</Link>, E-Mail: <Mail />
        </p>
      </LegalSection>

      <LegalSection title="Seite aufrufen">
        <p>
          Die Seite liegt bei Firebase Hosting (Google). Beim Aufruf verarbeitet der Hoster technisch nötige Daten wie IP-Adresse, Zeitpunkt,
          aufgerufene Adresse und Browserkennung, um die Seite auszuliefern und vor Missbrauch zu schützen. Rechtsgrundlage ist Art. 6 Abs. 1
          lit. f DSGVO. Schriften liefert diese Seite selbst aus, nicht Google Fonts.
        </p>
      </LegalSection>

      <LegalSection title="Anmelden mit Google">
        <p>
          Wer Bücher machen will, meldet sich mit einem Google-Konto an (Firebase Authentication). Firebase speichert dazu deinen Namen, deine
          E-Mail-Adresse, den Link zu deinem Profilbild und eine Nutzerkennung. Deinen Namen lege ich zu deinen Büchern, damit Gäste sehen, von wem
          ein Buch kommt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Für die Anmeldung lädt die Seite Skripte von Google. Lesen geht ohne Konto.
        </p>
      </LegalSection>

      <LegalSection title="Deine Fotos und Bücher">
        <p>
          Fotos, die du hochlädst, speichere ich in Firebase Cloud Storage, deine Bücher (Reihenfolge, Texte, Gestaltung, Verlauf) in Firebase
          Firestore. Vor dem Hochladen entfernt die Seite in deinem Browser GPS-Ortsdaten und die Seriennummer der Kamera aus den Bilddaten.
        </p>
        <p>
          Ein Buch sieht nur, wer den Link dazu hat. Ziehst du einen Link zurück, kann ihn niemand mehr öffnen. Wer das Buch vorher geöffnet hat,
          kann die Bilder, die sein Browser schon geladen hat, aber behalten.
        </p>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, denn ohne Speichern gibt es kein Buch. Die Daten bleiben, bis du sie löschst.
        </p>
      </LegalSection>

      <LegalSection title="Zettel und Eselsohren von Gästen">
        <p>
          Wer ein geteiltes Buch liest, kann einen Zettel oder ein Eselsohr hinterlassen. Gespeichert werden der Text, der Name, den der Gast
          selbst angibt, die Seite und die Uhrzeit. Lesen kann das nur, wer das Buch gemacht hat. Rechtsgrundlage ist Art. 6 Abs. 1 lit. a DSGVO,
          denn du schreibst den Zettel freiwillig.
        </p>
      </LegalSection>

      <LegalSection title="Speicher im Browser">
        <p>
          Die Seite merkt sich ein paar Einstellungen in deinem Browser, etwa ob das Raster beim Gestalten an ist oder welche Schritte eines
          Rezepts du abgehakt hast. Damit du offline weiterarbeiten kannst, hält Firebase eine Kopie deiner Bücher im Browser (IndexedDB) und
          die Anmeldung im Browserspeicher. Nichts davon dient dem Tracking.
        </p>
      </LegalSection>

      <LegalSection title="Google als Auftragsverarbeiter">
        <p>
          Hosting, Anmeldung und Speicher stellt Google bereit (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland) auf
          Grundlage der Datenverarbeitungsbedingungen von Google Cloud. Dabei können Daten auch an Google LLC in den USA übermittelt werden.
          Google LLC ist unter dem EU-US Data Privacy Framework zertifiziert, zusätzlich gelten Standardvertragsklauseln.
        </p>
      </LegalSection>

      <LegalSection title="Löschen">
        <p>
          Ein Buch löschst du im Bücherzimmer: erst in den Papierkorb, dann „Papierkorb leeren“. Damit sind Fotos, Verlauf und geteilte Links
          weg. Willst du dein ganzes Konto löschen, schreib mir an <Mail />, dann lösche ich alles, was zu dir gehört.
        </p>
      </LegalSection>

      <LegalSection title="Deine Rechte">
        <p>
          Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch sowie das
          Recht, eine erteilte Einwilligung zu widerrufen. Du kannst dich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren.
        </p>
      </LegalSection>

      <p className="text-on-table-2 text-sm">Stand: Oktober 2026</p>
    </LegalPage>
  );
}
