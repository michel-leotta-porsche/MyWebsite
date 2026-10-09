"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";

import { EN } from "@/content/en";
import { LANG_KEY as KEY, type Lang } from "@/lib/lang";

export type { Lang };

// Zwei Sprachen. Deutsch ist die Quelle: Jeder Text steht im Code auf Deutsch, t() schlägt ihn in content/en.ts nach.
// Fehlt dort ein Eintrag, bleibt der deutsche Text stehen (scripts/test/i18n.test.ts findet solche Lücken).
// Die statische Seite kommt auf Deutsch; im Browser gilt die gewählte Sprache, sonst die des Geräts.

const listeners = new Set<() => void>();
let current: Lang | null = null;
// Bis React die statische (deutsche) Seite übernommen hat, gilt überall Deutsch, auch für t() außerhalb von Hooks.
// Sonst schriebe z. B. ein Buchtitel beim Übernehmen Englisch, wo Deutsch steht, und React verwirft die ganze Seite.
let awake = false;

/** Gerätesprache: Deutsch, wenn das Gerät Deutsch spricht, sonst Englisch */
function fromDevice(): Lang {
  const prefs = navigator.languages?.length ? navigator.languages : [navigator.language];
  return prefs.some((l) => l?.toLowerCase().startsWith("de")) ? "de" : "en";
}

function stored(): Lang | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "de" || v === "en" ? v : null;
  } catch {
    return null;
  }
}

export function getLang(): Lang {
  if (typeof window === "undefined" || !awake) return "de";
  current ??= stored() ?? fromDevice();
  return current;
}

function wake() {
  if (awake) return;
  awake = true;
  listeners.forEach((f) => f());
}

/** Sprache wählen und merken; null folgt wieder dem Gerät */
export function setLang(lang: Lang | null) {
  try {
    if (lang) localStorage.setItem(KEY, lang);
    else localStorage.removeItem(KEY);
  } catch {}
  current = lang ?? fromDevice();
  awake = true;
  document.documentElement.lang = current;
  listeners.forEach((f) => f());
}

function subscribe(f: () => void) {
  listeners.add(f);
  return () => void listeners.delete(f);
}

/** Aktuelle Sprache als Hook; beim ersten Zeichnen Deutsch wie die statische Seite, danach die gewählte */
export function useLang(): Lang {
  useEffect(wake, []);
  return useSyncExternalStore(subscribe, getLang, () => "de");
}

type Vars = Record<string, string | number>;

/** Für Datum und Zahlen: toLocaleDateString(locale(lang)) statt fest "de-DE" */
export const locale = (lang: Lang) => (lang === "en" ? "en-GB" : "de-DE");

/** Markiert einen deutschen Text, den t() erst später übersetzt (Konstanten außerhalb von Komponenten); gibt ihn unverändert zurück */
export const de = (text: string) => text;

/** Text in der Sprache lang; {name} wird aus vars ersetzt */
export function translate(lang: Lang, de: string, vars?: Vars): string {
  // „Wort|Zusammenhang“: gleiches deutsches Wort, andere englische Fassung (Löschen|Überschrift → Deletion); angezeigt wird nur das Wort
  const shown = de.split("|")[0];
  const text = lang === "en" ? (EN[de] ?? shown) : shown;
  return vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text;
}

/** Für Code außerhalb von React (Meldungen, Fehlertexte): liest die Sprache im Moment des Aufrufs */
export const t = (de: string, vars?: Vars) => translate(getLang(), de, vars);

/** Für Komponenten: zeichnet neu, wenn die Sprache wechselt */
export function useT() {
  const lang = useLang();
  return (de: string, vars?: Vars) => translate(lang, de, vars);
}

/** Text in Server-Komponenten (Rechtstexte, Hilfe): der deutsche Text als Kind von T */
export function T({ children, vars }: { children: string; vars?: Vars }): ReactNode {
  return useT()(children, vars);
}
