"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { LegalLinks } from "@/components/legal";
import { SignInButtons } from "@/components/sign-in-buttons";
import { linkClass, Wordmark } from "@/components/ui-base";
import { signInError } from "@/lib/errors";
import { signIn, type SignInProvider, type User } from "@/lib/firebase";
import { de, useT } from "@/lib/i18n";
import { useUser } from "@/lib/use-user";

// Kleine Bausteine für Tisch, Editor und Gastlink: Raumkopf, Anmeldung.

export { hitClass, linkClass, TextButton, Wordmark } from "@/components/ui-base";

/** Kopf eines Raums: Wortmarke führt zur Landing Page, daneben der Raum als Überschrift der Seite */
export function RoomTitle({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <Wordmark />
      <span aria-hidden className="text-on-table-2">
        /
      </span>
      <h1 className="text-on-table text-lg font-semibold tracking-[-0.01em]">{children}</h1>
    </div>
  );
}

/** Die Räume hinter der Anmeldung: alle Bücher, man selbst. Gestaltet wird ein einzelnes Buch auf der Werkbank (/neu) */
export const ROOMS = [
  { href: "/zimmer", label: de("Bücherzimmer") },
  { href: "/profil", label: de("Profil") },
] as const;

/** Wege zwischen den Räumen als Umschalter (Pille); der aktuelle Raum ist der helle Daumen und kein Link */
export function RoomNav({ className = "" }: { className?: string }) {
  const path = usePathname();
  const t = useT();
  return (
    <nav aria-label={t("Räume")} className={`bg-on-table/7 inline-flex rounded-full p-[3px] shadow-[inset_0_0_0_1px_rgb(236_230_220/0.1)] ${className}`}>
      {ROOMS.map((r) =>
        path === r.href ? (
          <span key={r.href} aria-current="page" className={`${ROOM_TAB} bg-on-table text-table`}>
            {t(r.label)}
          </span>
        ) : (
          <Link key={r.href} href={r.href} className={`${ROOM_TAB} text-on-table-2 hover:text-on-table`}>
            {t(r.label)}
          </Link>
        ),
      )}
    </nav>
  );
}

const ROOM_TAB = "inline-flex min-h-9 items-center rounded-full px-4 text-sm font-semibold transition-colors duration-150 pointer-coarse:min-h-11";

/**
 * Räume nur mit Anmeldung: solange Firebase prüft, liegt der leere Tisch da, ohne Konto die Anmeldung.
 * Die Daten schützen firestore.rules; das hier ist der Weg, nicht das Schloss.
 */
export function RequireUser({
  title,
  text,
  loading,
  children,
}: {
  title: string;
  text: ReactNode;
  /** was auf dem Tisch liegt, solange Firebase prüft (wird mit vorgerendert, läuft also ohne JavaScript) */
  loading?: ReactNode;
  children: (user: User) => ReactNode;
}) {
  const user = useUser();
  if (user === undefined) return loading ? <main>{loading}</main> : <main className="linen table-surface min-h-svh bg-table" />;
  if (user === null) return <SignInTable title={title}>{text}</SignInTable>;
  return <>{children(user)}</>;
}

/** Leerer Tisch mit Anmeldung */
export function SignInTable({ title, children }: { title: string; children?: ReactNode }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<SignInProvider | null>(null);
  const t = useT();
  return (
    <main className="linen table-surface relative flex min-h-svh flex-col bg-table">
      <header className="flex items-baseline justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-8 md:pt-6">
        <Wordmark />
      </header>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-24">
        <h1 className="text-on-table text-3xl font-bold tracking-[-0.03em]" style={{ fontVariationSettings: '"wdth" 80' }}>
          {title}
        </h1>
        <div className="text-on-table-2 mt-3 text-base leading-relaxed">{children}</div>
        <div className="mt-8">
          <SignInButtons
            busy={busy}
            onPick={(p) => {
              setError(null);
              setBusy(p);
              // angemeldet wechselt RequireUser von selbst in den Raum
              signIn(p).catch((e) => {
                setBusy(null);
                setError(signInError(e));
              });
            }}
          />
          {error && (
            <p role="alert" className="text-on-table mt-3 text-sm">
              {error}
            </p>
          )}
        </div>
        <p className="text-on-table-2 mt-6 text-sm">
          {t("Mit dem Anmelden gelten die")}{" "}
          <Link href="/nutzungsbedingungen" className={`${linkClass} underline`}>
            {t("Nutzungsbedingungen")}
          </Link>
          .
        </p>
        <LegalLinks className="mt-4" />
      </div>
    </main>
  );
}
