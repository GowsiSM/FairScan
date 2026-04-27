import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { saveUserProfile } from "../lib/firestore";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If auth is not initialized (Firebase config missing), skip setup
    if (!auth) {
      console.warn("[Auth] Firebase not configured — auth unavailable");
      setLoading(false);
      return;
    }

    // Safety net: if auth state never resolves (e.g. Firebase misconfigured),
    // stop the loading spinner after 5 seconds.
    const timeout = setTimeout(() => {
      setLoading((prev) => {
        if (prev) console.warn("Auth state timed out — forcing loading=false");
        return false;
      });
    }, 5000);

    // Check redirect result on load
    getRedirectResult(auth).catch((err) => {
      console.error("Failed to complete sign in from redirect:", err);
    });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      clearTimeout(timeout);
      setUser(firebaseUser);
      setLoading(false); // Unblock UI immediately — don't wait on Firestore

      if (firebaseUser) {
        // Fire-and-forget: update profile in background, never blocks the app
        saveUserProfile(firebaseUser).catch((err) =>
          console.warn("Failed to save user profile:", err),
        );
      }
    });
    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) {
      throw new Error(
        "Firebase Auth not configured. Check your .env.local file.",
      );
    }
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      console.error("Google sign-in failed:", err);
      throw err;
    }
  };

  const signOut = async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
