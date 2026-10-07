"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Weiter ins Bücherzimmer; der Link bleibt stehen, falls das Weiterleiten nicht klappt */
export function Moved() {
  useEffect(() => {
    location.replace("/zimmer#von-dir");
  }, []);
  return (
    <main className="linen table-surface text-on-table-2 min-h-svh bg-table px-4 pt-6 text-sm md:px-8">
      <Link href="/zimmer#von-dir" className="text-on-table underline decoration-mark decoration-2 underline-offset-4">
        Deine Bücher liegen jetzt im Bücherzimmer
      </Link>
    </main>
  );
}
