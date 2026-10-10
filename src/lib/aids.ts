// Profi-Hilfen im Sucher (#185, Expertenmodus-Workshop 9.10., Stufe E2): Raster, Peaking, Zebra, Histogramm,
// Selbstauslöser und RAW. Jede einzeln an und aus, gemerkt auf dem Gerät. Nie „Modus“ nennen.

export type Timer = 0 | 3 | 10;
export type Aids = { grid: boolean; peaking: boolean; zebra: boolean; histogram: boolean; timer: Timer; raw: boolean };

export const AIDS_OFF: Aids = { grid: false, peaking: false, zebra: false, histogram: false, timer: 0, raw: false };

/** Gemerktes aus dem Gerät lesen; was nicht passt, ist aus */
export function readAids(v: string | null): Aids {
  let o: Record<string, unknown> = {};
  try {
    const p = JSON.parse(v ?? "null");
    if (p && typeof p === "object") o = p;
  } catch {}
  const on = (k: keyof Aids) => o[k] === true;
  const timer: Timer = o.timer === 3 || o.timer === 10 ? o.timer : 0;
  return { grid: on("grid"), peaking: on("peaking"), zebra: on("zebra"), histogram: on("histogram"), timer, raw: on("raw") };
}

const TIMERS: Timer[] = [0, 3, 10];
export const nextTimer = (t: Timer): Timer => TIMERS[(TIMERS.indexOf(t) + 1) % TIMERS.length];

/** Histogramm (Helligkeit, links dunkel) als geschlossene Fläche für ein SVG der Größe w × h */
export function histogramPath(bins: number[], w: number, h: number): string {
  if (!bins.length) return "";
  const max = Math.max(...bins) || 1;
  const step = bins.length > 1 ? w / (bins.length - 1) : w;
  const pts = bins.map((b, i) => `L${+(i * step).toFixed(1)},${+(h - (b / max) * h).toFixed(1)}`);
  if (bins.length === 1) pts.push(`L${w},${+(h - (bins[0] / max) * h).toFixed(1)}`);
  return `M0,${h} ${pts.join(" ")} L${w},${h} Z`;
}
