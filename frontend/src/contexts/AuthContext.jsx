import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { syncUserToBackend } from "../services/api";

const AuthContext = createContext(null);

function isAuthTokenError(error) {
  const message = String(error?.message || "");
  return /Invalid or expired auth token|Authentication required/i.test(message);
}

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Sync to backend on every auth state change
        const syncPayload = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || "New Player",
          photoURL: firebaseUser.photoURL,
        };

        try {
          const authToken = await firebaseUser.getIdToken();
          await syncUserToBackend({ ...syncPayload, authToken });
        } catch (err) {
          if (isAuthTokenError(err)) {
            try {
              // Force refresh and retry once to handle stale token snapshots.
              const refreshedToken = await firebaseUser.getIdToken(true);
              await syncUserToBackend({ ...syncPayload, authToken: refreshedToken });
            } catch (retryError) {
              console.error("Failed to sync user to backend after retry:", retryError);
            }
          } else {
            console.error("Failed to sync user to backend:", err);
          }
        }
        setUser(firebaseUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const value = { user, loading, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
