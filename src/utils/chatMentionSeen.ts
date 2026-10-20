export type MentionCandidate = {
  id: string;
  createdAtMs: number;
  senderId: string;
  mentionUserIds: string[];
};

export const listUnseenMentions = (
  messages: MentionCandidate[],
  userId: string,
  seenIds: ReadonlySet<string>,
): MentionCandidate[] => {
  if (!userId) return [];
  return messages
    .filter(
      (message) =>
        message.id &&
        message.senderId !== userId &&
        message.mentionUserIds.includes(userId) &&
        !seenIds.has(message.id),
    )
    .sort((a, b) => a.createdAtMs - b.createdAtMs);
};

export const mergeSeenMentionIds = (
  previous: string[],
  visibleMentionIds: string[],
): string[] => {
  const next = new Set(previous.filter(Boolean));
  visibleMentionIds.forEach((id) => {
    if (id) next.add(id);
  });
  return Array.from(next);
};
