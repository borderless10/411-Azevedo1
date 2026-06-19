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
