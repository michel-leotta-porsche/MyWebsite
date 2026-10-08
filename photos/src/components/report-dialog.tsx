"use client";

import Link from "next/link";
import { useState } from "react";

import { inputClass, SlipDialog } from "@/components/app-ui";
import { friendlyError } from "@/lib/errors";
import { REPORT_REASONS, reportShare, type ReportReason, type Share } from "@/lib/store";

/**
 * Ein geteiltes Buch melden (App Store 1.2). Geht auch ohne Konto; Michel prüft Meldungen innerhalb von 24 Stunden.
 * onBlock: angemeldet zusätzlich alle Bücher dieser Person ausblenden.
 */
export function ReportDialog({ share, reporter, onClose, onBlock }: { share: Share; reporter: string | null; onClose: () => void; onBlock?: () => void | Promise<void> }) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [text, setText] = useState("");
  const [block, setBlock] = useState(!!onBlock);
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!reason) return;
    setState("busy");
    setError(null);
    try {
      await reportShare(share, reason, text.trim(), reporter);
      if (block && onBlock) await onBlock();
      setState("sent");
    } catch (e) {
      setState("idle");
      setError(friendlyError(e));
    }
  };

  return (
    <SlipDialog label="Buch melden" onClose={() => state !== "busy" && onClose()}>
      {state === "sent" ? (
        <div className="text-sm leading-relaxed">
          <p>Danke. Ich sehe mir das innerhalb von 24 Stunden an und nehme das Buch herunter, wenn es gegen die Nutzungsbedingungen verstößt.</p>
          {block && onBlock && <p className="mt-2">Bücher von {share.fromName} siehst du nicht mehr. Im Profil kannst du das zurücknehmen.</p>}
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <p className="text-sm leading-relaxed">
            „{share.book?.title || "Ohne Titel"}“ von {share.fromName}. Was stimmt nicht?
          </p>
          <fieldset className="mt-3">
            <legend className="sr-only">Grund</legend>
            {(Object.keys(REPORT_REASONS) as ReportReason[]).map((r) => (
              <label key={r} className="flex min-h-11 items-center gap-3 text-sm">
                <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-ink" />
                {REPORT_REASONS[r]}
              </label>
            ))}
          </fieldset>
          <label htmlFor="report-text" className="text-ink-2 mt-2 block text-[13px]">
            Magst du kurz sagen, worum es geht? (freiwillig)
          </label>
          <textarea id="report-text" value={text} onChange={(e) => setText(e.target.value.slice(0, 500))} rows={3} className={inputClass} />
          {onBlock && (
            <label className="mt-2 flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" checked={block} onChange={(e) => setBlock(e.target.checked)} className="accent-ink" />
              Bücher von {share.fromName} nicht mehr zeigen
            </label>
          )}
          {error && (
            <p role="alert" className="text-ink mt-2 text-[13px] font-semibold">
              {error}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
            <Link href="/nutzungsbedingungen" className="text-ink-2 text-[13px] underline decoration-mark decoration-2 underline-offset-4">
              Nutzungsbedingungen
            </Link>
            <button
              type="submit"
              disabled={!reason || state === "busy"}
              className="border-ink bg-ink text-paper hover:bg-ink/85 min-h-11 border px-3 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {state === "busy" ? "Sendet …" : "Melden"}
            </button>
          </div>
        </form>
      )}
    </SlipDialog>
  );
}
