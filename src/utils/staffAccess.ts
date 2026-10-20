export type StaffRoleUser = {
  id?: string;
  role?: string | null;
  isAdmin?: boolean;
} | null | undefined;

export const isAdminRole = (user: StaffRoleUser): boolean =>
  !!user && (user.isAdmin === true || user.role === "admin");

export const isConsultorRole = (user: StaffRoleUser): boolean =>
  user?.role === "consultor";

export const isSupervisorRole = (user: StaffRoleUser): boolean =>
  user?.role === "supervisor";

export const canOperateAsConsultant = (user: StaffRoleUser): boolean =>
  isConsultorRole(user) || isSupervisorRole(user);

export const canCreateRecommendationForClient = (user: StaffRoleUser): boolean =>
  canOperateAsConsultant(user);

export const canRegisterClient = (user: StaffRoleUser): boolean =>
  isAdminRole(user) || canOperateAsConsultant(user);

/** Consultor grava a si mesmo. Supervisor e admin escolhem o responsável. */
export const lockedConsultantIdForRegistration = (
  user: StaffRoleUser,
): string | null => {
  if (isConsultorRole(user) && user?.id) return user.id;
  return null;
};
