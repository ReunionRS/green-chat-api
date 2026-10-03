import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  deleteNotification,
  enableHttpNotifications,
  incomingText,
  receiveNotification,
} from "../greenApi";
import { ensureFirebaseSession, saveChat, saveMessage } from "../firebase/chatStore";
import type { Chat, Credentials, Message } from "../types";
import notificationSound from "../assets/mp3/telegram-notification.mp3";

type Options = {
  credentials: Credentials | null;
  setChats: Dispatch<SetStateAction<Chat[]>>;
  setMessages: Dispatch<SetStateAction<Record<string, Message[]>>>;
  setError: (message: string) => void;
};

export function useIncomingMessages({
  credentials,
  setChats,
  setMessages,
  setError,
}: Options) {
  useEffect(() => {
    if (!credentials) return;
    const controller = new AbortController();
    const sound = new Audio(notificationSound);
    sound.preload = "auto";

    const poll = async () => {
      try {
        await enableHttpNotifications(credentials);
        while (!controller.signal.aborted) {
          const notification = await receiveNotification(
            credentials,
            controller.signal,
          );
          if (!notification) continue;
          const incoming = incomingText(notification);
          if (incoming) {
            setChats((current) => [
              { ...current.find((item) => item.chatId === incoming.chat.chatId), ...incoming.chat },
              ...current.filter((item) => item.chatId !== incoming.chat.chatId),
            ]);
            setMessages((current) => {
              const chatMessages = current[incoming.chat.chatId] ?? [];
              if (chatMessages.some((item) => item.id === incoming.message.id)) return current;
              return {
                ...current,
                [incoming.chat.chatId]: [...chatMessages, incoming.message],
              };
            });
            await ensureFirebaseSession();
            await Promise.all([
              saveChat(credentials.idInstance, incoming.chat),
              saveMessage(
                credentials.idInstance,
                incoming.chat.chatId,
                incoming.message,
                credentials.apiTokenInstance,
              ),
            ]);
            sound.currentTime = 0;
            void sound.play().catch(() => {});
          }
          await deleteNotification(credentials, notification.receiptId);
        }
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof Error
            ? `Не удалось получить сообщения: ${cause.message}`
            : "Не удалось получить входящие сообщения",
        );
      }
    };

    void poll();
    return () => controller.abort();
  }, [credentials, setChats, setMessages, setError]);
}
