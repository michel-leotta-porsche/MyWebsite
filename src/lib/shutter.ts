/** Maße des Auslösers unten rechts im Bücherzimmer (nur in der App), in CSS-Pixeln */
export const SHUTTER = { size: 68, edge: 18, gap: 8 } as const;

/**
 * Wie viel Platz eine Knopfreihe rechts freilassen muss, deren Rand `gutter` px vom Bildschirmrand liegt,
 * damit der Auslöser nichts verdeckt (#242): Sie bricht dann vorher um.
 */
export const shutterRoom = (gutter: number) => Math.max(0, SHUTTER.edge + SHUTTER.size + SHUTTER.gap - gutter);
