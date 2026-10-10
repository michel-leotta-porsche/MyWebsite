/** Maße des Auslösers unten rechts im Bücherzimmer (nur in der App), in CSS-Pixeln */
export const SHUTTER = { size: 68, edge: 18, gap: 8 } as const;

/** So viel Platz vom Bildschirmrand braucht der Auslöser samt Luft; Knöpfe davor brechen vorher um (#242) */
export const SHUTTER_ROOM = SHUTTER.edge + SHUTTER.size + SHUTTER.gap;
