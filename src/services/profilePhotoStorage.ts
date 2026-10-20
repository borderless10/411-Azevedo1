/**
 * Upload de foto de perfil no Firebase Storage.
 *
 * Flag off até o projeto estar no plano Blaze (segunda).
 * Checklist quando ligar EXPO_PUBLIC_PROFILE_PHOTO_STORAGE=1:
 * - Storage rules: write só do dono em users/{uid}/**; read autenticado
 * - Script de migração: photoBase64 → upload → photoUrl/photoStoragePath → apagar photoBase64
 * - Validar Profile, Chat, Ranking e Header
 */
import { firebaseConfig } from "../lib/firebase";

export const profilePhotoStoragePath = (userId: string) =>
  `users/${userId}/avatar.jpg`;

export function isProfilePhotoStorageEnabled(): boolean {
  return process.env.EXPO_PUBLIC_PROFILE_PHOTO_STORAGE === "1";
}

export async function uploadProfilePhoto(
  userId: string,
  base64: string,
): Promise<{ url: string; path: string }> {
  if (!isProfilePhotoStorageEnabled()) {
    throw new Error("PROFILE_PHOTO_STORAGE_DISABLED");
  }
  const path = profilePhotoStoragePath(userId);
  const { getApp } = await import("firebase/app");
  const { getStorage, ref, uploadString, getDownloadURL } = await import(
    "firebase/storage"
  );
  const storage = getStorage(getApp(), `gs://${firebaseConfig.storageBucket}`);
  const fileRef = ref(storage, path);
  const payload = base64.includes(",") ? base64.split(",").pop() || "" : base64;
  await uploadString(fileRef, payload, "base64", { contentType: "image/jpeg" });
  const url = await getDownloadURL(fileRef);
  return { url, path };
}
