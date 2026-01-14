import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

/**
 * Configuração do Firebase - Projeto Azevedo
 * 
 * Credenciais configuradas diretamente no código
 * Para usar variáveis de ambiente, crie um arquivo .env na raiz
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyDmy2BVlewzcggOwdg8pgD64wgNTei_gfA",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "azevedo-b9b0b.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "azevedo-b9b0b",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "azevedo-b9b0b.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "462337336344",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:462337336344:web:25f0f8c03bcd4113480f6d",
};

// Inicializar Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  
  console.log('✅ Firebase inicializado com sucesso');
} catch (error) {
  console.error('❌ Erro ao inicializar Firebase:', error);
  throw error;
}

export { app, auth, db };
export default app;
