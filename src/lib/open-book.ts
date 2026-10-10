// Werkbank öffnet ein vorhandenes Buch (#213): ein kaputter Link soll eine Meldung zeigen statt eines leeren Tischs.
import type { StoredBook } from "@/lib/store";

export type Opening = { state: "open"; book: StoredBook } | { state: "gone" } | { state: "failed" };

/** Buch für die Werkbank laden. Gelöscht oder fremd heißt „liegt hier nicht mehr“; die Firestore-Regeln lassen beides
 *  gar nicht lesen und melden fehlende Rechte. Alles andere (ohne Netz und ohne Cache) ließ sich nur nicht laden */
export async function openBook(id: string, uid: string, load: (id: string) => Promise<StoredBook | null>): Promise<Opening> {
  try {
    const book = await load(id);
    return book && book.owner === uid ? { state: "open", book } : { state: "gone" };
  } catch (e) {
    const code = String((e as { code?: unknown })?.code ?? "").replace(/^firestore\//, "");
    return code === "permission-denied" || code === "not-found" ? { state: "gone" } : { state: "failed" };
  }
}
