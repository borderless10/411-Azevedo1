const PRESENCE_FRESH_MS = 90_000;

export const isActivelyViewingChat = (user, chatId, nowMs) => {
  if (!user || user.presenceState !== "foreground") return false;
  if (user.activeChatId !== chatId) return false;
  const updated =
    typeof user.presenceUpdatedAt?.toMillis === "function"
      ? user.presenceUpdatedAt.toMillis()
      : Number(user.presenceUpdatedAtMs || 0);
  return Boolean(updated) && nowMs - updated <= PRESENCE_FRESH_MS;
};

export const resolveChatRecipientIds = ({
  chatType,
  participantIds,
  senderId,
  mentionUserIds,
}) => {
  const mentions = new Set(
    (mentionUserIds || []).filter((id) => id && id !== senderId),
  );
  const candidates =
    chatType === "global"
      ? [...mentions]
      : [...(participantIds || []), ...mentions];

  return [...new Set(candidates.filter((id) => id && id !== senderId))];
};

export const buildChatPushMessages = ({
  recipients,
  senderId,
  senderName,
  chatId,
  messageId,
  text,
  mentionUserIds,
}) => {
  const mentions = new Set(mentionUserIds || []);

  return recipients
    .filter(({ expoPushToken }) =>
      /^ExponentPushToken\[[^\]]+\]$/.test(String(expoPushToken || "")),
    )
    .map(({ userId, expoPushToken }) => {
      const mentioned = mentions.has(userId);
      return {
        to: expoPushToken,
        title: mentioned ? `${senderName} mencionou você` : senderName,
        body: "Nova mensagem",
        sound: "default",
        priority: "high",
        channelId: "chat_messages",
        badge: 1,
        data: {
          type: mentioned ? "chat_mention" : "chat_message",
          chatId,
          messageId,
          senderId,
        },
      };
    });
};
