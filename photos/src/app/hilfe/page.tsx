import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, LegalSection, Mail } from "@/components/legal";
import { linkClass } from "@/components/ui-classes";

export const metadata: Metadata = {
  title: "Hilfe · Calima",
  description: "Antworten zu Büchern, Links und deinem Konto, und wie du mich erreichst.",
};

const inline = `${linkClass} underline`;

export default function Page() {
  return (
    <LegalPage title="Hilfe">
      <LegalSection title="Kontakt">
        <p>
          Schreib mir an <Mail />. Ich antworte in der Regel innerhalb von zwei Werktagen, bei gemeldeten Inhalten innerhalb von 24 Stunden.
        </p>
      </LegalSection>

      <LegalSection title="Ein Buch anlegen">
        <p>
          Im Bücherzimmer auf „Neues Buch anlegen“, dann „Fotos auswählen“. Calima ordnet die Fotos zu Doppelseiten; mit „Gestalten“ ordnest du
          eine Doppelseite frei an. Bis zu 60 Fotos passen in ein Buch.
        </p>
      </LegalSection>

      <LegalSection title="Ein Buch teilen">
        <p>
          Auf der Werkbank „Hinlegen für …“ wählen und einen Namen eintragen. Jede Person bekommt ihren eigenen Link; lesen geht ohne Konto.
          Mit „Zurückziehen“ machst du einen Link sofort ungültig.
        </p>
      </LegalSection>

      <LegalSection title="Ein Buch löschen">
        <p>Im Bücherzimmer über „Mehr …“ in den Papierkorb legen, dann „Papierkorb leeren“. Fotos, Verlauf und geteilte Links sind dann weg.</p>
      </LegalSection>

      <LegalSection title="Konto löschen">
        <p>
          Im <Link href="/profil" className={inline}>Profil</Link> unter „Konto löschen“. Calima löscht sofort alle deine Bücher, Fotos, geteilten
          Links und dein Konto. Das lässt sich nicht rückgängig machen.
        </p>
      </LegalSection>

      <LegalSection title="Einen Inhalt melden oder ausblenden">
        <p>
          Hat dir jemand ein Buch hingelegt, das nicht in Ordnung ist, tippe im Buch auf „Melden“ (im Bücherzimmer unter „Mehr …“). Melden geht
          auch ohne Konto. Ich prüfe jede Meldung innerhalb von 24 Stunden, nehme Inhalte herunter, die gegen die{" "}
          <Link href="/nutzungsbedingungen" className={inline}>Nutzungsbedingungen</Link> verstoßen, und sperre wenn nötig das Konto dahinter.
          Du erreichst mich dafür auch unter <Mail />.
        </p>
        <p>
          Mit „Bücher von … ausblenden“ siehst du nichts mehr von dieser Person. Zurücknehmen kannst du das im{" "}
          <Link href="/profil" className={inline}>Profil</Link>.
        </p>
      </LegalSection>

      <LegalSection title="Mehr">
        <p>
          <Link href="/nutzungsbedingungen" className={inline}>Nutzungsbedingungen</Link> ·{" "}
          <Link href="/datenschutz" className={inline}>Datenschutz</Link> · <Link href="/impressum" className={inline}>Impressum</Link>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
