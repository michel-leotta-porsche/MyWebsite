"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { Check, PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
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

  /**
   * Knöpfe im Kopf des offenen Buchs: ob ein Eselsohr schon angekommen ist, und „Zettel“, der einen Zettel mitten aufs aufgeschlagene Foto heftet.
   * Knicken geht nur über die gehaltene Ecke; ein Zettel ohne Stelle würde nach dem Hinlegen verschwinden.
   */
  const extra = (share: Share, plates: number[], more?: ReactNode) => {
    const no = plates[0];
    return (
      <>
        {no !== undefined && sentOf(share).includes(no) && (
          <span className="text-on-table-2 inline-flex min-h-9 items-center gap-1.5">
            <Check aria-hidden className="size-4" />
            Eselsohr bei {share.fromName}
          </span>
        )}
        {no !== undefined && (
          <Button size="sm" onClick={() => pin(share, { no, x: 0.5, y: 0.4 })}>
            <PenLine aria-hidden />
            Zettel
          </Button>
        )}
        {more}
      </>
    );
  };

  return { earsOf, toggleEar, extra, pin, pinsOf };
}
