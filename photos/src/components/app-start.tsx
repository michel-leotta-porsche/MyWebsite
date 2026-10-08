"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LegalLinks } from "@/components/legal";
import { FrameButton, linkClass } from "@/components/ui-base";
import { signInError } from "@/lib/errors";
import { signIn } from "@/lib/firebase";
import { useUser } from "@/lib/use-user";

import drachenbaum from "../../public/photos/08-drachenbaum.jpg";

/**
 * Start der iOS-App statt der Landing: ein Abzug auf dem Tisch, ein Satz, Anmelden.
 * Wer angemeldet ist, landet gleich im Bücherzimmer; bis Firebase das weiß, liegt nur der leere Tisch da.
 */
export function AppStart() {
  const user = useUser();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (user) router.replace("/zimmer");
  }, [user, router]);

  if (user !== null) return <main className="linen table-surface min-h-svh bg-table" />;
  return (
    <main className="linen table-surface relative flex min-h-svh flex-col bg-table px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-1 items-center justify-center py-6">
        <Image
          src={drachenbaum}
          alt=""
          sizes="(max-width: 768px) 50vw, 18rem"
          priority
          className="h-[min(36svh,26rem)] w-auto -rotate-3 border-[6px] border-paper shadow-[0_28px_50px_-18px_rgb(12_10_8/0.75),0_6px_14px_-6px_rgb(12_10_8/0.5)]"
        />
      </div>
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-on-table text-[44px] leading-[0.9] font-bold tracking-[-0.04em]" style={{ fontVariationSettings: '"wdth" 75, "opsz" 96' }}>
          Deine Fotos, gebunden.
        </h1>
        <p className="text-on-table mt-4 text-lg leading-relaxed opacity-80">Ein paar Fotos werden ein Buch, das man wirklich umblättert. Freunde lesen per Link, ohne Konto.</p>
        <div className="mt-7">
          <FrameButton
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError(null);
              signIn()
                .then(() => router.replace("/zimmer"))
                .catch((e) => {
                  setBusy(false);
                  setError(signInError(e));
                });
            }}
          >
            Mit Google anmelden
          </FrameButton>
          {error && (
            <p role="alert" className="text-on-table mt-3 text-sm">
              {error}
            </p>
          )}
        </div>
        <p className="text-on-table-2 mt-5 text-sm">
          Kostenlos. Mit dem Anmelden gelten die{" "}
          <Link href="/nutzungsbedingungen" className={`${linkClass} underline`}>
            Nutzungsbedingungen
          </Link>
          .
        </p>
        <LegalLinks className="mt-4" />
      </div>
    </main>
  );
}
