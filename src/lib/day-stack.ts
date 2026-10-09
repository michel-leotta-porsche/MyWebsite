// Abendstapel (Reisebuch-Workshop 9.10.2026, reisebuch-workshop-2026-10-09/abendstapel-plan.md): tagsüber legt Calimas
// Kamera jedes Foto auf den Stapel des Tages, abends wird er einsortiert. Ein Tag ist ein Stapel mit fester Kennung,
// damit Fotos aus mehreren Kamera-Sitzungen zusammenfinden. Ortszeit des Geräts; einen Ort kennt Calima nicht.

/** der Tag wechselt erst um 4 Uhr früh: ein Abend, der nach Mitternacht weitergeht, gehört noch zum selben Tag */
const DAY_STARTS = 4;
const PREFIX = "tag-";
const pad = (n: number) => String(n).padStart(2, "0");

/** Kennung des Tagesstapels für einen Zeitpunkt (Millisekunden) */
export function dayStack(at: number): string {
  const d = new Date(at - DAY_STARTS * 36e5);
  return `${PREFIX}${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const isDayStack = (stack: string | undefined): stack is string => !!stack && /^tag-\d{4}-\d{2}-\d{2}$/.test(stack);

/** der Tag eines Tagesstapels, mittags Ortszeit: so verrutscht er auch bei der Zeitumstellung nicht */
export function dayOf(stack: string): Date {
  const [y, m, d] = stack.slice(PREFIX.length).split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

/** wie viele Tage der Stapel zurückliegt: 0 heute, 1 gestern */
export function daysAgo(stack: string, now = Date.now()): number {
  return Math.round((dayOf(dayStack(now)).getTime() - dayOf(stack).getTime()) / 864e5);
}
