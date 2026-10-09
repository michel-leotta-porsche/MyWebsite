"use client";

import { useSyncExternalStore } from "react";

const subscribe = (f: () => void) => {
  const mq = window.matchMedia("(min-width: 768px)");
  mq.addEventListener("change", f);
  return () => mq.removeEventListener("change", f);
};

/** Ab Tablet: Doppelseiten. null beim Rendern auf dem Server */
export const useWide = () =>
  useSyncExternalStore<boolean | null>(subscribe, () => window.matchMedia("(min-width: 768px)").matches, () => null);
