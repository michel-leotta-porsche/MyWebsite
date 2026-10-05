import { SectionHead } from "@/components/system/section-head"
import { ArrowLink } from "@/components/system/text-link"
import { siteUrl, href, type Locale } from "@/i18n/config"

/*
 * Über mich. Quelle: content/profil.md im Projektordner.
 * Porsche-Projekte nur mit Zweck, Rolle und Stack, ohne interne Namen oder Kennzahlen.
 */
type Entry = { when: string; title: string; org: string; text?: string }

const content = {
  de: {
    label: "Über mich",
    title: "Softwareentwickler und Systemarchitekt für KI-Anwendungen.",
    lede: "Ich bin Softwareentwickler und Systemarchitekt bei CloudPioneers und arbeite im Auftrag von Porsche an KI-Anwendungen. Davor habe ich bei Porsche als Product Owner und Tech Lead zwei KI-Projekte gesteuert und mitentwickelt. Was ich dabei lerne, schreibe ich in diesem Wiki auf.",
    expLabel: "Erfahrung",
    expTitle: "Von der Anforderung bis zur Cloud",
    projLabel: "Projekte",
    projTitle: "Woran ich gearbeitet habe",
    stackLabel: "Werkzeuge",
    stackTitle: "Womit ich arbeite",
    eduLabel: "Ausbildung",
    eduTitle: "Wirtschaftsinformatik und Kognitionswissenschaft",
    langs: "Deutsch (Muttersprache), Englisch (verhandlungssicher), Spanisch (Grundkenntnisse)",
    contact: "Schreib mir",
    exp: [
      { when: "seit 10/2026", title: "Softwareentwickler & Systemarchitekt", org: "CloudPioneers, im Auftrag von Porsche" },
      { when: "07/2025 – 09/2026", title: "Product Owner Fehlermanagement, AI Product & Tech Lead", org: "Porsche AG", text: "Produktvision, Backlog und Stakeholder im SAFe-Umfeld. Tech Lead und Entwickler eines produktiv eingesetzten KI-Tools für Engineering und Testing." },
      { when: "11/2023 – 05/2025", title: "Werkstudent R&D Smart Services", org: "TRUMPF", text: "Cloud-Migration von Jira und Confluence, eigenes Teilprojekt zur Migration eines Plugins, Management-Reporting mit Power BI." },
      { when: "04/2021 – 07/2025", title: "Wissenschaftliche Hilfskraft", org: "Universität Stuttgart", text: "Prototyp zur softwaregestützten Anforderungspriorisierung in verteilten Scrum-Projekten." },
      { when: "08/2022 – 10/2023", title: "Werkstudent Projektmanagement & Testautomatisierung", org: "NEXUS AG", text: "Scrum Master, Azure DevOps, C#-Anwendung zur Übertragung von Aufgaben, Tests mit Ranorex." },
    ] as Entry[],
    projects: [
      { when: "Porsche", title: "KI-Tool: aus Anforderungen werden Testspezifikationen", org: "Tech Lead, Full Stack", text: "Produktiv im Einsatz. Backend, Frontend und AWS-Infrastruktur mit Terraform." },
      { when: "Porsche", title: "KI-Assistenz für das Fehlermanagement", org: "Product Owner, Entwicklung", text: "Agentenbasiertes System mit LangGraph und Deep Agents, GraphRAG auf Neo4j, das vorhandenes Wissen und Fehlerdaten nutzbar macht." },
      { when: "TRUMPF", title: "Jira/Confluence in die Cloud, Reporting mit Power BI", org: "Requirements Engineering, Teilprojekt" },
      { when: "NEXUS", title: "Aufgaben-Synchronisation nach Azure DevOps", org: "C#-Entwicklung" },
      { when: "Uni Stuttgart", title: "Masterarbeit: Digitaler Produktpass in der Batterieindustrie", org: "Design Science, Experteninterviews" },
    ] as Entry[],
    edu: [
      { when: "2022 – 2025", title: "M.Sc. Wirtschaftsinformatik", org: "Universität Stuttgart", text: "Schwerpunkte agile Softwareentwicklung und Agile QFD." },
      { when: "2016 – 2020", title: "B.Sc. Kognitionswissenschaft", org: "Universität Tübingen", text: "KI, maschinelles Lernen, Computational Neuroscience, Psychologie." },
    ] as Entry[],
  },
  en: {
    label: "About",
    title: "Software developer and system architect for AI applications.",
    lede: "I am a software developer and system architect at CloudPioneers, building AI applications for Porsche. Before that, I led and co-developed two AI projects at Porsche as product owner and tech lead. What I learn along the way goes into this wiki.",
    expLabel: "Experience",
    expTitle: "From requirements to the cloud",
    projLabel: "Projects",
    projTitle: "What I have worked on",
    stackLabel: "Tools",
    stackTitle: "What I work with",
    eduLabel: "Education",
    eduTitle: "Information systems and cognitive science",
    langs: "German (native), English (fluent), Spanish (basic)",
    contact: "Write to me",
    exp: [
      { when: "since 10/2026", title: "Software developer & system architect", org: "CloudPioneers, working for Porsche" },
      { when: "07/2025 – 09/2026", title: "Product owner defect management, AI product & tech lead", org: "Porsche AG", text: "Product vision, backlog and stakeholders in a SAFe setup. Tech lead and developer of an AI tool for engineering and testing that is in production use." },
      { when: "11/2023 – 05/2025", title: "Working student R&D smart services", org: "TRUMPF", text: "Cloud migration of Jira and Confluence, own subproject migrating a plugin, management reporting with Power BI." },
      { when: "04/2021 – 07/2025", title: "Research assistant", org: "University of Stuttgart", text: "Prototype for software-supported requirements prioritization in distributed Scrum projects." },
      { when: "08/2022 – 10/2023", title: "Working student project management & test automation", org: "NEXUS AG", text: "Scrum master, Azure DevOps, a C# application that syncs tasks, tests with Ranorex." },
    ] as Entry[],
    projects: [
      { when: "Porsche", title: "AI tool: test specifications from requirements", org: "Tech lead, full stack", text: "In production use. Backend, frontend and AWS infrastructure with Terraform." },
      { when: "Porsche", title: "AI assistant for defect management", org: "Product owner, development", text: "Agent-based system with LangGraph and Deep Agents, GraphRAG on Neo4j, that makes existing knowledge and defect data usable." },
      { when: "TRUMPF", title: "Jira/Confluence to the cloud, reporting with Power BI", org: "Requirements engineering, subproject" },
      { when: "NEXUS", title: "Task sync to Azure DevOps", org: "C# development" },
      { when: "Univ. Stuttgart", title: "Master's thesis: the digital product passport in the battery industry", org: "Design science, expert interviews" },
    ] as Entry[],
    edu: [
      { when: "2022 – 2025", title: "M.Sc. Information Systems", org: "University of Stuttgart", text: "Focus on agile software development and Agile QFD." },
      { when: "2016 – 2020", title: "B.Sc. Cognitive Science", org: "University of Tübingen", text: "AI, machine learning, computational neuroscience, psychology." },
    ] as Entry[],
  },
}

