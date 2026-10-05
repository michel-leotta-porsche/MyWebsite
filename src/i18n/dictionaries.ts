import type { Locale } from "./config"

/* Feste Texte der Oberfläche. Artikeltexte stehen in content/wiki/<slug>/<lang>.mdx. */
const de = {
  siteTagline: "Wissen",
  description:
    "Michel Leotta, Softwareentwickler und Systemarchitekt für KI-Anwendungen. Ein Wiki mit getesteten Anleitungen zu Claude, KI-Systemen und Entwicklungspraxis.",
  nav: { wiki: "Wissen", about: "Über mich" },
  langName: { de: "Deutsch", en: "Englisch" },
  home: {
    label: "Wissen",
    title: "Was ich mir erarbeite, schreibe ich hier auf.",
    lede: "Getestete Anleitungen zu Claude, KI-Systemen und Entwicklungspraxis. Jede Anleitung habe ich selbst durchgespielt, und jede zeigt, wann sie zuletzt geprüft wurde.",
    latest: "Neu",
    latestTitle: "Neu im Wiki",
    topics: "Themen",
    all: "Alle Artikel",
    empty: "Hier entsteht gerade der erste Artikel.",
  },
  wiki: { label: "Wiki", title: "Alle Artikel nach Thema" },
  article: {
    toc: "Inhalt",
    checked: "Zuletzt geprüft",
    published: "Veröffentlicht",
    reading: "Lesezeit",
    minutes: "Minuten",
    format: "Format",
    topic: "Thema",
    tested: "Code ausgeführt",
    reading_only: "Quellen gelesen",
    feedback: "Fehler gefunden oder eine Frage?",
    feedbackLink: "Schreib mir",
    back: "Alle Artikel",
  },
  formats: { leitfaden: "Leitfaden", notiz: "Notiz" },
  footer: {
    question: "Fehler gefunden, Frage oder ein Thema, das hier fehlt?",
    contact: "Kontakt",
    write: "E-Mail schreiben",
    privacy: "Datenschutz",
    rss: "RSS",
    note: "© 2026 Michel Leotta",
  },
  story: { scroll: "Scroll weiter" },
  quiz: { label: "Frage", right: "Richtig.", wrong: "Nicht ganz." },
  checklist: { done: "erledigt", of: "von", reset: "Zurücksetzen" },
  toggles: { scheme: "Farbschema", light: "Hell", dark: "Dunkel", lang: "Sprache" },
  skip: "Zum Inhalt",
}

export type Dictionary = typeof de

const en: Dictionary = {
  siteTagline: "Knowledge",
  description:
    "Michel Leotta, software developer and system architect for AI applications. A wiki of tested guides on Claude, AI systems and engineering practice.",
  nav: { wiki: "Knowledge", about: "About" },
  langName: { de: "German", en: "English" },
  home: {
    label: "Knowledge",
    title: "What I work out, I write down here.",
    lede: "Tested guides on Claude, AI systems and engineering practice. I ran every guide myself, and each one shows when it was last checked.",
    latest: "New",
    latestTitle: "New in the wiki",
    topics: "Topics",
    all: "All articles",
    empty: "The first article is on its way.",
  },
  wiki: { label: "Wiki", title: "All articles by topic" },
  article: {
    toc: "Contents",
    checked: "Last checked",
    published: "Published",
    reading: "Reading time",
    minutes: "minutes",
    format: "Format",
    topic: "Topic",
    tested: "Code executed",
    reading_only: "Sources read",
    feedback: "Found a mistake or have a question?",
    feedbackLink: "Write to me",
    back: "All articles",
  },
  formats: { leitfaden: "Guide", notiz: "Note" },
  footer: {
    question: "Found a mistake, have a question or miss a topic?",
    contact: "Contact",
    write: "Send an email",
    privacy: "Privacy",
    rss: "RSS",
    note: "© 2026 Michel Leotta",
  },
  story: { scroll: "Keep scrolling" },
  quiz: { label: "Question", right: "Correct.", wrong: "Not quite." },
  checklist: { done: "done", of: "of", reset: "Reset" },
  toggles: { scheme: "Colour scheme", light: "Light", dark: "Dark", lang: "Language" },
  skip: "Skip to content",
}

const dictionaries: Record<Locale, Dictionary> = { de, en }

export const getDictionary = (lang: Locale) => dictionaries[lang]
