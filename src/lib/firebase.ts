import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { initializeFirestore, getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// Default configuration with environment variables and fallback for standalone compilation
const metaEnv = (import.meta as any).env || {};
let firebaseConfig: any = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "AIzaSy_FALLBACK_KEY_STANDALONE",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "localhost",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "ai-studio-2c919791-444e-40a2-ba71-e2ec13057cba",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: metaEnv.VITE_FIREBASE_APP_ID || "",
  firestoreDatabaseId: metaEnv.VITE_FIRESTORE_DATABASE_ID || "ai-studio-2c919791-444e-40a2-ba71-e2ec13057cba"
};

// Safely load local applet config if present, without failing compilation if missing in a clean repo/ZIP
try {
  const globFn = (import.meta as any).glob;
  if (typeof globFn === "function") {
    const localConfigs = globFn('../../firebase-applet-config.json', { eager: true });
    const configKey = Object.keys(localConfigs)[0];
    if (configKey && (localConfigs[configKey] as any)?.default) {
      firebaseConfig = { ...firebaseConfig, ...(localConfigs[configKey] as any).default };
    }
  }
} catch {
  // Graceful fallback for standalone clones
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId || "(default)");
export const auth = getAuth(app);

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'world_test', 'connection'));
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn("Firestore service is in local/offline sandbox fallback mode: " + errorMsg);
  }
}

// Auto-anon sign in for testing persistence if not already logged in
signInAnonymously(auth).catch(err => {
  if (err.code === 'auth/admin-restricted-operation') {
    console.warn("Anonymous Auth is disabled in Firebase Console. Cloud features may be limited.");
  } else {
    console.warn("Anonymous authentication is in sandbox/offline fallback mode: " + (err.message || err));
  }
});

testConnection();
