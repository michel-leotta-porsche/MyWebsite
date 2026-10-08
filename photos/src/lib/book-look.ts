// Falz: zum Bund hin wölbt sich das Papier und wird dunkler, ganz innen knickt es scharf ein.
// Eine Quelle für die HTML-Seiten (page-view, landing) und die gemalten Texturen des WebGL-Blatts (page-texture),
// damit beim Wechsel zwischen beiden nichts springt.

/** Breite des Falzschattens in cqw der Seite */
export const FOLD_WIDTH = 14;

/** Deckkraft von Tisch-Schwarz (12 10 8) über die Breite, 0 = am Bund */
export const FOLD_STOPS: readonly (readonly [number, number])[] = [
  [0, 0.26],
  [0.04, 0.15],
  [0.3, 0.05],
  [1, 0],
];

export const foldColor = (a: number) => `rgb(12 10 8 / ${a})`;

/** CSS-Verlauf für eine Seite; `side` ist die Seite des Buchs, der Bund liegt gegenüber */
export const foldGradient = (side: "left" | "right") =>
  `linear-gradient(to ${side === "left" ? "left" : "right"}, ${FOLD_STOPS.map(([at, a]) => `${foldColor(a)} ${at * 100}%`).join(", ")})`;
