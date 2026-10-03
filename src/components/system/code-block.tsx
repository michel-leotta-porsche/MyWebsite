import { cn } from "@/lib/utils"
import { CopyButton } from "./copy-button"

type CodeBlockProps = {
  code: string
  /** Dateiname oder Sprache, erscheint als Label im Kopf */
  title?: string
  language?: string
  className?: string
}

/** Code-Block: Kopfzeile mit Label und Kopier-Button, Mono 13px, horizontal scrollbar. */
export function CodeBlock({ code, title, language, className }: CodeBlockProps) {
  return (
    <figure className={cn("my-8 border-t border-ink bg-paper-2", className)}>
      <figcaption className="flex items-center justify-between gap-4 border-b border-line px-4">
        <span className="t-label truncate text-ink-3">{title ?? language ?? "Code"}</span>
        <CopyButton value={code} />
      </figcaption>
      <pre tabIndex={0} className="overflow-x-auto p-4 text-[13px] leading-[1.7]">
        <code className="font-mono" data-language={language}>
          {code}
        </code>
      </pre>
    </figure>
  )
}

/** Inline-Code im Fließtext. */
export function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="bg-paper-2 px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>
}
