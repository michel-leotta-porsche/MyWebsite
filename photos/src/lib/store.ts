"use client";

import type { StaticImageData } from "next/image";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  addDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { build, COLOPHON, ENDPAPER, INDEX, TITLE, type BookData, type Photo } from "@/content/books";
import type { CameraInfo, Recipe } from "@/content/recipes";
import { variants, type AutoPhoto, type SpreadDraft } from "@/lib/auto-sequence";
import { db, storage } from "@/lib/firebase";
import type { Ingested, SizeName } from "@/lib/ingest";

// Bücher aus dem Editor: so liegen sie in Firestore, und so werden sie wieder zu BookData fürs Blättern.

export const CLOTHS = {
  ringelblume: { label: "Ringelblume", base: "#e8a72c", deep: "#b97a12", ink: "#3a2706", light: "sun" },
  nebel: { label: "Nebel", base: "#c9c8c3", deep: "#a3a29c", ink: "#1b1c1a", light: "mist" },
  salbei: { label: "Salbei", base: "#a3ad92", deep: "#828c72", ink: "#1b1c1a", light: "sun" },
  sand: { label: "Sand", base: "#d9c6a5", deep: "#b8a17c", ink: "#2a2117", light: "sun" },
  ziegel: { label: "Ziegel", base: "#cc7048", deep: "#a65532", ink: "#2a120a", light: "sun" },
  meer: { label: "Meer", base: "#5b979c", deep: "#43777b", ink: "#0f1f21", light: "mist" },
} as const;
export type ClothId = keyof typeof CLOTHS;

export type StoredPhoto = {
  key: string;
  title: string;
  note?: string;
  alt: string;
  w: number;
  h: number;
  src: string;
  large: string;
  thumb: string;
  color: [number, number, number];
  taken?: string;
  focus?: [number, number];
  recipe?: Recipe;
  camera?: CameraInfo;
};

export type StoredBook = {
  id: string;
  owner: string;
  ownerName: string;
  title: string;
  subtitle: string;
  places?: string;
  cloth: ClothId;
  aspect: number;
  coverKey: string;
  photos: StoredPhoto[];
  spreads: SpreadDraft[];
};

export type Share = {
  token: string;
  owner: string;
  fromName: string;
  to: string;
  book: StoredBook;
};

const ONES = ["", "ein", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun"];
const TEENS = ["zehn", "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn"];
const TENS = ["", "", "zwanzig", "dreißig", "vierzig", "fünfzig", "sechzig", "siebzig", "achtzig", "neunzig"];
/** Zahl als Wort für Titelei und Kolophon (bis 99) */
export function numberWord(n: number): string {
  let w: string;
  if (n === 1) w = "eine";
  else if (n < 10) w = ONES[n];
  else if (n < 20) w = TEENS[n - 10];
  else if (n < 100) w = (n % 10 ? `${ONES[n % 10]}und` : "") + TENS[Math.floor(n / 10)];
  else w = String(n);
  return w.charAt(0).toUpperCase() + w.slice(1);
}

export const autoPhotos = (photos: StoredPhoto[]): AutoPhoto[] =>
  photos.map((p) => ({ key: p.key, w: p.w, h: p.h, color: p.color, taken: p.taken }));

/** Gespeichertes Buch → BookData mit denselben Seitentypen wie Michels Bücher */
export function toBookData(b: StoredBook): BookData {
  const byKey = new Map(autoPhotos(b.photos).map((p) => [p.key, p]));
  const photos: Record<string, Photo> = {};
  for (const p of b.photos) {
    photos[p.key] = {
      title: p.title,
      note: p.note,
      alt: p.alt || p.title || "Foto",
      src: { src: p.src, width: p.w, height: p.h } as StaticImageData,
      thumb: { src: p.thumb, width: 360, height: Math.round((360 * p.h) / p.w) } as StaticImageData,
      focus: p.focus,
      recipe: p.recipe,
      camera: p.camera,
    };
  }
  const cloth = CLOTHS[b.cloth] ?? CLOTHS.ringelblume;
  const used = new Set(b.spreads.flatMap((s) => s.keys));
  const year = new Date().getFullYear();
  return build({
    id: b.id,
    author: b.ownerName,
    title: b.title || "Ohne Titel",
    subtitle: b.subtitle || `${numberWord(used.size)} Fotografien`,
    places: b.places,
    colophon: [
      b.title || "Ohne Titel",
      `${numberWord(used.size)} Fotografien.`,
      `Fotografie: ${b.ownerName}`,
      "Gebunden auf Fujiventura.",
      `© ${year} ${b.ownerName}`,
    ],
    aspect: b.aspect,
    scale: 1,
    bottom: b.aspect > 1.4 ? 18 : 15,
    cloth: { base: cloth.base, deep: cloth.deep, ink: cloth.ink },
    light: cloth.light,
    coverKey: used.has(b.coverKey) ? b.coverKey : [...used][0],
    photos: Object.fromEntries(Object.entries(photos).filter(([k]) => used.has(k))),
    sequence: [
      [ENDPAPER, TITLE],
      ...b.spreads.map((s) => {
        const vs = variants(s.keys, byKey);
        return vs[s.layout % vs.length];
      }),
      [INDEX, COLOPHON],
    ],
  });
}

export const newId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 20);

