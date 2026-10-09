"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { buttonClass } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

/** Weiter ins Bücherzimmer; der Link bleibt stehen, falls das Weiterleiten nicht klappt */
export function Moved() {
  const router = useRouter();
  const t = useT();
  useEffect(() => {
    router.replace("/zimmer#von-dir");
  }, [router]);
  return (
    <main className="linen table-surface text-on-table-2 min-h-svh bg-table px-4 pt-[max(1.5rem,env(safe-area-inset-top))] text-sm md:px-8">
      <Link href="/zimmer#von-dir" className={buttonClass("quiet", "sm")}>
        {t("Deine Bücher liegen jetzt im Bücherzimmer")}
      </Link>
    </main>
  );
}
