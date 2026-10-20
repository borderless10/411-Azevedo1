import { useSharedChats } from "../contexts/ChatsContext";

export function useUserChats(
  _userId?: string | null,
  _role?: string | null,
) {
  const { chats, isLoading } = useSharedChats();
  return { chats, isLoading };
}

export function useGlobalChat() {
  return useSharedChats().globalChat;
}

export default useUserChats;
