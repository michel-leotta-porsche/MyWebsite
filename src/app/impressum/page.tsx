import type { Metadata } from "next";

import { LegalPage, LegalSection, Mail, OPERATOR } from "@/components/legal";
import { T } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Impressum · Calima",
  description: "Wer Calima betreibt und wie du ihn erreichst.",
};

export default function Page() {
  return (
    <LegalPage title={<T>Impressum</T>} binding>
      <LegalSection title={<T>Angaben nach § 5 DDG</T>}>
        <p>
          {OPERATOR.name}
          {OPERATOR.address.map((line) => (
            <span key={line}>
              <br />
              {line}
            </span>
          ))}
        </p>
        <p>
          <T>E-Mail:</T> <Mail />
        </p>
      </LegalSection>
      <LegalSection title={<T>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</T>}>
        <p>
          {OPERATOR.name}, <T>Anschrift wie oben.</T>
        </p>
      </LegalSection>
      <LegalSection title={<T>Was Calima ist</T>}>
        <p>
          <T>
            Ein privates, nicht kommerzielles Projekt: Man baut aus eigenen Fotos ein Buch zum Blättern und teilt es per Link. Es gibt
            keine Bezahlung und keinen Druck.
          </T>
        </p>
        <p>
          <T>
            Für Bücher, die andere hier anlegen und teilen, sind die jeweiligen Macherinnen und Macher verantwortlich. Wenn dir ein Inhalt auffällt,
            der nicht hierher gehört, schreib mir, dann nehme ich ihn herunter.
          </T>
        </p>
        <p>
          <T>
            Calima liest Aufnahmedaten aus Dateien von Fujifilm-Kameras, ist aber nicht mit Fujifilm verbunden. FUJIFILM und FUJI sind Marken der
            FUJIFILM Corporation.
          </T>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
