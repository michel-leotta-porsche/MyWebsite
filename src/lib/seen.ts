// Was im Bücherzimmer schon gesehen ist: pro Buch der Zeitpunkt (Sekunden), bis zu dem Rückmeldungen als gelesen gelten.
// Nur auf diesem Gerät (localStorage); fehlt der Speicher, gilt einfach nichts als neu.

const KEY = "calima:seen";

type Seen = Record<string, number>;

function read(): Seen | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Seen) : null;
  } catch {
    return null;
  }
}

function write(s: Seen) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

/**
 * Stand beim Betreten des Zimmers. Beim allerersten Besuch gilt alles bis jetzt als gesehen,
 * damit nicht jede alte Rückmeldung als neu leuchtet; `all` meldet das zurück.
 */
export function seenSnapshot(): { at: (bookId: string) => number; first: boolean } {
  const s = read();
  if (s === null) {
    const now = Math.floor(Date.now() / 1000);
    write({ "*": now });
    return { at: () => now, first: true };
  }
  return { at: (id) => s[id] ?? s["*"] ?? 0, first: false };
}

/** Buch bis jetzt als gesehen merken */
export function markSeen(bookId: string) {
  const s = read() ?? {};
  s[bookId] = Math.floor(Date.now() / 1000);
  write(s);
}
