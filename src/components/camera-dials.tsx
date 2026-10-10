"use client";

import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";

import { AUTO, fmtDuration, fmtFocus, fmtISO, fmtKelvin, FOCALS, ISO_STOPS, KELVIN, nearest, SHUTTER_STOPS, type CameraInfo, type Dials, type Meter } from "@/lib/camera";
import { LightIcon, lightOf, useLightName } from "@/components/white-dial";
import { useT } from "@/lib/i18n";

// Die Räder der Kamera (Expertenmodus E1, expertenmodus-workshop-2026-10-09/): wie an einer Fujifilm hat jedes Rad eine
// Raststellung „A“. Alles auf A ist die Kamera von Stufe 1. Es gibt kein Modus-Menü: wer die Zeit festhält, hat eine
// Zeitvorwahl (ISO gleicht aus, der Chip zeigt „ISO A 640“), wer Zeit und ISO festhält, fotografiert von Hand. Ein Rad wird angetippt und dann auf dem Lineal darunter
// gedreht; ein Tipp auf „A“ gibt es der Kamera zurück. Brennweiten sind ehrlich: echte Objektive fett, der Rest Ausschnitt.

export type DialKey = Exclude<keyof Dials, "tint" | "gains">;
/** ein Rad steht von Hand; Weiß auch, wenn die Pipette gemessen hat */
export const isManual = (d: Dials, k: DialKey) => d[k] != null || (k === "kelvin" && d.gains != null);
export const DIALS: DialKey[] = ["duration", "iso", "focus", "kelvin"];

/** Zeiten und ISO, die diese Kamera wirklich kann */
export function stopsFor(key: DialKey, info: CameraInfo | null): number[] {
  if (key === "duration") return SHUTTER_STOPS.filter((s) => !info || (s >= info.limits.minDuration * 0.99 && s <= info.limits.maxDuration * 1.01));
  if (key === "iso") return ISO_STOPS.filter((i) => !info || (i >= info.limits.minISO * 0.99 && i <= info.limits.maxISO * 1.01));
  return [];
}

/** der Wert eines Rads als Text; auf A der Wert, den die Kamera gerade gewählt hat */
export function dialLabel(key: DialKey, dials: Dials, meter: Meter | null): string {
  const v = dials[key];
  if (key === "duration") return fmtDuration(v ?? meter?.duration ?? 1 / 60);
  if (key === "iso") return fmtISO(v ?? meter?.iso ?? 100);
  if (key === "focus") return v == null ? "AF" : fmtFocus(v);
  return fmtKelvin(v ?? meter?.kelvin ?? 5500);
}

