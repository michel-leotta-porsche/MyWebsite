// Firestore speichert keine Arrays in Arrays („Nested arrays are not supported“). Der Feinschliff eines Fotos hat aber
// welche: HSL je Farbton [Farbton, Sättigung, Helligkeit], die Kurve als Punkte [Eingang, Ausgang] (#300).
// Beim Schreiben wird jedes Array, das in einem Array liegt, in { [NESTED]: […] } eingepackt, beim Lesen wieder ausgepackt.
// Nur einfache Objekte und Arrays werden durchlaufen; Firestore-Werte (serverTimestamp, Timestamp) bleiben, wie sie sind.

const NESTED = "__nested";

const plain = (v: unknown): v is Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

function pack(v: unknown, inArray: boolean): unknown {
  if (Array.isArray(v)) {
    const out = v.map((x) => pack(x, true));
    return inArray ? { [NESTED]: out } : out;
  }
  if (plain(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, pack(x, false)]));
  return v;
}

function unpack(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(unpack);
  if (plain(v)) {
    const keys = Object.keys(v);
    if (keys.length === 1 && keys[0] === NESTED && Array.isArray(v[NESTED])) return (v[NESTED] as unknown[]).map(unpack);
    return Object.fromEntries(keys.map((k) => [k, unpack(v[k])]));
  }
  return v;
}

/** fürs Schreiben nach Firestore: keine Arrays mehr in Arrays */
export const packNested = <T>(v: T): T => pack(v, false) as T;

/** nach dem Lesen aus Firestore: eingepackte Arrays wieder auspacken */
export const unpackNested = <T>(v: T): T => unpack(v) as T;
