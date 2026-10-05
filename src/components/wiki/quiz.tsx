"use client"

import { useParams } from "next/navigation"
import { useState, type ReactNode } from "react"
import { hasLocale } from "@/i18n/config"
import { getDictionary } from "@/i18n/dictionaries"
import { cn } from "@/lib/utils"

export type QuizQuestion = { q: ReactNode; options: ReactNode[]; ok: number; why: ReactNode }

function useDict() {
  const { lang } = useParams<{ lang?: string }>()
  return getDictionary(lang && hasLocale(lang) ? lang : "de")
}

/** Selbsttest: Antwort wählen, Erklärung erscheint sofort. Richtig/falsch steht als Text, nicht nur als Farbe. */
export function Quiz({ questions }: { questions: QuizQuestion[] }) {
  const t = useDict()
  return (
    <div className="my-8 grid gap-8">
      {questions.map((q, i) => (
        <Question key={i} n={i + 1} item={q} label={t.quiz.label} right={t.quiz.right} wrong={t.quiz.wrong} />
      ))}
    </div>
  )
}

function Question({ n, item, label, right, wrong }: { n: number; item: QuizQuestion; label: string; right: string; wrong: string }) {
  const [pick, setPick] = useState<number | null>(null)
  return (
    <fieldset className="border-t border-ink pt-3">
      <legend className="float-left mb-3 w-full font-semibold tracking-[-0.01em]">
        <span className="t-data mb-1 block font-normal text-ink-3">
          {label} {n}
        </span>
        {item.q}
      </legend>
      <div className="clear-both grid">
        {item.options.map((o, i) => {
          const chosen = pick === i
          const isOk = i === item.ok
          return (
            <button
              key={i}
              type="button"
              aria-pressed={chosen}
              disabled={pick !== null && !chosen && !isOk}
              onClick={() => setPick(i)}
              className={cn(
                "relative cursor-pointer border-b border-line py-3 pr-3 pl-[18px] text-left text-ink-2 transition-colors duration-160 hover:text-ink disabled:cursor-default disabled:opacity-60",
                pick !== null && isOk && "text-ink"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-y-2 left-0 w-[3px] bg-transparent transition-colors duration-160",
                  pick !== null && isOk && "bg-signal",
                  chosen && !isOk && "bg-ink-3"
                )}
              />
              {o}
              {pick !== null && (isOk || chosen) && (
                <span className="t-data ml-2 text-xs text-ink-3">{isOk ? "✓" : "✗"}</span>
              )}
            </button>
          )
        })}
      </div>
      <p aria-live="polite" className="mt-3 max-w-[60ch] text-ink-2">
        {pick !== null && (
          <>
            <b className={cn("font-semibold", pick === item.ok ? "text-signal-ink" : "text-ink")}>
              {pick === item.ok ? right : wrong}
            </b>{" "}
            {item.why}
          </>
        )}
      </p>
    </fieldset>
  )
}