export function DialChips({
  dials,
  dial,
  meter,
  focal,
  realFocals,
  grid,
  onPick,
  onFocal,
  onGrid,
  onReset,
}: {
  dials: Dials;
  dial: DialKey | "focal" | null;
  meter: Meter | null;
  focal: number | null;
  realFocals: number[];
  grid: boolean;
  onPick: (k: DialKey | "focal" | null) => void;
  onFocal: (mm: number) => void;
  onGrid: () => void;
  /** Doppeltipp auf ein Rad gibt es der Kamera zurück (Weiß: auch das gemessene) */
  onReset: (k: DialKey) => void;
}) {
  const t = useT();
  const lightName = useLightName();
  const lastTap = useRef<{ k: DialKey; at: number } | null>(null);
  const tap = (k: DialKey, now: number) => {
    const prev = lastTap.current;
    if (prev && prev.k === k && now - prev.at < 350 && isManual(dials, k)) {
      lastTap.current = null;
      onReset(k);
      return;
    }
    lastTap.current = { k, at: now };
    onPick(dial === k ? null : k);
  };
  const names: Record<DialKey, string> = { duration: t("Zeit"), iso: t("ISO"), focus: t("Fokus"), kelvin: t("Weiß") };
  const chip = (on: boolean, manual: boolean) =>
    `flex-none rounded-full border px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap tabular-nums transition-colors ${
      on ? "bg-on-table text-table-deep border-on-table" : manual ? "border-cloth text-cloth" : "border-on-table-2/50 text-on-table"
    }`;
  if (dial === "focal") {
    return (
      <ul className="flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]" aria-label={t("Brennweite")}>
        {/* vorn, damit man es nicht suchen muss */}
        <li className="flex-none">
          <button type="button" onClick={() => onPick(null)} className={chip(false, false)}>
            {t("Fertig")}
          </button>
        </li>
        {FOCALS.map((mm) => {
          const real = realFocals.includes(mm);
          const on = (focal ?? 24) === mm;
          return (
            <li key={mm} className="flex-none">
              <button type="button" onClick={() => onFocal(mm)} aria-pressed={on} className={chip(on, false)} title={real ? t("echtes Objektiv") : t("Ausschnitt aus der Hauptkamera")}>
                <span className={real ? "font-extrabold" : "font-medium"}>{mm}</span>
                <span className="text-[10px]"> mm</span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <ul className="flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]" aria-label={t("Räder")}>
      <li className="flex-none">
        <button type="button" onClick={() => onPick("focal")} className={chip(false, focal != null && focal !== 24)} aria-label={t("Brennweite")}>
          {focal ?? 24}
          <span className="text-[10px]"> mm</span>
        </button>
      </li>
      {DIALS.map((k) => {
        const manual = isManual(dials, k);
        // Halbautomatik: steht nur Zeit oder nur ISO von Hand, gleicht das andere Rad aus. Damit man sieht, dass das Rad
        // wirkt, läuft der ausgleichende Wert hinter dem A mit („Zeit A 1/4“), wie die Anzeige im Sucher einer Kamera
        const partner = k === "duration" ? "iso" : k === "iso" ? "duration" : null;
        const steering = !manual && partner != null && dials[partner] != null && meter != null;
        return (
          <li key={k} className="flex-none">
            <button type="button" onClick={(e) => tap(k, e.timeStamp)} aria-pressed={dial === k} className={chip(dial === k, manual)}>
              {k === "kelvin" && manual ? (
                // Weiß zeigt das gewählte Licht: Gravur und Name statt Kelvin
                <span className="flex items-center gap-1">
                  <LightIcon icon={lightOf(dials).icon} />
                  {lightName(lightOf(dials))}
                </span>
              ) : (
                <span className="opacity-70">{names[k]} </span>
              )}
              {/* fmtISO bringt „ISO“ schon mit, der Name steht davor */}
              {k === "kelvin" && manual ? null : manual ? (
                t(dialLabel(k, dials, meter)).replace(/^ISO /, "")
              ) : steering ? (
                <>
                  A <span className="font-medium">{t(dialLabel(k, dials, meter)).replace(/^ISO /, "")}</span>
                </>
              ) : (
                "A"
              )}
            </button>
          </li>
        );
      })}
      <li className="flex-none">
        <button type="button" onClick={onGrid} aria-pressed={grid} className={`${chip(false, grid)} flex h-full items-center`} aria-label={t("Hilfen")}>
          <span aria-hidden className="grid h-3.5 w-3.5 grid-cols-3 grid-rows-3 gap-px">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} className="bg-current opacity-60" />
            ))}
          </span>
        </button>
      </li>
    </ul>
  );
}

/** Das Lineal unter dem Sucher: ziehen dreht das gewählte Rad, „A“ gibt es der Kamera zurück */
export function Ruler({
  dial,
  dials,
  meter,
  info,
  onChange,
  onDragging,
}: {
  dial: DialKey;
  dials: Dials;
  meter: Meter | null;
  info: CameraInfo | null;
  onChange: (next: Dials) => void;
  onDragging?: (on: boolean) => void;
}) {
  const t = useT();
  const drag = useRef<{ id: number; x: number; start: number } | null>(null);
  const stops = stopsFor(dial, info);
  const manual = dials[dial] != null;
  /** aktueller Wert, auf A der gemessene */
  const current = (): number => {
    const v = dials[dial];
    if (v != null) return v;
    if (dial === "duration") return nearest(stops, meter?.duration ?? 1 / 60);
    if (dial === "iso") return nearest(stops, meter?.iso ?? 100);
    if (dial === "focus") return meter?.lens ?? 0.5;
    return Math.round((meter?.kelvin ?? 5500) / KELVIN.step) * KELVIN.step;
  };
  /** Lage eines Werts auf der Skala in Pixeln: 26 px je Stufe, 320 px für den ganzen Fokusweg, 14 px je 100 K */
  const posOf = (v: number): number => {
    if (dial === "focus") return v * 320;
    if (dial === "kelvin") return ((v - KELVIN.min) / KELVIN.step) * 14;
    return Math.max(0, stops.indexOf(nearest(stops, v))) * 26;
  };
  // die Skala läuft mit dem Finger wie ein Rad: nach links ziehen bringt die größeren Werte unter die Marke
  const valueAt = (start: number, dx: number): number => {
    if (dial === "focus") return Math.min(1, Math.max(0, start - dx / 320));
    if (dial === "kelvin") return Math.min(KELVIN.max, Math.max(KELVIN.min, Math.round((start - (dx / 14) * KELVIN.step) / KELVIN.step) * KELVIN.step));
    const i = stops.indexOf(nearest(stops, start));
    return stops[Math.min(stops.length - 1, Math.max(0, i - Math.round(dx / 26)))];
  };
  const onDown = (e: ReactPointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, start: current() };
    onDragging?.(true);
  };
  const onMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const v = valueAt(d.start, e.clientX - d.x);
    if (v !== dials[dial]) onChange({ ...dials, [dial]: v });
  };
  const onUp = (e: ReactPointerEvent) => {
    if (drag.current?.id !== e.pointerId) return;
    drag.current = null;
    onDragging?.(false);
  };
  // Striche: je Stufe einer (jede dritte, also volle Blende, lang), beim Fokus alle 5 %, bei Weiß je 100 K (je 500 K lang)
  const ticks: { x: number; major: boolean }[] =
    dial === "focus"
      ? Array.from({ length: 21 }, (_, i) => ({ x: i * 16, major: i % 5 === 0 }))
      : dial === "kelvin"
        ? Array.from({ length: (KELVIN.max - KELVIN.min) / KELVIN.step + 1 }, (_, i) => ({ x: i * 14, major: (KELVIN.min / KELVIN.step + i) % 5 === 0 }))
        : stops.map((_, i) => ({ x: i * 26, major: i % 3 === 0 }));
  const hint = dial === "duration" ? t("Zeit") : dial === "iso" ? t("ISO") : dial === "focus" ? t("Schärfe von Hand, mit Lupe") : t("Farbtemperatur");
  return (
    <div className="flex items-center gap-3 px-4">
      <button
        type="button"
        onClick={() => onChange({ ...dials, [dial]: null, ...(dial === "kelvin" ? { tint: null, gains: null } : {}) })}
        aria-pressed={!manual}
        className={`flex-none rounded-full border px-3 py-1.5 text-[13px] font-bold ${manual ? "border-on-table-2/50 text-on-table" : "bg-cloth border-cloth text-cloth-ink"}`}
        aria-label={t("Rad auf A, die Kamera stellt selbst")}
      >
        A
      </button>
      <div
        className="relative min-w-0 flex-1 touch-none select-none"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        role="slider"
        aria-label={hint}
        aria-valuenow={current()}
        aria-valuetext={t(dialLabel(dial, dials, meter))}
        tabIndex={0}
      >
        <div className="relative h-7 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]" aria-hidden>
          <div className="absolute inset-y-0 left-1/2 transition-transform duration-100 ease-out" style={{ transform: `translateX(${-posOf(current())}px)` }}>
            {ticks.map((tk) => (
              <span key={tk.x} className={`absolute bottom-0 w-px -translate-x-1/2 ${tk.major ? "bg-on-table-2 h-3" : "bg-on-table-2/50 h-1.5"}`} style={{ left: tk.x }} />
            ))}
            {/* Fokus (#225): Blume für nah, Berg für unendlich statt Prozent; dazwischen nur Striche, keine Meter */}
            {dial === "focus" && (
              <>
                <FocusIcon kind="near" className="absolute top-0 -translate-x-[calc(100%+6px)]" style={{ left: 0 }} />
                <FocusIcon kind="far" className="absolute top-0 translate-x-[6px]" style={{ left: 320 }} />
              </>
            )}
          </div>
        </div>
        <span aria-hidden className="bg-cloth pointer-events-none absolute top-0 left-1/2 h-7 w-0.5 -translate-x-1/2 rounded-full" />
        <p className={`mt-1 text-center text-[13px] font-semibold tabular-nums ${manual ? "text-cloth" : "text-on-table"}`}>
          {manual ? "" : "A · "}
          {t(dialLabel(dial, dials, meter))}
        </p>
      </div>
    </div>
  );
}

