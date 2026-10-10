import type { Metadata } from "next";
import Link from "next/link";

import { HelpMap } from "@/components/help-page";
import { LegalPage, LegalSection, Mail } from "@/components/legal";
import { linkClass } from "@/components/ui-classes";
import { T } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Hilfe · Calima",
  description: "Vom Foto zum Buch: kurze Anleitungen mit Bildern zu Kamera, Abendstapel, Buch, Hinlegen und Lesen. Dazu Konto, Löschen und Kontakt.",
};

const inline = `${linkClass} underline`;

export default function Page() {
  return (
    <LegalPage title={<T>Hilfe</T>}>
      <HelpMap />

      <LegalSection title={<T>Kontakt</T>}>
        <p>
          <T>Schreib mir an</T> <Mail />.{" "}
          <T>Ich antworte in der Regel innerhalb von zwei Werktagen, bei gemeldeten Inhalten innerhalb von 24 Stunden.</T>
        </p>
      </LegalSection>

      <LegalSection title={<T>Ein Buch löschen</T>}>
        <p>
          <T>Im Bücherzimmer über die drei Punkte („Mehr“) „In den Papierkorb“ wählen, dann „Papierkorb leeren“. Fotos, Verlauf und geteilte Links sind dann weg.</T>
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
            Hat dir jemand ein Buch hingelegt, das nicht in Ordnung ist, tippe im Buch unter „Mehr“ auf „Buch melden“ (im Bücherzimmer „Melden …“). Melden geht
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
