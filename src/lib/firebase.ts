"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  deleteUser,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  initializeAuth,
  OAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  revokeAccessToken,
  signInWithCredential,
  signInWithPopup,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

import { IS_APP } from "@/lib/app-mode";

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
let au: Auth | null = null;

/**
 * Der Popup-Helfer lädt als iframe von der authDomain (gapi und iframe.js, gut 130 KiB). getAuth wartet auf Handys
 * und in Safari mit dem Anmeldestand, bis er da ist: das hielt das Bücherzimmer am iPhone rund eine Sekunde dunkel.
 * Hier meldet Firebase den Anmeldestand sofort, und der Helfer lädt danach, damit Safari das Popup noch im Tipp öffnet:
 * gleich, wenn niemand angemeldet ist (Anmeldeseite), sonst im Leerlauf (Profil, Konto löschen).
 * _shouldInitProactively und _initialize sind Firebase-intern; ändern sie sich, lädt der Helfer erst beim Tippen.
 */
type Resolver = { _initialize(auth: Auth): Promise<unknown> };
let popupHelper: Resolver | null = null;
// erst im Browser bauen: beim Vorrendern ist browserPopupRedirectResolver keine Klasse
const laterPopupResolver = () =>
  class extends (browserPopupRedirectResolver as unknown as new () => Resolver) {
    constructor() {
      super();
      // Firebase legt genau eine Instanz an; die merken, um sie nachher anzustoßen
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      popupHelper = this;
    }
    get _shouldInitProactively() {
      return false;
    }
  } as unknown as typeof browserPopupRedirectResolver;
function warmPopupHelper(a: Auth) {
  const go = () => void popupHelper?._initialize(a).catch(() => {});
  a.authStateReady().then(() => {
    if (!a.currentUser) go();
    else if ("requestIdleCallback" in window) requestIdleCallback(go, { timeout: 3000 });
    else setTimeout(go, 1500);
  });
}

/**
 * In der App (capacitor://localhost) meldet sich der Popup-Helfer nie, und sie braucht ihn nicht (Anmelden nativ):
 * dort ohne ihn und mit IndexedDB als Speicher. Im Web dieselben Speicher wie getAuth, der Helfer kommt nachher.
 */
export const auth = () => {
  if (au) return au;
  if (IS_APP) {
    au = initializeAuth(app(), { persistence: indexedDBLocalPersistence });
    return au;
  }
  au = initializeAuth(app(), {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
    popupRedirectResolver: laterPopupResolver(),
  });
  warmPopupHelper(au);
  return au;
};

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

/** Anbieter fürs Anmelden. Apple verlangt (Richtlinie 4.8) „Mit Apple anmelden“ gleichrangig neben Google */
export type SignInProvider = "google.com" | "apple.com";

const google = () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
};
const apple = () => {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  provider.setCustomParameters({ locale: "de_DE" });
  return provider;
};
const webProvider = (p: SignInProvider) => (p === "apple.com" ? apple() : google());

/**
 * In der iOS-App gibt es kein Popup: Google und Apple melden nativ an (Plugin), angemeldet wird dann mit
 * dem Ergebnis im Web-SDK, damit Firestore und Storage dieselbe Anmeldung sehen wie auf der Website.
 * authorizationCode braucht es nur, um Apples Token beim Löschen des Kontos zu widerrufen.
 */
async function nativeCredential(p: SignInProvider) {
  const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
  if (p === "apple.com") {
    const r = await FirebaseAuthentication.signInWithApple({ skipNativeAuth: true });
    const credential = new OAuthProvider("apple.com").credential({ idToken: r.credential?.idToken, rawNonce: r.credential?.nonce });
    return { credential, appleCode: r.credential?.authorizationCode, name: r.user?.displayName ?? undefined };
  }
  const r = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
  return { credential: GoogleAuthProvider.credential(r.credential?.idToken), appleCode: undefined, name: undefined };
}

/**
 * Apple gibt den Namen nur beim allerersten Anmelden heraus und nur an die App, nicht an Firebase:
 * dann gleich ins Konto schreiben, sonst stünde in Büchern und Zetteln „Ich“.
 */
async function keepAppleName(user: User, name?: string) {
  if (!user.displayName && name?.trim()) await updateProfile(user, { displayName: name.trim() }).catch(() => {});
}

export async function signIn(provider: SignInProvider = "google.com") {
  if (IS_APP) {
    const n = await nativeCredential(provider);
    const cred = await signInWithCredential(auth(), n.credential);
    await keepAppleName(cred.user, n.name);
    return cred;
  }
  return signInWithPopup(auth(), webProvider(provider));
}

/** Absendername ändern (Profil), z. B. wenn Apple keinen Namen geliefert hat */
export const renameUser = async (user: User, name: string) => {
  if (process.env.NEXT_PUBLIC_FUJI_MOCK === "1") return;
  await updateProfile(user, { displayName: name });
};

/** Womit diese Person angemeldet ist; ältere Konten haben nur Google */
export const providerOf = (user: User): SignInProvider =>
  user.providerData?.some((p) => p.providerId === "apple.com") ? "apple.com" : "google.com";

/** Was es braucht, um Apples Token zu widerrufen: im Web ein Access-Token, in der App ein Autorisierungscode */
export type AppleRevoke = { accessToken?: string; code?: string };

/**
 * Konto löschen verlangt eine frische Anmeldung (sonst auth/requires-recent-login). Deshalb erst neu anmelden,
 * dann die Daten löschen, zuletzt den Nutzer: so bleibt nie ein Konto ohne Daten oder Daten ohne Konto halb stehen.
 * Bei Apple liefert die frische Anmeldung zugleich, was zum Widerruf des Tokens nötig ist (Richtlinie 5.1.1(v)).
 */
export async function confirmIdentity(user: User): Promise<AppleRevoke> {
  const p = providerOf(user);
  if (IS_APP) {
    const n = await nativeCredential(p);
    await reauthenticateWithCredential(user, n.credential);
    return { code: n.appleCode };
  }
  const res = await reauthenticateWithPopup(user, webProvider(p));
  return p === "apple.com" ? { accessToken: OAuthProvider.credentialFromResult(res)?.accessToken } : {};
}

/**
 * Apples Token widerrufen. Das Web-SDK kann nur Access-Tokens; den Code aus der App nimmt dieselbe
 * Schnittstelle als tokenType CODE an, so wie es das native iOS-SDK auch tut.
 */
async function revokeApple(user: User, r: AppleRevoke) {
  if (r.accessToken) return revokeAccessToken(auth(), r.accessToken);
  if (!r.code) return;
  const res = await fetch(`https://identitytoolkit.googleapis.com/v2/accounts:revokeToken?key=${config.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ providerId: "apple.com", tokenType: "CODE", token: r.code, idToken: await user.getIdToken() }),
  });
  if (!res.ok) throw new Error(`revokeToken ${res.status}`);
}

/** Zuletzt: Apple-Zugang widerrufen (ein Fehler dabei hält das Löschen nicht auf), dann das Konto löschen */
export async function deleteAccountUser(user: User, revoke: AppleRevoke = {}) {
  await revokeApple(user, revoke).catch((e) => console.warn("Apple-Widerruf fehlgeschlagen", e));
  await deleteUser(user);
  if (IS_APP) await import("@capacitor-firebase/authentication").then((m) => m.FirebaseAuthentication.signOut()).catch(() => {});
}

export async function signOutNow() {
  await signOut(auth());
  if (IS_APP) await import("@capacitor-firebase/authentication").then((m) => m.FirebaseAuthentication.signOut()).catch(() => {});
}
export type { User };
