import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Validate Firebase config before initialization
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Check for required Firebase config
const requiredKeys = ["apiKey", "authDomain", "projectId", "appId"] as const;
const missingKeys = requiredKeys.filter((key) => !firebaseConfig[key]);

if (missingKeys.length > 0) {
  console.error(
    `[Firebase] Missing required config keys: ${missingKeys.join(", ")}\n` +
      `Please create frontend/.env.local with your Firebase credentials from Firebase Console → Project Settings`,
  );
}

let app;
let auth: ReturnType<typeof getAuth> | null = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  console.log("[Firebase] Initialized successfully");
} catch (err) {
  console.error("[Firebase] Initialization failed:", err);
}

export { auth };
export const googleProvider = new GoogleAuthProvider();

// Firestore — may fail if not enabled in Firebase Console
let _db: Firestore | null = null;
try {
  if (app) {
    _db = getFirestore(app);
  }
} catch (err) {
  console.warn("[Firestore] Not available:", err);
}
export const db = _db;
