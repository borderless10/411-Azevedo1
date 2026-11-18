/**
 * Upload de foto de perfil no Firebase Storage.
 *
 * No React Native, uploadString("base64") e uploadBytes com Uint8Array
 * fazem o SDK montar um Blob nativo a partir de ArrayBuffer, o que gera
 * "Creating blobs from 'ArrayBuffer' and 'ArrayBufferView' are not
 * supported". O caminho compatível é gravar o base64 num arquivo
 * temporário e subir o Blob obtido via fetch do arquivo local, que é o
 * Blob suportado pelo React Native.
 */
import * as FileSystem from "expo-file-system/legacy";
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
  const payload = base64.includes(",") ? base64.split(",").pop() || "" : base64;
  if (!payload) throw new Error("PROFILE_PHOTO_EMPTY");

  const tempUri = `${FileSystem.cacheDirectory}profile-photo-${userId}.jpg`;
  await FileSystem.writeAsStringAsync(tempUri, payload, {
    encoding: FileSystem.EncodingType.Base64,
  });
  try {
    const blob = await (await fetch(tempUri)).blob();
    const { getApp } = await import("firebase/app");
    const { getStorage, ref, uploadBytes, getDownloadURL } = await import(
      "firebase/storage"
    );
    const storage = getStorage(getApp(), `gs://${firebaseConfig.storageBucket}`);
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, blob, {
      contentType: "image/jpeg",
      // Ajuda cache HTTP no navegador e CDNs (1 ano; URL muda com token ao trocar foto).
      cacheControl: "public,max-age=31536000,immutable",
    });
    const url = await getDownloadURL(fileRef);
    return { url, path };
  } finally {
    await FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(
      () => undefined,
    );
  }
}