// Testmodus ohne Firebase: alles bleibt im Speicher dieser Seite
const MOCK = process.env.NEXT_PUBLIC_FUJI_MOCK === "1";
const mem = { books: new Map<string, StoredBook>(), shares: new Map<string, Share>() };
// im Testmodus überleben geteilte Bücher einen Seitenwechsel (für den Test des Gastlinks)
if (MOCK && typeof window !== "undefined") {
  try {
    const saved = JSON.parse(sessionStorage.getItem("fuji:mock-shares") ?? "[]") as Share[];
    saved.forEach((sh) => mem.shares.set(sh.token, sh));
  } catch {}
}

/** Drei Größen eines Fotos hochladen, Download-Links zurück */
export async function uploadPhoto(uid: string, bookId: string, ph: Ingested): Promise<Record<SizeName, string>> {
  if (MOCK)
    return { thumb: URL.createObjectURL(ph.blobs.thumb), page: URL.createObjectURL(ph.blobs.page), large: URL.createObjectURL(ph.blobs.large) };
  const out = {} as Record<SizeName, string>;
  for (const size of ["thumb", "page", "large"] as SizeName[]) {
    const r = ref(storage(), `u/${uid}/${bookId}/${ph.key}-${size}.jpg`);
    await uploadBytes(r, ph.blobs[size], { contentType: "image/jpeg", cacheControl: "public, max-age=31536000" });
    out[size] = await getDownloadURL(r);
  }
  return out;
}

export async function saveBook(b: StoredBook) {
  if (MOCK) return void mem.books.set(b.id, structuredClone(b));
  await setDoc(doc(db(), "books", b.id), { ...b, updatedAt: serverTimestamp() }, { merge: false });
}

export async function loadBook(id: string): Promise<StoredBook | null> {
  if (MOCK) return mem.books.get(id) ?? null;
  const s = await getDoc(doc(db(), "books", id));
  return s.exists() ? (s.data() as StoredBook) : null;
}

export async function myBooks(uid: string): Promise<StoredBook[]> {
  if (MOCK) return [...mem.books.values()];
  const q = query(collection(db(), "books"), where("owner", "==", uid));
  const s = await getDocs(q);
  return s.docs.map((d) => d.data() as StoredBook);
}

/** Buch für jemanden hinlegen: ein Link mit Zufallsschlüssel und einer Kopie des Buchs */
export async function shareBook(b: StoredBook, to: string): Promise<string> {
  const token = newId() + newId().slice(0, 8);
  if (MOCK) {
    mem.shares.set(token, { token, owner: b.owner, fromName: b.ownerName, to, book: b });
    try {
      sessionStorage.setItem("fuji:mock-shares", JSON.stringify([...mem.shares.values()]));
    } catch {}
    return token;
  }
  await setDoc(doc(db(), "shares", token), {
    token,
    owner: b.owner,
    fromName: b.ownerName,
    to,
    book: b,
    createdAt: serverTimestamp(),
  });
  return token;
}

export async function loadShare(token: string): Promise<Share | null> {
  if (MOCK) return mem.shares.get(token) ?? null;
  const s = await getDoc(doc(db(), "shares", token));
  return s.exists() ? (s.data() as Share) : null;
}

export async function mySharesOf(uid: string): Promise<Share[]> {
  if (MOCK) return [...mem.shares.values()];
  const s = await getDocs(query(collection(db(), "shares"), where("owner", "==", uid)));
  return s.docs.map((d) => d.data() as Share);
}

export async function unshare(token: string) {
  await deleteDoc(doc(db(), "shares", token));
}

export type Note = { id: string; kind: "note" | "ear"; text?: string; no?: number; from?: string; at?: { seconds: number } };

export async function leaveNote(token: string, n: Omit<Note, "id" | "at">) {
  if (MOCK) return;
  await addDoc(collection(db(), "shares", token, "notes"), { ...n, at: serverTimestamp() });
}

export async function notesOf(token: string): Promise<Note[]> {
  if (MOCK) return [];
  const s = await getDocs(query(collection(db(), "shares", token, "notes"), orderBy("at", "desc")));
  return s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Note, "id">) }));
}

/** Für mich hingelegt: im eigenen Konto merken, damit es auf meinem Tisch liegt */
export async function keepInInbox(uid: string, share: Share) {
  if (MOCK) return;
  await setDoc(doc(db(), "users", uid, "inbox", share.token), {
    token: share.token,
    title: share.book.title,
    fromName: share.fromName,
    addedAt: serverTimestamp(),
  });
}

export async function inbox(uid: string): Promise<Share[]> {
  const s = await getDocs(collection(db(), "users", uid, "inbox"));
  const shares = await Promise.all(s.docs.map((d) => loadShare(d.id).catch(() => null)));
  return shares.filter((x): x is Share => !!x);
}
