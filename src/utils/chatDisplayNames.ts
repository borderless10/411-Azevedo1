import { User } from "../types/auth";

export const profileDisplayName = (
  profile?: Pick<User, "nickname" | "name"> | null,
  fallback = "Usuário",
): string => {
  const nickname = String(profile?.nickname || "").trim();
  if (nickname) return nickname;
  const name = String(profile?.name || "").trim();
  if (name) return name;
  return fallback;
};

export const profileRegisteredName = (
  profile?: Pick<User, "name"> | null,
): string => String(profile?.name || "").trim();

export const profileInitial = (
  profile?: Pick<User, "nickname" | "name"> | null,
  fallback = "U",
): string => {
  const label = profileDisplayName(profile, fallback);
  return (label.charAt(0) || fallback).toUpperCase();
};

export const profilePhotoUri = (
  photoBase64?: string | null,
): string | null => {
  const value = String(photoBase64 || "").trim();
  if (!value) return null;
  if (value.startsWith("data:image/") || value.startsWith("http")) return value;
  const mime = value.startsWith("iVBOR") ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${value}`;
};

export const resolveChatDisplayName = (
  userId: string | null | undefined,
  currentUserId: string | null | undefined,
  profile?: Pick<User, "nickname" | "name"> | null,
  cachedName?: string,
): string => {
  if (!userId) return "Usuário";
  if (userId === currentUserId) return "Você";
  if (cachedName) return cachedName;
  return profileDisplayName(profile);
};
