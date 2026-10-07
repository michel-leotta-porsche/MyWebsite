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

/** Firebase im Leerlauf nach dem Laden holen (nur den Code, ohne Anmeldung): beim Tippen ist es dann meist schon da */
export function prefetchFirebaseWhenIdle() {
  const go = () => void loadFirebase();
  const idle = () => ("requestIdleCallback" in window ? requestIdleCallback(go, { timeout: 4000 }) : setTimeout(go, 2500));
  if (document.readyState === "complete") idle();
  else window.addEventListener("load", idle, { once: true });
}

/**
 * Mit Google anmelden, das Fenster öffnet sich noch im Tipp. Safari blockt es, wenn zwischen Tipp und Öffnen
 * erst Code geladen wird; ist Firebase noch nicht da, gibt es null zurück und die Seite leitet zur Anmeldung weiter.
 */
export function signInNow() {
  if (!loaded) return null;
  return loaded.signIn().then((cred) => {
    setSessionHint(true);
    return cred;
  });
}
