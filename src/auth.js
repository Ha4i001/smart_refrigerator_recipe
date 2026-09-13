import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

let authPromise = null;

/**
 * Signs the user in anonymously if no authenticated user exists.
 * Uses a module-level in-flight Promise lock to prevent concurrent callers
 * from creating separate anonymous accounts.
 */
export async function signInAnonymouslyIfNeeded() {
  if (!auth) {
    console.error("[Firebase Auth] Firebase Auth is not initialized.");
    return null;
  }

  if (auth.currentUser) {
    return auth.currentUser;
  }

  if (authPromise) {
    return await authPromise;
  }

  authPromise = signInAnonymously(auth)
    .then((userCredential) => userCredential.user)
    .catch((error) => {
      console.error("[Firebase Auth] Anonymous sign-in failed:", error);
      return null;
    })
    .finally(() => {
      authPromise = null;
    });

  return await authPromise;
}

/**
 * Subscribes to Firebase auth state changes.
 */
export function onAuthChange(callback) {
  if (!auth) {
    console.error("[Firebase Auth] Firebase Auth is not initialized.");
    return () => {};
  }

  return onAuthStateChanged(auth, callback, (error) => {
    console.error("[Firebase Auth] Auth state change error:", error);
  });
}
