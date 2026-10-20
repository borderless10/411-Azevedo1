export const CHAT_PRESENCE_STALE_MS = 90_000;

export type ChatPushRecipientState = {
  presenceState?: string;
  activeChatId?: string | null;
  presenceUpdatedAtMs?: number;
};

export type ChatPushTarget = {
  userId: string;
  mentioned: boolean;
};

export const isViewingThisChat = (
  state: ChatPushRecipientState | undefined,
  chatId: string,
  nowMs: number,
): boolean => {
  if (!state || state.presenceState !== "foreground") return false;
  if (state.activeChatId !== chatId) return false;
  const updatedAt = state.presenceUpdatedAtMs || 0;
  if (!updatedAt || nowMs - updatedAt > CHAT_PRESENCE_STALE_MS) return false;
  return true;
};

export const resolveChatPushTargets = ({
  chatId,
  chatType,
  participantIds,
  senderId,
  mentionUserIds,
  statesByUserId,
  nowMs,
}: {
  chatId: string;
  chatType?: string;
  participantIds: string[];
  senderId: string;
  mentionUserIds: string[];
  statesByUserId: Record<string, ChatPushRecipientState | undefined>;
  nowMs: number;
}): ChatPushTarget[] => {
  const mentions = new Set(
    mentionUserIds.filter((id) => id && id !== senderId),
  );
  const candidates =
    chatType === "global"
      ? Array.from(mentions)
      : Array.from(
          new Set([
            ...participantIds.filter((id) => id && id !== senderId),
            ...mentions,
          ]),
        );

  return candidates.map((userId) => ({
      userId,
      mentioned: mentions.has(userId),
    }));
};
