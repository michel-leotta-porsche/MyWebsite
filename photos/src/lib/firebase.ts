"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, type User } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Öffentliche Web-Konfiguration (kein Geheimnis): der Zugriff wird über firestore.rules und storage.rules geregelt
const config = {
  apiKey: "AIzaSyCh1QxkXtljnVpeZNjZMghO2xFsDj6VygY",
  authDomain: "fujiventura.firebaseapp.com",
  projectId: "fujiventura",
  storageBucket: "fujiventura.firebasestorage.app",
  messagingSenderId: "972013615891",
  appId: "1:972013615891:web:eb81ae8570a0eb0c3678e6",
};

// App Check: reCAPTCHA v3 belegt bei jeder Anfrage an Firestore und Storage, dass sie von dieser Seite kommt.
// Der Site-Schlüssel ist öffentlich und kommt beim Build aus NEXT_PUBLIC_FUJI_APPCHECK_KEY; ohne ihn bleibt App Check aus.
const appCheckKey = process.env.NEXT_PUBLIC_FUJI_APPCHECK_KEY;

export const app = () => (getApps().length ? getApp() : initializeApp(config));
export const auth = () => getAuth(app());

// App Check erst für Firestore und Storage, nicht schon für die Anmeldung: Firebase Auth holt sonst vor dem
// Anmeldefenster ein App-Check-Token (reCAPTCHA, ein Netzweg), und Safari blockt das Fenster, weil der Tipp dann zu lange her ist.
let checked = false;
function appCheck() {
  if (checked || !appCheckKey || typeof window === "undefined") return;
  checked = true;
  // Entwicklung: Debug-Token statt reCAPTCHA, die Konsole des Browsers zeigt ihn zum Freischalten in Firebase
  if (process.env.NODE_ENV !== "production") (self as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  initializeAppCheck(app(), { provider: new ReCaptchaV3Provider(appCheckKey), isTokenAutoRefreshEnabled: true });
}

let fs: Firestore | null = null;
/**
 * Firestore ohne undefined-Felder (optionale Werte fallen weg) und mit Zwischenspeicher im Browser:
 * Änderungen ohne Netz bleiben erhalten, auch über einen Neustart, und gehen raus, sobald wieder Netz da ist.
 */
export const db = () => {
  if (fs) return fs;
  appCheck();
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
export const storage = () => {
  appCheck();
  return getStorage(app());
};

export async function signIn() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth(), provider);
}
export const signOutNow = () => signOut(auth());
export type { User };
