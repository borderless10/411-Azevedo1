import { useEffect, useState } from "react";
import chatService, { Chat } from "../services/chatService";

export function useUserChats(userId: string | null, role: string | null) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId || !role) return;
    setIsLoading(true);

    // Try to subscribe to realtime updates
    const unsub = chatService.listenToUserChats(userId, role, (items) => {
      setChats(items);
      setIsLoading(false);
    });

    // Also try a fallback one-time fetch without ordering (avoids composite index requirement)
    (async () => {
      try {
        const initial = await chatService.getChatsForUserNoOrder(userId, role);
        if (initial && initial.length > 0) {
          setChats(initial);
          setIsLoading(false);
        }
      } catch (e) {
        // ignore fallback errors; subscription error handler logs index issues
      }
    })();

    return () => unsub();
  }, [userId, role]);

  return { chats, isLoading };
}

export default useUserChats;
