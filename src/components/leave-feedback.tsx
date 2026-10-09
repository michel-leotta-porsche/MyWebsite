"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { Check, PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { noteClass } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { notify } from "@/components/ui/toaster";
import { isAbusive } from "@/lib/note-filter";
import { leaveNote, type Share } from "@/lib/store";

const EAR_DELAY_MS = 5000;

/**
 * Zettel und Eselsohren zurück an den, der das Buch hingelegt hat: auf der Gastseite (/b?t=…) und im Bücherzimmer unter „Für dich“.
 * Gilt für mehrere Bücher zugleich; was geknickt ist, merkt es sich je Link.
 */
export function useFeedback(from: (share: Share) => string) {
  const [ears, setEars] = useState<Record<string, number[]>>({});
  // Eselsohren gehen erst nach ein paar Sekunden raus; bis dahin lassen sie sich zurücknehmen (UX-Kritik K12)
  const earTimers = useRef(new Map<string, number>());
  const [earsSent, setEarsSent] = useState<Record<string, number[]>>({});
  const [writing, setWriting] = useState<Share | null>(null);
  const [text, setText] = useState("");
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    const timers = earTimers.current;
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  const add = (set: typeof setEars, token: string, no: number) => set((m) => ({ ...m, [token]: [...(m[token] ?? []), no] }));
  const remove = (set: typeof setEars, token: string, no: number) => set((m) => ({ ...m, [token]: (m[token] ?? []).filter((x) => x !== no) }));

  const earsOf = (share: Share) => ears[share.token] ?? [];
  const sentOf = (share: Share) => earsSent[share.token] ?? [];

  const toggleEar = (share: Share, no: number) => {
    const { token } = share;
    if (sentOf(share).includes(no)) return;
    const key = `${token}:${no}`;
    const pending = earTimers.current.get(key);
    if (pending !== undefined) {
      window.clearTimeout(pending);
      earTimers.current.delete(key);
      remove(setEars, token, no);
      return;
    }
    add(setEars, token, no);
    notify(`Eselsohr bei Tafel ${no}`, { duration: EAR_DELAY_MS, action: { label: "Rückgängig", onClick: () => toggleEar(share, no) } });
    earTimers.current.set(
      key,
      window.setTimeout(() => {
        earTimers.current.delete(key);
        leaveNote(token, { kind: "ear", no, from: from(share) })
          .then(() => add(setEarsSent, token, no))
          .catch(() => {
            remove(setEars, token, no);
            notify("Das Eselsohr ist nicht angekommen. Versuch es bitte nochmal.");
          });
      }, EAR_DELAY_MS),
    );
  };

  /** Knöpfe im Kopf des offenen Buchs: Eselsohr an der ersten Tafel der aufgeschlagenen Seite, Zettel, und was `more` mitbringt */
  const extra = (share: Share, plates: number[], more?: ReactNode) => {
    const no = plates[0];
    const on = no !== undefined && earsOf(share).includes(no);
    return (
      <>
        {no !== undefined &&
          (sentOf(share).includes(no) ? (
            <span className="text-on-table-2 inline-flex min-h-9 items-center gap-1.5">
              <Check aria-hidden className="size-4" />
              Eselsohr bei {share.fromName}
            </span>
          ) : (
            <Button size="sm" aria-pressed={on} haptic="select" className="aria-pressed:bg-on-table aria-pressed:text-table" onClick={() => toggleEar(share, no)}>
              <Dogear on={on} />
              Eselsohr
            </Button>
          ))}
        <Button
          size="sm"
          onClick={() => {
            setFailed(null);
            setWriting(share);
          }}
        >
          <PenLine aria-hidden />
          Zettel
        </Button>
        {more}
      </>
    );
  };

  const sheet = (
    <Sheet
      open={writing !== null}
      onOpenChange={(open) => !open && setWriting(null)}
      title={`Zettel an ${writing?.fromName ?? ""}`}
      description={`Nur ${writing?.fromName ?? ""} liest das.`}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const note = text.trim();
          const share = writing;
          if (!note || !share) return;
          setFailed(null);
          if (isAbusive(note)) {
            setFailed("So etwas gehört nicht auf einen Zettel. Formulier es bitte anders.");
            return;
          }
          leaveNote(share.token, { kind: "note", text: note, from: from(share) })
            .then(() => {
              setText("");
              setWriting(null);
              notify(`Dein Zettel liegt bei ${share.fromName}. Danke!`);
            })
            .catch(() => setFailed("Der Zettel ist nicht angekommen. Versuch es bitte nochmal."));
        }}
      >
        <label htmlFor="note" className="sr-only">
          Zettel
        </label>
        <textarea
          id="note"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 280))}
          rows={4}
          className={noteClass}
          placeholder="Was dir gefällt, eine Frage zum Rezept …"
        />
        {failed && (
          <p role="alert" className="text-danger mt-2 text-sm font-semibold">
            {failed}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-ink-2 text-[13px] tabular-nums">{text.length} / 280</span>
          <Button type="submit" variant="ink" disabled={!text.trim()}>
            Hinlegen
          </Button>
        </div>
      </form>
    </Sheet>
  );

  return { earsOf, toggleEar, extra, sheet };
}

/** Ecke eines Blatts, umgeknickt solange das Eselsohr gesetzt ist */
function Dogear({ on }: { on: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round">
      <path d="M5 3h9l5 5v13H5z" />
      <path d="M14 3v5h5" className={on ? "fill-current" : ""} />
    </svg>
  );
}
