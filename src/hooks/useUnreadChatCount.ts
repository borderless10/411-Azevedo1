import { useAuth } from "./useAuth";
import { useUserChats } from "./useUserChats";
import { isChatUnreadForUser } from "../utils/chatUtils";

export const useUnreadChatCount = (): number => {
  const { user } = useAuth();
  const { chats } = useUserChats(user?.id || null, user?.role || null);
  return (chats || []).filter((chat) => isChatUnreadForUser(chat, user?.id)).length;
};

export default useUnreadChatCount;
