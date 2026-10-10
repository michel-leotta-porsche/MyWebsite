import type { StoredBook } from "@/lib/store";

// Stand eines Buchs (#287): jedes Speichern zählt rev hoch. Die Werkbank speichert nur auf dem Stand, den sie kennt;
// hat ein anderes Gerät inzwischen gespeichert (z. B. einen Tag eingelegt), wird sie abgewiesen statt ihn zu überschreiben.

/** Bücher von vor dem Stand zählen als 0 */
export const revOf = (b?: { rev?: number } | null) => b?.rev ?? 0;

/** Das Buch auf dem Server ist weiter als der Stand, auf dem gespeichert werden sollte */
export class BookConflict extends Error {
  name = "BookConflict";
  current: StoredBook;
  constructor(current: StoredBook) {
    super("Das Buch wurde anderswo geändert.");
    this.current = current;
  }
}

/**
 * Was gespeichert wird: next mit dem nächsten Stand nach current. Mit base nur, wenn der Server noch auf base steht;
 * ohne base (wer gerade frisch geladen hat, etwa der Abendstapel) wird immer geschrieben.
 */
export function commitBook(current: StoredBook | null, next: StoredBook, base?: number): StoredBook {
  if (current && base !== undefined && revOf(current) !== base) throw new BookConflict(current);
  return { ...next, rev: revOf(current) + 1 };
}

/**
 * Ein Stand des Buchs kommt vom Server in die offene Werkbank. Der eigene oder ein älterer: nichts tun.
 * Ein fremder: still übernehmen, wenn hier nichts aussteht, sonst fragen („Neu laden“ oder „Meine behalten“).
 */
export function remoteChange(s: { remote: number; known: number; writing: number | null; dirty: boolean }): "ignore" | "adopt" | "ask" {
  if (s.remote <= s.known || s.remote === s.writing) return "ignore";
  return s.dirty ? "ask" : "adopt";
}

/**
 * „Meine behalten“: der Stand von hier gewinnt, aber was das andere Gerät seit base dazugelegt hat (Fotos, Doppelseiten,
 * etwa ein Tag vom Abendstapel), kommt hinten dazu. Was hier gelöscht wurde, bleibt gelöscht. Gespeichert wird auf dem
 * Stand von dort.
 */
export function keepMine(mine: StoredBook, base: StoredBook, theirs: StoredBook): StoredBook {
  const had = { photos: new Set(base.photos.map((p) => p.key)), spreads: new Set(base.spreads.map((s) => s.id)) };
  const have = { photos: new Set(mine.photos.map((p) => p.key)), spreads: new Set(mine.spreads.map((s) => s.id)) };
  return {
    ...mine,
    rev: revOf(theirs),
    photos: [...mine.photos, ...theirs.photos.filter((p) => !had.photos.has(p.key) && !have.photos.has(p.key))],
    spreads: [...mine.spreads, ...theirs.spreads.filter((s) => !had.spreads.has(s.id) && !have.spreads.has(s.id))],
  };
}
