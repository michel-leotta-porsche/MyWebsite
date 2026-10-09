"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { noteClass } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { friendlyError } from "@/lib/errors";
import { useT } from "@/lib/i18n";
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
  const t = useT();

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
    <Sheet open title={t("Buch melden")} onOpenChange={(o) => !o && state !== "busy" && onClose()}>
      {state === "sent" ? (
        <div className="text-sm leading-relaxed">
          <p>{t("Danke. Ich sehe mir das innerhalb von 24 Stunden an und nehme das Buch herunter, wenn es gegen die Nutzungsbedingungen verstößt.")}</p>
          {block && onBlock && <p className="mt-2">{t("Bücher von {name} siehst du nicht mehr. Im Profil kannst du das zurücknehmen.", { name: share.fromName })}</p>}
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <p className="text-sm leading-relaxed">
            {t("„{title}“ von {name}. Was stimmt nicht?", { title: share.book?.title || t("Ohne Titel"), name: share.fromName })}
          </p>
          <fieldset className="mt-3">
            <legend className="sr-only">{t("Grund")}</legend>
            <div className="bg-ink/4 overflow-hidden rounded-tool shadow-[inset_0_0_0_1px_rgb(27_28_26/0.1)]">
              {(Object.keys(REPORT_REASONS) as ReportReason[]).map((r) => (
                <CheckRow key={r} type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)}>
                  {t(REPORT_REASONS[r])}
                </CheckRow>
              ))}
            </div>
          </fieldset>
          <label htmlFor="report-text" className="text-ink-2 mt-2 block text-[13px]">
            {t("Magst du kurz sagen, worum es geht? (freiwillig)")}
          </label>
          <textarea id="report-text" value={text} onChange={(e) => setText(e.target.value.slice(0, 500))} rows={3} className={noteClass} />
          {onBlock && (
            <div className="bg-ink/4 mt-3 overflow-hidden rounded-tool shadow-[inset_0_0_0_1px_rgb(27_28_26/0.1)]">
              <CheckRow type="checkbox" checked={block} onChange={(v) => setBlock(v)}>
                {t("Bücher von {name} nicht mehr zeigen", { name: share.fromName })}
              </CheckRow>
            </div>
          )}
          {error && (
            <p role="alert" className="text-ink mt-2 text-[13px] font-semibold">
              {error}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
            <Link href="/nutzungsbedingungen" className="text-ink-2 text-[13px] underline underline-offset-4">
              {t("Nutzungsbedingungen")}
            </Link>
            <Button type="submit" variant="ink" disabled={!reason || state === "busy"}>
              {state === "busy" ? t("Sendet …") : t("Melden")}
            </Button>
          </div>
        </form>
      )}
    </Sheet>
  );
}

/** Auswahlzeile in einer Listengruppe auf Papier: das native Feld bleibt für Tastatur und Screenreader, sichtbar ist der Haken im Kreis */
function CheckRow({ type, name, checked, onChange, children }: { type: "radio" | "checkbox"; name?: string; checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="relative flex min-h-12 cursor-pointer items-center gap-3 px-4 text-[15px] has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-ink [&+label]:border-t [&+label]:border-ink/10">
      <input type={type} name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="flex-1">{children}</span>
      <span
        aria-hidden
        className="border-ink/30 peer-checked:bg-ink peer-checked:border-ink text-paper grid size-[22px] shrink-0 place-items-center rounded-full border-[1.5px] transition-colors duration-150 [&_svg]:scale-0 [&_svg]:transition-transform [&_svg]:duration-200 peer-checked:[&_svg]:scale-100"
      >
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    </label>
  );
}
