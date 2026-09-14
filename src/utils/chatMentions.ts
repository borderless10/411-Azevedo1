export type MentionCandidate = {
  userId: string;
  displayName: string;
};

export type ChatMention = {
  userId: string;
  displayName: string;
};

const normalizeName = (value: string): string =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

export const getActiveMentionQuery = (
  text: string,
  cursor: number,
): { start: number; query: string } | null => {
  const safeCursor = Math.max(0, Math.min(cursor, text.length));
  const before = text.slice(0, safeCursor);
  const match = before.match(/(^|[\s])@([^\s@]*)$/);
  if (!match || match.index == null) return null;
  const atIndex = match.index + match[1].length;
  return { start: atIndex, query: match[2] };
};

export const filterMentionCandidates = (
  candidates: MentionCandidate[],
  query: string,
): MentionCandidate[] => {
  const needle = normalizeName(query).toLowerCase();
  return candidates
    .filter((item) => item.userId && normalizeName(item.displayName))
    .filter((item) =>
      needle
        ? normalizeName(item.displayName).toLowerCase().includes(needle)
        : true,
    )
    .slice(0, 8);
};

export const insertMention = (
  text: string,
  cursor: number,
  mentionStart: number,
  displayName: string,
): { text: string; cursor: number } => {
  const label = `@${normalizeName(displayName)}`;
  const after = text.slice(cursor);
  const nextText = `${text.slice(0, mentionStart)}${label} ${after}`;
  return { text: nextText, cursor: mentionStart + label.length + 1 };
};

export const mentionsStillInText = (
  text: string,
  mentions: ChatMention[],
): ChatMention[] => {
  const seen = new Set<string>();
  return mentions.filter((mention) => {
    if (!mention.userId || seen.has(mention.userId)) return false;
    const token = `@${normalizeName(mention.displayName)}`;
    if (!token || !text.includes(token)) return false;
    seen.add(mention.userId);
    return true;
  });
};

export const parseMentionSegments = (
  text: string,
  mentions: ChatMention[] = [],
): Array<{ type: "text" | "mention"; value: string; userId?: string }> => {
  if (!text) return [];

  const tokens = mentions
    .map((mention) => ({
      ...mention,
      displayName: normalizeName(mention.displayName),
    }))
    .filter((mention) => mention.displayName)
    .sort((a, b) => b.displayName.length - a.displayName.length);

  if (!tokens.length) {
    return [{ type: "text", value: text }];
  }

  const pattern = new RegExp(
    `(${tokens
      .map((token) => `@${escapeRegExp(token.displayName)}`)
      .join("|")})`,
    "g",
  );

  const segments: Array<{
    type: "text" | "mention";
    value: string;
    userId?: string;
  }> = [];
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, index) });
    }
    const value = match[0];
    const name = value.slice(1);
    const mention = tokens.find(
      (token) => token.displayName.toLowerCase() === name.toLowerCase(),
    );
    segments.push({
      type: "mention",
      value,
      userId: mention?.userId,
    });
    lastIndex = index + value.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments.length ? segments : [{ type: "text", value: text }];
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const CHAT_REACTION_EMOJIS = [
  "👍",
  "❤️",
  "😂",
  "😮",
  "😢",
  "🙏",
] as const;
