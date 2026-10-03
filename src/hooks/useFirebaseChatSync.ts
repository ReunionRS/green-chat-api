import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { ensureFirebaseSession, watchChats, watchMessages } from "../firebase/chatStore";
import type { Chat, Credentials, Message } from "../types";

type Params = {
  credentials: Credentials | null;
  selectedChat: Chat | null;
  setChats: Dispatch<SetStateAction<Chat[]>>;
  setMessages: Dispatch<SetStateAction<Record<string, Message[]>>>;
  setChatsLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string>>;
};

export function useFirebaseChatSync({
  credentials,
  selectedChat,
  setChats,
  setMessages,
  setChatsLoading,
  setError,
}: Params) {
  useEffect(() => {
    if (!credentials) return;
    let unsubscribe = () => {};
    let active = true;
    ensureFirebaseSession().then(() => {
      if (!active) return;
      unsubscribe = watchChats(credentials.idInstance, (storedChats) => {
        setChatsLoading(false);
        setChats((current) => {
          const merged = new Map(current.map((chat) => [chat.chatId, chat]));
          storedChats.forEach((chat) => merged.set(chat.chatId, chat));
          return [...merged.values()];
        });
      }, () => active && setError("Не удалось синхронизировать список чатов с Firebase"));
    }).catch(() => setError("Включите Anonymous Authentication в Firebase Console"));
    return () => { active = false; unsubscribe(); };
  }, [credentials, setChats, setChatsLoading, setError]);

  useEffect(() => {
    if (!credentials || !selectedChat) return;
    let unsubscribe = () => {};
    let active = true;
    ensureFirebaseSession().then(() => {
      if (!active) return;
      unsubscribe = watchMessages(credentials.idInstance, selectedChat.chatId, credentials.apiTokenInstance, (storedMessages) => {
        setMessages((current) => ({ ...current, [selectedChat.chatId]: storedMessages }));
      }, () => active && setError("Не удалось синхронизировать сообщения с Firebase"));
    }).catch(() => setError("Включите Anonymous Authentication в Firebase Console"));
    return () => { active = false; unsubscribe(); };
  }, [credentials, selectedChat, setError, setMessages]);
}
