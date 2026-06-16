import { formatDateToString } from "./dateUtils";

const resolvedKeys = new Set<string>();

export const getZeroPromptSessionKey = (
  userId: string,
  date: Date,
): string => `${userId}-${formatDateToString(date)}`;

export const markZeroPromptResolvedForSession = (key: string): void => {
  resolvedKeys.add(key);
};

export const isZeroPromptResolvedForSession = (key: string): boolean =>
  resolvedKeys.has(key);
