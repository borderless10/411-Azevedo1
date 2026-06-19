import { useEffect, useState } from "react";
import chatService, { Chat } from "../services/chatService";

export function useUserChats(userId: string | null, role: string | null) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId || !role) return;
    setIsLoading(true);

    // Try to subscribe to realtime updates
    const finishLoading = (items: Chat[]) => {
      setChats(items);
      setIsLoading(false);
    };

    const unsub = chatService.listenToUserChats(userId, role, finishLoading);

    // Fallback sem orderBy (evita índice composto) e garante fim do loading em erro
    (async () => {
      try {
        const initial = await chatService.getChatsForUserNoOrder(userId, role);
        finishLoading(initial || []);
      } catch {
        setIsLoading(false);
      }
    })();

    return () => unsub();
  }, [userId, role]);

  return { chats, isLoading };
}

export default useUserChats;
