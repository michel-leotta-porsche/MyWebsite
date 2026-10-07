"use client";

import type { User } from "firebase/auth";
import { useEffect, useState } from "react";

import { hasSessionHint, setSessionHint } from "@/lib/session-hint";

// Anmeldung für die Landing: Firebase (gut 300 KiB mit Auth-Rahmen) kommt erst, wenn es gebraucht wird.

type Firebase = typeof import("@/lib/firebase");
let loading: Promise<Firebase> | null = null;
let loaded: Firebase | null = null;

/** Lädt Firebase einmal; beim Zeigen auf den Knopf schon vorab, damit der Klick das Fenster sofort öffnen kann */
export function loadFirebase() {
  loading ??= import("@/lib/firebase").then((m) => (loaded = m));
  return loading;
}

/** Wie useUser, aber ohne Firebase, solange in diesem Browser niemand angemeldet war: dann sofort null */
export function useLazyUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    let unsub = () => {};
    if (process.env.NEXT_PUBLIC_FUJI_MOCK === "1" || hasSessionHint()) {
      Promise.all([loadFirebase(), import("firebase/auth")]).then(([fb, { onAuthStateChanged }]) => {
        if (!alive) return;
        unsub = onAuthStateChanged(fb.auth(), (u) => {
          setUser(u);
          setSessionHint(!!u);
        });
      });
    } else {
      // asynchron, damit der erste Render wie auf dem Server aussieht
      const id = window.setTimeout(() => setUser(null), 0);
      unsub = () => window.clearTimeout(id);
    }
    return () => {
      alive = false;
      unsub();
    };
  }, []);
  return user;
}

/** Mit Google anmelden. Ist Firebase schon da, öffnet sich das Fenster noch im Klick (sonst blockt Safari es eher) */
export async function signInLazily() {
  const fb = loaded ?? (await loadFirebase());
  const cred = await fb.signIn();
  setSessionHint(true);
  return cred;
}
