import type { ReactElement, ReactNode } from "react"
import { CodeBlock } from "@/components/system/code-block"

/*
 * Statische Bausteine für Wiki-Artikel (Server-Komponenten).
 * Vorbilder: .scenario, .takeaways, .pitfalls, .sources in blog-system/blog.css.
 */

/** Kleines Mono-Label über einem Abschnitt, z. B. „01 · Problem“. */
export function SecLabel({ children }: { children: ReactNode }) {
  return <span className="t-label mt-section block border-t border-ink pt-3 text-ink-3">{children}</span>
}

/** Abschnitt mit Label und Überschrift. Die id taucht im Inhaltsverzeichnis auf. */
export function Sec({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <>
      <SecLabel>{label}</SecLabel>
      <h2 id={id} className="t-h2 mt-3 mb-6 scroll-mt-24">
        {children}
      </h2>
    </>
  )
}

/** Alltagssituation, 2–4 Sätze. */
export function Scenario({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section aria-label={label} className="relative my-10 pl-6">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-ink" />
      <span className="t-label text-ink-3">{label}</span>
      <div className="t-lede mt-2 max-w-[60ch] text-ink [&>p]:m-0">{children}</div>
    </section>
  )
}

/** Genau drei zitierbare Sätze als Kacheln mit 1px-Fuge. */
export function Takeaways({ label, items }: { label: string; items: ReactNode[] }) {
  return (
    <section aria-label={label} className="my-10">
      <span className="t-label text-ink-3">{label}</span>
      <ol className="mt-3 grid gap-px border-t border-ink bg-line md:grid-cols-3">
        {items.map((it, i) => (
          <li key={i} className="bg-paper pt-4 pr-5 pb-5">
            <span className="t-data text-signal-ink">{String(i + 1).padStart(2, "0")}</span>
            <p className="mt-2 text-[17px] leading-[1.45] font-medium tracking-[-0.01em]">{it}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** Fallstricke aus dem Test: Titel und Ursache mit Lösung. */
export function Pitfalls({ items }: { items: { title: ReactNode; text: ReactNode }[] }) {
  return (
    <ul className="my-8 border-t border-ink">
      {items.map((it, i) => (
        <li key={i} className="grid gap-x-5 gap-y-1 border-b border-line py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <b className="font-semibold tracking-[-0.01em]">
            <span className="t-data mr-2.5 font-normal text-ink-3">{String(i + 1).padStart(2, "0")}</span>
            {it.title}
          </b>
          <p className="m-0 text-ink-2">{it.text}</p>
        </li>
      ))}
    </ul>
  )
}

/** Nummerierte Quellen mit Version. */
export function Sources({ items }: { items: { title: string; href: string; note?: ReactNode }[] }) {
  return (
    <ol className="my-6 border-t border-ink">
      {items.map((s, i) => (
        <li key={s.href} className="grid grid-cols-[2.5em_minmax(0,1fr)] border-b border-line py-2.5 text-ink-2">
          <span className="t-data pt-0.5 text-ink-3">{String(i + 1).padStart(2, "0")}</span>
          <span>
            <a
              href={s.href}
              className="border-b border-line pb-0.5 font-medium text-ink transition-colors duration-160 hover:border-ink"
            >
              {s.title}
            </a>
            {s.note && <> ({s.note})</>}
          </span>
        </li>
      ))}
    </ol>
  )
}

/**
 * Code mit Dateiname. Umschließt einen Markdown-Codeblock:
 *   <Code file=".githooks/commit-msg">
 *   ```sh
 *   …
 *   ```
 *   </Code>
 */
export function Code({ file, children }: { file: string; children: ReactNode }) {
  const pre = children as ReactElement<{ children?: ReactElement<{ className?: string; children?: string }> }>
  const code = pre?.props?.children
  const language = code?.props?.className?.replace("language-", "")
  return (
    <CodeBlock
      code={String(code?.props?.children ?? "").trimEnd()}
      language={language}
      title={file}
    />
  )
}

