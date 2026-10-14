import { useEffect, useRef, useState, useCallback } from "react";
import chatService, {
  CHAT_LIVE_MESSAGE_LIMIT,
  CHAT_OLDER_PAGE_SIZE,
  ChatReplyTo,
  Message,
} from "../services/chatService";
import { ChatMention } from "../utils/chatMentions";

interface UseChatMessagesResult {
  messages: Message[];
  sendMessage: (
    text: string,
    extras?: {
      mentions?: ChatMention[];
      replyTo?: ChatReplyTo | null;
    },
  ) => Promise<void>;
  loadMore: () => Promise<void>;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
}

const mergeMessages = (older: Message[], live: Message[]): Message[] => {
  const byId = new Map<string, Message>();
  older.forEach((message) => {
    if (message.id) byId.set(message.id, message);
  });
  live.forEach((message) => {
    if (message.id) byId.set(message.id, message);
  });
  return Array.from(byId.values()).sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
};

export function useChatMessages(
  chatId: string,
  currentUserId: string,
  pageSize = CHAT_LIVE_MESSAGE_LIMIT,
  senderCoupleMember?: 1 | 2 | null,
): UseChatMessagesResult {
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const [olderMessages, setOlderMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const oldestCursorRef = useRef<any | null>(null);
  const loadingMoreRef = useRef(false);
  const hasOlderRef = useRef(false);

  useEffect(() => {
    if (!chatId) return;
    setIsLoading(true);
    setOlderMessages([]);
    oldestCursorRef.current = null;
    hasOlderRef.current = false;
    setHasMore(false);

    const unsub = chatService.listenToMessages(
      chatId,
      (msgs, meta) => {
        setLiveMessages((previousLive) => {
          if (hasOlderRef.current && previousLive.length) {
            const liveIds = new Set(msgs.map((message) => message.id));
            const dropped = previousLive.filter(
              (message) => message.id && !liveIds.has(message.id),
            );
            if (dropped.length) {
              setOlderMessages((previousOlder) =>
                mergeMessages(dropped, previousOlder),
              );
            }
          }
          return msgs;
        });
        setIsLoading(false);
        if (!hasOlderRef.current) {
          oldestCursorRef.current = meta.oldestCursor;
          setHasMore(meta.hasMore);
        }
      },
      pageSize,
    );

    return () => {
      unsub();
    };
  }, [chatId, pageSize]);

  const sendMessage = useCallback(
    async (
      text: string,
      extras?: {
        mentions?: ChatMention[];
        replyTo?: ChatReplyTo | null;
      },
    ) => {
      if (!chatId || !currentUserId)
        throw new Error("Missing chatId or userId");
      await chatService.sendMessage(chatId, currentUserId, text, {
        senderCoupleMember,
        mentions: extras?.mentions,
        replyTo: extras?.replyTo,
      });
    },
    [chatId, currentUserId, senderCoupleMember],
  );

  const loadMore = useCallback(async () => {
    if (!chatId || !oldestCursorRef.current || loadingMoreRef.current || !hasMore) {
      return;
    }
    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const page = await chatService.loadMoreMessages(
        chatId,
        oldestCursorRef.current,
        CHAT_OLDER_PAGE_SIZE,
      );
      if (page.messages.length === 0) {
        setHasMore(false);
      } else {
        oldestCursorRef.current = page.oldestCursor;
        hasOlderRef.current = true;
        setHasMore(page.hasMore);
        setOlderMessages((previous) =>
          mergeMessages(page.messages, previous),
        );
      }
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [chatId, hasMore]);

  return {
    messages: mergeMessages(olderMessages, liveMessages),
    sendMessage,
    loadMore,
    isLoading,
    isLoadingMore,
    hasMore,
  };
}

export default useChatMessages;
