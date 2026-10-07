"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, type User } from "firebase/auth";
import { initializeFirestore, getFirestore, type Firestore } from "firebase/firestore";
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

export const app = () => (getApps().length ? getApp() : initializeApp(config));
export const auth = () => getAuth(app());

let fs: Firestore | null = null;
/** Firestore ohne undefined-Felder: optionale Werte fallen einfach weg */
export const db = () => {
  if (fs) return fs;
  try {
    fs = initializeFirestore(app(), { ignoreUndefinedProperties: true });
  } catch {
    fs = getFirestore(app());
  }
  return fs;
};
export const storage = () => getStorage(app());

export async function signIn() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth(), provider);
}
export const signOutNow = () => signOut(auth());
export type { User };
