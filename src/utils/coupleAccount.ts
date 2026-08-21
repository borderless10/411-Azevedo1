import AsyncStorage from "@react-native-async-storage/async-storage";
import { AccountType, CoupleMember, User } from "../types/auth";

const coupleMemberKey = (userId: string) => `@411:activeCoupleMember:${userId}`;

export const resolveAccountType = (
  value?: AccountType | string | null,
): AccountType => (value === "couple" ? "couple" : "individual");

export const isCoupleAccount = (
  user?: Pick<User, "accountType"> | null,
): boolean => resolveAccountType(user?.accountType) === "couple";

export const getCoupleMemberLabel = (
  user: Pick<User, "coupleMember1Name" | "coupleMember2Name"> | null | undefined,
  member: CoupleMember,
): string => {
  const raw =
    member === 1
      ? String(user?.coupleMember1Name || "").trim()
      : String(user?.coupleMember2Name || "").trim();
  return raw || `Usuário ${member}`;
};

export const parseCoupleMember = (
  value: unknown,
): CoupleMember | null => {
  const numeric = Number(value);
  if (numeric === 1 || numeric === 2) return numeric;
  return null;
};

export const belongsToCoupleMember = (
  expense: { coupleMember?: CoupleMember | null },
  member: CoupleMember,
): boolean => {
  if (expense.coupleMember == null) return member === 1;
  return expense.coupleMember === member;
};

export const getStoredCoupleMember = async (
  userId: string,
): Promise<CoupleMember | null> => {
  if (!userId) return null;
  try {
    const stored = await AsyncStorage.getItem(coupleMemberKey(userId));
    return parseCoupleMember(stored);
  } catch {
    return null;
  }
};

export const persistCoupleMember = async (
  userId: string,
  member: CoupleMember,
): Promise<void> => {
  if (!userId) return;
  await AsyncStorage.setItem(coupleMemberKey(userId), String(member));
};

export const clearStoredCoupleMember = async (
  userId?: string | null,
): Promise<void> => {
  if (!userId) return;
  try {
    await AsyncStorage.removeItem(coupleMemberKey(userId));
  } catch {
    // ignore storage errors on logout
  }
};

export const coupleAccountFieldsFromInput = (input: {
  accountType?: AccountType | string;
  coupleMember1Name?: string;
  coupleMember2Name?: string;
}) => {
  const accountType = resolveAccountType(input.accountType);
  if (accountType !== "couple") {
    return {
      accountType: "individual" as const,
      coupleMember1Name: "",
      coupleMember2Name: "",
    };
  }

  return {
    accountType,
    coupleMember1Name: String(input.coupleMember1Name || "").trim(),
    coupleMember2Name: String(input.coupleMember2Name || "").trim(),
  };
};
