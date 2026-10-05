import type { MDXComponents } from "mdx/types"
import Link from "next/link"
import { Callout } from "@/components/system/callout"
import { CodeBlock, InlineCode } from "@/components/system/code-block"
import { Table, TBody, TD, TH, THead, TR } from "@/components/system/table"
import { Stat, StatGrid } from "@/components/system/stat"
import { Code, Pitfalls, Scenario, Sec, SecLabel, Sources, Takeaways } from "@/components/wiki/parts"
import { Quiz } from "@/components/wiki/quiz"
import { ScrollFig } from "@/components/wiki/scroll-fig"
import { ScrollStory } from "@/components/wiki/scroll-story"
import { StepFigure } from "@/components/wiki/step-figure"
import { TaskChecklist } from "@/components/wiki/task-checklist"
import { DragSnap } from "@/components/wiki/drag-snap"
import { Rearrange } from "@/components/wiki/rearrange"
import { SampleGrid } from "@/components/wiki/sample-grid"
import { Scramble, ScrambleSwap } from "@/components/wiki/scramble"
import { ZoomFigure } from "@/components/wiki/zoom-figure"

/*
 * MDX nutzt dieselben Bausteine wie die Seiten. Blogposts schreiben Markdown,
 * Sonderfälle (Callout, Statistik) und die Wiki-Bausteine als JSX
 * (Spezifikation: blog-system/KOMPONENTEN.md im Projektordner).
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
  blockquote: ({ children }) => (
    <blockquote className="t-h3 my-10 max-w-[30ch] border-t border-ink pt-6 font-medium [&_p]:m-0 [&_p]:text-ink">
      {children}
    </blockquote>
  ),
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
  Checklist: TaskChecklist,
  Code,
  DragSnap,
  Pitfalls,
  Quiz,
  Rearrange,
  SampleGrid,
  Scenario,
  Scramble,
  ScrambleSwap,
  ScrollFig,
  ScrollStory,
  Sec,
  SecLabel,
  Sources,
  StepFigure,
  Takeaways,
  ZoomFigure,
  Stat,
  StatGrid,
}

export function useMDXComponents(): MDXComponents {
  return components
}
