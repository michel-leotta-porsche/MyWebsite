import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, LegalSection, Mail, OPERATOR } from "@/components/legal";
import { linkClass } from "@/components/ui-classes";

export const metadata: Metadata = {
  title: "Nutzungsbedingungen · Calima",
  description: "Was bei Calima erlaubt ist, was nicht, und was passiert, wenn jemand etwas meldet.",
};

const inline = `${linkClass} underline`;

// Entwurf, von Michel freizugeben. Kein Ersatz für eine Rechtsberatung.
export default function Page() {
  return (
    <LegalPage title="Nutzungsbedingungen">
      <LegalSection title="Worum es geht">
        <p>
          Calima ist ein kostenloses, privates Projekt von {OPERATOR.name}. Du machst aus deinen Fotos Bücher zum Blättern und legst sie einzelnen
          Menschen per Link hin. Mit dem Anmelden stimmst du diesen Bedingungen zu.
        </p>
      </LegalSection>

      <LegalSection title="Deine Inhalte">
        <p>
          Deine Fotos und Texte bleiben deine. Du erlaubst mir nur, sie zu speichern und denen zu zeigen, denen du einen Link gibst, solange du
          sie nicht löschst. Lade nur hoch, woran du die Rechte hast, und zeig Menschen auf Fotos nur, wenn sie damit einverstanden sind.
        </p>
      </LegalSection>

      <LegalSection title="Was nicht erlaubt ist">
        <p>Für anstößige oder missbräuchliche Inhalte gibt es keine Toleranz. Nicht erlaubt sind insbesondere:</p>
        <ul className="flex flex-col gap-1">
          <li>· Darstellungen sexuellen Missbrauchs und sexualisierte Darstellungen Minderjähriger</li>
          <li>· Pornografie und Gewaltdarstellungen</li>
          <li>· Hass, Hetze, Bedrohung und Belästigung, auch in Zetteln an andere</li>
          <li>· Inhalte, die Rechte anderer verletzen, etwa fremde Fotos oder Bilder von Menschen gegen ihren Willen</li>
          <li>· alles andere, was gegen geltendes Recht verstößt</li>
        </ul>
      </LegalSection>

      <LegalSection title="Melden und Folgen">
        <p>
          Wer etwas Unzulässiges sieht, meldet es an <Mail /> (siehe <Link href="/hilfe" className={inline}>Hilfe</Link>). Ich prüfe Meldungen
          innerhalb von 24 Stunden. Verstößt ein Inhalt gegen diese Bedingungen, entferne ich ihn und sperre das Konto, von dem er kommt.
          Strafbare Inhalte melde ich den Behörden.
        </p>
      </LegalSection>

      <LegalSection title="Verfügbarkeit und Haftung">
        <p>
          Calima ist kostenlos und ohne Gewähr. Ich gebe mir Mühe, dass alles läuft und nichts verloren geht, kann es aber nicht versprechen; sichere
          wichtige Bücher deshalb selbst als Datei. Ich hafte unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie für Schäden an Leben, Körper
          und Gesundheit, sonst nur nach den gesetzlichen Regeln für unentgeltliche Leistungen.
        </p>
      </LegalSection>

      <LegalSection title="Ende">
        <p>
          Du kannst dein Konto jederzeit im <Link href="/profil" className={inline}>Profil</Link> löschen. Ich kann Calima einstellen; dann sage ich
          es mindestens vier Wochen vorher, damit du deine Bücher sichern kannst.
        </p>
      </LegalSection>

      <LegalSection title="Änderungen und Recht">
        <p>
          Ändern sich diese Bedingungen, steht das hier mit neuem Datum. Es gilt deutsches Recht; zwingende Verbraucherschutzvorschriften deines
          Landes bleiben unberührt.
        </p>
      </LegalSection>

      <p className="text-on-table-2 text-sm">Stand: Oktober 2026</p>
    </LegalPage>
  );
}
