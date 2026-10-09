import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, LegalSection, Mail, OPERATOR } from "@/components/legal";
import { T } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Datenschutz · Calima",
  description: "Welche Daten Calima verarbeitet, wo deine Fotos liegen und wie du sie löschst.",
};

const inline = "text-on-table decoration-mark decoration-2 underline-offset-4 hover:underline focus-visible:underline";

export default function Page() {
  return (
    <LegalPage title={<T>Datenschutz</T>} binding>
      <LegalSection title={<T>Kurz gesagt</T>}>
        <p>
          <T>
            Deine Fotos liegen bei Google Firebase und sind nur für dich und für die Menschen sichtbar, denen du einen Link gibst. Ortsdaten entferne
            ich vor dem Hochladen. Es gibt kein Tracking, keine Werbung und keine Cookies zu Analysezwecken. Löschen kannst du jederzeit selbst, einzelne
            Bücher genauso wie dein ganzes Konto. Das gilt für die Website und für die App.
          </T>
        </p>
      </LegalSection>

      <LegalSection title={<T>Verantwortlich</T>}>
        <p>
          {OPERATOR.name}, <T>Anschrift im</T>{" "}
          <Link href="/impressum" className={inline}>
            <T>Impressum</T>
          </Link>
          , <T>E-Mail:</T> <Mail />
        </p>
      </LegalSection>

      <LegalSection title={<T>Website und App aufrufen</T>}>
        <p>
          <T>
            Die Website liegt bei Firebase Hosting (Google). Die App bringt ihre Seiten selbst mit und lädt von dort nur Bücher, Fotos und
            geteilte Links. Beim Aufruf verarbeitet der Hoster technisch nötige Daten wie IP-Adresse, Zeitpunkt,
            aufgerufene Adresse und Browserkennung, um die Seite auszuliefern und vor Missbrauch zu schützen. Rechtsgrundlage ist Art. 6 Abs. 1
            lit. f DSGVO. Schriften liefert Calima selbst aus, nicht Google Fonts.
          </T>
        </p>
      </LegalSection>

      <LegalSection title={<T>Anmelden mit Apple oder Google</T>}>
        <p>
          <T>
            Wer Bücher machen will, meldet sich mit einer Apple-ID oder einem Google-Konto an (Firebase Authentication). Firebase speichert dazu
            deinen Namen, deine E-Mail-Adresse, bei Google den Link zu deinem Profilbild und eine Nutzerkennung. Bei Apple kannst du deine
            E-Mail-Adresse verbergen, dann bekomme ich nur eine Weiterleitungsadresse von Apple. Deinen Namen lege ich zu deinen Büchern, damit
            Gäste sehen, von wem ein Buch kommt; im Profil kannst du ihn ändern. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Für die Anmeldung
            lädt Calima Skripte von Google, in der App öffnet sich das Anmeldefenster von Apple bzw. Google. Lesen geht ohne Konto.
          </T>
        </p>
        <p>
          <T>
            Löschst du dein Konto, widerrufe ich auch die Verbindung zu deiner Apple-ID; in deinen Apple-Einstellungen taucht Calima dann nicht mehr
            auf.
          </T>
        </p>
      </LegalSection>

      <LegalSection title={<T>Deine Fotos und Bücher</T>}>
        <p>
          <T>
            Fotos, die du hochlädst, speichere ich in Firebase Cloud Storage, deine Bücher (Reihenfolge, Texte, Gestaltung, Verlauf) in Firebase
            Firestore. Vor dem Hochladen speichert Calima jedes Foto auf deinem Gerät neu. Dabei fallen alle Bilddaten weg, auch GPS-Ortsdaten und die
            Seriennummer der Kamera.
          </T>
        </p>
        <p>
          <T>
            Vorher liest Calima ein paar Angaben aus der Datei und legt sie zum Buch: Kamera- und Objektivmodell, Brennweite, Blende,
            Belichtungszeit, ISO, Belichtungskorrektur, Aufnahmedatum, das Rezept der Kamera bzw. die Lightroom-Einstellungen und den Dateinamen.
            Daraus entstehen die Rezeptzettel und die Reihenfolge im Buch. Außerdem sucht Calima auf deinem Gerät das Hauptmotiv, damit Fotos gut
            zugeschnitten werden. Gespeichert wird davon nur ein Punkt im Bild und ob dort ein Gesicht ist, keine Merkmale eines Gesichts.
          </T>
        </p>
        <p>
          <T>
            Bearbeitest du ein Foto, rechnet Calima es auf deinem Gerät neu und lädt die bearbeitete Fassung zusätzlich hoch. Das Original bleibt in
            deinem Konto, damit du die Bearbeitung jederzeit zurücknehmen kannst; geteilte Links enthalten nur die bearbeitete Fassung. Eigene Rezepte
            (Name und Einstellungen) speichere ich in Firestore, bis du sie löschst.
          </T>
        </p>
        <p>
          <T>
            Legst du ein Buch für jemanden hin, speichert Calima eine Kopie des Buchs beim Link, dazu den Namen, den du für die Person einträgst
            („Für Lena“), und deinen Namen als Absender. Ein Buch sieht nur, wer den Link dazu hat. Ziehst du einen Link zurück, kann ihn niemand
            mehr öffnen. Wer das Buch vorher geöffnet hat, kann die Bilder, die schon geladen waren, aber behalten. Wer angemeldet ist und ein Buch
            öffnet, bekommt es in seine Ablage „Für dich“; dort stehen der Titel und dein Name.
          </T>
        </p>
        <p>
          <T>Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, denn ohne Speichern gibt es kein Buch. Die Daten bleiben, bis du sie löschst.</T>
        </p>
      </LegalSection>

      <LegalSection title={<T>Zettel und Eselsohren von Gästen</T>}>
        <p>
          <T>
            Wer ein geteiltes Buch liest, kann einen Zettel oder ein Eselsohr hinterlassen. Gespeichert werden der Text, ein Name (angemeldet der aus
            dem Konto, sonst der aus dem Link), die Seite und die Uhrzeit. Lesen kann das nur, wer das Buch gemacht hat. Rechtsgrundlage ist Art. 6 Abs. 1 lit. a DSGVO,
            denn du schreibst den Zettel freiwillig.
          </T>
        </p>
      </LegalSection>

      <LegalSection title={<T>Meldungen und Ausblenden</T>}>
        <p>
          <T>
            Meldest du ein Buch, speichere ich den Grund, deinen freiwilligen Text, den Link, Titel und Absender des Buchs, die Uhrzeit und, wenn
            du angemeldet bist, deine Nutzerkennung. Lesen kann das nur ich. Blendest du die Bücher einer Person aus, steht deren Kennung und
            Name in deinem Konto. Wann du den Nutzungsbedingungen zugestimmt hast, speichere ich ebenfalls. Rechtsgrundlage ist Art. 6 Abs. 1
            lit. f DSGVO (Schutz vor Missbrauch) bzw. lit. b. Erledigte Meldungen lösche ich.
          </T>
        </p>
        <p>
          <T>
            Damit ich eine Meldung schnell sehe, bekomme ich sie per E-Mail: Grund, dein Text, Titel und Absender des Buchs, ohne deine
            Nutzerkennung. Die Mail verschickt der Dienst Resend (Plus Five Five, Inc., USA) in meinem Auftrag, auf Grundlage seines
            Auftragsverarbeitungsvertrags mit Standardvertragsklauseln.
          </T>
        </p>
      </LegalSection>

      <LegalSection title={<T>Speicher auf deinem Gerät</T>}>
        <p>
          <T>
            Calima merkt sich ein paar Einstellungen auf deinem Gerät, etwa ob das Raster beim Gestalten an ist oder welche Schritte eines
            Rezepts du abgehakt hast. Damit du offline weiterarbeiten kannst, hält Firebase eine Kopie deiner Bücher auf dem Gerät (IndexedDB) und
            die Anmeldung im lokalen Speicher. Nichts davon dient dem Tracking.
          </T>
        </p>
      </LegalSection>

      <LegalSection title={<T>Google als Auftragsverarbeiter</T>}>
        <p>
          <T>
            Hosting, Anmeldung und Speicher stellt Google bereit (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland) auf
            Grundlage der Datenverarbeitungsbedingungen von Google Cloud. Dabei können Daten auch an Google LLC in den USA übermittelt werden.
            Google LLC ist unter dem EU-US Data Privacy Framework zertifiziert, zusätzlich gelten Standardvertragsklauseln.
          </T>
        </p>
      </LegalSection>

      <LegalSection title={<T>Löschen|Überschrift</T>}>
        <p>
          <T>
            Ein Buch löschst du im Bücherzimmer: erst in den Papierkorb, dann „Papierkorb leeren“. Damit sind Fotos, Verlauf und geteilte Links
            weg.
          </T>
        </p>
        <p>
          <T>
            Dein ganzes Konto löschst du selbst im Profil unter „Konto löschen“. Calima löscht dann sofort deine Bücher, Fotos, Zwischenstände,
            geteilten Links samt Zetteln der Gäste, deine Ablage, deine Rezepte und dein Konto. Was bleibt: Wer ein Buch von dir in seine Ablage
            gelegt hat, sieht dort noch Titel und Absendernamen, das Buch selbst öffnet sich nicht mehr. Klappt etwas nicht, schreib mir an
          </T>{" "}
          <Mail />.
        </p>
      </LegalSection>

      <LegalSection title={<T>Deine Rechte</T>}>
        <p>
          <T>
            Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch sowie das
            Recht, eine erteilte Einwilligung zu widerrufen. Du kannst dich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren.
          </T>
        </p>
      </LegalSection>

      <p className="text-on-table-2 text-sm">
        <T>Stand: Oktober 2026</T>
      </p>
    </LegalPage>
  );
}
