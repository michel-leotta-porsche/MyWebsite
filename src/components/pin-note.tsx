"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Minus } from "lucide-react";

import { useT } from "@/lib/i18n";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/**
 * Ein Zettel, der an einer Stelle im Foto hängt. Offen liegt er als Papier mit Büroklammer auf dem Bild,
 * klein bleibt nur ein Marker: ein umgeknicktes Fähnchen mit dem Anfangsbuchstaben, damit das Foto frei bleibt.
 * draft: wird gerade geschrieben; mine: schon hingelegt (Leser); theirs: von jemand anderem (Macher des Buchs).
 */
export function PinNote({
  kind,
  text,
  who,
  open,
  onOpenChange,
  onSend,
  onDiscard,
  flipX,
  flipY,
  mark,
}: {
  kind: "draft" | "mine" | "theirs";
  text: string;
  /** draft und mine: bei wem der Zettel landet; theirs: wer ihn geschrieben hat */
  who: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend?: (text: string) => Promise<void>;
  onDiscard?: () => void;
  /** nah am rechten oder unteren Rand: der Zettel klappt nach links oder oben auf */
  flipX?: boolean;
  flipY?: boolean;
  /** Buchstabe auf dem Marker; sonst der Anfang von `who` (theirs) */
  mark?: string;
}) {
  const reduce = useReducedMotion() ?? false;
  const t = useT();
  const [draft, setDraft] = useState(text);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const initial = (mark ?? (kind === "theirs" ? who : "")).trim().charAt(0).toUpperCase() || "·";

  useEffect(() => {
    if (kind === "draft") area.current?.focus({ preventScroll: true });
  }, [kind]);

  const send = () => {
    const body = draft.trim();
    if (!body || !onSend) return;
    setBusy(true);
    setFailed(null);
    onSend(body)
      .catch((e: unknown) => setFailed(e instanceof Error && e.message ? e.message : t("Der Zettel ist nicht angekommen. Versuch es bitte nochmal.")))
      .finally(() => setBusy(false));
  };

  const shown = kind === "draft" || open;
  return (
    <div className="relative">
      <AnimatePresence initial={false} mode="popLayout">
        {shown ? (
          <motion.div
            key="slip"
            role={kind === "draft" ? "dialog" : "note"}
            aria-label={kind === "draft" ? t("Zettel an {who}", { who }) : kind === "mine" ? t("Dein Zettel bei {who}", { who }) : t("Zettel von {who}", { who })}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, rotate: 0 }}
            animate={{ opacity: 1, scale: 1, rotate: -2 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="pin-slip absolute w-[min(176px,46vw)] px-3 pt-4 pb-2"
            style={{
              [flipX ? "right" : "left"]: -14,
              [flipY ? "bottom" : "top"]: -10,
              transformOrigin: `${flipX ? "right" : "left"} ${flipY ? "bottom" : "top"}`,
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                if (kind === "draft") onDiscard?.();
                else onOpenChange(false);
              }
            }}
          >
            <span aria-hidden className="pin-clip" style={{ [flipX ? "right" : "left"]: 18 }} />
            {kind === "draft" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <label className="sr-only" htmlFor="pin-text">
                  {t("Zettel an {who}", { who })}
                </label>
                <textarea
                  id="pin-text"
                  ref={area}
                  value={draft}
                  maxLength={280}
                  rows={3}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t("Schreib {who} etwas zu dieser Stelle …", { who })}
                  className="pin-hand text-ink placeholder:text-ink-2/70 block w-full resize-none bg-transparent text-[19px] leading-[1.05] outline-none"
                />
                {failed && (
                  <p role="alert" className="text-danger mt-1 text-[11px] font-semibold">
                    {failed}
                  </p>
                )}
                <div className="mt-1.5 flex items-center justify-between gap-2 text-[12px]">
                  <button type="button" onClick={onDiscard} className="text-ink-2 min-h-8 px-1">
                    {t("Weg")}
                  </button>
                  <button type="submit" disabled={!draft.trim() || busy} className="bg-ink text-paper min-h-8 rounded-full px-3 disabled:opacity-40">
                    {t("Hinlegen")}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <p className="pin-hand text-ink text-[19px] leading-[1.05] break-words whitespace-pre-wrap">{text}</p>
                <div className="text-ink-2 mt-1.5 flex items-center justify-between gap-2 text-[11px]">
                  <span>{kind === "mine" ? t("bei {who}", { who }) : t("von {who}", { who })}</span>
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    aria-label={t("Zettel klein machen")}
                    className="hover:bg-paper-shade -mr-1 grid size-8 place-items-center rounded-full"
                  >
                    <Minus aria-hidden className="size-4" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        ) : (
          <motion.button
            key="marker"
            type="button"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 28 }}
            onClick={() => onOpenChange(true)}
            aria-label={kind === "mine" ? t("Dein Zettel bei {who} öffnen", { who }) : t("Zettel von {who} öffnen", { who })}
            className="pin-marker absolute -top-[22px] -left-[22px] grid size-11 place-items-center"
          >
            <span aria-hidden className="pin-flag">
              {initial}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
