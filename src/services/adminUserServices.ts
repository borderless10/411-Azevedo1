import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../lib/firebase";

const functions = getFunctions(app, "southamerica-east1");

export type AdminCredentialsUpdate = {
  email?: string;
  newPassword?: string;
};

/**
 * Corrige e-mail e/ou senha de um usuário pelo servidor. As credenciais
 * vivem no Firebase Auth, então o cliente nunca mexe nelas direto.
 */
export const adminUpdateUserCredentials = async (
  userId: string,
  update: AdminCredentialsUpdate,
): Promise<{ userId: string; email: string }> => {
  const callable = httpsCallable<
    { userId: string } & AdminCredentialsUpdate,
    { userId: string; email: string }
  >(functions, "adminUpdateUserCredentials");
  const result = await callable({ userId, ...update });
  return result.data;
};
