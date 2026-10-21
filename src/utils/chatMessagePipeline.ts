export type PipelineMessage = {
  id?: string;
  senderId: string;
  text: string;
  createdAt: Date;
};

export const CHAT_MEMORY_LIMIT = 400;

/** Mantém as mensagens mais recentes e informa quando o histórico antigo saiu da memória. */
export const capChatWindow = <T>(
  messages: T[],
  limit = CHAT_MEMORY_LIMIT,
): { messages: T[]; trimmed: boolean } => {
  if (messages.length <= limit) return { messages, trimmed: false };
  return { messages: messages.slice(messages.length - limit), trimmed: true };
};

export const mergeChatMessages = <T extends PipelineMessage>(
  older: T[],
  live: T[],
): T[] => {
  const byId = new Map<string, T>();
  const withoutId: T[] = [];
  for (const message of [...older, ...live]) {
    if (message.id) byId.set(message.id, message);
    else withoutId.push(message);
  }
  return [...byId.values(), ...withoutId].sort(
    (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
  );
};

export const reconcilePendingMessages = <T extends PipelineMessage>(
  pending: T[],
  live: T[],
): T[] => {
  const remaining = [...pending];
  for (const message of live) {
    const index = remaining.findIndex(
      (item) =>
        item.senderId === message.senderId &&
        item.text === message.text &&
        message.createdAt.getTime() >= item.createdAt.getTime() - 15000,
    );
    if (index >= 0) remaining.splice(index, 1);
  }
  return remaining;
};
