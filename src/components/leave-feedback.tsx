"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { Check, PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { noteClass } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { notify } from "@/components/ui/toaster";
import { isAbusive } from "@/lib/note-filter";
import type { Pinned, Spot } from "@/components/book";
import { PinNote } from "@/components/pin-note";
import { leaveNote, type Share } from "@/lib/store";

const EAR_DELAY_MS = 5000;

/** Was ich in einem fremden Buch hinterlassen habe, je Link auf diesem Gerät gemerkt: der Macher liest es, ich sehe es sonst nicht mehr */
type Saved = { ears: number[]; pins: (Spot & { id: string; text: string })[] };
const savedKey = (token: string) => `calima:hinterlassen:${token}`;
function readSaved(token: string): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(savedKey(token)) ?? "null") as Partial<Saved> | null;
    return { ears: Array.isArray(v?.ears) ? v.ears : [], pins: Array.isArray(v?.pins) ? v.pins : [] };
  } catch {
    return { ears: [], pins: [] };
  }
}
const round = (v: number) => Math.round(v * 1000) / 1000;

/**
 * Zettel und Eselsohren zurück an den, der das Buch hingelegt hat: auf der Gastseite (/b?t=…) und im Bücherzimmer unter „Für dich“.
 * Gilt für mehrere Bücher zugleich; was geknickt ist, merkt es sich je Link.
 */
export function useFeedback(from: (share: Share) => string) {
  const [ears, setEars] = useState<Record<string, number[]>>({});
  // Eselsohren gehen erst nach ein paar Sekunden raus; bis dahin lassen sie sich zurücknehmen (UX-Kritik K12)
  const earTimers = useRef(new Map<string, number>());
  const [saved, setSaved] = useState<Record<string, Saved>>({});
  const [draftPin, setDraftPin] = useState<(Spot & { token: string }) | null>(null);
  const [openPins, setOpenPins] = useState<string[]>([]);
  const [writing, setWriting] = useState<Share | null>(null);
  const [text, setText] = useState("");
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    const timers = earTimers.current;
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  const add = (set: typeof setEars, token: string, no: number) => set((m) => ({ ...m, [token]: [...(m[token] ?? []), no] }));
  const remove = (set: typeof setEars, token: string, no: number) => set((m) => ({ ...m, [token]: (m[token] ?? []).filter((x) => x !== no) }));

  const savedOf = (token: string) => saved[token] ?? (typeof window === "undefined" ? { ears: [], pins: [] } : readSaved(token));
  const save = (token: string, change: (s: Saved) => Saved) =>
    setSaved((m) => {
      const next = change(m[token] ?? readSaved(token));
      try {
        localStorage.setItem(savedKey(token), JSON.stringify(next));
      } catch {}
      return { ...m, [token]: next };
    });
  const sentOf = (share: Share) => savedOf(share.token).ears;
  const earsOf = (share: Share) => [...new Set([...sentOf(share), ...(ears[share.token] ?? [])])];

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
          .then(() => save(token, (s) => ({ ...s, ears: [...s.ears.filter((x) => x !== no), no] })))
          .catch(() => {
            remove(setEars, token, no);
            notify("Das Eselsohr ist nicht angekommen. Versuch es bitte nochmal.");
          });
      }, EAR_DELAY_MS),
    );
  };

  /** Langes Drücken aufs Foto: dort einen Zettel anheften und gleich schreiben */
  const pin = (share: Share, spot: Spot) => setDraftPin({ ...spot, x: round(spot.x), y: round(spot.y), token: share.token });

  /** Meine Zettel in diesem Buch, klein als Marker, und der, den ich gerade schreibe */
  const pinsOf = (share: Share): Pinned[] => {
    const toggle = (id: string, open: boolean) => setOpenPins((l) => (open ? [...l.filter((x) => x !== id), id] : l.filter((x) => x !== id)));
    const mine: Pinned[] = savedOf(share.token).pins.map((p) => ({
      key: p.id,
      no: p.no,
      x: p.x,
      y: p.y,
      node: (
        <PinNote
          kind="mine"
          mark={from(share)}
          text={p.text}
          who={share.fromName}
          open={openPins.includes(p.id)}
          onOpenChange={(o) => toggle(p.id, o)}
          flipX={p.x > 0.5}
          flipY={p.y > 0.6}
        />
      ),
    }));
    const d = draftPin?.token === share.token ? draftPin : null;
    if (!d) return mine;
    return [
      ...mine,
      {
        key: `entwurf-${d.no}-${d.x}-${d.y}`,
        no: d.no,
        x: d.x,
        y: d.y,
        node: (
          <PinNote
            kind="draft"
            text=""
            who={share.fromName}
            open
            onOpenChange={() => {}}
            onDiscard={() => setDraftPin(null)}
            onSend={async (t) => {
              if (isAbusive(t)) throw new Error("So etwas gehört nicht auf einen Zettel. Formulier es bitte anders.");
              await leaveNote(share.token, { kind: "note", text: t, from: from(share), no: d.no, x: d.x, y: d.y }).catch(() => {
                throw new Error("Der Zettel ist nicht angekommen. Versuch es bitte nochmal.");
              });
              const id = `z${Date.now().toString(36)}`;
              save(share.token, (s) => ({ ...s, pins: [...s.pins, { id, no: d.no, x: d.x, y: d.y, text: t }] }));
              setDraftPin(null);
              notify(`Dein Zettel hängt bei ${share.fromName} an dieser Stelle.`);
            }}
            flipX={d.x > 0.5}
            flipY={d.y > 0.6}
          />
        ),
      },
    ];
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

  return { earsOf, toggleEar, extra, sheet, pin, pinsOf };
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
