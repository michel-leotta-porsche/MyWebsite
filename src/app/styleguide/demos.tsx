"use client"

import { useState } from "react"
import { ProcessRun, type ProcessStep } from "@/components/system/process-run"
import { cn } from "@/lib/utils"

const steps: ProcessStep[] = [
  { label: "Anforderung eingelesen", detail: "PDF, 6 Seiten" },
  { label: "Kontext abgerufen", detail: "GraphRAG · Neo4j" },
  { label: "Agent plant Testfälle", detail: "LangGraph" },
  { label: "Spezifikation erzeugt", detail: "12 Testfälle" },
  { label: "Review & Freigabe", detail: "Mensch entscheidet" },
]

const replayCls =
  "t-label mt-4 cursor-pointer border-b border-line pb-0.5 transition-colors duration-160 hover:border-ink"

export function ProcessRunDemo() {
  const [key, setKey] = useState(0)
  return (
    <div>
      <ProcessRun title="Beispiel-Ablauf" footer="Anforderung → Test" steps={steps} replayKey={key} />
      <button type="button" className={replayCls} onClick={() => setKey((k) => k + 1)}>
        Erneut abspielen
      </button>
    </div>
  )
}

const durations = [
  { label: "160 ms", cls: "duration-160" },
  { label: "500 ms", cls: "duration-500" },
  { label: "900 ms", cls: "duration-900" },
]

export function MotionDemo() {
  const [on, setOn] = useState(true)
  return (
    <div>
      <ul className="border-t border-ink">
        {durations.map((d) => (
          <li key={d.label} className="grid grid-cols-[8ch_1fr] items-center gap-4 border-b border-line py-3">
            <span className="t-data text-ink-3">{d.label}</span>
            <span className="relative h-px bg-line">
              <i
                className={cn(
                  "absolute inset-0 origin-left bg-ink transition-transform ease-out-expo",
                  d.cls,
                  on ? "scale-x-100" : "scale-x-0"
                )}
              />
            </span>
          </li>
        ))}
      </ul>
      <button type="button" className={replayCls} onClick={() => setOn((v) => !v)} aria-pressed={on}>
        {on ? "Zurücksetzen" : "Abspielen"}
      </button>
    </div>
  )
}
