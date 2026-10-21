import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "../hooks/useAuth";
import chatService, { Chat } from "../services/chatService";
import { perfMark, perfMeasure } from "../utils/perfMarks";
import { recordWatchdogEvent } from "../services/sessionWatchdog";

type ChatsContextValue = {
  chats: Chat[];
  isLoading: boolean;
  globalChat: Chat | null;
};

const ChatsContext = createContext<ChatsContextValue | null>(null);

const chatSignature = (chat: Chat): string =>
  [
    chat.id,
    JSON.stringify((chat as any).lastMessage || null),
    JSON.stringify((chat as any).readBy || null),
    String((chat as any).lastMessageAt?.seconds ?? (chat as any).lastMessageAt ?? ""),
    ((chat as any).participants || []).join(","),
  ].join("|");

const chatsSignature = (items: Chat[]): string => items.map(chatSignature).join("#");

export const ChatsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const userId = user?.id || null;
  const role = user?.role || null;
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(userId && role));
  const [globalChat, setGlobalChat] = useState<Chat | null>(null);
  const chatsSignatureRef = useRef("");
  const globalChatSignatureRef = useRef("");

  useEffect(() => {
    if (!userId || !role) {
      chatsSignatureRef.current = "";
      setChats([]);
      setIsLoading(false);
      return;
    }
    chatsSignatureRef.current = "";
    setIsLoading(true);
    perfMark("chats.snapshot.start");
    let settled = false;
    const finish = (items: Chat[]) => {
      settled = true;
      const signature = chatsSignature(items);
      if (signature !== chatsSignatureRef.current) {
        chatsSignatureRef.current = signature;
        recordWatchdogEvent(`chats:${items.length}`);
        setChats(items);
      }
      setIsLoading(false);
      perfMeasure("chats.snapshot", "chats.snapshot.start");
      if (__DEV__) console.log(`[perf] chats.count: ${items.length}`);
    };
    const unsubscribe = chatService.listenToUserChats(userId, role, finish);
    const fallback = setTimeout(() => {
      if (settled) return;
      chatService
        .getChatsForUserNoOrder(userId, role)
        .then((items) => {
          if (!settled) finish(items || []);
        })
        .catch(() => {
          if (!settled) setIsLoading(false);
        });
    }, 700);
    return () => {
      clearTimeout(fallback);
      unsubscribe();
    };
  }, [role, userId]);

  useEffect(() => {
    if (!userId) {
      setGlobalChat(null);
      return;
    }
    return chatService.listenToChat("global", (chat) => {
      const signature = chat ? chatSignature(chat) : "";
      if (signature === globalChatSignatureRef.current) return;
      globalChatSignatureRef.current = signature;
      setGlobalChat(chat);
    });
  }, [userId]);

  const value = useMemo(
    () => ({ chats, isLoading, globalChat }),
    [chats, globalChat, isLoading],
  );

  return <ChatsContext.Provider value={value}>{children}</ChatsContext.Provider>;
};

export function useSharedChats(): ChatsContextValue {
  const value = useContext(ChatsContext);
  if (!value) {
    throw new Error("useUserChats precisa do ChatsProvider");
  }
  return value;
}
