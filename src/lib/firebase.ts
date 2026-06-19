import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

/**
 * Configuração do Firebase - Projeto Visão (visao-cce8f)
 *
 * Valores lidos do `.env` (EXPO_PUBLIC_*).
 * Fallbacks abaixo usam o projeto visao-cce8f.
 */
export const firebaseConfig = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyCEGGSmFNjJ5tpHQJMvYT3GiwfZKxr1MFc",
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "visao-cce8f.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "visao-cce8f",
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "visao-cce8f.firebasestorage.app",
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "931767771267",
  appId:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
    "1:931767771267:web:c700278e3cbf2fb5397bb6",
  measurementId:
    process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-8TCSX8GMPP",
};

// Inicializar Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  console.log("✅ Firebase inicializado com sucesso");
} catch (error) {
  console.error("❌ Erro ao inicializar Firebase:", error);
  throw error;
}

export { app, auth, db };
export default app;
