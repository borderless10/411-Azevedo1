import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import chatService, {
  CHAT_LIVE_MESSAGE_LIMIT,
  CHAT_OLDER_PAGE_SIZE,
  ChatReplyTo,
  Message,
} from "../services/chatService";
import { ChatMention } from "../utils/chatMentions";
import {
  capChatWindow,
  mergeChatMessages,
  reconcilePendingMessages,
} from "../utils/chatMessagePipeline";
import { perfMark, perfMeasure } from "../utils/perfMarks";

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
  trimmed: boolean;
  returnToRecent: () => void;
}

export function useChatMessages(
  chatId: string,
  currentUserId: string,
  pageSize = CHAT_LIVE_MESSAGE_LIMIT,
  senderCoupleMember?: 1 | 2 | null,
): UseChatMessagesResult {
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const [olderMessages, setOlderMessages] = useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [trimmed, setTrimmed] = useState(false);
  const oldestCursorRef = useRef<any | null>(null);
  const loadingMoreRef = useRef(false);
  const hasOlderRef = useRef(false);
  const previousLiveRef = useRef<Message[]>([]);

  useEffect(() => {
    if (!chatId) {
      setLiveMessages([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    perfMark("chat.messages.start");
    setOlderMessages([]);
    setPendingMessages([]);
    previousLiveRef.current = [];
    oldestCursorRef.current = null;
    hasOlderRef.current = false;
    setHasMore(false);

    const unsub = chatService.listenToMessages(
      chatId,
      (msgs, meta) => {
        const previousLive = previousLiveRef.current;
        if (hasOlderRef.current && previousLive.length) {
          const liveIds = new Set(msgs.map((message) => message.id));
          const dropped = previousLive.filter(
            (message) => message.id && !liveIds.has(message.id),
          );
          if (dropped.length) {
            setOlderMessages((previousOlder) =>
              mergeChatMessages(dropped, previousOlder),
            );
          }
        }
        previousLiveRef.current = msgs;
        setLiveMessages(msgs);
        setPendingMessages((current) => reconcilePendingMessages(current, msgs));
        setIsLoading(false);
        perfMeasure("chat.messages.snapshot", "chat.messages.start");
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
      if (!chatId || !currentUserId) {
        throw new Error("Missing chatId or userId");
      }
      const pending: Message = {
        id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text,
        senderId: currentUserId,
        senderCoupleMember,
        createdAt: new Date(),
        mentions: extras?.mentions,
        replyTo: extras?.replyTo,
      };
      setPendingMessages((current) => [...current, pending]);
      try {
        await chatService.sendMessage(chatId, currentUserId, text, {
          senderCoupleMember,
          mentions: extras?.mentions,
          replyTo: extras?.replyTo,
        });
      } catch (error) {
        setPendingMessages((current) =>
          current.filter((message) => message.id !== pending.id),
        );
        throw error;
      }
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
        setOlderMessages((previous) => {
          const merged = mergeChatMessages(page.messages, previous);
          const capped = capChatWindow(merged);
          setTrimmed(capped.trimmed);
          return capped.messages;
        });
      }
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [chatId, hasMore]);

  const returnToRecent = useCallback(() => {
    setOlderMessages([]);
    setTrimmed(false);
    hasOlderRef.current = false;
  }, []);

  const messages = useMemo(
    () =>
      mergeChatMessages(
        mergeChatMessages(olderMessages, liveMessages),
        pendingMessages,
      ),
    [liveMessages, olderMessages, pendingMessages],
  );

  return {
    messages,
    sendMessage,
    loadMore,
    isLoading,
    isLoadingMore,
    hasMore,
    trimmed,
    returnToRecent,
  };
}

export default useChatMessages;