const stack = [
  ["KI / AI", "LangGraph, Deep Agents, RAG, GraphRAG, Neo4j"],
  ["Backend", "Python, .NET / C#, Java"],
  ["Frontend", "React, Angular"],
  ["Cloud", "AWS, Terraform"],
  ["Delivery", "SAFe, Scrum, Requirements Engineering, Azure DevOps, Jira"],
]

function Rows({ items }: { items: Entry[] }) {
  return (
    <ul className="border-t border-ink">
      {items.map((e) => (
        <li key={e.title} className="grid-12 gap-y-2 border-b border-line py-6">
          <span className="t-data col-span-full text-ink-3 md:col-span-3">{e.when}</span>
          <div className="col-span-full md:col-span-6">
            <h3 className="t-h4">{e.title}</h3>
            {e.text && <p className="t-small mt-2 max-w-[56ch] text-ink-2">{e.text}</p>}
          </div>
          <span className="col-span-full font-semibold tracking-[-0.01em] md:col-span-3 md:text-right">{e.org}</span>
        </li>
      ))}
    </ul>
  )
}

export function AboutPage({ lang }: { lang: Locale }) {
  const c = content[lang]
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Michel Leotta",
    jobTitle: c.exp[0].title,
    worksFor: { "@type": "Organization", name: "CloudPioneers" },
    alumniOf: ["Universität Stuttgart", "Universität Tübingen"],
    url: `${siteUrl}${href(lang, "about")}`,
    sameAs: ["https://www.linkedin.com/in/michel-leotta-b9b00b106/"],
    knowsAbout: ["LangGraph", "GraphRAG", "Neo4j", "AWS", "Terraform", "Python", ".NET"],
  }
  return (
    <div className="px-gutter">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(person) }} />
      <section className="grid-12 pt-[clamp(56px,9vw,120px)]">
        <span className="t-label col-span-full text-ink-3 md:col-span-3 md:pt-4">{c.label}</span>
        <div className="col-span-full md:col-span-9">
          <h1 className="t-display max-w-[18ch]">{c.title}</h1>
          <p className="t-lede mt-7 max-w-[60ch] text-ink-2">{c.lede}</p>
          <p className="mt-6">
            <ArrowLink href="mailto:michel.leotta@hotmail.com">{c.contact}</ArrowLink>
          </p>
        </div>
      </section>
      <section className="mt-section" aria-labelledby="exp-h">
        <SectionHead label={c.expLabel} title={c.expTitle} id="exp-h" />
        <Rows items={c.exp} />
      </section>
      <section className="mt-section" aria-labelledby="proj-h">
        <SectionHead label={c.projLabel} title={c.projTitle} id="proj-h" />
        <Rows items={c.projects} />
      </section>
      <section className="mt-section" aria-labelledby="stack-h">
        <SectionHead label={c.stackLabel} title={c.stackTitle} id="stack-h" />
        <dl className="grid gap-px border-t border-ink bg-line sm:grid-cols-2 lg:grid-cols-3">
          {stack.map(([k, v]) => (
            <div key={k} className="bg-paper pt-4 pr-5 pb-6">
              <dt className="t-label text-ink-3">{k}</dt>
              <dd className="mt-2 font-medium">{v}</dd>
            </div>
          ))}
          <div className="bg-paper pt-4 pr-5 pb-6">
            <dt className="t-label text-ink-3">{lang === "de" ? "Sprachen" : "Languages"}</dt>
            <dd className="mt-2 font-medium">{c.langs}</dd>
          </div>
        </dl>
      </section>
      <section className="mt-section" aria-labelledby="edu-h">
        <SectionHead label={c.eduLabel} title={c.eduTitle} id="edu-h" />
        <Rows items={c.edu} />
      </section>
    </div>
  )
}
