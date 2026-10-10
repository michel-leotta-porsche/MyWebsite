"use client";

import type { PhotoEdit } from "@/lib/develop/model";

// Filme der Kamera (Stufe 2): ein Film hält einen Look fest, FILM_FRAMES Bilder, ein Stapel im Fotostudio. Wie bei einer
// echten Kamera lässt sich ein angefangener Film beiseitelegen, mit einem anderen weiterfotografieren und später weiter
// belichten. Die Bilder darauf sieht man erst, wenn der Film entwickelt ist (voll oder bewusst entwickelt): bis dahin
// zeigt die Kamera kein Vorschaubild und das Fotostudio keinen Stapel. Liegt im Gerät (localStorage), nicht am Konto.

/** Regeln einer Einwegkamera-Vorlage (disposable.ts): so viele Bilder, fester Ausschnitt (Zoom zur Hauptkamera), Blitz */
export type FilmRules = { id: string; frames: number; zoom: number; flash: boolean };
export type Film = { stack: string; name: string; approx: boolean; edit: PhotoEdit | null; count: number; rules?: FilmRules };
export type Shelf = { loaded: string | null; films: Film[] };

const KEY = "calima:films";
const OLD_KEY = "calima:film";

const isFilm = (f: unknown): f is Film =>
  !!f && typeof f === "object" && typeof (f as Film).stack === "string" && typeof (f as Film).count === "number" && typeof (f as Film).name === "string";

/** alle unentwickelten Filme und welcher eingelegt ist; ein alter einzelner Film (vor dem Wechsel) wird übernommen */
export function readShelf(): Shelf {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Shelf> | null;
    if (s && Array.isArray(s.films)) {
      const films = s.films.filter(isFilm);
      return { loaded: films.some((f) => f.stack === s.loaded) ? (s.loaded as string) : null, films };
    }
    const old = JSON.parse(localStorage.getItem(OLD_KEY) ?? "null");
    if (isFilm(old)) {
      const shelf = { loaded: old.stack, films: [old] };
      writeShelf(shelf);
      localStorage.removeItem(OLD_KEY);
      return shelf;
    }
  } catch {}
  return { loaded: null, films: [] };
}

export function writeShelf(s: Shelf) {
  try {
    if (s.films.length) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {}
}

/** Stapel, deren Bilder noch im Dunkeln liegen: unentwickelte Filme */
export const undevelopedStacks = (): Set<string> => new Set(readShelf().films.map((f) => f.stack));

/**
 * Die beiseitegelegten Filme in der Look-Leiste (#226): ab zwei liegen sie als ein Stapel („Filme · N“) vor den Looks,
 * damit die Looks ohne Scrollen erreichbar bleiben. pile ist die Zahl am Stapel (null: kein Stapel), films was zu sehen ist.
 */
export const filmStrip = (aside: Film[], open: boolean): { pile: number | null; films: Film[] } =>
  aside.length < 2 ? { pile: null, films: aside } : { pile: aside.length, films: open ? aside : [] };
