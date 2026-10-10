"use client";

import { histogramPath, nextTimer, type Aids } from "@/lib/aids";
import { useT } from "@/lib/i18n";

// Profi-Hilfen im Sucher (#185): eine Reihe Schalter unter den Rädern, jeder für sich. Peaking und Zebra zeichnet die App
// in den Sucher, das Histogramm kommt als Ereignis und liegt klein in der Ecke.

const chip = (on: boolean) =>
  `flex-none rounded-full border px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap transition-colors ${
    on ? "bg-on-table text-table-deep border-on-table" : "border-on-table-2/50 text-on-table"
  }`;

/** die Schalter; raw nur, wenn das Gerät ProRAW kann */
export function AidsRow({ aids, raw, onChange }: { aids: Aids; raw: boolean; onChange: (a: Aids) => void }) {
  const t = useT();
  const toggle = (k: "grid" | "peaking" | "zebra" | "histogram" | "raw") => onChange({ ...aids, [k]: !aids[k] });
  return (
    <ul className="flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]" aria-label={t("Hilfen")}>
      <li>
        <button type="button" aria-pressed={aids.grid} onClick={() => toggle("grid")} className={chip(aids.grid)}>
          {t("Raster")}
        </button>
      </li>
      <li>
        <button type="button" aria-pressed={aids.peaking} onClick={() => toggle("peaking")} className={chip(aids.peaking)}>
          {t("Peaking")}
        </button>
      </li>
      <li>
        <button type="button" aria-pressed={aids.zebra} onClick={() => toggle("zebra")} className={chip(aids.zebra)}>
          {t("Zebra")}
        </button>
      </li>
      <li>
        <button type="button" aria-pressed={aids.histogram} onClick={() => toggle("histogram")} className={chip(aids.histogram)}>
          {t("Histogramm")}
        </button>
      </li>
      <li>
        <button
          type="button"
          aria-pressed={aids.timer > 0}
          aria-label={aids.timer ? t("Selbstauslöser {n} s", { n: aids.timer }) : t("Selbstauslöser aus")}
          onClick={() => onChange({ ...aids, timer: nextTimer(aids.timer) })}
          className={`${chip(aids.timer > 0)} tabular-nums`}
        >
          {aids.timer ? t("Timer {n} s", { n: aids.timer }) : t("Timer")}
        </button>
      </li>
      {raw && (
        <li>
          <button type="button" aria-pressed={aids.raw} onClick={() => toggle("raw")} className={chip(aids.raw)}>
            RAW
          </button>
        </li>
      )}
    </ul>
  );
}

/** Histogramm klein oben rechts im Sucher */
export function Histogram({ bins }: { bins: number[] | null }) {
  const t = useT();
  if (!bins?.length) return null;
  return (
    <svg viewBox="0 0 64 28" className="bg-table-deep/60 pointer-events-none absolute top-3 right-3 h-7 w-16 rounded-[4px]" role="img" aria-label={t("Histogramm")}>
      <path d={histogramPath(bins, 64, 28)} className="fill-on-table/70" />
    </svg>
  );
}
