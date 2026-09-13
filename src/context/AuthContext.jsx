import { useState, useEffect } from "react";
import { auth } from "../firebase";
import { onAuthChange, signInAnonymouslyIfNeeded } from "../auth";
import { AuthContext } from "./authContextDef";
import { testFirebaseConnection } from "../firebaseConnectionTest";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [uid, setUid] = useState(null);
  const [loading, setLoading] = useState(Boolean(auth));
  const [error, setError] = useState(
    !auth ? "Firebase Auth instance is not available." : null
  );

  useEffect(() => {
    // Run connection test to verify initialization, anonymous auth, and UID availability
    testFirebaseConnection();

    if (!auth) {
      console.error("[AuthProvider] Firebase Auth instance is not available.");
      return;
    }

    const unsubscribe = onAuthChange(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setUid(currentUser.uid);
        setLoading(false);
      } else {
        try {
          const anonUser = await signInAnonymouslyIfNeeded();
          if (anonUser) {
            setUser(anonUser);
            setUid(anonUser.uid);
          }
        } catch (err) {
          console.error("[AuthProvider] Anonymous sign-in error:", err);
          setError(err?.message || String(err));
        } finally {
          setLoading(false);
        }
      }
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, uid, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}
