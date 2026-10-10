import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, LegalSection, Mail } from "@/components/legal";
import { linkClass } from "@/components/ui-classes";
import { T } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Hilfe · Calima",
  description: "Antworten zu Büchern, Links und deinem Konto, und wie du mich erreichst.",
};

const inline = `${linkClass} underline`;

export default function Page() {
  return (
    <LegalPage title={<T>Hilfe</T>}>
      <LegalSection title={<T>Kontakt</T>}>
        <p>
          <T>Schreib mir an</T> <Mail />.{" "}
          <T>Ich antworte in der Regel innerhalb von zwei Werktagen, bei gemeldeten Inhalten innerhalb von 24 Stunden.</T>
        </p>
      </LegalSection>

      <LegalSection id="buch-anlegen" title={<T>Ein Buch anlegen</T>}>
        <p>
          <T>
            Im Bücherzimmer auf „Neues Buch anlegen“, dann „Fotos auswählen“. Calima ordnet die Fotos zu Doppelseiten; mit „Gestalten“ ordnest du
            eine Doppelseite frei an. Bis zu 60 Fotos passen in ein Buch.
          </T>
        </p>
      </LegalSection>

      <LegalSection id="fotos-bearbeiten" title={<T>Fotos bearbeiten</T>}>
        <p>
          <T>
            Im Bücherzimmer beim Fotostudio auf „Fotos wählen“, gern mehrere auf einmal, oder auf der Werkbank „Fotos bearbeiten“. Tippe auf einen Look
            und wisch auf dem Foto, dann änderst du die Stärke; unter „Feinschliff“ stellst du einzelne Regler ein, „Auf alle“ überträgt die Einstellung.
            Der Reiter „Rezept“ stellt die Werte ein wie an einer Fuji, nachempfunden. Im Fotostudio wird nichts hochgeladen.
          </T>
        </p>
      </LegalSection>

      <LegalSection id="buch-teilen" title={<T>Ein Buch teilen</T>}>
        <p>
          <T>
            Auf der Werkbank „Hinlegen für …“ wählen und einen Namen eintragen. Jede Person bekommt ihren eigenen Link; lesen geht ohne Konto.
            Mit „Zurückziehen“ machst du einen Link sofort ungültig.
          </T>
        </p>
      </LegalSection>

      <LegalSection title={<T>Ein Buch löschen</T>}>
        <p>
          <T>Im Bücherzimmer über „Mehr …“ in den Papierkorb legen, dann „Papierkorb leeren“. Fotos, Verlauf und geteilte Links sind dann weg.</T>
        </p>
      </LegalSection>

      <LegalSection title={<T>Konto löschen</T>}>
        <p>
          <T>Im</T>{" "}
          <Link href="/profil" className={inline}>
            <T>Profil</T>
          </Link>{" "}
          <T>unter „Konto löschen“.</T>{" "}
          <T>Calima löscht sofort alle deine Bücher, Fotos, geteilten Links und dein Konto. Das lässt sich nicht rückgängig machen.</T>
        </p>
      </LegalSection>

      <LegalSection title={<T>Einen Inhalt melden oder ausblenden</T>}>
        <p>
          <T>
            Hat dir jemand ein Buch hingelegt, das nicht in Ordnung ist, tippe im Buch auf „Melden“ (im Bücherzimmer unter „Mehr …“). Melden geht
            auch ohne Konto. Ich prüfe jede Meldung innerhalb von 24 Stunden, nehme Inhalte herunter, die gegen die
          </T>{" "}
          <Link href="/nutzungsbedingungen" className={inline}>
            <T>Nutzungsbedingungen</T>
          </Link>{" "}
          <T>verstoßen, und sperre wenn nötig das Konto dahinter.</T> <T>Du erreichst mich dafür auch unter</T> <Mail />.
        </p>
        <p>
          <T>Mit „Bücher von … ausblenden“ siehst du nichts mehr von dieser Person. Zurücknehmen kannst du das im</T>{" "}
          <Link href="/profil" className={inline}>
            <T>Profil</T>
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title={<T>Mehr</T>}>
        <p>
          <Link href="/nutzungsbedingungen" className={inline}>
            <T>Nutzungsbedingungen</T>
          </Link>{" "}
          ·{" "}
          <Link href="/datenschutz" className={inline}>
            <T>Datenschutz</T>
          </Link>{" "}
          ·{" "}
          <Link href="/impressum" className={inline}>
            <T>Impressum</T>
          </Link>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