/** Linien-Icons für die Enden der Fokus-Skala: Blume (nah) und Berg (∞) */
function FocusIcon({ kind, className = "", style }: { kind: "near" | "far"; className?: string; style?: CSSProperties }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden className={`text-on-table-2 ${className}`} style={style} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      {kind === "near" ? (
        <path d="M12 21v-8M12 13a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM12 8V5.5M14.5 10.5H17M9.5 10.5H7M12 17c-2.5 0-4-1.5-4.5-3M12 18.5c2.5 0 4-1.5 4.5-3" />
      ) : (
        <path d="M2.5 19.5 9 8.5l3.5 5.5 2.5-3.5 6.5 9zM7.2 11.6 9 13l1.6-1.6" />
      )}
    </svg>
  );
}

/** Drittel-Raster und Wasserwaage über dem Sucher */
export function GridOverlay({ roll }: { roll: number | null }) {
  const level = roll != null && Math.abs(roll) < 0.6;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {[1, 2].map((i) => (
        <span key={`v${i}`} className="bg-on-table/35 absolute top-0 bottom-0 w-px" style={{ left: `${(i / 3) * 100}%` }} />
      ))}
      {[1, 2].map((i) => (
        <span key={`h${i}`} className="bg-on-table/35 absolute right-0 left-0 h-px" style={{ top: `${(i / 3) * 100}%` }} />
      ))}
      {roll != null && (
        <span
          className={`absolute top-1/2 left-1/2 h-0.5 w-[38%] rounded-full transition-colors ${level ? "bg-cloth" : "bg-on-table/70"}`}
          // nur hier verschieben: Tailwinds translate-Klassen kämen als eigene CSS-Eigenschaft noch obendrauf (Linie saß links)
          style={{ transform: `translate(-50%, -50%) rotate(${roll}deg)` }}
        />
      )}
    </div>
  );
}

