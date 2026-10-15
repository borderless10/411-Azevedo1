import { User } from "../types/auth";

type StaffLike = Pick<User, "id" | "role" | "isAdmin"> | null | undefined;

export function isStaffUser(user: StaffLike): boolean {
  if (!user) return false;
  return (
    user.role === "consultor" ||
    user.role === "supervisor" ||
    user.role === "admin" ||
    !!user.isAdmin
  );
}

export function staffClientId(
  user: StaffLike,
  clientId?: string | null,
): string | null {
  const id = String(clientId || "").trim();
  if (!id || !user?.id || !isStaffUser(user) || id === user.id) return null;
  return id;
}

export function recordOwnerId(
  user: StaffLike,
  clientId?: string | null,
): string {
  return staffClientId(user, clientId) || user?.id || "";
}
