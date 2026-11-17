import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getApp,
  getApps,
  initializeApp,
  FirebaseApp,
} from "firebase/app";
import * as FirebaseAuth from "firebase/auth";
import {
  getAuth,
  initializeAuth,
  Auth,
  Persistence,
  ReactNativeAsyncStorage,
  browserSessionPersistence,
  setPersistence,
} from "firebase/auth";
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

// A entrada padrão de firebase/auth não declara este export nas
// tipagens, embora o bundle React Native o exporte. Acesso tipado
// via namespace, sem recorrer a any.
const getReactNativePersistence = (
  FirebaseAuth as unknown as {
    getReactNativePersistence: (
      storage: ReactNativeAsyncStorage,
    ) => Persistence;
  }
).getReactNativePersistence;

// Inicializar Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  // Hot reload pode reavaliar o módulo com o app já registrado.
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  if (Platform.OS === "web") {
    auth = getAuth(app);
    void setPersistence(auth, browserSessionPersistence).catch((error) => {
      console.error("❌ Erro ao configurar persistência de sessão (web):", error);
    });
  } else {
    try {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch (authError) {
      // initializeAuth lança se o Auth deste app já foi inicializado
      // (hot reload). Nesse caso, reaproveita a instância existente.
      if (
        (authError as { code?: string } | null)?.code !==
        "auth/already-initialized"
      ) {
        throw authError;
      }
      auth = getAuth(app);
    }
  }
  db = getFirestore(app);

  console.log("✅ Firebase inicializado com sucesso");
} catch (error) {
  console.error("❌ Erro ao inicializar Firebase:", error);
  throw error;
}

export { app, auth, db };
export default app;
