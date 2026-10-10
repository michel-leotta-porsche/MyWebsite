"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Library } from "@/components/books";
import { Shelf, Table } from "@/components/table";
import { Wordmark } from "@/components/ui-base";
import { linkClass } from "@/components/ui-classes";
import { useT } from "@/lib/i18n";
import { sampleBook } from "@/lib/sample-book";

const book = sampleBook();

/**
 * Das öffentliche Beispielbuch (/beispiel): für Postkarten-QR und alle, denen Michel von Calima erzählt.
 * Ohne Konto, ein Tipp schlägt es auf; am Ende ein leiser Weg zum eigenen Buch.
 */
export function SampleBook() {
  const t = useT();
  return (
    <main>
      <Library books={[book]} bookEnd={<OwnBook />}>
        <Table label={t("Beispielbuch Fuerteventura")} title={<Wordmark />}>
          <Shelf
            feature
            books={[book]}
            note={() => t("Ein Beispiel von Michel")}
            meta={(b) => t("{n} Tafeln · ohne Konto", { n: b.plates.length })}
          />
        </Table>
      </Library>
    </main>
  );
}

/** Am Ende des Buchs: kein Knopf, der drängelt, nur ein Satz und ein Link */
function OwnBook() {
  const t = useT();
  return (
    <p className="text-on-table-2 text-sm">
      {t("Ein Buch wie dieses machst du aus deinen Fotos.")}{" "}
      <Link href="/neu" className={`${linkClass} text-on-table inline-flex items-center gap-1 font-semibold`}>
        {t("Eigenes Buch anlegen")}
        <ArrowRight aria-hidden className="size-3.5" />
      </Link>
    </p>
  );
}