/** Belichtungsmesser oben links: Abweichung in EV zur Zielbelichtung, wie die Nadel an einer alten Kamera */
export function MeterBadge({ meter }: { meter: Meter | null }) {
  const t = useT();
  if (!meter) return null;
  const off = Math.max(-3, Math.min(3, meter.offset));
  const ok = Math.abs(off) < 0.3;
  return (
    <div className="bg-table-deep/70 text-on-table absolute top-3 left-3 flex items-center gap-2 rounded-full px-2.5 py-1 text-[12px] tabular-nums" aria-label={t("Belichtungsmesser")}>
      <span className="relative block h-1 w-14 rounded-full bg-on-table-2/40" aria-hidden>
        <span className="bg-on-table-2 absolute top-1/2 left-1/2 h-2 w-px -translate-x-1/2 -translate-y-1/2" />
        <span className={`absolute top-1/2 h-2.5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full ${ok ? "bg-cloth" : "bg-on-table"}`} style={{ left: `${50 + (off / 3) * 50}%` }} />
      </span>
      <span className={ok ? "text-cloth" : ""}>{`${off > 0 ? "+" : off < 0 ? "−" : "±"}${Math.abs(off).toFixed(1)}`}</span>
    </div>
  );
}

export const allAuto = (d: Dials) => DIALS.every((k) => !isManual(d, k));
export { AUTO };
