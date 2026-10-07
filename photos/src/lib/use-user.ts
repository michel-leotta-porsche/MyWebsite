"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";

import { auth } from "@/lib/firebase";

/** Angemeldete Person: undefined solange Firebase noch prüft, null wenn niemand angemeldet ist */
export function useUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => {
    // Testmodus ohne Firebase (nur lokale Builds mit NEXT_PUBLIC_FUJI_MOCK=1)
    if (process.env.NEXT_PUBLIC_FUJI_MOCK === "1") {
      const id = window.setTimeout(() => setUser({ uid: "test", displayName: "Michel Test" } as User), 0);
      return () => window.clearTimeout(id);
    }
    return onAuthStateChanged(auth(), (u) => setUser(u));
  }, []);
  return user;
}
