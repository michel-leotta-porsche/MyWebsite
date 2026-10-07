"use client";

import { useSyncExternalStore } from "react";

// Eigener kleiner Hook statt useReducedMotion aus motion: so zieht der Tisch auf der Startseite
// die Bewegungsbibliothek nicht ins erste Paket, sie kommt erst mit dem aufgeschlagenen Buch
const QUERY = "(prefers-reduced-motion: reduce)";

const subscribe = (f: () => void) => {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", f);
  return () => mq.removeEventListener("change", f);
};

/** Wünscht das System weniger Bewegung? false beim Rendern auf dem Server */
export const useReducedMotion = () =>
  useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
