export type PipelineMessage = {
  id?: string;
  senderId: string;
  text: string;
  createdAt: Date;
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
