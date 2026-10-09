import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, LegalSection, Mail, OPERATOR } from "@/components/legal";
import { linkClass } from "@/components/ui-classes";
import { T } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Nutzungsbedingungen · Calima",
  description: "Was bei Calima erlaubt ist, was nicht, und was passiert, wenn jemand etwas meldet.",
};

const inline = `${linkClass} underline`;

export default function Page() {
  return (
    <LegalPage title={<T>Nutzungsbedingungen</T>} binding>
      <LegalSection title={<T>Worum es geht</T>}>
        <p>
          <T>Calima ist ein kostenloses, privates Projekt von</T> {OPERATOR.name}.{" "}
          <T>
            Du machst aus deinen Fotos Bücher zum Blättern und legst sie einzelnen Menschen per Link hin. Mit dem Anmelden stimmst du diesen
            Bedingungen zu.
          </T>
        </p>
      </LegalSection>

      <LegalSection title={<T>Deine Inhalte</T>}>
        <p>
          <T>
            Deine Fotos und Texte bleiben deine. Du erlaubst mir nur, sie zu speichern und denen zu zeigen, denen du einen Link gibst, solange du
            sie nicht löschst. Lade nur hoch, woran du die Rechte hast, und zeig Menschen auf Fotos nur, wenn sie damit einverstanden sind.
          </T>
        </p>
      </LegalSection>

      <LegalSection title={<T>Was nicht erlaubt ist</T>}>
        <p>
          <T>Für anstößige oder missbräuchliche Inhalte gibt es keine Toleranz. Nicht erlaubt sind insbesondere:</T>
        </p>
        <ul className="flex flex-col gap-1">
          <li>
            · <T>Darstellungen sexuellen Missbrauchs und sexualisierte Darstellungen Minderjähriger</T>
          </li>
          <li>
            · <T>Pornografie und Gewaltdarstellungen</T>
          </li>
          <li>
            · <T>Hass, Hetze, Bedrohung und Belästigung, auch in Zetteln an andere</T>
          </li>
          <li>
            · <T>Inhalte, die Rechte anderer verletzen, etwa fremde Fotos oder Bilder von Menschen gegen ihren Willen</T>
          </li>
          <li>
            · <T>alles andere, was gegen geltendes Recht verstößt</T>
          </li>
        </ul>
      </LegalSection>

      <LegalSection title={<T>Melden und Folgen</T>}>
        <p>
          <T>Wer etwas Unzulässiges sieht, meldet es mit „Melden“ im Buch oder an</T> <Mail /> (<T>siehe</T>{" "}
          <Link href="/hilfe" className={inline}>
            <T>Hilfe</T>
          </Link>
          ).{" "}
          <T>
            Ich prüfe Meldungen innerhalb von 24 Stunden. Verstößt ein Inhalt gegen diese Bedingungen, entferne ich ihn und sperre das Konto, von dem
            er kommt. Strafbare Inhalte melde ich den Behörden.
          </T>
        </p>
      </LegalSection>

      <LegalSection title={<T>Verfügbarkeit und Haftung</T>}>
        <p>
          <T>
            Calima ist kostenlos und ohne Gewähr. Ich gebe mir Mühe, dass alles läuft und nichts verloren geht, kann es aber nicht versprechen; sichere
            bei wichtigen Büchern deshalb den Aufbau als Datei und behalte deine Originalfotos. Ich hafte unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie für Schäden an Leben, Körper
            und Gesundheit, sonst nur nach den gesetzlichen Regeln für unentgeltliche Leistungen.
          </T>
        </p>
      </LegalSection>

      <LegalSection title={<T>Ende</T>}>
        <p>
          <T>Du kannst dein Konto jederzeit im</T>{" "}
          <Link href="/profil" className={inline}>
            <T>Profil</T>
          </Link>{" "}
          <T>löschen.</T>{" "}
          <T>Ich kann Calima einstellen; dann sage ich es mindestens vier Wochen vorher, damit du deine Bücher sichern kannst.</T>
        </p>
      </LegalSection>

      <LegalSection title={<T>Änderungen und Recht</T>}>
        <p>
          <T>
            Ändern sich diese Bedingungen, steht das hier mit neuem Datum. Es gilt deutsches Recht; zwingende Verbraucherschutzvorschriften deines
            Landes bleiben unberührt.
          </T>
        </p>
      </LegalSection>

      <p className="text-on-table-2 text-sm">
        <T>Stand: Oktober 2026</T>
      </p>
    </LegalPage>
  );
}
