import { useEffect, useRef, useState, useCallback } from "react";
import chatService, { Message } from "../services/chatService";
import { Timestamp } from "firebase/firestore";

interface UseChatMessagesResult {
  messages: Message[];
  sendMessage: (text: string) => Promise<void>;
  loadMore: () => Promise<void>;
  isLoading: boolean;
  hasMore: boolean;
}

export function useChatMessages(
  chatId: string,
  currentUserId: string,
  pageSize = 20,
): UseChatMessagesResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const lastVisibleRef = useRef<any | null>(null);
  const unsubscribeRef = useRef<() => void | null>(null);

  useEffect(() => {
    if (!chatId) return;
    setIsLoading(true);

    // Subscribe to newest messages (real-time) - chatService provides newest `pageSize` messages
    const unsub = chatService.listenToMessages(
      chatId,
      (msgs, meta) => {
        setMessages(msgs);
        setHasMore(meta.hasMore);
        setIsLoading(false);

        // keep track of the oldest message's createdAt (for pagination)
        if (msgs.length > 0) {
          // messages are chronological (old->new)
          const oldest = msgs[0];
          lastVisibleRef.current = oldest.createdAt;
        }
      },
      pageSize,
    );

    unsubscribeRef.current = unsub;

    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [chatId, pageSize]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!chatId || !currentUserId)
        throw new Error("Missing chatId or userId");
      await chatService.sendMessage(chatId, currentUserId, text);
    },
    [chatId, currentUserId],
  );

  const loadMore = useCallback(async () => {
    if (!chatId || !lastVisibleRef.current) return;
    setIsLoading(true);
    try {
      // lastVisibleRef stores a Date — we need Firestore Timestamp for startAfter
      const lastTs = lastVisibleRef.current as unknown as Timestamp;
      const older = await chatService.loadMoreMessages(
        chatId,
        lastTs,
        pageSize,
      );
      if (older.length === 0) {
        setHasMore(false);
      } else {
        setMessages((prev) => [...older, ...prev]);
        // update lastVisible to the new oldest
        lastVisibleRef.current = older[0].createdAt;
      }
    } finally {
      setIsLoading(false);
    }
  }, [chatId, pageSize]);

  return { messages, sendMessage, loadMore, isLoading, hasMore };
}

export default useChatMessages;
