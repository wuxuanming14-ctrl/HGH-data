import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, query, onSnapshot, orderBy, doc, getDocFromServer, enableNetwork, disableNetwork } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// User provided config
const providedConfig = {
  apiKey: "AIzaSyDo1Po4ewQFdlKoouPbXOsVBwifaKoTc7E",
  authDomain: "hgh-data.firebaseapp.com",
  projectId: "hgh-data",
  storageBucket: "hgh-data.firebasestorage.app",
  messagingSenderId: "905151968154",
  appId: "1:905151968154:web:66da2e906c5c0abdf48023",
  measurementId: "G-S2SMEFH9XT"
};

// Check if project-specific config is available via env (VITE_ prefix for client side)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || providedConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || providedConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || providedConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || providedConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || providedConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || providedConfig.appId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

export const loginAnonymously = async () => {
  try {
    if (auth.currentUser) return auth.currentUser;
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/configuration-not-found') {
      console.error("Firebase Auth Error: Please enable 'Anonymous' sign-in in your Firebase Console (Authentication > Sign-in method).");
    }
    throw error;
  }
};

async function testConnection() {
  try {
    // Force network check
    await enableNetwork(db);
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection successful!");
  } catch (error: any) {
    if (error.message.includes('client is offline')) {
      console.warn("Firestore is running in offline mode. This usually happens when the network is restricted or the config is slightly off. Retrying...");
      // For developer awareness
      console.info("TIP: If you just created the project, it might take a minute to propagate.");
    } else {
      console.error("Firebase connection test failed:", error);
    }
  }
}
testConnection();
