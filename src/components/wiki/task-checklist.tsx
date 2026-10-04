"use client"

import { useParams } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"
import { hasLocale } from "@/i18n/config"
import { getDictionary } from "@/i18n/dictionaries"
import { Node } from "@/components/system/checklist"

export type Task = { title: ReactNode; text?: ReactNode }

/** Checkliste zum Abhaken. Der Stand bleibt pro Leser im Browser (localStorage, Schlüssel nach id). */
export function TaskChecklist({ id, items }: { id: string; items: Task[] }) {
  const { lang } = useParams<{ lang?: string }>()
  const t = getDictionary(lang && hasLocale(lang) ? lang : "de").checklist
  const key = `checklist:${id}`
  const [done, setDone] = useState<boolean[]>(() => items.map(() => false))

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? "[]")
      // eslint-disable-next-line react-hooks/set-state-in-effect -- gespeicherter Stand erst nach dem Hydrieren
      if (Array.isArray(saved)) setDone(items.map((_, i) => saved[i] === true))
    } catch {}
  }, [key, items])

  function update(next: boolean[]) {
    setDone(next)
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {}
  }

  const count = done.filter(Boolean).length
  return (
    <div className="my-8">
      <ul className="border-t border-ink">
        {items.map((it, i) => (
          <li key={i} className="border-b border-line">
            <label className="grid cursor-pointer grid-cols-[13px_1fr] items-start gap-4 py-3.5">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={done[i]}
                onChange={(e) => update(done.map((d, j) => (j === i ? e.target.checked : d)))}
              />
              <span className="mt-[5px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-signal-ink">
                <Node state={done[i] ? "done" : "open"} />
              </span>
              <span className="text-ink-2 [&_b]:font-semibold [&_b]:text-ink">
                <b>{it.title}</b> {it.text}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between">
        <span className="t-data text-ink-3" aria-live="polite">
          {count} {t.of} {items.length} {t.done}
        </span>
        <button
          type="button"
          onClick={() => update(items.map(() => false))}
          className="t-label min-h-6 cursor-pointer text-ink-3 transition-colors duration-160 hover:text-ink"
        >
          {t.reset}
        </button>
      </div>
    </div>
  )
}
