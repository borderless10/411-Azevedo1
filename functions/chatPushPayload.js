const compactText = (value) => {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) return "Nova mensagem";
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
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
        body: compactText(text),
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
