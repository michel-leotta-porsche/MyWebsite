"use client";

import { useSyncExternalStore } from "react";

const subscribe = (f: () => void) => {
  window.addEventListener("popstate", f);
  return () => window.removeEventListener("popstate", f);
};

/** Ein Parameter aus der Adresse (?t=…), ohne Suspense; auf dem Server leer */
export const useQueryParam = (name: string) =>
  useSyncExternalStore(subscribe, () => new URLSearchParams(location.search).get(name), () => null);
