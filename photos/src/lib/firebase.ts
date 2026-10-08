"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { deleteUser, getAuth, GoogleAuthProvider, reauthenticateWithPopup, signInWithPopup, signOut, type User } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Öffentliche Web-Konfiguration (kein Geheimnis): der Zugriff wird über firestore.rules und storage.rules geregelt
const config = {
  apiKey: "AIzaSyCh1QxkXtljnVpeZNjZMghO2xFsDj6VygY",
  // Anmeldung über die eigene Domain: Safari trennt den Speicher fremder Domains, über firebaseapp.com
  // ginge der Zwischenstand der Google-Anmeldung verloren. Firebase Hosting liefert /__/auth/ hier selbst aus.
  authDomain: "calima.web.app",
  projectId: "fujiventura",
  storageBucket: "fujiventura.firebasestorage.app",
  messagingSenderId: "972013615891",
  appId: "1:972013615891:web:eb81ae8570a0eb0c3678e6",
};

export const app = () => (getApps().length ? getApp() : initializeApp(config));
export const auth = () => getAuth(app());

let fs: Firestore | null = null;
/**
 * Firestore ohne undefined-Felder (optionale Werte fallen weg) und mit Zwischenspeicher im Browser:
 * Änderungen ohne Netz bleiben erhalten, auch über einen Neustart, und gehen raus, sobald wieder Netz da ist.
 */
export const db = () => {
  if (fs) return fs;
  try {
    fs = initializeFirestore(app(), {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    fs = getFirestore(app());
  }
  return fs;
};
export const storage = () => getStorage(app());

const google = () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
};

export async function signIn() {
  return signInWithPopup(auth(), google());
}

/**
 * Konto löschen verlangt eine frische Anmeldung (sonst auth/requires-recent-login). Deshalb erst neu anmelden,
 * dann die Daten löschen, zuletzt den Nutzer: so bleibt nie ein Konto ohne Daten oder Daten ohne Konto halb stehen.
 * Mit Sign in with Apple kommt hier später der Widerruf des Apple-Tokens dazu (revokeAccessToken).
 */
export const confirmIdentity = (user: User) => reauthenticateWithPopup(user, google());
export const deleteAccountUser = (user: User) => deleteUser(user);
export const signOutNow = () => signOut(auth());
export type { User };
