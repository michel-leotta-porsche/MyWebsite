import type { Metadata } from "next";

import { LegalPage, LegalSection, Mail, OPERATOR } from "@/components/legal";

export const metadata: Metadata = {
  title: "Impressum · Calima",
  description: "Wer Calima betreibt und wie du ihn erreichst.",
};

export default function Page() {
  return (
    <LegalPage title="Impressum">
      <LegalSection title="Angaben nach § 5 DDG">
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
          E-Mail: <Mail />
        </p>
      </LegalSection>
      <LegalSection title="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV">
        <p>{OPERATOR.name}, Anschrift wie oben.</p>
      </LegalSection>
      <LegalSection title="Was Calima ist">
        <p>
          Ein privates, nicht kommerzielles Projekt: Man baut aus eigenen Fotos ein Buch zum Blättern im Browser und teilt es per Link. Es gibt
          keine Bezahlung und keinen Druck.
        </p>
        <p>
          Für Bücher, die andere hier anlegen und teilen, sind die jeweiligen Macherinnen und Macher verantwortlich. Wenn dir ein Inhalt auffällt,
          der nicht hierher gehört, schreib mir, dann nehme ich ihn herunter.
        </p>
        <p>
          Calima liest Aufnahmedaten aus Dateien von Fujifilm-Kameras, ist aber nicht mit Fujifilm verbunden. FUJIFILM und FUJI sind Marken der
          FUJIFILM Corporation.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
