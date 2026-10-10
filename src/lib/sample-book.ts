import { bookById, type BookData } from "@/content/books";

/** Fester öffentlicher Link aufs Beispielbuch, für Postkarten-QR und Landing; gleich auf calima.photos und calima.web.app */
export const SAMPLE_PATH = "/beispiel";
/** Das eine Beispielbuch: Michels Fuerteventura */
export const SAMPLE_ID = "fuerteventura";

export const sampleBook = (): BookData => bookById(SAMPLE_ID)!;

/** Der Weg zum eigenen Buch zeigt sich erst auf der letzten Doppelseite (Kolophon) und auf dem Rückdeckel; k wie im Buch: 0 Einband … count Rückdeckel */
export const atBookEnd = (k: number, count: number) => k >= count - 1;
