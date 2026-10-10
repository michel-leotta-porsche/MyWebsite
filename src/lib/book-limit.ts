// Platz im Buch (#212): ein Buch fasst höchstens BOOK_MAX Fotos, Werkbank und Abendstapel halten sich daran.
// Der Abendstapel legt einen Tag nur ganz in ein Buch; passt er nicht mehr, kommt er in einen neuen Band.

export const BOOK_MAX = 60;

type Roomy = { id: string; title: string; photos: readonly unknown[] };

/** wie viele Fotos noch ins Buch passen */
export const roomIn = (book: Pick<Roomy, "photos">) => Math.max(0, BOOK_MAX - book.photos.length);

/** Der Tag passt nicht mehr ins Buch. book ist der Stand, gegen den geprüft wurde (frisch geladen). */
export class BookFull<B extends Roomy = Roomy> extends Error {
  readonly book: B;
  readonly room: number;
  constructor(book: B, room: number) {
    super(`Buch ${book.id} hat noch Platz für ${room} Fotos`);
    this.name = "BookFull";
    this.book = book;
    this.room = room;
  }
}

/** wirft BookFull, wenn n Fotos nicht mehr ganz ins Buch passen */
export function checkRoom<B extends Roomy>(book: B, n: number) {
  const room = roomIn(book);
  if (n > room) throw new BookFull(book, room);
}

/** Titel des nächsten Bands: „Japan“ → „Japan 2“, „Japan 2“ → „Japan 3“; eine Jahreszahl am Ende ist kein Band */
export function nextVolume(title: string) {
  const s = title.trim();
  const m = /^(.*\S)\s+(\d{1,2})$/.exec(s);
  return m ? `${m[1]} ${Number(m[2]) + 1}` : `${s} 2`;
}
