"use client";

import type { SignInProvider } from "@/lib/firebase";
import { de, useT } from "@/lib/i18n";

// Anmelden mit Apple und Google, gleich groß und gleich gewichtet (App-Store-Richtlinie 4.8).
// Beide Knöpfe folgen den Vorgaben der Anbieter: weiße Fläche, Logo links, Systemschrift, Apple zuerst.
// Absichtlich ohne Firebase: die Landing lädt das SDK erst beim Tippen.

const APPLE = (
  <svg aria-hidden viewBox="0 0 24 24" className="size-[18px] shrink-0" fill="currentColor">
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
  </svg>
);

const GOOGLE = (
  <svg aria-hidden viewBox="0 0 48 48" className="size-[18px] shrink-0">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

/**
 * Apple nur zeigen, wenn der Anbieter in Firebase eingerichtet ist (Services ID app.calima.web, Schlüssel),
 * sonst scheitert die Anmeldung. Eingerichtet seit Oktober 2026; die App braucht Apple für die Einreichung (4.8).
 */
export const APPLE_READY = true;

const OPTIONS = [
  { id: "apple.com", label: de("Mit Apple anmelden"), icon: APPLE },
  { id: "google.com", label: de("Mit Google anmelden"), icon: GOOGLE },
].filter((o) => APPLE_READY || o.id !== "apple.com") as { id: SignInProvider; label: string; icon: React.ReactNode }[];

/**
 * busy: der Anbieter, dessen Fenster gerade offen ist. warm: Firebase schon laden, wenn der Finger
 * auf einem Knopf landet (Landing), damit das Fenster beim Tippen sofort aufgeht.
 */
export function SignInButtons({
  onPick,
  busy = null,
  disabled = false,
  warm,
  tone = "white",
  className = "",
}: {
  onPick: (provider: SignInProvider) => void;
  busy?: SignInProvider | null;
  disabled?: boolean;
  warm?: () => void;
  /** cloth: als Hauptknopf der Ansicht aus Buchleinen, nur solange es einen Anbieter gibt (mit Apple bleiben beide gleich, 4.8) */
  tone?: "white" | "cloth";
  className?: string;
}) {
  const cloth = tone === "cloth" && OPTIONS.length === 1;
  const t = useT();
  return (
    <div className={`flex w-full max-w-[19rem] flex-col gap-3 ${className}`}>
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          disabled={disabled || busy !== null}
          onClick={() => onPick(o.id)}
          onPointerDown={warm}
          onFocus={warm}
          className={
            cloth
              ? // Logo auf weißem Grund, wie Google es auf farbigen Knöpfen verlangt
                "linen relative flex min-h-12 items-center gap-3 overflow-hidden rounded-full bg-cloth py-1.5 pr-6 pl-1.5 text-[16px] font-semibold text-cloth-ink transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-60"
              : "flex min-h-11 items-center justify-center gap-2.5 rounded-full bg-white px-5 py-2.5 font-sans text-[16px] font-medium text-black transition-[opacity,transform] duration-150 ease-out hover:opacity-90 active:scale-[0.96] disabled:opacity-60"
          }
          style={cloth ? undefined : { fontFamily: "system-ui, -apple-system, sans-serif" }}
        >
          {cloth ? <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-white">{o.icon}</span> : o.icon}
          <span className="relative">{busy === o.id ? t("Einen Moment …") : t(o.label)}</span>
        </button>
      ))}
    </div>
  );
}
