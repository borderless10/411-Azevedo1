/**
 * Cria usuários demo no Firebase Auth + Firestore (visao-cce8f).
 * Uso: node scripts/seed-demo-users.mjs
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";

const loadEnv = () => {
  const envPath = resolve(process.cwd(), ".env");
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
};

loadEnv();

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const USERS = [
  {
    appName: "seed-consultor",
    email: "consultor@gmail.com",
    password: "123456",
    name: "Consultor Demo",
    role: "consultor",
  },
  {
    appName: "seed-usuario",
    email: "usuario@gmail.com",
    password: "123456",
    name: "Usuário Demo",
    role: "user",
  },
  {
    appName: "seed-sabrina",
    email: "sabrina@gmail.com",
    password: "123456",
    name: "Sabrina",
    role: "user",
  },
];

const upsertUser = async (
  { appName, email, password, name, role },
  consultantId,
) => {
  const app = initializeApp(firebaseConfig, appName);
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    let uid;

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      uid = credential.user.uid;
      await updateProfile(credential.user, { displayName: name });
      console.log(`✅ Auth criado: ${email} (${uid})`);
    } catch (error) {
      if (error?.code !== "auth/email-already-in-use") throw error;
      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      uid = credential.user.uid;
      console.log(`ℹ️ Auth já existia: ${email} (${uid})`);
    }

    const now = Timestamp.now();
    const userRef = doc(db, "users", uid);
    const existing = await getDoc(userRef);

    const payload = {
      name,
      nickname: role === "consultor" ? "Consultor" : "Usuario",
      email,
      phone: "",
      role,
      isAdmin: false,
      isActive: true,
      currency: "BRL",
      updatedAt: now,
      ...(role === "user" && consultantId ? { consultantId } : {}),
      ...(!existing.exists() ? { createdAt: now } : {}),
    };

    await setDoc(userRef, payload, { merge: true });
    console.log(`✅ Firestore users/${uid} → role=${role}`);

    return uid;
  } finally {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    await deleteApp(app);
  }
};

const getDirectChatId = (userAId, userBId) =>
  [userAId, userBId].sort().join("_");

const seedChats = async (consultorId, clientIds) => {
  const app = initializeApp(firebaseConfig, "seed-chats");
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    await signInWithEmailAndPassword(auth, USERS[0].email, USERS[0].password);

    const globalRef = doc(db, "chats", "global");
    const globalSnap = await getDoc(globalRef);
    if (!globalSnap.exists()) {
      await setDoc(globalRef, {
        type: "global",
        participants: [],
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
      });
      console.log("✅ Chat global criado");
    } else {
      console.log("ℹ️ Chat global já existia");
    }

    for (const clientId of clientIds) {
      const directId = getDirectChatId(consultorId, clientId);
      const directRef = doc(db, "chats", directId);
      const directSnap = await getDoc(directRef);
      if (!directSnap.exists()) {
        await setDoc(directRef, {
          type: "direct",
          participants: [consultorId, clientId],
          createdAt: serverTimestamp(),
          lastMessageAt: serverTimestamp(),
        });
        console.log(`✅ Chat direto criado: ${directId}`);
      } else {
        console.log(`ℹ️ Chat direto já existia: ${directId}`);
      }
    }
  } finally {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    await deleteApp(app);
  }
};

const main = async () => {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error("Configure o .env com EXPO_PUBLIC_FIREBASE_* antes de rodar.");
  }

  console.log(`Projeto: ${firebaseConfig.projectId}\n`);

  const consultorId = await upsertUser(USERS[0]);
  const clientId = await upsertUser(USERS[1], consultorId);
  const sabrinaId = await upsertUser(USERS[2], consultorId);

  console.log("\n--- Credenciais ---");
  console.log("Consultor: consultor@gmail.com / 123456");
  console.log("Cliente:   usuario@gmail.com / 123456");
  console.log("Cliente:   sabrina@gmail.com / 123456");
  console.log(`consultantId dos clientes: ${consultorId}`);
  console.log(`UID consultor: ${consultorId}`);
  console.log(`UID usuario:   ${clientId}`);
  console.log(`UID sabrina:   ${sabrinaId}`);

  await seedChats(consultorId, [clientId, sabrinaId]);
};

main().catch((error) => {
  console.error("❌ Falha ao criar usuários demo:", error?.message || error);
  process.exit(1);
});
