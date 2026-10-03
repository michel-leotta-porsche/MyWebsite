import type { MDXComponents } from "mdx/types"
import Link from "next/link"
import { Callout } from "@/components/system/callout"
import { CodeBlock, InlineCode } from "@/components/system/code-block"
import { Quote } from "@/components/system/quote"
import { Table, TBody, TD, TH, THead, TR } from "@/components/system/table"
import { Checklist } from "@/components/system/checklist"
import { Stat, StatGrid } from "@/components/system/stat"

/*
 * MDX nutzt dieselben Bausteine wie die Seiten. Blogposts schreiben Markdown,
 * Sonderfälle (Callout, Checkliste, Statistik) als JSX.
 * Code-Blöcke (```lang) werden zu <CodeBlock> mit Kopier-Button.
 */
const components: MDXComponents = {
  h2: (p) => <h2 className="t-h3 mt-16 mb-4 scroll-mt-24" {...p} />,
  h3: (p) => <h3 className="t-h4 mt-10 mb-3 scroll-mt-24" {...p} />,
  p: (p) => <p className="my-5 max-w-[68ch] text-ink-2" {...p} />,
  a: ({ href = "", ...p }) => (
    <Link href={href} className="border-b border-line pb-0.5 font-medium text-ink transition-colors hover:border-ink" {...p} />
  ),
  ul: (p) => <ul className="my-5 max-w-[68ch] list-[square] pl-5 text-ink-2 marker:text-ink-3 [&>li+li]:mt-2" {...p} />,
  ol: (p) => <ol className="my-5 max-w-[68ch] list-decimal pl-5 text-ink-2 marker:font-mono marker:text-ink-3 [&>li+li]:mt-2" {...p} />,
  strong: (p) => <strong className="font-semibold text-ink" {...p} />,
  hr: () => <hr className="my-12 border-line" />,
  blockquote: ({ children }) => <Quote>{children}</Quote>,
  code: ({ children }) => <InlineCode>{children}</InlineCode>,
  pre: ({ children }) => {
    const el = children as React.ReactElement<{ className?: string; children?: string; title?: string }>
    const language = el.props.className?.replace("language-", "")
    return <CodeBlock code={String(el.props.children ?? "").trimEnd()} language={language} title={el.props.title} />
  },
  table: (p) => <Table {...p} />,
  thead: THead,
  tbody: TBody,
  tr: TR,
  th: TH,
  td: TD,
  Callout,
  Checklist,
  Stat,
  StatGrid,
}

export function useMDXComponents(): MDXComponents {
  return components
}
