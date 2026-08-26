import { Alert, Linking } from "react-native";

const URL_PATTERN = /((?:https?:\/\/|www\.)[^\s]+)/gi;

export type MessageTextSegment =
  | { type: "text"; value: string }
  | { type: "link"; value: string; href: string };

const trimTrailingUrlPunctuation = (raw: string): string => {
  let value = raw;
  while (/[.,;:!?)}\]'"]$/.test(value)) {
    value = value.slice(0, -1);
  }
  return value;
};

export const toLinkHref = (raw: string): string => {
  const trimmed = trimTrailingUrlPunctuation(raw.trim());
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export const parseMessageSegments = (text: string): MessageTextSegment[] => {
  if (!text) return [];

  const segments: MessageTextSegment[] = [];
  let lastIndex = 0;
  const regex = new RegExp(URL_PATTERN.source, URL_PATTERN.flags);

  for (const match of text.matchAll(regex)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, index) });
    }

    const raw = match[0];
    const display = trimTrailingUrlPunctuation(raw);
    segments.push({
      type: "link",
      value: display,
      href: toLinkHref(display),
    });
    lastIndex = index + raw.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments.length ? segments : [{ type: "text", value: text }];
};

export const openChatLink = async (href: string): Promise<void> => {
  try {
    const canOpen = await Linking.canOpenURL(href);
    if (!canOpen) {
      Alert.alert("Link inválido", "Não foi possível abrir este endereço.");
      return;
    }
    await Linking.openURL(href);
  } catch {
    Alert.alert("Erro", "Não foi possível abrir o link.");
  }
};

export const CHAT_EMOJIS = [
  "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂",
  "😉", "😍", "🥰", "😘", "😋", "😎", "🤔", "🤗", "🤩", "🥳",
  "😢", "😭", "😤", "😡", "🙄", "😴", "🤒", "🤕", "🤢", "🤮",
  "👍", "👎", "👏", "🙌", "🙏", "💪", "🤝", "👋", "✌️", "🤞",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "💕",
  "🔥", "✨", "⭐", "🌟", "💯", "✅", "❌", "⚠️", "❓", "❗",
  "🎉", "🎊", "🎁", "🏆", "📈", "💰", "💳", "🛒", "🏠", "✈️",
  "🍕", "🍔", "🍟", "☕", "🍺", "🎵", "📚", "💼", "📎", "📷",
  "💬", "📞", "📧", "🔗", "⏰", "📅", "🚀", "💡", "🎯", "👀",
] as const;
