import type { Locale } from "@/i18n/config"

/*
 * Datenschutz. Entwurf: vor dem Livegang prüfen (Hosting-Anbieter, Statistik, Anbieterkennung).
 * Grundlage: keine Cookies, keine Formulare, Schriften lokal, Hosting bei Vercel.
 */
const content = {
  de: {
    title: "Datenschutz",
    note: "Entwurf. Wird vor dem Livegang geprüft.",
    blocks: [
      ["Verantwortlich", "Michel Leotta, E-Mail: michel.leotta@hotmail.com. Dies ist eine private Seite ohne kommerzielles Angebot."],
      ["Hosting", "Die Seite wird bei Vercel Inc. gehostet. Beim Aufruf verarbeitet der Hoster technisch notwendige Daten wie IP-Adresse, Zeitpunkt und aufgerufene Seite in Server-Logs, um die Seite auszuliefern und vor Missbrauch zu schützen (Art. 6 Abs. 1 lit. f DSGVO)."],
      ["Keine Cookies, kein Tracking", "Die Seite setzt keine Cookies und bindet keine Werbe- oder Analyse-Dienste ein. Schriften werden von dieser Domain geladen, nicht von Google."],
      ["Speicher im Browser", "Deine Wahl für Hell/Dunkel und der Stand von Checklisten in Artikeln liegen nur in deinem Browser (localStorage). Sie werden nicht übertragen und lassen sich über die Browser-Einstellungen löschen."],
      ["Kontakt per E-Mail", "Wenn du mir schreibst, verarbeite ich deine Nachricht nur, um zu antworten."],
      ["Deine Rechte", "Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Widerspruch und Beschwerde bei einer Aufsichtsbehörde."],
    ],
  },
  en: {
    title: "Privacy",
    note: "Draft. To be reviewed before launch.",
    blocks: [
      ["Controller", "Michel Leotta, email: michel.leotta@hotmail.com. This is a private site without a commercial offer."],
      ["Hosting", "The site is hosted by Vercel Inc. When you visit, the host processes technically necessary data such as IP address, time and requested page in server logs to deliver the site and protect it from abuse (Art. 6(1)(f) GDPR)."],
      ["No cookies, no tracking", "The site sets no cookies and embeds no advertising or analytics services. Fonts are served from this domain, not from Google."],
      ["Storage in your browser", "Your light/dark choice and the state of checklists in articles stay in your browser only (localStorage). They are never transmitted and you can delete them in your browser settings."],
      ["Contact by email", "If you write to me, I process your message only to reply."],
      ["Your rights", "You have the right to access, rectification, erasure, restriction of processing, objection and to lodge a complaint with a supervisory authority."],
    ],
  },
}

export function PrivacyPage({ lang }: { lang: Locale }) {
  const c = content[lang]
  return (
    <div className="px-gutter pt-[clamp(56px,9vw,120px)]">
      <h1 className="t-display">{c.title}</h1>
      <p className="t-data mt-4 text-ink-3">{c.note}</p>
      <dl className="mt-12 max-w-[68ch] border-t border-ink">
        {c.blocks.map(([k, v]) => (
          <div key={k} className="border-b border-line py-5">
            <dt className="t-h4">{k}</dt>
            <dd className="mt-2 text-ink-2">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
