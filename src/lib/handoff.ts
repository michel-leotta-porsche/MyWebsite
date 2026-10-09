// Fotos aus der Auswahl im Bücherzimmer an die Werkbank übergeben: Die Auswahl öffnet in der App gleich beim
// ersten Tipp, die Werkbank nimmt die Fotos nach dem Seitenwechsel auf. Nur im Speicher, ein Wechsel innerhalb der App.

let pending: File[] | null = null;

export function handOver(files: File[]) {
  pending = files.length ? files : null;
}

/** Übergebene Fotos einmal abholen */
export function takeHandover(): File[] | null {
  const f = pending;
  pending = null;
  return f;
}
