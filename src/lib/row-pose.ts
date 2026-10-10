/** Wie weit sich die Nachbarn im Karussell zur Mitte drehen (Grad) */
export const TURN = 34;
/** Wie weit sie dabei nach hinten weichen (px) */
const BACK = 100;
/** Je enger, desto stärker wölbt sich die Reihe */
const PERSPECTIVE = 700;
/** Wie weit sich das Buch in der Mitte vom Tisch hebt (px), zusätzlich zu den 6px von früher */
const LIFT = 12;

export type RowPose = {
  transform: string;
  zIndex: number;
  /** Halbschatten auf dem Einband (Deckkraft) */
  shade: number;
  /** Schatten, den das mittlere Buch auf diesen Nachbarn wirft (Deckkraft) */
  cast: number;
  /** von welcher Kante der Schatten der Mitte kommt: die Innenkante, die unter dem mittleren Buch liegt */
  castFrom: "left" | "right";
  /** großer weicher Schatten des angehobenen Buchs (Deckkraft) */
  lift: number;
  sheen: number;
  sheenX: number;
};

/**
 * Lage und Licht eines Buchs im Karussell aus seinem Abstand `d` zur Mitte (px, negativ = links) und dem Platz `w`,
 * den ein Buch in der Reihe einnimmt. Die Reihe steht auf einem flachen Bogen: die Nachbarn drehen sich zur Mitte und
 * weichen zurück, die Mitte hebt sich und wirft ihren Schatten auf sie. Nur Zahlen für transform und opacity,
 * damit das Wischen auf der Grafikkarte bleibt. `flat` (Bewegung reduzieren): keine Drehung, das Licht bleibt.
 */
export function rowPose(d: number, w: number, rot: number, flat: boolean): RowPose {
  // 0 = Mitte, 1 = Nachbar, 2 = zweiter Nachbar (liegt noch tiefer im Stapel)
  const p = Math.min(Math.abs(d) / w, 2);
  const q = Math.min(p, 1);
  const side = d < 0 ? -1 : 1;
  // flach rückt die Tiefe allein über die Größe, mit Drehung macht das die Perspektive
  const transform =
    `translate(${(side * -46 * p).toFixed(2)}%, ${(-(6 + LIFT) * (1 - q)).toFixed(2)}px) scale(${(1 - (flat ? 0.14 : 0.04) * p).toFixed(4)}) ` +
    (flat ? "" : `perspective(${PERSPECTIVE}px) rotateY(${(side * -TURN * q).toFixed(2)}deg) translateZ(${(-BACK * q).toFixed(2)}px) `) +
    `rotate(${(rot * (0.35 + 0.65 * q)).toFixed(2)}deg)`;
  return {
    transform,
    zIndex: 100 - Math.round(p * 40),
    shade: 0.42 * p,
    // am stärksten direkt neben der Mitte, zwei Plätze weiter liegt das Buch hinter seinem Nachbarn
    cast: 0.6 * q * (p > 1 ? 2 - p : 1),
    castFrom: side < 0 ? "right" : "left",
    lift: 1 - q,
    // Glanz nur während des Drehens, in der Mitte und ganz außen ist er weg
    sheen: flat ? 0 : Math.max(0, p * (1 - p) * 4),
    sheenX: side * (p - 0.5) * 26,
  };
}
