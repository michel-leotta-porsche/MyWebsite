"use client";

import { useState } from "react";

import type { Persona, Statement } from "@/content/qfd";

/** Personen als Karten, darunter ihre Aussagen; ein Klick filtert */
export function VoiceOfCustomer({ personas, statements }: { personas: Persona[]; statements: Statement[] }) {
  const [who, setWho] = useState<string | null>(null);
  const shown = who ? statements.filter((s) => s.persona === who) : statements;
  return (
    <>
      <ul className="grid gap-px bg-on-table-2/25 sm:grid-cols-2 lg:grid-cols-4">
        {personas.map((p) => (
          <li key={p.id} className="bg-table">
            <button
              type="button"
              aria-pressed={who === p.id}
              onClick={() => setWho(who === p.id ? null : p.id)}
              className={`group block h-full w-full p-5 text-left ${who === p.id ? "bg-on-table/5" : ""}`}
            >
              <span className="text-on-table block font-semibold decoration-mark decoration-2 underline-offset-4 group-hover:underline">
                {p.name}
              </span>
              <span className="text-on-table-2 mt-1 block text-[13px] leading-snug">{p.profile}</span>
              <span className="text-on-table-2 mt-1 block text-[12px]">{p.devices}</span>
              <span className="text-on-table mt-3 block text-sm leading-snug">„{p.keyQuote}“</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="text-on-table-2 mt-6 text-sm" aria-live="polite">
        {who ? `${shown.length} Aussagen von ${personas.find((p) => p.id === who)?.name}` : `Alle ${statements.length} Aussagen`}
        {who && (
          <button type="button" onClick={() => setWho(null)} className="text-on-table ml-3 underline decoration-mark decoration-2 underline-offset-4">
            alle zeigen
          </button>
        )}
      </p>
      <ul className="mt-3 columns-1 gap-8 md:columns-2">
        {shown.map((s) => (
          <li key={s.id} className="mb-4 break-inside-avoid border-t border-on-table-2/25 pt-3">
            <p className="text-on-table text-base leading-snug">„{s.text}“</p>
            <p className="text-on-table-2 mt-1 text-[12px]">
              {s.id} · {personas.find((p) => p.id === s.persona)?.name ?? s.persona} · {s.situation}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
