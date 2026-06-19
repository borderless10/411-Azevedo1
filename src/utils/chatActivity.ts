let activeChatId: string | null = null;

export const setActiveChatId = (chatId: string | null): void => {
  activeChatId = chatId;
};

export const getActiveChatId = (): string | null => activeChatId;
