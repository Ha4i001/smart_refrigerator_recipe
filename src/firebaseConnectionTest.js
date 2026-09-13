import { app, db, auth } from "./firebase";
import { signInAnonymouslyIfNeeded } from "./auth";

/**
 * Verifies Firebase connection:
 * 1. Firebase initialization (app, db, auth)
 * 2. Anonymous authentication success
 * 3. Availability of user UID
 */
export async function testFirebaseConnection() {
  const result = {
    initialized: false,
    authSuccess: false,
    uid: null,
    error: null,
  };

  try {
    if (!app || !db || !auth) {
      throw new Error("Firebase app, Firestore, or Auth instance failed to initialize.");
    }
    result.initialized = true;
    console.log("[Firebase Connection Test] 1. Initialization: SUCCESS (App, Firestore, Auth ready)");

    const user = await signInAnonymouslyIfNeeded();
    if (!user) {
      throw new Error("Anonymous authentication did not return a valid user.");
    }
    result.authSuccess = true;
    console.log("[Firebase Connection Test] 2. Anonymous Auth: SUCCESS");

    if (!user.uid) {
      throw new Error("Authenticated user does not have a valid UID.");
    }
    result.uid = user.uid;
    console.log("[Firebase Connection Test] 3. User UID available: SUCCESS (UID: " + user.uid + ")");
    console.log("[Firebase Connection Test] Connection verified successfully.");

    return result;
  } catch (error) {
    result.error = error?.message || String(error);
    console.error("[Firebase Connection Test] Connection test encountered an error:", error);
    return result;
  }
}
